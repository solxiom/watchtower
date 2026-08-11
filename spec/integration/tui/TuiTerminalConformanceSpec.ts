import {spawnSync} from 'node:child_process';
import {
    PROMOTED_TUI_PTY_MATRIX, TUI_CATALOG_DIMENSIONS, TUI_VISUAL_CATALOG_STATES, reconcileTuiPtyMatrix,
    type TuiCatalogDimension, type TuiPtyTuple
} from '../../../src/contracts/tuiAccessibility.js';
import {PROMOTED_TUI_NATIVE_INTEGRITY, PROMOTED_TUI_TARGET} from '../../../src/contracts/tuiAdapter.js';
import {AccessibleTuiPresenter} from '../../../src/presentation/tui/AccessibleTuiPresenter.js';
import {TuiLayoutResolver} from '../../../src/presentation/tui/TuiLayoutResolver.js';
import {TuiThemeResolver} from '../../../src/presentation/tui/TuiThemeResolver.js';
import {DEFAULT_TUI_PREFERENCES} from '../../../src/presentation/tui/TuiPreferences.js';
import {TuiApplication} from '../../../src/presentation/tui/TuiApplication.js';
import type {NirvanaTuiAdapter, TuiCapabilities} from '../../../src/contracts/tuiAdapter.js';
import {ANSI} from '../../support/tuiPty/AnsiTerminalPort.js';
import {relocateDistribution, removeTemporary, repositoryPath, runUnderPty, sourceRootFor, type PtyResult} from '../../support/tuiPty/ptyHarness.js';
import {startIsolatedSshd, stopIsolatedSshd, type IsolatedSshTarget} from '../../support/tuiPty/sshFixture.js';
import {tupleFor} from '../../support/tuiPty/ptyMatrixFixtures.js';
import {ESC, resizeSequence} from '../../support/tuiPty/terminalContentFixtures.js';
import {catalogCase} from '../../support/tuiPty/visualCatalogFixtures.js';

/**
 * The single CA-23 conformance matrix entry. It runs the production lifecycle
 * controller under real PTYs — locally, inside tmux, with an SSH-session
 * environment, and from a relocated packaged install — and then walks the
 * complete visual-acceptance catalog with semantic, keyboard, accessibility,
 * and restoration assertions.
 */
const DIMENSIONS: readonly TuiCatalogDimension[] = Object.freeze(['wide', 'standard', 'narrow']);
const ENTRY_SEQUENCES = [ANSI.alternateScreenOn, ANSI.mouseOn, ANSI.bracketedPasteOn, ANSI.cursorHide, ANSI.keyboardProtocolOn];
const EXIT_SEQUENCES = [ANSI.alternateScreenOff, ANSI.mouseOff, ANSI.bracketedPasteOff, ANSI.cursorShow, ANSI.keyboardProtocolOff];
const capabilities: TuiCapabilities = {alternateScreen: true, rawInput: true, resize: true, unicodeWidth: true, color: '256', mouse: true, bracketedPaste: true, reducedMotion: false};
const adapter: NirvanaTuiAdapter = {capabilities: () => capabilities, open: () => { throw new Error('the matrix never opens a surface'); }};

/** Relocates the packaged distribution for one suite, proving behaviour outside the source checkout. */
function usingRelocation(): () => string {
    let root = '';
    beforeAll(() => { root = relocateDistribution(); });
    afterAll(() => { if (root !== '') removeTemporary(root); root = ''; });
    return () => root;
}

/**
 * Starts the isolated `sshd` for the suites that need the required direct-SSH
 * and SSH-inside-tmux tuples. A failure to start is *not* downgraded to a local
 * run: `startIsolatedSshd` throws, the suite fails, and the SSH tuples are
 * therefore never reported as promoted on simulated evidence.
 */
function usingIsolatedSsh(): () => IsolatedSshTarget {
    let target: IsolatedSshTarget | null = null;
    beforeAll(() => { target = startIsolatedSshd(); });
    afterAll(() => { if (target !== null) stopIsolatedSshd(target); target = null; });
    return () => {
        if (target === null) throw new Error('the isolated SSH target was not started');
        return target;
    };
}

describe('CA-23 promoted matrix reconciliation', () => {
    it('reconciles the promoted matrix with the accepted CA-18 target', () => {
        const reconciliation = reconcileTuiPtyMatrix([{...PROMOTED_TUI_TARGET, artifactIntegrity: PROMOTED_TUI_NATIVE_INTEGRITY}]);
        expect(reconciliation.consistent).toBeTrue();
        expect(reconciliation.uncoveredTargets).toEqual([]);
        expect(reconciliation.widenedTuples).toEqual([]);
        expect(PROMOTED_TUI_PTY_MATRIX.length).toBe(8);
    });
});

