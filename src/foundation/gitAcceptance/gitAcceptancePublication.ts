/**
 * Acceptance recording and publication mechanics (CA-12;
 * `docs/spec/nirvana-integration-architecture.md` §7,
 * `docs/spec/coordinator-automation.md` §13).
 *
 * Reuses CA-10's exact prepare/attempt/verify collaborators — lock, journal,
 * envelope writer, replay classification, and commit sequence — rather than a
 * second implementation of that discipline. `EffectExecutor.ts` itself is
 * never imported or modified: this module is a second, independent caller of
 * the same effect-type-agnostic primitives, submitting its own `EffectPlan`
 * for the two declared actions `git.recordAcceptance`/`git.publishCommits`.
 */
import {
    acquireEffectLocks, appendEffectPhase, findLatestPhase, findSettledOutcome, invokeAndVerify, readEffectJournal,
    resolveDeclaredAction, writeInvocationEnvelope, type EffectActionResolver, type EffectClock, type EffectFileSystem,
    type EffectIdFactory, type EffectTaskRunner, type JournalRead
} from '../effect/index.js';
import {EffectExecutionError, type EffectOutcome, type EffectPlan} from '../../contracts/effects.js';
import type {LaneRuntimeContext, PinnedTaskRuntimeTarget} from '../../contracts/taskRuntime.js';
import {computeIdempotencyKey} from '../proposal/proposalIdempotency.js';
import {semanticDigest} from '../schemaComposition/jsonCanonicalizer.js';
import type {PublicationResult, RepositoryPublicationBinding, RepositoryPublicationResult, ValidatedCommitSet} from '../../contracts/gitAcceptance.js';

export interface GitAcceptanceDeps {
    readonly files: EffectFileSystem;
    readonly clock: EffectClock;
    readonly ids: EffectIdFactory;
    readonly runner: EffectTaskRunner;
    readonly actions: EffectActionResolver;
    readonly target: PinnedTaskRuntimeTarget;
}

export interface GitAcceptanceCycleContext {
    readonly laneDir: string;
    readonly laneId: string;
    readonly cycleId: string;
    readonly snapshotDigest: string;
    readonly policyVersion: string;
    readonly runtimeContext: LaneRuntimeContext;
}

/** Records the durable `batch-accepted` effect. Never touches Git. */
export async function recordAcceptance(
    context: GitAcceptanceCycleContext, batchId: string, deps: GitAcceptanceDeps
): Promise<EffectOutcome> {
    const plan = buildPlan(context, 'record-acceptance', batchId, [batchId], deps);
    return runOneEffect(context, plan, deps);
}

/**
 * Push every proposed repository's verified commit, in declared binding
 * order. Recovery never re-pushes a repository whose idempotency key already
 * settled: each repository is its own effect plan and its own journal entry,
 * so a retry after a partial failure only attempts the repositories that
 * previously failed or never ran.
 */
export async function publishCommits(
    context: GitAcceptanceCycleContext, commitSet: ValidatedCommitSet, repositories: readonly RepositoryPublicationBinding[],
    deps: GitAcceptanceDeps
): Promise<PublicationResult> {
    const results: RepositoryPublicationResult[] = [];
    for (const commit of commitSet.commits) {
        const binding = repositories.find((repository) => repository.id === commit.repositoryId);
        if (binding === undefined) {
            results.push({repositoryId: commit.repositoryId, ref: '', remote: '', success: false, error: 'GIT_REPOSITORY_NOT_BOUND'});
            continue;
        }
        results.push(await publishOne(context, commit.repositoryId, commit.sha, binding, deps));
    }
    const failed = results.filter((result) => !result.success);
    const ok = failed.length === 0;
    return {
        ok, repositoryResults: results, partialRecovery: !ok && failed.length < results.length,
        ...(ok ? {} : {escalated: failed.some((result) => result.uncertain === true)})
    };
}

async function publishOne(
    context: GitAcceptanceCycleContext, repositoryId: string, sha: string, binding: RepositoryPublicationBinding,
    deps: GitAcceptanceDeps
): Promise<RepositoryPublicationResult> {
    const ref = `refs/heads/${binding.branch}`;
    const plan = buildPlan(context, 'publish-commits', repositoryId, [repositoryId], deps, {sha, ref, remote: binding.remote});
    const outcome = await runOneEffect(context, plan, deps);
    return toRepositoryResult(repositoryId, ref, binding.remote, sha, outcome);
}

function toRepositoryResult(
    repositoryId: string, ref: string, remote: string, sha: string, outcome: EffectOutcome
): RepositoryPublicationResult {
    if (outcome.status === 'applied' || outcome.status === 'replayed') {
        return {repositoryId, ref, remote, success: true, pushedSha: sha};
    }
    if (outcome.status === 'uncertain') {
        return {repositoryId, ref, remote, success: false, error: 'GIT_PUSH_PARTIAL', uncertain: true};
    }
    return {repositoryId, ref, remote, success: false, error: 'GIT_PUSH_FAILED'};
}

/**
 * `proposalId` folds in `context.cycleId`: an invocation envelope is
 * single-use and its `.consumed` receipt is permanent for that exact
 * idempotency key (`invocationEnvelopeWriter.ts`), so a repository whose
 * previous attempt already spent its envelope — verified *or* uncertain —
 * could never be given a fresh envelope again under the same key. A genuine
 * retry therefore always runs under a new cycle and mints a new key;
 * "already pushed" is instead recognized by scanning the journal for this
 * exact repository's prior `verified` record (`alreadyVerified`), not by key
 * equality.
 */
