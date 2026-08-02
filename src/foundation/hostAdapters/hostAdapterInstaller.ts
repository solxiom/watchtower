import {closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, rmSync, writeSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {basename, dirname, join} from 'node:path';
import {authorizePath, canonicalizePath} from '../canonicalPaths.js';
import {findLaneStateMarker, laneStateError} from './knowledgePackSource.js';
import type {PreviewFile} from './hostAdapterTypes.js';

export const VERSION_RECORD_FILE = '.watchtower-version';

/** Resolves a fixed, non-configurable host destination beneath its known base directory. */
export function resolveKnownDestination(base: string, ...segments: readonly string[]): string {
    return authorizePath(canonicalizePath(base), join(...segments));
}

export function previewDestinationFiles(destination: string, relativePaths: readonly string[]): PreviewFile[] {
    return relativePaths.map((relativePath) => ({
        sourcePath: relativePath, destinationPath: join(destination, relativePath)
    }));
}

export function detectExistingFiles(destination: string, relativePaths: readonly string[]): string[] {
    return relativePaths.filter((relativePath) => existsSync(join(destination, relativePath)));
}

/** Every byte destined for the destination must be validated before any of it is written. */
export function assertNoLaneState(bytes: ReadonlyMap<string, Buffer>): void {
    for (const [relativePath, content] of bytes) {
        const marker = findLaneStateMarker(content.toString('utf8'));
        if (marker !== null) throw laneStateError(relativePath, marker);
    }
}

export function syncDirectory(directory: string): void {
    const fd = openSync(directory, 'r');
    try {
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
}

export function writeDurableFile(path: string, content: Buffer | string, mode: number): void {
    const fd = openSync(path, 'w', mode);
    try {
        writeSync(fd, Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'));
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
    syncDirectory(dirname(path));
}

/** Writes to a sibling temp file then renames over `path`, so a replace never exposes a truncated file. */
export function writeDurableFileAtomic(path: string, content: Buffer | string, mode: number): void {
    const staging = join(dirname(path), `${basename(path)}.staging-${randomUUID()}`);
    try {
        writeDurableFile(staging, content, mode);
        renameSync(staging, path);
        syncDirectory(dirname(path));
    } catch (error) {
        rmSync(staging, {force: true});
        throw error;
    }
}

export function readVersionRecord(destination: string): string | null {
    try {
        const parsed: unknown = JSON.parse(readFileSync(join(destination, VERSION_RECORD_FILE), 'utf8'));
        return isVersionRecord(parsed) ? parsed.knowledgeVersion : null;
    } catch {
        return null;
    }
}

function isVersionRecord(value: unknown): value is {knowledgeVersion: string} {
    return typeof value === 'object' && value !== null
        && typeof (value as {knowledgeVersion?: unknown}).knowledgeVersion === 'string';
}
