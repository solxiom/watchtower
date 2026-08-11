import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import DoctorCommand from '../../../src/commands/doctor/DoctorCommand.js';
import {parseDoctorCommandOptions} from '../../../src/commands/doctor/doctorCommandOptions.js';
import {DoctorKernel, injectedDiagnosticCheckProviders, tuiDiagnosticCheckProviders} from '../../../src/foundation/doctor/index.js';
import type {DoctorCheckProvider} from '../../../src/foundation/doctor/index.js';
import type {DoctorCheckId} from '../../../src/contracts/index.js';
import {createCli} from '../../../src/run.js';
import {createLane, createReadCommandFixture, treeSnapshot} from '../../basic/readCommandFixtures.js';

const CA31_IDS: readonly DoctorCheckId[] = ['coordinator-queue', 'coordinator-cursor', 'session-index', 'session-turns'];

function idsOf(providers: readonly DoctorCheckProvider[]): readonly DoctorCheckId[] {
    return providers.map(provider => provider.id);
}

describe('CA-31 injected provider composition', function () {
    it('adds the coordinator/session providers to the default composition and the terminal provider only under --tui', function () {
        const base = idsOf(injectedDiagnosticCheckProviders);
        const tui = idsOf(tuiDiagnosticCheckProviders);
        for (const id of CA31_IDS) expect(base).withContext(id).toContain(id);
        expect(base).not.toContain('tui-terminal');
        expect(tui).toEqual([...base, 'tui-terminal']);
        expect(new Set(tui).size).toBe(tui.length);
    });

    it('is frozen, so no caller can register a provider into either composition at runtime', function () {
        expect(Object.isFrozen(injectedDiagnosticCheckProviders)).toBeTrue();
        expect(Object.isFrozen(tuiDiagnosticCheckProviders)).toBeTrue();
        const mutable = injectedDiagnosticCheckProviders as DoctorCheckProvider[];
        expect(() => mutable.push(mutable[0])).toThrow();
        expect(injectedDiagnosticCheckProviders.length).toBe(14);
    });

    it('still refuses an unsupported or duplicated CA-31 provider ID at the kernel boundary', function () {
        const provider: DoctorCheckProvider = {
            id: 'coordinator-queue',
            run: () => ({id: 'coordinator-queue', status: 'pass', message: 'unused', reason: null})
        };
        expect(() => new DoctorKernel([provider, provider]))
            .toThrow(jasmine.objectContaining({code: 'ERR_INVALID_ARGUMENT'}));
        expect(() => new DoctorKernel([{...provider, id: 'coordinator-queues'} as unknown as DoctorCheckProvider]))
            .toThrow(jasmine.objectContaining({code: 'ERR_INVALID_ARGUMENT'}));
    });
});

describe('CA-31 doctor command surface', function () {
    it('accepts --tui exactly once and rejects a valued or repeated --tui', function () {
        expect(parseDoctorCommandOptions(args([['--tui', null]])).tui).toBeTrue();
        expect(parseDoctorCommandOptions(args([])).tui).toBeFalse();
        expect(() => parseDoctorCommandOptions(args([['--tui', 'yes']])))
            .toThrow(jasmine.objectContaining({code: 'ERR_INVALID_ARGUMENT'}));
        expect(() => parseDoctorCommandOptions(args([['--tui', null], ['--tui', null]])))
            .toThrow(jasmine.objectContaining({code: 'ERR_INVALID_ARGUMENT'}));
    });

    it('publishes --tui in usage and in the shipped help fragment', function () {
        const usage = new DoctorCommand().usage;
        expect(usage).toContain('[--tui]');
        const fragment = JSON.parse(readFileSync(join(process.cwd(), 'help', 'commands', 'doctor.hlp.json'), 'utf8')) as {
            usage: string; flags: Array<{name: string}>;
        };
        expect(fragment.usage).toBe(`wt ${usage}`);
        expect(fragment.flags.some(flag => flag.name === 'tui')).toBeTrue();
    });

    it('runs the terminal provider through the real CLI under --tui and writes nothing', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const cli = await createCli();
            const before = treeSnapshot(fixture.root);
            await expectAsync(cli.run({args: ['doctor', `--workspace=${fixture.controlHome}`, '--tui', '--json', '--no-color']}))
                .toBeRejectedWith(jasmine.objectContaining({code: 'ERR_PREFLIGHT_FAILED'}));
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });
});

/** Minimal `CArgMap` stand-in with the exact surface `parseDoctorCommandOptions` uses. */
function args(entries: ReadonlyArray<readonly [string, string | null]>) {
    const all = (flag: string) => entries.filter(([key]) => key === flag).map(([, value]) => value);
    return {
        entries: () => entries,
        getAll: (flag: string) => all(flag),
        getFlag: (name: string) => {
            const found = all(`--${name}`);
            return found.length === 0 ? null : found[0];
        },
        hasFlag: (name: string) => all(`--${name}`).length > 0
    } as unknown as Parameters<typeof parseDoctorCommandOptions>[0];
}
