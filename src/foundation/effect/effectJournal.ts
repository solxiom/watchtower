/**
 * The append-only prepare/attempt/verify effect journal (CA-10;
 * `docs/spec/coordinator-automation.md` §12.2/§18, `docs/spec/v1.md` §13,
 * `docs/spec/v1-contracts.md` §9).
 *
 * `coordinator/journal/effect-events.jsonl` is authoritative history, so this
 * module only ever appends: no record is rewritten, no line is repaired, and a
 * partial final line is reported as corruption that blocks mutation rather than
 * being silently truncated ("blocks mutation until an explicit runtime-index
 * rebuild verifies/truncates only that incomplete tail" — §9; that rebuild is
 * not this owner's).
 *
 * This is also the replay authority: an idempotency key with a recorded
 * terminal outcome returns that outcome instead of repeating its effect, which
 * is what makes a duplicate cycle, an interrupted retry, and a crash-recovery
 * pass all converge on one committed effect.
 */
import {join} from 'node:path';
import {
    EffectExecutionError, EFFECT_PHASE_EVENT_TYPES,
    type EffectJournalRecord, type EffectPhase, type EffectPlan
} from '../../contracts/effects.js';
import {isJsonObject} from '../schemaComposition/jsonCanonicalizer.js';
import {canonicalBytes} from './effectCanonicalBytes.js';
import type {EffectClock, EffectFileSystem, EffectIdFactory} from './effectPorts.js';

const JOURNAL_RELATIVE_PATH = join('coordinator', 'journal', 'effect-events.jsonl');
/** A lane journal well past this is a corruption or retention condition, not a normal read. */
const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;
const PRODUCER = 'watchtower-effect-executor';
/** Phases after which an idempotency key is settled and must never be re-attempted. */
const TERMINAL_PHASES: ReadonlySet<EffectPhase> = new Set<EffectPhase>(['verified', 'failed', 'uncertain']);

export interface JournalRead {
    readonly records: readonly EffectJournalRecord[];
    readonly nextSequence: number;
}

export function effectJournalPath(laneDir: string): string {
    return join(laneDir, JOURNAL_RELATIVE_PATH);
}

/**
 * Read the whole journal, failing closed on a corrupt or partial tail. Returns
 * an empty history for an absent or zero-byte journal — LC-05 materializes the
 * file empty, and "no effect has run yet" is not corruption.
 */
export function readEffectJournal(laneDir: string, files: EffectFileSystem): JournalRead {
    const path = effectJournalPath(laneDir);
    const read = files.readText(path, MAX_JOURNAL_BYTES);
    if (read.kind === 'missing') return {records: [], nextSequence: 0};
    if (read.kind === 'unreadable') {
        throw new EffectExecutionError('EFFECT_JOURNAL_UNREADABLE', path,
            `The effect journal exists but could not be read (${read.reason}); mutation is blocked.`);
    }
    const text = read.text;
    if (text === '') return {records: [], nextSequence: 0};
    if (!text.endsWith('\n')) {
        throw new EffectExecutionError('EFFECT_JOURNAL_UNREADABLE', path,
            'The effect journal ends in a partial record; mutation is blocked until an explicit rebuild verifies the tail.');
    }
    const records = text.slice(0, -1).split('\n').map((line, index) => parseRecord(line, index, path));
    assertContiguous(records, path);
    return {records, nextSequence: records.length === 0 ? 0 : records[records.length - 1].sequence + 1};
}

/**
 * The recorded terminal outcome for `idempotencyKey`, or `null` when this key
 * has never settled. A key seen only as `prepared`/`attempted` is deliberately
 * *not* terminal: that is the interrupted-effect case, which must be resolved
 * from durable state rather than replayed as a success.
 */
export function findSettledOutcome(read: JournalRead, idempotencyKey: string): EffectJournalRecord | null {
    for (let index = read.records.length - 1; index >= 0; index -= 1) {
        const record = read.records[index];
        if (record.payload.idempotencyKey === idempotencyKey && TERMINAL_PHASES.has(record.payload.phase)) return record;
    }
    return null;
}

