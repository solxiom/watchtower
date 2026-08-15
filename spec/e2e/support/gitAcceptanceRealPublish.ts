/**
 * REL-02 real Git-acceptance publication runner.
 *
 * `wt` ships no CLI command that reaches `GitAcceptanceAdapter` yet (the v1 §10
 * command table has no `accept`/`publish` entry) — reviewer acceptance and
 * publication are coordinator-cycle effects, reachable today only from
 * accepted foundation code, exactly as `spec/e2e/acceptTrialPhase7.spec.ts`'s
 * `operatorWitnessCycleCapsule.ts` already calls `ProposalValidator` directly
 * for a capability with no CLI front door. This module is REL-02's equivalent:
 * it drives the real, accepted `GitAcceptanceAdapter` against a real lane
 * directory, and for `publish-commits` it really executes `git push` through
 * the real `LeafRuntimeInvoker` and the real shipped `git.push` leaf script
 * (`runtime-nvb/leaves/gitPush.sh`) — the same production path
 * `spec/integration/gitAcceptanceLeafExecution.spec.ts` already proves,
 * reused here rather than re-implemented. Nothing here mocks Git: a fixture
 * that wants to force a push failure does so by breaking a real remote path,
 * not by stubbing the result.
 *
 * `record-acceptance` never touches Git by product design
 * (`GitAcceptanceTaskHandler.handleRecordAcceptance`'s docstring: "Pure
 * recognition: never touches Git"), so its runner only needs to report
 * `applied` — reusing CA-12's own accepted `applyingRunner()` fixture is
 * faithful to that contract, not a shortcut around it.
 */
import {chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LaneTaskCatalog} from '../../../src/foundation/task/runtime/LaneTaskCatalog.js';
import {nodeRuntimeFileSystem} from '../../../src/foundation/task/runtime/runtimeFileSystem.js';
import {LeafRuntimeInvoker} from '../../../src/foundation/runtime/leaf/LeafRuntimeInvoker.js';
import {nodeEffectFileSystem, resolveDeclaredAction} from '../../../src/foundation/effect/index.js';
import {semanticDigest} from '../../../src/foundation/schemaComposition/jsonCanonicalizer.js';
import type {JsonObject} from '../../../src/foundation/schemaComposition/schemaCompositionContracts.js';
import type {
    EffectActionResolver, EffectClock, EffectIdFactory, EffectTaskRunner
} from '../../../src/foundation/effect/effectPorts.js';
import type {
    LaneRuntimeContext, LaneTaskBinding, LaneTaskInvocation, LaneTaskRunResult, PinnedTaskRuntimeTarget
} from '../../../src/contracts/taskRuntime.js';
import type {GitAcceptanceDeps} from '../../../src/foundation/gitAcceptance/gitAcceptancePublication.js';
import {applyingRunner} from '../../foundation/gitAcceptance/support/gitAcceptanceFixtures.js';

const CATALOG_ID = 'watchtower-rel02-git-acceptance-fixture/v1';
const PROFILE_ID = 'implementation-v1';
const ACTION_ID = 'git.publish-commits';
const TASK_ID = 'wt:git:publish-commits';
const LEAF_ID = 'git.push';
const LEAF_SOURCE = '#!/bin/sh\nexec git "$@"\n';

export interface RealPublishFixture {
    readonly root: string;
    readonly runtimeRoot: string;
    readonly catalogDirectory: string;
    readonly laneDir: string;
    readonly target: PinnedTaskRuntimeTarget;
    readonly remove: () => void;
}

