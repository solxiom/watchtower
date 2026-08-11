/**
 * `wt coordinator session amendment request|list|admit` (CA-24 over CA-27;
 * `docs/spec/specification-resolution.md` §6-§7, §9).
 *
 * CA-27 owns the amendment request document and the atomic admission; this
 * service names one of its accepted entry points per command form and nothing
 * else. Admission authority is never assembled here: the `admit-pack-amendment`
 * proposal and the current-state projection both come from the durable capsule
 * the coordinator wrote, so an operator cannot type their way past spec
 * authority, independent acceptance, or the current active seal.
 */
import type {JsonObject} from '../../../../contracts/types.js';
import type {AdmitPackAmendmentBody, DecisionProposal} from '../../../../contracts/proposals.js';
import {
    AmendmentAdmissionService, AmendmentError, AmendmentRequestStore, nodeAmendmentIdFactory
} from '../amendment/index.js';
import {nodeEffectFileSystem} from '../../../effect/index.js';
import {nodeLaneMutationLock, queueFileSystemOver} from '../queue/index.js';
import {
    sessionCommandFailure, type SessionCommandResult
} from '../../../../contracts/sessionCommand.js';
import {
    resolveSessionEffectContext, type SessionEffectContextOptions
} from './sessionEffectContext.js';
import {
    SessionCommandTargetResolver, type SessionCommandQuery, type SessionCommandTarget,
    type SessionCommandTargetOptions
} from './sessionCommandTarget.js';

export interface AmendmentRequestInput {
    readonly packId: string;
    readonly reason: string;
}

export class OperatorSessionAmendmentService {
    private readonly resolver: SessionCommandTargetResolver;

    constructor(
        options: SessionCommandTargetOptions = {},
        private readonly effectOptions: SessionEffectContextOptions = {}
    ) {
        this.resolver = new SessionCommandTargetResolver(options);
    }

    /** `session amendment request <session-id> --pack --reason` — a request, never an edit. */
    request(query: SessionCommandQuery, sessionId: string, input: AmendmentRequestInput, dryRun: boolean): SessionCommandResult {
        const resolved = this.resolver.resolve(query);
        if (!resolved.ok) return resolved;
        if (dryRun) {
            return ok(resolved.target, 'amendment', sessionId, true, false, {operation: 'request', packId: input.packId, reason: input.reason});
        }
        try {
            const record = this.store(resolved.target).create({packId: input.packId, reason: input.reason});
            resolved.target.store.appendEvent(sessionId, 'amendment-requested', {amendmentRequestId: record.amendmentRequestId, packId: record.packId});
            return ok(resolved.target, 'amendment', sessionId, false, true, {operation: 'request', request: {...record}});
        } catch (error) {
            return this.refuse(error, sessionId);
        }
    }

    list(query: SessionCommandQuery, sessionId: string | null): SessionCommandResult {
        const resolved = this.resolver.resolve(query);
        if (!resolved.ok) return resolved;
        try {
            return ok(resolved.target, 'amendment', sessionId, false, false, {
                operation: 'list', requests: this.store(resolved.target).list().map((record) => ({...record}))
            });
        } catch (error) {
            return this.refuse(error, sessionId ?? resolved.target.laneId);
        }
    }

    /**
     * `session amendment admit <request-id> [--dry-run]`. The dry run reads the
     * capsule and reports exactly what would be admitted; it acquires no lock,
     * activates no revision, and writes nothing.
     */
    admit(query: SessionCommandQuery, amendmentRequestId: string, dryRun: boolean): SessionCommandResult {
        const resolved = this.resolver.resolve(query);
        if (!resolved.ok) return resolved;
        const context = resolveSessionEffectContext(resolved.target.lane, 'session-amendment-admit', this.effectOptions);
        if (!context.ok) return context;
        const proposal = context.context.authorization.proposal as DecisionProposal;
        if (proposal.type !== 'admit-pack-amendment') {
            return sessionCommandFailure('SESSION_COMMAND_AMENDMENT_REFUSED', amendmentRequestId,
                `the durable capsule carries a ${proposal.type} proposal, not admit-pack-amendment`);
        }
        const body = proposal.body as AdmitPackAmendmentBody;
        if (body.amendmentRequestId !== amendmentRequestId) {
            return sessionCommandFailure('SESSION_COMMAND_AMENDMENT_REFUSED', amendmentRequestId,
                `the durable capsule authorizes ${body.amendmentRequestId}, not the identity named on the command line`);
        }
        const state = context.context.authorization.currentState;
        if (dryRun) {
            return ok(resolved.target, 'amendment', null, true, false, {
                operation: 'admit', amendmentRequestId, candidateSeal: body.candidateSeal, supersedesSeal: body.supersedesSeal
            });
        }
        try {
            const revision = this.admission(resolved.target).admit({
                amendmentRequestId, blockerId: body.blockerId, affectedWorktreeIds: [], body,
                authority: {
                    packActiveSeal: state.packIndex.activeSeal,
                    ...(state.operatorSession === undefined ? {} : {operatorSession: {sessionId: state.operatorSession.sessionId, role: state.operatorSession.role}})
                }
            });
            return ok(resolved.target, 'amendment', null, false, true, {operation: 'admit', amendmentRequestId, revision: {...revision}});
        } catch (error) {
            return this.refuse(error, amendmentRequestId);
        }
    }

    private store(target: SessionCommandTarget): AmendmentRequestStore {
        return new AmendmentRequestStore({
            laneDir: target.laneDir, laneId: target.laneId, files: queueFileSystemOver(nodeEffectFileSystem),
            lock: nodeLaneMutationLock(target.laneDir), clock: {now: () => new Date()}, ids: nodeAmendmentIdFactory
        });
    }

    private admission(target: SessionCommandTarget): AmendmentAdmissionService {
        return new AmendmentAdmissionService({
            laneDir: target.laneDir, laneId: target.laneId, files: nodeEffectFileSystem,
            clock: {now: () => new Date()}, lock: nodeLaneMutationLock(target.laneDir)
        });
    }

    private refuse(error: unknown, target: string): SessionCommandResult {
        if (!(error instanceof AmendmentError)) throw error;
        return sessionCommandFailure('SESSION_COMMAND_AMENDMENT_REFUSED', target, `${error.reason}: ${error.message}`);
    }
}

function ok(
    target: SessionCommandTarget, action: 'amendment', sessionId: string | null, dryRun: boolean,
    applied: boolean, result: JsonObject
): SessionCommandResult {
    return {
        ok: true,
        data: {
            schemaVersion: 1, action, laneId: target.laneId, operatorSessionId: sessionId,
            dryRun, applied, detail: null, result
        }
    };
}
