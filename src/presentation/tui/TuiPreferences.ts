import type {TuiDisplayPreferences, TuiPreferenceDiagnostic, TuiPreferenceLoadResult} from '../../contracts/tuiShell.js';

export const DEFAULT_TUI_PREFERENCES: TuiDisplayPreferences = Object.freeze({schemaVersion: 1, theme: 'dark', noColor: false, highContrast: false, reducedMotion: false, accessible: false, inspectorVisible: true, inspectorSide: 'right', inspectorWidthRatio: 0.28, keymap: {'focus.composer': 'i', 'focus.next': 'Tab', 'inspector.toggle': 'Ctrl-B', 'palette.open': 'Ctrl-P', 'help.open': '?', 'attachment.detach': 'Ctrl-D'}});
const KEYS = new Set(Object.keys(DEFAULT_TUI_PREFERENCES));
export function loadTuiPreferences(input: unknown): TuiPreferenceLoadResult {
    const diagnostics: TuiPreferenceDiagnostic[] = [];
    if (!isRecord(input)) return result(diagnostics, false);
    if (input.schemaVersion !== 1 && input.schemaVersion !== 0) { diagnostics.push({code: 'unsupported-version'}); return result(diagnostics, false); }
    const next = {...DEFAULT_TUI_PREFERENCES};
    const preservedUnknownKeys: Record<string, unknown> = {};
    for (const key of Object.keys(input)) if (!KEYS.has(key)) { diagnostics.push({code: 'unknown-key', key}); preservedUnknownKeys[key] = input[key]; }
    assignBoolean(input, next, 'noColor', diagnostics); assignBoolean(input, next, 'highContrast', diagnostics); assignBoolean(input, next, 'reducedMotion', diagnostics); assignBoolean(input, next, 'accessible', diagnostics); assignBoolean(input, next, 'inspectorVisible', diagnostics);
    if (input.theme === 'dark' || input.theme === 'light' || input.theme === 'system') next.theme = input.theme; else if (input.theme !== undefined) diagnostics.push({code: 'invalid-value', key: 'theme'});
    if (input.inspectorSide === 'left' || input.inspectorSide === 'right') next.inspectorSide = input.inspectorSide; else if (input.inspectorSide !== undefined) diagnostics.push({code: 'invalid-value', key: 'inspectorSide'});
    if (typeof input.inspectorWidthRatio === 'number' && input.inspectorWidthRatio >= 0.2 && input.inspectorWidthRatio <= 0.45) next.inspectorWidthRatio = input.inspectorWidthRatio; else if (input.inspectorWidthRatio !== undefined) diagnostics.push({code: 'invalid-value', key: 'inspectorWidthRatio'});
    if (isRecord(input.keymap)) { const entries = Object.entries(input.keymap); if (new Set(entries.map(([, key]) => key)).size !== entries.length) diagnostics.push({code: 'key-conflict', key: 'keymap'}); else if (entries.every(([id, key]) => typeof id === 'string' && typeof key === 'string' && key.length <= 16)) next.keymap = Object.fromEntries(entries) as Record<string, string>; else diagnostics.push({code: 'invalid-value', key: 'keymap'}); } else if (input.keymap !== undefined) diagnostics.push({code: 'invalid-value', key: 'keymap'});
    return result(diagnostics, input.schemaVersion === 0, diagnostics.some((item) => item.code === 'invalid-value' || item.code === 'key-conflict') ? DEFAULT_TUI_PREFERENCES : Object.freeze(next), preservedUnknownKeys);
}
function assignBoolean(input: Record<string, unknown>, target: TuiDisplayPreferences, key: keyof TuiDisplayPreferences, diagnostics: TuiPreferenceDiagnostic[]): void { const value = input[key]; if (value === undefined) return; if (typeof value === 'boolean') (target as unknown as Record<string, unknown>)[key] = value; else diagnostics.push({code: 'invalid-value', key}); }
function result(diagnostics: TuiPreferenceDiagnostic[], migrated: boolean, preferences = DEFAULT_TUI_PREFERENCES, preservedUnknownKeys: Record<string, unknown> = {}): TuiPreferenceLoadResult { return Object.freeze({preferences, diagnostics: Object.freeze(diagnostics), migrated, preservedUnknownKeys: Object.freeze(preservedUnknownKeys)}); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