describe('CA-23 real-PTY entry and restoration matrix', () => {
    const relocated = usingRelocation();
    const ssh = usingIsolatedSsh();
    for (const tuple of PROMOTED_TUI_PTY_MATRIX) {
        it(`enters and completely restores the terminal on ${tuple.invocation}/${tuple.installPath}`, () => {
            const result = runUnderPty('normal', tuple, sourceRootFor(tuple.installPath, relocated()), tuple.sshMode === 'direct' ? ssh() : null);
            expect(result.exitCode).withContext(result.output).toBe(0);
            expect(result.marks).toContain('entered');
            expect(result.marks).toContain('applied=true');
            expect(result.marks).toContain('phase=RESTORED restores=1');
            expect(result.marks.some((mark) => mark.startsWith(`tty=true term=${tuple.termFamily}`))).withContext(result.marks.join('|')).toBeTrue();
            expectInvocationBoundary(result, tuple);
            for (const sequence of ENTRY_SEQUENCES) expect(result.output.includes(sequence)).withContext(`entry ${tuple.invocation}`).toBeTrue();
            for (const sequence of EXIT_SEQUENCES) expect(result.output.includes(sequence)).withContext(`exit ${tuple.invocation}`).toBeTrue();
            expect(result.output.lastIndexOf(ANSI.alternateScreenOff)).toBeGreaterThan(result.output.lastIndexOf(ANSI.alternateScreenOn));
            expect(result.output.lastIndexOf(ANSI.cursorShow)).toBeGreaterThan(result.output.lastIndexOf(ANSI.cursorHide));
        });
    }
});

/** The child reports its own session boundary, so a local run can never pass as a remote one. */
function expectInvocationBoundary(result: PtyResult, tuple: TuiPtyTuple): void {
    const boundary = result.marks.find((mark) => mark.startsWith('ssh=')) ?? '';
    expect(boundary).withContext(`${tuple.invocation} boundary`).toContain(`ssh=${tuple.sshMode === 'direct'}`);
    expect(boundary).withContext(`${tuple.invocation} boundary`).toContain(`tmux=${tuple.invocation === 'tmux' || tuple.invocation === 'ssh+tmux'}`);
    expect(boundary).withContext(`${tuple.invocation} pty device`).toMatch(/tty-path=\/dev\/pts\/\d+/u);
}

const RECOVERY_SCENARIOS: readonly {readonly scenario: string; readonly exitCode: number; readonly marks: readonly string[]}[] = Object.freeze([
    {scenario: 'crash', exitCode: 1, marks: ['crashed=render loop exploded', 'applied=true durable=false', 'phase=RESTORED restores=1']},
    {scenario: 'sigint', exitCode: 0, marks: ['action=clear-input restored=false closesSession=false', 'phaseAfterSignal=ACTIVE', 'applied=true']},
    {scenario: 'sighup', exitCode: 0, marks: ['action=terminal-loss restored=true closesSession=false', 'phaseAfterSignal=RESTORED', 'applied=false']},
    {scenario: 'sigterm', exitCode: 0, marks: ['action=exit restored=true closesSession=false', 'phaseAfterSignal=RESTORED']},
    {scenario: 'sigwinch', exitCode: 0, marks: ['action=resize restored=false closesSession=false', 'phaseAfterSignal=ACTIVE', 'applied=true']},
    {scenario: 'suspend', exitCode: 0, marks: ['action=restore-and-suspend', 'action=redraw', 'phase=RESTORED restores=2']},
    {scenario: 'repeated', exitCode: 0, marks: ['applied=true', 'applied=false', 'phase=RESTORED restores=1']},
    {scenario: 'startup-failure', exitCode: 3, marks: ['startup-failed=TERMINAL_RESTORE_FAILED', 'restored=true', 'phase=FAILED restores=1']}
]);

describe('CA-23 signal, suspend, crash, and startup recovery under a real PTY', () => {
    const relocated = usingRelocation();
    for (const expectation of RECOVERY_SCENARIOS) {
        it(`restores the terminal on ${expectation.scenario}`, () => {
            const result = runUnderPty(expectation.scenario, tupleFor('local', 'source'), sourceRootFor('source', relocated()));
            expect(result.exitCode).withContext(result.output).toBe(expectation.exitCode);
            for (const mark of expectation.marks) expect(result.marks).withContext(expectation.scenario).toContain(mark);
            expect(result.output.lastIndexOf(ANSI.alternateScreenOff)).toBeGreaterThan(result.output.lastIndexOf(ANSI.alternateScreenOn));
            expect(result.output.lastIndexOf(ANSI.cursorShow)).toBeGreaterThan(result.output.lastIndexOf(ANSI.cursorHide));
        });
    }
});

describe('CA-23 remote signal, suspend, and crash recovery over real SSH', () => {
    const relocated = usingRelocation();
    const ssh = usingIsolatedSsh();
    for (const invocation of ['ssh', 'ssh+tmux'] as const) {
        for (const scenario of ['crash', 'suspend', 'sighup'] as const) {
            it(`restores the remote terminal on ${invocation}/${scenario}`, () => {
                const tuple = tupleFor(invocation, 'global-install');
                const result = runUnderPty(scenario, tuple, sourceRootFor('global-install', relocated()), ssh());
                expect(result.exitCode).withContext(result.output).toBe(scenario === 'crash' ? 1 : 0);
                expectInvocationBoundary(result, tuple);
                expect(result.output.lastIndexOf(ANSI.alternateScreenOff)).toBeGreaterThan(result.output.lastIndexOf(ANSI.alternateScreenOn));
                expect(result.output.lastIndexOf(ANSI.cursorShow)).toBeGreaterThan(result.output.lastIndexOf(ANSI.cursorHide));
            });
        }
    }
});