function buildPlan(
    context: GitAcceptanceCycleContext, effect: 'record-acceptance' | 'publish-commits', targetId: string,
    targetIds: readonly string[], deps: GitAcceptanceDeps, parameters: Record<string, string> = {}
): EffectPlan {
    const declared = resolveDeclaredAction(effect);
    const binding = deps.actions.resolveAction(declared.actionId);
    const proposalId = `git-acceptance:${context.cycleId}:${targetId}`;
    return Object.freeze({
        schemaVersion: 1 as const,
        laneId: context.laneId,
        cycleId: context.cycleId,
        proposalId,
        effect,
        actionId: declared.actionId,
        taskId: binding.taskId,
        scope: declared.scope,
        targetIds: Object.freeze([...targetIds]),
        parameters: Object.freeze({targetId, ...parameters}),
        preconditionDigest: semanticDigest({laneId: context.laneId, targetId, snapshotDigest: context.snapshotDigest}),
        idempotencyKey: computeIdempotencyKey(context.laneId, proposalId, effect, targetIds, context.snapshotDigest, context.policyVersion),
        snapshotDigest: context.snapshotDigest,
        policyVersion: context.policyVersion
    });
}

/**
 * The exact prepare/attempt/verify sequence `EffectExecutor.applyUnderLock`
 * runs, scoped to one Git-acceptance plan: acquire the lane lock, classify
 * replay, write the single-use envelope, journal `prepared`, then hand off to
 * CA-10's own commit sequence for `attempted`/`verified` and envelope spend.
 */
async function runOneEffect(context: GitAcceptanceCycleContext, plan: EffectPlan, deps: GitAcceptanceDeps): Promise<EffectOutcome> {
    let lock;
    try {
        lock = acquireEffectLocks(context.laneDir, ['lane'], deps.files);
    } catch (error) {
        return refusalFor(error);
    }
    try {
        const journal = readEffectJournal(context.laneDir, deps.files);
        const replayed = alreadyVerified(journal, plan) ?? classifyGitReplay(journal, plan);
        if (replayed !== null) return replayed;
        const binding = deps.actions.resolveAction(plan.actionId);
        const envelope = writeInvocationEnvelope(
            {laneDir: context.laneDir, plan, binding, target: deps.target, lockId: lock.lockId, laneLockHeld: true}, deps
        );
        const sequence = journal.nextSequence;
        const records = [appendEffectPhase(context.laneDir, plan, 'prepared', 'git acceptance effect plan journaled', sequence, deps)];
        return await invokeAndVerify(
            {laneDir: context.laneDir, plan, envelope, runtimeContext: context.runtimeContext, records, lastSequence: sequence}, deps
        );
    } catch (error) {
        return refusalFor(error);
    } finally {
        lock.release();
    }
}

/**
 * Cross-cycle "already pushed" recognition: any prior `verified` record for
 * this exact effect and target set, under *any* idempotency key, means this
 * repository already committed and must never be pushed again — independent
 * of `buildPlan`'s per-cycle key. Runs before `classifyGitReplay`'s own-key
 * checks, which only ever see the *current* cycle's key.
 */
function alreadyVerified(journal: JournalRead, plan: EffectPlan): EffectOutcome | null {
    const targets = new Set(plan.targetIds);
    const record = journal.records.find((entry) => entry.payload.phase === 'verified' && entry.payload.effect === plan.effect
        && entry.payload.targetIds.length === targets.size && entry.payload.targetIds.every((id) => targets.has(id)));
    return record === undefined ? null : {status: 'replayed', plan, recordedOutcome: record};
}

/**
 * A Git-acceptance-specific specialization of CA-10's `classifyReplay`
 * (`effectReplay.ts`), required because partial-push recovery must be able to
 * retry a repository whose *previous, fully-recorded* attempt settled as
 * `uncertain` — CA-10's own contract deliberately never retries an uncertain
 * key automatically (`COORDINATOR_EFFECT_UNCERTAIN`'s doc: "this is never
 * retried automatically"), because for a lane-wide coordinator effect the
 * right response is escalation, not silent repetition. A Git push is
 * different: the brief requires the adapter itself to retry exactly the
 * failed repository from its last-attempted ref. So a `verified` (or, for
 * `record-acceptance`, `failed`) record still short-circuits as replay, but
 * an `uncertain` one is treated as retry-eligible rather than terminal. A key
 * seen only as `prepared`/`attempted` — genuinely still in flight, with no
 * completed attempt — is never silently re-attempted; that stays uncertain.
 */
function classifyGitReplay(journal: JournalRead, plan: EffectPlan): EffectOutcome | null {
    const settled = findSettledOutcome(journal, plan.idempotencyKey);
    if (settled !== null && settled.payload.phase !== 'uncertain') {
        return {status: 'replayed', plan, recordedOutcome: settled};
    }
    if (settled === null) {
        const latest = findLatestPhase(journal, plan.idempotencyKey);
        if (latest !== null) {
            return {
                status: 'uncertain', plan, reason: 'COORDINATOR_EFFECT_UNCERTAIN', journal: [latest],
                message: `A previous attempt for this idempotency key stopped at "${latest.payload.phase}"; resolve it from durable state before retrying.`
            };
        }
    }
    return null;
}

function refusalFor(error: unknown): EffectOutcome {
    if (error instanceof EffectExecutionError) {
        return {status: 'refused', reason: error.reason, subject: error.subject, message: error.message};
    }
    throw error;
}
