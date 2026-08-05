import type {CArgMap} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/index.js';

const VALUE_FLAGS = ['--workspace', '--lane', '--initiative'];
const BOOLEAN_FLAGS = ['--no-color'];

export interface WatchCommandOptions {
    readonly workspace?: string;
    readonly lane?: string;
    readonly initiative?: string;
    readonly noColor: boolean;
}

/** `docs/spec/v1-contracts.md` line 447 — `watch` is a foreground attachment and rejects `--json`. */
export function parseWatchCommandOptions(args: CArgMap): WatchCommandOptions {
    for (const [key, value] of args.entries()) {
        if (key === 'watch' && value === null) continue;
        if (key === '--json') invalidJson();
        if (VALUE_FLAGS.includes(key)) { if (typeof value !== 'string' || value.length === 0) invalid(key); continue; }
        if (BOOLEAN_FLAGS.includes(key)) { if (value !== null) invalid(key); continue; }
        invalid(key);
    }
    for (const flag of [...VALUE_FLAGS, ...BOOLEAN_FLAGS]) if (args.getAll(flag).length > 1) invalid(flag);
    return {
        ...optional(args, 'workspace', 'workspace'),
        ...optional(args, 'lane', 'lane'),
        ...optional(args, 'initiative', 'initiative'),
        noColor: args.hasFlag('no-color', true)
    };
}

function optional(args: CArgMap, name: string, field: 'workspace' | 'lane' | 'initiative'): object {
    const value = args.getFlag(name, true);
    return value === null ? {} : {[field]: value};
}

function invalid(target: string): never {
    throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
        operation: 'parse watch command', target,
        remediation: 'Use only documented watch arguments and supply every option at most once.'
    });
}

function invalidJson(): never {
    throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
        operation: 'parse watch command', target: '--json',
        remediation: 'wt watch is a foreground attachment and does not support --json; use status or events for durable JSON views.'
    });
}
