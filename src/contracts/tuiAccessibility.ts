/**
 * Closed contracts for the CA-23 boundary: the idempotent terminal
 * lifecycle/restoration owner of `cli-session.md §13`, the untrusted
 * terminal-content rules of `cli-session.md §14.5`, the accessibility and
 * degradation rules of `cli-session.md §14.3`, the preference/cache
 * compatibility rules of `tui-operational-experience.md §10`, the visual
 * acceptance catalog of `tui-operational-experience.md §11`, and the exact
 * promoted platform/PTY matrix of `tui-operational-experience.md §2`.
 *
 * This module is type vocabulary plus closed constant tables. It holds no
 * terminal, filesystem, session, or lane authority: every byte reaching an
 * owned component arrives through a port declared here and is `unknown` until
 * validated into this vocabulary. The promoted matrix here never widens the
 * CA-18 `PROMOTED_TUI_TARGET`; `reconcileTuiPtyMatrix` proves the two agree.
 */
import {PROMOTED_TUI_NATIVE_INTEGRITY, PROMOTED_TUI_TARGET, TUI_ENGINE_PACKAGES, type TuiRuntimeTarget} from './tuiAdapter.js';
import type {TuiColorMode} from './tuiShell.js';

/** Every refusal an owned CA-23 component raises; callers branch on `reason`, never message text. */
export const TUI_TERMINAL_REASONS = [
    'TERMINAL_MODE_INVALID', 'TERMINAL_LIFECYCLE_INVALID', 'TERMINAL_RESTORE_FAILED', 'TERMINAL_TARGET_UNPROMOTED',
    'TERMINAL_MATRIX_REDUCED', 'TERMINAL_CONTENT_INVALID', 'TERMINAL_LINK_REJECTED', 'TERMINAL_CLIPBOARD_UNAUTHORIZED',
    'TERMINAL_CATALOG_STATE_UNKNOWN', 'PREFERENCE_MIGRATION_FAILED', 'PREFERENCE_SCHEMA_UNSUPPORTED', 'CACHE_ENTRY_INCOMPATIBLE'
] as const;
export type TuiTerminalReason = typeof TUI_TERMINAL_REASONS[number];
export class TuiTerminalError extends Error {
    constructor(readonly reason: TuiTerminalReason, readonly subject: string, message: string) { super(message); this.name = 'TuiTerminalError'; }
}

/** The complete terminal mode surface one owner may change (`cli-session.md §13`). */
export interface TuiTerminalModeState {
    readonly rawMode: boolean; readonly alternateScreen: boolean; readonly mouse: boolean; readonly bracketedPaste: boolean;
    readonly cursorVisible: boolean; readonly keyboardProtocol: boolean; readonly title: string | null; readonly signalHandlers: readonly TuiSignalName[];
}
/** The state a terminal must be left in by every restoration path. */
export const BASELINE_TERMINAL_MODE: TuiTerminalModeState = Object.freeze({
    rawMode: false, alternateScreen: false, mouse: false, bracketedPaste: false,
    cursorVisible: true, keyboardProtocol: false, title: null, signalHandlers: Object.freeze([])
});
/** The full-screen mode entered by exactly one owner. */
export const FULLSCREEN_TERMINAL_MODE: TuiTerminalModeState = Object.freeze({
    rawMode: true, alternateScreen: true, mouse: true, bracketedPaste: true, cursorVisible: false,
    keyboardProtocol: true, title: 'Watchtower', signalHandlers: Object.freeze(['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGWINCH', 'SIGTSTP', 'SIGCONT'] as const)
});

/** The sole terminal effect boundary of the owned lifecycle controller. */
export interface TuiTerminalPort {
    /** Applies one complete mode state; the port reports the observed state back as `unknown`. */
    apply(state: TuiTerminalModeState): unknown;
    /** Writes an already-sanitized fallback diagnostic after restoration. */
    writeDiagnostic(text: string): void;
}