describe('CA-23 unpromoted target refusal and non-TUI fallback', () => {
    const relocated = usingRelocation();
    it('refuses an unpromoted target before any terminal byte is written', () => {
        const result = runUnderPty('unpromoted', tupleFor('local', 'source'), sourceRootFor('source', relocated()));
        expect(result.exitCode).toBe(2);
        expect(result.marks).toContain('promoted=false');
        expect(result.marks).toContain('reason=TERMINAL_TARGET_UNPROMOTED remediation=true');
        expect(result.marks).toContain('phase=FAILED restores=0');
        expect(result.output.includes(ANSI.alternateScreenOn)).toBeFalse();
        expect(result.output.includes(ANSI.cursorHide)).toBeFalse();
    });
    it('leaves the packaged non-TUI command surface usable', () => {
        const packaged = spawnSync('node', [repositoryPath('dist', 'bin', 'wt.js'), '--help'], {encoding: 'utf8', timeout: 60000});
        expect(packaged.status).withContext(`${packaged.stdout ?? ''}${packaged.stderr ?? ''}`).toBe(0);
        expect(`${packaged.stdout}`).toContain('coordinator');
    });
});

describe('CA-23 visual acceptance catalog in accessible mode', () => {
    it('presents every catalog state at every declared dimension without colour, motion, or escapes', () => {
        for (const state of TUI_VISUAL_CATALOG_STATES) {
            for (const dimension of DIMENSIONS) {
                const context = `${state}/${dimension}`;
                const fixture = catalogCase(state, dimension);
                const accessible = {...fixture.preferences, accessible: true, noColor: true, reducedMotion: true};
                const presented = new AccessibleTuiPresenter({preferences: accessible}).present(fixture.model, fixture.activity);
                expect(presented.usesColor).withContext(context).toBeFalse();
                expect(presented.animated).withContext(context).toBeFalse();
                expect(presented.restrainedRedraw).withContext(context).toBeTrue();
                expect(presented.regions.filter((region) => region.focused).length).withContext(context).toBe(1);
                expect(new Set(presented.linearFocusOrder).size).withContext(context).toBe(presented.linearFocusOrder.length);
                expectRegionsReachable(presented, context);
                expect(new TuiThemeResolver().resolve(capabilities, accessible).colorMode).withContext(context).toBe('monochrome');
            }
        }
    });
});

function expectRegionsReachable(presented: ReturnType<AccessibleTuiPresenter['present']>, context: string): void {
    for (const region of presented.regions) {
        expect(region.title.length).withContext(`${context}/${region.id}`).toBeGreaterThan(0);
        expect(region.title.includes(ESC)).withContext(`${context}/${region.id}`).toBeFalse();
        expect(region.lines.some((line) => line.includes(ESC))).withContext(`${context}/${region.id}`).toBeFalse();
        expect(presented.linearFocusOrder).withContext(`${context}/${region.id}`).toContain(region.id);
    }
}

describe('CA-23 catalog labelling and keyboard order in default colour mode', () => {
    it('labels every semantic state as text and keeps the focus order monotonic', () => {
        for (const state of TUI_VISUAL_CATALOG_STATES) {
            const fixture = catalogCase(state, 'wide');
            const presented = new AccessibleTuiPresenter({preferences: fixture.preferences}).present(fixture.model, fixture.activity);
            for (const region of presented.regions.filter((item) => item.states.length > 0)) {
                for (const semantic of region.states) expect(region.title).withContext(`${state}/${region.id}/${semantic}`).toContain('[');
            }
            const order = presented.regions.map((region) => region.focusOrder);
            expect(order).withContext(state).toEqual([...order].sort((left, right) => left - right));
        }
    });
});

describe('CA-23 repeated resize and unusable-dimension recovery', () => {
    it('recomputes the layout and keeps state across every resize step', () => {
        const application = new TuiApplication({lane: 'watchtower-v1', adapter, preferences: DEFAULT_TUI_PREFERENCES, size: TUI_CATALOG_DIMENSIONS.wide});
        const resolver = new TuiLayoutResolver();
        for (const size of resizeSequence()) {
            const view = application.resize(size);
            expect(view.layout.mode).withContext(`${size.columns}x${size.rows}`).toBe(resolver.resolve(size, DEFAULT_TUI_PREFERENCES).mode);
            expect(view.header.lane).toBe('watchtower-v1');
            expect(view.layout.resizeRequired).toBe(size.columns < 50 || size.rows < 14);
            expect(new AccessibleTuiPresenter({preferences: {...DEFAULT_TUI_PREFERENCES, accessible: true}}).present(view).linearFocusOrder.length).toBeGreaterThan(2);
        }
        expect(application.resize(TUI_CATALOG_DIMENSIONS.wide).layout.mode).toBe('wide');
    });
});
