/**
 * The one failure-mapping owner of the init effect (LC-11). Both halves of
 * the effect — the pre-commit orchestrator and the post-commit completion —
 * attribute every failure to the exact phase that produced it here, so no
 * init refusal ever reaches an operator as a bare stack trace and no phase
 * invents its own error vocabulary.
 */
import {createWatchtowerError, type ErrorCode, WatchtowerError} from '../../../contracts/errors.js';
import type {PackRejectionReason} from '../../../contracts/pack.js';
import {safePathTarget} from '../../paths/index.js';
import {TransactionalWriteError} from '../writer/index.js';
import type {InitEffectPhase} from './initEffectContracts.js';

/**
 * Keeps an owner's own typed refusal exactly as raised, maps LC-03's staged
 * write failure onto its exact stage, and gives anything else a registered
 * internal code bound to its phase.
 */
export function asPhaseFailure(phase: InitEffectPhase, error: unknown): unknown {
    if (error instanceof WatchtowerError) return error;
    if (error instanceof TransactionalWriteError) {
        return refusal(phase, 'ERR_UNSAFE_MUTATION', error.path,
            `Resolve the ${error.stage} failure and re-run init; no lane directory was created.`);
    }
    return refusal(phase, 'ERR_INTERNAL', phase,
        error instanceof Error ? error.message.slice(0, 160) : 'Re-run init after resolving the reported failure.');
}

export function refusal(phase: InitEffectPhase, code: ErrorCode, target: string, remediation: string): WatchtowerError {
    return createWatchtowerError(code, {
        operation: `apply init (${phase})`, target: safePathTarget(target), remediation
    });
}

export async function inPhase<T>(phase: InitEffectPhase, operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        throw asPhaseFailure(phase, error);
    }
}

export function inPhaseSync<T>(phase: InitEffectPhase, operation: () => T): T {
    try {
        return operation();
    } catch (error) {
        throw asPhaseFailure(phase, error);
    }
}

/**
 * The one map from LC-02's closed pack-rejection vocabulary onto the
 * registered error families of `docs/spec/v1-contracts.md` §8: a malformed or
 * schema-invalid document is invalid input (exit 2), an unreproducible seal is
 * an integrity failure, an escaping path is a path-authorization failure, and
 * every remaining acceptance/fileset/identity refusal is a preflight failure.
 */
const PACK_REJECTION_CODES: Readonly<Record<PackRejectionReason, ErrorCode>> = Object.freeze({
    PACK_FILE_MISSING: 'ERR_PREFLIGHT_FAILED',
    PACK_DOCUMENT_INVALID: 'ERR_PARSE_FAILURE',
    PACK_SCHEMA_INVALID: 'ERR_PARSE_FAILURE',
    PACK_PATH_INVALID: 'ERR_PATH_ESCAPE',
    PACK_FILESET_INVALID: 'ERR_PREFLIGHT_FAILED',
    PACK_IDENTITY_MISMATCH: 'ERR_PREFLIGHT_FAILED',
    PACK_SEAL_MISMATCH: 'ERR_INTEGRITY_FAILURE',
    PACK_ACCEPTANCE_INVALID: 'ERR_PREFLIGHT_FAILED',
    PACK_IO_FAILED: 'ERR_PREFLIGHT_FAILED'
});

export function packRejectionCode(reason: PackRejectionReason): ErrorCode {
    return PACK_REJECTION_CODES[reason];
}
