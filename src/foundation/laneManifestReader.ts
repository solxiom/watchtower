import {basename, join} from 'node:path';
import type {
    ImplementationPackRef, LaneManifestV1, LaneRelationSet, RepositoryRef, ResourceClaim
} from '../contracts/index.js';
import {createWatchtowerError} from '../contracts/errors.js';
import {safePathTarget} from './paths/index.js';
import type {LaneDiscoveryFileSystem} from './LaneDiscoveryFileSystem.js';

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu;
const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/u;
const GENERAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const MAX_MARKER_BYTES = 256 * 1024;

export function readLaneManifest(markerPath: string, fileSystem: LaneDiscoveryFileSystem): LaneManifestV1 {
    const content = readRegularMarker(markerPath, fileSystem);
    if (findDuplicateMember(content) !== undefined) {
        throw invalidManifest(markerPath, 'Remove duplicate JSON object members.');
    }
    let value: unknown;
    try {
        value = JSON.parse(content);
    } catch {
        throw invalidManifest(markerPath, 'Repair the malformed lane.json document.');
    }
    return normalizeManifest(value, markerPath);
}

function readRegularMarker(markerPath: string, fileSystem: LaneDiscoveryFileSystem): string {
    try {
        const marker = fileSystem.inspect(markerPath);
        if (marker?.kind !== 'file') {
            throw invalidManifest(markerPath, 'Replace the lane marker with a regular lane.json file.');
        }
        if (marker.size > MAX_MARKER_BYTES) {
            throw invalidManifest(markerPath, 'Reduce lane.json below the 256 KiB read limit.');
        }
        return fileSystem.readText(markerPath);
    } catch (error) {
        if (isWatchtowerError(error)) throw error;
        throw invalidManifest(markerPath, 'Restore a readable regular lane.json file.');
    }
}

function normalizeManifest(value: unknown, markerPath: string): LaneManifestV1 {
    if (!isRecord(value)) throw invalidManifest(markerPath, 'Use a JSON object for lane.json.');
    if (value.schemaVersion === undefined) throw invalidManifest(markerPath, 'Add schemaVersion 1.');
    if (value.schemaVersion !== 1) throw unsupportedManifest(markerPath);
    if (value.kind !== 'implementation') throw unsupportedManifest(markerPath);
    if (!isUuid(value.laneId) || !isSlug(value.slug) || !isGeneralId(value.initiativeId) ||
        !isSlug(value.controlHomeRepository) || !isLaneDir(value.laneDir, value.slug)) {
        throw invalidManifest(markerPath, 'Repair the required lane identity fields.');
    }
    const repositories = normalizeRepositories(value.repositories, value.controlHomeRepository, markerPath);
    if (basename(join(markerPath, '..')) !== value.slug) {
        throw invalidManifest(markerPath, 'Make the lane directory name match the manifest slug.');
    }
    const repositoryIds = new Set(repositories.map(repository => repository.id));
    const optional = normalizeOptionalFields(value, repositoryIds, markerPath);
    return {...value, ...optional, schemaVersion: 1, laneId: value.laneId, kind: 'implementation', slug: value.slug,
        initiativeId: value.initiativeId, controlHomeRepository: value.controlHomeRepository,
        laneDir: value.laneDir, repositories};
}

function normalizeRepositories(value: unknown, homeId: string, markerPath: string): RepositoryRef[] {
    if (!Array.isArray(value) || value.length === 0) {
        throw invalidManifest(markerPath, 'Declare at least one repository binding.');
    }
    const repositories: RepositoryRef[] = [];
    const ids = new Set<string>();
    for (const item of value) {
        if (!isRecord(item) || !isSlug(item.id) || !isSafeString(item.role) ||
            (item.access !== 'read' && item.access !== 'write') || ids.has(item.id)) {
            throw invalidManifest(markerPath, 'Repair the repository declarations and remove duplicate IDs.');
        }
        ids.add(item.id);
        repositories.push({id: item.id, role: item.role, access: item.access});
    }
    if (repositories.filter(repository => repository.id === homeId).length !== 1) {
        throw invalidManifest(markerPath, 'Declare the control-home repository exactly once.');
    }
    return repositories;
}

