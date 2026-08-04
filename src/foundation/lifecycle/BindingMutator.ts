/** Repository-binding and conditional Git-ignore mutation foundation. */
import {createHash, randomUUID} from 'node:crypto';
import {lstat, mkdir, open, readFile, rename, rm, stat, unlink} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import type {RepositoryBinding} from '../../contracts/types.js';
import {createWatchtowerError} from '../../contracts/errors.js';
import {authorizePath, canonicalizePath, safePathTarget} from '../paths/index.js';
import {acquireInitLocks, releaseInitLocks} from '../init/index.js';

const WATCHTOWER_LINE = '/.watchtower/';
const ORIGINALS = new Map<string, OriginalGitignore>();

export interface GitignoreUpdate {
    readonly path: string;
    readonly originalDigest: string;
    readonly writtenDigest: string;
    readonly rolledBack: boolean;
}

export interface BindingResult {
    readonly gitignoreUpdated: boolean;
    readonly gitignoreUpdate: GitignoreUpdate | null;
    readonly bindingsWritten: boolean;
}

interface OriginalGitignore {
    readonly content: Buffer;
    readonly existed: boolean;
    readonly mode: number;
    readonly writtenDigest: string;
}

export {acquireInitLocks, releaseInitLocks};

export async function shouldUpdateGitignore(controlHome: string): Promise<boolean> {
    const path = gitignorePath(controlHome);
    try {
        const content = await readRegularFile(path);
        return !containsWatchtowerLine(content.toString('utf8'));
    } catch (error) {
        if (isMissing(error)) return true;
        throw gitignoreFailure(path, 'read', error);
    }
}

export async function updateGitignore(controlHome: string): Promise<GitignoreUpdate> {
    const path = gitignorePath(controlHome);
    const original = await readOriginal(path);
    const originalDigest = digest(original.content);
    if (containsWatchtowerLine(original.content.toString('utf8'))) {
        return {path, originalDigest, writtenDigest: originalDigest, rolledBack: false};
    }
    const content = appendWatchtowerLine(original.content.toString('utf8'));
    const writtenDigest = digest(Buffer.from(content));
    await atomicReplace(path, Buffer.from(content), original.mode);
    ORIGINALS.set(originalKey(path, originalDigest), {content: original.content, existed: original.existed, mode: original.mode, writtenDigest});
    return {path, originalDigest, writtenDigest, rolledBack: false};
}

export async function restoreGitignore(controlHome: string, originalDigest: string): Promise<boolean> {
    const path = gitignorePath(controlHome);
    const original = ORIGINALS.get(originalKey(path, originalDigest));
    if (original === undefined) return false;
    const current = await readRegularFile(path).catch(error => {
        if (isMissing(error)) return Buffer.alloc(0);
        throw gitignoreFailure(path, 'read for rollback', error);
    });
    if (digest(current) !== original.writtenDigest) return false;
    if (original.existed) await atomicReplace(path, original.content, original.mode);
    else {
        await unlink(path);
        await syncDirectory(dirname(path));
    }
    ORIGINALS.delete(originalKey(path, originalDigest));
    return true;
}

export async function writeBindings(laneDir: string, bindings: RepositoryBinding[]): Promise<void> {
    const target = authorizePath(canonicalizePath(laneDir), 'repositories.local.json');
    const normalized = validateBindings(bindings, target);
    await atomicReplace(target, Buffer.from(`${JSON.stringify({schemaVersion: 1, repositories: normalized}, null, 2)}\n`), 0o644);
}

function gitignorePath(controlHome: string): string {
    return authorizePath(canonicalizePath(controlHome), '.gitignore');
}

async function readOriginal(path: string): Promise<{content: Buffer; existed: boolean; mode: number}> {
    try {
        const info = await lstat(path);
        if (!info.isFile()) throw new Error('The .gitignore path is not a regular file.');
        return {content: await readFile(path), existed: true, mode: info.mode & 0o777};
    } catch (error) {
        if (isMissing(error)) return {content: Buffer.alloc(0), existed: false, mode: 0o644};
        throw gitignoreFailure(path, 'read', error);
    }
}

