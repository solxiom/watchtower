/**
 * The injected collaborators of the sole effect executor (CA-10). Every
 * effectful or nondeterministic dependency — durable bytes, the clock, event
 * identity, the NVB invocation boundary, and catalog action resolution — enters
 * through one of these ports, so the executor itself contains no ambient
 * `node:fs`, no `Date.now()`, and no process start.
 *
 * `EffectActionResolver` is structurally satisfied by the accepted
 * `LaneTaskCatalog` (RT-05) and `EffectTaskRunner` by `LaneTaskRunner`; CA-10
 * depends on those *ports*, never on a second catalog reader or a second
 * runtime target of its own.
 */
import type {LaneTaskBinding, LaneTaskInvocation, LaneTaskRunResult, PinnedTaskRuntimeTarget} from '../../contracts/taskRuntime.js';

/**
 * The narrow durable-bytes port. Reads are bounded; every write is either
 * exclusive-create (so a duplicate never silently overwrites) or an
 * append-then-fsync (so no cursor or projection can claim an unsynced record).
 */
/**
 * The outcome of one bounded read, keeping **absent** and **unreadable**
 * distinct (correction-01 CA10-03).
 *
 * Collapsing the two into a single `null` is not a cosmetic simplification: a
 * caller that cannot tell them apart reads an existing-but-unreadable active
 * pack-revision pointer as "no revision yet" and admits a first activation over
 * a live one. Absence is a legitimate initial state; an unreadable or oversized
 * file is a corrupt/permission condition that must fail closed and block
 * mutation with the old revision preserved.
 */
export type TextRead =
    | {readonly kind: 'text'; readonly text: string}
    | {readonly kind: 'missing'}
    | {readonly kind: 'unreadable'; readonly reason: 'io-error' | 'too-large' | 'not-a-file'};

export interface EffectFileSystem {
    /** Create every missing ancestor of a lane-contained directory. */
    ensureDirectory(path: string): void;
    /** `true` only when `path` exists as a regular file. */
    fileExists(path: string): boolean;
    /** Bounded read that never conflates absence with an unreadable artifact. */
    readText(path: string, maxBytes: number): TextRead;
    /**
     * Exclusively create `path` with exactly `mode` and write `content`.
     * Returns `false` when the path already exists — the writer never
     * overwrites an existing envelope or receipt.
     */
    createExclusive(path: string, content: string, mode: number): boolean;
    /** One open-with-append write of `line` plus newline, followed by `fsync` (§9). */
    appendLine(path: string, line: string): void;
    /** Remove a file if present; absence is success. */
    remove(path: string): void;
    /** `fsync` a directory so a rename/create is durable before it is claimed. */
    syncDirectory(path: string): void;
    /** Atomically replace `path` with `stagedPath`, both already fsynced. */
    renameOver(stagedPath: string, path: string): void;
    /** Effective account uid — the envelope owner RT-05 will require. */
    uid(): number;
}

/** Injected nondeterminism: the only clock and identity source the executor sees. */
export interface EffectClock {
    now(): Date;
}

export interface EffectIdFactory {
    nextEventId(): string;
}

/** The NVB invocation boundary. NVB coordinates step 5; it is not a second executor (§7). */
export interface EffectTaskRunner {
    run(invocation: LaneTaskInvocation): Promise<LaneTaskRunResult>;
}

/** Resolves one allowlisted action ID to its checksum-bound catalog binding. */
export interface EffectActionResolver {
    resolveAction(actionId: string): LaneTaskBinding;
}

/** The lane's pinned runtime identity, recorded into every envelope. */
export interface EffectRuntimeTarget {
    readonly target: PinnedTaskRuntimeTarget;
}
