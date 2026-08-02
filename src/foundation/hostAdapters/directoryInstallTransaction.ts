import {cpSync, lstatSync, mkdirSync, mkdtempSync, readdirSync} from 'node:fs';
import {basename, dirname, join} from 'node:path';
import {createWatchtowerError} from '../../contracts/errors.js';
import {createPathEscapeError} from '../canonicalPaths.js';
import {classifyEntry, classifyManagedDestination, removeTransactionMarker, writeTransactionMarker} from './directoryInstallRecovery.js';
import {directoryInstallPort} from './directoryInstallPort.js';
import {assertNoLaneState, VERSION_RECORD_FILE, writeDurableFile} from './hostAdapterInstaller.js';

export {assertNoPendingRecoveryMutation, classifyManagedDestination, recoverInterruptedInstall} from './directoryInstallRecovery.js';

/**
 * Assembles the complete post-install directory state in an isolated sibling staging
 * directory, then commits it to `destination` with exactly one durable transaction — for both
 * a fresh destination and a replace of an existing one. An existing destination must contain no
 * symlink anywhere: a symlink could redirect a later overlay write outside the authorized host
 * directory, so its presence is rejected before anything is copied or overlaid, not discovered
 * mid-write. The verified assets are then copied and overlaid entirely inside the isolated
 * staging copy; a selected path that topologically conflicts with existing content (a file where
 * a directory is needed, or vice versa) fails closed with `ERR_MANAGED_CONFLICT` there, before
 * `destination` is touched at all. The final commit is a durable, fsynced-marker-backed
 * transaction (see `recoverInterruptedInstall` in `directoryInstallRecovery.ts`): a process death
 * between its two renames is detected and completed deterministically by the next caller, so
 * `destination` is never observably absent or ambiguous for longer than the marker persists.
 */
export function stageAndCommitDirectoryInstall(
    destination: string, bytes: ReadonlyMap<string, Buffer>, knowledgeVersion: string
): string[] {
    assertNoLaneState(bytes);
    const destinationExists = classifyManagedDestination(destination);
    if (destinationExists) assertNoDestinationSymlink(destination);
    mkdirSync(dirname(destination), {recursive: true, mode: 0o755});
    const staging = mkdtempSync(join(dirname(destination), `${basename(destination)}.staging-`));
    try {
        if (destinationExists) {
            cpSync(destination, staging, {recursive: true, dereference: false, force: true, errorOnExist: false});
        }
        const written = overlayStagedAssets(staging, bytes);
        overlayStagedVersionRecord(staging, knowledgeVersion);
        commitStagedDirectory(staging, destination);
        return written;
    } catch (error) {
        directoryInstallPort().rmSync(staging, {recursive: true, force: true});
        throw error;
    }
}

/** Fails closed if any entry anywhere in the existing destination tree is a symlink. */
function assertNoDestinationSymlink(destination: string): void {
    const stack = [''];
    while (stack.length > 0) {
        const relative = stack.pop() as string;
        for (const name of readdirSync(join(destination, relative))) {
            const childRelative = relative === '' ? name : `${relative}/${name}`;
            const childPath = join(destination, childRelative);
            const info = lstatSync(childPath);
            if (info.isSymbolicLink()) {
                throw createPathEscapeError(
                    'install knowledge pack', childRelative,
                    'Remove the symlink from the existing installation before installing, or point --replace at a plain directory.'
                );
            }
            if (info.isDirectory()) stack.push(childRelative);
        }
    }
}

/** Overlays verified assets onto the (possibly pre-seeded) staging tree; fails closed on any topology conflict. */
function overlayStagedAssets(staging: string, bytes: ReadonlyMap<string, Buffer>): string[] {
    const written: string[] = [];
    for (const [relativePath, content] of bytes) {
        const target = join(staging, relativePath);
        assertDirectory(dirname(target), relativePath);
        assertNotDirectory(target, relativePath);
        writeDurableFile(target, content, 0o644);
        written.push(relativePath);
    }
    return written.sort();
}

function overlayStagedVersionRecord(staging: string, knowledgeVersion: string): void {
    const record = {knowledgeVersion, installedAt: new Date().toISOString()};
    const target = join(staging, VERSION_RECORD_FILE);
    assertNotDirectory(target, VERSION_RECORD_FILE);
    writeDurableFile(target, `${JSON.stringify(record)}\n`, 0o644);
}

/** Fails closed with `ERR_MANAGED_CONFLICT` if a non-directory entry already occupies `path` or an ancestor. */
function assertDirectory(path: string, subject: string): void {
    try {
        mkdirSync(path, {recursive: true, mode: 0o755});
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'EEXIST' || code === 'ENOTDIR') throw topologyConflictError(subject);
        throw error;
    }
}

/** Fails closed with `ERR_MANAGED_CONFLICT` if a directory already occupies the exact selected-asset path. */
function assertNotDirectory(path: string, subject: string): void {
    if (classifyEntry(path) === 'directory') throw topologyConflictError(subject);
}

function topologyConflictError(subject: string) {
    return createWatchtowerError('ERR_MANAGED_CONFLICT', {
        operation: 'install knowledge asset', target: subject,
        remediation: 'Remove or rename the conflicting existing file or directory, then retry.'
    });
}

/**
 * The only mutation `destination` itself ever sees. A durable, fsynced marker is written before
 * the first rename so `recoverInterruptedInstall` can deterministically finish or restore this
 * exact transaction after a process death; a same-process failure of the second rename restores
 * immediately instead of waiting for a later call.
 */
function commitStagedDirectory(staging: string, destination: string): void {
    const port = directoryInstallPort();
    if (!classifyManagedDestination(destination)) {
        port.renameSync(staging, destination);
        port.syncDirectory(dirname(destination));
        return;
    }
    const previous = `${destination}.previous-${port.randomUUID()}`;
    writeTransactionMarker(destination, {staging, previous});
    port.renameSync(destination, previous);
    port.syncDirectory(dirname(destination));
    try {
        port.renameSync(staging, destination);
        port.syncDirectory(dirname(destination));
    } catch (error) {
        port.renameSync(previous, destination);
        port.syncDirectory(dirname(destination));
        removeTransactionMarker(destination);
        throw error;
    }
    try {
        port.rmSync(previous, {recursive: true, force: true});
        port.syncDirectory(dirname(previous));
    } catch {
        return;
    }
    try {
        removeTransactionMarker(destination);
    } catch {
        return;
    }
}