export const TUI_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGWINCH', 'SIGTSTP', 'SIGCONT'] as const;
export type TuiSignalName = typeof TUI_SIGNALS[number];
export type TuiLifecyclePhase = 'IDLE' | 'ENTERING' | 'ACTIVE' | 'SUSPENDED' | 'RESTORED' | 'FAILED';
export const TUI_RESTORE_REASONS = [
    'normal-exit', 'startup-failure', 'render-error', 'uncaught-error', 'sighup', 'sigint',
    'sigterm', 'terminal-loss', 'suspend', 'renderer-failure'
] as const;
export type TuiRestoreReason = typeof TUI_RESTORE_REASONS[number];
/**
 * Restoration outcome. `wroteDurableState` is structurally false because the
 * owner holds no session or lane port. `applied` means baseline bytes were
 * written and verified; `restorationFailed` reports distinctly that a
 * best-effort baseline attempt was made and did not verify, which is not the
 * same as "nothing needed to be done".
 */
export interface TuiRestoreOutcome {
    readonly reason: TuiRestoreReason; readonly phase: TuiLifecyclePhase; readonly applied: boolean;
    readonly mode: TuiTerminalModeState; readonly emergency: boolean; readonly restorationFailed: boolean;
    readonly wroteDurableState: false;
}

/** The composer/turn stage a Ctrl-C is delivered in (`cli-session.md §13`). */
export type TuiInterruptStage = 'editing' | 'preflight' | 'invoking' | 'confirming';
export type TuiSignalAction =
    | 'clear-input' | 'abort-preflight' | 'interrupt-turn' | 'reject-confirmation' | 'detach'
    | 'ignored' | 'restore-and-suspend' | 'redraw' | 'resize' | 'terminal-loss' | 'exit';
/** Every signal/key outcome preserves the durable session and never promotes provisional output. */
export interface TuiSignalOutcome {
    readonly signal: TuiSignalName | 'CTRL_C' | 'CTRL_D'; readonly action: TuiSignalAction;
    readonly restored: boolean; readonly redrawn: boolean; readonly closesSession: false; readonly acceptsProvisionalAsFinal: false;
}

/** Untrusted-content surfaces; the same sanitization applies to every one of them. */
export const TUI_CONTENT_SURFACES = ['timeline', 'composer', 'inspector', 'overlay', 'toast', 'error', 'copy', 'debug'] as const;
export type TuiContentSurface = typeof TUI_CONTENT_SURFACES[number];
export const TUI_SANITIZER_FINDINGS = [
    'c0-control', 'c1-control', 'csi-sequence', 'osc-sequence', 'dcs-sequence', 'apc-sequence', 'pm-sequence',
    'device-control', 'title-sequence', 'clipboard-sequence', 'hyperlink-sequence', 'bidi-control',
    'malformed-utf8', 'markup-interpolation', 'oversized-text'
] as const;
export type TuiSanitizerFinding = typeof TUI_SANITIZER_FINDINGS[number];
export interface TuiSanitizedText {
    readonly surface: TuiContentSurface; readonly text: string; readonly findings: readonly TuiSanitizerFinding[];
    readonly truncated: boolean; readonly cells: number;
}
export interface TuiHyperlinkDecision {
    readonly emitted: boolean; readonly target: string | null; readonly label: string;
    readonly reason?: 'unvalidated-reference' | 'unauthorized-scheme' | 'oversized-target' | 'accessible-mode' | 'unsupported-capability';
}
/** OSC 52 is reachable only from a direct operator copy action. */
export interface TuiClipboardRequest { readonly operatorInitiated: boolean; readonly surface: TuiContentSurface; readonly text: string; }
export interface TuiClipboardDecision { readonly emitted: boolean; readonly payload: string | null; readonly reason?: 'not-operator-initiated' | 'oversized-payload'; }

export const TUI_CONTENT_LIMITS = Object.freeze({maxTextBytes: 16384, maxTokenCells: 512, maxLinkTargetBytes: 2048, maxClipboardBytes: 8192, maxAnnouncements: 200});

