import {AccessibleTuiPresenter} from '../../../src/presentation/tui/AccessibleTuiPresenter.js';
import {TerminalContentSanitizer} from '../../../src/presentation/tui/TerminalContentSanitizer.js';
import {TuiApplication} from '../../../src/presentation/tui/TuiApplication.js';
import {DEFAULT_TUI_PREFERENCES} from '../../../src/presentation/tui/TuiPreferences.js';
import {TuiThemeResolver} from '../../../src/presentation/tui/TuiThemeResolver.js';
import {TUI_CONTENT_LIMITS, TUI_SEMANTIC_STATES, TUI_SEMANTIC_STATE_LABELS, type TuiSemanticState} from '../../../src/contracts/tuiAccessibility.js';
import type {NirvanaTuiAdapter, TuiCapabilities} from '../../../src/contracts/tuiAdapter.js';
import type {TuiDisplayPreferences, TuiShellViewModel} from '../../../src/contracts/tuiShell.js';
import {ESC, injectionFixtures} from '../../support/tuiPty/terminalContentFixtures.js';

const capabilities: TuiCapabilities = {alternateScreen: true, rawInput: true, resize: true, unicodeWidth: true, color: 'truecolor', mouse: true, bracketedPaste: true, reducedMotion: false};
const adapter: NirvanaTuiAdapter = {capabilities: () => capabilities, open: () => { throw new Error('the presenter never opens a surface'); }};

function view(preferences: TuiDisplayPreferences, columns = 140, rows = 40): TuiShellViewModel {
    const application = new TuiApplication({
        lane: 'watchtower-v1', adapter, preferences, size: {columns, rows},
        attention: [{priority: 'P1', sequence: 1, eventId: 'evt-1', label: 'route unavailable', stealsFocus: false}]
    });
    return application.view();
}

describe('CA-23 accessible presenter', () => {
    it('emits one linear focus order with explicit region titles', () => {
        const preferences = {...DEFAULT_TUI_PREFERENCES, accessible: true};
        const presented = new AccessibleTuiPresenter({preferences}).present(view(preferences));
        expect(presented.linearFocusOrder).toEqual(['header', 'conversation', 'attention', 'inspector', 'composer']);
        expect(presented.regions.every((region) => region.title.length > 0)).toBeTrue();
        expect(presented.regions.map((region) => region.focusOrder)).toEqual([0, 1, 2, 3, 5]);
        expect(presented.restrainedRedraw).toBeTrue();
        expect(presented.animated).toBeFalse();
        expect(presented.usesColor).toBeFalse();
        expect(presented.regions.filter((region) => region.focused).length).toBe(1);
    });

    it('labels every semantic state as text so no meaning is carried by colour alone', () => {
        const preferences = {...DEFAULT_TUI_PREFERENCES, accessible: true, noColor: true};
        const presenter = new AccessibleTuiPresenter({preferences});
        const presented = presenter.present(view(preferences), {streaming: true, provisional: true, stale: true, outcome: 'failure', disabled: true});
        const conversation = presented.regions.find((region) => region.id === 'conversation')!;
        expect(conversation.states).toEqual(['progress', 'provisional', 'stale', 'failure']);
        expect(presented.regions.find((region) => region.id === 'composer')!.states).toEqual(['focus', 'disabled']);
        expect(conversation.title).toContain(TUI_SEMANTIC_STATE_LABELS.provisional);
        expect(presented.regions.find((region) => region.id === 'composer')!.title).toContain(TUI_SEMANTIC_STATE_LABELS.disabled);
        expect(presented.regions.find((region) => region.id === 'inspector')!.states).toEqual(['stale']);
        for (const state of TUI_SEMANTIC_STATES) expect(TUI_SEMANTIC_STATE_LABELS[state as TuiSemanticState].length).toBeGreaterThan(2);
        const monochrome = new TuiThemeResolver().resolve(capabilities, preferences);
        expect(monochrome.colorMode).toBe('monochrome');
        expect(new Set(Object.values(monochrome.tokens)).size).toBeLessThanOrEqual(2);
    });

    it('replaces animated progress with a labelled static indicator', () => {
        const reduced = {...DEFAULT_TUI_PREFERENCES, reducedMotion: true};
        const presenter = new AccessibleTuiPresenter({preferences: reduced});
        expect(presenter.present(view(reduced)).animated).toBeFalse();
        expect(presenter.progress('applying proposal', 42)).toBe('[working] applying proposal 42%');
        expect(presenter.progress('applying proposal')).toBe('[working] applying proposal in progress');
        expect(new AccessibleTuiPresenter({preferences: DEFAULT_TUI_PREFERENCES}).present(view(DEFAULT_TUI_PREFERENCES)).animated).toBeTrue();
    });

    it('keeps announcements append-only and bounded', () => {
        const presenter = new AccessibleTuiPresenter({preferences: {...DEFAULT_TUI_PREFERENCES, accessible: true}, maxAnnouncements: 3});
        for (const index of [1, 2, 3, 4, 5]) presenter.announce(`event ${index}`, ['attention']);
        const stream = presenter.announcements();
        expect(stream.map((item) => item.sequence)).toEqual([3, 4, 5]);
        expect(stream.map((item) => item.text)).toEqual(['event 3 [attention]', 'event 4 [attention]', 'event 5 [attention]']);
        expect(stream.length).toBeLessThanOrEqual(TUI_CONTENT_LIMITS.maxAnnouncements);
    });

    it('sanitizes every announcement and every rendered region line', () => {
        const preferences = {...DEFAULT_TUI_PREFERENCES, accessible: true};
        const presenter = new AccessibleTuiPresenter({preferences, sanitizer: new TerminalContentSanitizer({accessible: true})});
        for (const fixture of injectionFixtures()) {
            if (typeof fixture.value !== 'string') continue;
            const announced = presenter.announce(fixture.value).at(-1)!;
            expect(announced.text.includes(ESC)).withContext(fixture.name).toBeFalse();
        }
        const hostile = view(preferences);
        const model: TuiShellViewModel = {...hostile, conversation: {...hostile.conversation, title: `Conversation${ESC}]0;pwned`}};
        const presented = presenter.present(model);
        expect(presented.regions.find((region) => region.id === 'conversation')!.title.includes(ESC)).toBeFalse();
    });

    it('presents overlay selection and attention without mouse, icons, or hyperlinks', () => {
        const preferences = {...DEFAULT_TUI_PREFERENCES, accessible: true};
        const base = view(preferences);
        const model: TuiShellViewModel = {
            ...base, focus: 'overlay',
            overlay: {title: 'Confirm apply', reasonCode: 'ERR_CONFIRMATION_REQUIRED', body: ['apply proposal prop-1'], options: ['cancel', 'apply'], focusedOption: 1}
        };
        const presented = new AccessibleTuiPresenter({preferences}).present(model);
        const overlay = presented.regions.find((region) => region.id === 'overlay')!;
        expect(overlay.focused).toBeTrue();
        expect(overlay.title).toContain('ERR_CONFIRMATION_REQUIRED');
        expect(overlay.lines.at(-1)).toBe('[selected] apply');
        expect(presented.regions.find((region) => region.id === 'attention')!.lines).toEqual(['P1 evt-1 route unavailable']);
        expect(presented.linearFocusOrder).toContain('overlay');
    });
});
