import type {TuiAgentProjection, TuiAgentProjectionPage, TuiInspectorPage, TuiInspectorRow, TuiInspectorState} from '../../contracts/tuiInspector.js';

const FIELDS: readonly (keyof TuiAgentProjection)[] = Object.freeze([
    'adapter', 'accountAlias', 'modelProfile', 'compatibilityTier', 'chargingClass', 'telemetryQuality',
    'evidenceAge', 'snapshotAge', 'availability', 'reservation', 'assignment', 'healthReason', 'lastSuccessfulCheck'
]);
const PAGE_KEYS = Object.freeze(['state', 'items', 'revision', 'stale', 'truncated', 'nextCursor', 'reasonCode']);
const ITEM_KEYS = Object.freeze(['alias', ...FIELDS]);
export type TuiAgentProjectionErrorCode = 'AGENT_PROJECTION_PAGE_INVALID' | 'AGENT_PROJECTION_ITEM_INVALID';
export class TuiAgentProjectionError extends Error { constructor(readonly code: TuiAgentProjectionErrorCode) { super(code); this.name = 'TuiAgentProjectionError'; } }

export class TuiAgentProjectionPresenter {
    present(value: unknown): TuiInspectorPage {
        const page = parsePage(value);
        const rows = Object.freeze(page.items.map((item) => row(item)));
        const state = page.stale && page.state === 'ready' ? 'stale' : page.truncated && page.state === 'ready' ? 'truncated' : page.state;
        return Object.freeze({schemaVersion: 1, view: 'agents', state, rows, revision: page.revision, stale: page.stale, truncated: page.truncated, nextCursor: page.nextCursor, limit: rows.length, reasonCode: page.reasonCode});
    }
}
function row(item: TuiAgentProjection): TuiInspectorRow {
    return Object.freeze({id: item.alias, title: item.alias, selectable: true, fields: Object.freeze(FIELDS.map((label) => Object.freeze({label, value: item[label], sensitive: false as const}))) });
}
function parsePage(value: unknown): TuiAgentProjectionPage {
    if (!isRecord(value) || !onlyKeys(value, PAGE_KEYS)) throw new TuiAgentProjectionError('AGENT_PROJECTION_PAGE_INVALID');
    const items = value.items;
    if (!isProjectionList(items)) throw new TuiAgentProjectionError('AGENT_PROJECTION_ITEM_INVALID');
    if (!isState(value.state) || typeof value.revision !== 'string' || value.revision.length === 0 || value.revision.length > 256
        || typeof value.stale !== 'boolean' || typeof value.truncated !== 'boolean' || !isCursor(value.nextCursor) || !isReason(value.reasonCode)
        || items.length > 50 || new Set(items.map((item) => item.alias)).size !== items.length || (value.state === 'empty' && items.length !== 0)
        || (value.stale && value.state !== 'ready' && value.state !== 'stale') || (value.truncated && value.state !== 'ready' && value.state !== 'truncated')
        || (value.truncated ? value.nextCursor === null : value.nextCursor !== null)) throw new TuiAgentProjectionError('AGENT_PROJECTION_PAGE_INVALID');
    return Object.freeze({state: value.state, items: Object.freeze([...items]), revision: value.revision, stale: value.stale, truncated: value.truncated, nextCursor: value.nextCursor, reasonCode: value.reasonCode});
}
function isProjectionList(value: unknown): value is readonly TuiAgentProjection[] { return Array.isArray(value) && value.every(validateAgentProjection); }
export function validateAgentProjection(value: unknown): value is TuiAgentProjection {
    if (!isRecord(value) || !onlyKeys(value, ITEM_KEYS) || !boundedString(value.alias)) return false;
    return FIELDS.every((key) => key === 'telemetryQuality' ? validTelemetry(value[key]) : key === 'availability' ? validAvailability(value[key]) : value[key] === null || boundedString(value[key]));
}
function validTelemetry(value: unknown): value is TuiAgentProjection['telemetryQuality'] { return value === 'reported' || value === 'estimated' || value === 'unknown'; }
function validAvailability(value: unknown): value is TuiAgentProjection['availability'] { return value === 'available' || value === 'unavailable' || value === 'unknown'; }
function isState(value: unknown): value is Exclude<TuiInspectorState, 'loading'> { return value === 'empty' || value === 'ready' || value === 'stale' || value === 'truncated' || value === 'unavailable' || value === 'error'; }
function isCursor(value: unknown): value is string | null { return value === null || boundedString(value); }
function isReason(value: unknown): value is string | null { return value === null || (typeof value === 'string' && /^[A-Z][A-Z0-9_.-]{0,79}$/u.test(value)); }
function boundedString(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 256; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key)); }