/** Semantic states that must remain distinguishable without color, icons, mouse, or hyperlinks. */
export const TUI_SEMANTIC_STATES = ['focus', 'selection', 'provisional', 'stale', 'disabled', 'success', 'failure', 'progress', 'attention'] as const;
export type TuiSemanticState = typeof TUI_SEMANTIC_STATES[number];
export const TUI_SEMANTIC_STATE_LABELS: Readonly<Record<TuiSemanticState, string>> = Object.freeze({
    focus: '[focused]', selection: '[selected]', provisional: '[provisional]', stale: '[stale]', disabled: '[disabled]',
    success: '[ok]', failure: '[failed]', progress: '[working]', attention: '[attention]'
});
export interface TuiAccessibleRegion { readonly id: string; readonly title: string; readonly focusOrder: number; readonly focused: boolean; readonly lines: readonly string[]; readonly states: readonly TuiSemanticState[]; }
export interface TuiAnnouncement { readonly sequence: number; readonly text: string; readonly states: readonly TuiSemanticState[]; }
export interface TuiAccessibleView {
    readonly regions: readonly TuiAccessibleRegion[]; readonly announcements: readonly TuiAnnouncement[];
    readonly linearFocusOrder: readonly string[]; readonly restrainedRedraw: boolean; readonly animated: boolean; readonly usesColor: boolean;
}

export type TuiPtyInvocation = 'local' | 'tmux' | 'ssh' | 'ssh+tmux';
export type TuiInstallPath = 'source' | 'global-install';
export interface TuiPtyTuple {
    readonly emulator: string; readonly termFamily: string; readonly colorTier: TuiColorMode; readonly invocation: TuiPtyInvocation;
    readonly tmuxVersion: string | null; readonly sshMode: 'none' | 'direct'; readonly locale: string; readonly os: string; readonly cpu: string;
    readonly libc: string; readonly nodeVersion: string; readonly opentuiVersion: string; readonly nativeIntegrity: string; readonly installPath: TuiInstallPath;
}
const OPENTUI_VERSION = TUI_ENGINE_PACKAGES[0].version;
function tuple(emulator: string, termFamily: string, colorTier: TuiColorMode, invocation: TuiPtyInvocation, tmuxVersion: string | null, sshMode: 'none' | 'direct', installPath: TuiInstallPath): TuiPtyTuple {
    return Object.freeze({
        emulator, termFamily, colorTier, invocation, tmuxVersion, sshMode, locale: 'C.UTF-8',
        os: PROMOTED_TUI_TARGET.os, cpu: PROMOTED_TUI_TARGET.cpu, libc: PROMOTED_TUI_TARGET.libc,
        nodeVersion: '26.4.0', opentuiVersion: OPENTUI_VERSION, nativeIntegrity: PROMOTED_TUI_NATIVE_INTEGRITY, installPath
    });
}
/** The exact promoted matrix. A tuple outside this table is unsupported and fails closed before alternate-screen entry. */
export const PROMOTED_TUI_PTY_MATRIX: readonly TuiPtyTuple[] = Object.freeze([
    tuple('xterm', 'xterm-256color', 'truecolor', 'local', null, 'none', 'source'),
    tuple('xterm', 'xterm-256color', 'truecolor', 'local', null, 'none', 'global-install'),
    tuple('tmux', 'tmux-256color', '256', 'tmux', '3.4', 'none', 'source'),
    tuple('tmux', 'tmux-256color', '256', 'tmux', '3.4', 'none', 'global-install'),
    tuple('xterm', 'xterm-256color', '256', 'ssh', null, 'direct', 'source'),
    tuple('xterm', 'xterm-256color', '256', 'ssh', null, 'direct', 'global-install'),
    tuple('tmux', 'tmux-256color', '256', 'ssh+tmux', '3.4', 'direct', 'source'),
    tuple('tmux', 'tmux-256color', '256', 'ssh+tmux', '3.4', 'direct', 'global-install')
]);
export type TuiPtyQualification =
    | {readonly promoted: true; readonly tuple: TuiPtyTuple}
    | {readonly promoted: false; readonly reason: TuiTerminalReason; readonly detail: string; readonly remediation: string; readonly nonTuiCommandsPreserved: true; readonly fetchesArtifacts: false};

