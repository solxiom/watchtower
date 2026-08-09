/**
 * Typed input/result shapes for `wt:hold:place` and `wt:hold:release`
 * (CA-27). Decoded task-request JSON is `unknown` until validated here — the
 * NVB schema gate runs before this handler, but the handler itself never
 * trusts a decoded value without its own independent check.
 */
import {PROPOSAL_ORIGINS, type ProposalOrigin} from '../../../src/contracts/proposals.js';
// The foundation closure is staged by dist:runtime-nvb:foundation-compile before
// this handler is compiled and is part of the relocated runtime package.
// @ts-ignore staged runtime foundation is not in the handler source root
import type {HoldTaskInput, HoldTaskResult} from '../../foundation/lane/coordinator/hold/index.js';
// Reused, not reimplemented (review correction CA27-04): the identical closed
// predicate the persistence trust boundary already enforces, so the wire guard
// cannot silently accept a duplicate/blank scope entry the service would refuse.
// @ts-ignore staged runtime foundation is not in the handler source root
import {isNonEmptyStringArrayNoDuplicates} from '../../foundation/lane/coordinator/coordinatorRecordValidation.js';

const ORIGINS: readonly string[] = PROPOSAL_ORIGINS;

export function isHoldTaskInput(value: unknown): value is HoldTaskInput {
    if (!isRecord(value) || value.schemaVersion !== 1) return false;
    if (value.operation === 'place') {
        return onlyKeys(value, ['schemaVersion', 'operation', 'laneDir', 'laneId', 'scope', 'reason', 'expiresAt', 'origin'])
            && isNonEmptyString(value.laneDir) && isNonEmptyString(value.laneId)
            && isNonEmptyStringArrayNoDuplicates(value.scope)
            && isNonEmptyString(value.reason) && isNonEmptyString(value.expiresAt)
            && typeof value.origin === 'string' && ORIGINS.includes(value.origin);
    }
    if (value.operation === 'release') {
        return onlyKeys(value, ['schemaVersion', 'operation', 'laneDir', 'laneId', 'holdId'])
            && isNonEmptyString(value.laneDir) && isNonEmptyString(value.laneId) && isNonEmptyString(value.holdId);
    }
    return false;
}

export function isHoldTaskResult(value: unknown): value is HoldTaskResult {
    return isRecord(value) && value.schemaVersion === 1 && value.applied === true && typeof value.holdId === 'string';
}

export function refusedHoldResult(reason = 'HOLD_TASK_INPUT_INVALID'): {readonly schemaVersion: 1; readonly applied: false; readonly reason: string} {
    return {schemaVersion: 1, applied: false, reason};
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    return Object.keys(value).length === keys.length && keys.every((key) => key in value);
}

export type {ProposalOrigin};
