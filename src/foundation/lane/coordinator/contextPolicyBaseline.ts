/**
 * Builds `coordinator/context-policy.json`. The `operatorSession` shape and
 * every limit is the finite v1 shipping baseline `docs/spec/v1-contracts.md`
 * §7 ("Operator-standard session defaults") pins by exact value, closing
 * every dimension `docs/spec/operator-session.md` §13.1 requires (named
 * profiles, per-turn/session limits, lane-wide limits and protected
 * escalation/recovery capacity, max open sessions and concurrent turns,
 * recent-turn/pin/capsule/broker/compaction bounds, closed retention and
 * lane session byte limit, hold-expiry bounds, mandatory confirmation
 * requirements, and unknown-dimension telemetry behavior). It is a constant,
 * model-free projection: `wt init` never asks a model to infer session
 * limits, and no Markdown guide asset is parsed to produce it.
 */
import {isJsonValue} from '../../schemaComposition/jsonCanonicalizer.js';
import {createWatchtowerError} from '../../../contracts/errors.js';
import type {ContextPolicyDocument, InstalledKnowledgeTag, OperatorSessionPolicy} from './coordinatorBaselineContracts.js';

/** Exact `docs/spec/v1-contracts.md` §7 "Operator-standard session defaults" values; every number is pinned, none is invented. */
const SHIPPING_OPERATOR_SESSION_BASELINE: OperatorSessionPolicy = Object.freeze({
    defaultProfile: 'operator-standard',
    profiles: Object.freeze({
        'operator-standard': Object.freeze({
            perTurn: Object.freeze({inputTokens: 40_000, outputTokens: 4_000}),
            perSession: Object.freeze({
                cumulativeTokens: 500_000, turns: 50, contextRequests: 2_000, latencyMsP95: 600_000,
                storedFullTextBytes: 33_554_432
            })
        })
    }),
    laneWide: Object.freeze({
        operatorSessionTotalTokens: 2_000_000, protectedCapacityPercent: 20,
        protectedReserves: Object.freeze(['escalation', 'recovery'])
    }),
    maxOpenSessions: 16,
    maxConcurrentActiveTurns: 2,
    bounds: Object.freeze({
        recentTurns: 8, pins: 16, crossSessionCapsules: 4, capsuleByteLimit: 65_536,
        brokerRequestsPerTurn: 8, brokerBytesPerTurn: 262_144, compactionTriggerTurns: 8
    }),
    retention: Object.freeze({fullTextWhileOpenOrSuspended: true, closedArchiveDays: 30, laneSessionByteLimit: 268_435_456}),
    holdExpiry: Object.freeze({defaultMinutes: 60, maximumHours: 24}),
    confirmationRequirements: Object.freeze({mutatingEffectProposal: true, budgetOverrideGrant: true, amendmentRequest: true}),
    telemetryQuality: Object.freeze({unknownProviderDimension: 'reported-unavailable'})
});

export function buildContextPolicyDocument(installedKnowledge: InstalledKnowledgeTag): ContextPolicyDocument {
    const document: ContextPolicyDocument = Object.freeze({
        schemaVersion: 1, policyVersion: 'shipping-v1', installedKnowledge, operatorSession: SHIPPING_OPERATOR_SESSION_BASELINE
    });
    if (!isJsonValue(document)) {
        throw createWatchtowerError('ERR_INTEGRITY_FAILURE', {
            operation: 'materialize operator-session policy', target: 'context-policy.json',
            remediation: 'Report a shipping-baseline defect; every limit must be finite JSON.'
        });
    }
    return document;
}
