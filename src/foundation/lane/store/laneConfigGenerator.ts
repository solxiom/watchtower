/**
 * Builds `lane.config.env` (`docs/spec/v1.md` §8): the strict, non-executing
 * `KEY="value"` subset `envParser.ts` reads back. Every value is emitted
 * double-quoted and re-checked against the exact byte class the parser
 * rejects, so a generated file always round-trips through that reader.
 */
import type {ConsumedPack} from '../../../contracts/pack.js';
import {createWatchtowerError} from '../../../contracts/errors.js';
import {safePathTarget} from '../../paths/index.js';
import type {InitPlan} from '../../init/index.js';
import {homeRepositoryId} from './laneManifestGenerator.js';

const ORDERED_KEYS = ['LANE_ID', 'LANE_SLUG', 'INITIATIVE_ID', 'HOME_REPOSITORY_ID', 'WORKSPACE', 'TMUX_PREFIX', 'IMPL_PACK_REL'] as const;

export function generateLaneConfig(plan: InitPlan, pack: ConsumedPack): string {
    const tmuxPrefix = plan.config.WT_TMUX_PREFIX;
    if (tmuxPrefix === undefined) throw integrityFailure('WT_TMUX_PREFIX', 'Resolve a tmux prefix before generating lane.config.env.');
    const values: Record<typeof ORDERED_KEYS[number], string> = {
        LANE_ID: plan.lane.id,
        LANE_SLUG: plan.lane.slug,
        INITIATIVE_ID: pack.initiativeId,
        HOME_REPOSITORY_ID: homeRepositoryId(plan),
        WORKSPACE: plan.controlHome,
        TMUX_PREFIX: tmuxPrefix,
        IMPL_PACK_REL: plan.implementationPack.path
    };
    return ORDERED_KEYS.map(key => `${key}="${assertQuotable(key, values[key])}"`).join('\n') + '\n';
}

function assertQuotable(key: string, value: string): string {
    if (value.length === 0 || value.includes('"') || hasUnsafeByte(value)) {
        throw integrityFailure(key, 'Use a value the strict lane.config.env parser can read back unchanged.');
    }
    return value;
}

function hasUnsafeByte(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        const character = value[index];
        if (code <= 0x1f || code === 0x7f || character === '$' || character === '`' || character === '&' ||
            character === '|' || character === ';' || character === '<' || character === '>' ||
            character === '!' || character === '\\') return true;
    }
    return false;
}

function integrityFailure(target: string, remediation: string) {
    return createWatchtowerError('ERR_INTEGRITY_FAILURE', {operation: 'generate lane configuration', target: safePathTarget(target), remediation});
}
