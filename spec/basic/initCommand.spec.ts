import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createCli} from '../../src/run.js';
import InitCommand from '../../src/commands/InitCommand.js';

describe('InitCommand', function () {
    let root: string;
    beforeEach(function () {
        root = mkdtempSync(join(tmpdir(), 'wt-init-command-'));
        execFileSync('git', ['init', '--quiet', '--initial-branch=main'], {cwd: root});
        mkdirSync(join(root, 'pack'));
        writeFileSync(join(root, '.gitignore'), '.watchtower/\n');
        writeFileSync(join(root, 'routing.json'), JSON.stringify(routing()));
    });
    afterEach(function () { rmSync(root, {recursive: true, force: true}); });

    it('registers the fixed syntax and previews through the planner without creating a destination', async function () {
        const cli = await createCli();
        const before = execFileSync('find', [root, '-print'], {encoding: 'utf8'});
        await cli.run({args: ['init', 'lane-1', '--tmux-prefix=lane', '--impl-pack=pack',
            `--coordinator-routing=${join(root, 'routing.json')}`, `--workspace=${root}`, '--dry-run']});
        expect(execFileSync('find', [root, '-print'], {encoding: 'utf8'})).toBe(before);
    });

    it('describes every supported init option', function () {
        expect(new InitCommand().usage).toContain('--coordinator-routing=<path>');
        expect(new InitCommand().usage).toContain('--dry-run');
    });

    it('rejects unknown flags, values, duplicates, aliases, and extra positionals before planning', async function () {
        const cli = await createCli();
        const base = ['init', 'lane-1', '--tmux-prefix=lane', '--impl-pack=pack',
            `--coordinator-routing=${join(root, 'routing.json')}`, `--workspace=${root}`, '--dry-run'];
        for (const extra of [['--bogus'], ['--bogus=value'], ['--from-pack=pack'], ['extra'],
            ['--tmux-prefix=again'], ['--cmd-unsafe=value']]) {
            const before = execFileSync('find', [root, '-print'], {encoding: 'utf8'});
            await expectAsync(cli.run({args: [...base, ...extra]})).toBeRejectedWith(jasmine.objectContaining({code: 'ERR_INVALID_ARGUMENT'}));
            expect(execFileSync('find', [root, '-print'], {encoding: 'utf8'})).toBe(before);
        }
    });

});

function routing(): object {
    const endpoint = {endpointId: 'high', hostId: 'local', osUser: 'operator', adapterId: 'opencode-cli', provider: 'openai', accountId: 'primary', model: 'configured', effort: 'high', capabilityClass: 'C5'};
    const classes = {D1: {minimumCapability: 'C2', primary: 'high', fallbacks: []}, D2: {minimumCapability: 'C3', primary: 'high', fallbacks: []}, D3: {minimumCapability: 'C5', primary: 'high', fallbacks: []}};
    const sessions = {D1: {primary: 'high', fallbacks: []}, D2: {primary: 'high', fallbacks: []}, D3: {primary: 'high', fallbacks: []}};
    return {schemaVersion: 1, endpoints: [endpoint], classes, operatorSessionClasses: sessions, operatorSessionBudgetPolicyRef: 'context-policy.json#operatorSession'};
}
