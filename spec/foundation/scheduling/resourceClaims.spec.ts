import {
    checkWorktreeConflict, checkWritableOverlap, evaluateClaimConflict, registerBatchClaims, ResourceClaimStore
} from '../../../src/foundation/scheduling/index.js';
import type {BatchRepositoryClaim} from '../../../src/contracts/indexQuery.js';
import type {ActiveResourceClaim, OwnedRepositoryBinding} from '../../../src/contracts/scheduling.js';
import type {RepositoryBinding} from '../../../src/contracts/types.js';

function repoClaim(batchId: string, overrides: Partial<BatchRepositoryClaim> = {}): BatchRepositoryClaim {
    return {batchId, repositoryId: 'main', access: 'write', claimMode: 'exclusive-write', paths: ['src/**'], ...overrides};
}

function claim(ownerBatchId: string, overrides: Partial<ActiveResourceClaim> = {}): ActiveResourceClaim {
    return {repositoryId: 'main', paths: ['src/**'], mode: 'exclusive-write', ownerBatchId, ownerLaneId: 'lane-a', ...overrides};
}

function binding(overrides: Partial<RepositoryBinding> = {}): RepositoryBinding {
    return {id: 'main', role: 'primary', access: 'write', path: '/work/main', branch: 'feature/x', worktreeMode: 'dedicated', ...overrides};
}

function ownedBinding(ownerBatchId: string, overrides: Partial<OwnedRepositoryBinding> = {}): OwnedRepositoryBinding {
    return {...binding(), ownerBatchId, ownerLaneId: 'lane-a', ...overrides};
}

describe('registerBatchClaims', function () {
    it('derives one active claim per matching batch_repository row, ignoring other batches', function () {
        const rows = [repoClaim('CA-04'), repoClaim('CA-05'), repoClaim('CA-04', {repositoryId: 'other', claimMode: 'read', paths: ['docs/**']})];
        const claims = registerBatchClaims('CA-04', 'lane-a', rows);
        expect(claims).toEqual([
            {repositoryId: 'main', paths: ['src/**'], mode: 'exclusive-write', ownerBatchId: 'CA-04', ownerLaneId: 'lane-a'},
            {repositoryId: 'other', paths: ['docs/**'], mode: 'read', ownerBatchId: 'CA-04', ownerLaneId: 'lane-a'}
        ]);
    });

    it('rejects an unsupported claim mode rather than silently coercing it', function () {
        expect(() => registerBatchClaims('CA-04', 'lane-a', [repoClaim('CA-04', {claimMode: 'append-only'})])).toThrowError(TypeError);
    });
});

describe('evaluateClaimConflict', function () {
    it('blocks two batches claiming overlapping exclusive-write paths with CLAIM_CONFLICT_EXCLUSIVE', function () {
        const report = evaluateClaimConflict([claim('CA-05', {mode: 'exclusive-write'})], [claim('CA-04', {mode: 'exclusive-write'})]);
        expect(report.proceed).toBeFalse();
        expect(report.blockers).toEqual([jasmine.objectContaining({kind: 'path', reason: 'CLAIM_CONFLICT_EXCLUSIVE', sourceBatch: 'CA-04'})]);
    });

    it('blocks a shared-write claim overlapping an active exclusive-write claim with CLAIM_CONFLICT_SHARED_WRITE (no explicit mutual permit)', function () {
        const report = evaluateClaimConflict([claim('CA-05', {mode: 'shared-write'})], [claim('CA-04', {mode: 'exclusive-write'})]);
        expect(report.proceed).toBeFalse();
        expect(report.blockers).toEqual([jasmine.objectContaining({kind: 'path', reason: 'CLAIM_CONFLICT_SHARED_WRITE'})]);
    });

    it('allows two batches that both explicitly claim shared-write on the overlapping path', function () {
        const report = evaluateClaimConflict([claim('CA-05', {mode: 'shared-write'})], [claim('CA-04', {mode: 'shared-write'})]);
        expect(report).toEqual({proceed: true, blockers: []});
    });

    it('never blocks on a read claim', function () {
        const report = evaluateClaimConflict([claim('CA-05', {mode: 'read'})], [claim('CA-04', {mode: 'exclusive-write'})]);
        expect(report).toEqual({proceed: true, blockers: []});
    });

    it('ignores non-overlapping paths and distinct repositories', function () {
        const distinctPath = evaluateClaimConflict([claim('CA-05', {paths: ['docs/**']})], [claim('CA-04', {paths: ['src/**']})]);
        const distinctRepo = evaluateClaimConflict([claim('CA-05', {repositoryId: 'other'})], [claim('CA-04', {repositoryId: 'main'})]);
        expect(distinctPath.proceed).toBeTrue();
        expect(distinctRepo.proceed).toBeTrue();
    });

    it('never treats a batch\'s own prior claim as a conflict with itself', function () {
        const report = evaluateClaimConflict([claim('CA-04')], [claim('CA-04')]);
        expect(report).toEqual({proceed: true, blockers: []});
    });
});

describe('checkWorktreeConflict / checkWritableOverlap', function () {
    it('detects a dedicated writable worktree already claimed by another active batch', function () {
        const conflict = checkWorktreeConflict(binding(), [ownedBinding('CA-04')]);
        expect(conflict).toEqual(jasmine.objectContaining({kind: 'worktree', sourceBatch: 'CA-04'}));
    });

    it('detects a declared branch mismatch on the same writable worktree', function () {
        const conflict = checkWorktreeConflict(binding({branch: 'main'}), [ownedBinding('CA-04', {branch: 'release'})]);
        expect(conflict).toEqual(jasmine.objectContaining({kind: 'branch', sourceBatch: 'CA-04'}));
    });

    it('permits a shared worktree mode overlap with no branch mismatch', function () {
        const conflict = checkWorktreeConflict(
            binding({worktreeMode: 'shared'}), [ownedBinding('CA-04', {worktreeMode: 'shared'})]
        );
        expect(conflict).toBeNull();
    });

    it('ignores read-only candidates, distinct paths, and distinct repositories', function () {
        expect(checkWorktreeConflict(binding({access: 'read'}), [ownedBinding('CA-04')])).toBeNull();
        expect(checkWorktreeConflict(binding({path: '/work/other'}), [ownedBinding('CA-04')])).toBeNull();
        expect(checkWorktreeConflict(binding({id: 'other'}), [ownedBinding('CA-04')])).toBeNull();
    });

    it('checkWritableOverlap aggregates conflicts across every candidate binding', function () {
        const report = checkWritableOverlap(
            [binding(), binding({id: 'second', path: '/work/second'})],
            [ownedBinding('CA-04'), ownedBinding('CA-05', {id: 'second', path: '/work/second', branch: 'release'})]
        );
        expect(report.proceed).toBeFalse();
        expect(report.conflicts.map((conflict) => conflict.kind)).toEqual(['worktree', 'branch']);
    });
});

describe('ResourceClaimStore', function () {
    it('evaluates claims and worktrees against one immutable active-state snapshot', function () {
        const store = new ResourceClaimStore([claim('CA-04')], [ownedBinding('CA-04')]);
        expect(store.evaluateClaims([claim('CA-05')]).proceed).toBeFalse();
        expect(store.evaluateWorktrees([binding()]).proceed).toBeFalse();
        expect(store.evaluateClaims([claim('CA-04')]).proceed).toBeTrue();
    });
});
