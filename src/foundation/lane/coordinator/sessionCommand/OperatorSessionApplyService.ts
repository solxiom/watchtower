/**
 * `wt coordinator session apply <session-id> <proposal-id> [--dry-run]`
 * (CA-24 over CA-26; `docs/spec/operator-session.md` §15).
 *
 * CA-26's `SessionProposalService` owns confirmation, revalidation, and the
 * single handoff to CA-10's sole executor. This service only composes that
 * bridge from accepted owners — CA-09's validator, CA-10's executor over the
 * lane's own pinned immutable runtime catalog, CA-15's journal, and the
 * durable current-state capsule — and translates one refusal vocabulary into
 * this boundary's. It re-decides nothing: a dry run calls `preview`, which is
 * the same plan `apply` commits, and never `apply`.
 */
import {randomUUID} from 'node:crypto';
import type {JsonObject} from '../../../../contracts/types.js';
import type {SessionProposalRefused} from '../../../../contracts/index.js';
import {EffectExecutor, nodeEffectFileSystem} from '../../../effect/index.js';
import {ProposalValidator} from '../../../proposal/index.js';
import {RuntimeCatalog} from '../../../runtime/index.js';
import {LaneTaskCatalog, NirvanaLaneTaskRunner, nodeRuntimeFileSystem} from '../../../task/runtime/index.js';
import {pinnedTarget} from '../../../index/assembly/IndexBuildEffectAuthority.js';
import {SessionProposalService, SessionProposalStore} from '../sessionProposal/index.js';
import {
    sessionCommandFailure, type SessionCommandResult
} from '../../../../contracts/sessionCommand.js';
import {
    resolveSessionEffectContext, type SessionEffectContext, type SessionEffectContextOptions
} from './sessionEffectContext.js';
import {
    SessionCommandTargetResolver, type SessionCommandQuery, type SessionCommandTarget,
    type SessionCommandTargetOptions
} from './sessionCommandTarget.js';

export class OperatorSessionApplyService {
    private readonly resolver: SessionCommandTargetResolver;

    constructor(
        options: SessionCommandTargetOptions = {},
        private readonly effectOptions: SessionEffectContextOptions = {}
    ) {
        this.resolver = new SessionCommandTargetResolver(options);
    }

    async apply(
        query: SessionCommandQuery, operatorSessionId: string, proposalId: string, dryRun: boolean
    ): Promise<SessionCommandResult> {
        const resolved = this.resolver.resolve(query);
        if (!resolved.ok) return resolved;
        const context = resolveSessionEffectContext(resolved.target.lane, 'session-apply', this.effectOptions);
        if (!context.ok) return context;
        const service = this.compose(resolved.target, context.context);
        const request = {
            operatorSessionId, proposalId, cycleId: `session-apply-${proposalId}`,
            parameters: {} as JsonObject, runtimeContext: context.context.runtimeContext
        };
        const outcome = dryRun ? service.preview(request) : await service.apply(request);
        if (outcome.status === 'refused') return refusal(outcome, proposalId);
        return {
            ok: true,
            data: {
                schemaVersion: 1, action: 'apply', laneId: resolved.target.laneId,
                operatorSessionId, dryRun, applied: outcome.status === 'applied', detail: null,
                result: {proposalId, status: outcome.status}
            }
        };
    }

    /**
     * The CA-26 bridge, wired only to accepted owners. The task catalog is
     * opened per request from the lane's own pinned runtime, so no catalog is
     * cached across lanes and an unreadable one surfaces as a typed effect
     * refusal rather than an unclassified throw.
     */
    private compose(target: SessionCommandTarget, context: SessionEffectContext): SessionProposalService {
        const catalog = new RuntimeCatalog();
        const runner = new NirvanaLaneTaskRunner({
            runtimeRoots: {resolveRuntimeRoot: (version) => catalog.getRuntimeRoot(version)}
        });
        const runtimeTarget = pinnedTarget(context.runtimeContext.laneDir, context.runtimeContext.runtimeRoot);
        return new SessionProposalService({
            laneDir: target.laneDir,
            store: new SessionProposalStore(target.laneDir, nodeEffectFileSystem),
            validator: new ProposalValidator(),
            executor: new EffectExecutor({
                files: nodeEffectFileSystem, clock: {now: () => new Date()},
                ids: {nextEventId: () => randomUUID()}, runner, target: runtimeTarget,
                actions: {
                    resolveAction: (actionId) => LaneTaskCatalog
                        .open(runtimeTarget, context.runtimeContext.runtimeRoot, nodeRuntimeFileSystem)
                        .resolveAction(actionId)
                }
            }),
            journal: target.store,
            state: {read: () => context.authorization.currentState},
            clock: {now: () => new Date().toISOString()}
        });
    }
}

function refusal(outcome: SessionProposalRefused, proposalId: string): SessionCommandResult {
    return sessionCommandFailure('SESSION_COMMAND_EFFECT_REFUSED', proposalId, `${outcome.reason}: ${outcome.message}`);
}
