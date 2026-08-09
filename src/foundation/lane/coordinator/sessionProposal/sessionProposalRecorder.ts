/**
 * The one crash-safe transaction over this capability's two authorities
 * (CA-26; `docs/spec/operator-session.md` §15.1/§22).
 *
 * A lifecycle transition has to become durable in the proposal document *and*
 * become an authoritative event in CA-15's append-only session journal. Those
 * are two files owned by two capabilities and cannot be written in one atomic
 * step, so this module fixes a single write-ahead protocol instead of leaving
 * each of the five lifecycle steps to invent one:
 *
 * 1. persist the new state **together with the event it owes**, marked
 *    `pending` — this atomic replace is the commit point;
 * 2. append the event, whose payload is derived from those already-persisted
 *    bytes, so a published event can never describe a state that was not
 *    durable first;
 * 3. persist the same document with the publication marked `published`.
 *
 * A failure at step 1 is a pre-commit failure: the authoritative bytes are
 * unchanged and the caller gets a typed refusal. A failure at step 2 or 3, or a
 * crash between them, is **post-commit**: the state change happened, so it is
 * never reported as a refusal.
 *
 * Review correction CA26-R2-01/02: two closed defects in the previous shape are
 * fixed here, not by narrative.
 *
 * **An unsettled publication is now a hard fence, never silently dropped.**
 * `transition`/`loadFresh` re-settle any owed event on every read, and refuse
 * with `SESSION_PROPOSAL_RECOVERY_REQUIRED` if that settle itself cannot
 * complete — no later step may commit `withPublication(document, null)` over a
 * debt that was never actually paid.
 *
 * **Every transition that could race another writer for the same document now
 * reads fresh bytes under one held lane lock before deciding.** `transition`
 * is the sole entry point `confirm`/`reject` use: it acquires CA-10's own lane
 * lock (`LaneMutationLock` — the identical resource `EffectExecutor` locks, so
 * this capsule mints no second lock grammar), re-reads the document *inside*
 * the lock, and only then hands it to the caller's pure `decide` — so two
 * writers who both observed `proposed` can no longer both commit; the second
 * sees the first's already-durable result. The lock is held only across this
 * synchronous read-decide-write; it is never held across the `await` in
 * `apply`'s executor call, which acquires the same lock internally — holding it
 * there would deadlock against its own live record.
 */
import type {
    SessionProposalDocument, SessionProposalPublicationIntent, SessionProposalRefused
} from '../../../../contracts/index.js';
import type {SessionMetadataPayload} from '../../../../contracts/operatorSession.js';
import type {LaneMutationLock} from '../queue/laneMutationLock.js';
import {documentRevision} from './sessionProposalBinding.js';
import {withPublication, withState} from './sessionProposalDocument.js';
import {confirmedPayload, rejectedPayload} from './sessionProposalOutcome.js';
import type {SessionProposalJournalPort} from './sessionProposalPorts.js';
import {isSessionProposalRefusal, refuse} from './sessionProposalRefusals.js';
import {storableDetail} from './sessionProposalValues.js';
import {loadShapedProposal, type SessionProposalStore} from './SessionProposalStore.js';
import type {ShapedProposal, SessionProposalTransitionDecision} from './sessionProposalGates.js';

export class SessionProposalRecorder {
    constructor(
        private readonly store: SessionProposalStore, private readonly journal: SessionProposalJournalPort,
        private readonly lock: LaneMutationLock
    ) {}

    /** Exclusive create. A duplicate proposal ID is refused, never overwritten; no lock needed — `O_EXCL` is already atomic. */
    create(document: SessionProposalDocument): SessionProposalRefused | null {
        try {
            if (this.store.create(document)) return null;
        } catch (error) {
            return storeFailure('create', error);
        }
        return refuse('SESSION_PROPOSAL_DUPLICATE', 'proposalId',
            `a proposal named "${document.proposalId}" already exists in this session`);
    }

