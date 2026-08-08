/**
 * The closed effect→declared-runtime-action registry (CA-10).
 *
 * `docs/spec/coordinator-automation.md` §12.1 requires that "requested effects
 * map only to declared runtime actions", and `docs/spec/v1-contracts.md` §5
 * closes the external adapter set to tmux session creation and Git push: "Any
 * other external effect is rejected."
 *
 * This table is the single place that mapping exists. It is a frozen module
 * constant, never a mutable registry an adapter or command can add to at
 * runtime — an effect with no entry here cannot be planned at all, so a new
 * effect requires a spec, knowledge-policy, and catalog change rather than a
 * registration call.
 */
import {EFFECT_TYPES, type EffectType} from '../../contracts/proposals.js';
import {EffectExecutionError, type DeclaredRuntimeAction} from '../../contracts/effects.js';

const DECLARED_ACTIONS: readonly DeclaredRuntimeAction[] = Object.freeze([
    action('dispatch-batch', 'effect.dispatchBatch', 'external', 'external-effect', 'tmux-session'),
    action('open-correction', 'effect.openCorrection', 'lane-local', 'authoritative-effect', null),
    action('route-correction', 'effect.routeCorrection', 'lane-local', 'authoritative-effect', null),
    action('reroute-endpoint', 'effect.rerouteEndpoint', 'lane-local', 'authoritative-effect', null),
    action('reconcile-projection', 'effect.reconcileProjection', 'lane-local', 'journaled-mutation', null),
    action('rebuild-index', 'coordinator.index.apply', 'lane-local', 'authoritative-effect', null),
    action('create-amendment-request', 'effect.createAmendmentRequest', 'lane-local', 'journaled-mutation', null),
    action('activate-pack-revision', 'effect.activatePackRevision', 'lane-local', 'authoritative-effect', null),
    action('resume-blocked-session', 'effect.resumeBlockedSession', 'lane-local', 'authoritative-effect', null),
    action('grant-session-budget', 'effect.grantSessionBudget', 'lane-local', 'journaled-mutation', null),
    action('place-hold', 'effect.placeHold', 'lane-local', 'authoritative-effect', null),
    action('release-hold', 'effect.releaseHold', 'lane-local', 'authoritative-effect', null),
    action('open-escalation', 'effect.openEscalation', 'lane-local', 'journaled-mutation', null),
    // CA-12: the `review-accept-v1` M0 result. `record-acceptance` is a
    // durable lane-local journal write (no Git); `publish-commits` is the
    // second permitted v1 external adapter (§5) — GitAcceptanceAdapter is
    // their sole planner and caller, never a `DecisionProposal`.
    action('record-acceptance', 'git.record-acceptance', 'lane-local', 'authoritative-effect', null),
    action('publish-commits', 'git.publish-commits', 'external', 'external-effect', 'git-push')
]);

const BY_EFFECT: ReadonlyMap<EffectType, DeclaredRuntimeAction> =
    new Map(DECLARED_ACTIONS.map((entry) => [entry.effect, entry]));

/** The complete declared set, in registry order — the one enumeration callers may read. */
export function declaredRuntimeActions(): readonly DeclaredRuntimeAction[] {
    return DECLARED_ACTIONS;
}

/**
 * Resolve one effect to its declared action, or refuse. Refusal is
 * deterministic and happens before any lock, journal write, or process start.
 */
export function resolveDeclaredAction(effect: EffectType): DeclaredRuntimeAction {
    const declared = BY_EFFECT.get(effect);
    if (declared === undefined) {
        throw new EffectExecutionError('EFFECT_ACTION_UNDECLARED', effect,
            `Effect "${effect}" maps to no declared runtime action.`);
    }
    if (declared.scope === 'external' && declared.externalAdapter === null) {
        throw new EffectExecutionError('EFFECT_EXTERNAL_UNSUPPORTED', effect,
            `Effect "${effect}" declares an external scope without one of the two permitted v1 adapters.`);
    }
    return declared;
}

/**
 * Every closed `EffectType` that maps to a real effect has exactly one entry.
 * `classify-reject` and `propose-specification-resolution` are advisory-only
 * *proposal* types and contribute no effect, so the effect vocabulary itself is
 * fully covered here.
 */
export function undeclaredEffectTypes(): readonly EffectType[] {
    return EFFECT_TYPES.filter((effect) => !BY_EFFECT.has(effect));
}

function action(
    effect: EffectType, actionId: string, scope: DeclaredRuntimeAction['scope'],
    mutationClass: DeclaredRuntimeAction['mutationClass'], externalAdapter: DeclaredRuntimeAction['externalAdapter']
): DeclaredRuntimeAction {
    return Object.freeze({effect, actionId, scope, mutationClass, externalAdapter});
}
