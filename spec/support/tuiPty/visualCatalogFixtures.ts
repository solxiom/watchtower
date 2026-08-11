import {TUI_CATALOG_DIMENSIONS, type TuiCatalogDimension, type TuiVisualCatalogState} from '../../../src/contracts/tuiAccessibility.js';
import type {NirvanaTuiAdapter, TuiCapabilities} from '../../../src/contracts/tuiAdapter.js';
import type {TuiAttentionItem, TuiDisplayPreferences, TuiShellViewModel} from '../../../src/contracts/tuiShell.js';
import type {TuiActivityState} from '../../../src/presentation/tui/AccessibleTuiPresenter.js';
import {DEFAULT_TUI_PREFERENCES} from '../../../src/presentation/tui/TuiPreferences.js';
import {TuiApplication} from '../../../src/presentation/tui/TuiApplication.js';

/**
 * Builds one deterministic view model per `tui-operational-experience.md §11`
 * catalog state at a declared dimension. The fixtures are semantic: they carry
 * the preferences, attention, overlay, and activity that make the state
 * observable, so the conformance matrix can assert regions, ordering, labels,
 * keyboard reachability, and restoration rather than pixels.
 */
export interface CatalogCase { readonly preferences: TuiDisplayPreferences; readonly model: TuiShellViewModel; readonly activity: TuiActivityState; }

const capabilities: TuiCapabilities = {alternateScreen: true, rawInput: true, resize: true, unicodeWidth: true, color: 'truecolor', mouse: true, bracketedPaste: true, reducedMotion: false};
const adapter: NirvanaTuiAdapter = {capabilities: () => capabilities, open: () => { throw new Error('catalog fixtures never open a surface'); }};

const PREFERENCE_OVERRIDES: Partial<Record<TuiVisualCatalogState, Partial<TuiDisplayPreferences>>> = {
    'no-color': {noColor: true}, 'high-contrast': {highContrast: true}, 'reduced-motion': {reducedMotion: true},
    'accessible-append-only': {accessible: true, reducedMotion: true}, 'unicode-stress': {accessible: false},
    'inspector-view': {inspectorVisible: true}, 'renderer-failure-restored': {inspectorVisible: false}
};
const ACTIVITY: Partial<Record<TuiVisualCatalogState, TuiActivityState>> = {
    'streaming-live-edge': {streaming: true, provisional: true}, 'streaming-away-from-live-edge': {streaming: true, provisional: true},
    'stale-state-block': {stale: true}, 'inspector-agent-stale': {stale: true}, 'proposal-completed': {outcome: 'success'},
    'route-block': {outcome: 'failure'}, 'budget-block': {outcome: 'failure'}, 'pack-index-block': {outcome: 'failure'},
    'capability-block': {outcome: 'failure'}, 'session-unavailable': {outcome: 'failure', disabled: true},
    'observer-session': {disabled: true}, 'suspended-session': {disabled: true}, 'closed-session': {disabled: true},
    'renderer-failure-restored': {outcome: 'failure'}
};
const OVERLAY_STATES: Partial<Record<TuiVisualCatalogState, {readonly title: string; readonly reasonCode: string}>> = {
    'proposal-confirmation-d2': {title: 'Confirm D2 proposal', reasonCode: 'ERR_CONFIRMATION_REQUIRED'},
    'proposal-confirmation-d3': {title: 'Confirm D3 proposal', reasonCode: 'ERR_CONFIRMATION_REQUIRED'},
    'search-overlay': {title: 'Search', reasonCode: 'SEARCH_BOUNDED'},
    'attention-navigation': {title: 'Attention', reasonCode: 'ATTENTION_ORDERED'},
    'command-palette': {title: 'Command palette', reasonCode: 'PALETTE_OPEN'},
    'details-overlay': {title: 'Details', reasonCode: 'DETAILS_BOUNDED'},
    'conflict-overlay': {title: 'Cross-attachment conflict', reasonCode: 'ATTACHMENT_IDENTITY_MISMATCH'},
    'session-contention': {title: 'Turn in progress', reasonCode: 'OPERATOR_SESSION_TURN_ACTIVE'},
    'paste-over-limit': {title: 'Paste over limit', reasonCode: 'ATTACHMENT_QUEUE_OVERFLOW'},
    'recovered-draft': {title: 'Recovered draft', reasonCode: 'DRAFT_RECOVERED'},
    'lane-picker': {title: 'Select a lane', reasonCode: 'LANE_SELECTION_REQUIRED'},
    'no-lane-welcome': {title: 'No lanes discovered', reasonCode: 'ERR_LANE_NOT_FOUND'},
    'unusable-dimension-recovery': {title: 'Terminal too small', reasonCode: 'RESIZE_REQUIRED'},
    'renderer-failure-restored': {title: 'Renderer unavailable', reasonCode: 'TERMINAL_TARGET_UNPROMOTED'}
};
const ATTENTION: readonly TuiAttentionItem[] = Object.freeze([
    Object.freeze({priority: 'P1' as const, sequence: 1, eventId: 'evt-route', label: 'route unavailable', stealsFocus: false as const}),
    Object.freeze({priority: 'P3' as const, sequence: 2, eventId: 'evt-batch', label: 'batch ready', stealsFocus: false as const})
]);
const UNICODE_TITLE = 'Conversation 界 👩‍💻 é opsess-7f3a-9c21';

export function catalogCase(state: TuiVisualCatalogState, dimension: TuiCatalogDimension): CatalogCase {
    const preferences = Object.freeze({...DEFAULT_TUI_PREFERENCES, ...PREFERENCE_OVERRIDES[state]});
    const size = state === 'unusable-dimension-recovery' ? {columns: 49, rows: 13} : TUI_CATALOG_DIMENSIONS[dimension];
    const base = new TuiApplication({lane: 'watchtower-v1', adapter, preferences, size, attention: state === 'new-empty-session' ? [] : ATTENTION}).view();
    const overlay = OVERLAY_STATES[state];
    const model: TuiShellViewModel = Object.freeze({
        ...base,
        focus: overlay ? 'overlay' : base.focus,
        conversation: Object.freeze({...base.conversation, title: state === 'unicode-stress' ? UNICODE_TITLE : base.conversation.title}),
        overlay: overlay ? Object.freeze({title: overlay.title, reasonCode: overlay.reasonCode, body: Object.freeze([`state ${state}`]), options: Object.freeze(['cancel', 'continue']), focusedOption: 1}) : null
    });
    return Object.freeze({preferences, model, activity: ACTIVITY[state] ?? {}});
}
