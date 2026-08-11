import type {TuiTerminalModeState, TuiTerminalPort} from '../../../src/contracts/tuiAccessibility.js';

/**
 * CA-23 test adapters for the single terminal effect boundary.
 *
 * `AnsiTerminalPort` writes the real control sequences to a real PTY so
 * before/after terminal bytes can be asserted from captured output.
 * `RecordingTerminalPort` keeps the same contract in memory for deterministic
 * state-machine specs, and `HostileTerminalPort` reports a mode the terminal
 * did not actually enter, which is the startup-failure case.
 */
export const ANSI = Object.freeze({
    alternateScreenOn: '\u001b[?1049h', alternateScreenOff: '\u001b[?1049l',
    mouseOn: '\u001b[?1000h', mouseOff: '\u001b[?1000l',
    bracketedPasteOn: '\u001b[?2004h', bracketedPasteOff: '\u001b[?2004l',
    cursorHide: '\u001b[?25l', cursorShow: '\u001b[?25h',
    keyboardProtocolOn: '\u001b[>1u', keyboardProtocolOff: '\u001b[<u'
});

export class AnsiTerminalPort implements TuiTerminalPort {
    constructor(private readonly write: (text: string) => void, private readonly setRawMode: (raw: boolean) => void) {}
    apply(state: TuiTerminalModeState): unknown {
        this.setRawMode(state.rawMode);
        this.write(state.alternateScreen ? ANSI.alternateScreenOn : ANSI.alternateScreenOff);
        this.write(state.mouse ? ANSI.mouseOn : ANSI.mouseOff);
        this.write(state.bracketedPaste ? ANSI.bracketedPasteOn : ANSI.bracketedPasteOff);
        this.write(state.cursorVisible ? ANSI.cursorShow : ANSI.cursorHide);
        this.write(state.keyboardProtocol ? ANSI.keyboardProtocolOn : ANSI.keyboardProtocolOff);
        if (state.title !== null) this.write(`\u001b]0;${state.title}\u0007`);
        return {...state, signalHandlers: [...state.signalHandlers]};
    }
    writeDiagnostic(text: string): void { this.write(`${text}\n`); }
}

export class RecordingTerminalPort implements TuiTerminalPort {
    readonly applied: TuiTerminalModeState[] = [];
    readonly diagnostics: string[] = [];
    apply(state: TuiTerminalModeState): unknown {
        this.applied.push(state);
        return {...state, signalHandlers: [...state.signalHandlers]};
    }
    writeDiagnostic(text: string): void { this.diagnostics.push(text); }
}

export class HostileTerminalPort implements TuiTerminalPort {
    readonly applied: TuiTerminalModeState[] = [];
    constructor(private readonly observed: unknown) {}
    apply(state: TuiTerminalModeState): unknown { this.applied.push(state); return this.observed; }
    writeDiagnostic(): void {}
}

export class ThrowingTerminalPort implements TuiTerminalPort {
    apply(): unknown { throw new Error('the terminal was lost'); }
    writeDiagnostic(): void {}
}

/**
 * The adversarial case behind CA23-R2: the port mutates the real terminal and
 * *then* fails, so the caller receives no observed state even though the
 * terminal is now dirty. `failAfter` counts how many applications mutate and
 * throw before the port starts succeeding, which lets a spec assert that a
 * best-effort baseline attempt is still made and that the terminal ends clean.
 */
export class MutatingThenThrowingTerminalPort implements TuiTerminalPort {
    readonly attempts: TuiTerminalModeState[] = [];
    private state: TuiTerminalModeState;
    private failures: number;
    constructor(entry: TuiTerminalModeState, failAfter = 1) { this.state = entry; this.failures = failAfter; }
    /** The mode the terminal is actually left in, independent of anything the controller believes. */
    terminalState(): TuiTerminalModeState { return this.state; }
    apply(state: TuiTerminalModeState): unknown {
        this.attempts.push(state);
        this.state = state;
        if (this.failures > 0) { this.failures -= 1; throw new Error('the terminal write failed after changing modes'); }
        return {...state, signalHandlers: [...state.signalHandlers]};
    }
    writeDiagnostic(): void {}
}
