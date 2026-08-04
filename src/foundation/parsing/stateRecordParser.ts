import type {ParseDiagnostic} from '../../contracts/index.js';
import {isBlankLine, isCommentLine, isSafeScalarValue, parseKeyValue, splitLines} from './scalarLineParser.js';

const knownKeys = new Set(['lane_status', 'active_batch', 'watcher_status']);

export interface ParsedStateRecords {
    state: Record<string, string>;
    errors: ParseDiagnostic[];
    warnings: ParseDiagnostic[];
    unknownKeys: Record<string, string>;
    keyLines: Record<string, number>;
    duplicateLaneStatus: boolean;
}

export function parseStateRecords(content: string): ParsedStateRecords {
    const result: ParsedStateRecords = {state: {}, errors: [], warnings: [], unknownKeys: {}, keyLines: {}, duplicateLaneStatus: false};
    const seenKeys = new Set<string>();
    splitLines(content).forEach((line, index) => parseLine(line, index + 1, result, seenKeys));
    return result;
}

function parseLine(line: string, lineNumber: number, result: ParsedStateRecords, seenKeys: Set<string>): void {
    if (isBlankLine(line) || isCommentLine(line)) return;
    const entry = parseKeyValue(line);
    if (entry === null || !isSafeScalarValue(entry.value, entry.quoting)) {
        result.errors.push({line: lineNumber, code: 'invalid-state-scalar', message: 'Expected a safe KEY=value state scalar.'});
        return;
    }
    if (seenKeys.has(entry.key)) {
        result.errors.push({line: lineNumber, code: 'duplicate-key', message: 'Duplicate lane-state keys are not allowed.', key: entry.key});
        if (entry.key === 'lane_status') result.duplicateLaneStatus = true;
        return;
    }
    seenKeys.add(entry.key);
    result.state[entry.key] = entry.value;
    result.keyLines[entry.key] = lineNumber;
    if (!knownKeys.has(entry.key)) {
        result.unknownKeys[entry.key] = entry.value;
        result.warnings.push({line: lineNumber, code: 'unknown-key', message: 'Preserved an unknown state key.', key: entry.key});
    }
}
