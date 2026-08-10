import {
    boundedExcerpt, boundedLimit, CONVERSATION_LIMITS, ConversationError, type ConversationItem, type ConversationItemViewModel,
    type ConversationPage, type ConversationPageDirection, type ConversationPagePort, type ConversationWindowState,
    type TerminalTextSanitizer, type TimelineSearchHit, type TimelineSearchPage
} from '../../contracts/tuiConversation.js';
import {presentProposalBlock} from './ProposalBlock.js';
import {presentProvisionalBlock, presentTombstoneBlock, presentTurnBlock} from './TurnBlock.js';
import {TimelineWindow} from './TimelineWindow.js';

export interface ConversationViewportOptions {
    readonly operatorSessionId: string; readonly port: ConversationPagePort; readonly sanitizer: TerminalTextSanitizer;
    readonly rows: number; readonly pageSize?: number; readonly clock?: () => number;
}

/**
 * The conversation timeline front door: it drives bidirectional bounded paging
 * through the single `ConversationPagePort`, validates every returned page into
 * the closed contract before it reaches the window, presents retained items
 * through the typed blocks, and answers index-only timeline search. It owns no
 * journal, SQLite, filesystem, or provider access and invokes no model.
 */
export class ConversationViewport {
    private readonly window: TimelineWindow;
    private readonly pageSize: number;
    private readonly clock: () => number;
    private cursors: {older: string | null; newer: string | null} = {older: null, newer: null};

    constructor(private readonly options: ConversationViewportOptions) {
        this.window = new TimelineWindow(options.rows);
        this.pageSize = boundedLimit(options.pageSize ?? CONVERSATION_LIMITS.defaultPageSize, CONVERSATION_LIMITS.maxPageSize, 1);
        this.clock = options.clock ?? (() => Date.now());
    }

    /** Every page carries both edge flags and both direction cursors, so an initial live page stays live. */
    async loadInitial(signal: AbortSignal): Promise<ConversationWindowState> {
        return this.apply(await this.fetch('older', null, signal));
    }

    /** Pages further back; a viewport already at the oldest edge performs no read. */
    async pageOlder(signal: AbortSignal): Promise<ConversationWindowState> {
        if (this.window.state().atOldestEdge) return this.window.state();
        return this.apply(await this.fetch('older', this.cursors.older, signal));
    }

    /** Pages toward the live edge; a viewport already at the live edge performs no read. */
    async pageNewer(signal: AbortSignal): Promise<ConversationWindowState> {
        if (this.window.state().atLiveEdge) return this.window.state();
        return this.apply(await this.fetch('newer', this.cursors.newer, signal));
    }

    private apply(page: ConversationPage): ConversationWindowState {
        this.cursors = {older: page.olderCursor, newer: page.newerCursor};
        return this.window.reduce({type: 'load', page});
    }

    resize(rows: number): ConversationWindowState { return this.window.reduce({type: 'viewport', rows}); }
    scroll(delta: number): ConversationWindowState { return this.window.reduce({type: 'scroll', delta}); }
    anchorOn(itemId: string): ConversationWindowState { return this.window.reduce({type: 'anchor', itemId}); }
    state(): ConversationWindowState { return this.window.state(); }

    visible(): readonly ConversationItemViewModel[] {
        return Object.freeze(this.window.visible().map((item) => this.present(item)));
    }

    /**
     * Search over the validated paged timeline index only: finite query length,
     * candidates, results, excerpt bytes, and local time budget, with a
     * continuation cursor instead of a hidden scan. It never reads a raw
     * journal, never falls back to the full pack, and never invokes a model.
     */
    async search(query: string, signal: AbortSignal, cursor: string | null = null): Promise<TimelineSearchPage> {
        const needle = query.trim().toLowerCase();
        if (needle.length === 0 || [...query].length > CONVERSATION_LIMITS.maxQueryCharacters) {
            throw new ConversationError('SEARCH_QUERY_INVALID', query.slice(0, 32), `Use 1-${CONVERSATION_LIMITS.maxQueryCharacters} characters.`);
        }
        const started = this.clock();
        const hits: TimelineSearchHit[] = [];
        let examined = 0;
        let next = cursor;
        let revision = this.window.state().revision;
        for (;;) {
            const page = await this.fetch('older', next, signal, false);
            revision = page.revision;
            for (const item of page.items) {
                examined += 1;
                const hit = matchHit(item, needle);
                if (hit) hits.push(hit);
                if (hits.length >= CONVERSATION_LIMITS.maxSearchResults || examined >= CONVERSATION_LIMITS.maxSearchCandidates) break;
            }
            next = page.olderCursor;
            const exhausted = hits.length >= CONVERSATION_LIMITS.maxSearchResults || examined >= CONVERSATION_LIMITS.maxSearchCandidates
                || this.clock() - started >= CONVERSATION_LIMITS.searchBudgetMs;
            if (exhausted || page.atOldestEdge || next === null) {
                return Object.freeze({
                    hits: Object.freeze(hits), scope: 'session-timeline-index', revision,
                    stale: revision !== this.window.state().revision, truncated: exhausted && !page.atOldestEdge,
                    nextCursor: exhausted && !page.atOldestEdge ? next : null, examined, usedModel: false
                });
            }
        }
    }

    private present(item: ConversationItem): ConversationItemViewModel {
        if (item.kind === 'turn') return presentTurnBlock(item, this.options.sanitizer);
        if (item.kind === 'proposal') return presentProposalBlock(item, this.options.sanitizer);
        if (item.kind === 'tombstone') return presentTombstoneBlock(item);
        return presentProvisionalBlock(item, this.options.sanitizer);
    }

