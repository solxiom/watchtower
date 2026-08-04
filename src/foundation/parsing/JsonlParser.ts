import {roleEventCompatibility, validateEventCompatibility} from '../../contracts/events.js';
import type {WorkerEventRecord, WorkerEventRole} from '../../contracts/events.js';
import {isRfc3339DateTime} from '../rfc3339DateTime.js';

export interface JsonlWarning {
    line: number;
    reason: string;
}

export interface JsonlParseResult {
    records: WorkerEventRecord[];
    warnings: JsonlWarning[];
}

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseJsonlStream(content: string): JsonlParseResult {
    const lines = content.split('\n');
    const hasTrailingNewline = content.endsWith('\n');
    if (hasTrailingNewline) lines.pop();

    const result: JsonlParseResult = {records: [], warnings: []};
    lines.forEach((line, index) => parseLine(line, index + 1, isPartialFinalLine(index, lines.length, hasTrailingNewline), result));
    return result;
}

export function latest(records: WorkerEventRecord[], role: WorkerEventRole, n: number): WorkerEventRecord[] {
    if (!Number.isSafeInteger(n) || n <= 0) return [];

    return records
        .map((record, index) => ({record, index}))
        .filter(entry => entry.record.payload.role === role)
        .sort((left, right) => right.record.sequence - left.record.sequence || left.index - right.index)
        .slice(0, n)
        .map(entry => entry.record);
}

function isPartialFinalLine(index: number, lineCount: number, hasTrailingNewline: boolean): boolean {
    return !hasTrailingNewline && index === lineCount - 1;
}

function parseLine(line: string, lineNumber: number, isPartial: boolean, result: JsonlParseResult): void {
    if (line.trim() === '') return;

    let value: unknown;
    try {
        value = JSON.parse(line);
    } catch {
        result.warnings.push({line: lineNumber, reason: isPartial ? 'partial final line corruption' : 'malformed JSON'});
        return;
    }

    const duplicateMember = findDuplicateMember(line);
    if (duplicateMember !== undefined) {
        result.warnings.push({line: lineNumber, reason: `duplicate JSON member: ${duplicateMember}`});
        return;
    }

    const validationErrors = validateDurableWorkerEvent(value);
    if (validationErrors.length > 0) {
        result.warnings.push({line: lineNumber, reason: validationErrors.join('; ')});
        return;
    }

    const record = value as WorkerEventRecord;
    result.records.push(record);
    warningReasons(record).forEach(reason => result.warnings.push({line: lineNumber, reason}));
}

function warningReasons(record: WorkerEventRecord): string[] {
    const knownEvent = Object.values(roleEventCompatibility).some(events => events.includes(record.type as never));
    return knownEvent ? validateEventCompatibility(record) : [`unknown event type: ${record.type}`];
}

function validateDurableWorkerEvent(value: unknown): string[] {
    if (!isPlainRecord(value)) return ['record must be an object'];
    const errors = [
        requiredId(value, 'eventId'), requiredLiteral(value, 'schemaVersion', 1), requiredString(value, 'type'),
        requiredInteger(value, 'sequence'), requiredDateTime(value, 'at'), requiredUuid(value, 'laneId'),
        requiredString(value, 'producer'), requiredId(value, 'correlationId'), requiredCausationId(value),
        requiredString(value, 'policyVersion'), validatePayload(value.payload)
    ];
    return errors.filter((error): error is string => error !== undefined);
}

function validatePayload(value: unknown): string | undefined {
    if (!isPlainRecord(value)) return 'payload must be an object';
    if (value.role !== 'implementer' && value.role !== 'reviewer') return 'payload.role must be implementer or reviewer';
    if (!isNonEmptyString(value.batch)) return 'payload.batch must be a non-empty string';
    if (!isNonEmptyString(value.session)) return 'payload.session must be a non-empty string';
    if (value.commits !== undefined && (!isPlainRecord(value.commits) || !Object.values(value.commits).every(isString))) {
        return 'payload.commits must map repository IDs to strings';
    }
    return undefined;
}

function requiredId(record: Record<string, unknown>, field: string): string | undefined {
    return typeof record[field] === 'string' && ID_PATTERN.test(record[field]) ? undefined : `${field} must be a valid ID`;
}

function requiredLiteral(record: Record<string, unknown>, field: string, expected: unknown): string | undefined {
    return record[field] === expected ? undefined : `${field} must be ${String(expected)}`;
}

function requiredString(record: Record<string, unknown>, field: string): string | undefined {
    return isNonEmptyString(record[field]) ? undefined : `${field} must be a non-empty string`;
}

function requiredInteger(record: Record<string, unknown>, field: string): string | undefined {
    return Number.isInteger(record[field]) && (record[field] as number) >= 0 ? undefined : `${field} must be a non-negative integer`;
}

function requiredDateTime(record: Record<string, unknown>, field: string): string | undefined {
    const value = record[field];
    return typeof value === 'string' && isRfc3339DateTime(value)
        ? undefined : `${field} must be an ISO date-time`;
}

function requiredUuid(record: Record<string, unknown>, field: string): string | undefined {
    return typeof record[field] === 'string' && UUID_PATTERN.test(record[field]) ? undefined : `${field} must be a UUID`;
}

function requiredCausationId(record: Record<string, unknown>): string | undefined {
    return record.causationId === null || (typeof record.causationId === 'string' && ID_PATTERN.test(record.causationId))
        ? undefined : 'causationId must be a valid ID or null';
}

function findDuplicateMember(json: string): string | undefined {
    const objectKeys: Set<string>[] = [];
    for (let index = 0; index < json.length; index += 1) {
        if (json[index] === '{') objectKeys.push(new Set<string>());
        if (json[index] === '}') objectKeys.pop();
        if (json[index] !== '"') continue;
        const end = stringEnd(json, index + 1);
        if (end === undefined) return undefined;
        let member: string;
        try {
            member = JSON.parse(json.slice(index, end + 1)) as string;
        } catch {
            return undefined;
        }
        index = end;
        let next = index + 1;
        while (/\s/.test(json[next] ?? '')) next += 1;
        if (json[next] !== ':' || objectKeys.length === 0) continue;
        const keys = objectKeys[objectKeys.length - 1];
        if (keys.has(member)) return member;
        keys.add(member);
    }
    return undefined;
}

function stringEnd(json: string, start: number): number | undefined {
    for (let index = start; index < json.length; index += 1) {
        if (json[index] === '\\') {
            index += 1;
        } else if (json[index] === '"') {
            return index;
        }
    }
    return undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
    return isString(value) && value.length > 0;
}
