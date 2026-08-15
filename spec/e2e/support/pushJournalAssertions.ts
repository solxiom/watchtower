/**
 * REL-02 correction-01 finding #2 — structural per-repository push-journal
 * validation.
 *
 * The product's durable push journal *is*
 * `coordinator/journal/effect-events.jsonl` (CA-10; `effectJournal.ts`):
 * `GitAcceptanceAdapter.publishCommits` gives every repository its own
 * `EffectPlan`, idempotency key, and journal entries
 * (`gitAcceptancePublication.ts`'s `buildPlan`/`publishOne`), so "the
 * per-repository push journal" is exactly this one shared journal filtered by
 * `payload.effect === 'publish-commits'` and `payload.targetIds`. This module
 * reads the raw JSONL bytes directly — never through `readEffectJournal`,
 * which is itself the thing under proof — and independently re-validates the
 * exact shape `effectJournal.ts`'s `hasRecordShape` requires
 * (`src/contracts/effects.ts`'s `EffectJournalRecord`/`EffectJournalPayload`),
 * so a structural defect in a durable record is a fixture failure, not
 * something that could pass by only reading through the product's own reader.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

export interface PushJournalRecord {
    readonly schemaVersion: number;
    readonly eventId: string;
    readonly type: string;
    readonly sequence: number;
    readonly at: string;
    readonly laneId: string;
    readonly producer: string;
    readonly correlationId: string;
    readonly causationId: string | null;
    readonly policyVersion: string;
    readonly payload: {
        readonly phase: string;
        readonly effect: string;
        readonly actionId: string;
        readonly idempotencyKey: string;
        readonly preconditionDigest: string;
        readonly targetIds: readonly string[];
        readonly outcome: string;
    };
}

const REQUIRED_TOP_FIELDS = [
    'schemaVersion', 'eventId', 'type', 'sequence', 'at', 'laneId', 'producer', 'correlationId', 'causationId', 'policyVersion', 'payload'
];
const REQUIRED_PAYLOAD_FIELDS = ['phase', 'effect', 'actionId', 'idempotencyKey', 'preconditionDigest', 'targetIds', 'outcome'];
const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

/** Reads and structurally validates every durable JSONL record in one lane's push/effect journal. */
export function readPushJournal(laneDir: string): readonly PushJournalRecord[] {
    const path = join(laneDir, 'coordinator', 'journal', 'effect-events.jsonl');
    const text = readFileSync(path, 'utf8');
    const lines = text.split('\n').filter((line) => line.length > 0);
    return lines.map((line, index) => validateRecord(JSON.parse(line) as Record<string, unknown>, index, path));
}

function validateRecord(value: Record<string, unknown>, index: number, path: string): PushJournalRecord {
    const where = `${path}:${index + 1}`;
    for (const field of REQUIRED_TOP_FIELDS) {
        if (!(field in value)) throw new Error(`${where} missing "${field}"`);
    }
    if (value.schemaVersion !== 1) throw new Error(`${where} schemaVersion must be 1`);
    assertNonEmptyString(value.eventId, `${where} eventId`);
    assertNonEmptyString(value.type, `${where} type`);
    if (typeof value.sequence !== 'number' || !Number.isInteger(value.sequence) || value.sequence < 0) {
        throw new Error(`${where} sequence must be a non-negative integer`);
    }
    if (typeof value.at !== 'string' || !ISO_8601.test(value.at)) throw new Error(`${where} at must be an ISO-8601 timestamp`);
    assertNonEmptyString(value.laneId, `${where} laneId`);
    assertNonEmptyString(value.producer, `${where} producer`);
    if (typeof value.correlationId !== 'string') throw new Error(`${where} correlationId must be a string`);
    if (value.causationId !== null && typeof value.causationId !== 'string') throw new Error(`${where} causationId must be a string or null`);
    assertNonEmptyString(value.policyVersion, `${where} policyVersion`);
    const payload = value.payload as Record<string, unknown> | null;
    if (typeof payload !== 'object' || payload === null) throw new Error(`${where} payload must be an object`);
    for (const field of REQUIRED_PAYLOAD_FIELDS) {
        if (!(field in payload)) throw new Error(`${where} payload missing "${field}"`);
    }
    assertNonEmptyString(payload.phase, `${where} payload.phase`);
    assertNonEmptyString(payload.effect, `${where} payload.effect`);
    assertNonEmptyString(payload.actionId, `${where} payload.actionId`);
    assertNonEmptyString(payload.idempotencyKey, `${where} payload.idempotencyKey`);
    if (typeof payload.preconditionDigest !== 'string' || !payload.preconditionDigest.startsWith('sha256:')) {
        throw new Error(`${where} payload.preconditionDigest must be a sha256 digest`);
    }
    if (!Array.isArray(payload.targetIds) || payload.targetIds.some((id) => typeof id !== 'string')) {
        throw new Error(`${where} payload.targetIds must be a string array`);
    }
    assertNonEmptyString(payload.outcome, `${where} payload.outcome`);
    return value as unknown as PushJournalRecord;
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
    if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string`);
}

/**
 * The terminal (`verified`/`failed`/`uncertain`) `publish-commits` record for
 * exactly one repository's own single-target attempt, or `undefined` when no
 * attempt has settled yet.
 */
export function terminalPublishRecord(records: readonly PushJournalRecord[], repositoryId: string): PushJournalRecord | undefined {
    const terminal = new Set(['verified', 'failed', 'uncertain']);
    for (let index = records.length - 1; index >= 0; index -= 1) {
        const record = records[index];
        if (record.payload.effect === 'publish-commits' && record.payload.targetIds.length === 1 &&
            record.payload.targetIds[0] === repositoryId && terminal.has(record.payload.phase)) {
            return record;
        }
    }
    return undefined;
}
