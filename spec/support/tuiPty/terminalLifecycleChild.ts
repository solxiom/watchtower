import {readlinkSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {AnsiTerminalPort} from './AnsiTerminalPort.js';
import type {TerminalLifecycleController as Controller} from '../../../src/presentation/tui/TerminalLifecycleController.js';
import type {TuiTerminalModeState, TuiTerminalPort} from '../../../src/contracts/tuiAccessibility.js';

/**
 * The real-PTY child of the CA-23 conformance matrix. It is executed under a
 * genuine terminal by `script(1)`, optionally inside `tmux`, against either
 * the built source tree or a relocated packaged install, and it drives the
 * production lifecycle controller with a port that writes real control
 * sequences. Every scenario prints `MARK:` lines, so the captured PTY stream
 * carries both the terminal bytes and the state-machine outcome.
 */
const [, , scenario, sourceRoot] = process.argv;
const controllerModule = await import(`${pathToFileURL(`${sourceRoot}/presentation/tui/TerminalLifecycleController.js`).href}`) as {readonly TerminalLifecycleController: new (options: {readonly port: TuiTerminalPort}) => Controller};
const contractsModule = await import(`${pathToFileURL(`${sourceRoot}/contracts/tuiAccessibility.js`).href}`) as {readonly PROMOTED_TUI_PTY_MATRIX: readonly Record<string, unknown>[]};

const write = (text: string): void => { process.stdout.write(text); };
/** Proof that the child really owns a PTY device, not a pipe dressed up with environment variables. */
const ttyPath = (): string => { try { return readlinkSync('/proc/self/fd/1'); } catch { return 'unknown'; } };
const mark = (text: string): void => { write(`MARK:${text}\n`); };
const setRawMode = (raw: boolean): void => { if (process.stdin.isTTY) process.stdin.setRawMode(raw); };
const ansi = new AnsiTerminalPort(write, setRawMode);
const hostile: TuiTerminalPort = {
    apply(state: TuiTerminalModeState): unknown { ansi.apply(state); return {...state, rawMode: false, alternateScreen: false, signalHandlers: []}; },
    writeDiagnostic(text: string): void { ansi.writeDiagnostic(text); }
};
const promoted = contractsModule.PROMOTED_TUI_PTY_MATRIX.find((item) => item.invocation === (process.env.WT_CA23_INVOCATION ?? 'local') && item.installPath === (process.env.WT_CA23_INSTALL ?? 'source'));
const controller = new controllerModule.TerminalLifecycleController({port: scenario === 'startup-failure' ? hostile : ansi});

mark(`tty=${process.stdout.isTTY === true} term=${process.env.TERM ?? 'unset'} scenario=${scenario}`);
mark(`ssh=${process.env.SSH_CONNECTION !== undefined} tmux=${process.env.TMUX !== undefined} tty-path=${ttyPath()}`);
const keepAlive = setTimeout(() => { mark('timeout'); process.exit(9); }, 5000);
const finish = (code: number): never => { clearTimeout(keepAlive); mark(`phase=${controller.currentPhase()} restores=${controller.appliedRestoreCount()}`); process.exit(code); };

if (scenario === 'unpromoted') {
    const qualification = controller.enter({...promoted, cpu: 'arm64'});
    mark(`promoted=${qualification.promoted}`);
    if (!qualification.promoted) mark(`reason=${qualification.reason} remediation=${qualification.remediation.includes('wt coordinator ask')}`);
    finish(2);
}
if (scenario === 'startup-failure') {
    try {
        controller.enter({...promoted});
        mark('unexpected-entry');
    } catch (error) {
        mark(`startup-failed=${(error as {reason?: string}).reason ?? 'unknown'}`);
        mark(`restored=${controller.restore('startup-failure').applied === false}`);
    }
    finish(3);
}

controller.enter({...promoted});
mark('entered');

if (scenario === 'normal') { mark(`applied=${controller.restore('normal-exit').applied}`); finish(0); }
if (scenario === 'repeated') {
    for (const reason of ['normal-exit', 'uncaught-error', 'sigterm'] as const) mark(`applied=${controller.restore(reason).applied}`);
    finish(0);
}
if (scenario === 'crash') {
    process.on('uncaughtException', (error: Error) => {
        mark(`crashed=${error.message}`);
        const restored = controller.restore('uncaught-error');
        mark(`applied=${restored.applied} durable=${restored.wroteDurableState}`);
        finish(1);
    });
    setTimeout(() => { throw new Error('render loop exploded'); }, 10);
}
if (scenario === 'suspend') {
    process.on('SIGTSTP', () => {
        mark(`action=${controller.signal('SIGTSTP').action}`);
        process.kill(process.pid, 'SIGCONT');
    });
    process.on('SIGCONT', () => {
        mark(`action=${controller.signal('SIGCONT').action}`);
        mark(`applied=${controller.restore('normal-exit').applied}`);
        finish(0);
    });
    process.kill(process.pid, 'SIGTSTP');
}
for (const signal of ['SIGINT', 'SIGHUP', 'SIGTERM', 'SIGWINCH'] as const) {
    if (scenario !== signal.toLowerCase()) continue;
    process.on(signal, () => {
        const outcome = controller.signal(signal);
        mark(`action=${outcome.action} restored=${outcome.restored} closesSession=${outcome.closesSession}`);
        mark(`phaseAfterSignal=${controller.currentPhase()}`);
        mark(`applied=${controller.restore('normal-exit').applied}`);
        finish(0);
    });
    process.kill(process.pid, signal);
}