function normalizeOptionalFields(value: Record<string, unknown>, repositoryIds: ReadonlySet<string>,
    markerPath: string): Partial<LaneManifestV1> {
    const result: Partial<LaneManifestV1> = {};
    if (value.implementationPack !== undefined) {
        result.implementationPack = implementationPack(value.implementationPack, repositoryIds, markerPath);
    }
    if (value.relations !== undefined) result.relations = relations(value.relations, markerPath);
    if (value.claims !== undefined) result.claims = claims(value.claims, repositoryIds, markerPath);
    if (value.createdAt !== undefined) {
        if (!isSafeString(value.createdAt) || Number.isNaN(Date.parse(value.createdAt))) {
            throw invalidManifest(markerPath, 'Use an ISO date-time for createdAt.');
        }
        result.createdAt = value.createdAt;
    }
    return result;
}

function implementationPack(value: unknown, repositoryIds: ReadonlySet<string>,
    markerPath: string): ImplementationPackRef {
    if (!isRecord(value) || !isSlug(value.repository) || !repositoryIds.has(value.repository) ||
        !isRelativePath(value.path)) {
        throw invalidManifest(markerPath, 'Repair the implementationPack reference.');
    }
    return {repository: value.repository, path: value.path};
}

function relations(value: unknown, markerPath: string): LaneRelationSet {
    if (!isRecord(value) || !Object.values(value).every(isUuid)) {
        throw invalidManifest(markerPath, 'Use stable lane UUIDs for relations.');
    }
    const result: LaneRelationSet = {};
    for (const [name, laneId] of Object.entries(value)) {
        if (!isUuid(laneId)) throw invalidManifest(markerPath, 'Use stable lane UUIDs for relations.');
        result[name] = laneId;
    }
    return result;
}

function claims(value: unknown, repositoryIds: ReadonlySet<string>, markerPath: string): ResourceClaim[] {
    if (!Array.isArray(value)) throw invalidManifest(markerPath, 'Use an array for claims.');
    return value.map(item => {
        if (!isRecord(item) || !isSlug(item.repository) || !repositoryIds.has(item.repository) ||
            !Array.isArray(item.paths) ||
            !item.paths.every(isRelativePath) ||
            (item.mode !== 'read' && item.mode !== 'shared-write' && item.mode !== 'exclusive-write')) {
            throw invalidManifest(markerPath, 'Repair the repository resource claims.');
        }
        return {repository: item.repository, paths: item.paths, mode: item.mode};
    });
}

function findDuplicateMember(json: string): string | undefined {
    const objectKeys: Set<string>[] = [];
    for (let index = 0; index < json.length; index += 1) {
        if (json[index] === '{') objectKeys.push(new Set<string>());
        if (json[index] === '}') objectKeys.pop();
        if (json[index] !== '"') continue;
        const end = stringEnd(json, index + 1);
        if (end === undefined) return undefined;
        let member: unknown;
        try { member = JSON.parse(json.slice(index, end + 1)); } catch { return undefined; }
        index = end;
        let next = index + 1;
        while (/\s/u.test(json[next] ?? '')) next += 1;
        if (json[next] !== ':' || objectKeys.length === 0 || typeof member !== 'string') continue;
        const keys = objectKeys[objectKeys.length - 1];
        if (keys.has(member)) return member;
        keys.add(member);
    }
    return undefined;
}

function stringEnd(json: string, start: number): number | undefined {
    for (let index = start; index < json.length; index += 1) {
        if (json[index] === '\\') index += 1;
        else if (json[index] === '"') return index;
    }
    return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype;
}

function isUuid(value: unknown): value is string { return typeof value === 'string' && UUID.test(value); }
function isSlug(value: unknown): value is string { return typeof value === 'string' && SLUG.test(value); }
function isGeneralId(value: unknown): value is string { return typeof value === 'string' && GENERAL_ID.test(value); }
function isSafeString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f]/u.test(value);
}
function isRelativePath(value: unknown): value is string {
    return isSafeString(value) && !value.startsWith('/') && !value.includes('\\') &&
        value.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..');
}
function isLaneDir(value: unknown, slug: string): value is string {
    return value === `.watchtower/lanes/${slug}`;
}

function invalidManifest(target: string, remediation: string) {
    return createWatchtowerError('ERR_INVALID_LANE_CONFIG', {
        operation: 'read lane marker', target: safePathTarget(target), remediation
    });
}

function unsupportedManifest(target: string) {
    return createWatchtowerError('ERR_UNSUPPORTED_VERSION', {
        operation: 'read lane marker', target: safePathTarget(target), remediation: 'Use a schemaVersion 1 lane marker.'
    });
}

function isWatchtowerError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error &&
        (error.code === 'ERR_INVALID_LANE_CONFIG' || error.code === 'ERR_UNSUPPORTED_VERSION');
}
