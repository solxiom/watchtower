/**
 * Closed public shapes for the single `wt init` effect (`docs/spec/v1.md`
 * §11.1, `docs/spec/v1-contracts.md` §2/§8/§11, LC-11). These types describe
 * only the composition boundary: the request the command front door hands to
 * the orchestrator, the ordered phase vocabulary every failure is attributed
 * to, and the applied result the presenter renders as a `mutationResult`.
 * No planning, validation, layout, or materialization policy lives here; each
 * of those remains with its accepted LC-01…LC-09 owner.
 */
import type {InitPlan} from '../../init/index.js';

/**
 * The ordered init effect phases. Everything up to and including
 * `lane-commit` is pre-commit: a failure there leaves no destination
 * directory, no membership change, and authoritative bytes unchanged.
 * Everything after it is post-commit: the lane is live and is never removed,
 * it simply stays `bootstrap` until activation completes.
 */
export const INIT_EFFECT_PHASES = [
    'pack-validation',
    'runtime-resolution',
    'lock-acquisition',
    'gitignore-update',
    'layout-composition',
    'lane-commit',
    'index-activation',
    'post-commit-verification',
    'lifecycle-activation',
    'membership-registration'
] as const;

export type InitEffectPhase = typeof INIT_EFFECT_PHASES[number];

/** The one lane lifecycle value init may durably project. */
export type InitLaneLifecycle = 'bootstrap' | 'active';

/** One non-fatal condition reported through the applied result. */
export interface InitEffectWarning {
    readonly code: string;
    readonly message: string;
}

/** Everything the orchestrator needs; the plan itself remains LC-01's authority. */
export interface InitEffectRequest {
    readonly plan: InitPlan;
    /** Resolved Watchtower data home, used for knowledge provenance and lock/index paths. */
    readonly dataHome: string;
}

/** The applied init result; a superset of the public `mutationResult` definition. */
export interface InitEffectResult {
    readonly schemaVersion: 1;
    readonly applied: true;
    readonly changed: readonly string[];
    readonly unchanged: readonly string[];
    readonly warnings: readonly InitEffectWarning[];
    readonly lane: {
        readonly id: string;
        readonly slug: string;
        readonly kind: 'implementation';
        readonly dir: string;
        readonly lifecycle: InitLaneLifecycle;
    };
    readonly pack: {readonly packId: string; readonly sealId: string; readonly indexId: string};
}
