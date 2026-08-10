import type {ConfirmedTuiAction, TuiAcceptedActionPort, TuiActionExecutionContext, TuiActionIntent, TuiActionPreview, TuiActionResult} from '../../contracts/tuiActions.js';
import type {TuiFocusTarget, TuiMutationClass} from '../../contracts/tuiShell.js';
import {TuiActionRegistry} from './TuiActionRegistry.js';

export type TuiDispatchErrorCode = 'unknown-action' | 'observer-ineligible' | 'focus-unavailable' | 'confirmation-required' | 'stale-preview' | 'missing-confirmation-token' | 'invalid-intent' | 'invalid-preview' | 'invalid-result' | 'replayed-confirmation';
export class TuiDispatchError extends Error { constructor(readonly code: TuiDispatchErrorCode) { super(code); this.name = 'TuiDispatchError'; } }
export class TuiActionDispatcher {
    private readonly confirmedTokens = new Set<string>();
    private readonly consumedTokens = new Set<string>();
    constructor(private readonly registry: TuiActionRegistry, private readonly port: TuiAcceptedActionPort) {}
    async preview(input: unknown, contextInput: unknown): Promise<TuiActionPreview> {
        const context = parseContext(contextInput);
        const intent = this.parseIntent(input);
        const descriptor = this.registry.descriptor(intent.actionId);
        if (!descriptor) return refusedPreview(intent, 'unknown-action', context.stateRevision);
        if (context.observer && !descriptor.observerEligible) return refusedPreview(intent, 'observer-ineligible', context.stateRevision);
        if (!descriptor.focusScope.includes(context.focus)) return refusedPreview(intent, 'focus-unavailable', context.stateRevision);
        return parsePreview(await this.port.preview(intent, context), this.registry);
    }
    confirm(input: unknown, sessionId: string, currentStateRevision: string): ConfirmedTuiAction {
        const preview = parsePreview(input, this.registry);
        if (!preview.available) throw new TuiDispatchError((preview.reason as TuiDispatchErrorCode | null) ?? 'focus-unavailable');
        if (preview.currentStateRevision !== currentStateRevision) throw new TuiDispatchError('stale-preview');
        if (!preview.requiresConfirmation) throw new TuiDispatchError('confirmation-required');
        if (!preview.confirmationToken || typeof sessionId !== 'string' || sessionId.length === 0) throw new TuiDispatchError('missing-confirmation-token');
        if (this.confirmedTokens.has(preview.confirmationToken) || this.consumedTokens.has(preview.confirmationToken)) throw new TuiDispatchError('replayed-confirmation');
        this.confirmedTokens.add(preview.confirmationToken);
        return Object.freeze({intent: preview.intent, confirmationToken: preview.confirmationToken, confirmedBySessionId: sessionId});
    }
    async dispatch(input: unknown): Promise<TuiActionResult> {
        const confirmed = parseConfirmed(input, this.registry);
        if (!this.confirmedTokens.has(confirmed.confirmationToken) || this.consumedTokens.has(confirmed.confirmationToken)) throw new TuiDispatchError('replayed-confirmation');
        this.consumedTokens.add(confirmed.confirmationToken);
        return parseResult(await this.port.dispatch(confirmed), confirmed.intent.actionId);
    }
    private parseIntent(input: unknown): TuiActionIntent {
        if (!isRecord(input) || !onlyKeys(input, ['actionId', 'arguments']) || typeof input.actionId !== 'string' || !isStringRecord(input.arguments)) throw new TuiDispatchError('invalid-intent');
        try { return this.registry.intent(input.actionId, input.arguments); } catch { throw new TuiDispatchError('invalid-intent'); }
    }
}
function refusedPreview(intent: TuiActionIntent, reason: string, revision: string): TuiActionPreview { return Object.freeze({intent, mutation: 'read', requiresConfirmation: false, available: false, reason, currentStateRevision: revision, confirmationToken: null}); }
function parsePreview(value: unknown, registry: TuiActionRegistry): TuiActionPreview {
    if (!isRecord(value) || !onlyKeys(value, ['intent', 'mutation', 'requiresConfirmation', 'available', 'reason', 'currentStateRevision', 'confirmationToken']) || !isRecord(value.intent)
        || typeof value.intent.actionId !== 'string' || !isStringRecord(value.intent.arguments)
        || !isMutation(value.mutation) || typeof value.requiresConfirmation !== 'boolean' || typeof value.available !== 'boolean'
        || (value.reason !== null && typeof value.reason !== 'string') || typeof value.currentStateRevision !== 'string' || value.currentStateRevision.length === 0
        || (value.confirmationToken !== null && typeof value.confirmationToken !== 'string') || (value.available && value.reason !== null)
        || (!value.available && value.confirmationToken !== null)) throw new TuiDispatchError('invalid-preview');
    let intent: TuiActionIntent;
    try { intent = registry.intent(value.intent.actionId, value.intent.arguments); } catch { throw new TuiDispatchError('invalid-preview'); }
    return Object.freeze({intent, mutation: value.mutation, requiresConfirmation: value.requiresConfirmation, available: value.available, reason: value.reason, currentStateRevision: value.currentStateRevision, confirmationToken: value.confirmationToken});
}
function parseConfirmed(value: unknown, registry: TuiActionRegistry): ConfirmedTuiAction {
    if (!isRecord(value) || !onlyKeys(value, ['intent', 'confirmationToken', 'confirmedBySessionId']) || !isRecord(value.intent) || typeof value.intent.actionId !== 'string'
        || !isStringRecord(value.intent.arguments) || typeof value.confirmationToken !== 'string'
        || value.confirmationToken.length === 0 || typeof value.confirmedBySessionId !== 'string' || value.confirmedBySessionId.length === 0) throw new TuiDispatchError('invalid-intent');
    try { return Object.freeze({intent: registry.intent(value.intent.actionId, value.intent.arguments), confirmationToken: value.confirmationToken, confirmedBySessionId: value.confirmedBySessionId}); } catch { throw new TuiDispatchError('invalid-intent'); }
}
function parseResult(value: unknown, expectedActionId: string): TuiActionResult {
    if (!isRecord(value) || !onlyKeys(value, ['status', 'actionId', 'reason', 'data']) || !isStatus(value.status)
        || typeof value.actionId !== 'string' || value.actionId.length === 0 || value.actionId !== expectedActionId
        || (value.reason !== null && typeof value.reason !== 'string') || (value.data !== null && (!isRecord(value.data) || !Object.values(value.data).every(isJsonValue)))) throw new TuiDispatchError('invalid-result');
    return Object.freeze({status: value.status, actionId: value.actionId, reason: value.reason, data: value.data});
}
function isMutation(value: unknown): value is TuiMutationClass { return value === 'read' || value === 'advisory' || value === 'effect'; }
function parseContext(value: unknown): TuiActionExecutionContext {
    if (!isRecord(value) || !onlyKeys(value, ['focus', 'observer', 'overlayOpen', 'stateRevision', 'sessionId']) || !isFocus(value.focus)
        || typeof value.observer !== 'boolean' || typeof value.overlayOpen !== 'boolean' || typeof value.stateRevision !== 'string' || value.stateRevision.length === 0
        || typeof value.sessionId !== 'string' || value.sessionId.length === 0) throw new TuiDispatchError('invalid-intent');
    return Object.freeze({focus: value.focus, observer: value.observer, overlayOpen: value.overlayOpen, stateRevision: value.stateRevision, sessionId: value.sessionId});
}
function isJsonValue(value: unknown): boolean {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return value.every(isJsonValue);
    return isRecord(value) && Object.values(value).every(isJsonValue);
}
function isStatus(value: unknown): value is TuiActionResult['status'] { return value === 'read' || value === 'advisory' || value === 'effect' || value === 'refused'; }
function isFocus(value: unknown): value is TuiFocusTarget { return value === 'conversation' || value === 'composer' || value === 'inspector' || value === 'overlay'; }
function isStringRecord(value: unknown): value is Readonly<Record<string, string>> { return isRecord(value) && Object.values(value).every((item) => typeof item === 'string'); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key)); }