/** Stages a real, relocated immutable runtime root carrying the real `git.push` leaf. */
export function makeRealPublishFixture(): RealPublishFixture {
    const root = mkdtempSync(join(tmpdir(), 'wt-rel02-publish-'));
    const runtimeRoot = join(root, 'runtimes', '1.0.0');
    const catalogDirectory = join(runtimeRoot, 'runtime-nvb');
    const laneDir = join(root, 'lane');
    for (const dir of [join(catalogDirectory, 'leaves'), laneDir]) mkdirSync(dir, {recursive: true});
    const leafPath = join(catalogDirectory, 'leaves', 'gitPush.sh');
    writeFileSync(leafPath, LEAF_SOURCE);
    chmodSync(leafPath, 0o555);
    writeFileSync(join(catalogDirectory, 'runtime-nvb.json'), JSON.stringify({tasks: {}}));
    writeFileSync(join(catalogDirectory, 'runtime-nvb.js'), 'export {};\n');
    const document = catalogDocument(digestOf(LEAF_SOURCE));
    writeFileSync(join(catalogDirectory, 'task-catalog.json'), JSON.stringify(document));
    chmodSync(runtimeRoot, 0o555);
    return {
        root, runtimeRoot, catalogDirectory, laneDir,
        target: {catalogId: CATALOG_ID, catalogSha256: semanticDigest(document), profile: PROFILE_ID,
            configTarget: join(catalogDirectory, 'runtime-nvb.json'), moduleTarget: join(catalogDirectory, 'runtime-nvb.js')},
        remove: () => { chmodSync(runtimeRoot, 0o755); rmSync(root, {recursive: true, force: true}); }
    };
}

