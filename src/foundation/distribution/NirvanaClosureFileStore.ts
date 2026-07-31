import {createHash} from 'node:crypto';
import {cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSON5 from 'json5';
import {NirvanaClosureError} from '../../contracts/nirvanaClosure.js';

const excludedTreeNames = new Set(['node_modules', '.git']);

export class NirvanaClosureFileStore {
    async readUnknown(filePath: string): Promise<unknown> {
        try {
            return JSON5.parse(await readFile(filePath, 'utf8')) as unknown;
        } catch (error: unknown) {
            throw new NirvanaClosureError('MALFORMED_MANIFEST', 'resolve', filePath, errorMessage(error));
        }
    }

    async canonicalDirectory(directoryPath: string, boundary?: string): Promise<string> {
        try {
            const canonical = await realpath(directoryPath);
            if (!(await lstat(canonical)).isDirectory()) throw new Error('Path is not a directory.');
            if (boundary && !isContained(boundary, canonical)) {
                throw new NirvanaClosureError('ECOSYSTEM_ROOT_INVALID', 'resolve', directoryPath, 'Directory escapes its authorized root.');
            }
            return canonical;
        } catch (error: unknown) {
            if (error instanceof NirvanaClosureError) throw error;
            throw new NirvanaClosureError('ECOSYSTEM_ROOT_INVALID', 'resolve', directoryPath, errorMessage(error));
        }
    }

    async sha256File(filePath: string): Promise<string> {
        try {
            return digest(await readFile(filePath));
        } catch (error: unknown) {
            throw new NirvanaClosureError('DIGEST_MISMATCH', 'verify', filePath, errorMessage(error));
        }
    }

    async sha256Tree(rootPath: string): Promise<string> {
        const entries: Array<{path: string; bytes: number; mode: number; sha256: string}> = [];
        await this.collectTree(rootPath, rootPath, entries);
        return digest(Buffer.from(JSON.stringify(entries), 'utf8'));
    }

    sha256Value(value: unknown): string {
        return digest(Buffer.from(JSON.stringify(canonicalValue(value)), 'utf8'));
    }

    async copyTree(sourceRoot: string, destinationRoot: string): Promise<void> {
        await mkdir(destinationRoot, {recursive: true});
        for (const entry of await readdir(sourceRoot, {withFileTypes: true})) {
            if (excludedTreeNames.has(entry.name)) continue;
            const source = path.join(sourceRoot, entry.name);
            const destination = path.join(destinationRoot, entry.name);
            const status = await lstat(source);
            if (status.isSymbolicLink()) {
                throw new NirvanaClosureError('SOURCE_LINK', 'pack', source, 'Source package contains a symbolic link.');
            }
            if (status.isDirectory()) await this.copyTree(source, destination);
            else if (status.isFile()) await cp(source, destination, {preserveTimestamps: false});
            else throw new NirvanaClosureError('SOURCE_LINK', 'pack', source, 'Source package contains a non-regular entry.');
        }
    }

    async writeJson(filePath: string, value: unknown): Promise<void> {
        await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, {encoding: 'utf8', mode: 0o644});
    }

    async writeText(filePath: string, value: string): Promise<void> {
        await writeFile(filePath, value, {encoding: 'utf8', mode: 0o600});
    }

    async ensureDirectory(directoryPath: string): Promise<void> {
        await mkdir(directoryPath, {recursive: true, mode: 0o755});
    }

    async move(sourcePath: string, destinationPath: string): Promise<void> {
        await rename(sourcePath, destinationPath);
    }

    async makeTemporaryRoot(prefix: string): Promise<string> {
        return await mkdtemp(path.join(os.tmpdir(), prefix));
    }

    async removeTree(rootPath: string): Promise<void> {
        await rm(rootPath, {recursive: true, force: true});
    }

    async assertNoEscapingSymlinks(rootPath: string, forbiddenRoots: readonly string[]): Promise<void> {
        const canonicalForbidden = await Promise.all(forbiddenRoots.map(async item => await realpath(item)));
        await this.walkForLinks(rootPath, await realpath(rootPath), canonicalForbidden);
    }

    private async collectTree(
        rootPath: string,
        currentPath: string,
        entries: Array<{path: string; bytes: number; mode: number; sha256: string}>
    ): Promise<void> {
        for (const entry of (await readdir(currentPath, {withFileTypes: true})).sort((a, b) => compareText(a.name, b.name))) {
            if (excludedTreeNames.has(entry.name)) continue;
            const absolute = path.join(currentPath, entry.name);
            const status = await lstat(absolute);
            if (status.isSymbolicLink()) {
                throw new NirvanaClosureError('SOURCE_LINK', 'resolve', absolute, 'Source package contains a symbolic link.');
            }
            if (status.isDirectory()) await this.collectTree(rootPath, absolute, entries);
            else if (status.isFile()) entries.push({
                path: path.relative(rootPath, absolute).split(path.sep).join('/'),
                bytes: status.size,
                mode: status.mode & 0o777,
                sha256: digest(await readFile(absolute))
            });
            else throw new NirvanaClosureError('SOURCE_LINK', 'resolve', absolute, 'Source package contains a non-regular entry.');
        }
    }

    private async walkForLinks(rootPath: string, canonicalRoot: string, forbiddenRoots: readonly string[]): Promise<void> {
        for (const entry of await readdir(rootPath, {withFileTypes: true})) {
            const absolute = path.join(rootPath, entry.name);
            const status = await lstat(absolute);
            if (status.isSymbolicLink()) {
                let target: string;
                try {
                    target = await realpath(absolute);
                } catch (error: unknown) {
                    throw new NirvanaClosureError('INSTALLED_LINK', 'verify', absolute, errorMessage(error));
                }
                if (!isContained(canonicalRoot, target) || forbiddenRoots.some(root => isContained(root, target))) {
                    throw new NirvanaClosureError('INSTALLED_LINK', 'verify', absolute, 'Installed link escapes the fresh prefix or resolves to a source root.');
                }
            }
            if (status.isDirectory()) await this.walkForLinks(absolute, canonicalRoot, forbiddenRoots);
        }
    }
}

export function sha256Digest(content: Buffer | string): string {
    return digest(typeof content === 'string' ? Buffer.from(content, 'utf8') : content);
}

function digest(content: Buffer): string {
    return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function isContained(boundary: string, candidate: string): boolean {
    const relative = path.relative(boundary, candidate);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function canonicalValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonicalValue);
    if (typeof value === 'object' && value !== null) {
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => compareText(left, right))
            .map(([key, child]) => [key, canonicalValue(child)]);
        return Object.fromEntries(entries);
    }
    return value;
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}
