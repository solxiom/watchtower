import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {NirvanaClosureError} from '../../../src/contracts/nirvanaClosure.js';
import {NirvanaArtifactPacker} from '../../../src/foundation/distribution/NirvanaArtifactPacker.js';
import type {
    NirvanaProcessRequest,
    NirvanaProcessRunner
} from '../../../src/foundation/distribution/NirvanaCommandProcessRunner.js';
import {NirvanaClosureFileStore} from '../../../src/foundation/distribution/NirvanaClosureFileStore.js';
import {NirvanaEcosystemClosureResolver} from '../../../src/foundation/distribution/NirvanaEcosystemClosureResolver.js';
import {addVendorDependency, makeClosureSandbox, type ClosureSandbox} from './support/closureFixtures.js';

class PackProcessFixture implements NirvanaProcessRunner {
    readonly requests: NirvanaProcessRequest[] = [];
    readonly normalizedDependencies = new Map<string, unknown>();

    async run(request: NirvanaProcessRequest): Promise<string> {
        this.requests.push(request);
        const sourceRoot = request.args[1];
        const raw = JSON.parse(await readFile(path.join(sourceRoot, 'package.json'), 'utf8')) as {name: string; version: string; dependencies: unknown};
        this.normalizedDependencies.set(raw.name, raw.dependencies);
        const destination = request.args[request.args.indexOf('--pack-destination') + 1];
        const filename = `${raw.name.replace('@', '').replace('/', '-')}-${raw.version}.tgz`;
        await writeFile(path.join(destination, filename), `packed:${raw.name}:${raw.version}`, 'utf8');
        return JSON.stringify([{filename}]);
    }
}

describe('NirvanaArtifactPacker', () => {
    const files = new NirvanaClosureFileStore();
    const resolver = new NirvanaEcosystemClosureResolver(files);
    let sandbox: ClosureSandbox;

    beforeEach(async () => {
        sandbox = await makeClosureSandbox();
    });

    afterEach(async () => {
        await sandbox.remove();
    });

    it('packs every closed artifact and removes local dependency specs from staged bytes', async () => {
        await addVendorDependency(sandbox);
        const closure = await resolver.resolve({projectRoot: sandbox.projectRoot, versionsRoot: sandbox.versionsRoot});
        const process = new PackProcessFixture();
        const packer = new NirvanaArtifactPacker(files, process);
        const artifactsRoot = path.join(sandbox.root, 'artifacts');
        const sourcePackagePath = path.join(sandbox.versionRoot, 'components', 'base', 'package.json');
        const sourceBefore = await readFile(sourcePackagePath, 'utf8');

        const manifest = await packer.pack({closure, artifactsRoot, npmCommand: '/tools/npm'});

        expect(manifest.packages.map(item => item.name)).toEqual(['@nirvana/base', 'renatus']);
        expect(manifest.packages.every(item => item.artifact.sha256.startsWith('sha256:'))).toBeTrue();
        expect(process.requests.every(item => item.command === '/tools/npm')).toBeTrue();
        expect(process.requests.every(item => item.args[0] === 'pack')).toBeTrue();
        expect(process.normalizedDependencies.get('@nirvana/base')).toEqual({renatus: '1.1.0'});
        expect(await readFile(sourcePackagePath, 'utf8')).toBe(sourceBefore);
        expect(manifest.packages[0].dependencies).toEqual([{name: 'renatus', version: '1.1.0'}]);
    });

    it('fails closed when npm pack output is malformed or names an escaping artifact', async () => {
        const closure = await resolver.resolve({projectRoot: sandbox.projectRoot, versionsRoot: sandbox.versionsRoot});
        for (const output of ['not-json', JSON.stringify([{filename: '../escape.tgz'}])]) {
            const process: NirvanaProcessRunner = {run: async () => output};
            const packer = new NirvanaArtifactPacker(files, process);
            try {
                await packer.pack({closure, artifactsRoot: path.join(sandbox.root, `artifacts-${output.length}`), npmCommand: 'npm'});
                fail('Expected pack output validation to fail.');
            } catch (error: unknown) {
                expect(error instanceof NirvanaClosureError).toBeTrue();
                if (error instanceof NirvanaClosureError) expect(error.reason).toBe('PACK_FAILED');
            }
        }
    });
});
