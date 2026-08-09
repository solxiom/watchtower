/**
 * The durable owner of explicit scoped automation holds (CA-27;
 * `docs/spec/coordinator-automation.md` §11.2/§17/§19/§21, §11.2 "no implicit
 * pack edit"/"no global hold").
 *
 * `ProposalValidator` (CA-09, accepted) already proves every `place-hold`/
 * `release-hold` precondition — expiry-in-the-future, release-must-target-an-
 * active-hold, and scope/claim-conflict — as pure functions over the caller-
 * supplied `ActiveHold[]` projection (`proposalPreconditions.ts`). This class
 * does not re-implement any of that: it is the one durable store those checks
 * are read from, and the one effect owner `place-hold`/`release-hold` commit
 * through. It never touches `coordinator/queue.json` or any pack file — a
 * scoped hold blocks a future proposal's claim-conflict check, never a pack
 * edit and never every batch (an empty scope is refused as an implicit global
 * hold).
 *
 * Expiry is enforced by construction, not by a background sweep: every read
 * (`list`/`activeHolds`) prunes expired records before answering, so "impact-
 * scoped expiry" and "unrelated interleaving" are the same property — a hold
 * stops affecting `checkClaimConflict` the moment it is pruned, and a hold's
 * scope only ever contains the explicit targets it named, so unrelated
 * batches were never affected to begin with.
 */
import {
    ScopedHoldError, type ScopedHoldDocument, type ScopedHoldRecord
} from './holdContracts.js';
import {readHoldDocument} from './holdPersistence.js';
import {commitHoldDocument} from './holdTransaction.js';
import {isNonEmptyStringArrayNoDuplicates} from '../coordinatorRecordValidation.js';
import type {HoldIdFactory} from './holdIdFactory.js';
import type {LaneMutationLock} from '../queue/laneMutationLock.js';
import type {QueueClock, QueueFileSystem} from '../queue/queuePorts.js';
import type {PlaceHoldBody, ProposalOrigin, ReleaseHoldBody} from '../../../../contracts/proposals.js';
import type {ActiveHold} from '../../../proposal/proposalValidatorContracts.js';

export interface ScopedHoldServiceOptions {
    readonly laneDir: string;
    readonly laneId: string;
    readonly files: QueueFileSystem;
    readonly lock: LaneMutationLock;
    readonly clock: QueueClock;
    readonly ids: HoldIdFactory;
}

export class ScopedHoldService {
    constructor(private readonly options: ScopedHoldServiceOptions) {}

    /**
     * `effect.placeHold`. `body.scope` must name at least one explicit target;
     * an empty scope would affect every future proposal's claim-conflict check
     * indiscriminately, which is exactly the "implicit global hold" the batch
     * contract forbids.
     *
     * Review correction CA27-04: a scope carrying a blank or duplicate entry
     * alongside real targets is **refused**, never silently trimmed/deduped
     * into a different, smaller impact scope — normalizing here would durably
     * write a hold whose actual blast radius the caller never explicitly
     * requested. Only a scope with *no* real targets at all (every entry blank,
     * or the array itself empty) is the distinct "implicit global hold" case.
     */
    place(body: PlaceHoldBody, origin: ProposalOrigin): ScopedHoldRecord {
        const scope = validatedScope(body.scope);
        if (body.reason.trim() === '') {
            throw new ScopedHoldError('HOLD_REASON_REQUIRED', 'body.reason', 'a scoped hold requires a non-empty reason.');
        }
        const now = this.options.clock.now();
        const expiresAtMs = Date.parse(body.expiresAt);
        if (Number.isNaN(expiresAtMs) || expiresAtMs <= now.getTime()) {
            throw new ScopedHoldError('HOLD_EXPIRY_INVALID', 'body.expiresAt',
                'a scoped hold must declare a parseable expiry strictly after the current time.');
        }
        const record: ScopedHoldRecord = Object.freeze({
            holdId: this.options.ids.nextHoldId(), scope: Object.freeze([...scope]), reason: body.reason, origin,
            createdAt: now.toISOString(), expiresAt: body.expiresAt
        });
        commitHoldDocument(this.transactionOptions(record.holdId), this.load(), (current) => ({
            next: {...current, holds: Object.freeze([...pruned(current.holds, now), record])}, result: null
        }));
        return record;
    }

    /** `effect.releaseHold`. Also opportunistically drops any other already-expired hold in the same commit. */
    release(body: ReleaseHoldBody): void {
        const {result: existed} = commitHoldDocument(this.transactionOptions(body.holdId), this.load(), (current) => {
            const active = pruned(current.holds, this.options.clock.now());
            const stillPresent = active.some((hold) => hold.holdId === body.holdId);
            if (!stillPresent) return {next: null, result: false};
            return {
                next: {...current, holds: Object.freeze(active.filter((hold) => hold.holdId !== body.holdId))},
                result: true
            };
        });
        if (!existed) {
            throw new ScopedHoldError('HOLD_NOT_FOUND', body.holdId, `no active hold "${body.holdId}" exists to release.`);
        }
    }

    /** Every durable hold, with anything past its `expiresAt` already pruned as of now. */
    list(): readonly ScopedHoldRecord[] {
        const now = this.options.clock.now();
        const current = this.load();
        const remaining = pruned(current.holds, now);
        if (remaining.length !== current.holds.length) {
            commitHoldDocument(this.transactionOptions(this.options.laneId), current, (fresh) => ({
                next: {...fresh, holds: Object.freeze(pruned(fresh.holds, this.options.clock.now()))}, result: null
            }));
        }
        return remaining;
    }

    /** The `ActiveHold[]` projection `ProposalValidator` (CA-09) checks every precondition and claim conflict against. */
    activeHolds(): readonly ActiveHold[] {
        return Object.freeze(this.list().map((hold): ActiveHold => Object.freeze({
            holdId: hold.holdId, scope: hold.scope, status: 'active' as const
        })));
    }

    private load(): ScopedHoldDocument {
        return readHoldDocument(this.options.laneDir, this.options.laneId, this.options.files);
    }

    private transactionOptions(subject: string) {
        return {
            laneDir: this.options.laneDir, laneId: this.options.laneId, files: this.options.files,
            lock: this.options.lock, subject
        };
    }
}

function pruned(holds: readonly ScopedHoldRecord[], now: Date): readonly ScopedHoldRecord[] {
    return holds.filter((hold) => Date.parse(hold.expiresAt) > now.getTime());
}

/**
 * Refuses rather than normalizes (review correction CA27-04). A scope with no
 * real targets at all (empty array, or every entry blank) is the distinct
 * "implicit global hold" case; a scope carrying *some* real targets plus a
 * blank or duplicate entry is a different, malformed request that must be
 * refused, never silently narrowed to what the caller "probably meant".
 */
function validatedScope(scope: readonly string[]): readonly string[] {
    if (scope.every((entry) => entry.trim() === '')) {
        throw new ScopedHoldError('HOLD_SCOPE_EMPTY', 'body.scope',
            'a scoped hold must name at least one explicit target; an empty scope is an implicit global hold and is refused.');
    }
    if (!isNonEmptyStringArrayNoDuplicates(scope)) {
        throw new ScopedHoldError('HOLD_SCOPE_INVALID', 'body.scope',
            'a scoped hold\'s scope entries must each be a unique, non-blank target; blank or duplicate entries are refused rather than silently normalized.');
    }
    return scope;
}
