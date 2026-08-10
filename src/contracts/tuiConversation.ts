/**
 * Closed contracts for the CA-20 conversation/composer components: the bounded
 * timeline page envelope, the window/composer/completion/reference vocabulary,
 * the finite limits of `tui-operational-experience.md §§5 and 9`, and the
 * closed refusal vocabulary every owned component branches on. Components hold
 * no journal, SQLite, store, provider, or filesystem authority; every byte they
 * present arrives through one of the ports declared here. Normative sources:
 * `tui-operational-experience.md §§5,9`, `tui-interface-contracts.md §CA-20`.
 */
import type {TuiSize} from './tuiAdapter.js';

export const CONVERSATION_REASONS = [
    'CONVERSATION_PAGE_INVALID', 'CONVERSATION_CURSOR_INVALID', 'CONVERSATION_REVISION_STALE', 'COMPOSER_LOCKED',
    'COMPOSER_INPUT_TOO_LARGE', 'COMPOSER_COMMAND_UNKNOWN', 'COMPOSER_COMMAND_INVALID', 'COMPOSER_EMPTY',
    'COMPOSER_EDITOR_UNAVAILABLE', 'COMPOSER_DRAFT_UNRESOLVED', 'COMPLETION_CANCELLED', 'COMPLETION_STALE', 'COMPLETION_QUERY_INVALID',
    'DRAFT_IDENTITY_MISMATCH', 'DRAFT_EXPIRED', 'DRAFT_LIMIT_REACHED', 'DRAFT_CORRUPT', 'DRAFT_DISABLED',
    'REFERENCE_SYNTAX_INVALID', 'REFERENCE_AMBIGUOUS', 'REFERENCE_NOT_FOUND', 'REFERENCE_DENIED',
    'REFERENCE_PATH_ESCAPE', 'REFERENCE_SECRET_DENIED', 'REFERENCE_UNCOMMITTED', 'REFERENCE_TOO_LARGE',
    'REFERENCE_TRANSITIVE_DENIED', 'SEARCH_QUERY_INVALID', 'SEARCH_SCOPE_UNINDEXED', 'SEARCH_CANCELLED'
] as const;
export type ConversationReason = typeof CONVERSATION_REASONS[number];

/** Every refusal an owned conversation/composer component raises; callers branch on `reason`, never message text. */
export class ConversationError extends Error {
    constructor(readonly reason: ConversationReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'ConversationError';
    }
}

/** The finite v1 maxima of `tui-operational-experience.md §§5 and 9`. Preferences may lower, never raise, these. */
export const CONVERSATION_LIMITS = Object.freeze({
    defaultPageSize: 25, maxPageSize: 50, overscanPages: 1, maxCompletionItems: 25,
    maxQueryCharacters: 256, maxSearchResults: 25, maxSearchCandidates: 100, maxExcerptBytes: 512, searchBudgetMs: 250,
    maxComposerBytes: 32768, maxPasteBytes: 32768, pasteCapsuleThreshold: 512,
    maxDrafts: 20, draftTtlMs: 7 * 24 * 60 * 60 * 1000, maxReferenceBytes: 65536,
    historyEntries: 200, historyEntryBytes: 4096, historyTotalBytes: 262144, historyTtlMs: 7 * 24 * 60 * 60 * 1000
});

export type ConversationItemKind = 'turn' | 'proposal' | 'tombstone' | 'provisional';
export type ConversationRole = 'operator' | 'watchtower';
export type ConversationTurnState = 'running' | 'complete' | 'interrupted' | 'failed' | 'cancelled';
export type ConversationTelemetryQuality = 'reported' | 'estimated' | 'unavailable';

