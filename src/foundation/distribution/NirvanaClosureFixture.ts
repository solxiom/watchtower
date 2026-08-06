import type {NirvanaClosureResult, NirvanaDependencyClosureManifest} from '../../contracts/nirvanaClosure.js';
import {NirvanaClosureError} from '../../contracts/nirvanaClosure.js';
import {NirvanaArtifactPacker} from './NirvanaArtifactPacker.js';
import type {NirvanaProcessRunner} from './NirvanaCommandProcessRunner.js';
import {NirvanaClosureFileStore} from './NirvanaClosureFileStore.js';
import {NirvanaClosureManifestValidator} from './NirvanaClosureManifestValidator.js';
import {NirvanaEcosystemClosureResolver} from './NirvanaEcosystemClosureResolver.js';
import {NirvanaInstallVerifier} from './NirvanaInstallVerifier.js';

export interface NirvanaClosureFixtureOptions {
    projectRoot: string;
    watchtowerPackageRoot: string;
    expectedManifest?: unknown;
    versionsRoot?: string;
    artifactsRoot?: string;
    npmCommand?: string;
    nodeCommand?: string;
    verifyInstall?: boolean;
    keepInstallPrefix?: boolean;
}

export class NirvanaClosureFixture {
    private readonly validator = new NirvanaClosureManifestValidator();
    private readonly resolver: NirvanaEcosystemClosureResolver;
    private readonly packer: NirvanaArtifactPacker;
    private readonly installer: NirvanaInstallVerifier;

    constructor(
        private readonly files: NirvanaClosureFileStore,
        processes: NirvanaProcessRunner
    ) {
        this.resolver = new NirvanaEcosystemClosureResolver(files);
        this.packer = new NirvanaArtifactPacker(files, processes);
        this.installer = new NirvanaInstallVerifier(files, processes);
    }

    async run(options: NirvanaClosureFixtureOptions): Promise<NirvanaClosureResult> {
        let temporaryArtifactsRoot: string | undefined;
        try {
            const closure = await this.resolver.resolve({
                projectRoot: options.projectRoot,
                versionsRoot: options.versionsRoot
            });
            const artifactsRoot = options.artifactsRoot
                ?? (temporaryArtifactsRoot = await this.files.makeTemporaryRoot('watchtower-nirvana-artifacts-'));
            const generated = await this.makeManifest(closure, artifactsRoot, options.npmCommand ?? 'npm');
            const manifest = options.expectedManifest === undefined
                ? generated
                : this.assertExpected(options.expectedManifest, generated);
            const installPrefix = options.verifyInstall === false ? undefined : await this.installer.verify({
                manifest,
                artifactsRoot,
                watchtowerPackageRoot: options.watchtowerPackageRoot,
                npmCommand: options.npmCommand ?? 'npm',
                nodeCommand: options.nodeCommand ?? 'node',
                sourceRoots: [closure.versionRoot, closure.versionsRoot, options.projectRoot],
                keepPrefix: options.keepInstallPrefix
            });
            return {
                ok: true,
                manifest,
                artifactsRoot: temporaryArtifactsRoot ? '<temporary>' : artifactsRoot,
                installPrefix
            };
        } catch (error: unknown) {
            const known = error instanceof NirvanaClosureError
                ? error
                : new NirvanaClosureError('PACK_FAILED', 'pack', 'nirvana-closure-fixture', safeMessage(error));
            return {ok: false, reason: known.reason, phase: known.phase, target: known.target, message: known.message};
        } finally {
            if (temporaryArtifactsRoot) await this.files.removeTree(temporaryArtifactsRoot);
        }
    }

    private async makeManifest(
        closure: Awaited<ReturnType<NirvanaEcosystemClosureResolver['resolve']>>,
        artifactsRoot: string,
        npmCommand: string
    ): Promise<NirvanaDependencyClosureManifest> {
        return this.validator.validate(await this.packer.pack({closure, artifactsRoot, npmCommand}));
    }

    private assertExpected(expectedValue: unknown, generated: NirvanaDependencyClosureManifest): NirvanaDependencyClosureManifest {
        const expected = this.validator.validate(expectedValue);
        if (JSON.stringify(closureIdentity(expected)) !== JSON.stringify(closureIdentity(generated))) {
            throw new NirvanaClosureError('PACKAGE_IDENTITY_MISMATCH', 'verify', 'nirvana-dependency-closure.json', 'Generated closure package identities differ from the accepted manifest.');
        }
        // The selected ecosystem version and package graph are the compatibility
        // contract. The generated manifest carries the current artifact/source
        // digests so a rebuild of the same pinned ecosystem is installable.
        return generated;
    }
}

function closureIdentity(manifest: NirvanaDependencyClosureManifest): unknown {
    return {
        ecosystemVersion: manifest.ecosystem.version,
        watchtower: {
            name: manifest.watchtower.name,
            version: manifest.watchtower.version,
            dependencies: manifest.watchtower.dependencies
        },
        packages: manifest.packages.map((item) => ({
            kind: item.kind,
            name: item.name,
            version: item.version,
            dependencies: item.dependencies
        }))
    };
}

function safeMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unexpected fixture failure.';
}
