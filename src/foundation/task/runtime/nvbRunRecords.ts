/**
 * Closed record shapes for the pinned NVB `--events-json --result-json` stream.
 *
 * Process output is untrusted text (`docs/spec/architecture.md` §9.1), so this
 * module is the single place that decides what a *well-formed* NVB record is.
 * "Exact" means all three of: every member the pinned producer always emits is
 * present, no unsupported member exists, and every member carries the pinned
 * type and nested shape.
 *
 * Both member sets are the pinned producer's own construction sites:
 * `@nirvana/b-core/src/contracts/ExecutionEvent.js` assigns exactly the nine
 * event members, and
 * `b-core/src/support/basic/helpers/typicalCLIMainCall/resultPayload.js`
 * `makeResultPayload` assigns exactly the eighteen result members plus
 * `taskResults`, which it adds only when a run produced more than one task
 * result. A record with a missing member, an unknown member, a duplicate JSON
 * member, a wrong-typed member, or contradictory terminal fields is not "mostly
 * right": it is rejected, because a forged or drifted producer must never be
 * interpreted as a run.
 */
import {hasDuplicateJsonObjectKey} from '../../schemaComposition/jsonDuplicateKeyDetector.js';
import type {JsonValue} from '../../../contracts/types.js';
import type {LaneTaskEventCategory} from '../../../contracts/taskRuntime.js';
import {
    hasExactMembers,
    instantOf,
    isInstant,
    isJsonObjectArray,
    isJsonObjectMember,
    isNonEmptyString,
    isNullableInstant,
    isNullableJsonObject,
    isNullableString,
    isStringArray
} from './nvbRecordValues.js';

/** Exact member set of a pinned NVB run event record. */
const EVENT_MEMBERS = ['version', 'runId', 'sequence', 'timestamp', 'type', 'source', 'cwd', 'taskName', 'payload'];

/** Exact required member set of a pinned NVB run result record. */
const RESULT_MEMBERS = [
    'runId', 'status', 'cwd', 'isServe', 'serveName', 'sessionId', 'stopReason', 'cancellationReason',
    'failurePhase', 'requestedTasks', 'startedAt', 'finishedAt', 'failedTask', 'framework',
    'structuredOutput', 'interpretation', 'error', 'observerDiagnostics'
];

/** Emitted by the pinned producer only for a multi-task-result run. */
const RESULT_OPTIONAL_MEMBERS = ['taskResults'];

const EVENT_VERSION = 1;
const MAX_DIAGNOSTIC_LENGTH = 200;
const ABSOLUTE_PATH = /(?:^|\s)(?:[A-Za-z]:)?[\\/][^\s]*/gu;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/gu;

/** One structurally valid NVB event record. */
export interface NvbEventRecord {
    readonly runId: string;
    readonly sequence: number;
    readonly timestamp: string;
    readonly category: LaneTaskEventCategory;
    readonly type: string;
    readonly source: string;
    readonly cwd: string | null;
    readonly taskId: string | null;
}

/** One structurally valid, internally consistent NVB run result record. */
export interface NvbResultRecord {
    readonly runId: string;
    readonly status: 'finished' | 'failed' | 'cancelled';
    readonly cwd: string | null;
    readonly requestedTasks: readonly string[];
    readonly failedTask: string | null;
    readonly cancellationReason: string | null;
    readonly startedAt: string | null;
    readonly finishedAt: string | null;
    readonly structuredOutput: JsonValue | null;
    readonly diagnostic: string | null;
}

export type NvbRecord =
    | {readonly kind: 'event'; readonly event: NvbEventRecord}
    | {readonly kind: 'result'; readonly result: NvbResultRecord}
    | {readonly kind: 'malformed'};

const MALFORMED: NvbRecord = {kind: 'malformed'};

/** Classify one complete stdout line into exactly one closed record kind. */
export function readNvbRecord(line: string): NvbRecord {
    const record = parseClosedObject(line);
    if (record === null) return MALFORMED;
    if (hasExactMembers(record, EVENT_MEMBERS)) {
        const event = readEvent(record);
        return event === null ? MALFORMED : {kind: 'event', event};
    }
    if (hasExactMembers(record, RESULT_MEMBERS, RESULT_OPTIONAL_MEMBERS)) {
        const result = readResult(record);
        return result === null ? MALFORMED : {kind: 'result', result};
    }
    return MALFORMED;
}

/** Bound, strip control characters from, and remove paths from free text. */
export function redactDiagnostic(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) return 'No diagnostic was reported.';
    const stripped = value.replace(CONTROL_CHARACTER, ' ').replace(ABSOLUTE_PATH, ' <path>').trim();
    const collapsed = stripped.replace(/\s{2,}/gu, ' ');
    return collapsed.length === 0 ? 'No diagnostic was reported.' : collapsed.slice(0, MAX_DIAGNOSTIC_LENGTH);
}

