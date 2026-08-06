export const ENVELOPE_REASONS = [
    'ENVELOPE_BUILD_FAILED', 'ENVELOPE_DIGEST_MISMATCH', 'ENVELOPE_EXPIRED',
    'ENVELOPE_STALE_SNAPSHOT', 'ENVELOPE_INDEX_UNAVAILABLE', 'ENVELOPE_SCHEMA_INVALID'
] as const;

export type EnvelopeReason = typeof ENVELOPE_REASONS[number];

export class DecisionEnvelopeError extends Error {
    constructor(readonly reason: EnvelopeReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'DecisionEnvelopeError';
    }
}

export function envelopeFailure(reason: EnvelopeReason, subject: string, message: string): never {
    throw new DecisionEnvelopeError(reason, subject, message);
}

export function normalizeEnvelopeBuildError(error: unknown, subject: string): DecisionEnvelopeError {
    if (error instanceof DecisionEnvelopeError) return error;
    return new DecisionEnvelopeError('ENVELOPE_BUILD_FAILED', subject, error instanceof Error ? error.message : 'envelope construction failed');
}
