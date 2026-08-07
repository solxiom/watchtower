import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {chmodSync, cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PROPOSAL_TYPES} from '../../src/contracts/index.js';
import type {ProposalType} from '../../src/contracts/index.js';
import {HermesEndpointAdapter} from '../../src/foundation/runtime/index.js';
import type {HermesEndpointOptions, HermesProcessPort, HermesProcessRequest, HermesProcessResult} from '../../src/contracts/hermesEndpoint.js';
import {FUTURE, SNAPSHOT_DIGEST, fixtureFor} from './proposal/support/proposalFixtures.js';

describe('HermesEndpointAdapter', function () {
    it('reports an absent installed identity as healthy not-installed without invoking', async function () {
        let calls = 0;
        const root = mkdtempSync(join(tmpdir(), 'wt-hermes-missing-'));
        const adapter = new HermesEndpointAdapter({...missingOptions(root), process: {invoke: async () => { calls++; return result('unavailable'); }}});
        expect(await adapter.probe({cwd: root})).toEqual({status: 'not-installed', reason: 'HERMES_NOT_INSTALLED'});
        expect(calls).toBe(0);
    });

    it('runs the installed fixture from its original and relocated roots', async function () {
        const original = fixtureRoot();
        const relocated = mkdtempSync(join(tmpdir(), 'wt-hermes-relocated-'));
        cpSync(original, relocated, {recursive: true});
        for (const root of [original, relocated]) {
            const adapter = new HermesEndpointAdapter({...options(root), process: realProcess()});
            const output = await adapter.invoke({cwd: root, envelope: {schemaVersion: 1}});
            expect(output.outcome).toBe('completed');
            if (output.outcome === 'completed') {
                expect(output.result.type).toBe('select-ready-batch');
                expect(output.result.body).toEqual(Object.freeze({type: 'select-ready-batch', batchId: 'B1'}));
            }
        }
    });

    it('rejects symlink, escape, stale catalog, unsupported model, and malformed identity before spawn', async function () {
        const root = fixtureRoot();
        const identity = options(root).installation;
        const calls = {count: 0};
        const process = recordingProcess(calls);
        const link = join(root, 'hermes-link');
        symlinkSync(identity.executablePath, link);
        expect((await new HermesEndpointAdapter({...options(root), process, installation: {...identity, executablePath: link}}).probe({cwd: root})).reason).toBe('HERMES_IDENTITY_INVALID');
        expect((await new HermesEndpointAdapter({...options(root), process, installation: {...identity, executablePath: '/tmp/escape/hermes'}}).probe({cwd: root})).reason).toBe('HERMES_IDENTITY_INVALID');
        expect(failure(await new HermesEndpointAdapter({...options(root), process, catalog: {...options(root).catalog, current: false}}).invoke({cwd: root, envelope: {schemaVersion: 1}}))).toBe('HERMES_CATALOG_INVALID');
        expect(failure(await new HermesEndpointAdapter({...options(root), process, catalog: {...options(root).catalog, model: 'unsupported'}}).invoke({cwd: root, envelope: {schemaVersion: 1}}))).toBe('HERMES_MODEL_UNSUPPORTED');
        expect(calls.count).toBe(0);
    });

    it('rejects unenforced safety, malformed output, and cancellation', async function () {
        const root = fixtureRoot();
        const unsafe = new HermesEndpointAdapter({...options(root), process: recordingProcess({count: 0}, {timeout: false, processGroupCancellation: true, writeDenied: true})});
        expect(failure(await unsafe.invoke({cwd: root, envelope: {schemaVersion: 1}}))).toBe('HERMES_TIMEOUT_UNENFORCED');
        const malformed = new HermesEndpointAdapter({...options(root), process: sequenceProcess([result('exited', 'hermes 0.18.2'), result('exited', '{"schemaVersion":1} {"schemaVersion":1}')])});
        expect(failure(await malformed.invoke({cwd: root, envelope: {schemaVersion: 1}}))).toBe('HERMES_RESULT_SCHEMA_INVALID');
        const cancelled = new HermesEndpointAdapter({...options(root), process: sequenceProcess([result('exited', 'hermes 0.18.2'), result('cancelled')])});
        expect((await cancelled.invoke({cwd: root, envelope: {schemaVersion: 1}})).outcome).toBe('cancelled');
    });

    it('rejects select-ready-batch with an empty body before completion', async function () {
        const root = fixtureRoot();
        const emptyBody = wireProposal('select-ready-batch', {body: {}});
        const adapter = new HermesEndpointAdapter({...options(root), process: sequenceProcess([result('exited', 'hermes 0.18.2'), result('exited', JSON.stringify(emptyBody))])});
        expect(failure(await adapter.invoke({cwd: root, envelope: {schemaVersion: 1}}))).toBe('HERMES_RESULT_SCHEMA_INVALID');
    });

    it('accepts every canonical proposal type through the shared structural validator', async function () {
        const root = fixtureRoot();
        for (const type of PROPOSAL_TYPES) {
            const candidate = wireProposal(type);
            const adapter = new HermesEndpointAdapter({...options(root), process: sequenceProcess([result('exited', 'hermes 0.18.2'), result('exited', JSON.stringify(candidate))])});
            const output = await adapter.invoke({cwd: root, envelope: {schemaVersion: 1}});
            expect(output.outcome).withContext(type).toBe('completed');
        }
    });

    it('preserves bounded additional requestedEffect fields allowed by the canonical contract', async function () {
        const root = fixtureRoot();
        const candidate = wireProposal('select-ready-batch', {requestedEffects: [{effect: 'dispatch-batch', batchId: 'B1'}]});
        const adapter = new HermesEndpointAdapter({...options(root), process: sequenceProcess([result('exited', 'hermes 0.18.2'), result('exited', JSON.stringify(candidate))])});
        const output = await adapter.invoke({cwd: root, envelope: {schemaVersion: 1}});
        expect(output.outcome).toBe('completed');
        if (output.outcome === 'completed') {
            expect(output.result.requestedEffects[0]).toEqual(Object.freeze({effect: 'dispatch-batch', batchId: 'B1'}));
        }
    });

    it('rejects structurally invalid proposal output without completion', async function () {
        const root = fixtureRoot();
        const valid = wireProposal('select-ready-batch');
        const cases: Array<Record<string, unknown>> = [
            without(valid, 'cycleId'),
            {...valid, snapshotDigest: 'sha256:bad'},
            {...valid, expiresAt: '2099-01-01'},
            {...valid, expiresAt: '2099-01-01T00:00:00'},
            {...valid, expiresAt: '2099-02-29T00:00:00Z'},
            {...valid, expiresAt: '2099-04-31T00:00:00Z'},
            {...valid, expiresAt: '2099-13-01T00:00:00Z'},
            {...valid, evidenceRefs: ['event:e1', 'event:e1']},
            {...valid, body: {}},
            {...valid, type: 'invent-a-type'},
            {...valid, requestedEffects: [{effect: 'delete-everything'}]}
        ];
        for (const candidate of cases) {
            const adapter = new HermesEndpointAdapter({...options(root), process: sequenceProcess([result('exited', 'hermes 0.18.2'), result('exited', JSON.stringify(candidate))])});
            expect(failure(await adapter.invoke({cwd: root, envelope: {schemaVersion: 1}}))).withContext(JSON.stringify(candidate)).toBe('HERMES_RESULT_SCHEMA_INVALID');
        }
        const duplicate = JSON.stringify(valid).replace('"cycleId":"cycle-1"', '"cycleId":"cycle-1","cycleId":"cycle-2"');
        const duplicateAdapter = new HermesEndpointAdapter({...options(root), process: sequenceProcess([result('exited', 'hermes 0.18.2'), result('exited', duplicate)])});
        expect(failure(await duplicateAdapter.invoke({cwd: root, envelope: {schemaVersion: 1}}))).toBe('HERMES_RESULT_SCHEMA_INVALID');
    });

    it('tolerates bounded additional top-level proposal members like the canonical validator', async function () {
        const root = fixtureRoot();
        const candidate = {...wireProposal('select-ready-batch'), rationale: 'bounded operator-facing rationale'};
        const adapter = new HermesEndpointAdapter({...options(root), process: sequenceProcess([result('exited', 'hermes 0.18.2'), result('exited', JSON.stringify(candidate))])});
        expect((await adapter.invoke({cwd: root, envelope: {schemaVersion: 1}})).outcome).toBe('completed');
    });
});

