/**
 * Binds `ProposalValidator` to CA-07's own accepted CA-02/CA-03 predecessor
 * evidence proof (`decisionPredecessor.ts`) rather than re-implementing it —
 * the one-owner rule for predecessor-evidence validation. Runs first, before
 * any other check trusts `laneState`/`packIndex`/`journalState`: those
 * projections are only as trustworthy as the accepted index/journal
 * authority they were derived from (F-05).
 *
 * Two boundary conditions the reused CA-07 validator does not itself enforce
 * for CA-09's purpose, both fail-closed here:
 *  - `predecessorAcceptanceRecords` is caller-supplied `unknown`-shaped input;
 *    a malformed capsule (not a two-element array) must return a typed
 *    `PROPOSAL_EVIDENCE_DRIFT`, never an untyped thrown `TypeError`.
 *  - CA-07's validator only proves the predecessor capsule is *internally*
 *    consistent — it never compares the pack identity that capsule resolves
 *    to against the *current* `ValidationContext.packIndex` a caller also
 *    supplies. Without this cross-check, an internally-consistent but stale
 *    predecessor capsule (referencing an old, no-longer-active pack seal)
 *    would pass while every other check keeps trusting the current
 *    `context.packIndex` — a coherent stale-predecessor bypass.
 */
import {validateAuthoritativePredecessors, validateCurrentState, validatePredecessorEvidence} from '../lane/coordinator/decisionPredecessor.js';
import {DecisionEnvelopeError} from '../lane/coordinator/decisionEnvelopeErrors.js';
import type {ValidationError} from '../../contracts/index.js';
import type {ValidationContext} from './proposalValidatorContracts.js';

function drift(subject: string, message: string): ValidationError {
    return Object.freeze({code: 'PROPOSAL_EVIDENCE_DRIFT', subject, message});
}

export function checkPredecessorEvidence(context: ValidationContext): ValidationError | null {
    const records = context.predecessorAcceptanceRecords;
    if (!Array.isArray(records) || records.length !== 2) {
        return drift('predecessorAcceptanceRecords', 'both CA-02 and CA-03 acceptance records are required');
    }
    try {
        const evidence = validatePredecessorEvidence(context.predecessorEvidence, context.laneId);
        const current = validateCurrentState(context.predecessorCurrentState, context.laneId);
        validateAuthoritativePredecessors(evidence, current, records, context.laneId);
        if (current.index.packIndex.packSealId !== context.packIndex.packSealId || current.index.packIndex.manifestDigest !== context.packIndex.manifestDigest) {
            return drift('predecessorEvidence.current.index.packIndex', 'validated predecessor pack identity does not match the current pack index — stale predecessor capsule');
        }
        return null;
    } catch (error) {
        if (error instanceof DecisionEnvelopeError) {
            return drift(error.subject, error.message);
        }
        throw error;
    }
}
