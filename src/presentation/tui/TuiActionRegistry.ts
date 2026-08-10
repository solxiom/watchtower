import type {TuiActionIntent} from '../../contracts/tuiActions.js';
import type {TuiActionContext, TuiActionDescriptor, TuiActionResolution, TuiMutationClass, TuiFocusTarget} from '../../contracts/tuiShell.js';

const BASE_FOCUS: readonly TuiFocusTarget[] = ['conversation', 'composer', 'inspector'];
const ACTIONS: readonly TuiActionDescriptor[] = Object.freeze([
    action('focus.composer', 'i', 'Focus composer', 'read', false, true, ['conversation', 'composer']), action('focus.next', 'Tab', 'Cycle regions', 'read', false, true, ['conversation', 'composer', 'inspector', 'overlay']),
    action('inspector.toggle', 'Ctrl-B', 'Toggle inspector', 'read', false, false, ['conversation', 'composer']), action('palette.open', 'Ctrl-P', 'Open command palette', 'read', false, true, BASE_FOCUS),
    action('help.open', '?', 'Open help', 'read', false, true, ['conversation', 'inspector']), action('attachment.detach', 'Ctrl-D', 'Detach', 'read', false, true, BASE_FOCUS),
    command('status', 'Show lane status', 'read'), command('ready', 'Show ready batches', 'read'), command('batch.show', 'Show batch', 'read', 'batch'),
    command('events', 'Show durable events', 'read'), command('holds', 'Show active holds', 'read'), command('budget', 'Show budget', 'read'), command('queue', 'Show coordinator queue', 'read'),
    command('history', 'Show retained history', 'read'), command('context', 'Show bounded context', 'read'), command('proposals', 'Show session proposals', 'read'), command('sessions', 'Show operator sessions', 'read'),
    command('export', 'Export retained records', 'read'), command('session.pin', 'Pin continuity reference', 'effect', 'pin'), command('session.unpin', 'Unpin continuity reference', 'effect', 'unpin'),
    command('session.compact', 'Compact retained history', 'effect', 'compact', true), command('session.new', 'Create session', 'effect', 'new', true), command('session.switch', 'Switch session', 'effect', 'switch', true),
    command('session.fork', 'Fork session', 'effect', 'fork', true), command('session.suspend', 'Suspend session', 'effect', 'suspend', true), command('session.resume', 'Resume session', 'effect', 'resume', true),
    command('session.close', 'Close session', 'effect', 'close', true), command('budget.grant', 'Grant session budget', 'effect', '', true),
    command('proposal.apply', 'Apply proposal', 'effect', 'apply', true), command('proposal.reject', 'Reject proposal', 'effect', 'reject', true), command('amendment.request', 'Request amendment', 'effect', 'amend', true),
    command('hold.place', 'Place hold', 'effect', '', true), command('hold.release', 'Release hold', 'effect', '', true),
    command('attachment.help', 'Show slash help', 'read', 'help'), command('attachment.clear', 'Clear presentation', 'effect', 'clear'), command('attachment.verbose', 'Toggle diagnostics', 'effect', 'verbose'),
    command('attachment.confirm-mode', 'Set confirmation mode', 'effect', 'confirm-mode'), command('attachment.exit', 'Detach attachment', 'read', 'exit', false, ['quit'])
]);

