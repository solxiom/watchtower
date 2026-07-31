import type {LaneStateResult, ParseDiagnostic} from '../contracts/index.js';
import {detectContradictions, normalizeLaneStatus} from './laneLifecycle.js';
import {parseStateRecords} from './stateRecordParser.js';

export function parseLaneState(content: string): LaneStateResult {
    const result = parseStateRecords(content);
    let lifecycle = normalizeLaneStatus(result.state);
    if (result.duplicateLaneStatus) lifecycle = 'unknown';
    if (lifecycle === 'unknown' && !result.duplicateLaneStatus) result.errors.push({line: result.keyLines.lane_status ?? 0, code: 'invalid-lane-status', message: 'lane_status must be an explicit recognized lifecycle value.'});
    const contradictions = detectContradictions(result.state, lifecycle);
    if (contradictions.length > 0) {
        lifecycle = 'unknown';
        const diagnostics: ParseDiagnostic[] = contradictions.map((message) => ({line: result.keyLines.lane_status ?? 0, code: 'contradictory-lane-state', message}));
        result.errors.push(...diagnostics);
    }
    const {keyLines: _keyLines, duplicateLaneStatus: _duplicateLaneStatus, ...parsed} = result;
    return {...parsed, lifecycle, contradictions, valid: result.errors.length === 0};
}
