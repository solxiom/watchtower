import Ajv from 'ajv';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import GitAcceptanceTaskHandler from '../../runtime-nvb/handlers/GitAcceptanceTaskHandler.js';
import type {LaneRuntimeContext} from '../../src/contracts/taskRuntime.js';
import type {LeafInvocationResult, TaskLeafCapability, TaskLeafRequest} from '../../src/contracts/leafRuntime.js';

const TASK_REQUEST_FLAG = '--wt-task-request';

interface HandlerProbe {
    readonly results: {structuredOutput: unknown}[];
    readonly errors: (Error | undefined)[];
}

function requestArgMap(token: string | undefined) {
    return {
        get: (flag: string) => (flag === TASK_REQUEST_FLAG ? token : undefined),
        getOriginalIndexes: () => (token === undefined ? [] : [0])
    };
}

function encodedRequest(input: unknown): string {
    return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
}

function handlerProbe(
    taskName: string, requestInput: unknown, capability?: TaskLeafCapability
): HandlerProbe & {readonly handler: GitAcceptanceTaskHandler} {
    const handler = new GitAcceptanceTaskHandler({taskName, capability, context: context()});
    // The pinned TaskHandler base class derives `argMap` from real argv; the request channel is exercised
    // through the same public `argMap.get` contract `RuntimeSmokeTaskHandler`'s spec uses.
    Object.defineProperty(handler, 'argMap', {value: requestArgMap(requestInput === undefined ? undefined : encodedRequest(requestInput))});
    const results: {structuredOutput: unknown}[] = [];
    const errors: (Error | undefined)[] = [];
    handler.setOnResultCallback((result: unknown) => results.push(result as {structuredOutput: unknown}));
    handler.setDoneSignalImplementor((error?: Error) => errors.push(error));
    return {handler, results, errors};
}

function resultAjv(schemaFile: string): Ajv {
    const ajv = new Ajv({strict: false});
    ajv.addSchema(JSON.parse(readFileSync(join('runtime-nvb', 'schemas', schemaFile), 'utf8')));
    return ajv;
}

function fakeCapability(outcome: LeafInvocationResult): TaskLeafCapability & {invocations: TaskLeafRequest[]} {
    const invocations: TaskLeafRequest[] = [];
    return {
        taskId: 'wt:git:publish-commits', leafIds: ['git.push'],
        invocations,
        async invoke(request: TaskLeafRequest) { invocations.push(request); return outcome; }
    };
}

function context(): LaneRuntimeContext {
    return {
        workspace: '/control', laneId: 'lane-1', initiativeId: 'init', laneSlug: 'lane', laneDir: '/control/.watchtower/lanes/demo',
        homeRepositoryId: 'repo', repositoriesFile: '/control/.watchtower/lanes/demo/repositories.json',
        runtimeRoot: '/runtime', runtimeVersion: '1.0.0', knowledgeRoot: '/knowledge',
        baseEnvironment: {path: '/usr/bin', home: '/home/kavan'}
    };
}

describe('GitAcceptanceTaskHandler — record-acceptance', function () {
    it('reports a schema-valid applied mutationResult for a valid input', async function () {
        const probe = handlerProbe('wt:git:record-acceptance', {schemaVersion: 1, targetId: 'CA-12'});
        await probe.handler.handleAsync();
        expect(probe.results).toEqual([{structuredOutput: {applied: true, changed: ['CA-12'], unchanged: [], warnings: []}}]);
        expect(resultAjv('gitRecordAcceptanceResult.schema.json')
            .validate('watchtower://runtime/schemas/git-record-acceptance-result/v1', probe.results[0].structuredOutput)).toBeTrue();
        expect(probe.errors).toEqual([undefined]);
    });

    it('rejects malformed, missing, and extra-field inputs without effect', async function () {
        for (const input of [undefined, null, [], '', 1, {}, {schemaVersion: 1}, {schemaVersion: 2, targetId: 'x'}, {schemaVersion: 1, targetId: 'x', extra: true}]) {
            const probe = handlerProbe('wt:git:record-acceptance', input);
            await probe.handler.handleAsync();
            expect(probe.results).toEqual([{structuredOutput: {applied: false, changed: [], unchanged: [], warnings: []}}]);
            expect(probe.errors[0]).toBeDefined();
        }
    });

    it('is model-free and deterministic: identical input always yields the identical result', async function () {
        const first = handlerProbe('wt:git:record-acceptance', {schemaVersion: 1, targetId: 'CA-12'});
        const second = handlerProbe('wt:git:record-acceptance', {schemaVersion: 1, targetId: 'CA-12'});
        await first.handler.handleAsync();
        await second.handler.handleAsync();
        expect(first.results).toEqual(second.results);
    });
});

