import {TerminalLifecycleController, validateModeState} from '../../../src/presentation/tui/TerminalLifecycleController.js';
import {
    BASELINE_TERMINAL_MODE, FULLSCREEN_TERMINAL_MODE, TuiTerminalError, type TuiInterruptStage, type TuiSignalName
} from '../../../src/contracts/tuiAccessibility.js';
import {HostileTerminalPort, MutatingThenThrowingTerminalPort, RecordingTerminalPort, ThrowingTerminalPort} from '../../support/tuiPty/AnsiTerminalPort.js';
import {tupleFor, unpromotedTuples} from '../../support/tuiPty/ptyMatrixFixtures.js';

const promoted = tupleFor('local', 'source');

function active(): {readonly controller: TerminalLifecycleController; readonly port: RecordingTerminalPort} {
    const port = new RecordingTerminalPort();
    const controller = new TerminalLifecycleController({port});
    controller.enter({...promoted});
    return {controller, port};
}

describe('CA-23 terminal lifecycle controller', () => {
    it('refuses every unpromoted tuple before a single terminal byte is written', () => {
        for (const fixture of unpromotedTuples()) {
            const port = new RecordingTerminalPort();
            const controller = new TerminalLifecycleController({port});
            const qualification = controller.enter(fixture.value);
            expect(qualification.promoted).withContext(fixture.name).toBeFalse();
            if (qualification.promoted) continue;
            expect(qualification.reason).toBe('TERMINAL_TARGET_UNPROMOTED');
            expect(qualification.nonTuiCommandsPreserved).toBeTrue();
            expect(qualification.fetchesArtifacts).toBeFalse();
            expect(qualification.remediation).toContain('wt doctor --tui');
            expect(port.applied).withContext(fixture.name).toEqual([]);
            expect(controller.currentMode()).toEqual(BASELINE_TERMINAL_MODE);
        }
    });

    it('enters full-screen mode exactly once for a promoted tuple', () => {
        const {controller, port} = active();
        expect(controller.currentPhase()).toBe('ACTIVE');
        expect(port.applied).toEqual([FULLSCREEN_TERMINAL_MODE]);
        expect(() => controller.enter({...promoted})).toThrowMatching((error) => (error as TuiTerminalError).reason === 'TERMINAL_LIFECYCLE_INVALID');
        expect(port.applied.length).toBe(1);
    });

    it('restores the discovered entry state on every normal, failure, and signal path', () => {
        const paths = [
            {reason: 'normal-exit' as const}, {reason: 'render-error' as const}, {reason: 'uncaught-error' as const},
            {reason: 'sighup' as const}, {reason: 'sigint' as const}, {reason: 'sigterm' as const},
            {reason: 'terminal-loss' as const}, {reason: 'renderer-failure' as const}
        ];
        for (const path of paths) {
            const {controller, port} = active();
            const outcome = controller.restore(path.reason);
            expect(outcome.applied).withContext(path.reason).toBeTrue();
            expect(outcome.wroteDurableState).toBeFalse();
            expect(outcome.mode).toEqual(BASELINE_TERMINAL_MODE);
            expect(port.applied.at(-1)).toEqual(BASELINE_TERMINAL_MODE);
            expect(controller.currentPhase()).toBe('RESTORED');
        }
    });

    it('is idempotent under repeated cleanup', () => {
        const {controller, port} = active();
        expect(controller.restore('normal-exit').applied).toBeTrue();
        for (let index = 0; index < 5; index += 1) {
            const repeat = controller.restore('uncaught-error');
            expect(repeat.applied).toBeFalse();
            expect(repeat.mode).toEqual(BASELINE_TERMINAL_MODE);
        }
        expect(controller.appliedRestoreCount()).toBe(1);
        expect(port.applied).toEqual([FULLSCREEN_TERMINAL_MODE, BASELINE_TERMINAL_MODE]);
    });

    it('restores the terminal when startup reports a mode the terminal never entered', () => {
        const port = new HostileTerminalPort({...BASELINE_TERMINAL_MODE, signalHandlers: []});
        const controller = new TerminalLifecycleController({port});
        expect(() => controller.enter({...promoted})).toThrowMatching((error) => (error as TuiTerminalError).reason === 'TERMINAL_RESTORE_FAILED');
        expect(controller.currentPhase()).toBe('FAILED');
        expect(port.applied).withContext('an unverified write forces one baseline attempt').toEqual([FULLSCREEN_TERMINAL_MODE, BASELINE_TERMINAL_MODE]);
        expect(controller.currentMode()).toEqual(BASELINE_TERMINAL_MODE);
        expect(controller.restore('startup-failure').applied).toBeFalse();
    });

    it('never throws out of an emergency restore and never reports durable writes', () => {
        const controller = new TerminalLifecycleController({port: new ThrowingTerminalPort()});
        expect(() => controller.enter({...promoted})).toThrowError('the terminal was lost');
        const outcome = controller.restore('uncaught-error');
        expect(outcome.applied).toBeFalse();
        expect(outcome.emergency).toBeTrue();
        expect(outcome.restorationFailed).toBeTrue();
        expect(outcome.wroteDurableState).toBeFalse();
    });

    it('forces a baseline attempt when startup mutates the terminal and then throws (CA23-R2)', () => {
        const port = new MutatingThenThrowingTerminalPort(BASELINE_TERMINAL_MODE);
        const controller = new TerminalLifecycleController({port});
        expect(() => controller.enter({...promoted})).toThrowError('the terminal write failed after changing modes');
        expect(port.attempts.length).withContext('a baseline attempt must follow the failed entry write').toBe(2);
        expect(port.attempts[0]).toEqual(FULLSCREEN_TERMINAL_MODE);
        expect(port.attempts[1]).toEqual(BASELINE_TERMINAL_MODE);
        expect(port.terminalState()).withContext('the real terminal must end clean').toEqual(BASELINE_TERMINAL_MODE);
        expect(controller.currentPhase()).toBe('FAILED');
        expect(controller.restore('uncaught-error').applied).toBeFalse();
    });

    it('retries baseline restoration on every emergency path after a mutate-then-throw write', () => {
        for (const reason of ['render-error', 'uncaught-error', 'renderer-failure', 'terminal-loss', 'sighup'] as const) {
            const port = new MutatingThenThrowingTerminalPort(BASELINE_TERMINAL_MODE);
            const controller = new TerminalLifecycleController({port});
            expect(() => controller.enter({...promoted})).toThrowError('the terminal write failed after changing modes');
            const outcome = controller.restore(reason);
            expect(outcome.applied).withContext(reason).toBeFalse();
            expect(outcome.restorationFailed).withContext(reason).toBeFalse();
            expect(port.attempts).withContext(reason).toEqual([FULLSCREEN_TERMINAL_MODE, BASELINE_TERMINAL_MODE]);
            expect(port.terminalState()).withContext(reason).toEqual(BASELINE_TERMINAL_MODE);
        }
    });

    it('keeps the original failure primary while reporting restoration failure distinctly', () => {
        const port = new MutatingThenThrowingTerminalPort(BASELINE_TERMINAL_MODE, 5);
        const controller = new TerminalLifecycleController({port});
        expect(() => controller.enter({...promoted})).toThrowError('the terminal write failed after changing modes');
        const outcome = controller.restore('terminal-loss');
        expect(outcome.applied).toBeFalse();
        expect(outcome.restorationFailed).toBeTrue();
        expect(outcome.emergency).toBeTrue();
        expect(port.attempts.length).toBeGreaterThanOrEqual(3);
        expect(() => controller.restore('normal-exit')).toThrowError('the terminal write failed after changing modes');
    });

    it('restores before suspend and redraws verified state after resume', () => {
        const {controller, port} = active();
        const suspended = controller.signal('SIGTSTP');
        expect(suspended.action).toBe('restore-and-suspend');
        expect(suspended.restored).toBeTrue();
        expect(controller.currentPhase()).toBe('SUSPENDED');
        expect(port.applied.at(-1)).toEqual(BASELINE_TERMINAL_MODE);
        const resumed = controller.signal('SIGCONT');
        expect(resumed.action).toBe('redraw');
        expect(resumed.redrawn).toBeTrue();
        expect(controller.currentPhase()).toBe('ACTIVE');
        expect(port.applied.at(-1)).toEqual(FULLSCREEN_TERMINAL_MODE);
        expect(() => controller.signal('SIGCONT')).toThrowMatching((error) => (error as TuiTerminalError).reason === 'TERMINAL_LIFECYCLE_INVALID');
    });

    it('maps every signal to its exact semantics without closing the durable session', () => {
        const expectations: readonly {readonly signal: TuiSignalName; readonly action: string; readonly writes: boolean}[] = [
            {signal: 'SIGWINCH', action: 'resize', writes: false},
            {signal: 'SIGINT', action: 'clear-input', writes: false},
            {signal: 'SIGHUP', action: 'terminal-loss', writes: true},
            {signal: 'SIGTERM', action: 'exit', writes: true}
        ];
        for (const expectation of expectations) {
            const {controller, port} = active();
            const outcome = controller.signal(expectation.signal);
            expect(outcome.action).withContext(expectation.signal).toBe(expectation.action as typeof outcome.action);
            expect(outcome.closesSession).toBeFalse();
            expect(outcome.acceptsProvisionalAsFinal).toBeFalse();
            expect(port.applied.length).toBe(expectation.writes ? 2 : 1);
            if (expectation.writes) expect(controller.currentMode()).toEqual(BASELINE_TERMINAL_MODE);
            else expect(controller.currentMode()).toEqual(FULLSCREEN_TERMINAL_MODE);
        }
    });

    it('applies exact Ctrl-C and Ctrl-D semantics at every stage', () => {
        const {controller} = active();
        const stages: readonly {readonly stage: TuiInterruptStage; readonly action: string}[] = [
            {stage: 'editing', action: 'clear-input'}, {stage: 'preflight', action: 'abort-preflight'},
            {stage: 'invoking', action: 'interrupt-turn'}, {stage: 'confirming', action: 'reject-confirmation'}
        ];
        for (const stage of stages) {
            const outcome = controller.interrupt('CTRL_C', stage.stage);
            expect(outcome.action).withContext(stage.stage).toBe(stage.action as typeof outcome.action);
            expect(outcome.acceptsProvisionalAsFinal).toBeFalse();
            expect(outcome.closesSession).toBeFalse();
        }
        expect(controller.interrupt('CTRL_D', 'editing', true).action).toBe('detach');
        expect(controller.interrupt('CTRL_D', 'editing', false).action).toBe('ignored');
        expect(controller.currentPhase()).toBe('ACTIVE');
    });

    it('validates an observed mode state before it becomes lifecycle truth', () => {
        expect(validateModeState({...BASELINE_TERMINAL_MODE, signalHandlers: ['SIGINT']}).signalHandlers).toEqual(['SIGINT']);
        const malformed: readonly unknown[] = [
            null, 'raw', [], {...BASELINE_TERMINAL_MODE, extra: true}, {...BASELINE_TERMINAL_MODE, rawMode: 'yes'},
            {...BASELINE_TERMINAL_MODE, title: 7}, {...BASELINE_TERMINAL_MODE, signalHandlers: ['SIGKILL']},
            {...BASELINE_TERMINAL_MODE, signalHandlers: 'SIGINT'}, Object.fromEntries(Object.entries(BASELINE_TERMINAL_MODE).slice(1))
        ];
        for (const value of malformed) {
            expect(() => validateModeState(value)).toThrowMatching((error) => (error as TuiTerminalError).reason === 'TERMINAL_MODE_INVALID');
        }
    });
});
