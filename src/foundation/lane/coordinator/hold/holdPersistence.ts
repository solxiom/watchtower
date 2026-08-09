/**
 * Durable form of `coordinator/holds/holds.json` (CA-27).
 *
 * Mirrors `queuePersistence.ts`'s whole-file-projection shape: an absent or
 * empty file is a legitimate initial state (no hold has ever been placed), an
 * unreadable/malformed one fails closed rather than silently restarting empty
 * and forgetting a live hold.
 *
 * Review correction CA27-01: every nested field is validated against its
 * closed syntax — not just the outer object shape — before a persisted hold
 * record is trusted. `origin` is constrained to the closed `ProposalOrigin`
 * vocabulary, `createdAt`/`expiresAt` must be strict RFC 3339 UTC timestamps,
 * `scope` must be non-empty with no blank or duplicate entries, the document's
 * own `laneId` must equal the lane this read was issued for, and no record may
 * carry an unrecognized member.
 */
import {join} from 'node:path';
import {
    ScopedHoldError, emptyHoldDocument, type ScopedHoldDocument, type ScopedHoldRecord
} from './holdContracts.js';
import {
    isIsoDateTime, isNonEmptyString, isNonEmptyStringArrayNoDuplicates, isNonNegativeInteger, isProposalOrigin
} from '../coordinatorRecordValidation.js';
import type {QueueFileSystem} from '../queue/queuePorts.js';

const MAX_PROJECTION_BYTES = 1 * 1024 * 1024;
const DOCUMENT_KEYS = Object.freeze(['schemaVersion', 'laneId', 'holds', 'projectionRevision']);
const RECORD_KEYS = Object.freeze(['holdId', 'scope', 'reason', 'origin', 'createdAt', 'expiresAt']);

export function holdsDir(laneDir: string): string {
    return join(laneDir, 'coordinator', 'holds');
}

export function holdsPath(laneDir: string): string {
    return join(holdsDir(laneDir), 'holds.json');
}

export function readHoldDocument(laneDir: string, laneId: string, files: QueueFileSystem): ScopedHoldDocument {
    const path = holdsPath(laneDir);
    const read = files.readText(path, MAX_PROJECTION_BYTES);
    if (read.kind === 'missing') return emptyHoldDocument(laneId);
    if (read.kind === 'unreadable') {
        throw new ScopedHoldError('HOLD_STATE_UNREADABLE', path, `The holds projection exists but could not be read (${read.reason}).`);
    }
    if (read.text.trim() === '') return emptyHoldDocument(laneId);
    let value: unknown;
    try {
        value = JSON.parse(read.text);
    } catch {
        throw new ScopedHoldError('HOLD_STATE_UNREADABLE', path, 'The holds projection is not well-formed JSON.');
    }
    return parseHoldDocument(value, path, laneId);
}

export function writeHoldDocument(laneDir: string, document: ScopedHoldDocument, files: QueueFileSystem): void {
    const path = holdsPath(laneDir);
    try {
        files.ensureDirectory(holdsDir(laneDir));
        files.writeAtomic(path, `${JSON.stringify(document)}\n`);
    } catch (error) {
        throw new ScopedHoldError('HOLD_STATE_WRITE_FAILED', path, `The holds projection could not be durably written: ${(error as Error).message}`);
    }
}

function parseHoldDocument(value: unknown, path: string, expectedLaneId: string): ScopedHoldDocument {
    if (!isPlainObject(value) || !hasExactKeys(value, DOCUMENT_KEYS)) {
        throw new ScopedHoldError('HOLD_STATE_UNREADABLE', path, 'The holds projection is not a JSON object with the declared schema members.');
    }
    if (value.schemaVersion !== 1 || value.laneId !== expectedLaneId
        || !Array.isArray(value.holds) || !isNonNegativeInteger(value.projectionRevision)) {
        throw new ScopedHoldError('HOLD_STATE_UNREADABLE', path,
            'The holds projection schema version, lane ID, holds array, or projection revision is invalid.');
    }
    const holds = value.holds.map((entry) => parseHoldRecord(entry, path));
    const seen = new Set<string>();
    for (const hold of holds) {
        if (seen.has(hold.holdId)) {
            throw new ScopedHoldError('HOLD_STATE_UNREADABLE', path, `duplicate hold ID "${hold.holdId}" in the holds projection.`);
        }
        seen.add(hold.holdId);
    }
    return Object.freeze({
        schemaVersion: 1 as const, laneId: expectedLaneId, holds: Object.freeze(holds), projectionRevision: value.projectionRevision
    });
}

function parseHoldRecord(value: unknown, path: string): ScopedHoldRecord {
    if (!isPlainObject(value) || !hasExactKeys(value, RECORD_KEYS)) {
        throw new ScopedHoldError('HOLD_STATE_UNREADABLE', path, 'A hold record is not a JSON object with the declared members.');
    }
    if (!isNonEmptyString(value.holdId) || !isNonEmptyStringArrayNoDuplicates(value.scope) || !isNonEmptyString(value.reason)
        || !isProposalOrigin(value.origin) || !isIsoDateTime(value.createdAt) || !isIsoDateTime(value.expiresAt)) {
        throw new ScopedHoldError('HOLD_STATE_UNREADABLE', path, 'A hold record fails its closed field syntax.');
    }
    return Object.freeze({
        holdId: value.holdId, scope: Object.freeze([...value.scope]), reason: value.reason,
        origin: value.origin, createdAt: value.createdAt, expiresAt: value.expiresAt
    });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    const actual = Object.keys(value);
    return actual.length === keys.length && keys.every((key) => key in value);
}
