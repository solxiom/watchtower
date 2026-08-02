import {createHash} from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {chmodSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {KnowledgeManifestV1, RuntimeManifestV1} from '../../../src/contracts/runtimeKnowledgeManifests.js';
import {RuntimeCatalogError} from '../../../src/contracts/runtimeCatalog.js';
import {RuntimeCatalog} from '../../../src/foundation/RuntimeCatalog.js';

export interface RuntimeCatalogFixture {
    readonly root: string;
    readonly source: string;
    readonly catalog: RuntimeCatalog;
}

export function makeRuntimeCatalogFixture(): RuntimeCatalogFixture {
    const root = mkFixtureRoot();
    const source = join(root, 'source');
    mkdirSync(join(source, 'bin'), {recursive: true});
    writeFileSync(join(source, 'bin', 'worker'), workerText(), {mode: 0o755});
    return {root, source, catalog: new RuntimeCatalog({dataRoot: () => join(root, 'data')})};
}

export function mkFixtureRoot(): string {
    return rmReady(join(tmpdir(), `watchtower-runtime-catalog-${process.pid}-${Date.now()}-${Math.random()}`));
}

export function rmReady(path: string): string {
    mkdirSync(path, {recursive: true});
    return path;
}

export function cleanupFixture(root: string): void {
    makeWritable(root);
    rmSync(root, {recursive: true, force: true});
}

export function runtimeManifest(version: string, overrides: Partial<RuntimeManifestV1> = {}): RuntimeManifestV1 {
    return {
        schemaVersion: 1,
        manifestId: 'watchtower-runtime/v1',
        runtimeVersion: version,
        minimumCliVersion: '1.0.0',
        compatibleLaneSchemaVersions: [1],
        compatibleKnowledgeVersions: ['1.0.0'],
        assets: [{path: 'bin/worker', sha256: digest(workerText()), mode: '0755'}],
        actions: [],
        requiredCommands: [],
        ...overrides
    };
}

export function knowledgeManifest(version: string): KnowledgeManifestV1 {
    return {
        schemaVersion: 1,
        manifestId: 'watchtower-knowledge/v1',
        knowledgeVersion: version,
        compatibleRuntimeVersions: ['1.0.0'],
        provenance: {repository: 'test', commit: 'a'.repeat(40), importRecordSha256: digest('record')},
        assets: [{path: 'playbook.md', sha256: digest('# playbook\n'), mode: '0644'}]
    };
}

export function workerText(): string {
    return '#!/bin/sh\necho worker\n';
}

export function digest(value: string): `sha256:${string}` {
    return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function expectCatalogError(action: () => void, reason: RuntimeCatalogError['reason']): RuntimeCatalogError {
    try {
        action();
        fail('Expected a catalog error.');
    } catch (error) {
        expect(error instanceof RuntimeCatalogError).toBeTrue();
        if (error instanceof RuntimeCatalogError) {
            expect(error.reason).toBe(reason);
            return error;
        }
    }
    throw new Error('Expected RuntimeCatalogError.');
}

export function makeWritable(path: string): void {
    try {
        if (lstatSync(path).isSymbolicLink()) return;
        chmodSync(path, 0o755);
    } catch {
        return;
    }
    for (const entry of readdirSync(path, {withFileTypes: true})) {
        const child = join(path, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) makeWritable(child);
        else {
            try { chmodSync(child, 0o644); } catch { /* best-effort teardown */ }
        }
    }
}

export function childRequest(
    root: string,
    source: string,
    manifest: RuntimeManifestV1,
    hold: boolean,
    holdBoundary: 'temporary' | 'finalization' = 'temporary'
): {dataRoot: string; hold: boolean; holdBoundary: string; manifest: RuntimeManifestV1; ready: string; source: string; version: string} {
    return {dataRoot: join(root, 'data'), hold, holdBoundary, manifest, ready: join(root, `ready-${Math.random()}`), source, version: '1.0.0'};
}

export function childScript(): string {
    return new URL('./runtimeCatalogStageChild.js', import.meta.url).pathname;
}

export function waitFor(predicate: () => boolean): Promise<void> {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + 5000;
        const timer = setInterval(() => {
            if (predicate()) {
                clearInterval(timer);
                resolve();
            } else if (Date.now() > deadline) {
                clearInterval(timer);
                reject(new Error('Timed out waiting for child staging boundary.'));
            }
        }, 10);
    });
}

export function childExit(child: ReturnType<typeof spawn>): Promise<void> {
    return new Promise((resolve) => child.once('exit', () => resolve()));
}

export function runChild(request: ReturnType<typeof childRequest>): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [childScript()], {env: {...process.env, WATCHTOWER_RUNTIME_CATALOG_CHILD: JSON.stringify(request)}});
        let output = '';
        child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
        child.once('error', reject);
        child.once('exit', () => resolve(output));
    });
}

export function deadPid(): number {
    return spawnSync(process.execPath, ['-e', 'process.exit(0)']).pid as number;
}

export function installedWorkerMode(root: string): number {
    return statSync(join(root, 'bin', 'worker')).mode & 0o777;
}

export function readText(path: string): string {
    return readFileSync(path, 'utf8');
}
