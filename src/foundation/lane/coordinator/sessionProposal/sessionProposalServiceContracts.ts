/**
 * The request vocabulary of the session-proposal bridge's front door (CA-26).
 *
 * Type-only. These sit beside the service rather than in `src/contracts/`
 * because they name in-process collaborators — the durable store, the injected
 * ports, CA-10's `LockLevel` and `AbortSignal` — which are capsule wiring, not
 * the versioned domain vocabulary a consumer serializes. The serializable half
 * of this capability lives in `contracts/sessionProposal.ts`.
 */
import type {LaneRuntimeContext, SessionProposalType} from '../../../../contracts/index.js';
import type {JsonObject} from '../../../../contracts/types.js';
import type {LockLevel} from '../../../effect/index.js';
import type {
    SessionProposalClock, SessionProposalEffectPort, SessionProposalJournalPort, SessionProposalStatePort,
    SessionProposalValidatorPort
} from './sessionProposalPorts.js';
import type {SessionProposalStore} from './SessionProposalStore.js';

export interface SessionProposalServiceDeps {
    readonly laneDir: string;
    readonly store: SessionProposalStore;
    readonly validator: SessionProposalValidatorPort;
    readonly executor: SessionProposalEffectPort;
    readonly journal: SessionProposalJournalPort;
    readonly state: SessionProposalStatePort;
    readonly clock: SessionProposalClock;
}

/** One proposal, addressed the way it is stored: inside its owning operator session. */
export interface SessionProposalRef {
    readonly operatorSessionId: string;
    readonly proposalId: string;
}

export interface RecordSessionProposalRequest {
    readonly operatorSessionId: string;
    readonly sourceTurnId: string;
    readonly proposalType: SessionProposalType;
    /** The wire `$defs.decisionProposal` document produced by the turn; untrusted until CA-09 shapes it. */
    readonly proposal: unknown;
}

export interface ApplySessionProposalRequest extends SessionProposalRef {
    readonly cycleId: string;
    readonly parameters: JsonObject;
    readonly runtimeContext: LaneRuntimeContext;
    readonly lockLevels?: readonly LockLevel[];
    readonly cancellation?: AbortSignal;
}
