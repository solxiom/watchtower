/** Closed public shapes for the transactional lane commit boundary (LC-03). */

export type WriteStage = 'mkdtemp' | 'mkdir' | 'write' | 'fsync' | 'symlink' | 'rename' | 'manifest';

/**
 * `durabilityWarning` is set only when the single atomic outer rename
 * (`docs/spec/v1-contracts.md` §11 commit point) already succeeded — the lane
 * directory is live at `laneDir` — but the subsequent best-effort parent
 * directory fsync could not be verified. This is never a rollback signal:
 * after the commit point a valid, home-discoverable lane must never be
 * reported as absent or half-committed, mirroring the same normative pattern
 * used for a post-commit membership-registration failure. A caller that
 * observes this field may re-`fsync` the lane's parent directory itself or
 * proceed; it must not delete or recreate `laneDir`.
 */
export interface WriteResult {
    readonly committed: boolean;
    readonly laneDir: string;
    readonly durabilityWarning?: {
        readonly stage: Extract<WriteStage, 'fsync'>;
        readonly path: string;
        readonly cause: Error;
    };
}

export interface WriteError {
    readonly stage: WriteStage;
    readonly path: string;
    readonly cause: Error;
}

/**
 * Raised only for a pre-commit stage failure — every prior stage is fully
 * rolled back before this throws, and `laneDir` never became live. This
 * error is never thrown once the single atomic outer rename has succeeded;
 * a post-commit durability failure is reported through
 * `WriteResult.durabilityWarning` instead, because the lane already exists
 * and must not be described as a failed or rolled-back commit.
 */
export class TransactionalWriteError extends Error implements WriteError {
    constructor(readonly stage: WriteStage, readonly path: string, readonly cause: Error) {
        super(`Lane commit failed at stage "${stage}" for ${path}: ${cause.message}`);
        this.name = 'TransactionalWriteError';
    }
}