/** Raw-byte sha256, matching `nodeRuntimeFileSystem.digest()` exactly — never the canonical-JSON `semanticDigest`. */
function digestOf(text: string): `sha256:${string}` {
    return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function catalogDocument(leafDigest: string): JsonObject {
    return {
        schemaVersion: 1, catalogId: CATALOG_ID, catalogVersion: 1, fragments: ['git-acceptance'],
        minimumRuntime: {cliVersion: '0.1.0', nodeVersion: '26.4.0'},
        handlers: {}, tasks: {[TASK_ID]: {executionScope: 'lane-runtime', handlerId: 'GitAcceptanceTaskHandler',
            inputSchema: 'watchtower://runtime/schemas/git-publish-commits-input/v1',
            resultSchema: 'watchtower://runtime/schemas/git-publish-commits-result/v1',
            leafIds: [LEAF_ID], mutationClass: 'external-effect', requiresInvocationEnvelope: true}},
        groups: {}, actions: {[ACTION_ID]: {taskId: TASK_ID}},
        leaves: {[LEAF_ID]: {executable: true, mode: '0555', path: './leaves/gitPush.sh', sha256: leafDigest}},
        profiles: {[PROFILE_ID]: {taskIds: [TASK_ID]}}, schemas: {}
    };
}

function contextFor(fixture: RealPublishFixture, workspace: string): LaneRuntimeContext {
    return {
        workspace, laneId: 'rel-02-multi-repo', initiativeId: 'watchtower-v1', laneSlug: 'multi-repo',
        laneDir: fixture.laneDir, homeRepositoryId: 'primary', repositoriesFile: join(fixture.laneDir, 'repositories.local.json'),
        runtimeRoot: fixture.runtimeRoot, runtimeVersion: '1.0.0', knowledgeRoot: join(fixture.root, 'knowledge'),
        baseEnvironment: {path: process.env.PATH ?? '/usr/bin:/bin', home: process.env.HOME ?? '/tmp'}
    };
}

/**
 * Real `EffectTaskRunner`: every `publish-commits` invocation really execs
 * `git push` against the caller-supplied per-repository worktree, through the
 * same `LeafRuntimeInvoker` the shipped product uses. `workspaceFor` maps a
 * `targetId` (repository ID) to its real local worktree path — the multi-repo
 * fixture's `primary`/`secondary` directories — so each repository's push
 * really runs with that repository's own working directory as `cwd`.
 */
export function realPublishRunner(
    fixture: RealPublishFixture, workspaceFor: (targetId: string) => string
): EffectTaskRunner & {readonly invocations: readonly LaneTaskInvocation[]} {
    const catalog = LaneTaskCatalog.open(fixture.target, fixture.runtimeRoot, nodeRuntimeFileSystem);
    const invoker = new LeafRuntimeInvoker({catalog, files: nodeRuntimeFileSystem});
    const invocations: LaneTaskInvocation[] = [];
    return {
        invocations,
        async run(invocation: LaneTaskInvocation): Promise<LaneTaskRunResult> {
            invocations.push(invocation);
            const input = invocation.input as {targetId: string; sha: string; ref: string; remote: string};
            const context = contextFor(fixture, workspaceFor(input.targetId));
            const outcome = await invoker.invoke({
                leafId: LEAF_ID, owningActionId: ACTION_ID, args: ['push', input.remote, `${input.sha}:${input.ref}`], context
            });
            if (outcome.outcome === 'completed') {
                return {
                    outcome: 'completed', actionId: invocation.actionId, taskId: TASK_ID, runId: 'rel-02-e2e',
                    startedAt: null, finishedAt: null, events: [],
                    result: {applied: true, changed: [input.targetId], unchanged: [], warnings: []}
                };
            }
            return {
                outcome: 'failed', actionId: invocation.actionId, taskId: TASK_ID, runId: null,
                reason: 'TASK_RUNTIME_TASK_EXECUTION_FAILED', failedTaskId: TASK_ID,
                exitCode: outcome.outcome === 'failed' ? outcome.exitCode : 1, signal: null,
                diagnostic: 'real git push failed against the fixture remote', events: []
            };
        }
    };
}

export function publishBinding(): LaneTaskBinding {
    const declared = resolveDeclaredAction('publish-commits');
    return Object.freeze({actionId: ACTION_ID, taskId: TASK_ID, handlerId: 'GitAcceptanceTaskHandler',
        inputSchema: 'watchtower://runtime/schemas/git-publish-commits-input/v1',
        resultSchema: 'watchtower://runtime/schemas/git-publish-commits-result/v1',
        mutationClass: declared.mutationClass, requiresInvocationEnvelope: true, leafIds: Object.freeze([LEAF_ID])});
}

function recordBinding(): LaneTaskBinding {
    const declared = resolveDeclaredAction('record-acceptance');
    return Object.freeze({actionId: 'git.record-acceptance', taskId: 'wt:git:record-acceptance',
        handlerId: 'GitAcceptanceTaskHandler', inputSchema: 'watchtower://runtime/schemas/git-record-acceptance-input/v1',
        resultSchema: 'watchtower://runtime/schemas/git-record-acceptance-result/v1',
        mutationClass: declared.mutationClass, requiresInvocationEnvelope: true, leafIds: Object.freeze([])});
}

export function resolverFor(...bindings: readonly LaneTaskBinding[]): EffectActionResolver {
    return {resolveAction: (actionId: string) => {
        const found = bindings.find((binding) => binding.actionId === actionId);
        if (found === undefined) throw new Error(`unbound action ${actionId}`);
        return found;
    }};
}

function fixedClock(): EffectClock { return {now: () => new Date()}; }
function countingIds(): EffectIdFactory {
    let next = 0;
    return {nextEventId: () => `rel-02-evt-${(next += 1)}`};
}

/** Deps for the record-acceptance call: the effect never touches Git, so the accepted scripted double is faithful. */
export function acceptDeps(target: PinnedTaskRuntimeTarget): GitAcceptanceDeps {
    return {files: nodeEffectFileSystem, clock: fixedClock(), ids: countingIds(),
        runner: applyingRunner(), actions: resolverFor(recordBinding()), target};
}

/** Deps for the publish-commits call: the real runner really execs `git push`. */
export function publishDeps(fixture: RealPublishFixture, workspaceFor: (targetId: string) => string): GitAcceptanceDeps & {
    readonly runner: ReturnType<typeof realPublishRunner>;
} {
    const runner = realPublishRunner(fixture, workspaceFor);
    return {files: nodeEffectFileSystem, clock: fixedClock(), ids: countingIds(),
        runner, actions: resolverFor(publishBinding()), target: fixture.target};
}