export interface ConversationItemBase { readonly itemId: string; readonly sequence: number; }
export interface ConversationTurnItem extends ConversationItemBase {
    readonly kind: 'turn'; readonly turnId: string; readonly operatorSessionId: string; readonly role: ConversationRole;
    readonly state: ConversationTurnState; readonly decisionClass: 'M0' | 'D1' | 'D2' | 'D3' | null; readonly stale: boolean;
    readonly routingRuleId: string | null; readonly endpointId: string | null; readonly snapshotRevision: number | null; readonly completedAt: string | null;
    readonly excerpt: string; readonly excerptBytes: number; readonly originalBytes: number; readonly incomplete: boolean;
    readonly inputTokens: number | null; readonly outputTokens: number | null; readonly telemetryQuality: ConversationTelemetryQuality;
}
export interface ConversationProposalItem extends ConversationItemBase {
    readonly kind: 'proposal'; readonly proposalId: string; readonly proposalType: string; readonly state: string;
    readonly sourceTurnId: string; readonly createdAt: string; readonly expiresAt: string; readonly terminal: boolean;
}
export interface ConversationTombstoneItem extends ConversationItemBase { readonly kind: 'tombstone'; readonly removedTurns: number; readonly reason: 'compaction' | 'privacy-purge'; }
/** The reserved slot CA-22 fills with provisional live-edge content; CA-20 never validates or promotes it. */
export interface ConversationProvisionalItem extends ConversationItemBase { readonly kind: 'provisional'; readonly label: string; readonly validated: false; }
export type ConversationItem = ConversationTurnItem | ConversationProposalItem | ConversationTombstoneItem | ConversationProvisionalItem;

export type ConversationPageDirection = 'older' | 'newer';
export interface ConversationPageRequest { readonly operatorSessionId: string; readonly direction: ConversationPageDirection; readonly cursor: string | null; readonly pageSize: number; }
export interface ConversationPage {
    readonly items: readonly ConversationItem[]; readonly direction: ConversationPageDirection; readonly pageSize: number;
    readonly olderCursor: string | null; readonly newerCursor: string | null;
    readonly revision: number; readonly truncated: boolean; readonly atOldestEdge: boolean; readonly atLiveEdge: boolean;
}
/** The sole bounded read boundary of the timeline; CA-16 owns the index behind it. */
export interface ConversationPagePort { page(request: ConversationPageRequest, signal: AbortSignal): Promise<ConversationPage>; }

export type ConversationWindowEvent =
    | {readonly type: 'viewport'; readonly rows: number} | {readonly type: 'load'; readonly page: ConversationPage}
    | {readonly type: 'scroll'; readonly delta: number} | {readonly type: 'anchor'; readonly itemId: string}
    | {readonly type: 'compact'; readonly removedItemIds: readonly string[]; readonly tombstone: ConversationTombstoneItem};
export interface ConversationWindowState {
    readonly rows: number; readonly overscanRows: number; readonly anchorItemId: string | null; readonly anchorOffset: number;
    readonly retained: number; readonly retainedCap: number; readonly revision: number;
    readonly followLive: boolean; readonly atOldestEdge: boolean; readonly atLiveEdge: boolean;
}
export interface ConversationWindow { reduce(event: ConversationWindowEvent): ConversationWindowState; visible(): readonly ConversationItem[]; }

export interface ConversationItemViewModel {
    readonly itemId: string; readonly kind: ConversationItemKind; readonly role: ConversationRole | null;
    readonly lines: readonly string[]; readonly badges: readonly string[]; readonly accessibleLabel: string;
    readonly stale: boolean; readonly actionable: boolean;
}
/** The shared CA-23 terminal-safety boundary; owned blocks never trust or re-implement it. */
export interface TerminalTextSanitizer { sanitize(text: string): string; }

