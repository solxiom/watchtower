import Ajv from 'ajv';
import {chmodSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import AmendmentTaskHandler from '../../runtime-nvb/handlers/AmendmentTaskHandler.js';
import {
    LANE_ID, acceptedRecordFor, admitBodyFor, authorityFor, makeLaneDir, removeLaneDir, storeFor
} from '../foundation/coordinatorAmendment/support/amendmentFixtures.js';

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

function handlerProbe(taskName: string, requestInput: unknown): HandlerProbe & {readonly handler: AmendmentTaskHandler} {
    const handler = new AmendmentTaskHandler({taskName});
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

describe('AmendmentTaskHandler — the wt:amendment:create-request/wt:amendment:admit wiring (correction CA27-03)', function () {
    let laneDir: string;

    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('creates a durable pending amendment request reachable through effect.createAmendmentRequest\'s declared task', async function () {
        const probe = handlerProbe('wt:amendment:create-request', {
            schemaVersion: 1, operation: 'create-request', laneDir, laneId: LANE_ID, packId: 'pack-1', reason: 'needs a fix'
        });
        await probe.handler.handleAsync();
        const output = probe.results[0].structuredOutput as {applied: boolean; amendmentRequestId: string};
        expect(output.applied).toBeTrue();
        expect(resultAjv('amendmentCreateRequestResult.schema.json')
            .validate('watchtower://runtime/schemas/amendment-create-request-result/v1', output)).toBeTrue();
        expect(probe.errors).toEqual([undefined]);
        expect(storeFor(laneDir).list().map((request) => request.amendmentRequestId)).toEqual([output.amendmentRequestId]);
    });

    it('atomically admits an accepted amendment through effect.activatePackRevision\'s declared task', async function () {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'needs a fix'});
        store.recordAcceptance(acceptedRecordFor());
        const probe = handlerProbe('wt:amendment:admit', {
            schemaVersion: 1, operation: 'admit', laneDir, laneId: LANE_ID, affectedWorktreeIds: [],
            body: admitBodyFor(), authority: authorityFor()
        });
        await probe.handler.handleAsync();
        const output = probe.results[0].structuredOutput;
        expect(resultAjv('amendmentAdmitResult.schema.json')
            .validate('watchtower://runtime/schemas/amendment-admit-result/v1', output)).toBeTrue();
        expect(output).toEqual({
            schemaVersion: 1, applied: true, activeSeal: acceptedRecordFor().candidateSeal,
            supersedesSeal: null, requiredCommit: acceptedRecordFor().newReviewedCommit
        });
        expect(probe.errors).toEqual([undefined]);
    });

    it('refuses a forged-but-flag-valid candidate seal before ever activating a revision (correction CA27-02)', async function () {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'needs a fix'});
        store.recordAcceptance(acceptedRecordFor());
        const probe = handlerProbe('wt:amendment:admit', {
            schemaVersion: 1, operation: 'admit', laneDir, laneId: LANE_ID, affectedWorktreeIds: [],
            body: admitBodyFor({candidateSeal: `sha256:${'f'.repeat(64)}`}), authority: authorityFor()
        });
        await probe.handler.handleAsync();
        expect(probe.results).toEqual([{structuredOutput: {schemaVersion: 1, applied: false, reason: 'AMENDMENT_NOT_ACCEPTED'}}]);
        expect(probe.errors[0]).toBeDefined();
    });

    it('rejects malformed, missing, and extra-field inputs without ever touching durable state', async function () {
        for (const input of [
            undefined, null, [], '', 1, {},
            {schemaVersion: 1, operation: 'create-request'},
            {schemaVersion: 1, operation: 'create-request', laneDir, laneId: LANE_ID, packId: '', reason: 'x'},
            {schemaVersion: 1, operation: 'create-request', laneDir, laneId: LANE_ID, packId: 'p', reason: 'x', extra: true},
            {schemaVersion: 1, operation: 'admit', laneDir, laneId: LANE_ID}
        ]) {
            const probe = handlerProbe('wt:amendment:create-request', input);
            await probe.handler.handleAsync();
            expect(probe.results).toEqual([{structuredOutput: {schemaVersion: 1, applied: false, reason: 'AMENDMENT_TASK_INPUT_INVALID'}}]);
            expect(probe.errors[0]).toBeDefined();
        }
        expect(storeFor(laneDir).list()).toEqual([]);
    });

    it('reports the durable precondition\'s own typed reason, not a generic input-invalid, when the wire input is well-formed but the service refuses', async function () {
        const probe = handlerProbe('wt:amendment:admit', {
            schemaVersion: 1, operation: 'admit', laneDir, laneId: LANE_ID, affectedWorktreeIds: [],
            body: admitBodyFor(), authority: authorityFor()
        });
        await probe.handler.handleAsync();
        expect(probe.results).toEqual([{structuredOutput: {schemaVersion: 1, applied: false, reason: 'AMENDMENT_NOT_FOUND'}}]);
        expect(probe.errors[0]).toBeDefined();
    });

    /**
     * Review correction CA27-06, exercised through the packaged task boundary:
     * once activation genuinely succeeded but the projection write failed (the
     * CA27-05 recovery scenario), a retry through `wt:amendment:admit` carrying
     * a forged body must still be refused — not silently accepted just because
     * the target pack revision happens to already be live.
     */
    it('refuses a forged recovery retry through the packaged wt:amendment:admit task, then settles cleanly on the legitimate retry (CA27-06)', async function () {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'needs a fix'});
        store.recordAcceptance(acceptedRecordFor());
        const legitimateInput = {
            schemaVersion: 1, operation: 'admit', laneDir, laneId: LANE_ID, affectedWorktreeIds: [],
            body: admitBodyFor(), authority: authorityFor()
        };

        const requestsDir = join(laneDir, 'coordinator', 'amendment-requests');
        chmodSync(requestsDir, 0o500);
        try {
            const firstAttempt = handlerProbe('wt:amendment:admit', legitimateInput);
            await firstAttempt.handler.handleAsync();
            expect((firstAttempt.results[0].structuredOutput as {applied: boolean}).applied).toBeFalse();
        } finally {
            chmodSync(requestsDir, 0o700);
        }
        expect(store.get('amend-1')?.status).toBe('accepted');

        const forgedRetry = handlerProbe('wt:amendment:admit', {
            ...legitimateInput,
            body: admitBodyFor({resolutionId: 'forged-resolution', candidateSeal: `sha256:${'f'.repeat(64)}`}),
            authority: authorityFor({packActiveSeal: acceptedRecordFor().candidateSeal})
        });
        await forgedRetry.handler.handleAsync();
        expect(forgedRetry.results).toEqual([{structuredOutput: {schemaVersion: 1, applied: false, reason: 'AMENDMENT_NOT_ACCEPTED'}}]);
        expect(store.get('amend-1')?.status).toBe('accepted');

        const legitimateRetry = handlerProbe('wt:amendment:admit', legitimateInput);
        await legitimateRetry.handler.handleAsync();
        expect((legitimateRetry.results[0].structuredOutput as {applied: boolean}).applied).toBeTrue();
        expect(store.get('amend-1')?.status).toBe('admitted');
    });
});