export type TuiActionParseErrorCode = 'invalid-slash-command' | 'unknown-action' | 'invalid-action-arguments' | 'duplicate-action-definition';
export class TuiActionParseError extends Error { constructor(readonly code: TuiActionParseErrorCode = 'invalid-slash-command') { super(code); this.name = 'TuiActionParseError'; } }
export class TuiActionRegistry {
    constructor() { validateRegistry(); }
    inspect(context: TuiActionContext): readonly TuiActionResolution[] { return Object.freeze(ACTIONS.filter((item) => item.key && item.focusScope.includes(context.focus)).map((item) => this.resolve(item.id, context))); }
    resolve(actionId: string, context: TuiActionContext): TuiActionResolution {
        const descriptor = ACTIONS.find((item) => item.id === actionId);
        if (!descriptor) return Object.freeze({id: actionId, key: '', label: actionId, focusScope: [], mutation: 'read', requiresConfirmation: false, observerEligible: false, available: false, reason: 'unknown-action'});
        const conflict = context.conflictingActionIds?.includes(descriptor.id) ?? false;
        const available = descriptor.focusScope.includes(context.focus) && (context.observer ? descriptor.observerEligible : true) && !conflict;
        const reason = conflict ? 'key-conflict' : available ? undefined : context.observer && !descriptor.observerEligible ? 'observer-ineligible' : 'focus-unavailable';
        return Object.freeze({...descriptor, available, reason});
    }
    descriptor(actionId: string): TuiActionDescriptor | null { return ACTIONS.find((item) => item.id === actionId) ?? null; }
    all(): readonly TuiActionDescriptor[] { return ACTIONS; }
    search(query: string, context: TuiActionContext, limit = 25): readonly TuiActionResolution[] {
        const normalized = query.trim().toLocaleLowerCase();
        if (!Number.isInteger(limit) || limit < 1 || limit > 25) return Object.freeze([]);
        const candidates = ACTIONS.filter((item) => matches(item, normalized)).slice(0, 100);
        return Object.freeze(candidates.slice(0, limit).map((item) => this.resolve(item.id, context)));
    }
    intent(actionId: string, arguments_: Readonly<Record<string, string>> = {}): TuiActionIntent {
        if (!this.descriptor(actionId)) throw new TuiActionParseError('unknown-action');
        if (!validArguments(actionId, arguments_)) throw new TuiActionParseError('invalid-action-arguments');
        return Object.freeze({actionId, arguments: Object.freeze({...arguments_})});
    }
    parseSlash(input: unknown): TuiActionIntent | null {
        if (typeof input !== 'string') throw new TuiActionParseError();
        if (!input.startsWith('/') || input.startsWith('//')) return null;
        const tokens = input.slice(1).trim().split(/\s+/u);
        const word = tokens.shift();
        let descriptor = ACTIONS.find((item) => item.slash === word || item.aliases?.includes(word ?? ''));
        if (word === 'budget' && tokens[0] === 'grant') descriptor = this.descriptor('budget.grant') ?? undefined;
        if (!descriptor) throw new TuiActionParseError();
        const args: Record<string, string> = {};
        if (descriptor.id === 'batch.show') requirePositional(tokens, 1, args, 'id');
        else if (descriptor.id === 'events') parseOptions(tokens, args, ['batch']);
        else if (descriptor.id === 'history') parseOptions(tokens, args, ['since']);
        else if (descriptor.id === 'export') parseOptions(tokens, args, ['format', 'turns', 'output', 'include-routing', 'redact', 'no-redact', 'overwrite', 'confirm-sensitive', 'include-full-text', 'redact-secrets'], ['include-routing', 'redact', 'no-redact', 'overwrite', 'confirm-sensitive', 'include-full-text', 'redact-secrets']);
        else if (descriptor.id === 'session.pin' || descriptor.id === 'session.unpin') requirePositional(tokens, 1, args, 'ref');
        else if (descriptor.id === 'session.new' || descriptor.id === 'session.fork') parseOptions(tokens, args, ['topic']);
        else if (descriptor.id === 'session.switch') requirePositional(tokens, 1, args, 'sessionId');
        else if (descriptor.id === 'budget.grant') { if (tokens.shift() !== 'grant') throw new TuiActionParseError(); parseOptions(tokens, args, ['amount', 'class']); }
        else if (descriptor.id === 'proposal.apply') { requirePositional(tokens, 1, args, 'proposalId'); parseFlags(tokens, args, ['dry-run'], {'dry-run': 'dryRun'}); }
        else if (descriptor.id === 'proposal.reject') requirePositional(tokens, 1, args, 'proposalId');
        else if (descriptor.id === 'amendment.request') parseOptions(tokens, args, ['from-turn', 'rationale']);
        else if (descriptor.id === 'attachment.confirm-mode') parseConfirmMode(tokens, args);
        else if (tokens.length) throw new TuiActionParseError();
        if (tokens.length) throw new TuiActionParseError();
        return this.intent(descriptor.id, args);
    }
}

