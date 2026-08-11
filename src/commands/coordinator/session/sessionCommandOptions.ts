import type {CArgMap} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../../contracts/index.js';

/**
 * Argument parsing for `wt coordinator session …` and `wt coordinator ask`
 * (CA-24; `docs/spec/cli-session.md` §4/§9, `docs/spec/v1.md` §9).
 *
 * Every form declares the exact extra options it admits. An option belonging
 * to another form is an invalid argument here, not a silently ignored one, and
 * `--dry-run` appears only on forms that can change durable bytes — previewing
 * a read would claim a mutation exists. Parsing happens before lane discovery,
 * any journal read, and any effect authority call.
 */
export type SessionForm =
    | 'create' | 'attach' | 'list' | 'show' | 'history' | 'export' | 'budget' | 'proposals'
    | 'suspend' | 'resume' | 'close' | 'fork' | 'pin' | 'unpin' | 'prune' | 'compact'
    | 'apply' | 'amendment' | 'ask';

export type AmendmentForm = 'request' | 'list' | 'admit';

export interface SessionCommandOptions {
    readonly form: SessionForm;
    /** `session <form> <subject>` — the operator-session id, ref, or amendment identity. */
    readonly subject?: string;
    readonly second?: string;
    readonly amendment?: AmendmentForm;
    readonly workspace?: string;
    readonly lane?: string;
    readonly initiative?: string;
    readonly topic?: string;
    readonly policyProfile?: string;
    readonly since?: string;
    readonly pack?: string;
    readonly reason?: string;
    readonly question?: string;
    readonly queryForm?: string;
    readonly session?: string;
    readonly tags: readonly string[];
    readonly observe: boolean;
    readonly stream: boolean;
    readonly waitForActiveTurn: boolean;
    readonly dryRun: boolean;
    readonly json: boolean;
    readonly noColor: boolean;
}

const VALUE_FLAGS = ['--workspace', '--lane', '--initiative', '--topic', '--policy-profile', '--since', '--pack', '--reason', '--question', '--query-form', '--session'] as const;
const BOOLEAN_FLAGS = ['--observe', '--stream', '--no-stream', '--wait-for-active-turn', '--dry-run', '--json', '--no-color'] as const;
const COMMON_FLAGS = ['--workspace', '--lane', '--initiative', '--json', '--no-color'] as const;
const SUBJECT_FORMS = new Set<SessionForm>(['attach', 'show', 'history', 'export', 'budget', 'proposals', 'suspend', 'resume', 'close', 'fork', 'pin', 'unpin', 'prune', 'compact', 'apply']);
const AMENDMENT_FORMS = new Set<AmendmentForm>(['request', 'list', 'admit']);
const FORMS = new Set<SessionForm>(['attach', 'list', 'show', 'history', 'export', 'budget', 'proposals', 'suspend', 'resume', 'close', 'fork', 'pin', 'unpin', 'prune', 'compact', 'apply', 'amendment']);

const FORM_FLAGS: Readonly<Record<SessionForm, readonly string[]>> = Object.freeze({
    create: ['--topic', '--policy-profile', '--stream', '--no-stream'],
    attach: ['--observe', '--stream', '--no-stream', '--wait-for-active-turn'],
    list: [], show: [], budget: [], proposals: [],
    history: ['--since'], export: ['--since'],
    suspend: ['--dry-run'], resume: ['--dry-run'], close: ['--dry-run'], prune: ['--dry-run'],
    fork: ['--topic', '--policy-profile', '--dry-run'],
    pin: ['--dry-run'], unpin: ['--dry-run'], compact: ['--dry-run'], apply: ['--dry-run'],
    amendment: ['--pack', '--reason', '--dry-run'],
    ask: ['--question', '--query-form', '--session']
});

/**
 * `positional` is the full `coordinator <action> …` list. `session` may carry
 * a form, a subject, and one second subject (`pin <id> <ref>`,
 * `apply <id> <proposal>`, `amendment <form> <id>`); `ask` carries none.
 */