/** The most recent record for `idempotencyKey` in any phase, used to classify an interrupted effect. */
export function findLatestPhase(read: JournalRead, idempotencyKey: string): EffectJournalRecord | null {
    for (let index = read.records.length - 1; index >= 0; index -= 1) {
        if (read.records[index].payload.idempotencyKey === idempotencyKey) return read.records[index];
    }
    return null;
}

/**
 * Append one phase record and `fsync` it before any caller may claim it. The
 * appended record is returned so the caller journals exactly what was durably
 * written rather than a separately constructed copy.
 */
export function appendEffectPhase(
    laneDir: string, plan: EffectPlan, phase: EffectPhase, outcome: string,
    sequence: number, deps: {files: EffectFileSystem; clock: EffectClock; ids: EffectIdFactory}
): EffectJournalRecord {
    const record: EffectJournalRecord = Object.freeze({
        schemaVersion: 1 as const,
        eventId: deps.ids.nextEventId(),
        type: EFFECT_PHASE_EVENT_TYPES[phase],
        sequence,
        at: deps.clock.now().toISOString(),
        laneId: plan.laneId,
        producer: PRODUCER,
        correlationId: plan.cycleId,
        causationId: plan.proposalId,
        policyVersion: plan.policyVersion,
        payload: Object.freeze({
            phase, effect: plan.effect, actionId: plan.actionId, idempotencyKey: plan.idempotencyKey,
            preconditionDigest: plan.preconditionDigest, targetIds: Object.freeze([...plan.targetIds]), outcome
        })
    });
    const path = effectJournalPath(laneDir);
    deps.files.ensureDirectory(join(laneDir, 'coordinator', 'journal'));
    try {
        deps.files.appendLine(path, canonicalBytes(record, plan.idempotencyKey));
    } catch (error) {
        throw new EffectExecutionError('EFFECT_JOURNAL_WRITE_FAILED', path,
            `The ${phase} journal record could not be durably appended: ${(error as Error).message}`);
    }
    return record;
}

function parseRecord(line: string, index: number, path: string): EffectJournalRecord {
    let value: unknown;
    try {
        value = JSON.parse(line);
    } catch {
        throw new EffectExecutionError('EFFECT_JOURNAL_UNREADABLE', path,
            `Effect journal line ${index + 1} is not a well-formed JSON record.`);
    }
    if (!isJsonObject(value) || !hasRecordShape(value)) {
        throw new EffectExecutionError('EFFECT_JOURNAL_UNREADABLE', path,
            `Effect journal line ${index + 1} does not carry the durable-event effect payload.`);
    }
    return value as unknown as EffectJournalRecord;
}

function hasRecordShape(value: Record<string, unknown>): boolean {
    const payload = value.payload;
    return value.schemaVersion === 1 && typeof value.eventId === 'string' && typeof value.type === 'string'
        && typeof value.sequence === 'number' && Number.isInteger(value.sequence) && value.sequence >= 0
        && typeof value.at === 'string' && typeof value.laneId === 'string' && typeof value.producer === 'string'
        && typeof value.correlationId === 'string' && typeof value.policyVersion === 'string'
        && isJsonObject(payload) && typeof payload.idempotencyKey === 'string'
        && typeof payload.phase === 'string' && typeof payload.effect === 'string'
        && typeof payload.actionId === 'string' && Array.isArray(payload.targetIds);
}

/** §9: `sequence` is a contiguous lane-journal-local unsigned integer. */
function assertContiguous(records: readonly EffectJournalRecord[], path: string): void {
    for (const [index, record] of records.entries()) {
        if (record.sequence !== index) {
            throw new EffectExecutionError('EFFECT_JOURNAL_UNREADABLE', path,
                `Effect journal sequence is not contiguous at line ${index + 1}.`);
        }
    }
}
