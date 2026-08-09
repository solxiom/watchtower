/**
 * The confirmation binding digest — the one value that makes an operator
 * confirmation non-transferable (`docs/spec/operator-session.md` §15.1
 * "Operator confirmation records intent but grants no arbitrary authority",
 * §15.4 "Actual apply requires explicit confirmation").
 *
 * A confirmation is bound to three things at once: the exact proposal bytes
 * that were shown, the exact current-state facts they were shown against, and
 * the operator session that confirmed them. Apply recomputes this digest from
 * freshly read state and refuses on any difference, so a confirmation cannot
 * survive a changed proposal, a changed lane, or a substituted session.
 *
 * The current-state half is **not** re-derived here. It is CA-10's exported
 * `preconditionDigest`, the accepted owner of "the exact current-state facts
 * that must still hold at the commit point". A second checklist would be a
 * second, divergent definition of staleness.
 */
import type {DecisionProposal, SessionProposalConfirmation, SessionProposalDocument} from '../../../../contracts/index.js';
import type {JsonObject} from '../../../../contracts/types.js';
import {preconditionDigest} from '../../../effect/index.js';
import type {ShapedProposal} from './sessionProposalGates.js';
import type {ValidationContext} from '../../../proposal/index.js';
import {isJsonValue, semanticDigest} from '../../../schemaComposition/jsonCanonicalizer.js';

/** Versioned so a future change to what a confirmation binds cannot silently validate an old confirmation. */
const BINDING_SCHEMA = 'watchtower-session-confirmation-binding/1';

export interface ConfirmationBindingInput {
    readonly operatorSessionId: string;
    /** The wire `$defs.decisionProposal` bytes exactly as stored. */
    readonly proposalDocument: JsonObject;
    /** The same bytes after CA-09's shape validation — the identity half of the digest. */
    readonly proposal: DecisionProposal;
    readonly currentState: ValidationContext;
}

/** The three digests a confirmation carries, computed together so they can never disagree about their inputs. */
export interface ConfirmationBinding {
    readonly proposalDigest: `sha256:${string}`;
    readonly currentStateDigest: `sha256:${string}`;
    readonly bindingDigest: `sha256:${string}`;
}

export function computeConfirmationBinding(input: ConfirmationBindingInput): ConfirmationBinding {
    const proposalDigest = documentDigest(input.proposalDocument);
    const currentStateDigest = preconditionDigest(input.proposal, input.currentState);
    return Object.freeze({
        proposalDigest,
        currentStateDigest,
        bindingDigest: semanticDigest({
            schema: BINDING_SCHEMA, operatorSessionId: input.operatorSessionId, proposalDigest, currentStateDigest
        })
    });
}

/**
 * The canonicalizer owns its own `JsonValue`; a checked narrowing — never a
 * cast — is what lets an already-validated proposal document cross into it. A
 * document that fails here was not JSON, and no confirmation may be bound to it.
 */
function documentDigest(document: JsonObject): `sha256:${string}` {
    if (!isJsonValue(document)) throw new Error('a session proposal document must be canonicalizable JSON');
    return semanticDigest(document);
}

/**
 * The revision identity of one durable document — the compare-and-swap value
 * every non-`transition` commit checks before it writes (CA26-R2-02).
 *
 * `transition` re-reads inside the held lock and so is consistent by
 * construction, but `expire`, terminal stale/illegal recording, and apply's
 * terminal effect write all decide from a snapshot read *before* their lock.
 * Comparing this digest against the freshly read stored bytes is what turns
 * "last writer wins" into a deterministic refusal for the loser.
 */
export function documentRevision(document: SessionProposalDocument): `sha256:${string}` {
    // Round-tripped through JSON first: the digest must be of the bytes a reader
    // would load, not of an in-memory value carrying `undefined` or a prototype.
    return documentDigest(JSON.parse(JSON.stringify(document)) as JsonObject);
}

/** The complete confirmation record for one proposal at one instant — identity, time, and all three digests. */
export function confirmationFor(
    shaped: ShapedProposal, currentState: ValidationContext, confirmedBySessionId: string, confirmedAt: string
): SessionProposalConfirmation {
    return Object.freeze({
        confirmedBySessionId, confirmedAt,
        ...computeConfirmationBinding({
            operatorSessionId: shaped.document.operatorSessionId, proposalDocument: shaped.document.proposal,
            proposal: shaped.proposal, currentState
        })
    });
}
