import {isErrorCode} from '../../contracts/index.js';
import type {ErrorCode} from '../../contracts/index.js';
import type {DoctorCheck} from '../../contracts/index.js';

export function pass(id: DoctorCheck['id'], message: string): DoctorCheck {
    return {id, status: 'pass', message, reason: null};
}

export function warn(id: DoctorCheck['id'], message: string, reason: ErrorCode | null = null): DoctorCheck {
    return {id, status: 'warn', message, reason};
}

export function fail(id: DoctorCheck['id'], message: string, reason: ErrorCode | null = null): DoctorCheck {
    return {id, status: 'fail', message, reason};
}

export function skip(id: DoctorCheck['id'], message: string, reason: ErrorCode | null = null): DoctorCheck {
    return {id, status: 'skip', message, reason};
}

export function watchtowerErrorReason(error: unknown): ErrorCode | null {
    if (typeof error !== 'object' || error === null || !('code' in error)) return null;
    return isErrorCode(error.code) ? error.code : null;
}

export function watchtowerErrorMessage(error: unknown, fallback: string): string {
    return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
        ? error.message : fallback;
}