export type ComposerDraftStatus = 'clean' | 'dirty' | 'recovered' | 'quarantined';
/** Bounded attachment-local paste metadata. The exact payload is owned by `PasteCapsuleStore`, never by this record. */
export interface PasteCapsule { readonly capsuleId: string; readonly bytes: number; readonly lines: number; readonly truncated: boolean; readonly preview: string; readonly reversible: boolean; }
export interface ComposerState {
    readonly text: string; readonly cursor: number; readonly selectionAnchor: number | null; readonly lines: readonly string[];
    readonly byteLength: number; readonly locked: boolean; readonly draftStatus: ComposerDraftStatus;
    readonly capsules: readonly PasteCapsule[]; readonly warning: ConversationReason | null;
}
export type ComposerMotion = 'left' | 'right' | 'up' | 'down' | 'line-start' | 'line-end' | 'word-left' | 'word-right';
export type ComposerIntent =
    | {readonly type: 'insert'; readonly text: string} | {readonly type: 'paste'; readonly text: string}
    | {readonly type: 'move'; readonly motion: ComposerMotion; readonly select?: boolean}
    | {readonly type: 'delete'; readonly unit: 'grapheme' | 'word' | 'line' | 'selection'}
    | {readonly type: 'newline'} | {readonly type: 'submit'} | {readonly type: 'clear'}
    | {readonly type: 'history'; readonly direction: 'previous' | 'next'}
    | {readonly type: 'history-search'; readonly query: string}
    | {readonly type: 'recover'; readonly choice: 'keep' | 'discard'}
    | {readonly type: 'lock'; readonly locked: boolean} | {readonly type: 'expand'; readonly capsuleId: string};
export type ComposerEffect = {readonly type: 'submit'; readonly preflight: ComposerPreflight} | {readonly type: 'draft-save'} | {readonly type: 'draft-delete'} | {readonly type: 'none'};
export interface ComposerTransition { readonly state: ComposerState; readonly effect: ComposerEffect; readonly rejected: ConversationReason | null; }
export type ComposerPreflight =
    | {readonly kind: 'command'; readonly commandId: string; readonly argv: readonly string[]; readonly usesModel: false}
    | {readonly kind: 'message'; readonly text: string; readonly bytes: number; readonly usesModel: true}
    | {readonly kind: 'refusal'; readonly reason: ConversationReason; readonly detail: string; readonly usesModel: false};

export interface SlashCommandDescriptor { readonly commandId: string; readonly name: string; readonly minArgs: number; readonly maxArgs: number; readonly options: readonly string[]; }
export type SlashClassification =
    | {readonly kind: 'known-command'; readonly commandId: string; readonly argv: readonly string[]; readonly usesModel: false}
    | {readonly kind: 'invalid-command'; readonly commandId: string; readonly reason: 'COMPOSER_COMMAND_INVALID'; readonly detail: string; readonly usesModel: false}
    | {readonly kind: 'unknown-command'; readonly name: string; readonly reason: 'COMPOSER_COMMAND_UNKNOWN'; readonly usesModel: false}
    | {readonly kind: 'escaped-text'; readonly text: string; readonly usesModel: true}
    | {readonly kind: 'plain-text'; readonly text: string; readonly usesModel: true};

export type CompletionKind = 'command' | 'option' | 'session' | 'reference';
export interface CompletionRequest { readonly kind: CompletionKind; readonly query: string; readonly revision: number; readonly limit: number; }
export interface CompletionItem { readonly value: string; readonly label: string; readonly detail: string | null; }
export interface CompletionPage { readonly items: readonly CompletionItem[]; readonly kind: CompletionKind; readonly revision: number; readonly truncated: boolean; }
export interface CompletionPort { complete(request: CompletionRequest, signal: AbortSignal): Promise<CompletionPage>; }

export type ReferenceKind = 'batch' | 'event' | 'finding' | 'requirement' | 'turn' | 'session' | 'file';
export interface ExplicitReference { readonly refKind: ReferenceKind; readonly value: string; readonly raw: string; }
export interface ReferenceResolution {
    readonly reference: ExplicitReference; readonly title: string; readonly excerpt: string; readonly excerptBytes: number;
    readonly revision: number; readonly stale: boolean; readonly authorized: true; readonly transitive: false;
}
/** Accepted resolvers own authorization, canonical paths, symlink escape, and secret classification. */
export interface ReferenceResolutionPort { resolve(reference: ExplicitReference, signal: AbortSignal): Promise<ReferenceResolution>; }

