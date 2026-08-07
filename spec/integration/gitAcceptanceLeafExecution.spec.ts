/**
 * CA-12 correction CA12-R1 — packaged-runtime proof. Stages a real immutable
 * runtime root (chmod 0555) with the actual shipped `git.push` leaf source
 * (`exec git "$@"`) and the real `git.publish-commits` catalog entry, then
 * drives the production `NirvanaLaneTaskRunner`, `LaneTaskCatalog`, and
 * `LeafRuntimeInvoker` through the real `nodeRuntimeFileSystem` — the same
 * proof shape RT-05's accepted `laneTaskRuntimeExecution.spec.ts` uses, never
 * an injected-port-only unit test.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import GitAcceptanceTaskHandler from '../../runtime-nvb/handlers/GitAcceptanceTaskHandler.js';
import {LeafRuntimeInvoker} from '../../src/foundation/runtime/leaf/LeafRuntimeInvoker.js';
import {nodeRuntimeFileSystem} from '../../src/foundation/task/runtime/runtimeFileSystem.js';
import type {TaskLeafCapability} from '../../src/contracts/index.js';
import {
    ACTION_ID, CapturedNvbProcess, contextFor, DECLARED_INPUT, type Fixture, LEAF_ID, TASK_ID,
    invocationFor, makeFixture, realCatalog, realEvent, realResult, removeFixture, runnerFor
} from './support/gitAcceptanceRuntimeFixture.js';

const SHIPPED_LEAF = join(process.cwd(), 'runtime-nvb', 'leaves', 'gitPush.sh');

function capabilityOver(invoker: LeafRuntimeInvoker): TaskLeafCapability {
    return {
        taskId: TASK_ID, leafIds: [LEAF_ID],
        invoke: (request) => invoker.invoke({leafId: LEAF_ID, owningActionId: ACTION_ID, args: request.args, context: request.context})
    };
}

describe('CA-12 packaged Git leaf — real immutable runtime root', () => {
    let fixture: Fixture;
    beforeEach(() => { fixture = makeFixture(); });
    afterEach(() => removeFixture(fixture));

    it('the shipped leaf is a bounded argv-only exec with no shell interpolation', () => {
        const source = readFileSync(SHIPPED_LEAF, 'utf8');
        expect(source.startsWith('#!/bin/sh\n')).toBeTrue();
        expect(source).toContain('exec git "$@"');
        expect(source).not.toMatch(/`|\$\(|;|&&|\|\|/u);
    });

    it('resolves the real catalog action to the git.publish-commits task and its git.push leaf', () => {
        const catalog = realCatalog(fixture);
        const binding = catalog.resolveAction(ACTION_ID);
        expect(binding.taskId).toBe(TASK_ID);
        expect(binding.leafIds).toEqual([LEAF_ID]);
        expect(binding.mutationClass).toBe('external-effect');
        const leaf = catalog.resolveLeaf(LEAF_ID);
        expect(leaf.path.endsWith(join('leaves', 'gitPush.sh'))).toBeTrue();
    });

    it('LeafRuntimeInvoker really execs git through the cataloged leaf and returns its real version output', async () => {
        const catalog = realCatalog(fixture);
        const invoker = new LeafRuntimeInvoker({catalog, files: nodeRuntimeFileSystem});
        const result = await invoker.invoke({
            leafId: LEAF_ID, owningActionId: ACTION_ID, args: ['--version'], context: contextFor(fixture)
        });
        expect(result.outcome).toBe('completed');
        expect(result.outcome === 'completed' ? result.stdout : '').toContain('git version');
    });

    it('GitAcceptanceTaskHandler.handlePublishCommits reports a real leaf failure as a refused mutationResult, never a false success', async () => {
        const catalog = realCatalog(fixture);
        const invoker = new LeafRuntimeInvoker({catalog, files: nodeRuntimeFileSystem});
        const handler = new GitAcceptanceTaskHandler({taskName: TASK_ID, capability: capabilityOver(invoker), context: contextFor(fixture)});
        const results: {structuredOutput: {applied: boolean}}[] = [];
        const errors: (Error | undefined)[] = [];
        handler.setOnResultCallback((result) => results.push(result as {structuredOutput: {applied: boolean}}));
        handler.setDoneSignalImplementor((error?: Error) => errors.push(error));
        // No real Git remote exists at contextFor(fixture)'s control home, so the real `git push` exits non-zero.
        await handler.handleAsync();
        expect(results.length).toBe(1);
        expect(results[0].structuredOutput.applied).toBeFalse();
        expect(errors[0]).toBeDefined();
    });

    it('runs the real NirvanaLaneTaskRunner against the real catalog, control home, and both runtime targets', async () => {
        const processes = new CapturedNvbProcess([realEvent(fixture), realResult(fixture, {applied: true, changed: ['repo-a'], unchanged: [], warnings: []})]);
        const result = await runnerFor(fixture, processes).run(invocationFor(fixture));
        expect(result.outcome).toBe('completed');
        expect(processes.requests[0].cwd).toBe(fixture.controlHome);
        expect(processes.requests[0].args).toContain(`--jsfile=${join(fixture.catalogDirectory, 'runtime-nvb.js')}`);
    });

    it('delivers the same typed publish-commits input it validated: the pinned config bytes the child reads', async () => {
        const processes = new CapturedNvbProcess([realEvent(fixture), realResult(fixture, {applied: true, changed: ['repo-a'], unchanged: [], warnings: []})]);
        await runnerFor(fixture, processes).run(invocationFor(fixture));
        const flag = processes.requests[0].args.find((value) => value.startsWith('--jsonfile='));
        const projection = JSON.parse(readFileSync((flag ?? '').slice('--jsonfile='.length), 'utf8')) as {
            tasks: Record<string, {handle: {args: unknown[]}}>;
        };
        expect(projection.tasks[TASK_ID].handle.args).toEqual([DECLARED_INPUT]);
    });

    it('fails closed on a schema-invalid structured result rather than reporting a false success', async () => {
        const processes = new CapturedNvbProcess([realEvent(fixture), realResult(fixture, {applied: 'not-a-boolean'})]);
        const result = await runnerFor(fixture, processes).run(invocationFor(fixture));
        expect(result.outcome).toBe('failed');
    });
});
