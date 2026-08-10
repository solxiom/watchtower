import type {TuiActionContext, TuiActionResolution} from '../../contracts/tuiShell.js';
import type {TuiActionIntent} from '../../contracts/tuiActions.js';
import type {TuiOverlayChoice, TuiOverlayRequest} from '../../contracts/tuiOverlay.js';
import {TUI_SEARCH_LIMITS} from '../../contracts/tuiInspector.js';
import {TuiActionRegistry} from './TuiActionRegistry.js';

export interface TuiPaletteResult { readonly items: readonly TuiActionResolution[]; readonly query: string; readonly truncated: boolean; readonly reasonCode: string | null; }
export type TuiPaletteErrorCode = 'PALETTE_QUERY_INVALID';
export class TuiPaletteError extends Error { constructor(readonly code: TuiPaletteErrorCode) { super(code); this.name = 'TuiPaletteError'; } }
export class TuiCommandPalette {
    private readonly history: string[] = [];
    private readonly historyLimit: number;
    constructor(private readonly registry: TuiActionRegistry, historyLimit = TUI_SEARCH_LIMITS.maxHistoryEntries) { this.historyLimit = normalizeHistoryLimit(historyLimit); }
    open(context: TuiActionContext): TuiOverlayRequest {
        return Object.freeze({kind: 'command-palette', title: 'Command palette', reasonCode: 'PALETTE_OPEN', choices: Object.freeze(['open', 'cancel'] as const satisfies readonly TuiOverlayChoice[]), focusedChoice: 0, ...this.resultBody('', context)});
    }
    search(query: unknown, context: TuiActionContext): TuiPaletteResult {
        if (typeof query !== 'string') throw new TuiPaletteError('PALETTE_QUERY_INVALID');
        if ([...query].length > TUI_SEARCH_LIMITS.maxQueryCharacters) return Object.freeze({items: [], query, truncated: false, reasonCode: 'SEARCH_QUERY_TOO_LONG'});
        const items = this.registry.search(query, context, TUI_SEARCH_LIMITS.maxResults);
        return Object.freeze({items, query, truncated: this.registry.search(query, context, 25).length >= TUI_SEARCH_LIMITS.maxResults, reasonCode: null});
    }
    select(actionId: string, arguments_: Readonly<Record<string, string>> = {}): TuiActionIntent {
        const intent = this.registry.intent(actionId, arguments_);
        this.history.push(actionId);
        while (this.history.length > this.historyLimit) this.history.shift();
        return intent;
    }
    recent(): readonly string[] { return Object.freeze([...this.history].reverse()); }
    private resultBody(query: string, context: TuiActionContext): {readonly body: readonly string[]} {
        const result = this.search(query, context);
        return {body: Object.freeze(result.items.map((item) => `${item.available ? '  ' : '× '} ${item.label} · ${item.mutation}${item.reason ? ` · ${item.reason}` : ''}`))};
    }
}
function normalizeHistoryLimit(value: number): number {
    return Number.isInteger(value) && Number.isFinite(value) && value >= 0 ? Math.min(value, TUI_SEARCH_LIMITS.maxHistoryEntries) : TUI_SEARCH_LIMITS.maxHistoryEntries;
}
