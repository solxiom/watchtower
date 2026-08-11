import type {TuiSanitizerFinding} from '../../../src/contracts/tuiAccessibility.js';

/**
 * Adversarial and Unicode fixtures for the CA-23 presentation boundary.
 *
 * Every entry is untrusted terminal content in the sense of
 * `cli-session.md §14.5`: escape/OSC/DCS/APC/PM/device-control injection,
 * terminal-title and clipboard writes, hyperlink smuggling, bidi overrides,
 * malformed UTF-8, renderer markup interpolation, and extreme text. Control
 * characters are built from code points rather than embedded literally, so a
 * fixture cannot be silently normalized away by an editor or transfer step.
 * The Unicode set covers width, combining marks, emoji sequences, long tokens,
 * and code/diff content that must survive sanitization unchanged.
 */
export const ESC = String.fromCharCode(0x1b);
export const BEL = String.fromCharCode(0x07);
export const ST = `${ESC}\\`;
export const C1_CSI = String.fromCharCode(0x9b);
export const C1_OSC = String.fromCharCode(0x9d);
export const C1_DCS = String.fromCharCode(0x90);
const BIDI_OVERRIDE = String.fromCharCode(0x202e);
const BIDI_ISOLATE_OPEN = String.fromCharCode(0x2067);
const BIDI_ISOLATE_CLOSE = String.fromCharCode(0x2069);

export interface InjectionFixture { readonly name: string; readonly value: string | Uint8Array; readonly finding: TuiSanitizerFinding; }
function injection(name: string, value: string | Uint8Array, finding: TuiSanitizerFinding): InjectionFixture { return Object.freeze({name, value, finding}); }

export function injectionFixtures(): readonly InjectionFixture[] {
    return Object.freeze([
        injection('csi-colour', `red${ESC}[31mred`, 'csi-sequence'),
        injection('csi-cursor-move', `go${ESC}[10;10Hhere`, 'csi-sequence'),
        injection('csi-alternate-screen', `swap${ESC}[?1049h`, 'csi-sequence'),
        injection('csi-mouse-mode', `mouse${ESC}[?1000h`, 'csi-sequence'),
        injection('csi-bracketed-paste', `paste${ESC}[?2004h`, 'csi-sequence'),
        injection('csi-keyboard-protocol', `kbd${ESC}[>1u`, 'csi-sequence'),
        injection('c1-csi', `c1${C1_CSI}31m`, 'csi-sequence'),
        injection('c1-osc-title', `c1${C1_OSC}0;pwned${BEL}`, 'title-sequence'),
        injection('c1-dcs', `c1${C1_DCS}q#0${ST}`, 'dcs-sequence'),
        injection('osc-title', `title${ESC}]0;pwned${BEL}`, 'title-sequence'),
        injection('osc-icon-title', `icon${ESC}]2;pwned${ST}`, 'title-sequence'),
        injection('osc-clipboard', `copy${ESC}]52;c;cG93bmVk${BEL}`, 'clipboard-sequence'),
        injection('osc-hyperlink', `link${ESC}]8;;https://evil.example/${ST}click`, 'hyperlink-sequence'),
        injection('osc-notification', `notify${ESC}]9;ping${BEL}`, 'osc-sequence'),
        injection('dcs', `dcs${ESC}Pq#0${ST}`, 'dcs-sequence'),
        injection('apc', `apc${ESC}_Gf=100${ST}`, 'apc-sequence'),
        injection('pm', `pm${ESC}^private${ST}`, 'pm-sequence'),
        injection('sos-device-control', `sos${ESC}Xpayload${ST}`, 'dcs-sequence'),
        injection('escape-only', `bare${ESC}`, 'device-control'),
        injection('unterminated-osc', `open${ESC}]0;never-closed`, 'title-sequence'),
        injection('bidi-override', `safe${BIDI_OVERRIDE}dangerous`, 'bidi-control'),
        injection('bidi-isolate', `safe${BIDI_ISOLATE_OPEN}isolated${BIDI_ISOLATE_CLOSE}`, 'bidi-control'),
        injection('c0-bell', `ring${BEL}`, 'c0-control'),
        injection('c0-carriage-return', 'overwrite\rhidden', 'c0-control'),
        injection('c0-delete', `del${String.fromCharCode(0x7f)}`, 'c0-control'),
        injection('markup-interpolation', 'label {bold}injected{/bold}', 'markup-interpolation'),
        injection('malformed-utf8', new Uint8Array([0x61, 0xc3, 0x28, 0x62]), 'malformed-utf8'),
        injection('lone-surrogate', `a${String.fromCharCode(0xd800)}b`, 'malformed-utf8'),
        injection('extreme-token', `id-${'x'.repeat(900)}`, 'oversized-text')
    ]);
}

/** Content that must survive unchanged: sanitization may not corrupt legitimate text. */
export function unicodeFixtures(): readonly {readonly name: string; readonly value: string; readonly cells: number}[] {
    return Object.freeze([
        Object.freeze({name: 'wide-cjk', value: '界界', cells: 4}),
        Object.freeze({name: 'combining', value: 'é', cells: 1}),
        Object.freeze({name: 'emoji-zwj', value: '👩‍💻', cells: 2}),
        Object.freeze({name: 'regional-indicator', value: '🇬🇷', cells: 2}),
        Object.freeze({name: 'stable-id', value: 'opsess-7f3a-9c21', cells: 16}),
        Object.freeze({name: 'diff-line', value: '+ const value = compute(a, b);', cells: 30}),
        Object.freeze({name: 'code-braces', value: 'const shape = {value: 1};', cells: 25}),
        Object.freeze({name: 'tab-and-newline', value: 'a\tb\nc', cells: 5})
    ]);
}

/** Repeated resize sequences, including the unusable-dimension recovery path. */
export function resizeSequence(): readonly {readonly columns: number; readonly rows: number}[] {
    return Object.freeze([
        Object.freeze({columns: 140, rows: 40}), Object.freeze({columns: 100, rows: 30}), Object.freeze({columns: 70, rows: 20}),
        Object.freeze({columns: 49, rows: 13}), Object.freeze({columns: 70, rows: 20}), Object.freeze({columns: 140, rows: 40}),
        Object.freeze({columns: 120, rows: 24}), Object.freeze({columns: 80, rows: 20}), Object.freeze({columns: 140, rows: 40})
    ]);
}
