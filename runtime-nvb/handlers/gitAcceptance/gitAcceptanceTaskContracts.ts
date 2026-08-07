/**
 * Typed input/result shapes for `wt:git:record-acceptance` and
 * `wt:git:publish-commits`.
 *
 * `remote`, `sha`, and `ref` become literal argv elements passed to the
 * cataloged `git.push` leaf (correction CA12-R4). A value shaped like an
 * option (`--force`, `--force-with-lease`, `--receive-pack=...`) reaches
 * `git` as a flag rather than a positional argument if it is only checked
 * for non-emptiness — this is Git's own argv convention, not a Watchtower
 * bug in `git`. Each field is therefore constrained to a closed grammar that
 * cannot itself begin with `-`, independent of and in addition to the
 * `gitPublishCommitsInput` JSON Schema's matching `pattern` constraints
 * (defense at both the schema-validation layer `NirvanaLaneTaskRunner` runs
 * before this handler ever executes, and this handler's own typeguard).
 */
const REMOTE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SHA_PATTERN = /^[0-9a-f]{40}$|^[0-9a-f]{64}$/u;
const REF_PATTERN = /^refs\/heads\/[A-Za-z0-9][A-Za-z0-9._/-]*$/u;

export interface RecordAcceptanceInput {
    readonly schemaVersion: 1;
    readonly targetId: string;
}

export interface PublishCommitsInput {
    readonly schemaVersion: 1;
    readonly targetId: string;
    readonly sha: string;
    readonly ref: string;
    readonly remote: string;
}

/** `$defs.mutationResult`-shaped: `applied`, `changed`, `unchanged`, `warnings`. */
export interface MutationResult {
    readonly applied: boolean;
    readonly changed: readonly string[];
    readonly unchanged: readonly string[];
    readonly warnings: readonly string[];
}

export function isRecordAcceptanceInput(value: unknown): value is RecordAcceptanceInput {
    return isRecord(value) && value.schemaVersion === 1 && typeof value.targetId === 'string' && value.targetId.length > 0
        && onlyKeys(value, ['schemaVersion', 'targetId']);
}

export function isPublishCommitsInput(value: unknown): value is PublishCommitsInput {
    return isRecord(value) && value.schemaVersion === 1
        && typeof value.targetId === 'string' && value.targetId.length > 0
        && typeof value.sha === 'string' && SHA_PATTERN.test(value.sha)
        && typeof value.ref === 'string' && REF_PATTERN.test(value.ref)
        && typeof value.remote === 'string' && REMOTE_PATTERN.test(value.remote)
        && onlyKeys(value, ['schemaVersion', 'targetId', 'sha', 'ref', 'remote']);
}

/**
 * The final fence immediately before the leaf invocation: every argv element
 * `handlePublishCommits` constructs must not itself be option-shaped, proven
 * independently of `isPublishCommitsInput`'s grammar so a future change to
 * one validator alone cannot silently reopen CA12-R4.
 */
export function isSafeArgvToken(value: string): boolean {
    return value.length > 0 && !value.startsWith('-');
}

export function appliedResult(targetId: string): MutationResult {
    return {applied: true, changed: [targetId], unchanged: [], warnings: []};
}

export function refusedResult(): MutationResult {
    return {applied: false, changed: [], unchanged: [], warnings: []};
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    return Object.keys(value).every((key) => keys.includes(key));
}
