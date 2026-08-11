import type {CArgMap} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/index.js';

export type CoordinatorAction = 'index' | 'status' | 'context' | 'explain' | 'cycle' | 'escalate' | 'resolution' | 'session' | 'ask';
export type CoordinatorIndexSubject = 'status' | 'verify' | 'explain' | 'build';
export type CoordinatorResolutionSubject = 'show' | 'propose' | 'sync-check' | 'resume';
export interface CoordinatorCommandOptions { readonly action: CoordinatorAction; readonly subject?: CoordinatorIndexSubject | CoordinatorResolutionSubject; readonly target?: string; readonly workspace?: string; readonly lane?: string; readonly initiative?: string; readonly decisionClass?: string; readonly trigger?: string; readonly cycle?: string; readonly reason?: string; readonly worktree?: string; readonly runtime: boolean; readonly dryRun: boolean; readonly json: boolean; readonly noColor: boolean; }

const VALUE_FLAGS = ['--workspace', '--lane', '--initiative', '--class', '--trigger', '--cycle', '--reason', '--worktree'] as const;
const BOOLEAN_FLAGS = ['--runtime', '--dry-run', '--json', '--no-color'] as const;
const ACTIONS = new Set<CoordinatorAction>(['index', 'status', 'context', 'explain', 'cycle', 'escalate', 'resolution', 'session', 'ask']);
const INDEX_SUBJECTS = new Set<CoordinatorIndexSubject>(['status', 'verify', 'explain', 'build']);
const RESOLUTION_SUBJECTS = new Set<CoordinatorResolutionSubject>(['show', 'propose', 'sync-check', 'resume']);
/** Lane selection and output shape are meaningful on every coordinator form. */
const COMMON_FLAGS = ['--workspace', '--lane', '--initiative', '--json', '--no-color'] as const;
/**
 * The exact extra options each action form admits. An option that belongs to
 * another form is an invalid argument here, not a silently ignored one: the
 * operator asked for something this command cannot do, so it fails closed
 * before lane discovery, any capsule read, or any effect authority call.
 * `--dry-run` accordingly appears only on the forms that can mutate — `index
 * build` plus the three mutating coordinator operations — because `show` and
 * `sync-check` are read-only (`specification-resolution.md` §9) and previewing
 * them would claim a mutation exists.
 */
const FORM_FLAGS: Readonly<Record<string, readonly string[]>> = {
    'index status': [], 'index verify': [], 'index explain': [], 'index build': ['--runtime', '--dry-run'],
    status: [], context: ['--class', '--trigger'], explain: ['--cycle'],
    cycle: ['--trigger', '--dry-run'], escalate: ['--cycle', '--reason', '--dry-run'],
    'resolution show': [], 'resolution propose': ['--dry-run'],
    'resolution sync-check': ['--worktree'], 'resolution resume': ['--dry-run']
};

const COMMAND_NAME = 'coordinator';

/**
 * The `coordinator` positional list, normalized to always begin with the
 * command name, for the forms this parser owns. CA-24's `session`/`ask` forms
 * carry their own subject grammar and are parsed by `sessionCommandOptions`,
 * so this function only normalizes the list and hands it on.
 *
 * Correction 01: the Nirvana command host strips the command name before it
 * hands argv to the command — `BasicCli.run` dispatches
 * `applyCommand(cmdName, args.slice(1))` — so a packaged `wt coordinator
 * status` reaches this parser as `['status']`, not `['coordinator', 'status']`.
 * The grammar below is written against the name-prefixed form, and every
 * existing focused spec supplies it directly, so normalizing here restores the
 * one shape both callers mean without loosening a single rule about which
 * actions, subjects, and options are legal. The name is accepted when already
 * present so a direct caller and the host agree on one parser.
 */
export function coordinatorPositionalArguments(args: CArgMap): string[] {
    const positional = [...args.entries()].filter(([key]) => !key.startsWith('--')).map(([key]) => key);
    return positional[0] === COMMAND_NAME ? positional : [COMMAND_NAME, ...positional];
}

