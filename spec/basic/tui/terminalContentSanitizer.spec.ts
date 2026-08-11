import {TerminalContentSanitizer} from '../../../src/presentation/tui/TerminalContentSanitizer.js';
import {TUI_CONTENT_LIMITS, TUI_CONTENT_SURFACES, TuiTerminalError} from '../../../src/contracts/tuiAccessibility.js';
import {measureTuiCells} from '../../../src/contracts/tuiShell.js';
import {BEL, ESC, injectionFixtures, unicodeFixtures} from '../../support/tuiPty/terminalContentFixtures.js';

const sanitizer = new TerminalContentSanitizer();
const EXECUTABLE = /[\u001b\u009b\u009d\u0090\u0007]/u;

describe('CA-23 terminal content sanitizer', () => {
    it('neutralizes every injection fixture on every untrusted surface', () => {
        for (const fixture of injectionFixtures()) {
            for (const surface of TUI_CONTENT_SURFACES) {
                const result = sanitizer.sanitize(surface, fixture.value);
                expect(result.findings).withContext(`${fixture.name}/${surface}`).toContain(fixture.finding);
                expect(EXECUTABLE.test(result.text)).withContext(`${fixture.name}/${surface}`).toBeFalse();
                expect(result.surface).toBe(surface);
                expect(result.cells).toBe(measureTuiCells(result.text));
            }
        }
    });

    it('keeps the escaped payload visible instead of silently dropping it', () => {
        const title = sanitizer.sanitize('timeline', `title${ESC}]0;pwned${BEL}`);
        expect(title.text).toContain('pwned');
        expect(title.text).toContain('␛');
        expect(title.findings).toContain('title-sequence');
        const clipboard = sanitizer.sanitize('debug', `copy${ESC}]52;c;cG93bmVk${BEL}`);
        expect(clipboard.findings).toContain('clipboard-sequence');
        expect(clipboard.text.startsWith('copy␛')).toBeTrue();
    });

    it('preserves legitimate Unicode, code, and diff content unchanged', () => {
        for (const fixture of unicodeFixtures()) {
            const result = sanitizer.sanitize('timeline', fixture.value);
            expect(result.text).withContext(fixture.name).toBe(fixture.value.normalize('NFC'));
            expect(result.findings).withContext(fixture.name).toEqual([]);
            expect(result.cells).withContext(fixture.name).toBe(fixture.cells);
            expect(result.truncated).toBeFalse();
        }
    });

    it('bounds extreme text and reports the truncation', () => {
        const result = sanitizer.sanitize('timeline', 'a'.repeat(TUI_CONTENT_LIMITS.maxTextBytes + 4096));
        expect(result.truncated).toBeTrue();
        expect(result.findings).toContain('oversized-text');
        expect(result.text.length).toBeLessThanOrEqual(TUI_CONTENT_LIMITS.maxTextBytes + 1);
        expect(sanitizer.sanitize('timeline', `id-${'x'.repeat(900)}`).findings).toContain('oversized-text');
    });

    it('refuses content that is neither text nor bytes and refuses an unknown surface', () => {
        for (const value of [7, null, {text: 'x'}, undefined]) {
            expect(() => sanitizer.sanitize('timeline', value)).toThrowMatching((error) => (error as TuiTerminalError).reason === 'TERMINAL_CONTENT_INVALID');
        }
        expect(() => sanitizer.sanitize('renderer' as never, 'x')).toThrowMatching((error) => (error as TuiTerminalError).reason === 'TERMINAL_CONTENT_INVALID');
    });

    it('emits hyperlinks only for validated references or authorized https targets', () => {
        const linking = new TerminalContentSanitizer({hyperlinksSupported: true});
        expect(linking.hyperlink({label: 'session', target: 'session:opsess-7f3a', surface: 'timeline'}).emitted).toBeTrue();
        expect(linking.hyperlink({label: 'docs', target: 'https://example.invalid/docs', surface: 'timeline'}).emitted).toBeTrue();
        const rejected = [
            {target: 'javascript:alert(1)', reason: 'unauthorized-scheme'},
            {target: 'file:///etc/passwd', reason: 'unauthorized-scheme'},
            {target: 'https://example.invalid/\u001b]52;c;x', reason: 'unvalidated-reference'},
            {target: `https://example.invalid/${'p'.repeat(TUI_CONTENT_LIMITS.maxLinkTargetBytes)}`, reason: 'oversized-target'}
        ];
        for (const item of rejected) {
            const decision = linking.hyperlink({label: 'link', target: item.target, surface: 'timeline'});
            expect(decision.emitted).withContext(item.target.slice(0, 24)).toBeFalse();
            expect(decision.reason).toBe(item.reason as typeof decision.reason);
            expect(decision.target).toBeNull();
            expect(decision.label).toBe('link');
        }
        expect(sanitizer.hyperlink({label: 'l', target: 'https://example.invalid', surface: 'timeline'}).reason).toBe('unsupported-capability');
        expect(new TerminalContentSanitizer({accessible: true, hyperlinksSupported: true}).hyperlink({label: 'l', target: 'session:one', surface: 'timeline'}).reason).toBe('accessible-mode');
    });

    it('writes the clipboard only for a direct operator copy action', () => {
        expect(sanitizer.clipboard({operatorInitiated: false, surface: 'copy', text: 'secret'})).toEqual({emitted: false, payload: null, reason: 'not-operator-initiated'});
        const copied = sanitizer.clipboard({operatorInitiated: true, surface: 'copy', text: `id-1${ESC}]52;c;x${BEL}`});
        expect(copied.emitted).toBeTrue();
        expect(EXECUTABLE.test(copied.payload ?? '')).toBeFalse();
        const oversized = sanitizer.clipboard({operatorInitiated: true, surface: 'copy', text: 'z'.repeat(TUI_CONTENT_LIMITS.maxClipboardBytes + 1)});
        expect(oversized.emitted).toBeFalse();
        expect(oversized.reason).toBe('oversized-payload');
    });
});
