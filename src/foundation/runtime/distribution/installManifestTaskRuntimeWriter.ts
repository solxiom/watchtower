/**
 * Atomic single-field rebind of an EXISTING `install.json`'s `taskRuntime`
 * member (Correction 01 finding 5; Correction 02 finding 1).
 *
 * The RT-06/LC-03 writer boundary and this module's exact durability
 * obligations are operator-authorized in
 * `docs/spec/implementation/wt-runtime-distribution/RT-06-specification-resolution-amendment.md`
 * §1 — a durable spec-tree record, not an implementer-authored report note.
 * This module only *rebinds* one field of an already-materialized document;
 * it never creates `lane.json`/`install.json`, which remains
 * `wt-lane-lifecycle` LC-03's scope.
 *
 * Correction 02 required four additional properties beyond Correction 01's
 * writer:
 *
 * 1. **Identity coherence** — a rebind must never leave `runtimeVersion` and
 *    the pinned target's runtime version contradictory. The caller supplies
 *    the exact runtime version the pin was computed against; a mismatch
 *    against the existing document's `runtimeVersion` refuses before any
 *    write.
 * 2. **Canonical lane-path authorization** — the caller supplies a lane
 *    directory, not a bare path string; `install.json`'s path is derived and
 *    authorized through the same accepted lane-path owner
 *    (`canonicalPaths.ts#buildLaneFilePath`) every other lane-owned file read
 *    uses. Unlike a managed link's source, `install.json` is authoritative
 *    lane content that must never resolve outside the lane, so the full
 *    realpath-following containment that owner performs is exactly what is
 *    required here.
 * 3. **Lock and revalidation** — the read-check-write sequence runs entirely
 *    inside the lane's managed-asset lock, so a concurrent `ManagedAssets`
 *    link mutation or a second rebind cannot interleave with it.
 * 4. **Complete durable replacement** — temp-write, flush, atomic rename,
 *    and now also a flush of the containing directory
 *    (`docs/development/engineering-and-review-standard.md` §9), plus a full
 *    document re-read/re-parse verification, not only the `taskRuntime`
 *    member.
 */
import {closeSync, fsyncSync, openSync, readFileSync, renameSync, unlinkSync, writeSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {dirname, join} from 'node:path';
import {ManagedAssetsError, type InstallManifestV1} from '../../../contracts/manifests.js';
import type {PinnedTaskRuntimeTarget} from '../../../contracts/taskRuntime.js';
import {buildLaneFilePath} from '../../paths/index.js';
import {acquireManagedAssetsLock} from './managedAssetsLock.js';
import {parseInstallManifest} from './installManifestReader.js';

const INSTALL_FILE = 'install.json';
const MAX_INSTALL_BYTES = 256 * 1024;

/**
 * Read `laneDir`'s `install.json`, refuse if its `runtimeVersion` disagrees
 * with `runtimeVersion`, then atomically replace only `taskRuntime` with
 * `pin`, under the lane lock, with a durably verified result.
 */
export function rebindTaskRuntime(laneDir: string, runtimeVersion: string, pin: PinnedTaskRuntimeTarget): InstallManifestV1 {
    const lock = acquireManagedAssetsLock(laneDir);
    try {
        const installJsonPath = authorizeInstallJsonPath(laneDir);
        const before = readExisting(installJsonPath);
        if (before.runtimeVersion !== runtimeVersion) {
            throw new ManagedAssetsError('INSTALL_MANIFEST_INVALID', installJsonPath,
                `install.json declares runtimeVersion ${before.runtimeVersion}, which disagrees with the pinned runtime version ${runtimeVersion}.`);
        }
        const next: InstallManifestV1 = {...before, taskRuntime: pin};
        writeAtomic(installJsonPath, `${JSON.stringify(next, null, 2)}\n`);
        const after = readExisting(installJsonPath);
        if (!sameDocument(after, next)) {
            throw new ManagedAssetsError('INSTALL_MANIFEST_INVALID', installJsonPath,
                'Durable verification failed: the rebound install.json does not read back the exact written document.');
        }
        return after;
    } finally {
        lock.release();
    }
}

function authorizeInstallJsonPath(laneDir: string): string {
    try {
        return buildLaneFilePath(laneDir, INSTALL_FILE);
    } catch (error) {
        throw new ManagedAssetsError('INSTALL_MANIFEST_INVALID', laneDir, `install.json path is not lane-contained: ${message(error)}`);
    }
}

function readExisting(path: string): InstallManifestV1 {
    let text: string;
    try {
        text = readFileSync(path, 'utf8');
    } catch (error) {
        throw new ManagedAssetsError('INSTALL_MANIFEST_INVALID', path, `install.json is unreadable: ${message(error)}`);
    }
    if (text.length > MAX_INSTALL_BYTES) {
        throw new ManagedAssetsError('INSTALL_MANIFEST_INVALID', path, 'install.json exceeds the bounded read size.');
    }
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        throw new ManagedAssetsError('INSTALL_MANIFEST_INVALID', path, 'install.json is not well-formed JSON.');
    }
    return parseInstallManifest(value);
}

/** Temp-write, flush, atomic rename, flush the containing directory. */
function writeAtomic(path: string, text: string): void {
    const directory = dirname(path);
    const tempPath = join(directory, `.install.json.${randomUUID()}.tmp`);
    const fd = openSync(tempPath, 'wx', 0o644);
    try {
        writeSync(fd, text);
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
    try {
        renameSync(tempPath, path);
    } catch (error) {
        try { unlinkSync(tempPath); } catch { /* best-effort cleanup of a failed temp write */ }
        throw new ManagedAssetsError('INSTALL_MANIFEST_INVALID', path, `Atomic rebind rename failed: ${message(error)}`);
    }
    syncDirectory(directory);
}

function syncDirectory(directory: string): void {
    const fd = openSync(directory, 'r');
    try {
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
}

function sameDocument(a: InstallManifestV1, b: InstallManifestV1): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
}
