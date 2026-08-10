import type {JsonValue} from '../../contracts/types.js';
import {TUI_INSPECTOR_VIEW_IDS, type TuiInspectorField, type TuiInspectorPage, type TuiInspectorQueryPort, type TuiInspectorQueryRequest, type TuiInspectorRow, type TuiInspectorState, type TuiInspectorViewId, type TuiInspectorViewModel} from '../../contracts/tuiInspector.js';
import {TuiInspectorRegistry} from './InspectorRegistry.js';

export interface TuiInspectorControllerOptions { readonly laneId: string; readonly operatorSessionId: string | null; readonly query: TuiInspectorQueryPort; readonly maxPageSize?: number; }
export type TuiInspectorErrorCode = 'INSPECTOR_PAGE_INVALID' | 'INSPECTOR_PAGE_MALFORMED';
export class TuiInspectorError extends Error { constructor(readonly code: TuiInspectorErrorCode) { super(code); this.name = 'TuiInspectorError'; } }
export class TuiInspectorController {
    private readonly registry = new TuiInspectorRegistry();
    private readonly maxPageSize: number;
    private viewId: TuiInspectorViewId = 'lane';
    private page: TuiInspectorPage;
    constructor(private readonly options: TuiInspectorControllerOptions) {
        this.maxPageSize = Math.min(50, Math.max(1, options.maxPageSize ?? 25));
        this.page = {...this.registry.empty(this.viewId), state: 'loading'};
    }
    current(): TuiInspectorViewModel { return this.registry.present(this.page); }
    select(view: TuiInspectorViewId): TuiInspectorViewModel { this.viewId = view; this.page = {...this.registry.empty(view), state: 'loading'}; return this.current(); }
    async load(signal: AbortSignal, filter: string | null = null, cursor: string | null = null): Promise<TuiInspectorViewModel> {
        const request: TuiInspectorQueryRequest = {laneId: this.options.laneId, operatorSessionId: this.options.operatorSessionId, view: this.viewId, limit: this.maxPageSize, cursor, filter};
        const page = await this.options.query.query(request, signal);
        this.page = normalizePage(page, this.viewId, this.maxPageSize);
        return this.current();
    }
}

function normalizePage(value: unknown, view: TuiInspectorViewId, limit: number): TuiInspectorPage {
    const page = parsePage(value);
    if (page.view !== view || page.limit > limit || page.rows.length > limit) throw new TuiInspectorError('INSPECTOR_PAGE_INVALID');
    if (page.stale && page.state === 'ready') return {...page, state: 'stale'};
    if (page.truncated && page.state === 'ready') return {...page, state: 'truncated'};
    return Object.freeze({...page, rows: Object.freeze([...page.rows])});
}
function emptyPage(view: TuiInspectorViewId): TuiInspectorPage { return {schemaVersion: 1, view, state: 'empty', rows: [], revision: 'unknown', stale: false, truncated: false, nextCursor: null, limit: 0, reasonCode: null}; }

function parsePage(value: unknown): TuiInspectorPage {
    const pageLimit = isRecord(value) && typeof value.limit === 'number' ? value.limit : -1;
    if (!isRecord(value) || !onlyKeys(value, ['schemaVersion', 'view', 'state', 'rows', 'revision', 'stale', 'truncated', 'nextCursor', 'limit', 'reasonCode'])
        || value.schemaVersion !== 1 || !isView(value.view) || !isState(value.state) || !Array.isArray(value.rows)
        || typeof value.revision !== 'string' || value.revision.length === 0 || typeof value.stale !== 'boolean'
        || typeof value.truncated !== 'boolean' || !isCursor(value.nextCursor) || !Number.isInteger(value.limit)
        || pageLimit < 0 || pageLimit > 50 || !isReason(value.reasonCode) || !value.rows.every(isRow)
        || new Set(value.rows.map((row) => row.id)).size !== value.rows.length || value.rows.length > pageLimit
        || (value.truncated ? value.nextCursor === null : value.nextCursor !== null)
        || (value.state === 'empty' && value.rows.length !== 0)
        || (value.stale && value.state !== 'ready' && value.state !== 'stale')
        || (value.truncated && value.state !== 'ready' && value.state !== 'truncated')) {
        throw new TuiInspectorError('INSPECTOR_PAGE_MALFORMED');
    }
    return Object.freeze({...value, rows: Object.freeze(value.rows.map((row) => Object.freeze({...row, fields: Object.freeze([...row.fields])})))}) as TuiInspectorPage;
}
function isRow(value: unknown): value is TuiInspectorRow {
    return isRecord(value) && onlyKeys(value, ['id', 'title', 'fields', 'selectable']) && nonEmpty(value.id) && typeof value.title === 'string'
        && Array.isArray(value.fields) && typeof value.selectable === 'boolean' && value.fields.every(isField)
        && new Set(value.fields.map((field) => field.label)).size === value.fields.length;
}
function isField(value: unknown): value is TuiInspectorField {
    return isRecord(value) && onlyKeys(value, ['label', 'value', 'sensitive']) && nonEmpty(value.label) && value.sensitive === false && isJsonValue(value.value);
}
function isJsonValue(value: unknown): value is JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return value.every(isJsonValue);
    return isRecord(value) && Object.values(value).every(isJsonValue);
}
function isView(value: unknown): value is TuiInspectorViewId { return typeof value === 'string' && (TUI_INSPECTOR_VIEW_IDS as readonly string[]).includes(value); }
function isState(value: unknown): value is TuiInspectorState { return value === 'loading' || value === 'empty' || value === 'ready' || value === 'stale' || value === 'truncated' || value === 'unavailable' || value === 'error'; }
function isCursor(value: unknown): value is string | null { return value === null || (typeof value === 'string' && value.length > 0); }
function isReason(value: unknown): value is string | null { return value === null || (typeof value === 'string' && /^[A-Z][A-Z0-9_.-]{0,79}$/u.test(value)); }
function nonEmpty(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 256; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key)); }
