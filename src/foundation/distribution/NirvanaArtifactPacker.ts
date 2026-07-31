import path from 'node:path';
import type {
    NirvanaClosurePackage,
    NirvanaDependencyClosureManifest
} from '../../contracts/nirvanaClosure.js';
import {NirvanaClosureError} from '../../contracts/nirvanaClosure.js';
import type {ResolvedNirvanaClosure, ResolvedClosurePackage} from './NirvanaEcosystemClosureResolver.js';
import {NirvanaClosureFileStore} from './NirvanaClosureFileStore.js';
import type {NirvanaProcessRunner} from './NirvanaCommandProcessRunner.js';
import {isUnsafeSpec, packageData, record} from './nirvanaClosureData.js';

export class NirvanaArtifactPacker {
    constructor(
        private readonly files: NirvanaClosureFileStore,
        private readonly processes: NirvanaProcessRunner
    ) {}

    async pack(input: {
        closure: ResolvedNirvanaClosure;
        artifactsRoot: string;
        npmCommand: string;
    }): Promise<NirvanaDependencyClosureManifest> {
        await this.files.ensureDirectory(input.artifactsRoot);
        const workRoot = await this.files.makeTemporaryRoot('watchtower-nirvana-pack-');
        try {
            const packages: NirvanaClosurePackage[] = [];
            for (const source of input.closure.packages) {
                packages.push(await this.packOne(source, input.artifactsRoot, workRoot, input.npmCommand));
            }
            return {
                schemaVersion: 1,
                manifestId: 'watchtower-nirvana-closure/v1',
                ecosystem: {
                    version: input.closure.ecosystemVersion,
                    versionsRoot: input.closure.versionsRootProvenance,
                    manifestSha256: input.closure.ecosystemManifestSha256
                },
                registry: {external: 'https://registry.npmjs.org/', nirvana: 'packed-artifacts'},
                watchtower: input.closure.watchtower,
                packages
            };
        } finally {
            await this.files.removeTree(workRoot);
        }
    }

    private async packOne(
        source: ResolvedClosurePackage,
        artifactsRoot: string,
        workRoot: string,
        npmCommand: string
    ): Promise<NirvanaClosurePackage> {
        const stageName = source.packageData.name.replace('/', '-').replace('@', '');
        const stageRoot = path.join(workRoot, stageName);
        await this.files.copyTree(source.sourcePath, stageRoot);
        await this.normalizePackageJson(stageRoot, source);
        const output = await this.processes.run({
            command: npmCommand,
            args: ['pack', stageRoot, '--json', '--pack-destination', artifactsRoot],
            cwd: workRoot,
            phase: 'pack',
            failureReason: 'PACK_FAILED'
        });
        const file = packedFilename(output, source.packageData.name);
        const artifactPath = path.join(artifactsRoot, file);
        return {
            kind: source.kind,
            name: source.packageData.name,
            version: source.packageData.version,
            artifact: {file, sha256: await this.files.sha256File(artifactPath)},
            source: {path: source.sourceRelativePath, sha256: source.sourceSha256},
            dependencies: source.bundledDependencies
        };
    }

    private async normalizePackageJson(stageRoot: string, source: ResolvedClosurePackage): Promise<void> {
        const filePath = path.join(stageRoot, 'package.json');
        const raw = record(await this.files.readUnknown(filePath), `${source.packageData.name}/package.json`);
        const data = packageData(raw, `${source.packageData.name}/package.json`);
        const dependencies = {...data.dependencies, ...source.normalizedDependencies};
        for (const [name, spec] of Object.entries(dependencies)) {
            if (spec.startsWith('file:') || isUnsafeSpec(spec)) {
                throw new NirvanaClosureError('UNSAFE_DEPENDENCY_SPEC', 'pack', `${source.packageData.name}:${name}`, 'Packed dependency remains local, wildcard, workspace, URL, or Git based.');
            }
        }
        await this.files.writeJson(filePath, {...raw, dependencies});
    }
}

function packedFilename(output: string, target: string): string {
    try {
        const parsed: unknown = JSON.parse(output);
        if (!Array.isArray(parsed) || parsed.length !== 1) throw new Error('Expected one packed artifact.');
        const item = parsed[0];
        if (typeof item !== 'object' || item === null || !('filename' in item) || typeof item.filename !== 'string') {
            throw new Error('Pack output omits filename.');
        }
        if (path.basename(item.filename) !== item.filename || !item.filename.endsWith('.tgz')) throw new Error('Unsafe pack filename.');
        return item.filename;
    } catch (error: unknown) {
        throw new NirvanaClosureError('PACK_FAILED', 'pack', target, error instanceof Error ? error.message : 'Invalid npm pack output.');
    }
}