/** Qualifies an `unknown` runtime tuple against the promoted matrix before any terminal mode changes. */
export function qualifyTuiPtyTuple(value: unknown): TuiPtyQualification {
    if (!isRecord(value)) return unpromoted('The runtime tuple is not a closed tuple envelope.');
    const match = PROMOTED_TUI_PTY_MATRIX.find((candidate) => PTY_KEYS.every((key) => value[key] === candidate[key]));
    if (!match) return unpromoted(`No promoted tuple matches ${describeTuple(value)}.`);
    if (Object.keys(value).length !== PTY_KEYS.length) return unpromoted('The runtime tuple carries keys outside the promoted tuple contract.');
    return {promoted: true, tuple: match};
}
const PTY_KEYS: readonly (keyof TuiPtyTuple)[] = Object.freeze([
    'emulator', 'termFamily', 'colorTier', 'invocation', 'tmuxVersion', 'sshMode', 'locale', 'os', 'cpu', 'libc', 'nodeVersion', 'opentuiVersion', 'nativeIntegrity', 'installPath'
]);
function describeTuple(value: Record<string, unknown>): string {
    return `${String(value.emulator ?? 'unknown-emulator')}/${String(value.termFamily ?? 'unknown-term')}/${String(value.invocation ?? 'unknown-invocation')}/${String(value.installPath ?? 'unknown-install')}`;
}
function unpromoted(detail: string): TuiPtyQualification {
    return Object.freeze({
        promoted: false, reason: 'TERMINAL_TARGET_UNPROMOTED', detail,
        remediation: 'Run `wt doctor --tui` and use a non-TUI command such as `wt coordinator ask`; Watchtower never fetches or repairs native artifacts implicitly.',
        nonTuiCommandsPreserved: true, fetchesArtifacts: false
    });
}

export interface TuiMatrixReconciliation { readonly consistent: boolean; readonly uncoveredTargets: readonly string[]; readonly widenedTuples: readonly string[]; readonly invocations: readonly TuiPtyInvocation[]; }
/** Proves the promoted PTY matrix neither silently reduces nor widens the CA-18 supported-target set. */
export function reconcileTuiPtyMatrix(targets: readonly TuiRuntimeTarget[]): TuiMatrixReconciliation {
    const covers = (target: TuiRuntimeTarget, item: TuiPtyTuple): boolean =>
        target.os === item.os && target.cpu === item.cpu && (target.libc ?? item.libc) === item.libc && target.artifactIntegrity === item.nativeIntegrity;
    const uncoveredTargets = targets.filter((target) => !PROMOTED_TUI_PTY_MATRIX.some((item) => covers(target, item))).map((target) => `${target.os}/${target.cpu}/${target.libc ?? 'unknown-libc'}`);
    const widenedTuples = PROMOTED_TUI_PTY_MATRIX.filter((item) => !targets.some((target) => covers(target, item))).map((item) => `${item.emulator}/${item.invocation}/${item.installPath}`);
    const invocations = Object.freeze([...new Set(PROMOTED_TUI_PTY_MATRIX.map((item) => item.invocation))]);
    return Object.freeze({consistent: uncoveredTargets.length === 0 && widenedTuples.length === 0 && invocations.length === 4, uncoveredTargets: Object.freeze(uncoveredTargets), widenedTuples: Object.freeze(widenedTuples), invocations});
}

