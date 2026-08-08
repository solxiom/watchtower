/**
 * The durable-bytes adapter for `coordinator/queue.json` and
 * `coordinator/cursor.json` (CA-13).
 *
 * It deliberately imports no `node:fs`. Every primitive it needs — bounded
 * read that keeps absence and unreadability distinct, exclusive create with an
 * exact mode, `fsync`, atomic rename, and directory `fsync` — is already owned
 * by CA-10's accepted `nodeEffectFileSystem`, and the §9/§11 durability rules
 * they encode must have one implementation in the product, not one per
 * capsule. This module adds exactly one thing: the staged whole-file replace
 * those primitives compose into.
 */
import {join} from 'node:path';
import {nodeEffectFileSystem} from '../../../effect/nodeEffectFileSystem.js';
import type {EffectFileSystem} from '../../../effect/effectPorts.js';
import type {QueueFileSystem} from './queuePorts.js';

/** Projections are lane-private coordinator state, never group- or world-readable. */
const PROJECTION_MODE = 0o600;

/**
 * Build the queue filesystem over any `EffectFileSystem`. The parameter exists
 * so a spec can inject the *real* adapter with exactly one operation faulted;
 * a fully mocked port would prove control flow and say nothing about whether a
 * partial projection is actually left on disk.
 */
export function queueFileSystemOver(files: EffectFileSystem): QueueFileSystem {
    return Object.freeze({
        ensureDirectory(path: string): void {
            files.ensureDirectory(path);
        },
        readText(path: string, maxBytes: number) {
            return files.readText(path, maxBytes);
        },
        /**
         * Stage under a unique sibling name, then rename over the target. The
         * staged path is removed on any failure, so a failed write leaves the
         * previous projection intact rather than a truncated successor.
         */
        writeAtomic(path: string, content: string): void {
            const staged = `${path}.staging-${process.pid}-${Date.now().toString(36)}`;
            if (!files.createExclusive(staged, content, PROJECTION_MODE)) {
                throw new Error(`staging path ${staged} already exists`);
            }
            try {
                files.renameOver(staged, path);
            } catch (error) {
                files.remove(staged);
                throw error;
            }
            files.syncDirectory(dirnameOf(path));
        }
    });
}

export const nodeQueueFileSystem: QueueFileSystem = queueFileSystemOver(nodeEffectFileSystem);

function dirnameOf(path: string): string {
    return join(path, '..');
}
