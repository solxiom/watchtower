import {chmod, mkdir, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
    NirvanaClosureFileStore,
    NirvanaClosureFixture,
    NirvanaCommandProcessRunner
} from '../../../src/foundation/distribution/index.js';
import {makeClosureSandbox, type ClosureSandbox, writeJson} from './support/closureFixtures.js';

describe('Nirvana closure fresh-prefix integration', () => {
    let sandbox: ClosureSandbox;

    beforeEach(async () => {
        sandbox = await makeClosureSandbox();
        await addPackableWatchtower(sandbox.projectRoot);
    });

    afterEach(async () => await sandbox.remove());

    it('packs and installs only artifacts into a relocated prefix with isolated npm configuration', async () => {
        const nodeCommand = process.execPath;
        const npmCommand = path.join(path.dirname(nodeCommand), 'npm');
        const runner = new NirvanaCommandProcessRunner({
            PATH: `${path.dirname(nodeCommand)}:/usr/bin:/bin`,
            HOME: os.homedir()
        });
        const result = await new NirvanaClosureFixture(new NirvanaClosureFileStore(), runner).run({
            projectRoot: sandbox.projectRoot,
            versionsRoot: sandbox.versionsRoot,
            watchtowerPackageRoot: sandbox.projectRoot,
            npmCommand,
            nodeCommand
        });

        expect(result.ok).toBeTrue();
        if (result.ok) {
            expect(result.installPrefix).toBe('<verified-and-removed>');
            expect(result.manifest.packages.map(item => item.name)).toEqual(['@nirvana/base']);
        }
    });
});

async function addPackableWatchtower(projectRoot: string): Promise<void> {
    await writeJson(projectRoot, 'package.json', {
        name: 'watchtower',
        version: '0.1.0',
        type: 'module',
        bin: {wt: './bin/wt.js'},
        dependencies: {'@nirvana/base': '1.0.0'}
    });
    const binRoot = path.join(projectRoot, 'bin');
    await mkdir(binRoot, {recursive: true});
    const binPath = path.join(binRoot, 'wt.js');
    await writeFile(binPath, '#!/usr/bin/env node\nprocess.stdout.write("Hello, world! This is watchtower.\\n");\n', 'utf8');
    await chmod(binPath, 0o755);
    await writeJson(path.join(projectRoot, 'runtime-nvb'), 'nvb-manifest.json', {schemaVersion: 1});
}
