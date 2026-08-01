import {join} from 'node:path';
import type {LaneManifestV1, MembershipIndexResult, MembershipWarning, RepositoryMembership} from '../contracts/index.js';
import {createWatchtowerError} from '../contracts/errors.js';
import {authorizePath, canonicalizePath, safePathTarget} from './canonicalPaths.js';
import {discoverHomeLanes} from './homeLaneDiscovery.js';
import type {LaneDiscoveryFileSystem} from './LaneDiscoveryFileSystem.js';
import {nodeLaneDiscoveryFileSystem} from './LaneDiscoveryFileSystem.js';

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu;
const MAX_INDEX_BYTES = 1024 * 1024;

export interface MembershipIndexFileSystem extends LaneDiscoveryFileSystem {}

interface IndexReference {readonly laneId: string; readonly laneHome: string;}
interface LocalBinding {readonly id: string; readonly path: string; readonly branch: string; readonly worktreeMode: string; readonly role: string; readonly access: string;}

export function readMembershipIndex(
    dataHome: string, fileSystem: MembershipIndexFileSystem = nodeLaneDiscoveryFileSystem
): MembershipIndexResult {
    const indexPath = authorizePath(canonicalizePath(dataHome), 'index/repository-memberships.json');
    const index = readIndex(indexPath, fileSystem);
    if (index === undefined) return {memberships: [], warnings: []};
    const memberships: RepositoryMembership[] = [];
    const warnings: MembershipWarning[] = [];
    for (const [worktreePath, reference] of Object.entries(index).sort(([left], [right]) => left.localeCompare(right))) {
        const validated = validateReference(worktreePath, reference, fileSystem);
        if ('reason' in validated) warnings.push(validated);
        else memberships.push(validated);
    }
    return {memberships, warnings};
}

function readIndex(path: string, fileSystem: MembershipIndexFileSystem): Record<string, IndexReference> | undefined {
    try {
        const file = fileSystem.inspect(path);
        if (file === undefined) return undefined;
        if (file.kind !== 'file' || file.size > MAX_INDEX_BYTES) throw unavailable(path);
        const content = fileSystem.readText(path);
        if (hasDuplicateMember(content)) throw unavailable(path);
        return normalizeIndex(JSON.parse(content), path);
    } catch (error) {
        if (isWatchtowerError(error)) throw error;
        throw unavailable(path);
    }
}

function normalizeIndex(value: unknown, path: string): Record<string, IndexReference> {
    if (!isRecord(value)) throw unavailable(path);
    const result: Record<string, IndexReference> = {};
    for (const [worktreePath, reference] of Object.entries(value)) {
        if (!isReference(reference) || !isIndexPath(worktreePath)) throw unavailable(path);
        result[worktreePath] = reference;
    }
    return result;
}

function validateReference(
    worktreePath: string, reference: IndexReference, fileSystem: MembershipIndexFileSystem
): RepositoryMembership | MembershipWarning {
    let worktree: string;
    try { worktree = canonicalizePath(worktreePath); } catch { return warning(worktreePath, reference, 'PATH_MISSING'); }
    if (worktree !== worktreePath || fileSystem.inspect(worktree)?.kind !== 'directory') {
        return warning(worktreePath, reference, 'PATH_MISSING');
    }
    const laneHome = canonicalLaneHome(reference.laneHome, worktreePath, reference, fileSystem);
    if (typeof laneHome !== 'string') return laneHome;
    const lane = findReferencedLane(laneHome, reference.laneId, fileSystem);
    if (lane === undefined) return warning(worktreePath, reference, 'LANE_JSON_MISSING');
    return matchesBinding(lane.manifest, lane.laneDir, worktree, fileSystem)
        ? {worktreePath, laneId: reference.laneId, laneHome, lane}
        : warning(worktreePath, reference, 'BINDING_MISMATCH');
}

function canonicalLaneHome(home: string, worktree: string, reference: IndexReference,
    fileSystem: MembershipIndexFileSystem): string | MembershipWarning {
    try { return canonicalizePath(home); } catch (error) {
        if (fileSystem.inspect(home) === undefined) return warning(worktree, reference, 'LANE_JSON_MISSING');
        throw error;
    }
}

function findReferencedLane(laneHome: string, laneId: string, fileSystem: MembershipIndexFileSystem) {
    return discoverHomeLanes(laneHome, fileSystem).find(candidate =>
        candidate.laneId === laneId && candidate.controlHome === laneHome);
}

