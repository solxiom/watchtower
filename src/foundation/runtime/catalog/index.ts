import {join} from 'node:path';
import type {KnowledgeManifestV1, RuntimeManifestV1} from '../../../contracts/runtimeKnowledgeManifests.js';
import {RuntimeCatalogError} from '../../../contracts/runtimeCatalog.js';
import {resolveWatchtowerDataHome} from '../../paths/index.js';
import {ImmutableVersionStore} from './ImmutableVersionStore.js';
import {ManifestStagingValidator} from './ManifestStagingValidator.js';

const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(-.+)?$/u;

export interface RuntimeCatalogOptions {
    readonly dataRoot?: () => string;
    readonly store?: ImmutableVersionStore;
    readonly validator?: ManifestStagingValidator;
}

export class RuntimeCatalog {
    private readonly dataRoot: () => string;
    private readonly store: ImmutableVersionStore;
    private readonly validator: ManifestStagingValidator;

    constructor(options: RuntimeCatalogOptions = {}) {
        this.dataRoot = options.dataRoot ?? resolveWatchtowerDataHome;
        this.store = options.store ?? new ImmutableVersionStore();
        this.validator = options.validator ?? new ManifestStagingValidator();
    }

    stageRuntime(version: string, manifest: RuntimeManifestV1, source: string): void {
        this.assertVersion(version);
        const parsed = this.parseRuntime(version, manifest);
        this.assertManifestVersion(version, parsed.runtimeVersion);
        this.stageValidated(version, parsed, source, 'runtimes', (root) => this.validator.validateStagedRuntime(root));
    }

    stageKnowledge(version: string, manifest: KnowledgeManifestV1, source: string): void {
        this.assertVersion(version);
        const parsed = this.parseKnowledge(version, manifest);
        this.assertManifestVersion(version, parsed.knowledgeVersion);
        this.stageValidated(version, parsed, source, 'knowledge', (root) => this.validator.validateStagedKnowledge(root));
    }

    isRuntimeInstalled(version: string): boolean {
        return this.isInstalled(version, 'runtimes', (root) => this.validator.validateStagedRuntime(root));
    }

    isKnowledgeInstalled(version: string): boolean {
        return this.isInstalled(version, 'knowledge', (root) => this.validator.validateStagedKnowledge(root));
    }

    getRuntimeRoot(version: string): string {
        return this.root(version, 'runtimes', (root) => this.validator.validateStagedRuntime(root));
    }

    getKnowledgeRoot(version: string): string {
        return this.root(version, 'knowledge', (root) => this.validator.validateStagedKnowledge(root));
    }

    listInstalledRuntimes(): string[] {
        return this.list('runtimes', (root) => this.validator.validateStagedRuntime(root));
    }

    listInstalledKnowledge(): string[] {
        return this.list('knowledge', (root) => this.validator.validateStagedKnowledge(root));
    }

    private stageValidated<T>(version: string, manifest: T, source: string, collection: string, validate: (root: string) => void): void {
        this.store.stage(join(this.dataRoot(), collection), version, source, manifest, validate);
    }

    private isInstalled(version: string, collection: string, validate: (root: string) => void): boolean {
        try {
            this.root(version, collection, validate);
            return true;
        } catch (error) {
            if (error instanceof RuntimeCatalogError && error.reason === 'VERSION_NOT_INSTALLED') return false;
            throw error;
        }
    }

    private root(version: string, collection: string, validate: (root: string) => void): string {
        this.assertVersion(version);
        return this.store.installedRoot(join(this.dataRoot(), collection), version, validate);
    }

    private list(collection: string, validate: (root: string) => void): string[] {
        return this.store.list(join(this.dataRoot(), collection), (value) => VERSION.test(value), validate);
    }

    private assertVersion(version: string): void {
        if (!VERSION.test(version)) throw new RuntimeCatalogError('INVALID_VERSION_STRING', version, 'Version must use semantic-version syntax.');
    }

    private assertManifestVersion(requested: string, declared: string): void {
        if (requested !== declared) throw new RuntimeCatalogError('STAGING_VALIDATION_FAILED', requested, 'Manifest version does not match the requested version.');
    }

    private parseRuntime(version: string, manifest: RuntimeManifestV1): RuntimeManifestV1 {
        try { return this.validator.validateRuntime(manifest); } catch (error) { throw stagingFailure(version, error); }
    }

    private parseKnowledge(version: string, manifest: KnowledgeManifestV1): KnowledgeManifestV1 {
        try { return this.validator.validateKnowledge(manifest); } catch (error) { throw stagingFailure(version, error); }
    }
}

function stagingFailure(version: string, error: unknown): RuntimeCatalogError {
    if (error instanceof RuntimeCatalogError) return error;
    const message = error instanceof Error ? error.message : 'unknown error';
    return new RuntimeCatalogError('STAGING_VALIDATION_FAILED', version, `Package manifest validation failed: ${message}`);
}