    private async fetch(direction: ConversationPageDirection, cursor: string | null, signal: AbortSignal, apply = true): Promise<ConversationPage> {
        if (signal.aborted) throw new ConversationError('SEARCH_CANCELLED', this.options.operatorSessionId, 'The read was cancelled before it started.');
        const page: unknown = await this.options.port.page({operatorSessionId: this.options.operatorSessionId, direction, cursor, pageSize: this.pageSize}, signal);
        if (signal.aborted) throw new ConversationError('SEARCH_CANCELLED', this.options.operatorSessionId, 'The read was cancelled while it was in flight.');
        return validatePage(page, direction, this.pageSize, apply ? this.window.state().revision : 0);
    }
}

/**
 * Every predecessor page is `unknown` until every field validates into the closed
 * contract. Nothing is dereferenced before its shape is proved, so a malformed
 * page raises the stable typed reason instead of a `TypeError`, and a rejected
 * page changes no retained state.
 */
function validatePage(value: unknown, direction: ConversationPageDirection, pageSize: number, minimumRevision: number): ConversationPage {
    const invalid = (detail: string): never => { throw new ConversationError('CONVERSATION_PAGE_INVALID', direction, detail); };
    if (!isRecord(value) || !Array.isArray(value.items)) return invalid('The page is not a structured page envelope with an item array.');
    if (value.direction !== direction || value.pageSize !== pageSize || value.items.length > pageSize) return invalid('The page violates its declared direction or size contract.');
    if (typeof value.truncated !== 'boolean' || typeof value.atOldestEdge !== 'boolean' || typeof value.atLiveEdge !== 'boolean') return invalid('The page is missing a required boundary flag.');
    if (!Number.isInteger(value.revision) || (value.revision as number) < 0) return invalid('The page revision is not a non-negative integer.');
    if (!isCursor(value.olderCursor) || !isCursor(value.newerCursor)) {
        throw new ConversationError('CONVERSATION_CURSOR_INVALID', direction, 'A continuation cursor is a non-empty string or null.');
    }
    const items = value.items as readonly unknown[];
    if (!items.every(isConversationItem)) return invalid('The page carries an item that is not a typed conversation item.');
    const typed = items as readonly ConversationItem[];
    if (new Set(typed.map((item) => item.itemId)).size !== typed.length) return invalid('The page repeats an item identity.');
    if ((value.revision as number) < minimumRevision) throw new ConversationError('CONVERSATION_REVISION_STALE', direction, 'The page is older than the retained timeline revision.');
    return Object.freeze({...(value as unknown as ConversationPage), items: Object.freeze([...typed])});
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function isCursor(value: unknown): boolean { return value === null || (typeof value === 'string' && value.length > 0); }
function isText(value: unknown): boolean { return typeof value === 'string' && value.length > 0; }
function isCount(value: unknown): boolean { return Number.isInteger(value) && (value as number) >= 0; }
function isOptional(value: unknown, allowed: readonly unknown[]): boolean { return value === null || allowed.includes(value); }
function isOptionalCount(value: unknown): boolean { return value === null || isCount(value); }

/** Field-level validation of one timeline item, including its routing, budget, and staleness metadata. */
function isConversationItem(value: unknown): value is ConversationItem {
    if (!isRecord(value) || !isText(value.itemId) || !isCount(value.sequence)) return false;
    if (value.kind === 'turn') {
        return isText(value.turnId) && isText(value.operatorSessionId) && (value.role === 'operator' || value.role === 'watchtower')
            && TURN_STATES.includes(value.state) && isOptional(value.decisionClass, DECISION_CLASSES)
            && (value.routingRuleId === null || isText(value.routingRuleId))
            && (value.endpointId === null || isText(value.endpointId)) && isOptionalCount(value.snapshotRevision)
            && isOptionalCount(value.inputTokens) && isOptionalCount(value.outputTokens)
            && typeof value.stale === 'boolean' && (value.completedAt === null || isText(value.completedAt))
            && typeof value.excerpt === 'string' && isCount(value.excerptBytes) && isCount(value.originalBytes)
            && typeof value.incomplete === 'boolean' && TELEMETRY_QUALITIES.includes(value.telemetryQuality);
    }
    if (value.kind === 'proposal') {
        return isText(value.proposalId) && isText(value.proposalType) && isText(value.state) && isText(value.sourceTurnId)
            && isText(value.createdAt) && isText(value.expiresAt) && typeof value.terminal === 'boolean';
    }
    if (value.kind === 'tombstone') return isCount(value.removedTurns) && (value.reason === 'compaction' || value.reason === 'privacy-purge');
    return value.kind === 'provisional' && typeof value.label === 'string' && value.validated === false;
}

const TURN_STATES: readonly unknown[] = Object.freeze(['running', 'complete', 'interrupted', 'failed', 'cancelled']);
const DECISION_CLASSES: readonly unknown[] = Object.freeze(['M0', 'D1', 'D2', 'D3']);
const TELEMETRY_QUALITIES: readonly unknown[] = Object.freeze(['reported', 'estimated', 'unavailable']);

function matchHit(item: ConversationItem, needle: string): TimelineSearchHit | null {
    const text = item.kind === 'turn' ? item.excerpt : item.kind === 'proposal' ? `${item.proposalType} ${item.state}` : '';
    if (!text.toLowerCase().includes(needle)) return null;
    const excerpt = boundedExcerpt(text, CONVERSATION_LIMITS.maxExcerptBytes);
    return Object.freeze({itemId: item.itemId, sequence: item.sequence, excerpt: excerpt.excerpt, excerptBytes: excerpt.bytes, truncated: excerpt.truncated});
}