export interface TimelineSearchHit { readonly itemId: string; readonly sequence: number; readonly excerpt: string; readonly excerptBytes: number; readonly truncated: boolean; }
export interface TimelineSearchPage {
    readonly hits: readonly TimelineSearchHit[]; readonly scope: 'session-timeline-index'; readonly revision: number; readonly stale: boolean;
    readonly truncated: boolean; readonly nextCursor: string | null; readonly examined: number; readonly usedModel: false;
}

export interface ComposerDraftIdentity { readonly laneId: string; readonly operatorSessionId: string; readonly attachmentOwner: string; }
export interface ComposerDraftRecord extends ComposerDraftIdentity { readonly schemaVersion: 1; readonly text: string; readonly updatedAt: string; readonly byteLength: number; readonly checksum: string; }
export type DraftRecoveryStatus = 'none' | 'recovered' | 'quarantined' | 'disabled';
export interface DraftRecovery { readonly status: DraftRecoveryStatus; readonly record: ComposerDraftRecord | null; readonly reason: ConversationReason | null; }
export interface DraftPruneResult { readonly expired: number; readonly remaining: number; readonly blocked: boolean; readonly temporaryRemoved: number; readonly historyPurged: number; }
/** Bounded operator-local draft/history cache; never authoritative, never journal or model input. */
export interface ComposerDraftCache {
    load(identity: ComposerDraftIdentity): Promise<DraftRecovery>;
    save(identity: ComposerDraftIdentity, text: string): Promise<DraftRecovery>;
    discard(identity: ComposerDraftIdentity): Promise<void>;
    historyPrevious(identity: ComposerDraftIdentity): string | null;
    historyNext(identity: ComposerDraftIdentity): string | null;
    historyReset(identity: ComposerDraftIdentity): void;
    historySearch(identity: ComposerDraftIdentity, query: string): readonly string[];
    remember(identity: ComposerDraftIdentity, text: string): void;
}
export interface EditorDelegationCapability { edit(text: string, signal: AbortSignal): Promise<string>; }

/**
 * Normalize an operator- or caller-supplied limit against a hard maximum.
 * Preferences may lower a v1 maximum but never raise it, and a non-finite,
 * negative, `NaN`, or non-numeric value is not a lowered preference: it falls
 * back to the hard maximum instead of silently disabling the bound.
 */
export function boundedLimit(value: unknown, hardMaximum: number, minimum = 0): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) return hardMaximum;
    return Math.min(Math.floor(value), hardMaximum);
}

/** Split into grapheme clusters so cursor motion, deletion, and truncation never split a combining sequence. */
export function conversationGraphemes(text: string): readonly string[] {
    const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'});
    return Object.freeze([...segmenter.segment(text.normalize('NFC'))].map((part) => part.segment));
}

export function utf8Bytes(text: string): number { return new TextEncoder().encode(text).length; }

/** Truncate on a grapheme boundary at or below a byte budget; never emits a partial code point. */
export function boundedExcerpt(text: string, maxBytes: number): {readonly excerpt: string; readonly bytes: number; readonly truncated: boolean} {
    if (utf8Bytes(text) <= maxBytes) return Object.freeze({excerpt: text, bytes: utf8Bytes(text), truncated: false});
    let excerpt = '';
    for (const grapheme of conversationGraphemes(text)) {
        if (utf8Bytes(excerpt + grapheme) > maxBytes) break;
        excerpt += grapheme;
    }
    return Object.freeze({excerpt, bytes: utf8Bytes(excerpt), truncated: true});
}

