/**
 * Endpoint telemetry quality and shared-pool accounting
 * (`docs/spec/coordinator-automation.md` §10.2, `docs/spec/v1-contracts.md`
 * §6/§7: "Routes sharing a capacityPoolId debit the same reservation and
 * usage record"; "Unknown provider capacity cannot satisfy a monetary/quota
 * hard limit"). This capsule tracks *token* usage per shared capacity pool;
 * CA-06's `groupCapacityPools` (`src/foundation/init/EndpointEligibility.ts`)
 * already owns *slot* accounting and is not recomputed here — this ledger
 * consumes a `CapacityPoolUsage` snapshot as its sole source of pool
 * membership/availability truth.
 */
import type {CapacityPoolLedgerState, CapacityPoolUsage, EndpointUsageLimits, EndpointUsageRecord, TelemetryQuality} from '../../contracts/index.js';
import {brokerFailure} from './contextBrokerErrors.js';

const QUALITY_RANK: Readonly<Record<TelemetryQuality, number>> = Object.freeze({reported: 2, estimated: 1, unknown: 0});

function worstOf(left: TelemetryQuality, right: TelemetryQuality): TelemetryQuality {
    return QUALITY_RANK[left] <= QUALITY_RANK[right] ? left : right;
}

export function initialCapacityPoolLedgerState(snapshot: CapacityPoolUsage): CapacityPoolLedgerState {
    return Object.freeze({
        capacityPoolId: snapshot.capacityPoolId,
        endpointIds: Object.freeze([...snapshot.endpointIds]),
        limitSlots: snapshot.endpointIds.length,
        availableSlotsAtSnapshot: snapshot.availableSlots,
        cumulativeTokens: 0,
        usageCount: 0,
        worstTelemetryQuality: 'reported'
    });
}

/** Fails closed on a pool ledger whose fields are not the safe, well-formed shape this module itself only ever produces — the defense against a snapshot round-tripped through untrusted storage. */
function validatePoolState(pool: CapacityPoolLedgerState): void {
    if (!Array.isArray(pool.endpointIds)) brokerFailure('BROKER_REFERENCE_INVALID', pool.capacityPoolId, 'endpointIds must be an array of endpoint ids');
    if (!Number.isSafeInteger(pool.limitSlots) || pool.limitSlots < 0) brokerFailure('BROKER_REFERENCE_INVALID', pool.capacityPoolId, 'limitSlots must be a non-negative safe integer');
    if (!Number.isSafeInteger(pool.availableSlotsAtSnapshot) || pool.availableSlotsAtSnapshot < 0) brokerFailure('BROKER_REFERENCE_INVALID', pool.capacityPoolId, 'availableSlotsAtSnapshot must be a non-negative safe integer');
    if (!Number.isSafeInteger(pool.cumulativeTokens) || pool.cumulativeTokens < 0) brokerFailure('BROKER_REFERENCE_INVALID', pool.capacityPoolId, 'cumulativeTokens must be a non-negative safe integer');
    if (!Number.isSafeInteger(pool.usageCount) || pool.usageCount < 0) brokerFailure('BROKER_REFERENCE_INVALID', pool.capacityPoolId, 'usageCount must be a non-negative safe integer');
}

/**
 * Debits one endpoint invocation's tokens against its shared pool. Fails
 * closed — the prior `pool` state the caller holds is left untouched,
 * because this module never mutates its arguments — when: the usage record
 * names a pool the caller did not resolve a snapshot for
 * (`BROKER_CAPACITY_POOL_UNKNOWN`, matching "missing/stale/corrupt/
 * incompatible predecessor evidence fails closed"); the pool has no free
 * slots at the supplied snapshot (`BROKER_CAPACITY_EXHAUSTED`); the usage is
 * `unknown`-quality telemetry while a monetary/quota hard limit applies to
 * the pool (`BROKER_UNKNOWN_TELEMETRY_FOR_HARD_LIMIT`, matching
 * `docs/spec/v1-contracts.md` §7's "unknown provider capacity cannot satisfy
 * a monetary/quota hard limit"); or the debit would push the pool's
 * cumulative token usage past its numeric `monetaryHardLimitTokens` ceiling
 * (`BROKER_CAPACITY_QUOTA_EXCEEDED` — usage exactly equal to the limit is
 * admitted, only usage that would exceed it is refused).
 */
export function debitEndpointUsage(
    pool: CapacityPoolLedgerState | null,
    usage: EndpointUsageRecord,
    limits: EndpointUsageLimits
): CapacityPoolLedgerState {
    if (pool === null) brokerFailure('BROKER_CAPACITY_POOL_UNKNOWN', usage.capacityPoolId, `no capacity-pool snapshot was resolved for pool "${usage.capacityPoolId}" before debiting endpoint "${usage.endpointId}"`);
    if (pool.capacityPoolId !== usage.capacityPoolId) brokerFailure('BROKER_CAPACITY_POOL_UNKNOWN', usage.capacityPoolId, `usage record capacity pool does not match the resolved snapshot's pool "${pool.capacityPoolId}"`);
    validatePoolState(pool);
    if (!pool.endpointIds.includes(usage.endpointId)) {
        brokerFailure('BROKER_ENDPOINT_NOT_IN_POOL', usage.endpointId, `endpoint "${usage.endpointId}" is not a member of the resolved capacity pool "${pool.capacityPoolId}"`);
    }
    if (pool.availableSlotsAtSnapshot < 1) brokerFailure('BROKER_CAPACITY_EXHAUSTED', pool.capacityPoolId, `capacity pool "${pool.capacityPoolId}" has no available slots at the resolved snapshot`);
    if (limits.monetaryHardLimitTokens !== null && (!Number.isSafeInteger(limits.monetaryHardLimitTokens) || limits.monetaryHardLimitTokens < 0)) {
        brokerFailure('BROKER_LIMITS_INVALID', pool.capacityPoolId, 'monetaryHardLimitTokens must be null or a non-negative safe integer');
    }
    if (!Number.isSafeInteger(usage.tokens) || usage.tokens < 0) brokerFailure('BROKER_REFERENCE_INVALID', usage.endpointId, 'endpoint usage tokens must be a non-negative safe integer');
    if (limits.monetaryHardLimitTokens !== null && usage.telemetryQuality === 'unknown') {
        brokerFailure('BROKER_UNKNOWN_TELEMETRY_FOR_HARD_LIMIT', usage.endpointId, `pool "${pool.capacityPoolId}" has a monetary/quota hard limit; unknown-quality telemetry cannot satisfy it`);
    }
    const projectedTokens = pool.cumulativeTokens + usage.tokens;
    if (!Number.isSafeInteger(projectedTokens)) brokerFailure('BROKER_REFERENCE_INVALID', pool.capacityPoolId, 'accumulated pool usage is no longer representable as a safe integer');
    if (limits.monetaryHardLimitTokens !== null && projectedTokens > limits.monetaryHardLimitTokens) {
        brokerFailure('BROKER_CAPACITY_QUOTA_EXCEEDED', pool.capacityPoolId, `debiting ${usage.tokens} tokens would bring pool "${pool.capacityPoolId}" to ${projectedTokens}, exceeding its ${limits.monetaryHardLimitTokens}-token hard limit`);
    }
    return Object.freeze({
        ...pool,
        cumulativeTokens: projectedTokens,
        usageCount: pool.usageCount + 1,
        worstTelemetryQuality: worstOf(pool.worstTelemetryQuality, usage.telemetryQuality)
    });
}
