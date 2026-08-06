import type {CapacityPoolUsage, EndpointUsageLimits, EndpointUsageRecord} from '../../../src/contracts/index.js';
import {BrokerError} from '../../../src/foundation/broker/index.js';
import {debitEndpointUsage, initialCapacityPoolLedgerState} from '../../../src/foundation/broker/index.js';

const SNAPSHOT: CapacityPoolUsage = Object.freeze({capacityPoolId: 'pool-a', endpointIds: Object.freeze(['ep-1', 'ep-2']), availableSlots: 1});
const NO_MONETARY_LIMIT: EndpointUsageLimits = Object.freeze({monetaryHardLimitTokens: null});
const WITH_MONETARY_LIMIT: EndpointUsageLimits = Object.freeze({monetaryHardLimitTokens: 1000});

function usage(overrides: Partial<EndpointUsageRecord> = {}): EndpointUsageRecord {
    return {endpointId: 'ep-1', capacityPoolId: 'pool-a', tokens: 100, telemetryQuality: 'reported', ...overrides};
}

function reasonOf(fn: () => unknown): string {
    try {
        fn();
    } catch (error) {
        if (error instanceof BrokerError) return error.reason;
        throw error;
    }
    throw new Error('expected a BrokerError to be thrown');
}

describe('contextBrokerEndpointUsage', function () {
    it('builds a zeroed ledger from a CA-06 capacity-pool snapshot', function () {
        const state = initialCapacityPoolLedgerState(SNAPSHOT);
        expect(state.capacityPoolId).toBe('pool-a');
        expect(state.limitSlots).toBe(2);
        expect(state.endpointIds).toEqual(['ep-1', 'ep-2']);
        expect(state.availableSlotsAtSnapshot).toBe(1);
        expect(state.cumulativeTokens).toBe(0);
        expect(state.worstTelemetryQuality).toBe('reported');
    });

    it('accumulates tokens and usage count across routes sharing one capacityPoolId', function () {
        let state = initialCapacityPoolLedgerState(SNAPSHOT);
        state = debitEndpointUsage(state, usage({endpointId: 'ep-1', tokens: 100}), NO_MONETARY_LIMIT);
        state = debitEndpointUsage(state, usage({endpointId: 'ep-2', tokens: 50}), NO_MONETARY_LIMIT);
        expect(state.cumulativeTokens).toBe(150);
        expect(state.usageCount).toBe(2);
    });

    it('tracks the worst telemetry quality seen, never silently upgrading it back', function () {
        let state = initialCapacityPoolLedgerState(SNAPSHOT);
        state = debitEndpointUsage(state, usage({telemetryQuality: 'reported'}), NO_MONETARY_LIMIT);
        state = debitEndpointUsage(state, usage({telemetryQuality: 'estimated'}), NO_MONETARY_LIMIT);
        expect(state.worstTelemetryQuality).toBe('estimated');
        state = debitEndpointUsage(state, usage({telemetryQuality: 'reported'}), NO_MONETARY_LIMIT);
        expect(state.worstTelemetryQuality).toBe('estimated');
    });

    it('fails closed with BROKER_CAPACITY_POOL_UNKNOWN when no snapshot was resolved for the pool', function () {
        expect(reasonOf(() => debitEndpointUsage(null, usage(), NO_MONETARY_LIMIT))).toBe('BROKER_CAPACITY_POOL_UNKNOWN');
    });

    it('fails closed with BROKER_CAPACITY_POOL_UNKNOWN when the usage record names a different pool than the resolved snapshot', function () {
        const state = initialCapacityPoolLedgerState(SNAPSHOT);
        expect(reasonOf(() => debitEndpointUsage(state, usage({capacityPoolId: 'pool-b'}), NO_MONETARY_LIMIT))).toBe('BROKER_CAPACITY_POOL_UNKNOWN');
    });

    it('fails closed with BROKER_ENDPOINT_NOT_IN_POOL when the usage record names an endpoint outside the resolved pool snapshot', function () {
        const state = initialCapacityPoolLedgerState(SNAPSHOT);
        expect(reasonOf(() => debitEndpointUsage(state, usage({endpointId: 'ep-arbitrary'}), NO_MONETARY_LIMIT))).toBe('BROKER_ENDPOINT_NOT_IN_POOL');
        expect(state.cumulativeTokens).toBe(0);
    });

    it('rejects a malformed/round-tripped pool ledger (non-array endpointIds) with BROKER_REFERENCE_INVALID', function () {
        const corrupted = {...initialCapacityPoolLedgerState(SNAPSHOT), endpointIds: 'ep-1' as unknown as readonly string[]};
        expect(reasonOf(() => debitEndpointUsage(corrupted, usage(), NO_MONETARY_LIMIT))).toBe('BROKER_REFERENCE_INVALID');
    });

    it('rejects a malformed/round-tripped pool ledger (negative cumulativeTokens) with BROKER_REFERENCE_INVALID', function () {
        const corrupted = {...initialCapacityPoolLedgerState(SNAPSHOT), cumulativeTokens: -5};
        expect(reasonOf(() => debitEndpointUsage(corrupted, usage(), NO_MONETARY_LIMIT))).toBe('BROKER_REFERENCE_INVALID');
    });

    it('fails closed with BROKER_CAPACITY_EXHAUSTED when the snapshot has no available slots', function () {
        const exhausted = initialCapacityPoolLedgerState({...SNAPSHOT, availableSlots: 0});
        expect(reasonOf(() => debitEndpointUsage(exhausted, usage(), NO_MONETARY_LIMIT))).toBe('BROKER_CAPACITY_EXHAUSTED');
    });

    it('fails closed with BROKER_UNKNOWN_TELEMETRY_FOR_HARD_LIMIT when unknown telemetry meets a monetary hard limit', function () {
        const state = initialCapacityPoolLedgerState(SNAPSHOT);
        expect(reasonOf(() => debitEndpointUsage(state, usage({telemetryQuality: 'unknown'}), WITH_MONETARY_LIMIT))).toBe('BROKER_UNKNOWN_TELEMETRY_FOR_HARD_LIMIT');
    });

    it('permits unknown telemetry when no monetary hard limit applies to the pool', function () {
        const state = initialCapacityPoolLedgerState(SNAPSHOT);
        const next = debitEndpointUsage(state, usage({telemetryQuality: 'unknown'}), NO_MONETARY_LIMIT);
        expect(next.worstTelemetryQuality).toBe('unknown');
    });

    it('rejects a negative token count as malformed input', function () {
        const state = initialCapacityPoolLedgerState(SNAPSHOT);
        expect(() => debitEndpointUsage(state, usage({tokens: -5}), NO_MONETARY_LIMIT)).toThrowError(BrokerError);
    });

    it('admits usage that lands exactly on the monetary hard limit', function () {
        const state = initialCapacityPoolLedgerState(SNAPSHOT);
        const next = debitEndpointUsage(state, usage({tokens: 1000}), WITH_MONETARY_LIMIT);
        expect(next.cumulativeTokens).toBe(1000);
    });

    it('fails closed with BROKER_CAPACITY_QUOTA_EXCEEDED when usage would exceed the monetary hard limit, leaving the prior pool state unmutated', function () {
        const state = initialCapacityPoolLedgerState(SNAPSHOT);
        expect(reasonOf(() => debitEndpointUsage(state, usage({tokens: 1001}), WITH_MONETARY_LIMIT))).toBe('BROKER_CAPACITY_QUOTA_EXCEEDED');
        expect(state.cumulativeTokens).toBe(0);
    });

    it('fails closed with BROKER_CAPACITY_QUOTA_EXCEEDED once accumulated usage across routes sharing the pool would cross the limit', function () {
        let state = initialCapacityPoolLedgerState(SNAPSHOT);
        state = debitEndpointUsage(state, usage({tokens: 900}), WITH_MONETARY_LIMIT);
        expect(state.cumulativeTokens).toBe(900);
        const before = state;
        expect(reasonOf(() => debitEndpointUsage(state, usage({tokens: 101}), WITH_MONETARY_LIMIT))).toBe('BROKER_CAPACITY_QUOTA_EXCEEDED');
        expect(state).toBe(before);
    });

    it('rejects a malformed monetaryHardLimitTokens as BROKER_LIMITS_INVALID', function () {
        const state = initialCapacityPoolLedgerState(SNAPSHOT);
        expect(reasonOf(() => debitEndpointUsage(state, usage(), {monetaryHardLimitTokens: -1}))).toBe('BROKER_LIMITS_INVALID');
    });
});
