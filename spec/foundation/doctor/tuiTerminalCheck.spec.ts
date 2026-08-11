import {
    DoctorKernel, createTuiTerminalCheck, deriveTuiPtyTuple, observedHostEvidence, packagedEngineEvidence
} from '../../../src/foundation/doctor/index.js';
import type {TuiEngineEvidence, TuiHostEvidence} from '../../../src/foundation/doctor/index.js';
import {
    PROMOTED_TUI_NATIVE_INTEGRITY, PROMOTED_TUI_PTY_MATRIX, PROMOTED_TUI_TARGET, TUI_ENGINE_PACKAGES
} from '../../../src/contracts/index.js';
import type {DoctorCheck} from '../../../src/contracts/index.js';
import {createLane, createReadCommandFixture, treeSnapshot} from '../../basic/readCommandFixtures.js';

const HOST: TuiHostEvidence = Object.freeze({
    os: PROMOTED_TUI_TARGET.os, cpu: PROMOTED_TUI_TARGET.cpu, libc: PROMOTED_TUI_TARGET.libc, nodeVersion: '26.4.0'
});
const SOURCE_ENGINE: TuiEngineEvidence = Object.freeze({
    opentuiVersion: TUI_ENGINE_PACKAGES[0].version, nativeIntegrity: PROMOTED_TUI_NATIVE_INTEGRITY, installPath: 'source'
});

const LOCAL_XTERM: NodeJS.ProcessEnv = Object.freeze({
    TERM: 'xterm-256color', COLORTERM: 'truecolor', LC_ALL: 'C.UTF-8'
});

async function runTui(environment: NodeJS.ProcessEnv, engine: TuiEngineEvidence = SOURCE_ENGINE): Promise<DoctorCheck> {
    const fixture = createReadCommandFixture();
    try {
        createLane(fixture, {packAvailable: false});
        const before = treeSnapshot(fixture.root);
        const report = await new DoctorKernel([createTuiTerminalCheck({host: HOST, engine})])
            .run({cwd: fixture.controlHome, environment});
        expect(treeSnapshot(fixture.root)).toBe(before);
        return report.checks[0];
    } finally { fixture.remove(); }
}

describe('CA-31 TUI terminal doctor provider', function () {
    it('passes every promoted local, tmux, ssh, and ssh+tmux invocation', async function () {
        const environments: readonly NodeJS.ProcessEnv[] = [
            LOCAL_XTERM,
            {TERM: 'tmux-256color', LC_ALL: 'C.UTF-8', TMUX: '/tmp/tmux-1000/default,1,0', TERM_PROGRAM: 'tmux', TERM_PROGRAM_VERSION: '3.4'},
            {TERM: 'xterm-256color', LC_ALL: 'C.UTF-8', SSH_CONNECTION: '10.0.0.1 22 10.0.0.2 22'},
            {
                TERM: 'tmux-256color', LC_ALL: 'C.UTF-8', TMUX: '/tmp/tmux-1000/default,1,0', TERM_PROGRAM: 'tmux',
                TERM_PROGRAM_VERSION: '3.4', SSH_CONNECTION: '10.0.0.1 22 10.0.0.2 22'
            }
        ];
        for (const environment of environments) {
            for (const engine of [SOURCE_ENGINE, {...SOURCE_ENGINE, installPath: 'global-install' as const}]) {
                const check = await runTui(environment, engine);
                expect(check.status).withContext(JSON.stringify(environment)).toBe('pass');
                expect(check.id).toBe('tui-terminal');
            }
        }
    });

    it('covers the complete promoted matrix with those eight qualifying invocations', function () {
        expect(PROMOTED_TUI_PTY_MATRIX.length).toBe(8);
    });

    it('skips when the invocation describes no controlling terminal', async function () {
        const check = await runTui({LC_ALL: 'C.UTF-8'});
        expect(check.status).toBe('skip');
        expect(check.message).toContain('TERM is unset');
    });

    it('warns when a promoted target is invoked with NO_COLOR', async function () {
        const check = await runTui({...LOCAL_XTERM, NO_COLOR: '1'});
        expect(check.status).toBe('warn');
        expect(check.message).toContain('NO_COLOR');
    });

    it('fails an unpromoted terminal, locale, tmux version, or Node version without offering to fetch artifacts', async function () {
        const cases: readonly NodeJS.ProcessEnv[] = [
            {TERM: 'vt100', LC_ALL: 'C.UTF-8'},
            {...LOCAL_XTERM, LC_ALL: 'en_US.ISO-8859-1'},
            {TERM: 'tmux-256color', LC_ALL: 'C.UTF-8', TMUX: '/tmp/x,1,0', TERM_PROGRAM: 'tmux', TERM_PROGRAM_VERSION: '3.0'}
        ];
        for (const environment of cases) {
            const check = await runTui(environment);
            expect(check.status).withContext(JSON.stringify(environment)).toBe('fail');
            expect(check.reason).toBe('ERR_MISSING_DEPENDENCY');
            expect(check.message).toContain('never fetches or repairs native artifacts');
        }
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const report = await new DoctorKernel([createTuiTerminalCheck({
                host: {...HOST, nodeVersion: '24.0.0'}, engine: SOURCE_ENGINE
            })]).run({cwd: fixture.controlHome, environment: LOCAL_XTERM});
            expect(report.checks[0].status).toBe('fail');
        } finally { fixture.remove(); }
    });

    it('fails a native artifact whose declared integrity is not the promoted one', async function () {
        const check = await runTui(LOCAL_XTERM, {...SOURCE_ENGINE, nativeIntegrity: 'sha256:0000'});
        expect(check.status).toBe('fail');
        expect(check.reason).toBe('ERR_MISSING_DEPENDENCY');
    });
});

