import {
    TUI_CONTENT_LIMITS, TUI_CONTENT_SURFACES, TuiTerminalError, type TuiClipboardDecision, type TuiClipboardRequest,
    type TuiContentSurface, type TuiHyperlinkDecision, type TuiSanitizedText, type TuiSanitizerFinding
} from '../../contracts/tuiAccessibility.js';
import {measureTuiCells} from '../../contracts/tuiShell.js';

export interface TerminalContentSanitizerOptions { readonly accessible?: boolean; readonly hyperlinksSupported?: boolean; readonly maxTextBytes?: number; }
export interface TuiHyperlinkRequest { readonly label: string; readonly target: string; readonly surface: TuiContentSurface; }

const ESCAPE = '\u001b';
const CONTROL_PICTURE_BASE = 0x2400;
const BIDI = /[‎‏‪-‮⁦-⁩]/u;
const MARKUP_TAG = /\{\/?[A-Za-z][A-Za-z0-9=:#,.-]*\}/gu;
const WT_REFERENCE = /^(?:lane|session|turn|batch|event|proposal|agent):[A-Za-z0-9._-]{1,64}$/u;

/**
 * The single presentation/copy/debug boundary for untrusted terminal content
 * (`cli-session.md §14.5`). Model, repository, pack, event, tool, agent, and
 * operator text is `unknown` here: it is decoded, normalized, and stripped of
 * every executable escape before it is measured or rendered.
 *
 * Nothing that passes through this owner can change cursor state, focus, mouse
 * mode, paste mode, the alternate screen, the terminal title, the keyboard
 * protocol, or the clipboard. Suspicious sequences survive as a *visible
 * escaped form* rather than silently vanishing, so an injection attempt stays
 * inspectable. Hyperlink and OSC 52 emission are separate explicit decisions —
 * they are never a side effect of rendering text.
 */
export class TerminalContentSanitizer {
    private readonly maxTextBytes: number;
    constructor(private readonly options: TerminalContentSanitizerOptions = {}) {
        this.maxTextBytes = Math.min(options.maxTextBytes ?? TUI_CONTENT_LIMITS.maxTextBytes, TUI_CONTENT_LIMITS.maxTextBytes);
    }

    /** Sanitizes one untrusted value for one surface; every surface uses this identical policy. */
    sanitize(surface: TuiContentSurface, value: unknown): TuiSanitizedText {
        if (!TUI_CONTENT_SURFACES.includes(surface)) throw new TuiTerminalError('TERMINAL_CONTENT_INVALID', String(surface), 'The presentation surface is outside the closed surface set.');
        const findings = new Set<TuiSanitizerFinding>();
        const decoded = decode(value, surface, findings);
        const bounded = this.bound(decoded, findings);
        const escaped = escapeSequences(bounded, findings);
        const text = escapeMarkup(escapeCharacters(escaped, findings), findings);
        return Object.freeze({
            surface, text, findings: Object.freeze([...findings].sort()),
            truncated: bounded.length !== decoded.length, cells: measureTuiCells(text)
        });
    }

    /** Terminal hyperlinks are optional enhancement: a rejected target still presents its copyable label. */
    hyperlink(request: TuiHyperlinkRequest): TuiHyperlinkDecision {
        const label = this.sanitize(request.surface, request.label).text;
        if (this.options.accessible === true) return link(false, null, label, 'accessible-mode');
        if (this.options.hyperlinksSupported !== true) return link(false, null, label, 'unsupported-capability');
        if (request.target.length > TUI_CONTENT_LIMITS.maxLinkTargetBytes) return link(false, null, label, 'oversized-target');
        if (/[\u0000-\u001f\u007f-\u009f\s]/u.test(request.target)) return link(false, null, label, 'unvalidated-reference');
        if (WT_REFERENCE.test(request.target)) return link(true, request.target, label);
        if (!request.target.startsWith('https://') || request.target.length < 'https://a'.length) return link(false, null, label, 'unauthorized-scheme');
        return link(true, request.target, label);
    }

    /** OSC 52 is emitted only for a direct operator copy action, never from rendered content. */
    clipboard(request: TuiClipboardRequest): TuiClipboardDecision {
        if (!request.operatorInitiated) return Object.freeze({emitted: false, payload: null, reason: 'not-operator-initiated'});
        const payload = this.sanitize(request.surface, request.text).text;
        if (Buffer.byteLength(payload, 'utf8') > TUI_CONTENT_LIMITS.maxClipboardBytes) return Object.freeze({emitted: false, payload: null, reason: 'oversized-payload'});
        return Object.freeze({emitted: true, payload});
    }

    /** Bounds extreme text on grapheme boundaries so truncation cannot split a cluster into replacement bytes. */
    private bound(text: string, findings: Set<TuiSanitizerFinding>): string {
        if (text.split(/\s+/u).some((token) => measureTuiCells(token) > TUI_CONTENT_LIMITS.maxTokenCells)) findings.add('oversized-text');
        if (Buffer.byteLength(text, 'utf8') <= this.maxTextBytes) return text;
        findings.add('oversized-text');
        let bounded = '';
        for (const part of new Intl.Segmenter(undefined, {granularity: 'grapheme'}).segment(text)) {
            if (Buffer.byteLength(bounded + part.segment, 'utf8') > this.maxTextBytes - 3) break;
            bounded += part.segment;
        }
        return `${bounded}…`;
    }
}

/** Bytes are decoded non-fatally so malformed UTF-8 is reported and neutralized rather than thrown away. */
function decode(value: unknown, surface: TuiContentSurface, findings: Set<TuiSanitizerFinding>): string {
    if (value instanceof Uint8Array) {
        const text = new TextDecoder('utf-8', {fatal: false}).decode(value);
        if (text.includes('�')) findings.add('malformed-utf8');
        return text.normalize('NFC');
    }
    if (typeof value !== 'string') throw new TuiTerminalError('TERMINAL_CONTENT_INVALID', surface, 'Untrusted content must arrive as text or raw bytes.');
    if (value.includes('�') || /[\ud800-\udfff]/u.test(value)) findings.add('malformed-utf8');
    return value.normalize('NFC').replaceAll(/[\ud800-\udfff]/gu, '�');
}

/**
 * Replaces every escape introducer and its payload with a visible escaped
 * form. The introducer byte itself never survives, so no residual fragment can
 * be reassembled into an executable sequence by a later concatenation.
 */
function escapeSequences(text: string, findings: Set<TuiSanitizerFinding>): string {
    let result = '';
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (character !== ESCAPE && character !== '\u009b' && character !== '\u009d' && character !== '\u0090') { result += character; continue; }
        const introducer = character === ESCAPE ? text[index + 1] ?? '' : character;
        const consumed = sequenceEnd(text, index, character === ESCAPE);
        findings.add(sequenceFinding(introducer, text.slice(index, consumed)));
        if (character !== ESCAPE) findings.add('c1-control');
        result += `␛${text.slice(index + 1, consumed)}`;
        index = consumed - 1;
    }
    return result;
}

function sequenceEnd(text: string, start: number, sevenBit: boolean): number {
    const introducer = sevenBit ? text[start + 1] ?? '' : text[start];
    const body = start + (sevenBit ? 2 : 1);
    if (introducer === '[' || introducer === '\u009b') {
        let index = body;
        while (index < text.length && !/[@-~]/u.test(text[index])) index += 1;
        return Math.min(index + 1, text.length);
    }
    if (introducer === ']' || introducer === '\u009d' || introducer === 'P' || introducer === '\u0090' || introducer === '_' || introducer === '^' || introducer === 'X') {
        const bell = text.indexOf('\u0007', body);
        const stringTerminator = text.indexOf('\u001b\\', body);
        const end = [bell === -1 ? Infinity : bell + 1, stringTerminator === -1 ? Infinity : stringTerminator + 2].reduce((left, right) => Math.min(left, right));
        return end === Infinity ? text.length : end;
    }
    return Math.min(body, text.length);
}

function sequenceFinding(introducer: string, payload: string): TuiSanitizerFinding {
    if (introducer === '[' || introducer === '\u009b') return 'csi-sequence';
    if (introducer === 'P' || introducer === '\u0090' || introducer === 'X') return 'dcs-sequence';
    if (introducer === '_') return 'apc-sequence';
    if (introducer === '^') return 'pm-sequence';
    if (introducer !== ']' && introducer !== '\u009d') return 'device-control';
    const command = /^(?:\u001b\]|\u009d)(\d+)/u.exec(payload)?.[1] ?? '';
    if (command === '52') return 'clipboard-sequence';
    if (command === '8') return 'hyperlink-sequence';
    if (command === '0' || command === '1' || command === '2') return 'title-sequence';
    return 'osc-sequence';
}

