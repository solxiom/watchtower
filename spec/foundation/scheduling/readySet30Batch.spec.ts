import {computeReadySet} from '../../../src/foundation/scheduling/index.js';
import {makeWorkDir, removeWorkDir} from '../../storage/support/storeFixtures.js';
import {
    activeClaim, candidateBindingFor, compileFanOutFixture, compileReadySetFixture, ownedBinding, readySetParamsFrom
} from './support/readySetIndexFixtures.js';

describe('computeReadySet — compiled 30-batch pack index integration', function () {
    let dir: string;

    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(async function () {
        removeWorkDir(dir);
    });

    it('surfaces only B1 as the unique ready candidate when none are accepted', async function () {
        const compiled = await compileReadySetFixture(30, dir);
        const result = computeReadySet(readySetParamsFrom(compiled));
        await compiled.store.close();
        expect(result.candidateBatchIds).toEqual(['B1']);
        expect(result.classification).toBe('unique');
        expect(result.pendingBatchIds).toHaveSize(30);
    });

    it('surfaces only the chain leaf once every ancestor is accepted', async function () {
        const compiled = await compileReadySetFixture(30, dir);
        const accepted = new Set(Array.from({length: 29}, (_unused, index) => `B${index + 1}`));
        const result = computeReadySet(readySetParamsFrom(compiled, {acceptedBatchIds: accepted}));
        await compiled.store.close();
        expect(result.candidateBatchIds).toEqual(['B30']);
        expect(result.classification).toBe('unique');
    });

    it('blocks every descendant with DEPENDENCY_UNSATISFIED when an intermediate ancestor is unaccepted', async function () {
        const compiled = await compileReadySetFixture(30, dir);
        const accepted = new Set(['B1', 'B2', 'B3']);
        const result = computeReadySet(readySetParamsFrom(compiled, {acceptedBatchIds: accepted}));
        await compiled.store.close();
        expect(result.candidateBatchIds).toEqual(['B4']);
        expect(result.blocked.some((entry) => entry.batchId === 'B30' && entry.reasons.some((reason) => reason.code === 'DEPENDENCY_UNSATISFIED'))).toBeTrue();
    });

    it('blocks R5 batches with ENDPOINT_UNAVAILABLE when the reasoning-class route is inactive', async function () {
        const compiled = await compileReadySetFixture(30, dir);
        const result = computeReadySet(readySetParamsFrom(compiled, {
            endpointRoutes: [{reasoningClass: 'R3', active: true}, {reasoningClass: 'R5', active: false}]
        }));
        await compiled.store.close();
        expect(result.candidateBatchIds).toEqual([]);
        const blocked = result.blocked.find((entry) => entry.batchId === 'B1');
        expect(blocked?.reasons).toEqual([jasmine.objectContaining({code: 'ENDPOINT_UNAVAILABLE'})]);
        expect(result.populationReason).toBe('READY_SET_BLOCKED_UNIVERSAL');
    });

    it('blocks R5 batches with CAPACITY_EXHAUSTED when no matching capacity reservation exists', async function () {
        const compiled = await compileReadySetFixture(30, dir);
        const result = computeReadySet(readySetParamsFrom(compiled, {
            capacityReserved: [{reasoningClass: 'R3', available: true}, {reasoningClass: 'R5', available: false}]
        }));
        await compiled.store.close();
        const blocked = result.blocked.find((entry) => entry.batchId === 'B1');
        expect(blocked?.reasons).toEqual([jasmine.objectContaining({code: 'CAPACITY_EXHAUSTED'})]);
    });

    it('blocks a candidate whose exclusive-write path overlaps an active claim', async function () {
        const compiled = await compileReadySetFixture(30, dir);
        const result = computeReadySet(readySetParamsFrom(compiled, {
            activeClaims: [activeClaim('CA-99', 'src/**')]
        }));
        await compiled.store.close();
        expect(result.candidateBatchIds).toEqual([]);
        const blocked = result.blocked.find((entry) => entry.batchId === 'B1');
        expect(blocked?.reasons).toEqual([jasmine.objectContaining({code: 'CLAIM_CONFLICT'})]);
    });

    it('blocks a candidate whose dedicated writable worktree is already claimed', async function () {
        const compiled = await compileReadySetFixture(30, dir);
        const path = '/work/nirvana';
        const result = computeReadySet(readySetParamsFrom(compiled, {
            candidateBindings: [candidateBindingFor('B1', path)],
            activeBindings: [ownedBinding('CA-99', path)]
        }));
        await compiled.store.close();
        const blocked = result.blocked.find((entry) => entry.batchId === 'B1');
        expect(blocked?.reasons).toEqual([jasmine.objectContaining({
            code: 'CLAIM_CONFLICT', detail: jasmine.stringMatching(/\[worktree]/)
        })]);
    });

    it('produces identical ReadySetResult for identical compiled-index inputs', async function () {
        const compiled = await compileReadySetFixture(30, dir);
        const params = readySetParamsFrom(compiled, {acceptedBatchIds: new Set(['B1', 'B2'])});
        const first = computeReadySet(params);
        const second = computeReadySet(params);
        await compiled.store.close();
        expect(first).toEqual(second);
    });

    it('lists every parallel leaf individually and classifies ambiguous rather than picking a winner', async function () {
        const compiled = await compileFanOutFixture(30, dir);
        const result = computeReadySet(readySetParamsFrom(compiled, {acceptedBatchIds: new Set(['B0'])}));
        await compiled.store.close();
        expect(new Set(result.candidateBatchIds)).toEqual(new Set(Array.from({length: 29}, (_unused, index) => `B${index + 1}`)));
        expect(result.candidateBatchIds).toHaveSize(29);
        expect(result.classification).toBe('ambiguous');
        expect(result.populationReason).toBe('READY_SET_AMBIGUOUS');
    });
});
