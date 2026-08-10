import {TUI_SEARCH_LIMITS, type TuiSearchLimits, type TuiSearchPage, type TuiSearchPort, type TuiSearchRequest, type TuiSearchResult, type TuiSearchScope} from '../../contracts/tuiInspector.js';

export type TuiSearchErrorCode = 'SEARCH_REQUEST_INVALID' | 'SEARCH_QUERY_TOO_LONG' | 'SEARCH_LIMIT_INVALID' | 'SEARCH_CANDIDATE_LIMIT_EXCEEDED' | 'SEARCH_RESULT_INVALID' | 'SEARCH_PAGE_INVALID';
export class TuiSearchError extends Error { constructor(readonly code: TuiSearchErrorCode) { super(code); this.name = 'TuiSearchError'; } }
export class TuiBoundedSearch {
    private readonly limits: TuiSearchLimits;
    constructor(private readonly port: TuiSearchPort, limits: TuiSearchLimits = TUI_SEARCH_LIMITS) { this.limits = normalizeLimits(limits); }
    async search(input: unknown, signal: AbortSignal): Promise<TuiSearchPage> {
        const request = parseRequest(input);
        if ([...request.query].length > this.limits.maxQueryCharacters) throw new TuiSearchError('SEARCH_QUERY_TOO_LONG');
        const limit = request.limit ?? this.limits.maxResults;
        if (!Number.isInteger(limit) || limit < 1 || limit > this.limits.maxResults) throw new TuiSearchError('SEARCH_LIMIT_INVALID');
        const page = parsePage(await this.port.search({...request, limit}, signal), request.scope, limit, this.limits.maxExcerptBytes);
        if (page.examined > this.limits.maxCandidates) throw new TuiSearchError('SEARCH_CANDIDATE_LIMIT_EXCEEDED');
        if (page.items.length > limit || page.items.some((item) => !validResult(item, request.scope, this.limits.maxExcerptBytes)) || new Set(page.items.map((item) => item.id)).size !== page.items.length) throw new TuiSearchError('SEARCH_RESULT_INVALID');
        return Object.freeze({...page, items: Object.freeze(page.items.map((item) => Object.freeze({...item})))});
    }
}

function normalizeLimits(limits: TuiSearchLimits): TuiSearchLimits {
    return Object.freeze({
        maxQueryCharacters: normalizeLimit(limits.maxQueryCharacters, TUI_SEARCH_LIMITS.maxQueryCharacters),
        maxQueryBytes: normalizeLimit(limits.maxQueryBytes, TUI_SEARCH_LIMITS.maxQueryBytes),
        maxResults: normalizeLimit(limits.maxResults, TUI_SEARCH_LIMITS.maxResults, 1),
        maxCandidates: normalizeLimit(limits.maxCandidates, TUI_SEARCH_LIMITS.maxCandidates),
        maxExcerptBytes: normalizeLimit(limits.maxExcerptBytes, TUI_SEARCH_LIMITS.maxExcerptBytes),
        maxHistoryEntries: normalizeLimit(limits.maxHistoryEntries, TUI_SEARCH_LIMITS.maxHistoryEntries)
    });
}
function normalizeLimit(value: number, hardMax: number, minimum = 0): number {
    return Number.isInteger(value) && Number.isFinite(value) && value >= minimum ? Math.min(value, hardMax) : hardMax;
}

function parseRequest(value: unknown): TuiSearchRequest {
    if (!isRecord(value) || !onlyKeys(value, ['query', 'scope', 'limit', 'cursor']) || typeof value.query !== 'string' || !isScope(value.scope)
        || (value.limit !== undefined && !Number.isInteger(value.limit)) || (value.cursor !== undefined && !isCursor(value.cursor))) throw new TuiSearchError('SEARCH_REQUEST_INVALID');
    return Object.freeze({query: value.query, scope: value.scope, ...(value.limit === undefined ? {} : {limit: value.limit}), ...(value.cursor === undefined ? {} : {cursor: value.cursor})}) as TuiSearchRequest;
}
function parsePage(value: unknown, scope: TuiSearchScope, limit: number, maxExcerptBytes: number): TuiSearchPage {
    const examined = isRecord(value) && typeof value.examined === 'number' ? value.examined : -1;
    if (!isRecord(value) || !onlyKeys(value, ['items', 'revision', 'stale', 'truncated', 'nextCursor', 'examined']) || !Array.isArray(value.items)
        || typeof value.revision !== 'string' || value.revision.length === 0 || typeof value.stale !== 'boolean' || typeof value.truncated !== 'boolean'
        || !isCursor(value.nextCursor) || !Number.isInteger(examined) || examined < 0
        || (value.truncated ? value.nextCursor === null : value.nextCursor !== null)) throw new TuiSearchError('SEARCH_PAGE_INVALID');
    if (value.items.length > limit || !value.items.every((item) => validResult(item, scope, maxExcerptBytes))
        || new Set(value.items.map((item) => isRecord(item) ? item.id : null)).size !== value.items.length) throw new TuiSearchError('SEARCH_RESULT_INVALID');
    return Object.freeze({...value, items: Object.freeze(value.items.map((item) => Object.freeze({...item})))}) as TuiSearchPage;
}
function validResult(value: unknown, scope: TuiSearchScope, maxBytes: number): value is TuiSearchResult {
    return isRecord(value) && onlyKeys(value, ['id', 'title', 'excerpt', 'scope', 'revision', 'stale']) && nonEmpty(value.id) && nonEmpty(value.title)
        && typeof value.excerpt === 'string' && new TextEncoder().encode(value.excerpt).byteLength <= maxBytes && value.scope === scope
        && typeof value.revision === 'string' && value.revision.length > 0 && typeof value.stale === 'boolean';
}
function isScope(value: unknown): value is TuiSearchScope { return value === 'timeline' || value === 'sessions' || value === 'events' || value === 'batches' || value === 'findings' || value === 'holds' || value === 'proposals' || value === 'actions' || value === 'history'; }
function isCursor(value: unknown): value is string | null { return value === null || (typeof value === 'string' && value.length > 0); }
function nonEmpty(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 256; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).every((key) => keys.includes(key)); }