function matchesBinding(manifest: LaneManifestV1, laneDir: string, worktreePath: string,
    fileSystem: MembershipIndexFileSystem): boolean {
    const bindings = readBindings(join(laneDir, 'repositories.local.json'), fileSystem);
    return bindings.length === manifest.repositories.length && bindings.some(binding => binding.path === worktreePath) &&
        manifest.repositories.every(repository => bindings.some(binding => binding.id === repository.id &&
            binding.role === repository.role && binding.access === repository.access));
}

function readBindings(path: string, fileSystem: MembershipIndexFileSystem): LocalBinding[] {
    const file = fileSystem.inspect(path);
    if (file?.kind !== 'file' || file.size > MAX_INDEX_BYTES) throw invalidBinding(path);
    let content: string;
    try { content = fileSystem.readText(path); } catch { throw invalidBinding(path); }
    if (hasDuplicateMember(content)) throw invalidBinding(path);
    let value: unknown;
    try { value = JSON.parse(content); } catch { throw invalidBinding(path); }
    if (!isRecord(value) || value.schemaVersion !== 1 || Object.keys(value).length !== 2 || !Array.isArray(value.repositories)) {
        throw invalidBinding(path);
    }
    const bindings = value.repositories.map(normalizeBinding);
    if (new Set(bindings.map(binding => binding.id)).size !== bindings.length ||
        new Set(bindings.map(binding => binding.path)).size !== bindings.length) throw invalidBinding(path);
    return bindings;
}

function normalizeBinding(value: unknown): LocalBinding {
    if (!isRecord(value) || Object.keys(value).length !== 6 || !isSlug(value.id) || !isCanonicalPath(value.path) ||
        !isSafeText(value.branch) || (value.worktreeMode !== 'dedicated' && value.worktreeMode !== 'shared') ||
        !isSafeText(value.role) || (value.access !== 'read' && value.access !== 'write')) throw invalidBinding('<binding>');
    return {id: value.id, path: value.path, branch: value.branch, worktreeMode: value.worktreeMode,
        role: value.role, access: value.access};
}

function warning(worktreePath: string, reference: IndexReference, reason: MembershipWarning['reason']): MembershipWarning {
    return {worktreePath, laneId: reference.laneId, laneHome: reference.laneHome, reason};
}

function isReference(value: unknown): value is IndexReference {
    return isRecord(value) && Object.keys(value).length === 2 && UUID.test(String(value.laneId)) &&
        isIndexPath(value.laneHome);
}

function isCanonicalPath(value: unknown): value is string {
    try { return typeof value === 'string' && canonicalizePath(value) === value; } catch { return false; }
}

function isIndexPath(value: unknown): value is string {
    return typeof value === 'string' && value.startsWith('/') &&
        !/[\u0000-\u001f\u007f]/u.test(value) && value.split('/').every(segment => segment !== '..');
}

function isSlug(value: unknown): value is string { return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,62}$/u.test(value); }
function isSafeText(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && !/[\u0000-\u001f\u007f]/u.test(value); }

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function unavailable(path: string) {
    return createWatchtowerError('ERR_INDEX_UNAVAILABLE', {
        operation: 'read repository membership index', target: safePathTarget(path),
        remediation: 'Restore a readable, valid repository-memberships.json file.'
    });
}

function invalidBinding(path: string) {
    return createWatchtowerError('ERR_INVALID_LANE_CONFIG', {
        operation: 'read repository bindings', target: safePathTarget(path),
        remediation: 'Restore a complete, readable schemaVersion 1 repositories.local.json file.'
    });
}

function isWatchtowerError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_INDEX_UNAVAILABLE';
}

function hasDuplicateMember(json: string): boolean {
    const keys: Set<string>[] = [];
    for (let index = 0; index < json.length; index += 1) {
        if (json[index] === '{') keys.push(new Set<string>());
        if (json[index] === '}') keys.pop();
        if (json[index] !== '"') continue;
        const end = stringEnd(json, index + 1);
        if (end === undefined) return false;
        let key: unknown;
        try { key = JSON.parse(json.slice(index, end + 1)); } catch { return false; }
        index = end;
        let next = index + 1;
        while (/\s/u.test(json[next] ?? '')) next += 1;
        if (json[next] !== ':' || typeof key !== 'string' || keys.length === 0) continue;
        const current = keys[keys.length - 1];
        if (current.has(key)) return true;
        current.add(key);
    }
    return false;
}

function stringEnd(json: string, start: number): number | undefined {
    for (let index = start; index < json.length; index += 1) {
        if (json[index] === '\\') index += 1;
        else if (json[index] === '"') return index;
    }
    return undefined;
}
