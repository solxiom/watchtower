import {isJsonObject} from '../schemaComposition/jsonCanonicalizer.js';
import type {JsonObject, JsonValue} from '../schemaComposition/schemaCompositionContracts.js';
import type {PackFileDigest, PackManifestRecord} from './statusPackTypes.js';

const ARTIFACT_PATHS: Readonly<Record<string, string>> = Object.freeze({
    readme: 'README.md', traceability: 'requirements-traceability.md', implementationMap: 'implementation-map.md',
    qualityRules: 'implementation-quality-and-agent-rules.md', roadmap: 'implementation-roadmap.md',
    tracker: 'implementation-tracker.md', acceptance: 'pack-acceptance.json', seal: 'implementation-pack.lock.json'
});

/** Validates coordinator-critical references against the exact sealed graph. */
export class StatusPackGraphValidator {
    valid(manifest: PackManifestRecord, files: readonly PackFileDigest[]): boolean {
        if (!isJsonObject(manifest.value)) return false;
        const sealed = new Set(files.map(file => file.path));
        const repositories = objectArray(manifest.value.repositories);
        const requirements = objectArray(manifest.value.requirements);
        const batches = objectArray(manifest.value.batches);
        if (repositories === undefined || requirements === undefined || batches === undefined) return false;
        const repositoryIds = uniqueIds(repositories); const requirementIds = uniqueIds(requirements);
        const batchIds = uniqueIds(batches);
        if (repositoryIds === undefined || requirementIds === undefined || batchIds === undefined ||
            !repositoryIds.has(manifest.packRepository) || !sameKeys(manifest.baselines, repositoryIds) ||
            !this.artifactsValid(manifest.value.artifacts, sealed) ||
            !this.inputsValid(manifest, repositoryIds, sealed)) return false;
        const acceptedSources = new Set(manifest.acceptedInputs.map(input => key(input.repository, input.path)));
        return requirements.every(item => requirementValid(item, repositoryIds, batchIds, acceptedSources)) &&
            batches.every(item => batchValid(item, repositoryIds, requirementIds, batchIds, sealed)) &&
            reciprocalCoverageValid(requirements, batches) &&
            acyclic(batches, batchIds);
    }

    private artifactsValid(value: JsonValue | undefined, sealed: ReadonlySet<string>): boolean {
        if (!isJsonObject(value)) return false;
        for (const [name, requiredPath] of Object.entries(ARTIFACT_PATHS)) {
            if (value[name] !== requiredPath) return false;
        }
        return Object.entries(value).every(([name, path]) => typeof path === 'string' &&
            (name === 'seal' ? path === ARTIFACT_PATHS.seal : sealed.has(path)));
    }

    private inputsValid(manifest: PackManifestRecord, repositories: ReadonlySet<string>,
        sealed: ReadonlySet<string>): boolean {
        const keys = manifest.acceptedInputs.map(input => key(input.repository, input.path));
        return new Set(keys).size === keys.length && manifest.acceptedInputs.every(input =>
            repositories.has(input.repository) && sealed.has(input.acceptanceRef));
    }
}

function requirementValid(value: JsonObject, repositories: ReadonlySet<string>, batches: ReadonlySet<string>,
    acceptedSources: ReadonlySet<string>): boolean {
    const repository = string(value.repository); const source = string(value.source);
    const work = stringArray(value.workBatches); const review = stringArray(value.reviewBatches);
    return repository !== undefined && source !== undefined && work !== undefined && review !== undefined &&
        repositories.has(repository) && acceptedSources.has(key(repository, source)) &&
        work.every(id => batches.has(id)) && review.every(id => batches.has(id));
}

function batchValid(value: JsonObject, repositories: ReadonlySet<string>, requirements: ReadonlySet<string>,
    batches: ReadonlySet<string>, sealed: ReadonlySet<string>): boolean {
    const id = string(value.id); const primary = string(value.primaryRepository); const work = string(value.workBrief);
    const review = string(value.reviewBrief); const dependencies = stringArray(value.dependsOn);
    const requirementIds = stringArray(value.requirements); const batchRepositories = objectArray(value.repositories);
    if (id === undefined || primary === undefined || work === undefined || review === undefined ||
        dependencies === undefined || requirementIds === undefined || batchRepositories === undefined ||
        !sealed.has(work) || !sealed.has(review) || dependencies.includes(id) ||
        !dependencies.every(item => batches.has(item)) || !requirementIds.every(item => requirements.has(item))) return false;
    const ids = uniqueIds(batchRepositories);
    return ids !== undefined && ids.has(primary) && [...ids].every(item => repositories.has(item));
}

function reciprocalCoverageValid(requirements: readonly JsonObject[], batches: readonly JsonObject[]): boolean {
    const requirementEdges = new Set<string>(); const batchEdges = new Set<string>();
    for (const requirement of requirements) {
        const id = string(requirement.id); const work = stringArray(requirement.workBatches);
        const review = stringArray(requirement.reviewBatches);
        if (id === undefined || work === undefined || review === undefined) return false;
        [...work, ...review].forEach(batch => requirementEdges.add(key(id, batch)));
    }
    for (const batch of batches) {
        const id = string(batch.id); const requirementIds = stringArray(batch.requirements);
        if (id === undefined || requirementIds === undefined) return false;
        requirementIds.forEach(requirement => batchEdges.add(key(requirement, id)));
    }
    return requirementEdges.size === batchEdges.size && [...requirementEdges].every(edge => batchEdges.has(edge));
}

function acyclic(batches: readonly JsonObject[], ids: ReadonlySet<string>): boolean {
    const dependencies = new Map<string, Set<string>>();
    for (const batch of batches) {
        const id = string(batch.id); const values = stringArray(batch.dependsOn);
        if (id === undefined || values === undefined) return false;
        dependencies.set(id, new Set(values));
    }
    while (dependencies.size > 0) {
        const ready = [...dependencies].filter(([, values]) => values.size === 0).map(([id]) => id);
        if (ready.length === 0) return false;
        ready.forEach(id => dependencies.delete(id));
        dependencies.forEach(values => ready.forEach(id => values.delete(id)));
    }
    return dependencies.size === 0 && ids.size === batches.length;
}

function uniqueIds(values: readonly JsonObject[]): Set<string> | undefined {
    const ids = values.map(value => string(value.id));
    if (ids.some(id => id === undefined)) return undefined;
    const selected = new Set(ids.filter((id): id is string => id !== undefined));
    return selected.size === values.length ? selected : undefined;
}
function objectArray(value: JsonValue | undefined): JsonObject[] | undefined {
    return Array.isArray(value) && value.every(isJsonObject) ? value : undefined;
}
function stringArray(value: JsonValue | undefined): string[] | undefined {
    return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : undefined;
}
function string(value: JsonValue | undefined): string | undefined { return typeof value === 'string' ? value : undefined; }
function sameKeys(value: Readonly<Record<string, unknown>>, expected: ReadonlySet<string>): boolean {
    return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}
function key(repository: string, path: string): string { return `${repository}\u0000${path}`; }
