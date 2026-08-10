import type {TuiCapabilities, TuiSize} from './tuiAdapter.js';

export type TuiLayoutMode = 'wide' | 'standard' | 'narrow' | 'unusable';
export type TuiFocusTarget = 'conversation' | 'composer' | 'inspector' | 'overlay';
export type TuiFocusScopeKind = 'base' | 'overlay';
export type TuiInspectorSide = 'left' | 'right';
export type TuiThemeName = 'dark' | 'light' | 'system';
export type TuiColorMode = 'truecolor' | '256' | '16' | 'monochrome';
export type TuiMutationClass = 'read' | 'advisory' | 'effect';
export type TuiAttentionPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

export interface TuiDisplayPreferences {
    readonly schemaVersion: 1;
    readonly theme: TuiThemeName;
    readonly noColor: boolean;
    readonly highContrast: boolean;
    readonly reducedMotion: boolean;
    readonly accessible: boolean;
    readonly inspectorVisible: boolean;
    readonly inspectorSide: TuiInspectorSide;
    readonly inspectorWidthRatio: number;
    readonly keymap: Readonly<Record<string, string>>;
}
export interface TuiPreferenceLoadResult {
    readonly preferences: TuiDisplayPreferences;
    readonly diagnostics: readonly TuiPreferenceDiagnostic[];
    readonly migrated: boolean;
    readonly preservedUnknownKeys: Readonly<Record<string, unknown>>;
}
export interface TuiPreferenceDiagnostic { readonly code: 'unknown-key' | 'invalid-value' | 'key-conflict' | 'unsupported-version'; readonly key?: string; }

export interface TuiLayout {
    readonly mode: TuiLayoutMode;
    readonly size: TuiSize;
    readonly conversation: TuiRegion;
    readonly inspector: TuiRegion | null;
    readonly overlay: TuiRegion;
    readonly resizeRequired: boolean;
    readonly inspectorSide: TuiInspectorSide;
    readonly inspectorPresentation: 'persistent' | 'drawer' | 'overlay' | 'none';
    readonly inspectorVisible: boolean;
}
export interface TuiRegion { readonly column: number; readonly row: number; readonly width: number; readonly height: number; }
export interface TuiFocusScope { readonly kind: TuiFocusScopeKind; readonly targets: readonly TuiFocusTarget[]; readonly activeIndex: number; }
export interface TuiFocusIntent { readonly type: 'target' | 'next' | 'previous' | 'open-overlay' | 'close-overlay'; readonly target?: TuiFocusTarget; readonly overlayTarget?: string; }
export interface TuiFocusTransition { readonly from: TuiFocusTarget; readonly to: TuiFocusTarget; readonly restored: boolean; readonly scope: TuiFocusScope; }
export interface TuiActionContext { readonly focus: TuiFocusTarget; readonly observer: boolean; readonly overlayOpen: boolean; readonly conflictingActionIds?: readonly string[]; }
export interface TuiActionDescriptor {
    readonly id: string;
    readonly key: string;
    readonly label: string;
    readonly focusScope: readonly TuiFocusTarget[];
    readonly mutation: TuiMutationClass;
    readonly requiresConfirmation: boolean;
    readonly observerEligible: boolean;
    readonly slash?: string;
    readonly aliases?: readonly string[];
    readonly keywords?: readonly string[];
}
export interface TuiActionResolution extends TuiActionDescriptor { readonly available: boolean; readonly reason?: string; }

export interface TuiTheme {
    readonly name: TuiThemeName;
    readonly colorMode: TuiColorMode;
    readonly highContrast: boolean;
    readonly tokens: Readonly<Record<TuiSemanticToken, string>>;
}
export type TuiSemanticToken = 'surface' | 'surfaceRaised' | 'border' | 'borderFocused' | 'text' | 'textMuted' | 'textStrong' | 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'operator' | 'watchtower' | 'provisional' | 'stale' | 'disabled';

export interface TuiShellViewModel {
    readonly layout: TuiLayout;
    readonly focus: TuiFocusTarget;
    readonly theme: TuiTheme;
    readonly header: TuiHeaderViewModel;
    readonly conversation: TuiConversationViewModel;
    readonly inspector: TuiInspectorViewModel | null;
    readonly attention: readonly TuiAttentionItem[];
    readonly overlay: TuiOverlayViewModel | null;
}
export interface TuiHeaderViewModel { readonly lane: string; readonly lifecycle: string; readonly batch: string | null; readonly session: string | null; readonly budget: string; }
export interface TuiConversationViewModel { readonly title: string; readonly composerPlaceholder: string; readonly timelineAnchor: string | null; }
export interface TuiInspectorViewModel { readonly title: string; readonly lines: readonly string[]; }
export interface TuiOverlayViewModel { readonly title: string; readonly reasonCode: string; readonly body: readonly string[]; readonly options: readonly string[]; readonly focusedOption: number; }
export interface TuiAttentionItem { readonly priority: TuiAttentionPriority; readonly sequence: number; readonly eventId: string; readonly label: string; readonly stealsFocus: false; }