    /**
     * Fresh read, settle-fence, then one durable commit — the sole way
     * `confirm`/`reject` may transition a document. `decide` runs against bytes
     * read inside the held lock and is pure: it may only describe what to write,
     * never call back into this recorder (a nested lock acquisition deadlocks).
     */
    transition(
        operatorSessionId: string, proposalId: string, laneId: string,
        decide: (fresh: ShapedProposal | SessionProposalRefused) => SessionProposalTransitionDecision
    ): SessionProposalRefused | {readonly document: SessionProposalDocument} {
        return this.withLock(() => {
            const fresh = this.fence(loadShapedProposal(this.store, operatorSessionId, proposalId, laneId));
            const decision = decide(fresh);
            if (isSessionProposalRefusal(decision)) return decision;
            const failure = this.commitLocked(decision.document, decision.intent);
            return failure ?? {document: decision.document};
        });
    }

    /** Fresh read plus the same settle-fence, for callers (`preview`/`apply`) that only need to read. */
    loadFresh(operatorSessionId: string, proposalId: string, laneId: string): ShapedProposal | SessionProposalRefused {
        return this.withLock(() => this.fence(loadShapedProposal(this.store, operatorSessionId, proposalId, laneId)));
    }

    /**
     * Commit one transition decided from an earlier snapshot, then settle the
     * event it owes. `null` means the transition is durable.
     *
     * `expected` is the document the caller decided from. Under the lock the
     * stored bytes are re-read and their revision compared against it, so a
     * writer that transitioned this proposal in the meantime is not silently
     * overwritten (CA26-R2-02): the loser gets a deterministic
     * `SESSION_PROPOSAL_WRITE_CONFLICT` and writes nothing.
     */
    replace(
        document: SessionProposalDocument, intent: SessionProposalPublicationIntent | null,
        expected: SessionProposalDocument
    ): SessionProposalRefused | null {
        return this.withLock(() => this.conflict(expected) ?? this.commitLocked(document, intent));
    }

    /**
     * The compare-and-swap half of every snapshot-based commit. Runs with the
     * lane lock held, immediately before the write it guards.
     */
    private conflict(expected: SessionProposalDocument): SessionProposalRefused | null {
        let read;
        try {
            read = this.store.read(expected.operatorSessionId, expected.proposalId);
        } catch (error) {
            return storeFailure('read', error);
        }
        if (read.kind !== 'document') {
            return refuse('SESSION_PROPOSAL_WRITE_CONFLICT', 'document',
                `the proposal is no longer readable as a document (${read.kind}); another writer changed it after this decision was made`);
        }
        if (documentRevision(read.document) !== documentRevision(expected)) {
            return refuse('SESSION_PROPOSAL_WRITE_CONFLICT', 'document',
                `another writer transitioned this proposal to "${read.document.state}" after this decision was made; nothing was overwritten`);
        }
        return null;
    }