function wireProposal(type: ProposalType, overrides: {readonly body?: Record<string, unknown>; readonly requestedEffects?: readonly Record<string, unknown>[]} = {}): Record<string, unknown> {
    const fixture = fixtureFor(type);
    return {
        schemaVersion: 1,
        cycleId: 'cycle-1',
        proposalId: `prop-${type}`,
        type,
        snapshotDigest: SNAPSHOT_DIGEST,
        expiresAt: FUTURE,
        evidenceRefs: ['finding:F1'],
        body: overrides.body ?? {...fixture.body},
        requestedEffects: overrides.requestedEffects ?? [...fixture.effects]
    };
}

function options(root: string): HermesEndpointOptions {
    const executablePath = join(root, 'hermes');
    const digest = `sha256:${createHash('sha256').update(readFileSync(executablePath)).digest('hex')}` as `sha256:${string}`;
    return {adapterVersion: '1', process: fixtureProcess(), installation: {executablePath, executableDigest: digest, installRoot: root, configRoot: join(root, 'config'), dataRoot: join(root, 'data'), version: '0.18.2', environment: {HOME: root, PATH: '/usr/bin', HERMES_HOME: join(root, 'data')}}, catalog: {fingerprint: `sha256:${'a'.repeat(64)}`, model: 'fixture-model', supportedModels: ['fixture-model'], capabilityEvidenceVersion: 'v1', current: true}};
}

