import type {CArgMap} from '@nirvana/base/cli/contracts';
import type {InstallScope} from '../../foundation/hostAdapters/index.js';
import {INSTALL_SCOPES} from '../../foundation/hostAdapters/index.js';
import {createWatchtowerError} from '../../contracts/index.js';

export interface SkillInstallOptions {
    readonly host: string;
    readonly scope: InstallScope;
    readonly replace: boolean;
    readonly dryRun: boolean;
    readonly json: boolean;
    readonly noColor: boolean;
}

const VALUE_FLAGS = new Set(['--scope']);
const BOOLEAN_FLAGS = new Set(['--replace', '--dry-run', '--json', '--no-color']);

export function parseSkillInstallOptions(args: CArgMap): SkillInstallOptions {
    if (!args.has('install') || args.get('install') !== null) invalid('skill subcommand');
    for (const [key, value] of args.entries()) validateArgument(key, value);
    for (const flag of [...VALUE_FLAGS, ...BOOLEAN_FLAGS]) rejectDuplicate(args, flag);
    return {
        host: extractHost(args),
        scope: extractScope(args),
        replace: args.hasFlag('replace', true),
        dryRun: args.hasFlag('dry-run', true),
        json: args.hasFlag('json', true),
        noColor: args.hasFlag('no-color', true)
    };
}

function validateArgument(key: string, value: string): void {
    if (key === 'install') { if (value !== null) invalid(key); return; }
    if (VALUE_FLAGS.has(key)) { if (typeof value !== 'string' || value.length === 0) invalid(key); return; }
    if (BOOLEAN_FLAGS.has(key)) { if (value !== null) invalid(key); return; }
    if (!key.startsWith('-')) { if (value !== null) invalid(key); return; }
    invalid(key);
}

function extractHost(args: CArgMap): string {
    const positionals = [...args.entries()].filter(([key, value]) => key !== 'install' && !key.startsWith('-') && value === null);
    if (positionals.length !== 1) invalid('<host>');
    return positionals[0][0];
}

function extractScope(args: CArgMap): InstallScope {
    const requested = args.getFlag('scope', true);
    if (requested === null) return 'full';
    if (!(INSTALL_SCOPES as readonly string[]).includes(requested)) invalid('--scope');
    return requested as InstallScope;
}

function rejectDuplicate(args: CArgMap, flag: string): void {
    if (args.getAll(flag).length > 1) invalid(flag);
}

function invalid(target: string): never {
    throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
        operation: 'parse skill install options', target,
        remediation: 'Use: skill install <codex|cursor|claude> [--scope=<scope>] [--replace] [--dry-run] [--json].'
    });
}