/** The `tui-operational-experience.md §11` catalog, one entry per required golden state. */
export const TUI_VISUAL_CATALOG_STATES = Object.freeze([
    'lane-picker', 'no-lane-welcome', 'new-empty-session', 'normal-conversation', 'streaming-live-edge', 'streaming-away-from-live-edge',
    'proposal-confirmation-d2', 'proposal-confirmation-d3', 'proposal-completed', 'route-block', 'budget-block', 'pack-index-block',
    'capability-block', 'stale-state-block', 'session-contention', 'observer-session', 'suspended-session', 'closed-session',
    'session-unavailable', 'inspector-view', 'inspector-agent-stale', 'inspector-agent-empty', 'search-overlay', 'attention-navigation',
    'command-palette', 'details-overlay', 'conflict-overlay', 'recovered-draft', 'paste-over-limit', 'no-color', 'high-contrast',
    'reduced-motion', 'accessible-append-only', 'unicode-stress', 'unusable-dimension-recovery', 'renderer-failure-restored'
] as const);
export type TuiVisualCatalogState = typeof TUI_VISUAL_CATALOG_STATES[number];
export type TuiCatalogDimension = 'wide' | 'standard' | 'narrow';
/** Declared catalog dimensions; each one resolves to the matching CA-19 layout mode. */
export const TUI_CATALOG_DIMENSIONS: Readonly<Record<TuiCatalogDimension, {readonly columns: number; readonly rows: number}>> = Object.freeze({
    wide: Object.freeze({columns: 140, rows: 40}), standard: Object.freeze({columns: 100, rows: 30}), narrow: Object.freeze({columns: 70, rows: 20})
});

/** `tui-operational-experience.md §10` retention and cache bounds. */
export const TUI_MIGRATION_LIMITS = Object.freeze({maxPreferenceBackups: 3, maxPreferenceBackupAgeDays: 30, maxDerivedCacheBytes: 67108864});
export interface TuiCacheEntryIdentity { readonly cliVersion: string; readonly rendererContractRevision: string; readonly cacheSchemaVersion: number; readonly sourceDigest: string; }
export interface TuiCacheDecision { readonly usable: boolean; readonly reason?: 'identity-mismatch' | 'digest-mismatch' | 'schema-unsupported' | 'corrupt'; readonly rebuildsLazily: true; readonly deletesDurableState: false; }

/** A derived cache entry is disposable: an incompatible entry is ignored and rebuilt, never repaired in place. */
export function qualifyTuiCacheEntry(candidate: unknown, expected: TuiCacheEntryIdentity): TuiCacheDecision {
    if (!isRecord(candidate)) return cacheDecision(false, 'corrupt');
    const keys: (keyof TuiCacheEntryIdentity)[] = ['cliVersion', 'rendererContractRevision', 'cacheSchemaVersion', 'sourceDigest'];
    if (keys.some((key) => typeof candidate[key] !== typeof expected[key])) return cacheDecision(false, 'corrupt');
    if (candidate.cacheSchemaVersion !== expected.cacheSchemaVersion) return cacheDecision(false, 'schema-unsupported');
    if (candidate.cliVersion !== expected.cliVersion || candidate.rendererContractRevision !== expected.rendererContractRevision) return cacheDecision(false, 'identity-mismatch');
    if (candidate.sourceDigest !== expected.sourceDigest) return cacheDecision(false, 'digest-mismatch');
    return cacheDecision(true);
}
function cacheDecision(usable: boolean, reason?: TuiCacheDecision['reason']): TuiCacheDecision {
    return Object.freeze(reason === undefined ? {usable, rebuildsLazily: true, deletesDurableState: false} : {usable, reason, rebuildsLazily: true, deletesDurableState: false});
}

export interface TuiPreferenceBackup { readonly id: string; readonly createdAtMs: number; }
export interface TuiBackupRetention { readonly retained: readonly string[]; readonly pruned: readonly string[]; }
/** At most three preference backups, none older than thirty days; drafts and preferences are never pruned here. */
export function retainPreferenceBackups(backups: readonly TuiPreferenceBackup[], nowMs: number): TuiBackupRetention {
    const maxAgeMs = TUI_MIGRATION_LIMITS.maxPreferenceBackupAgeDays * 86400000;
    const fresh = [...backups].filter((backup) => nowMs - backup.createdAtMs <= maxAgeMs).sort((left, right) => right.createdAtMs - left.createdAtMs);
    const retained = fresh.slice(0, TUI_MIGRATION_LIMITS.maxPreferenceBackups).map((backup) => backup.id);
    return Object.freeze({retained: Object.freeze(retained), pruned: Object.freeze(backups.filter((backup) => !retained.includes(backup.id)).map((backup) => backup.id))});
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