function action(id: string, key: string, label: string, mutation: TuiMutationClass, requiresConfirmation: boolean, observerEligible: boolean, focusScope: readonly TuiFocusTarget[]): TuiActionDescriptor { return Object.freeze({id, key, label, mutation, requiresConfirmation, observerEligible, focusScope}); }
function command(id: string, label: string, mutation: TuiMutationClass, slash = id, requiresConfirmation = false, aliases: readonly string[] = []): TuiActionDescriptor { return Object.freeze({id, key: '', label, mutation, requiresConfirmation, observerEligible: mutation === 'read', focusScope: BASE_FOCUS, ...(slash ? {slash} : {}), aliases, keywords: [label.toLocaleLowerCase()]}); }
function matches(item: TuiActionDescriptor, query: string): boolean { return !query || [item.id, item.label, item.slash ?? '', ...(item.aliases ?? []), ...(item.keywords ?? [])].some((value) => value.toLocaleLowerCase().includes(query)); }
function validateRegistry(): void {
    const ids = ACTIONS.map((item) => item.id); const slashes = ACTIONS.flatMap((item) => item.slash ? [item.slash, ...(item.aliases ?? [])] : []);
    if (new Set(ids).size !== ids.length || new Set(slashes).size !== slashes.length) throw new TuiActionParseError('duplicate-action-definition');
}
function requirePositional(tokens: string[], expected: number, args: Record<string, string>, key: string): void { if (tokens.length < expected || !tokens[0] || tokens[0].startsWith('-')) throw new TuiActionParseError(); args[key] = tokens[0]; tokens.splice(0, expected); }
function parseOptions(tokens: string[], args: Record<string, string>, allowed: readonly string[], flags: readonly string[] = []): void { for (const token of [...tokens]) { const flag = /^--([a-z-]+)$/u.exec(token); const match = /^--([a-z-]+)=(.+)$/u.exec(token); const key = flag?.[1] ?? match?.[1]; if (!key || !allowed.includes(key) || args[key] !== undefined || (flag && !flags.includes(key)) || (match && flags.includes(key))) throw new TuiActionParseError(); args[key] = match?.[2] ?? 'true'; tokens.shift(); } }
function parseFlags(tokens: string[], args: Record<string, string>, allowed: readonly string[], names: Readonly<Record<string, string>> = {}): void { for (const token of [...tokens]) { if (!token.startsWith('--') || !allowed.includes(token.slice(2)) || names[token.slice(2)] === undefined && args[token.slice(2)] !== undefined) throw new TuiActionParseError(); const key = names[token.slice(2)] ?? token.slice(2); if (args[key] !== undefined) throw new TuiActionParseError(); args[key] = 'true'; tokens.shift(); } }
function parseConfirmMode(tokens: string[], args: Record<string, string>): void { if (tokens.length > 2 || tokens[0] === '--save' && tokens.length !== 1 || (tokens[0] && tokens[0] !== '--save' && !['off', 'd3', 'd2-d3', 'all'].includes(tokens[0])) || (tokens[1] && tokens[1] !== '--save')) throw new TuiActionParseError(); if (tokens[0] === '--save') { args.save = 'true'; tokens.shift(); return; } if (tokens[0]) args.mode = tokens.shift() as string; if (tokens[0]) { args.save = 'true'; tokens.shift(); } }
function validArguments(actionId: string, args: Readonly<Record<string, string>>): boolean {
    if (!isRecord(args) || Object.values(args).some((value) => typeof value !== 'string' || value.length === 0 || value.length > 512)) return false;
    const allowed: Record<string, readonly string[]> = {batch: ['id'], 'batch.show': ['id'], events: ['batch'], history: ['since'], export: ['format', 'turns', 'output', 'include-routing', 'redact', 'no-redact', 'overwrite', 'confirm-sensitive', 'include-full-text', 'redact-secrets'], 'session.pin': ['ref'], 'session.unpin': ['ref'], 'session.new': ['topic'], 'session.fork': ['topic'], 'session.switch': ['sessionId'], 'budget.grant': ['amount', 'class'], 'proposal.apply': ['proposalId', 'dryRun'], 'proposal.reject': ['proposalId'], 'amendment.request': ['from-turn', 'rationale'], 'attachment.confirm-mode': ['mode', 'save']};
    const keys = allowed[actionId] ?? []; if (Object.keys(args).some((key) => !keys.includes(key))) return false;
    const required: Record<string, readonly string[]> = {'batch.show': ['id'], 'session.pin': ['ref'], 'session.unpin': ['ref'], 'session.switch': ['sessionId'], 'proposal.apply': ['proposalId'], 'proposal.reject': ['proposalId']};
    if ((required[actionId] ?? []).some((key) => args[key] === undefined)) return false;
    if ((args.dryRun !== undefined || args.save !== undefined || args['include-routing'] !== undefined || args.redact !== undefined || args['no-redact'] !== undefined || args.overwrite !== undefined || args['confirm-sensitive'] !== undefined || args['include-full-text'] !== undefined || args['redact-secrets'] !== undefined) && !['true'].includes(args.dryRun ?? args.save ?? args['include-routing'] ?? args.redact ?? args['no-redact'] ?? args.overwrite ?? args['confirm-sensitive'] ?? args['include-full-text'] ?? args['redact-secrets'])) return false;
    if (actionId === 'attachment.confirm-mode' && args.mode !== undefined && !['off', 'd3', 'd2-d3', 'all'].includes(args.mode)) return false;
    return true;
}
function isRecord(value: unknown): value is Record<string, string> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
