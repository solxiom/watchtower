/**
 * The sole writer of single-use invocation envelopes (CA-10;
 * `docs/spec/nirvana-integration-architecture.md` §7 steps 4 and 9).
 *
 * "Project files and agent proposals cannot create a valid envelope." That
 * property holds because this module is the only producer, it runs only inside
 * the executor's held lock, and it writes exclusively — a colliding path is a
 * conflict, never an overwrite.
 *
 * The reader is RT-05's accepted `task/runtime/laneInvocationEnvelope.ts`.
 * Every property it proves before spawn is established here: lane containment,
 * effective-account ownership, `0600` mode, a checksum over the envelope's own
 * canonical bytes, a bounded validity window, the exact named
 * action/task/schema/handler, and a `.consumed` receipt that spends single use.
 * The two modules are one contract with two ends and must change together.
 */
import {join} from 'node:path';
import {EffectExecutionError, type EffectPlan, type InvocationEnvelopeDocument} from '../../contracts/effects.js';
import {cleanUpThenFail, reconcileOrphanEnvelope} from './envelopeRecovery.js';
import type {LaneTaskBinding, PinnedTaskRuntimeTarget} from '../../contracts/taskRuntime.js';
import {buildLaneFilePath} from '../paths/index.js';
import {canonicalBytes, canonicalDigest} from './effectCanonicalBytes.js';
import type {EffectClock, EffectFileSystem} from './effectPorts.js';

/** Operator-owned, not group- or world-accessible — exactly what RT-05 requires. */
const ENVELOPE_MODE = 0o600;
/** The receipt whose presence proves single use is spent. */
const CONSUMED_SUFFIX = '.consumed';
const ENVELOPE_RELATIVE_DIR = join('coordinator', 'effects');
/** A bounded validity window: long enough for one bounded effect, far too short to bank. */
const DEFAULT_VALIDITY_MS = 5 * 60 * 1000;

export interface EnvelopeWriteInput {
    readonly laneDir: string;
    readonly plan: EffectPlan;
    readonly binding: LaneTaskBinding;
    readonly target: PinnedTaskRuntimeTarget;
    readonly lockId: string;
    /**
     * Whether the caller holds this lane's mutation lock. Only then can an
     * envelope found at the path be proved to be an orphan rather than a live
     * writer's authority (correction-04).
     */
    readonly laneLockHeld: boolean;
    readonly validityMs?: number;
}

export interface WrittenEnvelope {
    readonly path: string;
    readonly document: InvocationEnvelopeDocument;
}



/**
 * Create the envelope for one planned effect. The path is derived from the
 * idempotency key, so a replayed cycle addresses the same artifact instead of
 * minting a second authority for the same effect.
 *
 * This function is all-or-nothing (correction-03). Creation is not a single
 * atomic act — the file can exist while its contents or its `fsync` fail, and
 * the directory sync happens after the file is already on disk — so every
 * failure path below either proves no file was created or removes the one this
 * call created before throwing. Leaving a partial artifact behind would block
 * every later retry of an idempotency key whose effect never ran.
 *
 * The one artifact this never removes is an envelope that already existed:
 * `createExclusive` returning `false` means a *concurrent writer* owns that
 * file, and deleting another holder's live authority would be far worse than
 * the conflict it reports.
 */
