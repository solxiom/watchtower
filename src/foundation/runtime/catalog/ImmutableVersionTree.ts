import {dirname, join, relative} from 'node:path';
import {RuntimeCatalogError} from '../../../contracts/runtimeCatalog.js';
import type {ImmutableVersionFileSystem} from './ImmutableVersionFileSystem.js';
import {syncDirectory} from './RuntimeCatalogLock.js';

export function copyVersionTree(
    fileSystem: ImmutableVersionFileSystem, source: string, destination: string
): void {
    const root = fileSystem.lstat(source);
    if (!root.isDirectory() || root.isSymbolicLink()) {
        throw new RuntimeCatalogError('STAGING_VALIDATION_FAILED', source, 'Runtime source must be a real directory.');
    }
    for (const entry of fileSystem.readdir(source)) {
        const input = join(source, entry.name);
        const output = join(destination, entry.name);
        if (entry.isDirectory()) {
            fileSystem.mkdir(output, {mode: fileSystem.stat(input).mode & 0o777});
            copyVersionTree(fileSystem, input, output);
        } else if (entry.isFile()) {
            fileSystem.copyFile(input, output);
            fileSystem.chmod(output, fileSystem.stat(input).mode & 0o777);
            syncFile(fileSystem, output);
        } else {
            throw new RuntimeCatalogError(
                'STAGING_VALIDATION_FAILED', relative(source, input),
                'Runtime source must contain only regular files and directories.'
            );
        }
    }
    syncDirectory(fileSystem, destination);
}

export function writeVersionManifest(
    fileSystem: ImmutableVersionFileSystem, root: string, manifest: unknown
): void {
    const file = join(root, 'manifest.json');
    fileSystem.writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, {mode: 0o644});
    syncFile(fileSystem, file);
    syncDirectory(fileSystem, root);
}

export function sealVersionTree(fileSystem: ImmutableVersionFileSystem, root: string): void {
    for (const entry of fileSystem.readdir(root)) {
        const child = join(root, entry.name);
        if (entry.isDirectory()) sealVersionTree(fileSystem, child);
        else fileSystem.chmod(child, (fileSystem.stat(child).mode & 0o111) === 0 ? 0o444 : 0o555);
    }
    fileSystem.chmod(root, 0o555);
}

export function removeWritableVersionTree(fileSystem: ImmutableVersionFileSystem, root: string): void {
    if (!root || !fileSystem.exists(root)) return;
    for (const entry of fileSystem.readdir(root)) {
        const child = join(root, entry.name);
        if (entry.isDirectory()) removeWritableVersionTree(fileSystem, child);
        else { fileSystem.chmod(child, 0o644); fileSystem.unlink(child); }
    }
    fileSystem.chmod(root, 0o755);
    fileSystem.rmdir(root);
}

export function removeCreatedVersionDirectories(
    fileSystem: ImmutableVersionFileSystem, created: string, parent: string
): void {
    if (!created) return;
    let candidate = parent;
    while (candidate.startsWith(created)) {
        try { fileSystem.rmdir(candidate); } catch { return; }
        if (candidate === created) return;
        candidate = dirname(candidate);
    }
}

function syncFile(fileSystem: ImmutableVersionFileSystem, file: string): void {
    const descriptor = fileSystem.open(file, 'r');
    try { fileSystem.fsync(descriptor); } finally { fileSystem.close(descriptor); }
}
