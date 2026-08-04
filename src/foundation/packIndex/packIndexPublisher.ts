/**
 * Reads and atomically writes the two on-disk pointer artifacts CA-01 owns:
 * the per-generation `index-manifest.json` sidecar and the lane-level
 * `current.json` pointer (`docs/spec/coordinator-automation.md §9.3`).
 * `current.json` is rewritten by write-to-temp-then-`rename`, fsyncing the file
 * and its directory before and after the rename, so a reader never observes a
 * partially written pointer and a crash mid-publish leaves the previous
 * complete pointer intact.
 */
import {randomUUID} from 'node:crypto';
import {closeSync, fsyncSync, openSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import type {PackIndexManifest, PackIndexPointer} from '../../contracts/packIndex.js';

const MANIFEST_FILE = 'index-manifest.json';
const POINTER_FILE = 'current.json';

function fsyncPath(path: string): void {
    const fd = openSync(path, 'r');
    try {
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJsonFile(path: string): unknown {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        return null;
    }
}

/** Writes bytes to a same-directory temp file then atomically renames over `path`, fsyncing before and after. */
function atomicWrite(path: string, bytes: string): void {
    const dir = dirname(path);
    const staged = join(dir, `.write-${randomUUID()}`);
    try {
        writeFileSync(staged, bytes, 'utf8');
        fsyncPath(staged);
        renameSync(staged, path);
        fsyncPath(dir);
    } finally {
        rmSync(staged, {force: true});
    }
}

export function writeIndexManifest(indexDir: string, manifest: PackIndexManifest): void {
    atomicWrite(join(indexDir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
}

export function readIndexManifest(indexDir: string): PackIndexManifest | null {
    const value = readJsonFile(join(indexDir, MANIFEST_FILE));
    if (!isRecord(value) || value.schemaVersion !== 1 || value.backend !== 'sqlite' || value.storeKind !== 'pack') return null;
    const {databaseSchemaVersion, compilerVersion, laneId, packId, packSealId, source, counts, semanticRoot, builtAt} = value;
    if (typeof databaseSchemaVersion !== 'number' || typeof compilerVersion !== 'string' || typeof laneId !== 'string'
        || typeof packId !== 'string' || typeof packSealId !== 'string' || typeof semanticRoot !== 'string' || typeof builtAt !== 'string'
        || !isRecord(source) || !isRecord(counts)) return null;
    const {identity, checkpoint, repository, path, manifestDigest, lockDigest} = source;
    if (typeof identity !== 'string' || typeof checkpoint !== 'string' || typeof repository !== 'string' || typeof path !== 'string'
        || typeof manifestDigest !== 'string' || typeof lockDigest !== 'string') return null;
    const readCounts: Record<string, number> = {};
    for (const [key, count] of Object.entries(counts)) {
        if (typeof count !== 'number') return null;
        readCounts[key] = count;
    }
    return {
        schemaVersion: 1, backend: 'sqlite', storeKind: 'pack', databaseSchemaVersion, compilerVersion, laneId,
        packId, packSealId, source: {identity, checkpoint, repository, path, manifestDigest, lockDigest},
        counts: readCounts, semanticRoot, builtAt
    };
}

export function readPointer(indexRoot: string): PackIndexPointer | null {
    const value = readJsonFile(join(indexRoot, POINTER_FILE));
    if (!isRecord(value)) return null;
    const {indexId, packSealId, databaseSchemaVersion, compilerVersion, manifestDigest} = value;
    if (typeof indexId !== 'string' || typeof packSealId !== 'string' || typeof databaseSchemaVersion !== 'number'
        || typeof compilerVersion !== 'string' || typeof manifestDigest !== 'string') return null;
    return {indexId, packSealId, databaseSchemaVersion, compilerVersion, manifestDigest};
}

export function writePointer(indexRoot: string, pointer: PackIndexPointer): void {
    atomicWrite(join(indexRoot, POINTER_FILE), `${JSON.stringify(pointer, null, 2)}\n`);
}
