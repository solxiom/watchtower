/**
 * Durable bytes for one session proposal
 * (`docs/spec/operator-session.md` §20:
 * `coordinator/operator-sessions/<id>/proposals/<proposal-id>.json`).
 *
 * This owns exactly one thing: where a session-proposal document lives and how
 * it is read, created, and replaced. It holds no lifecycle rule, no validation
 * verdict, and no clock. Path containment comes from the accepted
 * `authorizePath` owner, so a proposal or session identity carrying `..`, an
 * absolute path, or a control character cannot escape the lane before a byte
 * is touched.
 *
 * Creation is exclusive so a duplicate proposal ID is a refusal, never a silent
 * overwrite; replacement stages, fsyncs, and renames so a reader never sees a
 * half-written lifecycle state. Both go through CA-10's accepted
 * `EffectFileSystem` port rather than a second `node:fs` adapter.
 */
import {dirname, join} from 'node:path';
import type {SessionProposalDocument} from '../../../../contracts/index.js';
import type {EffectFileSystem} from '../../../effect/index.js';
import {authorizePath, createPathEscapeError} from '../../../paths/canonicalPaths.js';
import type {SessionProposalRefused} from '../../../../contracts/index.js';
import {parseSessionProposalDocument, SessionProposalDocumentError} from './sessionProposalDocument.js';
import {shapeProposal, type ShapedProposal} from './sessionProposalGates.js';
import {refuse} from './sessionProposalRefusals.js';

/** A session-proposal document is a bounded artifact; anything larger is corrupt, not big. */
const MAX_DOCUMENT_BYTES = 256 * 1024;
const DOCUMENT_MODE = 0o600;

export type SessionProposalRead =
    | {readonly kind: 'document'; readonly document: SessionProposalDocument}
    | {readonly kind: 'missing'}
    | {readonly kind: 'invalid'; readonly subject: string; readonly message: string};

export class SessionProposalStore {
    constructor(private readonly laneDir: string, private readonly files: EffectFileSystem) {}

    /**
     * Absolute, lane-contained path of one proposal document.
     *
     * Both identities are checked as **tokens** before they are joined.
     * `authorizePath` alone is not enough here: `path.join` normalizes a
     * `../..` segment away first, so an identity like `../../../etc/passwd`
     * would silently address a different file that is still inside the lane
     * rather than being refused. Rejecting separators and dot segments up front
     * is what makes the identity mean one file.
     */
    path(operatorSessionId: string, proposalId: string): string {
        assertIdentityToken(operatorSessionId, 'operator session id');
        assertIdentityToken(proposalId, 'proposal id');
        return authorizePath(this.laneDir, join('coordinator', 'operator-sessions', operatorSessionId, 'proposals', `${proposalId}.json`));
    }

    /** Never conflates absence with an unreadable or malformed artifact. */
    read(operatorSessionId: string, proposalId: string): SessionProposalRead {
        const read = this.files.readText(this.path(operatorSessionId, proposalId), MAX_DOCUMENT_BYTES);
        if (read.kind === 'missing') return {kind: 'missing'};
        if (read.kind === 'unreadable') return {kind: 'invalid', subject: 'document', message: `proposal document is unreadable (${read.reason})`};
        let parsed: unknown;
        try {
            parsed = JSON.parse(read.text) as unknown;
        } catch (error) {
            return {kind: 'invalid', subject: 'document', message: `proposal document is not valid JSON: ${messageOf(error)}`};
        }
        try {
            return {kind: 'document', document: parseSessionProposalDocument(parsed)};
        } catch (error) {
            if (error instanceof SessionProposalDocumentError) return {kind: 'invalid', subject: error.subject, message: error.message};
            throw error;
        }
    }

    /** `false` when the proposal ID already exists — a duplicate never overwrites a live lifecycle. */
    create(document: SessionProposalDocument): boolean {
        const path = this.path(document.operatorSessionId, document.proposalId);
        this.files.ensureDirectory(directoryOf(path));
        const created = this.files.createExclusive(path, documentText(document), DOCUMENT_MODE);
        if (created) this.files.syncDirectory(directoryOf(path));
        return created;
    }

    /**
     * Replace an existing document atomically. The staged copy is created
     * exclusively and fsynced by the same port that writes envelopes, then
     * renamed over the live path, so a concurrent reader observes either the
     * previous state or the next one and never a partial record.
     *
     * The staging name is **unique per write** (CA26-R2-02). A fixed
     * `<path>.staged` was removed-then-created on every replace, so two writers
     * racing for the same document could each delete the other's in-flight
     * staged bytes or fail on an occupied path. A per-write name makes staging
     * private to one writer, so the only contended step is the rename itself,
     * which the filesystem already makes atomic.
     */
    replace(document: SessionProposalDocument): void {
        const path = this.path(document.operatorSessionId, document.proposalId);
        const staged = `${path}.staged.${process.pid}.${nextStagingId()}`;
        if (!this.files.createExclusive(staged, documentText(document), DOCUMENT_MODE)) {
            throw new Error(`session proposal staging path is occupied: ${staged}`);
        }
        try {
            this.files.renameOver(staged, path);
        } catch (error) {
            this.files.remove(staged);
            throw error;
        }
        this.files.syncDirectory(directoryOf(path));
    }
}

/** A single path segment: no separator, no dot segment, no control character, bounded. */
function assertIdentityToken(value: string, subject: string): void {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value) || value.includes('..')) {
        throw createPathEscapeError(`resolve ${subject}`, value, 'Use a single bounded identity segment without separators or dot segments.');
    }
}

/** Monotonic within a process; combined with the pid it names one writer's staged bytes and no one else's. */
let stagingCounter = 0;
function nextStagingId(): number {
    stagingCounter += 1;
    return stagingCounter;
}

function documentText(document: SessionProposalDocument): string {
    return `${JSON.stringify(document)}\n`;
}

function directoryOf(path: string): string {
    return dirname(path);
}

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Durable bytes → a value the rest of the capsule may trust, or one typed
 * refusal. Absence, unreadability, a path that tries to leave the lane, a
 * foreign session, and a malformed document are five distinct answers, and
 * every caller gets them from here rather than re-deriving them from a raw
 * read.
 */
export function loadShapedProposal(
    store: SessionProposalStore, operatorSessionId: string, proposalId: string, laneId: string
): ShapedProposal | SessionProposalRefused {
    let read: SessionProposalRead;
    try {
        read = store.read(operatorSessionId, proposalId);
    } catch (error) {
        return refuse('SESSION_PROPOSAL_RECORD_INVALID', 'path',
            `the proposal path could not be resolved inside the lane: ${messageOf(error)}`);
    }
    if (read.kind === 'missing') {
        return refuse('SESSION_PROPOSAL_NOT_FOUND', 'proposalId', `no proposal "${proposalId}" exists in session "${operatorSessionId}"`);
    }
    if (read.kind === 'invalid') return refuse('SESSION_PROPOSAL_RECORD_INVALID', read.subject, read.message);
    if (read.document.operatorSessionId !== operatorSessionId) {
        return refuse('SESSION_PROPOSAL_SESSION_MISMATCH', 'document.operatorSessionId', 'the stored proposal names a different operator session');
    }
    return shapeProposal(read.document, laneId);
}
