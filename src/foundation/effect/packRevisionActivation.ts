/**
 * Atomic pack-revision activation and same-session resume (CA-10;
 * `docs/spec/specification-resolution.md` §7–§8,
 * `docs/spec/v1-contracts.md` §5).
 *
 * §7: "there is no partially active pack." The active revision therefore lives
 * in exactly one pointer file that is staged whole and switched with one atomic
 * rename inside the executor's held lane lock. A failure before that rename
 * leaves the old revision live and untouched; there is no state in which half a
 * revision is active.
 *
 * §8: "Activation never runs arbitrary Git commands or silently rebases
 * worktrees." This module accordingly imports no Git adapter, spawns nothing,
 * and *records* a required synchronization for each affected worktree rather
 * than performing one. A resume is admitted only against explicit,
 * caller-supplied synchronization evidence and only for the original durable
 * worker/operator-session/worktree identity — a substituted session is refused,
 * not accommodated.
 */
import {join} from 'node:path';
import {EffectExecutionError} from '../../contracts/effects.js';
import type {JsonObject} from '../../contracts/types.js';
import {buildLaneFilePath} from '../paths/index.js';
import {formattedCanonicalBytes} from './effectCanonicalBytes.js';
import type {
    AdmittedRevisionState, OriginalAssignmentRecord, WorktreeSyncRecord
} from '../proposal/proposalValidatorContracts.js';
import type {EffectClock, EffectFileSystem} from './effectPorts.js';

const REVISION_RELATIVE_DIR = join('coordinator', 'revision');
const ACTIVE_POINTER = 'active-revision.json';
const MAX_POINTER_BYTES = 64 * 1024;

/** The single durable record of which pack revision is active for this lane. */
export interface ActivePackRevision extends JsonObject {
    readonly schemaVersion: 1;
    readonly laneId: string;
    readonly activeSeal: string;
    readonly supersedesSeal: string | null;
    readonly blockerId: string;
    readonly requiredCommit: string;
    readonly activatedAt: string;
    /** Affected worktrees the operator must synchronize; never synchronized here. */
    readonly worktreeSyncRequired: readonly string[];
}

export interface ActivationInput {
    readonly laneDir: string;
    readonly laneId: string;
    readonly blockerId: string;
    readonly admitted: AdmittedRevisionState;
    /** The seal this revision supersedes — must equal the currently active one (§7.1). */
    readonly supersedesSeal: string;
    readonly affectedWorktreeIds: readonly string[];
}

/**
 * Atomically switch the lane's active pack revision. Call only under the held
 * lane lock, after revalidation, and once per idempotency key: a repeat
 * activation of the already-active seal is a no-op that returns the live
 * pointer rather than rewriting it.
 */
export function activatePackRevision(
    input: ActivationInput, deps: {files: EffectFileSystem; clock: EffectClock}
): ActivePackRevision {
    const current = readActiveRevision(input.laneDir, deps.files);
    if (current !== null && current.activeSeal === input.admitted.activeSeal) return current;
    if (current === null ? input.supersedesSeal !== '' : current.activeSeal !== input.supersedesSeal) {
        throw new EffectExecutionError('EFFECT_REVISION_NOT_ADMITTED', input.admitted.activeSeal,
            'The superseded seal does not equal the currently active seal; activation is refused.');
    }
    if (input.admitted.blockerId !== input.blockerId) {
        throw new EffectExecutionError('EFFECT_REVISION_NOT_ADMITTED', input.blockerId,
            'The admitted revision is bound to a different blocker.');
    }
    const next: ActivePackRevision = Object.freeze({
        schemaVersion: 1 as const,
        laneId: input.laneId,
        activeSeal: input.admitted.activeSeal,
        supersedesSeal: current?.activeSeal ?? null,
        blockerId: input.blockerId,
        requiredCommit: input.admitted.requiredCommit,
        activatedAt: deps.clock.now().toISOString(),
        worktreeSyncRequired: Object.freeze([...input.affectedWorktreeIds])
    });
    commitPointer(input.laneDir, next, deps);
    return next;
}

/**
 * The live active revision, or `null` only when no pointer has ever been
 * written. An existing pointer that cannot be read — permission denied,
 * oversized, not a regular file, truncated — is refused rather than reported as
 * absence (correction-01 CA10-03): treating it as absence would let a first
 * activation overwrite a live revision it could not inspect.
 */