    /**
     * A lock another writer holds is a bounded, retryable refusal — never an
     * uncaught exception and never a durable rejection. `recordRejected` stays
     * `false` (`refuse`'s default) so a transient conflict never burns a
     * legitimately confirmed proposal.
     */
    private withLock<T>(run: () => T): T | SessionProposalRefused {
        try {
            return this.lock.withLaneLock(run);
        } catch (error) {
            return refuse('SESSION_PROPOSAL_LANE_LOCKED', 'lock',
                `the lane mutation lock is unavailable; no session-proposal byte was read or written: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /** EXPIRED is terminal (§15.1) and is recorded, so a later call reports expiry rather than re-deriving it from a clock. */
    expire(document: SessionProposalDocument, operation: string): SessionProposalRefused {
        return this.recordTerminal(withState(document, 'expired'), document,
            refuse('SESSION_PROPOSAL_EXPIRED', 'proposal.expiresAt', `the proposal expired before ${operation}`, true));
    }

    /** Terminal REJECTED_STALE_OR_ILLEGAL (§15.1). A retryable refusal is reported without touching the record. */
    rejectStaleOrIllegal(document: SessionProposalDocument, refusal: SessionProposalRefused): SessionProposalRefused {
        if (!refusal.recordRejected) return refusal;
        return this.recordTerminal(withState(document, 'rejected-stale-or-illegal'), document, refusal);
    }

    /**
     * A document whose owed publication could not settle is a hard fence: no
     * caller may treat it as ready for a further transition, and no later
     * commit may silently null out that debt (CA26-R2-01). Only a document
     * whose publication is `null` or `published` is handed back.
     */
    private fence(loaded: ShapedProposal | SessionProposalRefused): ShapedProposal | SessionProposalRefused {
        if (isSessionProposalRefusal(loaded)) return loaded;
        const settled = this.settleLocked(loaded.document);
        const publication = settled.publication;
        if (publication !== null && publication.status === 'pending') {
            return refuse('SESSION_PROPOSAL_RECOVERY_REQUIRED', 'publication',
                'an owed session-journal event could not be published; resolve it from the session journal before this proposal accepts a new transition');
        }
        return {document: settled, proposal: loaded.proposal};
    }

    /** Persist a terminal refusal and report it. Runs under its own lock via the public `replace`. */
    private recordTerminal(
        document: SessionProposalDocument, expected: SessionProposalDocument, refusal: SessionProposalRefused
    ): SessionProposalRefused {
        const failure = this.replace(document, {
            event: 'operator-session-proposal-rejected', rejectedBy: 'validator',
            reason: refusal.reason, detail: refusal.message
        }, expected);
        return failure ?? {...refusal, recordRejected: true};
    }

    /** The write-ahead commit body. Must only run with the lane lock already held — never call this directly from outside `withLaneLock`. */
    private commitLocked(document: SessionProposalDocument, intent: SessionProposalPublicationIntent | null): SessionProposalRefused | null {
        const committed = withPublication(document, intent === null ? null : {...storable(intent), status: 'pending'});
        try {
            this.store.replace(committed);
        } catch (error) {
            return storeFailure('replace', error);
        }
        this.settleLocked(committed);
        return null;
    }

    /**
     * Append any event this document still owes, and mark it published. Must
     * only run with the lane lock already held.
     *
     * Returns the document as it now stands. It never throws and never
     * refuses: the state it is settling is already durable, and a second
     * failure here only leaves the same debt for the next fenced read.
     */
    private settleLocked(document: SessionProposalDocument): SessionProposalDocument {
        const publication = document.publication;
        if (publication === null || publication.status === 'published') return document;
        try {
            this.journal.appendEvent(document.operatorSessionId, publication.event, payloadFor(document));
        } catch {
            return document;
        }
        const published = withPublication(document, {...publication, status: 'published'});
        try {
            this.store.replace(published);
        } catch {
            return document;
        }
        return published;
    }
}

/**
 * The event payload, rebuilt from the committed document rather than captured
 * before the write. That is what makes republication after a crash describe the
 * durable state instead of a remembered intention.
 */
function payloadFor(document: SessionProposalDocument): SessionMetadataPayload {
    const publication = document.publication;
    if (publication === null || publication.event === 'operator-session-proposal-confirmed') return confirmedPayload(document);
    return rejectedPayload(document, publication.rejectedBy ?? 'validator', publication.reason ?? '', publication.detail ?? '');
}

/**
 * Internally generated `reason`/`detail` are diagnostics, not operator
 * authority, so they are coerced into storable text rather than refused
 * (CA26-R3-02). Without this an I/O error message containing a newline —
 * carried into a terminal rejection's `detail` — would commit a record the
 * next load cannot parse.
 */
function storable(intent: SessionProposalPublicationIntent): SessionProposalPublicationIntent {
    return {
        ...intent,
        reason: intent.reason === null ? null : storableDetail(intent.reason),
        detail: intent.detail === null ? null : storableDetail(intent.detail)
    };
}

function storeFailure(operation: string, error: unknown): SessionProposalRefused {
    return refuse('SESSION_PROPOSAL_STORE_UNWRITABLE', operation,
        `the ${operation} step could not be recorded durably: ${error instanceof Error ? error.message : String(error)}`);
}