/** Newline and tab keep their handled semantics; every other control becomes a visible picture. */
function escapeCharacters(text: string, findings: Set<TuiSanitizerFinding>): string {
    let result = '';
    for (const character of text) {
        const code = character.codePointAt(0) ?? 0;
        if (character === '\n' || character === '\t') { result += character; continue; }
        if (code < 0x20 || code === 0x7f) { findings.add('c0-control'); result += String.fromCodePoint(CONTROL_PICTURE_BASE + (code === 0x7f ? 0x21 : code)); continue; }
        if (code >= 0x80 && code <= 0x9f) { findings.add('c1-control'); result += `<U+${code.toString(16).toUpperCase().padStart(4, '0')}>`; continue; }
        if (BIDI.test(character)) { findings.add('bidi-control'); result += `<U+${code.toString(16).toUpperCase().padStart(4, '0')}>`; continue; }
        result += character;
    }
    return result;
}

/** Renderer-native markup must not create an escape around this boundary. */
function escapeMarkup(text: string, findings: Set<TuiSanitizerFinding>): string {
    return text.replaceAll(MARKUP_TAG, (tag) => { findings.add('markup-interpolation'); return `⟦${tag.slice(1, -1)}⟧`; });
}

function link(emitted: boolean, target: string | null, label: string, reason?: TuiHyperlinkDecision['reason']): TuiHyperlinkDecision {
    return Object.freeze(reason === undefined ? {emitted, target, label} : {emitted, target, label, reason});
}