export function writeInvocationEnvelope(input: EnvelopeWriteInput, deps: {files: EffectFileSystem; clock: EffectClock}): WrittenEnvelope {
    const path = envelopePath(input.laneDir, input.plan);
    const directory = join(input.laneDir, ENVELOPE_RELATIVE_DIR);
    const document = buildEnvelopeDocument(input, deps.clock);
    deps.files.ensureDirectory(directory);
    if (deps.files.fileExists(`${path}${CONSUMED_SUFFIX}`)) {
        throw new EffectExecutionError('COORDINATOR_EFFECT_CONFLICT', path,
            'An invocation envelope for this idempotency key has already been consumed.');
    }

    if (deps.files.fileExists(path)) reconcileOrphanEnvelope(path, input.laneLockHeld, deps.files);

    let created: boolean;
    try {
        created = deps.files.createExclusive(path, canonicalBytes(document, path), ENVELOPE_MODE);
    } catch (error) {
        // The create may have opened the file and then failed while writing or
        // fsyncing it, leaving an empty or partial envelope.
        throw cleanUpThenFail(path, error, deps.files);
    }
    if (!created) {
        throw new EffectExecutionError('COORDINATOR_EFFECT_CONFLICT', path,
            'An invocation envelope for this idempotency key was created concurrently; this effect does not take it.');
    }

    try {
        deps.files.syncDirectory(directory);
    } catch (error) {
        // The envelope is fully written but its directory entry is not durable.
        // Returning it would hand out authority that may vanish on power loss;
        // keeping it would block retry. Remove it and refuse.
        throw cleanUpThenFail(path, error, deps.files);
    }
    return {path, document};
}


/**
 * Spend and remove the envelope before the lock is released (§7 step 9). The
 * receipt is written first: if removal fails, a surviving envelope is already
 * provably spent and can never authorize a second effect.
 */
export function consumeInvocationEnvelope(path: string, files: EffectFileSystem, clock: EffectClock): void {
    const receipt = `${path}${CONSUMED_SUFFIX}`;
    if (!files.fileExists(receipt)) {
        files.createExclusive(receipt, `${clock.now().toISOString()}\n`, ENVELOPE_MODE);
    }
    files.remove(path);
}

/** The canonical, lane-contained path for one plan's envelope. */
export function envelopePath(laneDir: string, plan: EffectPlan): string {
    const name = `${plan.idempotencyKey.replace(/^sha256:/u, '')}.envelope.json`;
    try {
        return buildLaneFilePath(laneDir, join(ENVELOPE_RELATIVE_DIR, name));
    } catch (error) {
        throw new EffectExecutionError('EFFECT_PATH_ESCAPE', laneDir,
            `The invocation envelope path could not be canonically contained in the lane: ${(error as Error).message}`);
    }
}

/**
 * Build the checksum-bound document. `checksum` is a semantic digest of every
 * other member, so editing any field in place invalidates the envelope rather
 * than re-aiming it at another action, task, or lane.
 */
export function buildEnvelopeDocument(input: EnvelopeWriteInput, clock: EffectClock): InvocationEnvelopeDocument {
    const {plan, binding, target} = input;
    assertBindingMatchesPlan(plan, binding);
    const createdAt = clock.now();
    const expiresAt = new Date(createdAt.getTime() + (input.validityMs ?? DEFAULT_VALIDITY_MS));
    if (!(expiresAt.getTime() > createdAt.getTime())) {
        throw new EffectExecutionError('EFFECT_ENVELOPE_WRITE_FAILED', plan.actionId,
            'An invocation envelope must carry a positive validity window.');
    }
    const body = {
        schemaVersion: 1 as const,
        actionId: plan.actionId,
        laneId: plan.laneId,
        catalogId: target.catalogId,
        catalogSha256: target.catalogSha256,
        taskId: binding.taskId,
        inputSchema: binding.inputSchema,
        parameters: plan.parameters,
        preconditionDigest: plan.preconditionDigest,
        idempotencyKey: plan.idempotencyKey,
        lockId: input.lockId,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        resultDestination: join('coordinator', 'cycles', plan.cycleId, 'outcome.json'),
        journalDestination: join('coordinator', 'journal', 'effect-events.jsonl'),
        consumer: Object.freeze({handlerId: binding.handlerId, singleUse: true as const})
    };
    return Object.freeze({...body, checksum: canonicalDigest(body, plan.actionId)});
}

function assertBindingMatchesPlan(plan: EffectPlan, binding: LaneTaskBinding): void {
    if (binding.actionId !== plan.actionId || binding.taskId !== plan.taskId) {
        throw new EffectExecutionError('EFFECT_ACTION_BINDING_INVALID', plan.actionId,
            'The catalog binding does not name the planned action and task.');
    }
}
