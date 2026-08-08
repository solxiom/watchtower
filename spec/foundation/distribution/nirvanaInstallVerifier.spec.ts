import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {NirvanaDependencyClosureManifest} from '../../../src/contracts/nirvanaClosure.js';
import {NirvanaClosureError} from '../../../src/contracts/nirvanaClosure.js';
import type {
    NirvanaProcessRequest,
    NirvanaProcessRunner
} from '../../../src/foundation/distribution/NirvanaCommandProcessRunner.js';
import {NirvanaCommandProcessRunner} from '../../../src/foundation/distribution/NirvanaCommandProcessRunner.js';
import {NirvanaClosureFileStore} from '../../../src/foundation/distribution/NirvanaClosureFileStore.js';
import {NirvanaInstallVerifier} from '../../../src/foundation/distribution/NirvanaInstallVerifier.js';
import {makeClosureSandbox, type ClosureSandbox, writeJson} from './support/closureFixtures.js';

class InstallProcessFixture implements NirvanaProcessRunner {
    readonly requests: NirvanaProcessRequest[] = [];
    unsafeInstalledDependency = false;

    async run(request: NirvanaProcessRequest): Promise<string> {
        this.requests.push(request);
        if (request.args[0] === 'pack') {
            const destination = request.args[request.args.indexOf('--pack-destination') + 1];
            await writeFile(path.join(destination, 'watchtower-0.1.0.tgz'), 'watchtower', 'utf8');
            return JSON.stringify([{filename: 'watchtower-0.1.0.tgz'}]);
        }
        if (request.args[0] === 'install') {
            const prefix = request.args[request.args.indexOf('--prefix') + 1];
            await writeJson(path.join(prefix, 'lib', 'node_modules', '@nirvana', 'base'), 'package.json', {
                name: '@nirvana/base',
                version: '1.0.0',
                dependencies: this.unsafeInstalledDependency ? {escape: 'file:../source'} : {}
            });
            await writeJson(path.join(prefix, 'lib', 'node_modules', 'watchtower', 'runtime-nvb'), 'nvb-manifest.json', {schemaVersion: 1});
            await mkdir(path.join(prefix, 'lib', 'node_modules', 'watchtower', 'bin'), {recursive: true});
            await writeFile(path.join(prefix, 'lib', 'node_modules', 'watchtower', 'bin', 'wt.js'), '', 'utf8');
            return 'installed';
        }
        return '{"cliVersion":"0.1.0"}';
    }
}

describe('NirvanaInstallVerifier', () => {
    const files = new NirvanaClosureFileStore();
    let sandbox: ClosureSandbox;
    let artifactsRoot: string;
    let manifest: NirvanaDependencyClosureManifest;

    beforeEach(async () => {
        sandbox = await makeClosureSandbox();
        artifactsRoot = path.join(sandbox.root, 'artifacts');
        await mkdir(artifactsRoot);
        const artifactPath = path.join(artifactsRoot, 'nirvana-base-1.0.0.tgz');
        await writeFile(artifactPath, 'base artifact', 'utf8');
        manifest = {
            schemaVersion: 1,
            manifestId: 'watchtower-nirvana-closure/v1',
            ecosystem: {version: '1.0.0-alpha', versionsRoot: '<custom-versions-root>', manifestSha256: `sha256:${'a'.repeat(64)}`},
            registry: {external: 'https://registry.npmjs.org/', nirvana: 'packed-artifacts'},
            watchtower: {name: 'watchtower', version: '0.1.0', dependencies: [{name: '@nirvana/base', version: '1.0.0'}]},
            packages: [{
                kind: 'nirvana', name: '@nirvana/base', version: '1.0.0',
                artifact: {file: 'nirvana-base-1.0.0.tgz', sha256: await files.sha256File(artifactPath)},
                source: {path: 'components/base', sha256: `sha256:${'b'.repeat(64)}`}, dependencies: []
            }]
        };
    });

    afterEach(async () => await sandbox.remove());

    it('uses only explicit argv, cwd, registry, HOME, and packed artifacts for a fresh-prefix smoke', async () => {
        const process = new InstallProcessFixture();
        const verifier = new NirvanaInstallVerifier(files, process);

        const result = await verifier.verify({
            manifest, artifactsRoot, watchtowerPackageRoot: sandbox.projectRoot,
            npmCommand: '/tools/npm', nodeCommand: '/tools/node', sourceRoots: [sandbox.versionRoot]
        });

        expect(result).toBe('<verified-and-removed>');
        const install = process.requests.find(item => item.args[0] === 'install');
        expect(install?.command).toBe('/tools/npm');
        expect(install?.args).toContain('--registry');
        expect(install?.args).toContain(path.join(artifactsRoot, 'nirvana-base-1.0.0.tgz'));
        expect(install?.environment && Object.keys(install.environment).sort()).toEqual(['npm_config_globalconfig']);
    });

    it('fails before install on digest drift and rejects unsafe installed dependency specs', async () => {
        const drifted = structuredClone(manifest);
        drifted.packages[0].artifact.sha256 = `sha256:${'0'.repeat(64)}`;
        const process = new InstallProcessFixture();
        await expectFailure(new NirvanaInstallVerifier(files, process), drifted, 'DIGEST_MISMATCH');
        expect(process.requests.length).toBe(0);

        process.unsafeInstalledDependency = true;
        await expectFailure(new NirvanaInstallVerifier(files, process), manifest, 'UNSAFE_DEPENDENCY_SPEC');
    });

    it('maps E404 and unavailable tools to stable typed reasons', async () => {
        const runner = new NirvanaCommandProcessRunner({PATH: '/usr/bin:/bin', HOME: sandbox.root});
        await expectProcessReason(runner, process.execPath, ['--eval', 'process.stderr.write("npm ERR! E404");process.exit(1)'], 'REGISTRY_FALLBACK', true);
        await expectProcessReason(runner, '/definitely/missing/tool', [], 'TOOL_UNAVAILABLE', false);
    });

    it('does not map a signal-only process termination to success', async () => {
        const runner = new NirvanaCommandProcessRunner({PATH: '/usr/bin:/bin', HOME: sandbox.root});
        await expectProcessReason(
            runner,
            process.execPath,
            ['--eval', 'process.kill(process.pid, "SIGTERM")'],
            'INSTALL_FAILED',
            false
        );
    });

    async function expectFailure(verifier: NirvanaInstallVerifier, value: NirvanaDependencyClosureManifest, reason: string): Promise<void> {
        try {
            await verifier.verify({manifest: value, artifactsRoot, watchtowerPackageRoot: sandbox.projectRoot, npmCommand: 'npm', nodeCommand: 'node', sourceRoots: []});
            fail('Expected install verification to fail.');
        } catch (error: unknown) {
            expect(error instanceof NirvanaClosureError).toBeTrue();
            if (error instanceof NirvanaClosureError) expect(error.reason).toBe(reason);
        }
    }

    async function expectProcessReason(runner: NirvanaProcessRunner, command: string, args: string[], reason: string, registry: boolean): Promise<void> {
        try {
            await runner.run({command, args, cwd: sandbox.root, phase: 'install', failureReason: 'INSTALL_FAILED', rejectRegistry404: registry});
            fail('Expected process execution to fail.');
        } catch (error: unknown) {
            expect(error instanceof NirvanaClosureError).toBeTrue();
            if (error instanceof NirvanaClosureError) expect(error.reason).toBe(reason);
        }
    }
});
