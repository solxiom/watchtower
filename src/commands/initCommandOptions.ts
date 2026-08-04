import type {CArgMap} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../contracts/errors.js';
import type {InitRequest} from '../foundation/init/index.js';

const VALUE_FLAGS = ['--tmux-prefix', '--impl-pack', '--coordinator-routing', '--scope', '--runtime', '--workspace'];
const BOOLEAN_FLAGS = ['--update-gitignore', '--dry-run', '--json', '--no-color'];

export interface InitCommandOptions {readonly request: InitRequest; readonly json: boolean; readonly noColor: boolean;}

export function parseInitCommandOptions(args: CArgMap, cwd: string): InitCommandOptions {
    const positionals: string[] = [];
    for (const [key, value] of args.entries()) {
        if (key === 'init' && value === null) continue;
        if (!key.startsWith('--') && value === null) { positionals.push(key); continue; }
        if (VALUE_FLAGS.includes(key)) { if (typeof value !== 'string' || value.length === 0) invalid(key); continue; }
        if (BOOLEAN_FLAGS.includes(key)) { if (value !== null) invalid(key); continue; }
        invalid(key);
    }
    if (positionals.length !== 1) invalid('<slug>');
    for (const flag of [...VALUE_FLAGS, ...BOOLEAN_FLAGS]) if (args.getAll(flag).length > 1) invalid(flag);
    return {request: {slug: positionals[0], tmuxPrefix: required(args, 'tmux-prefix'),
        implPackPath: required(args, 'impl-pack'), coordinatorRoutingPath: required(args, 'coordinator-routing'),
        ...optional(args, 'scope', 'scopePath'), ...optional(args, 'runtime', 'runtimeVersion'),
        ...optional(args, 'workspace', 'workspacePath'), updateGitignore: args.hasFlag('update-gitignore', true),
        dryRun: args.hasFlag('dry-run', true), cwd}, json: args.hasFlag('json', true), noColor: args.hasFlag('no-color', true)};
}

function required(args: CArgMap, name: string): string { const value = args.getFlag(name, true); if (value === null) invalid(`--${name}`); return value; }
function optional(args: CArgMap, name: string, field: 'scopePath' | 'runtimeVersion' | 'workspacePath'): object { const value = args.getFlag(name, true); return value === null ? {} : {[field]: value}; }
function invalid(target: string): never { throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'parse init command', target, remediation: 'Use exactly the documented init syntax; aliases, unknown/reserved options, duplicates, and extra positionals are unsupported.'}); }
