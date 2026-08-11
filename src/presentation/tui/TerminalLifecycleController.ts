import {
    BASELINE_TERMINAL_MODE, FULLSCREEN_TERMINAL_MODE, qualifyTuiPtyTuple, TUI_SIGNALS, TuiTerminalError,
    type TuiInterruptStage, type TuiLifecyclePhase, type TuiPtyQualification, type TuiRestoreOutcome,
    type TuiRestoreReason, type TuiSignalName, type TuiSignalOutcome, type TuiTerminalModeState, type TuiTerminalPort
} from '../../contracts/tuiAccessibility.js';

export interface TerminalLifecycleControllerOptions { readonly port: TuiTerminalPort; readonly entryMode?: TuiTerminalModeState; }

/**
 * The single idempotent owner of raw mode, alternate screen, mouse, bracketed
 * paste, cursor, title, keyboard protocol, and signal handlers
 * (`cli-session.md §13`). No other component may change terminal state.
 *
 * The controller has one collaborator — the terminal port — and therefore no
 * session, lane, journal, or filesystem authority: emergency restoration is
 * structurally incapable of writing durable state. An unpromoted target is
 * refused before any mode byte is written, so a failed qualification leaves
 * the terminal exactly as it was found and `ask`/non-TUI commands usable.
 */
export class TerminalLifecycleController {
    private phase: TuiLifecyclePhase = 'IDLE';
    private mode: TuiTerminalModeState;
    private readonly entry: TuiTerminalModeState;
    private restores = 0;
    /**
     * True from the instant a mode write is handed to the port until that write
     * is verified. A port that mutates the terminal and *then* throws returns no
     * observed state, so the last observed mode is not evidence that the
     * terminal is clean — only this flag is. Restoration must never be skipped
     * while it is set.
     */
    private incompleteApplication = false;

    constructor(private readonly options: TerminalLifecycleControllerOptions) {
        this.entry = options.entryMode ?? BASELINE_TERMINAL_MODE;
        this.mode = this.entry;
    }

    currentPhase(): TuiLifecyclePhase { return this.phase; }
    currentMode(): TuiTerminalModeState { return this.mode; }
    /** Repeated cleanup is safe; this counts only the restorations that actually wrote mode bytes. */
    appliedRestoreCount(): number { return this.restores; }

    /** Qualifies the runtime tuple first; only a promoted tuple reaches alternate-screen entry. */
    enter(runtimeTuple: unknown): TuiPtyQualification {
        if (this.phase !== 'IDLE' && this.phase !== 'RESTORED') throw new TuiTerminalError('TERMINAL_LIFECYCLE_INVALID', this.phase, 'Full-screen entry is only valid from an idle or restored terminal.');
        const qualification = qualifyTuiPtyTuple(runtimeTuple);
        if (!qualification.promoted) { this.phase = 'FAILED'; return qualification; }
        this.phase = 'ENTERING';
        try {
            this.apply(FULLSCREEN_TERMINAL_MODE, 'startup-failure');
        } catch (error) {
            this.restore('startup-failure');
            this.phase = 'FAILED';
            throw error;
        }
        this.phase = 'ACTIVE';
        return qualification;
    }

    /**
     * Restores the discovered entry state. It is idempotent: a second call on
     * an already-restored terminal reports `applied: false` and writes nothing.
     * Emergency reasons never throw, because a failing restore must not mask
     * the original crash.
     */
    restore(reason: TuiRestoreReason): TuiRestoreOutcome {
        const emergency = EMERGENCY_REASONS.includes(reason);
        if (!this.incompleteApplication && sameMode(this.mode, this.entry)) {
            if (this.phase === 'ACTIVE' || this.phase === 'ENTERING' || this.phase === 'SUSPENDED') this.phase = 'RESTORED';
            return outcome(reason, this.phase, false, this.mode, emergency, false);
        }
        try {
            this.apply(this.entry, reason);
        } catch (error) {
            if (!emergency) throw error;
            this.phase = 'FAILED';
            return outcome(reason, this.phase, false, this.mode, true, true);
        }
        this.restores += 1;
        this.phase = 'RESTORED';
        return outcome(reason, this.phase, true, this.mode, emergency, false);
    }

    /** Restores modes before the process stops, so a suspended terminal is never left in raw/alternate state. */
    suspend(): TuiSignalOutcome {
        if (this.phase !== 'ACTIVE') throw new TuiTerminalError('TERMINAL_LIFECYCLE_INVALID', this.phase, 'Only an active full-screen attachment can suspend.');
        this.apply(this.entry, 'suspend');
        this.restores += 1;
        this.phase = 'SUSPENDED';
        return signalOutcome('SIGTSTP', 'restore-and-suspend', true, false);
    }

    /** Re-enters full-screen mode and redraws verified current state after SIGCONT. */
    resume(): TuiSignalOutcome {
        if (this.phase !== 'SUSPENDED') throw new TuiTerminalError('TERMINAL_LIFECYCLE_INVALID', this.phase, 'Only a suspended attachment can resume.');
        this.apply(FULLSCREEN_TERMINAL_MODE, 'render-error');
        this.phase = 'ACTIVE';
        return signalOutcome('SIGCONT', 'redraw', false, true);
    }

