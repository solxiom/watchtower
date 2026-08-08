import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import DoctorCommand from '../../src/commands/doctor/DoctorCommand.js';
import {createCli} from '../../src/run.js';
import {createLane, createReadCommandFixture, treeSnapshot} from './readCommandFixtures.js';

describe('DoctorCommand read-only integration', function () {
    it('describes the supported doctor syntax', function () {
        const usage = new DoctorCommand().usage;
        expect(usage).toContain('--lane=<slug-or-uuid>');
        expect(usage).toContain('--workspace=<path>');
        expect(usage).not.toContain('--verbose');
        const fragment = JSON.parse(readFileSync(join(process.cwd(), 'help', 'commands', 'doctor.hlp.json'), 'utf8')) as {
            usage: string; flags: Array<{name: string}>;
        };
        expect(fragment.usage).toBe(`wt ${usage}`);
        expect(fragment.flags.some(flag => flag.name === 'verbose')).toBeFalse();
    });

    it('rejects unknown flags, duplicates, and unsupported values before running any check', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            writeFileSync(join(fixture.controlHome, '.gitignore'), '.watchtower/\n');
            const cli = await createCli();
            const before = treeSnapshot(fixture.root);
            for (const extra of [['--bogus'], ['--bogus=value'], ['--lane'], ['--json=true'], ['--verbose']]) {
                await expectAsync(cli.run({args: ['doctor', `--workspace=${fixture.controlHome}`, ...extra]}))
                    .toBeRejectedWith(jasmine.objectContaining({code: 'ERR_INVALID_ARGUMENT'}));
            }
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('runs every lane-local check for a healthy lane and prints doctorReport without writes', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            writeFileSync(join(fixture.controlHome, '.gitignore'), '.watchtower/\n');
            const cli = await createCli();
            const before = treeSnapshot(fixture.root);
            await cli.run({args: ['doctor', `--workspace=${fixture.controlHome}`, '--json', '--no-color']});
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('signals a failing check by throwing a typed error at the outer CLI boundary, not by assigning process.exitCode itself (LC07-R5)', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            // deliberately no .gitignore -> git-ignore-coverage fails
            const cli = await createCli();
            const before = treeSnapshot(fixture.root);
            const originalExitCode = process.exitCode;
            await expectAsync(cli.run({args: ['doctor', `--workspace=${fixture.controlHome}`, '--json', '--no-color']}))
                .toBeRejectedWith(jasmine.objectContaining({code: 'ERR_PREFLIGHT_FAILED', exitCode: 4}));
            expect(process.exitCode).toBe(originalExitCode);
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });
});