export function parseSessionOptions(args: CArgMap, positional: readonly string[]): SessionCommandOptions {
    const action = positional[1];
    if (action !== 'session' && action !== 'ask') invalid('session command action');
    const {form, subject, second, amendment} = action === 'ask' ? askShape(positional) : sessionShape(positional);
    const admitted = new Set<string>([...COMMON_FLAGS, ...FORM_FLAGS[form]]);
    for (const [key, value] of args.entries()) {
        if (!key.startsWith('--')) continue;
        if (!admitted.has(key)) invalid(key);
        if ((VALUE_FLAGS as readonly string[]).includes(key)) { if (typeof value !== 'string' || value.length === 0) invalid(key); continue; }
        if ((BOOLEAN_FLAGS as readonly string[]).includes(key)) { if (value !== null) invalid(key); continue; }
        invalid(key);
    }
    for (const flag of admitted) if (args.getAll(flag).length > 1) invalid(flag);
    if (args.hasFlag('--stream', true) && args.hasFlag('--no-stream', true)) invalid('--stream with --no-stream');
    const options: SessionCommandOptions = {
        form, ...(subject === undefined ? {} : {subject}), ...(second === undefined ? {} : {second}),
        ...(amendment === undefined ? {} : {amendment}),
        ...optional(args, '--workspace', 'workspace'), ...optional(args, '--lane', 'lane'),
        ...optional(args, '--initiative', 'initiative'), ...optional(args, '--topic', 'topic'),
        ...optional(args, '--policy-profile', 'policyProfile'), ...optional(args, '--since', 'since'),
        ...optional(args, '--pack', 'pack'), ...optional(args, '--reason', 'reason'),
        ...optional(args, '--question', 'question'), ...optional(args, '--query-form', 'queryForm'), ...optional(args, '--session', 'session'),
        tags: [], observe: args.hasFlag('--observe', true), stream: !args.hasFlag('--no-stream', true),
        waitForActiveTurn: args.hasFlag('--wait-for-active-turn', true), dryRun: args.hasFlag('--dry-run', true),
        json: args.hasFlag('--json', true), noColor: args.hasFlag('--no-color', true)
    };
    requireFormInputs(options);
    return options;
}

interface FormShape {
    readonly form: SessionForm;
    readonly subject?: string;
    readonly second?: string;
    readonly amendment?: AmendmentForm;
}

function askShape(positional: readonly string[]): FormShape {
    if (positional.length !== 2) invalid('coordinator ask positional arguments');
    return {form: 'ask'};
}

function sessionShape(positional: readonly string[]): FormShape {
    if (positional.length === 2) return {form: 'create'};
    if (positional.length > 5) invalid('coordinator session positional arguments');
    const named = positional[2];
    if (!FORMS.has(named as SessionForm)) invalid(`coordinator session ${named}`);
    const form = named as SessionForm;
    if (form === 'amendment') return amendmentShape(positional);
    const subject = positional[3];
    if (SUBJECT_FORMS.has(form) === (subject === undefined)) invalid(`coordinator session ${form} subject`);
    const second = positional[4];
    if ((form === 'pin' || form === 'unpin' || form === 'apply') === (second === undefined)) invalid(`coordinator session ${form} second subject`);
    return {form, ...(subject === undefined ? {} : {subject}), ...(second === undefined ? {} : {second})};
}

function amendmentShape(positional: readonly string[]): FormShape {
    const sub = positional[3];
    if (sub === undefined || !AMENDMENT_FORMS.has(sub as AmendmentForm)) invalid('coordinator session amendment form');
    const amendment = sub as AmendmentForm;
    const subject = positional[4];
    if ((amendment !== 'list') === (subject === undefined)) invalid(`coordinator session amendment ${amendment} subject`);
    return {form: 'amendment', amendment, ...(subject === undefined ? {} : {subject})};
}

/** The value flags a form cannot execute without; missing one is invalid input, never a default. */
function requireFormInputs(options: SessionCommandOptions): void {
    if (options.form === 'create' && options.topic === undefined) invalid('session requires --topic');
    if (options.form === 'ask' && (options.question === undefined || options.session === undefined)) invalid('ask requires --question and --session');
    if (options.form !== 'amendment') return;
    if (options.amendment === 'request' && (options.pack === undefined || options.reason === undefined)) {
        invalid('session amendment request requires --pack and --reason');
    }
}

function optional(
    args: CArgMap, flag: string,
    field: 'workspace' | 'lane' | 'initiative' | 'topic' | 'policyProfile' | 'since' | 'pack' | 'reason' | 'question' | 'queryForm' | 'session'
): Pick<SessionCommandOptions, typeof field> {
    const value = args.getFlag(flag, true);
    return value === null ? {} : {[field]: value} as Pick<SessionCommandOptions, typeof field>;
}

function invalid(target: string): never {
    throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
        operation: 'parse coordinator session command options', target,
        remediation: 'Use one documented session form with its exact subjects and unique options, and request --dry-run only on a form that can write.'
    });
}
