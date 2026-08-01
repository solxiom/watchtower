import type {CArgMap} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../contracts/index.js';

export interface ReadCommandOptions {
    readonly workspace?: string;
    readonly lane?: string;
    readonly initiative?: string;
    readonly limit?: number;
    readonly cursor?: string;
    readonly json: boolean;
    readonly noColor: boolean;
    readonly verbose: boolean;
}

const sharedValueFlags = new Set(['--workspace', '--lane', '--initiative']);
const listValueFlags = new Set(['--limit', '--cursor']);
const booleanFlags = new Set(['--json', '--no-color', '--verbose']);

export function parseReadCommandOptions(args: CArgMap, command: 'list' | 'config'): ReadCommandOptions {
    const positional = command === 'config' ? new Set(['show']) : new Set<string>();
    const valueFlags = command === 'list' ? new Set([...sharedValueFlags, ...listValueFlags]) : sharedValueFlags;
    for (const [key, value] of args.entries()) validateArgument(key, value, positional, valueFlags);
    for (const flag of [...valueFlags, ...booleanFlags]) rejectDuplicate(args, flag);
    if (command === 'config' && (!args.has('show') || args.get('show') !== null)) invalid('config subcommand');
    return {
        ...optionalValues(args),
        ...listPageOptions(args, command),
        json: args.hasFlag('json', true),
        noColor: args.hasFlag('no-color', true),
        verbose: args.hasFlag('verbose', true)
    };
}

export function validateRawReadCommandArguments(rawArgs: readonly string[]): void {
    const command = rawArgs.find(argument => !argument.startsWith('-'));
    if (command !== 'list' && command !== 'config') return;
    const valueFlags = command === 'list' ? [...sharedValueFlags, ...listValueFlags] : [...sharedValueFlags];
    for (const flag of [...valueFlags, ...booleanFlags]) {
        if (rawArgs.filter(argument => argument === flag || argument.startsWith(`${flag}=`)).length > 1) invalid(flag);
    }
}

function validateArgument(key: string, value: string, positional: ReadonlySet<string>, valueFlags: ReadonlySet<string>): void {
    if (positional.has(key)) {
        if (value !== null) invalid(key);
        return;
    }
    if (valueFlags.has(key)) {
        if (typeof value !== 'string' || value.length === 0) invalid(key);
        return;
    }
    if (booleanFlags.has(key)) {
        if (value !== null) invalid(key);
        return;
    }
    invalid(key);
}

function listPageOptions(args: CArgMap, command: 'list' | 'config'): Pick<ReadCommandOptions, 'limit' | 'cursor'> {
    if (command === 'config') return {};
    const limitText = args.getFlag('limit', true);
    const cursor = args.getFlag('cursor', true);
    let limit: number | undefined;
    if (limitText !== null) {
        if (!/^[1-9][0-9]{0,2}$/u.test(limitText)) invalid('--limit');
        limit = Number(limitText);
        if (limit > 200) invalid('--limit');
    }
    return {...(limit === undefined ? {} : {limit}), ...(cursor === null ? {} : {cursor})};
}

function optionalValues(args: CArgMap): Pick<ReadCommandOptions, 'workspace' | 'lane' | 'initiative'> {
    const workspace = args.getFlag('workspace', true);
    const lane = args.getFlag('lane', true);
    const initiative = args.getFlag('initiative', true);
    return {
        ...(workspace === null ? {} : {workspace}),
        ...(lane === null ? {} : {lane}),
        ...(initiative === null ? {} : {initiative})
    };
}

function rejectDuplicate(args: CArgMap, flag: string): void {
    if (args.getAll(flag).length > 1) invalid(flag);
}

function invalid(target: string): never {
    throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
        operation: 'parse read command options', target,
        remediation: 'Use only documented read-command arguments and supply every option at most once.'
    });
}
