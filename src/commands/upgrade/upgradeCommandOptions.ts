import type {CArgMap} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/errors.js';

export interface UpgradeCommandOptions {
    readonly lane?: string;
    readonly workspace?: string;
    readonly to?: string;
    readonly apply: boolean;
    readonly allowDowngrade: boolean;
    readonly dryRun: boolean;
    readonly json: boolean;
    readonly noColor: boolean;
}
const VALUE_FLAGS = new Set(['--lane', '--workspace', '--to']);
const BOOLEAN_FLAGS = new Set(['--apply', '--allow-downgrade', '--dry-run', '--json', '--no-color']);

export function parseUpgradeCommandOptions(args: CArgMap): UpgradeCommandOptions {
    for (const [key, value] of args.entries()) {
        if (VALUE_FLAGS.has(key)) {
            if (typeof value !== 'string' || value.length === 0 || (key === '--to' && !VERSION.test(value))) invalid(key);
            continue;
        }
        if (BOOLEAN_FLAGS.has(key)) { if (value !== null) invalid(key); continue; }
        if (key === 'upgrade' && value === null) continue;
        invalid(key);
    }
    for (const flag of [...VALUE_FLAGS, ...BOOLEAN_FLAGS]) if (args.getAll(flag).length > 1) invalid(flag);
    return {lane: optional(args, 'lane'), workspace: optional(args, 'workspace'), to: optional(args, 'to'),
        apply: args.hasFlag('apply', true), allowDowngrade: args.hasFlag('allow-downgrade', true),
        dryRun: args.hasFlag('dry-run', true), json: args.hasFlag('json', true), noColor: args.hasFlag('no-color', true)};
}
function optional(args: CArgMap, name: string): string | undefined { const value = args.getFlag(name, true); return value === null ? undefined : value; }
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u;
function invalid(target: string): never { throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'parse upgrade command', target,
    remediation: 'Use upgrade with optional --lane, --workspace, --to, --apply, --allow-downgrade, --dry-run, --json, and --no-color options.'}); }