/**
 * The exact slash matrix: a known command, a known command used illegally, an unknown `/word`,
 * the `//` natural-language escape, and embedded slash text. Only the last two may become a paid turn.
 */
export function classifySlashInput(text: string, known: readonly SlashCommandDescriptor[]): SlashClassification {
    if (text.startsWith('//')) return Object.freeze({kind: 'escaped-text', text: text.slice(1), usesModel: true});
    if (!text.startsWith('/')) return Object.freeze({kind: 'plain-text', text, usesModel: true});
    const argv = text.slice(1).split(/\s+/u).filter((part) => part.length > 0);
    const name = argv[0] ?? '';
    const descriptor = known.find((candidate) => candidate.name === name);
    if (!descriptor) return Object.freeze({kind: 'unknown-command', name, reason: 'COMPOSER_COMMAND_UNKNOWN', usesModel: false});
    const rest = Object.freeze(argv.slice(1));
    const options = rest.filter((part) => part.startsWith('--')).map((part) => part.split('=')[0]);
    const unknownOption = options.find((option) => !descriptor.options.includes(option));
    const positional = rest.filter((part) => !part.startsWith('--')).length;
    if (unknownOption) return invalidCommand(descriptor.commandId, `unknown option ${unknownOption}`);
    if (positional < descriptor.minArgs || positional > descriptor.maxArgs) return invalidCommand(descriptor.commandId, `expects ${descriptor.minArgs}-${descriptor.maxArgs} arguments`);
    return Object.freeze({kind: 'known-command', commandId: descriptor.commandId, argv: rest, usesModel: false});
}

function invalidCommand(commandId: string, detail: string): SlashClassification {
    return Object.freeze({kind: 'invalid-command', commandId, reason: 'COMPOSER_COMMAND_INVALID', detail, usesModel: false});
}

/** Rows a conversation region offers a timeline once the composer and its frame are subtracted. */
export function timelineRows(size: TuiSize, composerRows: number): number { return Math.max(0, size.rows - Math.max(1, composerRows) - 2); }

/** Grapheme-index target of one composer motion; the caller owns selection and never sees a code-unit offset. */
export function composerMotionTarget(graphemes: readonly string[], cursor: number, motion: ComposerMotion): number {
    const lineStart = graphemes.lastIndexOf('\n', cursor - 1) + 1;
    const lineEnd = indexOrEnd(graphemes, cursor);
    if (motion === 'left') return Math.max(0, cursor - 1);
    if (motion === 'right') return Math.min(graphemes.length, cursor + 1);
    if (motion === 'line-start') return lineStart;
    if (motion === 'line-end') return lineEnd;
    if (motion === 'word-left') return wordBoundary(graphemes, cursor, -1);
    if (motion === 'word-right') return wordBoundary(graphemes, cursor, 1);
    const column = cursor - lineStart;
    if (motion === 'up') return lineStart === 0 ? 0 : Math.min(graphemes.lastIndexOf('\n', lineStart - 2) + 1 + column, lineStart - 1);
    if (lineEnd === graphemes.length) return lineEnd;
    return Math.min(lineEnd + 1 + column, indexOrEnd(graphemes, lineEnd + 1));
}

/** The half-open grapheme range one delete intent removes; a live selection always wins over the unit. */
export function composerDeleteRange(graphemes: readonly string[], cursor: number, anchor: number | null, unit: 'grapheme' | 'word' | 'line' | 'selection'): readonly [number, number] {
    const from = anchor === null ? cursor : Math.min(anchor, cursor);
    const to = anchor === null ? cursor : Math.max(anchor, cursor);
    if (unit === 'selection' || from !== to) return Object.freeze([from, to]);
    if (unit === 'grapheme') return Object.freeze([Math.max(0, cursor - 1), cursor]);
    if (unit === 'line') return Object.freeze([graphemes.lastIndexOf('\n', cursor - 1) + 1, cursor]);
    return Object.freeze([wordBoundary(graphemes, cursor, -1), cursor]);
}

