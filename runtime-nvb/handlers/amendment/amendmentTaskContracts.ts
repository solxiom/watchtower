/**
 * Typed input/result shapes for `wt:amendment:create-request` and
 * `wt:amendment:admit` (CA-27; review correction CA27-03: "the effect
 * registry's declared `create-amendment-request`/`activate-pack-revision`
 * actions have no source-backed invocation path"). Decoded task-request JSON
 * is `unknown` until validated here — the NVB schema gate runs before this
 * handler, but the handler itself never trusts a decoded value without its
 * own independent check.
 */
// The foundation closure is staged by dist:runtime-nvb:foundation-compile before
// this handler is compiled and is part of the relocated runtime package.
// @ts-ignore staged runtime foundation is not in the handler source root
import type {AmendmentTaskInput, AmendmentTaskResult} from '../../foundation/lane/coordinator/amendment/index.js';

const OPERATOR_SESSION_ROLES: readonly string[] = ['operator', 'pack-spec-authority'];

export function isAmendmentTaskInput(value: unknown): value is AmendmentTaskInput {
    if (!isRecord(value) || value.schemaVersion !== 1) return false;
    if (value.operation === 'create-request') {
        return onlyKeys(value, ['schemaVersion', 'operation', 'laneDir', 'laneId', 'packId', 'reason'])
            && isNonEmptyString(value.laneDir) && isNonEmptyString(value.laneId)
            && isNonEmptyString(value.packId) && isNonEmptyString(value.reason);
    }
    if (value.operation === 'admit') {
        return onlyKeys(value, ['schemaVersion', 'operation', 'laneDir', 'laneId', 'affectedWorktreeIds', 'body', 'authority'])
            && isNonEmptyString(value.laneDir) && isNonEmptyString(value.laneId)
            && isStringArray(value.affectedWorktreeIds)
            && isAdmitPackAmendmentBody(value.body) && isAdmissionAuthorityContext(value.authority);
    }
    return false;
}

export function isAmendmentTaskResult(value: unknown): value is AmendmentTaskResult {
    if (!isRecord(value) || value.schemaVersion !== 1 || value.applied !== true) return false;
    if (typeof value.amendmentRequestId === 'string') return onlyKeys(value, ['schemaVersion', 'applied', 'amendmentRequestId']);
    return typeof value.activeSeal === 'string' && (typeof value.supersedesSeal === 'string' || value.supersedesSeal === null)
        && typeof value.requiredCommit === 'string'
        && onlyKeys(value, ['schemaVersion', 'applied', 'activeSeal', 'supersedesSeal', 'requiredCommit']);
}

export function refusedAmendmentResult(reason = 'AMENDMENT_TASK_INPUT_INVALID'): {readonly schemaVersion: 1; readonly applied: false; readonly reason: string} {
    return {schemaVersion: 1, applied: false, reason};
}

function isAdmitPackAmendmentBody(value: unknown): boolean {
    if (!isRecord(value)) return false;
    const keys = [
        'amendmentRequestId', 'blockerId', 'resolutionId', 'supersedesSeal', 'candidateSeal',
        'reviewedCommit', 'packAcceptanceRef', 'specAuthoritySessionId'
    ];
    return onlyKeys(value, keys) && keys.every((key) => isNonEmptyString(value[key]) || (key === 'supersedesSeal' && typeof value[key] === 'string'));
}

function isAdmissionAuthorityContext(value: unknown): boolean {
    if (!isRecord(value) || typeof value.packActiveSeal !== 'string') return false;
    if (!onlyKeys(value, ['operatorSession', 'packAuthorSessionId', 'packActiveSeal'])) return false;
    if ('packAuthorSessionId' in value && !isNonEmptyString(value.packAuthorSessionId)) return false;
    if (!('operatorSession' in value)) return true;
    const session = value.operatorSession;
    return isRecord(session) && onlyKeys(session, ['sessionId', 'role'])
        && isNonEmptyString(session.sessionId) && typeof session.role === 'string' && OPERATOR_SESSION_ROLES.includes(session.role);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    return Object.keys(value).every((key) => keys.includes(key));
}
