import type {CArgMap} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/index.js';

export interface BatchCommandOptions { readonly workspace?: string; readonly lane?: string; readonly json: boolean; readonly noColor: boolean; }
const COMMAND_NAME = 'batch';

/** The host strips the command name before dispatch, so packaged `wt batch ready` arrives as `['ready']`. */
export function batchPositionalArguments(args: CArgMap): readonly string[] {
    const positional = [...args.entries()].filter(([key]) => !key.startsWith('--')).map(([key]) => key);
    return positional[0] === COMMAND_NAME ? positional : [COMMAND_NAME, ...positional];
}

export function parseBatchOptions(args: CArgMap): BatchCommandOptions {
    const positional = batchPositionalArguments(args);
    if (positional.length !== 2 || positional[0] !== COMMAND_NAME || positional[1] !== 'ready') invalid('batch positional arguments');
    for (const [key, value] of args.entries()) {
        if (!key.startsWith('--')) continue;
        if (key === '--workspace' || key === '--lane') { if (typeof value !== 'string' || value.length === 0) invalid(key); continue; }
        if (key === '--json' || key === '--no-color') { if (value !== null) invalid(key); continue; }
        invalid(key);
    }
    for (const key of ['--workspace', '--lane', '--json', '--no-color']) if (args.getAll(key).length > 1) invalid(key);
    const workspace = args.getFlag('workspace', true); const lane = args.getFlag('lane', true);
    return {json: args.hasFlag('json', true), noColor: args.hasFlag('no-color', true), ...(workspace === null ? {} : {workspace}), ...(lane === null ? {} : {lane})};
}

function invalid(target: string): never { throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'parse batch command options', target, remediation: 'Use batch ready with unique documented options.'}); }
