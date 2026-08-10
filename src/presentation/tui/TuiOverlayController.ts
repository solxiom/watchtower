import type {TuiActionIntent} from '../../contracts/tuiActions.js';
import type {TuiOverlayChoice, TuiOverlayIntent, TuiOverlayKind, TuiOverlayRequest, TuiOverlayTransition, TuiOverlayViewModel} from '../../contracts/tuiOverlay.js';
import {TuiActionRegistry} from './TuiActionRegistry.js';

export class TuiOverlayController {
    private currentOverlay: TuiOverlayViewModel | null = null;
    constructor(private readonly registry = new TuiActionRegistry()) {}
    open(input: unknown): TuiOverlayTransition {
        const request = parseRequest(input, this.registry);
        const choices = normalizeChoices(request.choices);
        const next = Object.freeze({...request, choices, open: true});
        return this.transition(next, null);
    }
    reduce(input: unknown): TuiOverlayTransition {
        const intent = parseIntent(input);
        const from = this.currentOverlay;
        if (!from) return Object.freeze({from: null, to: null, closed: true, acceptedChoice: null});
        if (intent.type === 'close') return this.transition(null, 'close');
        if (intent.type === 'next' || intent.type === 'previous') {
            const delta = intent.type === 'next' ? 1 : -1;
            return this.transition(Object.freeze({...from, focusedChoice: (from.focusedChoice + delta + from.choices.length) % from.choices.length}), null);
        }
        if (intent.type === 'choose') return this.choose(from, intent.choice);
        return Object.freeze({from, to: from, closed: false, acceptedChoice: null});
    }
    current(): TuiOverlayViewModel | null { return this.currentOverlay; }
    private choose(from: TuiOverlayViewModel, choice: TuiOverlayChoice): TuiOverlayTransition {
        if (!from.choices.includes(choice)) return Object.freeze({from, to: from, closed: false, acceptedChoice: null});
        if (choice === 'close' || choice === 'cancel') return this.transition(null, choice);
        return Object.freeze({from, to: from, closed: false, acceptedChoice: choice});
    }
    private transition(to: TuiOverlayViewModel | null, acceptedChoice: TuiOverlayChoice | 'close' | null): TuiOverlayTransition {
        const from = this.currentOverlay;
        this.currentOverlay = to;
        return Object.freeze({from, to, closed: to === null, acceptedChoice: acceptedChoice === 'close' ? null : acceptedChoice});
    }
}
function normalizeChoices(choices: readonly TuiOverlayChoice[]): readonly TuiOverlayChoice[] {
    const unique = [...new Set(choices)];
    if (!unique.includes('cancel') && !unique.includes('close')) unique.push('cancel');
    return Object.freeze(unique);
}

export type TuiOverlayErrorCode = 'OVERLAY_REQUEST_INVALID' | 'OVERLAY_ACTION_INVALID' | 'OVERLAY_INTENT_INVALID';
export class TuiOverlayError extends Error { constructor(readonly code: TuiOverlayErrorCode) { super(code); this.name = 'TuiOverlayError'; } }
const CHOICES: readonly TuiOverlayChoice[] = ['confirm', 'cancel', 'retry', 'close', 'copy', 'open'];
const KINDS: readonly TuiOverlayKind[] = ['command-palette', 'picker', 'help', 'confirmation', 'diagnostics', 'details'];
function parseRequest(value: unknown, registry: TuiActionRegistry): TuiOverlayRequest {
    if (!isRecord(value) || !onlyKeys(value, ['kind', 'title', 'reasonCode', 'body', 'choices', 'focusedChoice', 'action'])
        || !KINDS.includes(value.kind as TuiOverlayKind) || !boundedText(value.title, 256) || !/^[A-Z][A-Z0-9_.-]{0,79}$/u.test(value.reasonCode as string)
        || !Array.isArray(value.body) || value.body.length > 128 || !value.body.every((line) => boundedText(line, 512)) || !Array.isArray(value.choices)
        || value.choices.length === 0 || value.choices.some((choice) => !CHOICES.includes(choice as TuiOverlayChoice))
        || new Set(value.choices).size !== value.choices.length || !Number.isInteger(value.focusedChoice)
        || (value.focusedChoice as number) < 0 || (value.focusedChoice as number) >= value.choices.length) throw new TuiOverlayError('OVERLAY_REQUEST_INVALID');
    if (value.action !== undefined && !validAction(value.action, registry)) throw new TuiOverlayError('OVERLAY_ACTION_INVALID');
    return Object.freeze({...value, body: Object.freeze([...(value.body as string[])]), choices: Object.freeze([...(value.choices as TuiOverlayChoice[])])}) as TuiOverlayRequest;
}
function parseIntent(value: unknown): TuiOverlayIntent {
    if (!isRecord(value) || !onlyKeys(value, ['type', 'choice', 'query']) || typeof value.type !== 'string') throw new TuiOverlayError('OVERLAY_INTENT_INVALID');
    if (value.type === 'next' || value.type === 'previous' || value.type === 'close') {
        if (Object.keys(value).length !== 1) throw new TuiOverlayError('OVERLAY_INTENT_INVALID');
        return Object.freeze({type: value.type}) as TuiOverlayIntent;
    }
    if (value.type === 'choose' && Object.keys(value).length === 2 && CHOICES.includes(value.choice as TuiOverlayChoice)) return Object.freeze({type: 'choose', choice: value.choice as TuiOverlayChoice});
    if (value.type === 'search' && Object.keys(value).length === 2 && characterBoundedText(value.query, 256)) return Object.freeze({type: 'search', query: value.query as string});
    throw new TuiOverlayError('OVERLAY_INTENT_INVALID');
}
function validAction(value: unknown, registry: TuiActionRegistry): value is TuiActionIntent {
    return isRecord(value) && onlyKeys(value, ['actionId', 'arguments']) && boundedText(value.actionId, 128) && isStringRecord(value.arguments)
        && Object.values(value.arguments).every((item) => boundedText(item, 256)) && validRegistryIntent(value.actionId, value.arguments, registry);
}
function validRegistryIntent(actionId: string, arguments_: Readonly<Record<string, string>>, registry: TuiActionRegistry): boolean { try { registry.intent(actionId, arguments_); return true; } catch { return false; } }
function boundedText(value: unknown, maxBytes: number): value is string { return typeof value === 'string' && value.length > 0 && new TextEncoder().encode(value).byteLength <= maxBytes; }
function characterBoundedText(value: unknown, maxCharacters: number): value is string { return typeof value === 'string' && value.length > 0 && [...value].length <= maxCharacters; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
function isStringRecord(value: unknown): value is Readonly<Record<string, string>> { return isRecord(value) && Object.values(value).every((item) => typeof item === 'string'); }
function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).every((key) => keys.includes(key)); }