async function readRegularFile(path: string): Promise<Buffer> {
    const info = await lstat(path);
    if (!info.isFile()) throw new Error('The path is not a regular file.');
    return readFile(path);
}

async function atomicReplace(path: string, content: Buffer, mode: number): Promise<void> {
    const directory = dirname(path);
    await mkdir(directory, {recursive: true});
    const temporary = join(directory, `.${path.split('/').pop() ?? 'watchtower'}.tmp-${randomUUID()}`);
    let handle;
    try {
        handle = await open(temporary, 'wx', mode);
        await handle.writeFile(content);
        await handle.sync();
        await handle.close();
        await rename(temporary, path);
        await syncDirectory(directory);
    } catch (error) {
        await handle?.close().catch(() => undefined);
        await rm(temporary, {force: true});
        throw mutationFailure(path, 'atomically replace file', error);
    }
}

async function syncDirectory(path: string): Promise<void> {
    const handle = await open(path, 'r');
    try { await handle.sync(); } finally { await handle.close(); }
}

function validateBindings(bindings: RepositoryBinding[], target: string): RepositoryBinding[] {
    if (!Array.isArray(bindings) || bindings.length === 0) throw invalidBindings(target);
    const ids = new Set<string>();
    const paths = new Set<string>();
    return bindings.map(binding => {
        if (!isBinding(binding) || ids.has(binding.id) || paths.has(binding.path)) throw invalidBindings(target);
        if (canonicalizePath(binding.path) !== binding.path) throw invalidBindings(target);
        ids.add(binding.id); paths.add(binding.path);
        return {...binding};
    });
}

function isBinding(value: unknown): value is RepositoryBinding {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const candidate = value as Record<string, unknown>;
    return Object.keys(candidate).length === 6 && typeof candidate.id === 'string' && /^[a-z0-9][a-z0-9-]{0,62}$/u.test(candidate.id)
        && typeof candidate.path === 'string' && typeof candidate.branch === 'string' && typeof candidate.role === 'string'
        && (candidate.worktreeMode === 'dedicated' || candidate.worktreeMode === 'shared')
        && (candidate.access === 'read' || candidate.access === 'write');
}

function containsWatchtowerLine(content: string): boolean {
    return content.split(/\r?\n/u).some(line => line === WATCHTOWER_LINE);
}

function appendWatchtowerLine(content: string): string {
    const newline = content.length === 0 || content.endsWith('\n') ? '' : '\n';
    return `${content}${newline}${WATCHTOWER_LINE}\n`;
}

function digest(content: Buffer): string { return createHash('sha256').update(content).digest('hex'); }
function originalKey(path: string, digestValue: string): string { return `${path}\u0000${digestValue}`; }
function isMissing(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'; }

function invalidBindings(target: string) {
    return createWatchtowerError('ERR_INVALID_LANE_CONFIG', {operation: 'write repository bindings', target: safePathTarget(target), remediation: 'Provide one complete canonical binding for each repository.'});
}

function gitignoreFailure(target: string, operation: string, error: unknown) {
    const detail = error instanceof Error ? error.message : 'unknown filesystem failure';
    return createWatchtowerError('ERR_UNSAFE_MUTATION', {operation: `${operation} .gitignore (${detail.slice(0, 80)})`, target: safePathTarget(target), remediation: 'Restore a regular writable .gitignore and retry the lane mutation.'});
}

function mutationFailure(target: string, operation: string, error: unknown) {
    const detail = error instanceof Error ? error.message : 'unknown filesystem failure';
    return createWatchtowerError('ERR_UNSAFE_MUTATION', {operation: `${operation} (${detail.slice(0, 80)})`, target: safePathTarget(target), remediation: 'Restore a writable regular target and retry the lane mutation.'});
}