    /** Routes one signal to its exact `cli-session.md §13` semantics. */
    signal(name: TuiSignalName, stage: TuiInterruptStage = 'editing'): TuiSignalOutcome {
        if (!TUI_SIGNALS.includes(name)) throw new TuiTerminalError('TERMINAL_LIFECYCLE_INVALID', String(name), 'The signal is outside the handled signal set.');
        if (name === 'SIGTSTP') return this.suspend();
        if (name === 'SIGCONT') return this.resume();
        if (name === 'SIGWINCH') return signalOutcome('SIGWINCH', 'resize', false, true);
        if (name === 'SIGINT') return this.interrupt('CTRL_C', stage);
        const reason: TuiRestoreReason = name === 'SIGHUP' ? 'sighup' : 'sigterm';
        this.restore(reason);
        return signalOutcome(name, name === 'SIGHUP' ? 'terminal-loss' : 'exit', this.phase === 'RESTORED', false);
    }

    /** Ctrl-C and Ctrl-D semantics; neither closes the durable session or accepts provisional output. */
    interrupt(key: 'CTRL_C' | 'CTRL_D', stage: TuiInterruptStage, composerEmpty = true): TuiSignalOutcome {
        if (key === 'CTRL_D') return signalOutcome('CTRL_D', composerEmpty ? 'detach' : 'ignored', false, false);
        return signalOutcome('CTRL_C', CTRL_C_ACTIONS[stage], false, false);
    }

    /**
     * The only path that writes terminal modes. The write is marked incomplete
     * before the port is called, so a port that mutates state and then throws
     * leaves the controller knowing the terminal may be dirty even though no
     * observed state came back.
     */
    private apply(next: TuiTerminalModeState, failureReason: TuiRestoreReason): void {
        this.incompleteApplication = true;
        const observed = validateModeState(this.options.port.apply(next));
        if (!sameMode(observed, next)) {
            this.mode = observed;
            throw new TuiTerminalError('TERMINAL_RESTORE_FAILED', failureReason, 'The terminal did not report the requested mode state.');
        }
        this.mode = observed;
        this.incompleteApplication = false;
    }
}

/** Reasons whose restoration must never throw over the failure that caused it. */
const EMERGENCY_REASONS: readonly TuiRestoreReason[] = Object.freeze(['startup-failure', 'render-error', 'uncaught-error', 'renderer-failure', 'terminal-loss']);

const CTRL_C_ACTIONS: Readonly<Record<TuiInterruptStage, TuiSignalOutcome['action']>> = Object.freeze({
    editing: 'clear-input', preflight: 'abort-preflight', invoking: 'interrupt-turn', confirming: 'reject-confirmation'
});

function outcome(reason: TuiRestoreReason, phase: TuiLifecyclePhase, applied: boolean, mode: TuiTerminalModeState, emergency: boolean, restorationFailed: boolean): TuiRestoreOutcome {
    return Object.freeze({reason, phase, applied, mode, emergency, restorationFailed, wroteDurableState: false});
}
function signalOutcome(signal: TuiSignalOutcome['signal'], action: TuiSignalOutcome['action'], restored: boolean, redrawn: boolean): TuiSignalOutcome {
    return Object.freeze({signal, action, restored, redrawn, closesSession: false, acceptsProvisionalAsFinal: false});
}
function sameMode(left: TuiTerminalModeState, right: TuiTerminalModeState): boolean {
    return left.rawMode === right.rawMode && left.alternateScreen === right.alternateScreen && left.mouse === right.mouse
        && left.bracketedPaste === right.bracketedPaste && left.cursorVisible === right.cursorVisible
        && left.keyboardProtocol === right.keyboardProtocol && left.title === right.title
        && left.signalHandlers.length === right.signalHandlers.length && left.signalHandlers.every((item, index) => item === right.signalHandlers[index]);
}

/** The port reports observed terminal state as `unknown`; it is validated before it becomes lifecycle truth. */
export function validateModeState(value: unknown): TuiTerminalModeState {
    const invalid = (detail: string): never => { throw new TuiTerminalError('TERMINAL_MODE_INVALID', 'terminal-mode', detail); };
    if (typeof value !== 'object' || value === null || Object.getPrototypeOf(value) !== Object.prototype) return invalid('The observed terminal mode is not a closed mode envelope.');
    const record = value as Record<string, unknown>;
    const keys = ['rawMode', 'alternateScreen', 'mouse', 'bracketedPaste', 'cursorVisible', 'keyboardProtocol', 'title', 'signalHandlers'];
    if (Object.keys(record).length !== keys.length || !keys.every((key) => key in record)) return invalid('The observed terminal mode does not carry exactly the contract keys.');
    if (keys.slice(0, 6).some((key) => typeof record[key] !== 'boolean')) return invalid('A terminal mode flag is not a boolean.');
    if (record.title !== null && typeof record.title !== 'string') return invalid('The terminal title is neither a string nor null.');
    if (!Array.isArray(record.signalHandlers) || record.signalHandlers.some((item) => !TUI_SIGNALS.includes(item as TuiSignalName))) return invalid('An installed signal handler is outside the handled signal set.');
    return Object.freeze({...record, signalHandlers: Object.freeze([...record.signalHandlers as TuiSignalName[]])}) as TuiTerminalModeState;
}