function missingOptions(root: string): HermesEndpointOptions {
    return {...optionsWithoutDigest(root), installation: {...optionsWithoutDigest(root).installation, executableDigest: `sha256:${'0'.repeat(64)}`}};
}

function optionsWithoutDigest(root: string): HermesEndpointOptions {
    return {adapterVersion: '1', process: fixtureProcess(), installation: {executablePath: join(root, 'hermes'), executableDigest: `sha256:${'0'.repeat(64)}`, installRoot: root, configRoot: join(root, 'config'), dataRoot: join(root, 'data'), version: '0.18.2', environment: {HOME: root, PATH: '/usr/bin', HERMES_HOME: join(root, 'data')}}, catalog: {fingerprint: `sha256:${'a'.repeat(64)}`, model: 'fixture-model', supportedModels: ['fixture-model'], capabilityEvidenceVersion: 'v1', current: true}};
}

function fixtureRoot(): string {
    const root = mkdtempSync(join(tmpdir(), 'wt-hermes-installed-'));
    mkdirSync(join(root, 'config')); mkdirSync(join(root, 'data'));
    const proposal = JSON.stringify(wireProposal('select-ready-batch'));
    writeFileSync(join(root, 'hermes'), `#!/bin/sh\nif [ "$1" = "--version" ]; then echo "hermes 0.18.2"; else touch "$HERMES_HOME/should-not-exist" 2>/dev/null && exit 9; printf '${proposal.replace(/'/gu, "'\\''")}'; fi\n`);
    chmodSync(join(root, 'hermes'), 0o755);
    return root;
}

function fixtureProcess(): HermesProcessPort { return recordingProcess({count: 0}); }
function realProcess(): HermesProcessPort {
    return {invoke: request => new Promise(resolve => {
        for (const root of request.writeDeniedRoots) chmodSync(root, 0o555);
        const child = spawn(request.executable, [...request.args], {cwd: request.cwd, env: {...request.environment}, shell: false, detached: true});
        let stdout = ''; let stderr = ''; let settled = false;
        const finish = (value: HermesProcessResult) => { if (settled) return; settled = true; clearTimeout(timer); for (const root of request.writeDeniedRoots) chmodSync(root, 0o755); resolve(value); };
        const timer = setTimeout(() => { if (child.pid !== undefined) process.kill(-child.pid, 'SIGTERM'); finish(result('cancelled')); }, request.timeoutMs);
        child.stdout?.on('data', data => { stdout += String(data); }); child.stderr?.on('data', data => { stderr += String(data); }); child.stdin?.on('error', () => undefined);
        child.on('error', error => finish({...result(error.message.includes('ENOENT') ? 'unavailable' : 'failed'), stderr: error.message}));
        child.on('close', (code, signal) => finish({...result(signal === 'SIGTERM' ? 'cancelled' : 'exited', stdout, {timeout: true, processGroupCancellation: request.processGroup, writeDenied: request.writeDeniedRoots.length > 0}), exitCode: code, signal, stderr}));
        child.stdin?.end(request.input);
    })};
}
function recordingProcess(calls: {count: number}, enforcement = {timeout: true, processGroupCancellation: true, writeDenied: true}): HermesProcessPort {
    return {invoke: async function (request: HermesProcessRequest) {
        calls.count++;
        return request.args[0] === '--version'
            ? result('exited', 'hermes 0.18.2', enforcement)
            : result('exited', JSON.stringify(wireProposal('select-ready-batch')), enforcement);
    }};
}

function sequenceProcess(results: HermesProcessResult[]): HermesProcessPort { let index = 0; return {invoke: async function () { return results[Math.min(index++, results.length - 1)]; }}; }
function result(disposition: HermesProcessResult['disposition'], stdout = '', enforcement = {timeout: true, processGroupCancellation: true, writeDenied: true}): HermesProcessResult { return {disposition, exitCode: disposition === 'exited' ? 0 : null, signal: disposition === 'cancelled' ? 'SIGTERM' : null, stdout, stderr: '', enforcement}; }
function failure(result: Awaited<ReturnType<HermesEndpointAdapter['invoke']>>): string { if (result.outcome === 'completed') throw new Error('Expected a failed result.'); return result.reason; }
function without(value: Record<string, unknown>, key: string): Record<string, unknown> { const copy = {...value}; delete copy[key]; return copy; }
