/**
 * Durable contracts for CA-27's explicit scoped automation holds
 * (`docs/spec/coordinator-automation.md` §17 `coordinator/holds/`, §11.2
 * `place-hold`/`release-hold`).
 *
 * `ActiveHold` (`../../proposal/proposalValidatorContracts.ts`) is the accepted
 * `ProposalValidator`'s (CA-09) read shape for one hold; `checkPrecondition`
 * and `checkClaimConflict` already enforce expiry, release, and scope-conflict
 * rules against it. This module owns only the durable record those checks are
 * projected from — never a second copy of that validation.
 */
import type {ProposalOrigin} from '../../../../contracts/proposals.js';

export const SCOPED_HOLD_REASONS = [
    'HOLD_SCOPE_EMPTY',
    'HOLD_SCOPE_INVALID',
    'HOLD_REASON_REQUIRED',
    'HOLD_EXPIRY_INVALID',
    'HOLD_NOT_FOUND',
    'HOLD_STATE_UNREADABLE',
    'HOLD_STATE_WRITE_FAILED',
    'HOLD_STATE_STALE'
] as const;
export type ScopedHoldReason = typeof SCOPED_HOLD_REASONS[number];

/** Raised only for a refusal before any authoritative byte changes (mirrors `CoordinatorQueueError`). */
export class ScopedHoldError extends Error {
    constructor(readonly reason: ScopedHoldReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'ScopedHoldError';
    }
}

/**
 * One durable explicit scoped hold — distinct from CA-13's automatic
 * `ImpactScopedHold` (`specification-blocker-detected` provenance). This
 * record is `place-hold`'s effect, carries its own expiry, and is never
 * written into `coordinator/queue.json`.
 */
export interface ScopedHoldRecord {
    readonly holdId: string;
    readonly scope: readonly string[];
    readonly reason: string;
    readonly origin: ProposalOrigin;
    readonly createdAt: string;
    readonly expiresAt: string;
}

/** `coordinator/holds/holds.json` — a whole-file projection, staged and replaced like `queue.json`. */
export interface ScopedHoldDocument {
    readonly schemaVersion: 1;
    readonly laneId: string;
    readonly holds: readonly ScopedHoldRecord[];
    readonly projectionRevision: number;
}

export function emptyHoldDocument(laneId: string): ScopedHoldDocument {
    return Object.freeze({schemaVersion: 1 as const, laneId, holds: Object.freeze([]), projectionRevision: 0});
}
