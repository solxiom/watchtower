import type {CArgMap} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/index.js';

export interface DoctorCommandOptions {
    readonly workspace?: string;
    readonly lane?: string;
    readonly json: boolean;
    readonly noColor: boolean;
}

const valueFlags = new Set(['--workspace', '--lane']);
const booleanFlags = new Set(['--json', '--no-color']);

export function parseDoctorCommandOptions(args: CArgMap): DoctorCommandOptions {
    for (const [key, value] of args.entries()) validateArgument(key, value);
    for (const flag of [...valueFlags, ...booleanFlags]) {
        if (args.getAll(flag).length > 1) invalid(flag);
    }
    const workspace = args.getFlag('workspace', true);
    const lane = args.getFlag('lane', true);
    return {
        ...(workspace === null ? {} : {workspace}),
        ...(lane === null ? {} : {lane}),
        json: args.hasFlag('json', true),
        noColor: args.hasFlag('no-color', true)
    };
}

function validateArgument(key: string, value: string): void {
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

function invalid(target: string): never {
    throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
        operation: 'parse doctor command options', target,
        remediation: 'Use only --workspace, --lane, --json, and --no-color, each at most once.'
    });
}
