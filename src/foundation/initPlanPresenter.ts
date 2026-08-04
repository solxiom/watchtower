import {output as prettyOutput} from '@nirvana/base/utils/pretty';
import type {JsonValue} from '../contracts/types.js';
import type {InitPlan} from './init/index.js';
import {buildCommandResult} from './commandEnvelopeSerializer.js';
import {renderResult} from './ResultRenderer.js';

export function presentInitPlan(plan: InitPlan, options: {readonly json: boolean; readonly noColor: boolean}): void {
    prettyOutput.write(renderResult(buildCommandResult('init', toJson(plan)), options), 'basic', 0, true);
}

function toJson(value: unknown): JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return value.map(toJson);
    if (typeof value === 'object') {
        const result: Record<string, JsonValue> = {};
        for (const [key, item] of Object.entries(value)) result[key] = toJson(item);
        return result;
    }
    throw new TypeError('Init plan contains a non-JSON value.');
}