function parseClosedObject(line: string): Record<string, unknown> | null {
    if (typeof line !== 'string' || !line.startsWith('{') || hasDuplicateJsonObjectKey(line)) return null;
    let value: unknown;
    try {
        value = JSON.parse(line);
    } catch {
        return null;
    }
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function readEvent(record: Record<string, unknown>): NvbEventRecord | null {
    if (record.version !== EVENT_VERSION || !isNonEmptyString(record.runId) || !isNonEmptyString(record.type)
        || !isNonEmptyString(record.source) || !isJsonObjectMember(record.payload)
        || typeof record.sequence !== 'number' || !Number.isSafeInteger(record.sequence) || record.sequence < 1
        || !isInstant(record.timestamp)
        || !isNullableString(record.cwd) || !isNullableString(record.taskName)) {
        return null;
    }
    return {
        runId: record.runId,
        sequence: record.sequence,
        timestamp: record.timestamp,
        category: category(record.type),
        type: record.type,
        source: record.source,
        cwd: record.cwd,
        taskId: record.taskName
    };
}

function readResult(record: Record<string, unknown>): NvbResultRecord | null {
    if (!hasResultMemberTypes(record) || !isConsistentResult(record)) return null;
    const status = record.status as NvbResultRecord['status'];
    return {
        runId: record.runId as string,
        status,
        cwd: record.cwd as string | null,
        requestedTasks: [...record.requestedTasks as readonly string[]],
        failedTask: record.failedTask as string | null,
        cancellationReason: record.cancellationReason as string | null,
        startedAt: record.startedAt as string | null,
        finishedAt: record.finishedAt as string | null,
        structuredOutput: isJsonObjectMember(record.structuredOutput) ? record.structuredOutput : null,
        diagnostic: readErrorMessage(record.error)
    };
}

/** Every result member carries the pinned type and nested shape. */
function hasResultMemberTypes(record: Record<string, unknown>): boolean {
    return isNonEmptyString(record.runId)
        && (record.status === 'finished' || record.status === 'failed' || record.status === 'cancelled')
        && isNullableString(record.cwd) && typeof record.isServe === 'boolean'
        && isNullableString(record.serveName) && isNullableString(record.sessionId)
        && isNullableString(record.stopReason) && isNullableString(record.cancellationReason)
        && isNullableString(record.failurePhase) && isNullableString(record.failedTask)
        && isStringArray(record.requestedTasks)
        && isNullableInstant(record.startedAt) && isNullableInstant(record.finishedAt)
        && isNullableJsonObject(record.framework) && isNullableJsonObject(record.structuredOutput)
        && isNullableJsonObject(record.interpretation) && isJsonObjectArray(record.observerDiagnostics)
        && isErrorSummary(record.error)
        && (!Object.hasOwn(record, 'taskResults') || isJsonObjectMember(record.taskResults));
}

/**
 * Terminal fields must agree with each other and with the run clock. The pinned
 * producer derives all of them from one summary, so a record that reports a
 * finished run *and* a failure, a serve identity on a task run, or a finish
 * before its own start is a contradiction rather than a partially usable result.
 */
function isConsistentResult(record: Record<string, unknown>): boolean {
    const failed = record.status === 'failed';
    if (record.isServe !== false || record.serveName !== null || record.sessionId !== null
        || record.stopReason !== null) {
        return false;
    }
    if ((record.error !== null || record.failedTask !== null || record.failurePhase !== null) && !failed) return false;
    if (record.cancellationReason !== null && record.status !== 'cancelled') return false;
    if (record.status === 'finished' && (record.startedAt === null || record.finishedAt === null)) return false;
    return isOrderedRun(record.startedAt as string | null, record.finishedAt as string | null);
}

function isOrderedRun(startedAt: string | null, finishedAt: string | null): boolean {
    const started = instantOf(startedAt);
    const finished = instantOf(finishedAt);
    return started === null || finished === null || finished >= started;
}

/**
 * The pinned `summarizeExecutionError` always supplies `name`, `message`, and
 * `stack`, then spreads the execution summary's own error members, so the core
 * is required while additional members must still be well-formed JSON.
 */
function isErrorSummary(error: unknown): boolean {
    if (error === null) return true;
    if (!isJsonObjectMember(error)) return false;
    return isNonEmptyString(error.name) && typeof error.message === 'string' && isNullableString(error.stack);
}

function readErrorMessage(error: unknown): string | null {
    if (!isJsonObjectMember(error)) return null;
    return typeof error.message === 'string' ? redactDiagnostic(error.message) : null;
}

function category(type: string): LaneTaskEventCategory {
    if (type.startsWith('run.')) return 'run';
    if (type.startsWith('task.')) return 'task';
    if (type.startsWith('group.')) return 'group';
    if (type.startsWith('process.')) return 'process';
    if (type.startsWith('execution.')) return 'execution';
    return 'other';
}
