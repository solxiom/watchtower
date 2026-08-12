/**
 * The injected collaborator boundary of the single `wt init` effect (LC-11).
 *
 * Every port is one already-accepted owner seen through the narrowest shape
 * the orchestrator needs: LC-02 pack acceptance/seal/drift, RT-04/RT-06
 * runtime resolution, LC-01 lock scope, LC-04 Git-ignore mutation and
 * membership registration, LC-03 layout assembly and the transactional commit,
 * and LC-09 seal-bound index activation. The orchestrator holds none of their
 * algorithms; these interfaces exist so each failure boundary named by the
 * LC-11 proof matrix can be injected in a focused adversarial test without
 * replacing the production composition.
 */
import type {ConsumedPack} from '../../../contracts/pack.js';
import type {PackIndexCompileResult} from '../../../contracts/packIndex.js';
import type {PinnedTaskRuntimeTarget} from '../../../contracts/taskRuntime.js';
import type {InitLockLease, InitPlan} from '../../init/index.js';
import type {RegistrationResult} from '../../lifecycle/index.js';
import type {LaneLayout, RuntimeAssetRef} from '../store/index.js';
import type {WriteResult} from '../writer/index.js';
import type {InitEffectRequest, InitLaneLifecycle} from './initEffectContracts.js';

/** The release/runtime facts `install.json` needs that `InitPlan` does not carry. */
export interface InitInstallResolution {
    readonly cliVersion: string;
    readonly knowledgeVersion: string;
    readonly taskRuntime: PinnedTaskRuntimeTarget;
    readonly runtimeRefs: readonly RuntimeAssetRef[];
}

/** The conditional `--update-gitignore` mutation, recorded for pre-commit rollback. */
export interface InitGitignoreMutation {
    readonly path: string;
    readonly originalDigest: string;
}

export interface InitEffectPorts {
    /**
     * LC-02: consume, seal-verify, and drift-classify the committed pack.
     * Throws a typed refusal for every Phase 4 condition; never mutates.
     */
    validatePack(request: InitEffectRequest): Promise<ConsumedPack>;
    /**
     * RT-04/RT-06: resolve the installed runtime assets and the verified
     * task-runtime pin. Synchronous because every accepted collaborator behind
     * it is; this contract does not promise asynchrony it does not have.
     */
    resolveInstall(request: InitEffectRequest, pack: ConsumedPack): InitInstallResolution;
    /** LC-01: the pre-commit init lock scope (data-root and publication locks). */
    acquireLocks(request: InitEffectRequest): Promise<InitLockLease>;
    /**
     * LC-01: the complete four-lock §11 scope, acquirable only once the lane
     * directory exists. Held across index activation, post-commit
     * verification, and the `bootstrap` → `active` projection so no concurrent
     * index or lane mutation can interleave inside that window.
     */
    acquireCompletionLocks(request: InitEffectRequest, laneDir: string): Promise<InitLockLease>;
    /** LC-04: whether `/.watchtower/` still needs Git-ignore coverage. */
    gitignoreUpdateRequired(controlHome: string): Promise<boolean>;
    /** LC-04: atomic `.gitignore` replace recording the original digest. */
    updateGitignore(controlHome: string): Promise<InitGitignoreMutation>;
    /** LC-04: conditional restore; `false` means the current bytes are no longer init's. */
    restoreGitignore(controlHome: string, originalDigest: string): Promise<boolean>;
    /** LC-03 + LC-05: the complete side-effect-free lane layout, including the bootstrap state file. */
    composeLayout(request: InitEffectRequest, pack: ConsumedPack, install: InitInstallResolution): LaneLayout;
    /** LC-03: staging, manifests, fsync, and the single atomic commit rename. */
    commitLayout(layout: LaneLayout): Promise<WriteResult>;
    /** LC-09: seal-bound compile, verify, and atomic activation of the pack index. */
    activateIndex(request: InitEffectRequest, pack: ConsumedPack, laneDir: string): Promise<PackIndexCompileResult>;
    /** Re-reads the committed lane through the accepted readers; throws when it is not usable. */
    verifyCommit(laneDir: string, pack: ConsumedPack): void;
    /** Atomic lane-state projection; the only writer of the durable lifecycle value. */
    projectLifecycle(laneDir: string, lifecycle: InitLaneLifecycle): Promise<void>;
    /** LC-04: idempotent, retried, post-commit membership publication. */
    registerMemberships(request: InitEffectRequest, laneDir: string): Promise<RegistrationResult>;
}
