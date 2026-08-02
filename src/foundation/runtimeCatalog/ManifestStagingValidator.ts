import {createHash} from 'node:crypto';
import {lstatSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative, sep} from 'node:path';
import type {KnowledgeManifestV1, ManifestAssetObservation, RuntimeKnowledgeManifestV1, RuntimeManifestV1} from '../../contracts/runtimeKnowledgeManifests.js';
import {RuntimeCatalogError} from '../../contracts/runtimeCatalog.js';
import {RuntimeKnowledgeManifestValidator} from '../runtimeKnowledgeManifest/RuntimeKnowledgeManifestValidator.js';

export class ManifestStagingValidator {
    private readonly validator = new RuntimeKnowledgeManifestValidator();

    validateRuntime(manifest: unknown): RuntimeManifestV1 {
        return this.validator.validateRuntime(manifest);
    }

    validateKnowledge(manifest: unknown): KnowledgeManifestV1 {
        return this.validator.validateKnowledge(manifest);
    }

    validateStagedRuntime(root: string): void {
        this.verify(this.validateRuntime(readManifest(root)), root);
    }

    validateStagedKnowledge(root: string): void {
        this.verify(this.validateKnowledge(readManifest(root)), root);
    }

    private verify(manifest: RuntimeKnowledgeManifestV1, root: string): void {
        const result = this.validator.verifyAssets(manifest, observeAssets(root));
        if (!result.ok) throw new RuntimeCatalogError('STAGING_VALIDATION_FAILED', result.subject, `Manifest validation failed: ${result.reason}.`);
    }
}

function readManifest(root: string): unknown {
    try {
        return JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as unknown;
    } catch (error) {
        throw new RuntimeCatalogError('STAGING_VALIDATION_FAILED', root, `Staged manifest is unreadable: ${message(error)}`);
    }
}

function observeAssets(root: string): ManifestAssetObservation[] {
    return filesBelow(root).filter((file) => relative(root, file) !== 'manifest.json').map((file) => ({
        path: relative(root, file).split(sep).join('/'),
        sha256: `sha256:${createHash('sha256').update(readFileSync(file)).digest('hex')}`,
        mode: (statSync(file).mode & 0o111) === 0 ? '0644' : '0755'
    }));
}

function filesBelow(root: string, directory: string = root): string[] {
    return readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
        const child = join(directory, entry.name);
        if (entry.isDirectory()) return filesBelow(root, child);
        if (entry.isFile()) return [child];
        const kind = lstatSync(child).isSymbolicLink() ? 'symbolic link' : 'non-regular entry';
        throw new RuntimeCatalogError('STAGING_VALIDATION_FAILED', relative(root, child), `Manifest assets cannot include a ${kind}.`);
    });
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
}
