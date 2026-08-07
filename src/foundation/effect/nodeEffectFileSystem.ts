/**
 * The single `node:fs` adapter behind `EffectFileSystem` (CA-10).
 *
 * Durability rules from `docs/spec/v1-contracts.md` §9 and §11 live here and
 * nowhere else in this capability: a journal append is one open-with-append
 * write of the complete record plus newline followed by `fsync` before any
 * cursor or projection may claim it, and an envelope is created exclusively
 * with its restricted mode so a pre-existing path is a conflict rather than a
 * silent overwrite.
 *
 * The pinned Nirvana storage facade is root-scoped and exposes neither
 * exclusive-create with an exact mode nor directory `fsync`, which
 * `nirvana-integration-architecture.md` §4.3 already names as adapter work —
 * the same accepted boundary `foundation/task/runtime/runtimeFileSystem.ts`
 * documents. That is not license to spread filesystem calls through the
 * capability: this is the only module in `foundation/effect/` that imports
 * `node:fs`.
 */
import {
    appendFileSync, closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync,
    renameSync, rmSync, statSync, writeFileSync, type Stats
} from 'node:fs';
import type {EffectFileSystem, TextRead} from './effectPorts.js';

export const nodeEffectFileSystem: EffectFileSystem = {
    ensureDirectory(path: string): void {
        mkdirSync(path, {recursive: true});
    },
    fileExists(path: string): boolean {
        try {
            return statSync(path).isFile();
        } catch {
            return false;
        }
    },
    /**
     * Absence and unreadability are reported as distinct outcomes
     * (correction-01 CA10-03). `ENOENT` is the only condition that means
     * "missing"; a permission error, a directory, a partially written
     * artifact, or an oversized file is `unreadable` and must fail closed at
     * the caller rather than be mistaken for an initial state.
     */
    readText(path: string, maxBytes: number): TextRead {
        let stats: Stats;
        try {
            stats = statSync(path);
        } catch (error) {
            return (error as NodeJS.ErrnoException).code === 'ENOENT'
                ? {kind: 'missing'}
                : {kind: 'unreadable', reason: 'io-error'};
        }
        if (!stats.isFile()) return {kind: 'unreadable', reason: 'not-a-file'};
        if (stats.size > maxBytes) return {kind: 'unreadable', reason: 'too-large'};
        try {
            return {kind: 'text', text: readFileSync(path).toString('utf8')};
        } catch {
            return {kind: 'unreadable', reason: 'io-error'};
        }
    },
    createExclusive(path: string, content: string, mode: number): boolean {
        let fd: number;
        try {
            fd = openSync(path, 'wx', mode);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
            throw error;
        }
        try {
            writeFileSync(fd, content);
            fsyncSync(fd);
        } finally {
            closeSync(fd);
        }
        return true;
    },
    appendLine(path: string, line: string): void {
        appendFileSync(path, `${line}\n`, {encoding: 'utf8'});
        const fd = openSync(path, 'r');
        try {
            fsyncSync(fd);
        } finally {
            closeSync(fd);
        }
    },
    remove(path: string): void {
        rmSync(path, {force: true});
    },
    syncDirectory(path: string): void {
        const fd = openSync(path, 'r');
        try {
            fsyncSync(fd);
        } finally {
            closeSync(fd);
        }
    },
    renameOver(stagedPath: string, path: string): void {
        renameSync(stagedPath, path);
    },
    uid(): number {
        return process.getuid?.() ?? -1;
    }
};

/** `existsSync` is used only by callers proving a directory precondition. */
export function directoryExists(path: string): boolean {
    return existsSync(path);
}
