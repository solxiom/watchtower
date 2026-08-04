/**
 * Closed public shapes for the coordinator/session policy baseline foundation
 * (`docs/spec/v1.md` §11.1 steps 11-12, `docs/spec/coordinator-automation.md`
 * §7/§17, `docs/spec/operator-session.md` §13.1, LC-05). `InitPlan` (LC-01,
 * accepted) already carries a verified `routing`/`routingProvenance`; this
 * capsule turns that plus the installed knowledge pack's provenance
 * (RT-02/UK-04 `KnowledgeManifestV1`) into the durable lane-owned policy
 * files and empty journal roots `docs/spec/coordinator-automation.md` §17
 * declares. It never reads or restates knowledge-pack Markdown and never
 * invokes a model; every emitted document is a finite, injected-collaborator
 * projection of already-verified structured inputs.
 */
import type {CoordinatorRoutingPolicy, InitPlan} from '../../init/index.js';
import type {KnowledgeProvenanceEvidence, Sha256Digest} from '../../../contracts/index.js';
import type {LaneFile, LaneLayout} from '../store/laneStoreContracts.js';

/** Attribution tag every emitted baseline document carries (`docs/spec/coordinator-automation.md` §17). */
export interface InstalledKnowledgeTag {
    readonly knowledgeVersion: string;
    readonly provenance: KnowledgeProvenanceEvidence;
}

/** `coordinator/routing-policy.json` — a pinned projection, never a restatement of `coordinator-routing.json`. */
export interface RoutingPolicyDocument {
    readonly schemaVersion: 1;
    readonly policyVersion: 'shipping-v1';
    readonly policyDigest: Sha256Digest;
    readonly adapters: readonly string[];
    readonly reserves: readonly string[];
    readonly installedKnowledge: InstalledKnowledgeTag;
}

export interface OperatorSessionTurnLimits {
    readonly inputTokens: number;
    readonly outputTokens: number;
}

export interface OperatorSessionSessionLimits {
    readonly cumulativeTokens: number;
    readonly turns: number;
    readonly contextRequests: number;
    readonly latencyMsP95: number;
    readonly storedFullTextBytes: number;
}

export interface OperatorSessionProfile {
    readonly perTurn: OperatorSessionTurnLimits;
    readonly perSession: OperatorSessionSessionLimits;
}

/** `context-policy.json#operatorSession` (`docs/spec/operator-session.md` §13.1 required-field list). */
export interface OperatorSessionPolicy {
    readonly defaultProfile: string;
    readonly profiles: Readonly<Record<string, OperatorSessionProfile>>;
    readonly laneWide: {
        readonly operatorSessionTotalTokens: number;
        readonly protectedCapacityPercent: number;
        readonly protectedReserves: readonly string[];
    };
    readonly maxOpenSessions: number;
    readonly maxConcurrentActiveTurns: number;
    readonly bounds: {
        readonly recentTurns: number;
        readonly pins: number;
        readonly crossSessionCapsules: number;
        readonly capsuleByteLimit: number;
        readonly brokerRequestsPerTurn: number;
        readonly brokerBytesPerTurn: number;
        readonly compactionTriggerTurns: number;
    };
    readonly retention: {
        readonly fullTextWhileOpenOrSuspended: true;
        readonly closedArchiveDays: number;
        readonly laneSessionByteLimit: number;
    };
    readonly holdExpiry: {
        readonly defaultMinutes: number;
        readonly maximumHours: number;
    };
    readonly confirmationRequirements: {
        readonly mutatingEffectProposal: true;
        readonly budgetOverrideGrant: true;
        readonly amendmentRequest: true;
    };
    readonly telemetryQuality: {
        readonly unknownProviderDimension: 'reported-unavailable';
    };
}

/** `coordinator/context-policy.json`. */
export interface ContextPolicyDocument {
    readonly schemaVersion: 1;
    readonly policyVersion: 'shipping-v1';
    readonly installedKnowledge: InstalledKnowledgeTag;
    readonly operatorSession: OperatorSessionPolicy;
}

/** The complete side-effect-free coordinator-baseline plan; composes into a `LaneLayout` alongside LC-03's own dirs/files. */
export interface CoordinatorBaselineLayout {
    readonly directories: readonly string[];
    readonly files: readonly LaneFile[];
}

export type {LaneLayout};

/** Injected collaborator resolving the installed knowledge pack's provenance (RT-02/UK-04 owned). */
export interface KnowledgeProvenancePort {
    resolve(dataHome: string): InstalledKnowledgeTag;
}

export interface CoordinatorBaselineInputs {
    readonly plan: Pick<InitPlan, 'laneDir' | 'routing' | 'routingProvenance'>;
    readonly dataHome: string;
    readonly knowledgePort?: KnowledgeProvenancePort;
}

export type {CoordinatorRoutingPolicy};
