/**
 * Reviewer-session ownership enforcement (CA-12; `docs/spec/v1-contracts.md`
 * §10, `docs/spec/coordinator-automation.md` §13).
 *
 * Authority comes only from the durable `accept` worker event this lane's
 * journal recorded for the batch — never from session memory, in-process
 * state, or a Git author/committer string, which are untrusted evidence only.
 */
import {join} from 'node:path';
import {GitAcceptanceError, type AcceptanceProposal, type OwnershipResult} from '../../contracts/gitAcceptance.js';
import type {WorkerEventRecord} from '../../contracts/events.js';
import type {EffectFileSystem} from '../effect/index.js';
import {isJsonObject} from '../schemaComposition/jsonCanonicalizer.js';

const WORKER_EVENTS_RELATIVE_PATH = join('coordinator', 'journal', 'worker-events.jsonl');
const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;

export function workerEventJournalPath(laneDir: string): string {
    return join(laneDir, WORKER_EVENTS_RELATIVE_PATH);
}

/**
 * Read the durable worker-event journal, failing closed on a corrupt or
 * partial tail exactly as CA-10's effect journal does. An absent journal has
 * recorded no events yet — never treated as "no reviewer ever accepted".
 */
export function readWorkerEventJournal(laneDir: string, files: EffectFileSystem): readonly WorkerEventRecord[] {
    const path = workerEventJournalPath(laneDir);
    const read = files.readText(path, MAX_JOURNAL_BYTES);
    if (read.kind === 'missing') return [];
    if (read.kind === 'unreadable') {
        throw new GitAcceptanceError('GIT_OWNERSHIP_MISMATCH', path,
            `The worker-event journal exists but could not be read (${read.reason}); acceptance authority cannot be proved.`);
    }
    if (read.text === '') return [];
    return read.text.split('\n').filter((line) => line.length > 0).map((line, index) => parseRecord(line, index, path));
}

/**
 * The most recent `accept` event a `reviewer` recorded for `batchId`, or
 * `null` if none exists. Later events for the same batch shadow earlier ones
 * (a corrected/superseding accept), matching the journal's append-only,
 * most-recent-wins convention used elsewhere in this capability set.
 */
export function findReviewerAcceptEvent(records: readonly WorkerEventRecord[], batchId: string): WorkerEventRecord | null {
    for (let index = records.length - 1; index >= 0; index -= 1) {
        const record = records[index];
        if (record.type === 'accept' && record.payload.role === 'reviewer' && record.payload.batch === batchId) return record;
    }
    return null;
}

/**
 * Verify that `proposal.reviewerSessionId` matches the session recorded on
 * the durable `accept` event for `proposal.batchId`. Fails closed with
 * `GIT_OWNERSHIP_MISMATCH` when no accept event exists at all, or when the
 * recorded session disagrees with the claimed one.
 */
export function validateReviewerOwnership(proposal: AcceptanceProposal, records: readonly WorkerEventRecord[]): OwnershipResult {
    const accept = findReviewerAcceptEvent(records, proposal.batchId);
    if (accept === null) {
        return {
            ok: false, reason: 'GIT_OWNERSHIP_MISMATCH',
            message: `No durable reviewer "accept" event is recorded for batch "${proposal.batchId}".`
        };
    }
    if (accept.laneId !== proposal.laneId || accept.payload.session !== proposal.reviewerSessionId) {
        return {
            ok: false, reason: 'GIT_OWNERSHIP_MISMATCH',
            message: `The acceptance proposal's reviewer session does not match the durable accept event's session for batch "${proposal.batchId}".`
        };
    }
    return {ok: true};
}

function parseRecord(line: string, index: number, path: string): WorkerEventRecord {
    let value: unknown;
    try {
        value = JSON.parse(line);
    } catch {
        throw new GitAcceptanceError('GIT_OWNERSHIP_MISMATCH', path, `Worker-event journal line ${index + 1} is not well-formed JSON.`);
    }
    if (!isJsonObject(value) || !hasWorkerEventShape(value)) {
        throw new GitAcceptanceError('GIT_OWNERSHIP_MISMATCH', path, `Worker-event journal line ${index + 1} does not carry a durable worker event.`);
    }
    return value as unknown as WorkerEventRecord;
}

function hasWorkerEventShape(value: Record<string, unknown>): boolean {
    const payload = value.payload;
    return value.schemaVersion === 1 && typeof value.eventId === 'string' && typeof value.type === 'string'
        && typeof value.laneId === 'string' && isJsonObject(payload)
        && (payload.role === 'implementer' || payload.role === 'reviewer')
        && typeof payload.batch === 'string' && typeof payload.session === 'string';
}