export interface TuiLaneCandidate { readonly laneId: string; readonly slug: string; readonly controlHome: string; readonly lifecycle: string; readonly activeSessions: number; readonly available: boolean; readonly reason?: string; }
export interface TuiLaneEntry { readonly kind: 'welcome' | 'single' | 'picker' | 'unavailable'; readonly candidates: readonly TuiLaneCandidate[]; readonly selectedLaneId: string | null; readonly createsSession: false; }
export interface TuiAnimationPolicy { readonly enabled: boolean; readonly maxFramesPerSecond: 30; readonly maxQueuedFrames: 2; readonly hidden: boolean; }

export function resolveLaneEntry(candidates: readonly TuiLaneCandidate[]): TuiLaneEntry {
    const ordered = Object.freeze([...candidates].sort((a, b) => a.slug.localeCompare(b.slug) || a.laneId.localeCompare(b.laneId)));
    if (ordered.length === 0) return Object.freeze({kind: 'welcome', candidates: ordered, selectedLaneId: null, createsSession: false});
    if (ordered.length === 1 && ordered[0].available) return Object.freeze({kind: 'single', candidates: ordered, selectedLaneId: ordered[0].laneId, createsSession: false});
    if (ordered.some((candidate) => candidate.available)) return Object.freeze({kind: 'picker', candidates: ordered, selectedLaneId: null, createsSession: false});
    return Object.freeze({kind: 'unavailable', candidates: ordered, selectedLaneId: null, createsSession: false});
}

export function resolveTuiColorMode(capabilities: TuiCapabilities, preferences: Pick<TuiDisplayPreferences, 'noColor'>): TuiColorMode {
    if (preferences.noColor) return 'monochrome';
    return capabilities.color;
}

export function reduceAttention(items: readonly TuiAttentionItem[]): readonly TuiAttentionItem[] {
    const rank: Record<TuiAttentionPriority, number> = {P0: 0, P1: 1, P2: 2, P3: 3, P4: 4, P5: 5};
    return Object.freeze([...items].sort((a, b) => rank[a.priority] - rank[b.priority] || a.sequence - b.sequence || a.eventId.localeCompare(b.eventId)));
}

export function measureTuiCells(text: string): number {
    const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'});
    let width = 0;
    for (const part of segmenter.segment(text.normalize('NFC'))) width += graphemeWidth(part.segment);
    return width;
}

function graphemeWidth(grapheme: string): number {
    const codes = [...grapheme].map((character) => character.codePointAt(0) ?? 0);
    if (codes.length === 0 || codes.every(isCombining)) return 0;
    if (codes.includes(0x200d) || regionalIndicatorCount(codes) >= 2 || codes.some(isEmoji)) return 2;
    return codes.some(isWide) ? 2 : 1;
}
function regionalIndicatorCount(codes: readonly number[]): number { return codes.filter((code) => code >= 0x1f1e6 && code <= 0x1f1ff).length; }
function isCombining(code: number): boolean { return (code >= 0x300 && code <= 0x36f) || (code >= 0x1ab0 && code <= 0x1aff) || (code >= 0x1dc0 && code <= 0x1dff) || (code >= 0xfe00 && code <= 0xfe0f) || code === 0x20e3; }
function isEmoji(code: number): boolean { return code >= 0x1f000 && code <= 0x1faff; }
function isWide(code: number): boolean { return code >= 0x1100 && (code <= 0x115f || code === 0x2329 || code === 0x232a || (code >= 0x2e80 && code <= 0xa4cf) || (code >= 0xac00 && code <= 0xd7a3) || (code >= 0xf900 && code <= 0xfaff)); }

export interface TuiMouseSelection { readonly type: 'focus' | 'scroll' | 'activate'; readonly column: number; readonly row: number; }
export function normalizeTuiMouseSelection(value: unknown): TuiMouseSelection | null {
    if (!isRecord(value) || (value.type !== 'focus' && value.type !== 'scroll' && value.type !== 'activate') || !Number.isInteger(value.column) || !Number.isInteger(value.row)) return null;
    const column = value.column as number; const row = value.row as number;
    if (column < 0 || row < 0) return null;
    return Object.freeze({type: value.type, column, row});
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