describe('CA-31 TUI runtime tuple derivation', function () {
    it('reads invocation, tmux version, locale precedence, and color tier from environment only', function () {
        const tuple = deriveTuiPtyTuple({
            TERM: 'tmux-256color', TMUX: '/tmp/x,1,0', TERM_PROGRAM: 'tmux', TERM_PROGRAM_VERSION: '3.4',
            SSH_CONNECTION: '10.0.0.1 22 10.0.0.2 22', LC_ALL: 'C.UTF-8', LANG: 'ignored', NO_COLOR: '1'
        }, {host: HOST, engine: SOURCE_ENGINE});
        expect(tuple.invocation).toBe('ssh+tmux');
        expect(tuple.tmuxVersion).toBe('3.4');
        expect(tuple.locale).toBe('C.UTF-8');
        expect(tuple.colorTier).toBe('256');
        expect(tuple.sshMode).toBe('direct');
    });

    it('reports no tmux version when tmux does not publish one, rather than inventing it', function () {
        const tuple = deriveTuiPtyTuple({TERM: 'tmux-256color', TMUX: '/tmp/x,1,0'}, {host: HOST, engine: SOURCE_ENGINE});
        expect(tuple.tmuxVersion).toBeNull();
        expect(tuple.emulator).toBe('tmux');
    });

    it('normalizes host identity and treats an unvalidated process report as non-glibc', function () {
        expect(observedHostEvidence('linux', 'x64', 'v26.4.0', {header: {glibcVersionRuntime: '2.39'}})).toEqual(HOST);
        expect(observedHostEvidence('linux', 'x64', 'v26.4.0', undefined).libc).toBe('musl');
        expect(observedHostEvidence('linux', 'arm64', '26.4.0', {header: {}}).cpu).toBe('aarch64');
    });

    it('declares the packaged engine identity and observes the install path from the module location', function () {
        expect(packagedEngineEvidence('file:///opt/x/node_modules/watchtower/dist/x.js').installPath).toBe('global-install');
        const source = packagedEngineEvidence('file:///home/dev/watchtower/src/x.js');
        expect(source.installPath).toBe('source');
        expect(source.nativeIntegrity).toBe(PROMOTED_TUI_NATIVE_INTEGRITY);
        expect(source.opentuiVersion).toBe(TUI_ENGINE_PACKAGES[0].version);
    });
});
