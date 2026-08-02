import path from 'node:path';
import {NirvanaClosureError, type NirvanaDependencyClosureManifest} from '../../contracts/nirvanaClosure.js';
import {NirvanaClosureFileStore} from './NirvanaClosureFileStore.js';
import type {NirvanaProcessRunner} from './NirvanaCommandProcessRunner.js';
import {isUnsafeSpec, packageData, record} from './nirvanaClosureData.js';

export class NirvanaInstallVerifier {
    constructor(
        private readonly files: NirvanaClosureFileStore,
        private readonly processes: NirvanaProcessRunner
    ) {}

    async verify(input: {
        manifest: NirvanaDependencyClosureManifest;
        artifactsRoot: string;
        watchtowerPackageRoot: string;
        npmCommand: string;
        nodeCommand: string;
        sourceRoots: readonly string[];
        keepPrefix?: boolean;
    }): Promise<string> {
        await this.verifyArtifactDigests(input.manifest, input.artifactsRoot);
        const workRoot = await this.files.makeTemporaryRoot('watchtower-isolated-install-');
        const prefix = path.join(workRoot, 'prefix');
        try {
            await this.files.ensureDirectory(prefix);
            const watchtowerArtifact = await this.packWatchtower(input, workRoot);
            const npmrc = path.join(workRoot, 'empty.npmrc');
            const globalNpmrc = path.join(workRoot, 'empty-global.npmrc');
            await this.files.writeText(npmrc, 'fund=false\naudit=false\nupdate-notifier=false\n');
            await this.files.writeText(globalNpmrc, '');
            const artifactPaths = input.manifest.packages.map(item => path.join(input.artifactsRoot, item.artifact.file));
            await this.installArtifacts({
                npmCommand: input.npmCommand, prefix, npmrc, globalNpmrc, workRoot,
                registry: input.manifest.registry.external, artifactPaths, watchtowerArtifact
            });
            await this.verifyInstalledPackages(prefix, input.manifest);
            await this.files.assertNoEscapingSymlinks(prefix, input.sourceRoots);
            await this.smoke(prefix, input.nodeCommand, workRoot);
            if (input.keepPrefix) return prefix;
            return '<verified-and-removed>';
        } finally {
            if (!input.keepPrefix) await this.files.removeTree(workRoot);
        }
    }

    private async installArtifacts(input: {
        npmCommand: string;
        prefix: string;
        npmrc: string;
        globalNpmrc: string;
        workRoot: string;
        registry: string;
        artifactPaths: readonly string[];
        watchtowerArtifact: string;
    }): Promise<void> {
        await this.processes.run({
            command: input.npmCommand,
            args: [
                'install', '--global', '--prefix', input.prefix, '--userconfig', input.npmrc,
                '--cache', path.join(input.workRoot, 'npm-cache'), '--registry', input.registry,
                '--ignore-scripts', '--no-audit', '--no-fund', '--no-update-notifier',
                ...input.artifactPaths, input.watchtowerArtifact
            ],
            cwd: input.workRoot,
            environment: {npm_config_globalconfig: input.globalNpmrc},
            phase: 'install',
            failureReason: 'INSTALL_FAILED',
            rejectRegistry404: true
        });
    }

    private async packWatchtower(input: {
        watchtowerPackageRoot: string;
        artifactsRoot: string;
        npmCommand: string;
    }, workRoot: string): Promise<string> {
        const output = await this.processes.run({
            command: input.npmCommand,
            args: ['pack', input.watchtowerPackageRoot, '--json', '--pack-destination', workRoot],
            cwd: workRoot,
            phase: 'pack',
            failureReason: 'PACK_FAILED'
        });
        try {
            const parsed: unknown = JSON.parse(output);
            if (!Array.isArray(parsed) || parsed.length !== 1) throw new Error('Expected one Watchtower artifact.');
            const item = record(parsed[0], 'watchtower npm pack output');
            if (typeof item.filename !== 'string' || path.basename(item.filename) !== item.filename) throw new Error('Invalid Watchtower artifact filename.');
            return path.join(workRoot, item.filename);
        } catch (error: unknown) {
            throw new NirvanaClosureError('PACK_FAILED', 'pack', 'watchtower', error instanceof Error ? error.message : 'Invalid npm pack output.');
        }
    }

    private async verifyArtifactDigests(manifest: NirvanaDependencyClosureManifest, artifactsRoot: string): Promise<void> {
        for (const item of manifest.packages) {
            const actual = await this.files.sha256File(path.join(artifactsRoot, item.artifact.file));
            if (actual !== item.artifact.sha256) {
                throw new NirvanaClosureError('DIGEST_MISMATCH', 'verify', item.name, 'Packed artifact digest differs from the closure manifest.');
            }
        }
    }

    private async verifyInstalledPackages(prefix: string, manifest: NirvanaDependencyClosureManifest): Promise<void> {
        const modulesRoot = path.join(prefix, 'lib', 'node_modules');
        for (const expected of manifest.packages) {
            const packagePath = path.join(modulesRoot, ...expected.name.split('/'), 'package.json');
            const data = packageData(await this.files.readUnknown(packagePath), packagePath);
            if (data.name !== expected.name || data.version !== expected.version) {
                throw new NirvanaClosureError('PACKAGE_IDENTITY_MISMATCH', 'verify', expected.name, 'Installed package identity differs from the manifest.');
            }
            for (const [name, spec] of Object.entries(data.dependencies)) {
                if (spec.startsWith('file:') || isUnsafeSpec(spec)) {
                    throw new NirvanaClosureError('UNSAFE_DEPENDENCY_SPEC', 'verify', `${expected.name}:${name}`, 'Installed package retains an unsafe dependency spec.');
                }
            }
        }
    }

    private async smoke(prefix: string, nodeCommand: string, home: string): Promise<void> {
        const cliPath = path.join(prefix, 'lib', 'node_modules', 'watchtower', 'bin', 'wt.js');
        const output = await this.processes.run({
            command: nodeCommand,
            args: [cliPath, 'hello'],
            cwd: prefix,
            environment: {HOME: home},
            phase: 'verify',
            failureReason: 'RELOCATION_FAILED'
        });
        if (!output.includes('Hello, world! This is watchtower.')) {
            throw new NirvanaClosureError('RELOCATION_FAILED', 'verify', cliPath, 'Relocated CLI smoke returned unexpected output.');
        }
        const schemaPath = path.join(prefix, 'lib', 'node_modules', 'watchtower', 'runtime-nvb', 'nvb-manifest.json');
        const schema = record(await this.files.readUnknown(schemaPath), schemaPath);
        if (schema.schemaVersion !== 1) {
            throw new NirvanaClosureError('RELOCATION_FAILED', 'verify', schemaPath, 'Relocated manifest/schema smoke failed.');
        }
    }
}
