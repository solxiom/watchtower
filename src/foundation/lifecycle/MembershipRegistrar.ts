/** Post-commit, idempotent publication of secondary-repository memberships. */
import {createHash, randomUUID} from 'node:crypto';
import {mkdir, open, readFile, rename, rm, lstat} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import type {RepositoryBinding} from '../../contracts/types.js';
import {createWatchtowerError} from '../../contracts/errors.js';
import {canonicalizePath, safePathTarget} from '../paths/index.js';
import {resolveWatchtowerDataHome} from '../paths/index.js';
import {readLaneManifest} from '../discovery/index.js';
import {nodeLaneDiscoveryFileSystem} from '../discovery/index.js';
import {readMembershipIndex} from '../discovery/index.js';
import {acquireInitLockLease, type InitLockLease, type InitLockOptions} from '../init/index.js';
import {readRepositoryBindings} from '../bindings/index.js';

const MAX_INDEX_BYTES = 1024 * 1024;

export interface RegistrationResult {
    readonly registered: boolean;
    readonly retryCount: number;
    readonly warning?: string;
}

export interface RegistrationOptions extends InitLockOptions {
    readonly beforePublish?: (indexPath: string) => Promise<void>;
    readonly register?: (laneDir: string) => Promise<RegistrationResult>;
    readonly sleep?: (milliseconds: number) => Promise<void>;
}

export async function registerLane(laneDir: string, options: RegistrationOptions = {}): Promise<RegistrationResult> {
    const canonicalLaneDir = canonicalizePath(laneDir);
    const dataHome = canonicalizePath(options.dataHome ?? resolveWatchtowerDataHome());
    const lease = await acquireInitLockLease(dirname(dirname(dirname(canonicalLaneDir))), basenameOfLane(canonicalLaneDir), {...options, dataHome});
    try {
        return await publishMemberships(canonicalLaneDir, dataHome, options.beforePublish);
    } finally {
        await releaseLease(lease);
    }
}

export async function registerLaneWithRetry(
    laneDir: string, maxRetries = 3, options: RegistrationOptions = {}
): Promise<RegistrationResult> {
    const attempts = Number.isInteger(maxRetries) && maxRetries >= 0 ? maxRetries : 3;
    const operation = options.register ?? ((path: string) => registerLane(path, options));
    for (let retryCount = 0; retryCount <= attempts; retryCount += 1) {
        try {
            const result = await operation(laneDir);
            return {...result, retryCount};
        } catch (error) {
            if (retryCount === attempts) {
                return {registered: false, retryCount, warning: registrationWarning(error)};
            }
            await (options.sleep ?? delay)(retryDelay(retryCount));
        }
    }
    return {registered: false, retryCount: attempts, warning: 'Membership registration did not complete.'};
}

async function publishMemberships(
    laneDir: string, dataHome: string, beforePublish?: (indexPath: string) => Promise<void>
): Promise<RegistrationResult> {
    const manifestPath = join(laneDir, 'lane.json');
    const manifest = readLaneManifest(manifestPath, nodeLaneDiscoveryFileSystem);
    const bindings = readRepositoryBindings(join(laneDir, 'repositories.local.json'), manifest.repositories);
    const indexPath = join(dataHome, 'index', 'repository-memberships.json');
    await mkdir(dirname(indexPath), {recursive: true});
    const before = await readOptional(indexPath);
    const existing = readMembershipIndex(dataHome);
    const entries: Record<string, MembershipReference> = {};
    for (const membership of existing.memberships) {
        entries[membership.worktreePath] = {laneId: membership.laneId, laneHome: membership.laneHome};
    }
    const laneHome = canonicalizePath(dirname(dirname(dirname(laneDir))));
    for (const binding of bindings) entries[binding.path] = {laneId: manifest.laneId, laneHome};
    const content = `${JSON.stringify(sortEntries(entries), null, 2)}\n`;
    await beforePublish?.(indexPath);
    await verifyUnchanged(indexPath, before);
    await atomicReplace(indexPath, Buffer.from(content));
    return {registered: true, retryCount: 0};
}

interface MembershipReference {readonly laneId: string; readonly laneHome: string;}

async function verifyUnchanged(path: string, before: Buffer | undefined): Promise<void> {
    const current = await readOptional(path);
    if (!sameBytes(before, current)) {
        throw createWatchtowerError('ERR_LOCK_CONFLICT', {
            operation: 'publish repository membership index', target: safePathTarget(path),
            remediation: 'Retry registration after the concurrent index writer completes.'
        });
    }
}

async function readOptional(path: string): Promise<Buffer | undefined> {
    try {
        const info = await lstat(path);
        if (!info.isFile() || info.size > MAX_INDEX_BYTES) throw indexUnavailable(path);
        return await readFile(path);
    } catch (error) {
        if (isMissing(error)) return undefined;
        if (isWatchtowerError(error)) throw error;
        throw indexUnavailable(path);
    }
}

async function atomicReplace(path: string, content: Buffer): Promise<void> {
    const temporary = join(dirname(path), `.${basenameOfLane(path)}.tmp-${randomUUID()}`);
    let handle;
    try {
        handle = await open(temporary, 'wx', 0o644);
        await handle.writeFile(content);
        await handle.sync();
        await handle.close();
        await rename(temporary, path);
        const directory = await open(dirname(path), 'r');
        try { await directory.sync(); } finally { await directory.close(); }
    } catch (error) {
        await handle?.close().catch(() => undefined);
        await rm(temporary, {force: true});
        throw indexUnavailable(path, error);
    }
}

async function releaseLease(lease: InitLockLease): Promise<void> { await lease.release(); }
function sortEntries(entries: Record<string, MembershipReference>): Record<string, MembershipReference> {
    return Object.fromEntries(Object.entries(entries).sort(([left], [right]) => left.localeCompare(right)));
}
function basenameOfLane(path: string): string { return path.split('/').pop() ?? 'lane'; }
function sameBytes(left: Buffer | undefined, right: Buffer | undefined): boolean {
    return left === undefined ? right === undefined : right !== undefined && createHash('sha256').update(left).digest('hex') === createHash('sha256').update(right).digest('hex');
}
function retryDelay(retryCount: number): number { return Math.min(250, 25 * (retryCount + 1)); }
function delay(milliseconds: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, milliseconds)); }
function registrationWarning(error: unknown): string {
    const detail = error instanceof Error ? error.message : 'unknown registration failure';
    return `Lane is home-discoverable, but secondary-repository discovery is unavailable until membership registration succeeds (${detail.slice(0, 120)}).`;
}
function indexUnavailable(target: string, cause?: unknown) {
    const detail = cause instanceof Error ? ` (${cause.message.slice(0, 80)})` : '';
    return createWatchtowerError('ERR_INDEX_UNAVAILABLE', {operation: `write repository membership index${detail}`, target: safePathTarget(target), remediation: 'Restore a writable, valid repository-memberships.json path and retry registration.'});
}
function isMissing(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'; }
function isWatchtowerError(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'; }
