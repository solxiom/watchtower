import type {JsonValue} from './types.js';

export const TUI_INSPECTOR_VIEW_IDS = Object.freeze([
    'sessions', 'lane', 'batches', 'agents', 'budgets', 'holds', 'proposals', 'events', 'context'
] as const);
export type TuiInspectorViewId = typeof TUI_INSPECTOR_VIEW_IDS[number];
export type TuiInspectorState = 'loading' | 'empty' | 'ready' | 'stale' | 'truncated' | 'unavailable' | 'error';

export interface TuiInspectorQueryRequest {
    readonly laneId: string;
    readonly operatorSessionId: string | null;
    readonly view: TuiInspectorViewId;
    readonly limit: number;
    readonly cursor: string | null;
    readonly filter: string | null;
}
export interface TuiInspectorField { readonly label: string; readonly value: JsonValue; readonly sensitive: false; }
export interface TuiInspectorRow { readonly id: string; readonly title: string; readonly fields: readonly TuiInspectorField[]; readonly selectable: boolean; }
export interface TuiInspectorPage {
    readonly schemaVersion: 1;
    readonly view: TuiInspectorViewId;
    readonly state: TuiInspectorState;
    readonly rows: readonly TuiInspectorRow[];
    readonly revision: string;
    readonly stale: boolean;
    readonly truncated: boolean;
    readonly nextCursor: string | null;
    readonly limit: number;
    readonly reasonCode: string | null;
}
export interface TuiInspectorViewDescriptor { readonly id: TuiInspectorViewId; readonly title: string; readonly emptyLabel: string; readonly supportsSelection: boolean; }
export interface TuiInspectorViewModel extends TuiInspectorViewDescriptor {
    readonly state: TuiInspectorState;
    readonly rows: readonly TuiInspectorRow[];
    readonly revision: string;
    readonly truncated: boolean;
    readonly nextCursor: string | null;
    readonly reasonCode: string | null;
}
export interface TuiInspectorQueryPort { query(request: TuiInspectorQueryRequest, signal: AbortSignal): Promise<unknown>; }

export interface TuiAgentProjection {
    readonly alias: string;
    readonly adapter: string;
    readonly accountAlias: string | null;
    readonly modelProfile: string;
    readonly compatibilityTier: string;
    readonly chargingClass: string;
    readonly telemetryQuality: 'reported' | 'estimated' | 'unknown';
    readonly evidenceAge: string | null;
    readonly snapshotAge: string | null;
    readonly availability: 'available' | 'unavailable' | 'unknown';
    readonly reservation: string | null;
    readonly assignment: string | null;
    readonly healthReason: string | null;
    readonly lastSuccessfulCheck: string | null;
}
export interface TuiAgentProjectionPage {
    readonly state: Exclude<TuiInspectorState, 'loading'>;
    readonly items: readonly TuiAgentProjection[];
    readonly revision: string;
    readonly stale: boolean;
    readonly truncated: boolean;
    readonly nextCursor: string | null;
    readonly reasonCode: string | null;
}

export interface TuiSearchRequest { readonly query: string; readonly scope: TuiSearchScope; readonly limit?: number; readonly cursor?: string | null; }
export type TuiSearchScope = 'timeline' | 'sessions' | 'events' | 'batches' | 'findings' | 'holds' | 'proposals' | 'actions' | 'history';
export interface TuiSearchResult { readonly id: string; readonly title: string; readonly excerpt: string; readonly scope: TuiSearchScope; readonly revision: string; readonly stale: boolean; }
export interface TuiSearchPage { readonly items: readonly TuiSearchResult[]; readonly revision: string; readonly stale: boolean; readonly truncated: boolean; readonly nextCursor: string | null; readonly examined: number; }
export interface TuiSearchPort { search(request: TuiSearchRequest, signal: AbortSignal): Promise<unknown>; }
export interface TuiSearchLimits {
    readonly maxQueryCharacters: number;
    readonly maxQueryBytes: number;
    readonly maxResults: number;
    readonly maxCandidates: number;
    readonly maxExcerptBytes: number;
    readonly maxHistoryEntries: number;
}
export const TUI_SEARCH_LIMITS: TuiSearchLimits = Object.freeze({maxQueryCharacters: 256, maxQueryBytes: 256, maxResults: 25, maxCandidates: 100, maxExcerptBytes: 512, maxHistoryEntries: 200});
export const TUI_ATTENTION_MAX_ITEMS = 50;

export interface TuiAttentionNavigatorState {
    readonly items: readonly {readonly priority: 'P1' | 'P2' | 'P3' | 'P4'; readonly sequence: number; readonly eventId: string; readonly label: string; readonly stealsFocus: false}[];
    readonly selectedIndex: number;
}
