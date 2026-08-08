import type {CArgMap} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/index.js';

export type CoordinatorAction = 'index' | 'status' | 'context' | 'explain';
export type CoordinatorIndexSubject = 'status' | 'verify' | 'explain' | 'build';
export interface CoordinatorCommandOptions { readonly action: CoordinatorAction; readonly subject?: CoordinatorIndexSubject; readonly target?: string; readonly workspace?: string; readonly lane?: string; readonly initiative?: string; readonly decisionClass?: string; readonly trigger?: string; readonly cycle?: string; readonly runtime: boolean; readonly dryRun: boolean; readonly json: boolean; readonly noColor: boolean; }

const VALUE_FLAGS = ['--workspace', '--lane', '--initiative', '--class', '--trigger', '--cycle'] as const;
const BOOLEAN_FLAGS = ['--runtime', '--dry-run', '--json', '--no-color'] as const;
const ACTIONS = new Set<CoordinatorAction>(['index', 'status', 'context', 'explain']);
const INDEX_SUBJECTS = new Set<CoordinatorIndexSubject>(['status', 'verify', 'explain', 'build']);

export function parseCoordinatorOptions(args: CArgMap): CoordinatorCommandOptions {
    const positional = [...args.entries()].filter(([key]) => !key.startsWith('--')).map(([key]) => key);
    if (positional[0] !== 'coordinator' || positional.length < 2 || positional.length > 4) invalid('coordinator positional arguments');
    const action = positional[1]; if (!ACTIONS.has(action as CoordinatorAction)) invalid(action);
    const typedAction = action as CoordinatorAction;
    const subject = positional[2]; const target = positional[3];
    if (typedAction === 'index') {
        if (subject === undefined || !INDEX_SUBJECTS.has(subject as CoordinatorIndexSubject)) invalid('coordinator index subject');
        if (subject !== 'explain' && target !== undefined) invalid('coordinator index target');
        if (subject === 'explain' && (target === undefined || target.length === 0)) invalid('coordinator index explain target');
    } else if (subject !== undefined || target !== undefined) invalid('coordinator action subject');
    for (const [key, value] of args.entries()) {
        if (!key.startsWith('--')) continue;
        if ((VALUE_FLAGS as readonly string[]).includes(key)) { if (typeof value !== 'string' || value.length === 0) invalid(`--${key}`); continue; }
        if ((BOOLEAN_FLAGS as readonly string[]).includes(key)) { if (value !== null) invalid(`--${key}`); continue; }
        invalid(`--${key}`);
    }
    for (const flag of [...VALUE_FLAGS, ...BOOLEAN_FLAGS]) if (args.getAll(flag).length > 1) invalid(`--${flag}`);
    const result: CoordinatorCommandOptions = {action: typedAction, ...(subject === undefined ? {} : {subject: subject as CoordinatorIndexSubject}), ...(target === undefined ? {} : {target}), ...optional(args, '--workspace', 'workspace'), ...optional(args, '--lane', 'lane'), ...optional(args, '--initiative', 'initiative'), ...optional(args, '--class', 'decisionClass'), ...optional(args, '--trigger', 'trigger'), ...optional(args, '--cycle', 'cycle'), runtime: args.hasFlag('--runtime', true), dryRun: args.hasFlag('--dry-run', true), json: args.hasFlag('--json', true), noColor: args.hasFlag('--no-color', true)};
    if (typedAction === 'context' && (result.decisionClass === undefined || result.trigger === undefined)) invalid('context requires --class and --trigger');
    return result;
}

function optional(args: CArgMap, flag: string, field: 'workspace' | 'lane' | 'initiative' | 'decisionClass' | 'trigger' | 'cycle'): Pick<CoordinatorCommandOptions, typeof field> {
    const value = args.getFlag(flag, true); return value === null ? {} : {[field]: value} as Pick<CoordinatorCommandOptions, typeof field>;
}
function invalid(target: string): never { throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'parse coordinator command options', target, remediation: 'Use one documented read-only coordinator action with unique options and no unknown subjects.'}); }
