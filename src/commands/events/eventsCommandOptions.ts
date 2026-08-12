import type {CArgMap} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/index.js';

export type EventsAction = 'tail' | 'latest';
export interface EventsCommandOptions { readonly action: EventsAction; readonly batch?: string; readonly since?: string; readonly limit: number; readonly workspace?: string; readonly lane?: string; readonly json: boolean; readonly noColor: boolean; }
const VALUE_FLAGS = ['batch', 'since', 'limit', 'workspace', 'lane'] as const;
const BOOLEAN_FLAGS = ['json', 'no-color'] as const;
const COMMAND_NAME = 'events';

/** The host strips the command name before dispatch, so packaged `wt events tail` arrives as `['tail']`. */
export function eventsPositionalArguments(args: CArgMap): readonly string[] {
    const positional = [...args.entries()].filter(([key]) => !key.startsWith('--')).map(([key]) => key);
    return positional[0] === COMMAND_NAME ? positional : [COMMAND_NAME, ...positional];
}

export function parseEventsOptions(args: CArgMap): EventsCommandOptions {
    const positional = eventsPositionalArguments(args);
    if (positional.length !== 2 || positional[0] !== COMMAND_NAME || (positional[1] !== 'tail' && positional[1] !== 'latest')) invalid('events positional arguments');
    for (const [key, value] of args.entries()) {
        if (!key.startsWith('--')) continue;
        if ((VALUE_FLAGS as readonly string[]).includes(key.slice(2))) { if (typeof value !== 'string' || value.length === 0) invalid(key); continue; }
        if ((BOOLEAN_FLAGS as readonly string[]).includes(key.slice(2))) { if (value !== null) invalid(key); continue; }
        invalid(key);
    }
    for (const flag of [...VALUE_FLAGS, ...BOOLEAN_FLAGS]) if (args.getAll(`--${flag}`).length > 1) invalid(`--${flag}`);
    const limitText = args.getFlag('limit', true); const limit = limitText === null ? 50 : Number(limitText);
    if (!/^[1-9][0-9]{0,2}$/u.test(limitText ?? '50') || limit > 200) invalid('--limit');
    const action: EventsAction = positional[1] === 'tail' ? 'tail' : 'latest';
    const batch = args.getFlag('batch', true); const since = args.getFlag('since', true); const workspace = args.getFlag('workspace', true); const lane = args.getFlag('lane', true);
    if (action === 'latest' && since !== null) invalid('--since is only valid for events tail');
    const result: EventsCommandOptions = {action, limit, json: args.hasFlag('json', true), noColor: args.hasFlag('no-color', true)};
    return {...result, ...(batch === null ? {} : {batch}), ...(since === null ? {} : {since}), ...(workspace === null ? {} : {workspace}), ...(lane === null ? {} : {lane})};
}
function invalid(target: string): never { throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'parse events command options', target, remediation: 'Use events tail or latest with unique documented options.'}); }
