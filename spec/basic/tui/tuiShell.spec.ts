import {TuiLayoutResolver} from '../../../src/presentation/tui/TuiLayoutResolver.js';
import {TuiFocusManager} from '../../../src/presentation/tui/TuiFocusManager.js';
import {TuiThemeResolver} from '../../../src/presentation/tui/TuiThemeResolver.js';
import {DEFAULT_TUI_PREFERENCES, loadTuiPreferences} from '../../../src/presentation/tui/TuiPreferences.js';
import {TuiActionRegistry} from '../../../src/presentation/tui/TuiActionRegistry.js';
import {TuiFrameScheduler} from '../../../src/presentation/tui/TuiApplication.js';
import {measureTuiCells, normalizeTuiMouseSelection, reduceAttention, resolveLaneEntry, type TuiAttentionItem} from '../../../src/contracts/tuiShell.js';
import type {TuiCapabilities} from '../../../src/contracts/tuiAdapter.js';

const capabilities: TuiCapabilities = {alternateScreen: true, rawInput: true, resize: true, unicodeWidth: true, color: 'truecolor', mouse: true, bracketedPaste: true, reducedMotion: false};

describe('CA-19 TUI shell', () => {
    it('keeps the inspector on the right in wide mode and degrades at boundaries', () => {
        const resolver = new TuiLayoutResolver();
        expect(resolver.resolve({columns: 120, rows: 24}, DEFAULT_TUI_PREFERENCES).mode).toBe('wide');
        expect(resolver.resolve({columns: 119, rows: 20}, DEFAULT_TUI_PREFERENCES).mode).toBe('standard');
        expect(resolver.resolve({columns: 79, rows: 19}, DEFAULT_TUI_PREFERENCES).mode).toBe('narrow');
        expect(resolver.resolve({columns: 49, rows: 13}, DEFAULT_TUI_PREFERENCES).resizeRequired).toBeTrue();
        expect(resolver.resolve({columns: 120, rows: 24}, DEFAULT_TUI_PREFERENCES).inspector?.column).toBeGreaterThan(0);
    });
    it('uses a full-height standard drawer at both column and row edges', () => {
        const resolver = new TuiLayoutResolver();
        for (const size of [{columns: 80, rows: 20}, {columns: 119, rows: 20}]) {
            const layout = resolver.resolve(size, DEFAULT_TUI_PREFERENCES);
            expect(layout.mode).toBe('standard'); expect(layout.inspectorPresentation).toBe('drawer');
            expect(layout.inspector).toEqual({column: 0, row: 3, width: size.columns, height: 15});
        }
        const closed = resolver.resolve({columns: 80, rows: 20}, {...DEFAULT_TUI_PREFERENCES, inspectorVisible: false});
        expect(closed.inspector).toBeNull(); expect(closed.inspectorPresentation).toBe('overlay');
        const resized = resolver.resolve({columns: 119, rows: 20}, DEFAULT_TUI_PREFERENCES);
        expect(resized.inspector?.width).toBe(119); expect(resized.conversation.width).toBe(119);
    });
    it('traps overlay focus and restores a valid target after resize or removal', () => {
        const resolver = new TuiLayoutResolver(); const manager = new TuiFocusManager();
        const wide = resolver.resolve({columns: 120, rows: 24}, DEFAULT_TUI_PREFERENCES);
        manager.transition({type: 'target', target: 'inspector'}, wide); manager.transition({type: 'open-overlay'}, wide);
        expect(manager.scope().kind).toBe('overlay'); expect(manager.transition({type: 'next'}, wide).to).toBe('overlay'); expect(manager.transition({type: 'previous'}, wide).to).toBe('overlay');
        const narrow = resolver.resolve({columns: 79, rows: 19}, DEFAULT_TUI_PREFERENCES);
        expect(manager.transition({type: 'close-overlay'}, narrow).to).toBe('conversation');
    });
    it('filters contextual actions and reports stable role, focus, and conflict reasons', () => {
        const registry = new TuiActionRegistry();
        const composer = {focus: 'composer' as const, observer: false, overlayOpen: false};
        expect(registry.inspect(composer).every((item) => item.focusScope.includes('composer'))).toBeTrue();
        expect(registry.resolve('inspector.toggle', {...composer, observer: true}).reason).toBe('observer-ineligible');
        expect(registry.resolve('focus.composer', {...composer, conflictingActionIds: ['focus.composer']}).reason).toBe('key-conflict');
        const keys = registry.inspect(composer).map((item) => item.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect(registry.inspect({focus: 'overlay', observer: false, overlayOpen: true}).every((item) => item.focusScope.includes('overlay'))).toBeTrue();
    });
    it('uses semantic theme capability degradation and atomic preference fallback', () => {
        const theme = new TuiThemeResolver().resolve(capabilities, {...DEFAULT_TUI_PREFERENCES, noColor: true});
        expect(theme.colorMode).toBe('monochrome'); expect(theme.tokens.danger).toBe('black');
        for (const color of ['truecolor', '256', '16', 'monochrome'] as const) expect(new TuiThemeResolver().resolve({...capabilities, color}, DEFAULT_TUI_PREFERENCES).colorMode).toBe(color);
        expect(new TuiThemeResolver().resolve(capabilities, {...DEFAULT_TUI_PREFERENCES, highContrast: true}).tokens.borderFocused).toBe('#ffffff');
        const loaded = loadTuiPreferences({schemaVersion: 1, theme: 'light', keymap: {one: 'x', two: 'x'}});
        expect(loaded.preferences).toEqual(DEFAULT_TUI_PREFERENCES); expect(loaded.diagnostics[0].code).toBe('key-conflict');
        expect(resolveLaneEntry([{laneId: 'b', slug: 'zeta', controlHome: '/z', lifecycle: 'active', activeSessions: 0, available: true}, {laneId: 'a', slug: 'alpha', controlHome: '/a', lifecycle: 'active', activeSessions: 0, available: true}]).kind).toBe('picker');
        expect(loadTuiPreferences({schemaVersion: 1, futureFlag: true}).preservedUnknownKeys.futureFlag).toBeTrue();
    });
    it('orders attention P0 through P5 without stealing focus', () => {
        const items: TuiAttentionItem[] = ['P5', 'P0', 'P3'].map((priority, sequence) => ({priority: priority as TuiAttentionItem['priority'], sequence, eventId: priority, label: priority, stealsFocus: false}));
        expect(reduceAttention(items).map((item) => item.priority)).toEqual(['P0', 'P3', 'P5']);
    });
    it('proves cell measurement, mouse normalization, model-free entry, and bounded coalescing', () => {
        expect(measureTuiCells('A界e\u0301')).toBe(4);
        expect(measureTuiCells('👩‍💻')).toBe(2);
        expect(measureTuiCells('🇬🇷')).toBe(2);
        expect(measureTuiCells('e\u0301')).toBe(1);
        expect(measureTuiCells('界')).toBe(2);
        const stableId = 'opsess-7f3a-very-long-stable-id';
        expect(measureTuiCells(stableId)).toBe(stableId.length);
        expect(new TuiLayoutResolver().resolve({columns: 80, rows: 20}, DEFAULT_TUI_PREFERENCES).conversation.width).toBeGreaterThan(measureTuiCells(stableId));
        expect(normalizeTuiMouseSelection({type: 'focus', column: 4, row: 2})).toEqual({type: 'focus', column: 4, row: 2});
        expect(normalizeTuiMouseSelection({type: 'focus', column: -1, row: 2})).toBeNull();
        expect(resolveLaneEntry([]).kind).toBe('welcome'); expect(resolveLaneEntry([{laneId: 'one', slug: 'one', controlHome: '/one', lifecycle: 'active', activeSessions: 0, available: true}]).selectedLaneId).toBe('one');
        expect(resolveLaneEntry([{laneId: 'one', slug: 'one', controlHome: '/one', lifecycle: 'active', activeSessions: 0, available: false}]).kind).toBe('unavailable');
        const scheduler = new TuiFrameScheduler(); const first = {size: {columns: 80, rows: 20}, cells: []}; const second = {...first, size: {columns: 81, rows: 20}};
        expect(scheduler.enqueue(first)).toBeTrue(); expect(scheduler.enqueue(second)).toBeTrue(); expect(scheduler.take()?.size.columns).toBe(81); expect(scheduler.take()).toBeNull();
        expect(new TuiFrameScheduler({enabled: true, maxFramesPerSecond: 30, maxQueuedFrames: 2, hidden: true}).enqueue(first)).toBeFalse();
    });
});
