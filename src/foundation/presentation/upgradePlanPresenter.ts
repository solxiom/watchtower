import {output as prettyOutput} from '@nirvana/base/utils/pretty';
import type {JsonValue} from '../../contracts/types.js';
import type {UpgradePlan} from '../../contracts/upgrade.js';
import {buildCommandResult} from './commandEnvelopeSerializer.js';
import {renderResult} from './ResultRenderer.js';

export function presentUpgradePlan(plan: UpgradePlan, options: {readonly json: boolean; readonly noColor: boolean}): void {
    prettyOutput.write(renderResult(buildCommandResult('upgrade', toJson(plan)), options), 'basic', 0, true);
}
function toJson(value: unknown): JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return value.map(toJson);
    if (typeof value === 'object' && value !== null) {
        const result: Record<string, JsonValue> = {};
        for (const [key, item] of Object.entries(value)) result[key] = toJson(item);
        return result;
    }
    throw new TypeError('Upgrade plan contains a non-JSON value.');
}
