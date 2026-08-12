/**
 * The post-commit half of the init effect (LC-11).
 *
 * `docs/spec/v1-contracts.md` §11 fixes the boundary this module starts at:
 * "the commit point is atomic rename of the complete staged lane to its final
 * previously absent path", after which a failure "leaves a valid
 * home-discoverable lane … never a half-lane". Nothing here removes,
 * truncates, or rolls back the committed lane.
 *
 * The sequence is §2's: the lane is already committed as `bootstrap`, its
 * seal-bound pack index is activated and the committed lane re-verified, and
 * only then is `active` atomically projected. Membership registration is the
 * one explicitly non-fatal step — §11 requires an index-registration warning
 * rather than a failure — and runs last.
 *
 * Every step is idempotent, so re-running the completion against an already
 * completed lane — or against any durable state a failed completion left
 * behind — converges on the same result: LC-09's activation recompiles and
 * republishes deterministically from the same seal, the lifecycle projection
 * is an atomic whole-file replace, and LC-04's registration is idempotent by
 * contract. That is what makes retry, not compensation, the recovery path.
 *
 * Lock scope (`docs/spec/v1-contracts.md` §11). The lane directory exists from
 * the commit rename onward, so the complete four-lock scope becomes acquirable
 * and is held across index activation, verification, and the `bootstrap` →
 * `active` projection: no concurrent index or lane mutation can interleave in
 * that window. It is released before membership registration because LC-04's
 * registrar is the accepted owner of that publication and acquires the very
 * same normative scope itself; holding it here would deadlock against its own
 * acquisition. The handover point is deliberate and safe — the lane is already
 * `active`, and registration is idempotent and retried.
 */
import type {ConsumedPack} from '../../../contracts/pack.js';
import type {PackIndexCompileResult} from '../../../contracts/packIndex.js';
import {inPhase, inPhaseSync, refusal} from './initEffectFailure.js';
import type {InitEffectRequest, InitEffectResult, InitEffectWarning} from './initEffectContracts.js';
import type {InitEffectPorts} from './initEffectPorts.js';
import {LANE_STATE_RELATIVE_PATH} from './laneStateProjection.js';

export interface CommittedLane {
    readonly laneDir: string;
    readonly gitignoreUpdated: boolean;
}

/** Control-home-relative artifacts every applied init creates inside the lane. */
const LANE_ARTIFACTS = [
    'lane.json', 'install.json', 'repositories.local.json', 'lane.config.env', LANE_STATE_RELATIVE_PATH,
    'coordinator/coordinator-routing.json', 'coordinator/routing-policy.json', 'coordinator/context-policy.json',
    'coordinator/index/pack/current.json'
] as const;

export async function completeInitCommit(
    ports: InitEffectPorts, request: InitEffectRequest, pack: ConsumedPack, committed: CommittedLane
): Promise<InitEffectResult> {
    const laneDir = committed.laneDir;
    const indexId = await underCompletionLocks(ports, request, laneDir, pack);
    const warnings = await register(ports, request, laneDir);
    return buildResult(request, pack, committed, indexId, warnings);
}

/** Activation, verification, and the lifecycle projection under one continuous §11 lock scope. */
async function underCompletionLocks(
    ports: InitEffectPorts, request: InitEffectRequest, laneDir: string, pack: ConsumedPack
): Promise<string> {
    const lease = await inPhase('lock-acquisition', () => ports.acquireCompletionLocks(request, laneDir));
    try {
        const activation = requireActivation(
            await inPhase('index-activation', () => ports.activateIndex(request, pack, laneDir)));
        inPhaseSync('post-commit-verification', () => ports.verifyCommit(laneDir, pack));
        await inPhase('lifecycle-activation', () => ports.projectLifecycle(laneDir, 'active'));
        return activation.indexId;
    } finally {
        // Releasing cannot change what the window did, and rethrowing here
        // would mask the activation or projection outcome it protected.
        await lease.release().catch(() => undefined);
    }
}

/** A rejected activation leaves the committed lane in `bootstrap`; it is never a rollback. */
function requireActivation(result: PackIndexCompileResult): Extract<PackIndexCompileResult, {ok: true}> {
    if (result.ok) return result;
    throw refusal('index-activation', 'ERR_INDEX_UNAVAILABLE', result.target,
        `${result.reason}: the lane remains committed as bootstrap; re-run coordinator index build once ${result.detail}.`);
}

/**
 * §11: registration failure never fails init. A retried, still-unpublished
 * membership becomes an explicit warning on an otherwise valid lane.
 */
async function register(
    ports: InitEffectPorts, request: InitEffectRequest, laneDir: string
): Promise<readonly InitEffectWarning[]> {
    try {
        const result = await ports.registerMemberships(request, laneDir);
        if (result.registered) return [];
        return [{code: 'MEMBERSHIP_REGISTRATION_PENDING', message: result.warning
            ?? 'Secondary-repository discovery is unavailable until membership registration succeeds.'}];
    } catch (error) {
        return [{code: 'MEMBERSHIP_REGISTRATION_PENDING',
            message: `Secondary-repository discovery is unavailable until membership registration succeeds (${detail(error)}).`}];
    }
}

function buildResult(
    request: InitEffectRequest, pack: ConsumedPack, committed: CommittedLane,
    indexId: string, warnings: readonly InitEffectWarning[]
): InitEffectResult {
    const plan = request.plan;
    return Object.freeze({
        schemaVersion: 1 as const,
        applied: true as const,
        changed: Object.freeze(changedPaths(plan.lane.slug, committed)),
        unchanged: Object.freeze([] as string[]),
        warnings: Object.freeze([...plan.warnings.filter(warning => warning.code !== 'GITIGNORE_UPDATE_PENDING'), ...warnings]),
        lane: Object.freeze({
            id: plan.lane.id, slug: plan.lane.slug, kind: 'implementation' as const,
            dir: committed.laneDir, lifecycle: 'active' as const
        }),
        pack: Object.freeze({packId: pack.packId, sealId: pack.sealId, indexId})
    });
}

/** The bounded, stable, control-home-relative inventory of what this invocation created. */
function changedPaths(slug: string, committed: CommittedLane): string[] {
    const laneRoot = `.watchtower/lanes/${slug}`;
    const paths = [laneRoot, ...LANE_ARTIFACTS.map(artifact => `${laneRoot}/${artifact}`)];
    return committed.gitignoreUpdated ? [...paths, '.gitignore'] : paths;
}

function detail(error: unknown): string {
    return error instanceof Error ? error.message.slice(0, 120) : 'unknown registration failure';
}
