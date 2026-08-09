import Ajv from 'ajv';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import HoldTaskHandler from '../../runtime-nvb/handlers/HoldTaskHandler.js';
import {LANE_ID, makeLaneDir, removeLaneDir, serviceFor} from '../foundation/coordinatorHold/support/holdFixtures.js';

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

function handlerProbe(taskName: string, requestInput: unknown): HandlerProbe & {readonly handler: HoldTaskHandler} {
    const handler = new HoldTaskHandler({taskName});
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

describe('HoldTaskHandler — the wt:hold:place/wt:hold:release wiring (correction CA27-03)', function () {
    let laneDir: string;

    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('places a durable hold reachable through effect.placeHold\'s declared task, reported as schema-valid', async function () {
        const probe = handlerProbe('wt:hold:place', {
            schemaVersion: 1, operation: 'place', laneDir, laneId: LANE_ID,
            scope: ['batch-1'], reason: 'freeze for review', expiresAt: '2999-01-01T00:00:00Z', origin: 'operator'
        });
        await probe.handler.handleAsync();
        const output = probe.results[0].structuredOutput as {applied: boolean; holdId: string};
        expect(output.applied).toBeTrue();
        expect(resultAjv('holdPlaceResult.schema.json')
            .validate('watchtower://runtime/schemas/hold-place-result/v1', output)).toBeTrue();
        expect(probe.errors).toEqual([undefined]);
        expect(serviceFor(laneDir).list().map((hold) => hold.holdId)).toEqual([output.holdId]);
    });

    it('releases a placed hold through effect.releaseHold\'s declared task', async function () {
        const placed = handlerProbe('wt:hold:place', {
            schemaVersion: 1, operation: 'place', laneDir, laneId: LANE_ID,
            scope: ['batch-1'], reason: 'freeze', expiresAt: '2999-01-01T00:00:00Z', origin: 'operator'
        });
        await placed.handler.handleAsync();
        const holdId = (placed.results[0].structuredOutput as {holdId: string}).holdId;
        const released = handlerProbe('wt:hold:release', {schemaVersion: 1, operation: 'release', laneDir, laneId: LANE_ID, holdId});
        await released.handler.handleAsync();
        expect(released.results[0].structuredOutput).toEqual({schemaVersion: 1, applied: true, holdId});
        expect(released.errors).toEqual([undefined]);
    });

    it('rejects malformed, missing, and extra-field inputs without ever touching durable state', async function () {
        for (const input of [
            undefined, null, [], '', 1, {},
            {schemaVersion: 1, operation: 'place'},
            {schemaVersion: 1, operation: 'place', laneDir, laneId: LANE_ID, scope: [], reason: 'x', expiresAt: '2999-01-01T00:00:00Z', origin: 'operator'},
            {schemaVersion: 1, operation: 'place', laneDir, laneId: LANE_ID, scope: ['x'], reason: 'x', expiresAt: '2999-01-01T00:00:00Z', origin: 'operator', extra: true},
            // correction CA27-04: the wire guard itself refuses a duplicate or blank-mixed-with-real scope entry.
            {schemaVersion: 1, operation: 'place', laneDir, laneId: LANE_ID, scope: ['x', 'x'], reason: 'x', expiresAt: '2999-01-01T00:00:00Z', origin: 'operator'},
            {schemaVersion: 1, operation: 'place', laneDir, laneId: LANE_ID, scope: ['x', '   '], reason: 'x', expiresAt: '2999-01-01T00:00:00Z', origin: 'operator'},
            {schemaVersion: 1, operation: 'release', laneDir, laneId: LANE_ID}
        ]) {
            const probe = handlerProbe('wt:hold:place', input);
            await probe.handler.handleAsync();
            expect(probe.results).toEqual([{structuredOutput: {schemaVersion: 1, applied: false, reason: 'HOLD_TASK_INPUT_INVALID'}}]);
            expect(probe.errors[0]).toBeDefined();
        }
        expect(serviceFor(laneDir).list()).toEqual([]);
    });

    it('reports the durable precondition\'s own typed reason, not a generic input-invalid, when the wire input is well-formed but the service refuses', async function () {
        const probe = handlerProbe('wt:hold:release', {schemaVersion: 1, operation: 'release', laneDir, laneId: LANE_ID, holdId: 'never-placed'});
        await probe.handler.handleAsync();
        expect(probe.results).toEqual([{structuredOutput: {schemaVersion: 1, applied: false, reason: 'HOLD_NOT_FOUND'}}]);
        expect(probe.errors[0]).toBeDefined();
    });
});