export interface ComposerPreflightInput {
    readonly text: string; readonly commands: readonly SlashCommandDescriptor[]; readonly locked: boolean;
    readonly draftStatus: ComposerDraftStatus; readonly maxBytes: number; readonly expand: (text: string) => string;
}

/**
 * The closed turn-intention decision: exactly one deterministic command, one
 * bounded natural-language turn, or one typed refusal. It invokes nothing, and
 * an unknown or invalid command can never become a paid turn. A submitted turn
 * carries the exact bounded pasted content, so capsule placeholders are
 * expanded through the caller's payload owner before the bytes are counted.
 */
export function composerPreflight(input: ComposerPreflightInput): ComposerPreflight {
    if (input.locked) return preflightRefusal('COMPOSER_LOCKED', 'The session or attachment no longer permits input.');
    if (input.draftStatus === 'recovered') return preflightRefusal('COMPOSER_DRAFT_UNRESOLVED', 'Keep or discard the recovered draft before submitting.');
    if (input.text.trim().length === 0) return preflightRefusal('COMPOSER_EMPTY', 'There is nothing to submit.');
    if (utf8Bytes(input.text) > input.maxBytes) return preflightRefusal('COMPOSER_INPUT_TOO_LARGE', `Input exceeds ${input.maxBytes} bytes.`);
    const classification = classifySlashInput(input.text, input.commands);
    if (classification.kind === 'unknown-command') return preflightRefusal('COMPOSER_COMMAND_UNKNOWN', `Unknown command /${classification.name}.`);
    if (classification.kind === 'invalid-command') return preflightRefusal('COMPOSER_COMMAND_INVALID', classification.detail);
    if (classification.kind === 'known-command') {
        const descriptor = input.commands.find((candidate) => candidate.commandId === classification.commandId);
        if (descriptor?.name !== 'msg') return Object.freeze({kind: 'command', commandId: classification.commandId, argv: classification.argv, usesModel: false});
        const body = input.text.slice(input.text.indexOf(descriptor.name) + descriptor.name.length).trim();
        return body.length === 0 ? preflightRefusal('COMPOSER_EMPTY', 'A /msg turn needs text.') : preflightMessage(input.expand(body), input.maxBytes);
    }
    return preflightMessage(input.expand(classification.text), input.maxBytes);
}

function preflightRefusal(reason: ConversationReason, detail: string): ComposerPreflight {
    return Object.freeze({kind: 'refusal', reason, detail, usesModel: false});
}
function preflightMessage(text: string, maxBytes: number): ComposerPreflight {
    const bytes = utf8Bytes(text);
    return bytes > maxBytes
        ? preflightRefusal('COMPOSER_INPUT_TOO_LARGE', `The expanded turn exceeds ${maxBytes} bytes.`)
        : Object.freeze({kind: 'message', text, bytes, usesModel: true});
}

/**
 * `cli-session.md §10` trailing-backslash continuation: a submit binding pressed on
 * text ending in an odd number of backslashes continues the line instead of submitting.
 */
export function composerContinuation(text: string): boolean {
    const trailing = /\\*$/u.exec(text)?.[0] ?? '';
    return trailing.length % 2 === 1;
}

function indexOrEnd(graphemes: readonly string[], from: number): number { const index = graphemes.indexOf('\n', from); return index < 0 ? graphemes.length : index; }
function wordBoundary(graphemes: readonly string[], cursor: number, step: -1 | 1): number {
    const blank = (at: number): boolean => /\s/u.test(graphemes[at] ?? ' ');
    let at = cursor;
    if (step === -1) {
        while (at > 0 && blank(at - 1)) at -= 1;
        while (at > 0 && !blank(at - 1)) at -= 1;
        return at;
    }
    while (at < graphemes.length && blank(at)) at += 1;
    while (at < graphemes.length && !blank(at)) at += 1;
    return at;
}
