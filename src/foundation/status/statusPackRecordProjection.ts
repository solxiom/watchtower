import {isJsonObject, isJsonValue} from '../schemaComposition/jsonCanonicalizer.js';
import type {JsonObject, JsonValue} from '../schemaComposition/schemaCompositionContracts.js';
import type {PackAcceptanceRecord, PackLockRecord, PackManifestRecord} from './statusPackTypes.js';

export function projectPackRecords(manifest: JsonObject, acceptance: JsonObject, lock: JsonObject): {
    manifest: PackManifestRecord; acceptance: PackAcceptanceRecord; lock: PackLockRecord;
} {
    return {manifest: {value: manifest, packId: stringField(manifest, 'packId'),
        packRepository: stringField(manifest, 'packRepository'),
        authoredByLaneId: stringField(manifest, 'authoredByLaneId'),
        repositories: arrayField(manifest, 'repositories').map(repository => ({id: stringField(repository, 'id'),
            access: literalField(repository, 'access', ['read', 'write'])})),
        sourceBaselines: jsonField(manifest, 'sourceBaselines'), baselines: baselineFields(manifest),
        acceptedInputs: arrayField(manifest, 'acceptedInputs').map(input => ({
            repository: stringField(input, 'repository'), path: stringField(input, 'path'),
            sha256: stringField(input, 'sha256'), acceptanceRef: stringField(input, 'acceptanceRef')})),
        writablePaths: writablePaths(manifest), proofInputs: proofInputs(manifest)},
    acceptance: {value: acceptance, packId: stringField(acceptance, 'packId'),
        acceptedManifestDigest: stringField(acceptance, 'acceptedManifestDigest'),
        reviewedCommit: stringField(acceptance, 'reviewedCommit'), reviewerId: stringField(acceptance, 'reviewerId'),
        reviewSessionId: stringField(acceptance, 'reviewSessionId'),
        findings: arrayField(acceptance, 'findings').map(finding => ({id: stringField(finding, 'id'),
            severity: literalField(finding, 'severity', ['info', 'minor', 'major', 'critical']),
            disposition: literalField(finding, 'disposition', ['closed', 'superseded']),
            ...(typeof finding.acceptedReviewRef === 'string' ? {acceptedReviewRef: finding.acceptedReviewRef} : {})}))},
    lock: {packId: stringField(lock, 'packId'), sealId: stringField(lock, 'sealId'),
        manifestDigest: stringField(lock, 'manifestDigest'), acceptanceDigest: stringField(lock, 'acceptanceDigest'),
        sourceBaselines: jsonField(lock, 'sourceBaselines'), files: arrayField(lock, 'files').map(file => ({
            path: stringField(file, 'path'), sha256: stringField(file, 'sha256'), bytes: numberField(file, 'bytes')}))}};
}

function baselineFields(manifest: JsonObject): Readonly<Record<string, {revision: string; dirty: boolean}>> {
    const value = manifest.sourceBaselines;
    if (!isJsonObject(value)) throw new Error('invalid source baselines');
    return Object.fromEntries(Object.entries(value).map(([id, baseline]) => {
        if (!isJsonObject(baseline) || typeof baseline.dirty !== 'boolean') throw new Error('invalid source baseline');
        return [id, {revision: stringField(baseline, 'revision'), dirty: baseline.dirty}];
    }));
}
function writablePaths(manifest: JsonObject): Array<{repository: string; path: string}> {
    return arrayField(manifest, 'batches').flatMap(batch => arrayField(batch, 'repositories')
        .filter(repository => repository.access === 'write').flatMap(repository => stringArray(repository.paths)
            .map(path => ({repository: stringField(repository, 'id'), path}))));
}
function proofInputs(manifest: JsonObject): Array<{repository: string; path: string; optional: boolean}> {
    const repositoryIds = new Set(arrayField(manifest, 'repositories').map(item => stringField(item, 'id')));
    const context: ProofInputContext = {result: [], seen: new Set()};
    appendProofInputs(manifest, repositoryIds, context);
    for (const batch of arrayField(manifest, 'batches')) {
        const batchIds = new Set(arrayField(batch, 'repositories').map(item => stringField(item, 'id')));
        appendProofInputs(batch, new Set([...batchIds].filter(id => repositoryIds.has(id))), context);
    }
    return context.result;
}
interface ProofInputContext {
    readonly result: Array<{repository: string; path: string; optional: boolean}>;
    readonly seen: Set<string>;
}
function appendProofInputs(owner: JsonObject, allowedRepositories: ReadonlySet<string>, context: ProofInputContext): void {
    for (const input of optionalObjectArray(owner.proofInputs)) {
        const repository = stringField(input, 'repository'); const path = stringField(input, 'path');
        if (!allowedRepositories.has(repository) || typeof input.optional !== 'boolean') {
            throw new Error('invalid proof input');
        }
        const key = `${repository}\u0000${path}`;
        if (context.seen.has(key)) throw new Error('duplicate or contradictory proof input');
        context.seen.add(key); context.result.push({repository, path, optional: input.optional});
    }
}
function stringField(value: JsonObject, field: string): string {
    const selected = value[field]; if (typeof selected !== 'string') throw new Error('invalid pack field'); return selected;
}
function numberField(value: JsonObject, field: string): number {
    const selected = value[field]; if (typeof selected !== 'number') throw new Error('invalid pack field'); return selected;
}
function literalField<T extends string>(value: JsonObject, field: string, allowed: readonly T[]): T {
    const selected = stringField(value, field); if (!allowed.includes(selected as T)) throw new Error('invalid literal');
    return selected as T;
}
function jsonField(value: JsonObject, field: string): JsonValue {
    const selected = value[field]; if (!isJsonValue(selected)) throw new Error('invalid pack field'); return selected;
}
function arrayField(value: JsonObject, field: string): JsonObject[] {
    const selected = value[field];
    if (!Array.isArray(selected) || !selected.every(isJsonObject)) throw new Error('invalid pack field'); return selected;
}
function optionalObjectArray(value: JsonValue | undefined): JsonObject[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || !value.every(isJsonObject)) throw new Error('invalid optional array'); return value;
}
function stringArray(value: JsonValue | undefined): string[] {
    if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) throw new Error('invalid string array');
    return value;
}