export function readActiveRevision(laneDir: string, files: EffectFileSystem): ActivePackRevision | null {
    const path = pointerPath(laneDir);
    const read = files.readText(path, MAX_POINTER_BYTES);
    if (read.kind === 'missing') return null;
    if (read.kind === 'unreadable') {
        throw new EffectExecutionError('EFFECT_REVISION_NOT_ADMITTED', path,
            `The active pack-revision pointer exists but could not be read (${read.reason}); the live revision is preserved and activation is refused.`);
    }
    if (read.text === '') {
        throw new EffectExecutionError('EFFECT_REVISION_NOT_ADMITTED', path,
            'The active pack-revision pointer exists but is empty; the live revision cannot be proved and activation is refused.');
    }
    let value: unknown;
    try {
        value = JSON.parse(read.text);
    } catch {
        throw new EffectExecutionError('EFFECT_REVISION_NOT_ADMITTED', path,
            'The active pack-revision pointer is not a well-formed JSON document.');
    }
    if (!isActiveRevision(value)) {
        throw new EffectExecutionError('EFFECT_REVISION_NOT_ADMITTED', path,
            'The active pack-revision pointer does not carry the declared revision members.');
    }
    return value;
}

/**
 * Admit a same-session resume (§8). The resumed identity must be the original
 * durable assignment's, and the worktree must carry explicit, matching
 * synchronization evidence; nothing here performs or infers that
 * synchronization.
 */
export function assertResumable(
    assignment: OriginalAssignmentRecord, sync: WorktreeSyncRecord | undefined, admitted: AdmittedRevisionState,
    resumed: {readonly workerSessionId: string; readonly operatorSessionId: string; readonly worktreeId: string}
): void {
    if (resumed.workerSessionId !== assignment.workerSessionId
        || resumed.operatorSessionId !== assignment.operatorSessionId
        || resumed.worktreeId !== assignment.worktreeId) {
        throw new EffectExecutionError('EFFECT_RESUME_IDENTITY_MISMATCH', assignment.blockerId,
            'A resume must target the original durable worker, operator-session, and worktree identity.');
    }
    if (sync === undefined || sync.worktreeId !== assignment.worktreeId || sync.status !== 'synchronized') {
        throw new EffectExecutionError('EFFECT_WORKTREE_STALE', resumed.worktreeId,
            'The affected worktree carries no explicit synchronized evidence for the admitted revision.');
    }
    if (sync.syncedRevision !== admitted.requiredCommit) {
        throw new EffectExecutionError('EFFECT_WORKTREE_STALE', resumed.worktreeId,
            'The synchronized worktree revision is not the commit the admitted pack revision requires.');
    }
}

/** Stage the complete pointer, fsync it, then switch with one atomic rename. */
function commitPointer(laneDir: string, next: ActivePackRevision, deps: {files: EffectFileSystem; clock: EffectClock}): void {
    const directory = join(laneDir, REVISION_RELATIVE_DIR);
    deps.files.ensureDirectory(directory);
    const staged = join(directory, `.${ACTIVE_POINTER}.staging-${next.activeSeal.replace(/[^0-9a-zA-Z]/gu, '')}`);
    deps.files.remove(staged);
    if (!deps.files.createExclusive(staged, formattedCanonicalBytes(next, next.activeSeal), 0o600)) {
        throw new EffectExecutionError('COORDINATOR_EFFECT_CONFLICT', staged,
            'A concurrent activation is already staging this pack revision.');
    }
    deps.files.syncDirectory(directory);
    deps.files.renameOver(staged, pointerPath(laneDir));
    deps.files.syncDirectory(directory);
}

function pointerPath(laneDir: string): string {
    try {
        return buildLaneFilePath(laneDir, join(REVISION_RELATIVE_DIR, ACTIVE_POINTER));
    } catch (error) {
        throw new EffectExecutionError('EFFECT_PATH_ESCAPE', laneDir,
            `The active pack-revision pointer path is not lane-contained: ${(error as Error).message}`);
    }
}

function isActiveRevision(value: unknown): value is ActivePackRevision {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return record.schemaVersion === 1 && typeof record.laneId === 'string' && typeof record.activeSeal === 'string'
        && (record.supersedesSeal === null || typeof record.supersedesSeal === 'string')
        && typeof record.blockerId === 'string' && typeof record.requiredCommit === 'string'
        && typeof record.activatedAt === 'string' && Array.isArray(record.worktreeSyncRequired)
        && record.worktreeSyncRequired.every((entry) => typeof entry === 'string');
}