export function isSessionAction(positional: readonly string[]): boolean {
    return positional[0] === 'coordinator' && (positional[1] === 'session' || positional[1] === 'ask');
}

export function parseCoordinatorOptions(args: CArgMap): CoordinatorCommandOptions {
    const positional = coordinatorPositionalArguments(args);
    if (positional[0] !== 'coordinator' || positional.length < 2 || positional.length > 4) invalid('coordinator positional arguments');
    const action = positional[1]; if (!ACTIONS.has(action as CoordinatorAction)) invalid(action);
    const typedAction = action as CoordinatorAction;
    const subject = positional[2]; const target = positional[3];
    if (typedAction === 'index') {
        if (subject === undefined || !INDEX_SUBJECTS.has(subject as CoordinatorIndexSubject)) invalid('coordinator index subject');
        if (subject !== 'explain' && target !== undefined) invalid('coordinator index target');
        if (subject === 'explain' && (target === undefined || target.length === 0)) invalid('coordinator index explain target');
    } else if (typedAction === 'resolution') {
        if (subject === undefined || !RESOLUTION_SUBJECTS.has(subject as CoordinatorResolutionSubject)) invalid('coordinator resolution subject');
        if (target === undefined || target.length === 0) invalid('coordinator resolution blocker');
    } else if (subject !== undefined || target !== undefined) invalid('coordinator action subject');
    const form = subject === undefined ? typedAction : `${typedAction} ${subject}`;
    const admitted = new Set<string>([...COMMON_FLAGS, ...(FORM_FLAGS[form] ?? [])]);
    for (const [key, value] of args.entries()) {
        if (!key.startsWith('--')) continue;
        if (!admitted.has(key)) invalid(key);
        if ((VALUE_FLAGS as readonly string[]).includes(key)) { if (typeof value !== 'string' || value.length === 0) invalid(key); continue; }
        if ((BOOLEAN_FLAGS as readonly string[]).includes(key)) { if (value !== null) invalid(key); continue; }
        invalid(key);
    }
    for (const flag of admitted) if (args.getAll(flag).length > 1) invalid(flag);
    const result: CoordinatorCommandOptions = {action: typedAction, ...(subject === undefined ? {} : {subject: subject as CoordinatorIndexSubject | CoordinatorResolutionSubject}), ...(target === undefined ? {} : {target}), ...optional(args, '--workspace', 'workspace'), ...optional(args, '--lane', 'lane'), ...optional(args, '--initiative', 'initiative'), ...optional(args, '--class', 'decisionClass'), ...optional(args, '--trigger', 'trigger'), ...optional(args, '--cycle', 'cycle'), ...optional(args, '--reason', 'reason'), ...optional(args, '--worktree', 'worktree'), runtime: args.hasFlag('--runtime', true), dryRun: args.hasFlag('--dry-run', true), json: args.hasFlag('--json', true), noColor: args.hasFlag('--no-color', true)};
    if (typedAction === 'context' && (result.decisionClass === undefined || result.trigger === undefined)) invalid('context requires --class and --trigger');
    if (typedAction === 'cycle' && result.trigger === undefined) invalid('cycle requires --trigger');
    if (typedAction === 'escalate' && result.reason === undefined) invalid('escalate requires --reason');
    if (typedAction === 'resolution' && result.subject === 'sync-check' && result.worktree === undefined) invalid('resolution sync-check requires --worktree');
    return result;
}

function optional(args: CArgMap, flag: string, field: 'workspace' | 'lane' | 'initiative' | 'decisionClass' | 'trigger' | 'cycle' | 'reason' | 'worktree'): Pick<CoordinatorCommandOptions, typeof field> {
    const value = args.getFlag(flag, true); return value === null ? {} : {[field]: value} as Pick<CoordinatorCommandOptions, typeof field>;
}
function invalid(target: string): never { throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'parse coordinator command options', target, remediation: 'Use one documented coordinator action with unique options, and name a mutating subject before requesting --dry-run.'}); }
