/**
 * `InitEffect` — the single `wt init` effect orchestrator (LC-11;
 * `docs/spec/v1.md` §11.1, `docs/spec/v1-contracts.md` §2/§11).
 *
 * Front door only. It sequences the already-accepted owners behind
 * `InitEffectPorts` — LC-02 pack acceptance/seal/drift, runtime resolution,
 * LC-01 lock scope, LC-04 Git-ignore mutation, LC-03/LC-05 layout assembly and
 * the transactional commit, then LC-09 index activation — and owns none of
 * their algorithms. It is not the CA-10 lane effect authority: no proposal,
 * journal record, model invocation, or external effect participates, because
 * "external effects never occur inside init" (§11).
 *
 * The pre-commit rule is absolute. Every failure at or before `lane-commit`
 * leaves the destination lane directory absent, the membership index
 * untouched, and `.gitignore` restored to the operator's original bytes. That
 * comes from ordering, not compensation: validation and runtime resolution
 * precede every lock and mutation, the Git-ignore replace is the only
 * pre-commit mutation outside the private staging directory, and the staged
 * tree is committed by exactly one atomic rename onto a previously absent
 * path.
 *
 * Everything after that rename is post-commit and lives in
 * `initCommitCompletion.ts`: the lane is live, is never removed, and simply
 * remains `bootstrap` until activation and verification succeed.
 */
import type {ConsumedPack} from '../../../contracts/pack.js';
import type {InitLockLease} from '../../init/index.js';
import {completeInitCommit, type CommittedLane} from './initCommitCompletion.js';
import type {InitEffectRequest, InitEffectResult} from './initEffectContracts.js';
import {inPhase, inPhaseSync, refusal} from './initEffectFailure.js';
import type {InitEffectPorts, InitGitignoreMutation, InitInstallResolution} from './initEffectPorts.js';

export class InitEffect {
    constructor(private readonly ports: InitEffectPorts) {}

    /**
     * Applies one complete init. Throws a typed `WatchtowerError` for every
     * refusal; a result is returned only once the lane is live and its
     * `active` lifecycle projection has been published.
     */
    async apply(request: InitEffectRequest): Promise<InitEffectResult> {
        const pack = await inPhase('pack-validation', () => this.ports.validatePack(request));
        const install = inPhaseSync('runtime-resolution', () => this.ports.resolveInstall(request, pack));
        const lease = await inPhase('lock-acquisition', () => this.ports.acquireLocks(request));
        const committed = await this.commitUnderLease(request, pack, install, lease);
        return completeInitCommit(this.ports, request, pack, committed);
    }

    /** Holds the pre-commit lock scope across the only two mutating pre-commit steps. */
    private async commitUnderLease(
        request: InitEffectRequest, pack: ConsumedPack, install: InitInstallResolution, lease: InitLockLease
    ): Promise<CommittedLane> {
        let gitignore: InitGitignoreMutation | null = null;
        try {
            gitignore = await this.mutateGitignore(request);
            const layout = inPhaseSync('layout-composition', () => this.ports.composeLayout(request, pack, install));
            const result = await inPhase('lane-commit', () => this.ports.commitLayout(layout));
            return {laneDir: result.laneDir, gitignoreUpdated: gitignore !== null};
        } catch (error) {
            await this.rollback(request, gitignore, error);
            throw error;
        } finally {
            // A release failure never changes what init did: the §11 lock
            // records are advisory and reclaimable by the next holder's own
            // liveness check, and rethrowing here would mask the actual commit
            // outcome — including a successful commit — with a lock error.
            await lease.release().catch(() => undefined);
        }
    }

    /**
     * LC-01 already decided authorization: a plan that reaches here either has
     * `/.watchtower/` Git-ignored or carries the operator-authorized
     * `GITIGNORE_UPDATE_PENDING` warning. This step only performs that
     * authorized mutation, and re-checks LC-04's own predicate so coverage
     * added between planning and apply is never rewritten.
     */
    private async mutateGitignore(request: InitEffectRequest): Promise<InitGitignoreMutation | null> {
        return inPhase('gitignore-update', async () => {
            const authorized = request.plan.warnings.some(warning => warning.code === 'GITIGNORE_UPDATE_PENDING');
            if (!authorized) return null;
            if (!await this.ports.gitignoreUpdateRequired(request.plan.controlHome)) return null;
            return this.ports.updateGitignore(request.plan.controlHome);
        });
    }

    /**
     * Pre-commit rollback. LC-03's own commit boundary has already removed the
     * staged tree, so the only compensation left is LC-04's conditional
     * Git-ignore restore, which succeeds only while the current bytes still
     * digest to what init wrote. A refused restore is a recoverable conflict
     * (§11) reported instead of the original failure only when it is the more
     * dangerous condition: unreconciled operator bytes.
     */
    private async rollback(
        request: InitEffectRequest, gitignore: InitGitignoreMutation | null, cause: unknown
    ): Promise<void> {
        if (gitignore === null) return;
        const restored = await this.ports.restoreGitignore(request.plan.controlHome, gitignore.originalDigest)
            .catch(() => false);
        if (restored) return;
        throw refusal('gitignore-update', 'ERR_UNSAFE_MUTATION', gitignore.path,
            `Init rolled back after ${describe(cause)} but could not restore .gitignore, which changed after init wrote it; reconcile it manually.`);
    }
}

function describe(cause: unknown): string {
    if (cause !== null && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string') return cause.code;
    return 'a lane commit failure';
}