describe('GitAcceptanceTaskHandler — publish-commits', function () {
    const validInput = {schemaVersion: 1, targetId: 'repo-a', sha: 'a'.repeat(40), ref: 'refs/heads/main', remote: 'origin'};

    it('invokes the git.push leaf with a closed argv derived from the typed request and reports success', async function () {
        const capability = fakeCapability({outcome: 'completed', leafId: 'git.push', exitCode: 0, stdout: '', stderr: ''});
        const probe = handlerProbe('wt:git:publish-commits', validInput, capability);
        await probe.handler.handleAsync();
        expect(probe.results).toEqual([{structuredOutput: {applied: true, changed: ['repo-a'], unchanged: [], warnings: []}}]);
        expect(capability.invocations.length).toBe(1);
        expect(capability.invocations[0].args).toEqual(['push', 'origin', `${validInput.sha}:refs/heads/main`]);
        expect(resultAjv('gitPublishCommitsResult.schema.json')
            .validate('watchtower://runtime/schemas/git-publish-commits-result/v1', probe.results[0].structuredOutput)).toBeTrue();
    });

    it('reports a refused mutationResult (never applied) when the leaf fails', async function () {
        const capability = fakeCapability({outcome: 'failed', leafId: 'git.push', reason: 'LEAF_EXECUTION_FAILED', exitCode: 1, signal: null, diagnostic: 'push failed', stdout: '', stderr: ''});
        const probe = handlerProbe('wt:git:publish-commits', validInput, capability);
        await probe.handler.handleAsync();
        expect(probe.results).toEqual([{structuredOutput: {applied: false, changed: [], unchanged: [], warnings: []}}]);
        expect(probe.errors[0]).toBeDefined();
    });

    it('reports a refused mutationResult when the leaf is cancelled', async function () {
        const capability = fakeCapability({outcome: 'cancelled', leafId: 'git.push', signal: 'SIGTERM', stdout: '', stderr: ''});
        const probe = handlerProbe('wt:git:publish-commits', validInput, capability);
        await probe.handler.handleAsync();
        expect(probe.results[0].structuredOutput).toEqual({applied: false, changed: [], unchanged: [], warnings: []});
    });

    it('rejects malformed, missing, and extra-field inputs before ever invoking the leaf', async function () {
        const capability = fakeCapability({outcome: 'completed', leafId: 'git.push', exitCode: 0, stdout: '', stderr: ''});
        for (const input of [undefined, {}, {schemaVersion: 1, targetId: 'repo-a'}, {...validInput, extra: true}, {...validInput, remote: ''}]) {
            const probe = handlerProbe('wt:git:publish-commits', input, capability);
            await probe.handler.handleAsync();
            expect(probe.results[0].structuredOutput).toEqual({applied: false, changed: [], unchanged: [], warnings: []});
        }
        expect(capability.invocations).toEqual([]);
    });

    it('argv is always exactly [push, remote, sha:ref] for a valid request, never a shell string', async function () {
        const capability = fakeCapability({outcome: 'completed', leafId: 'git.push', exitCode: 0, stdout: '', stderr: ''});
        const probe = handlerProbe('wt:git:publish-commits', validInput, capability);
        await probe.handler.handleAsync();
        expect(capability.invocations[0].args.length).toBe(3);
        expect(capability.invocations[0].args.every((value) => typeof value === 'string')).toBeTrue();
    });

    it('rejects a shell-metacharacter ref before ever invoking the leaf', async function () {
        const capability = fakeCapability({outcome: 'completed', leafId: 'git.push', exitCode: 0, stdout: '', stderr: ''});
        const probe = handlerProbe('wt:git:publish-commits', {...validInput, ref: 'refs/heads/main; rm -rf /'}, capability);
        await probe.handler.handleAsync();
        expect(probe.results[0].structuredOutput).toEqual({applied: false, changed: [], unchanged: [], warnings: []});
        expect(capability.invocations).toEqual([]);
    });

    it('correction CA12-R4 — rejects an option-shaped remote before it can reach git as a flag', async function () {
        const capability = fakeCapability({outcome: 'completed', leafId: 'git.push', exitCode: 0, stdout: '', stderr: ''});
        for (const remote of ['--force', '--force-with-lease', '--receive-pack=evil', '-x', '--upload-pack=x']) {
            const probe = handlerProbe('wt:git:publish-commits', {...validInput, remote}, capability);
            await probe.handler.handleAsync();
            expect(probe.results[0].structuredOutput).withContext(remote).toEqual({applied: false, changed: [], unchanged: [], warnings: []});
        }
        expect(capability.invocations).toEqual([]);
    });

    it('correction CA12-R4 — rejects option-shaped or malformed ref and sha values before ever invoking the leaf', async function () {
        const capability = fakeCapability({outcome: 'completed', leafId: 'git.push', exitCode: 0, stdout: '', stderr: ''});
        const cases = [
            {...validInput, ref: '--force'},
            {...validInput, ref: 'refs/heads/-x'},
            {...validInput, ref: 'main'},
            {...validInput, sha: '--force'},
            {...validInput, sha: 'not-hex'},
            {...validInput, sha: 'a'.repeat(39)},
            {...validInput, sha: 'A'.repeat(40)}
        ];
        for (const input of cases) {
            const probe = handlerProbe('wt:git:publish-commits', input, capability);
            await probe.handler.handleAsync();
            expect(probe.results[0].structuredOutput).withContext(JSON.stringify(input)).toEqual({applied: false, changed: [], unchanged: [], warnings: []});
        }
        expect(capability.invocations).toEqual([]);
    });

    it('never permits force push: no accepted remote/ref/sha combination can add a force-shaped argv element', async function () {
        const capability = fakeCapability({outcome: 'completed', leafId: 'git.push', exitCode: 0, stdout: '', stderr: ''});
        const probe = handlerProbe('wt:git:publish-commits', validInput, capability);
        await probe.handler.handleAsync();
        expect(capability.invocations[0].args.some((value) => value.includes('force'))).toBeFalse();
        expect(capability.invocations[0].args.every((value) => !value.startsWith('-'))).toBeTrue();
    });

    it('never invokes the leaf, and reports refusal, for an unrecognized task name', async function () {
        const capability = fakeCapability({outcome: 'completed', leafId: 'git.push', exitCode: 0, stdout: '', stderr: ''});
        const probe = handlerProbe('wt:git:unknown', validInput, capability);
        await probe.handler.handleAsync();
        expect(probe.results[0].structuredOutput).toEqual({applied: false, changed: [], unchanged: [], warnings: []});
        expect(capability.invocations).toEqual([]);
    });
});
