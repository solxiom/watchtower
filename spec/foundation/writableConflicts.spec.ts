import {inspectWritableConflicts} from '../../src/foundation/index.js';
import type {ActiveLaneClaims} from '../../src/foundation/index.js';

describe('writable conflict inspection', function () {
    it('reports shared writable worktrees unless both lanes explicitly claim shared-write', function () {
        const left = lane('lane-a');
        const right = lane('lane-b');
        expect(inspectWritableConflicts([left, right])).toEqual([jasmine.objectContaining({
            kind: 'shared-write', lanes: ['lane-a', 'lane-b'], repository: 'main'
        })]);
        expect(inspectWritableConflicts([withClaim(left, 'shared-write'), withClaim(right, 'shared-write')])).toEqual([]);
    });

    it('reports every overlapping exclusive-write path claim', function () {
        const left = withClaim(lane('lane-a'), 'exclusive-write', ['src/**']);
        const right = withClaim(lane('lane-b', '/work/other'), 'exclusive-write', ['src/foundation/**']);
        expect(inspectWritableConflicts([left, right])).toEqual([jasmine.objectContaining({
            kind: 'path-conflict', lanes: ['lane-a', 'lane-b'], repository: 'main', paths: ['src/**', 'src/foundation/**']
        })]);
    });

    it('treats root-wide, exact, ancestor, and wildcard exclusive claims conservatively', function () {
        const cases: Array<[string, string]> = [
            ['**', 'src/**'], ['src', 'src/foundation/file.ts'], ['src/*.ts', 'src/file.ts'], ['src/?.ts', 'src/a.ts'],
            ['src/[ab].ts', 'src/a.ts']
        ];
        for (const [leftPath, rightPath] of cases) {
            const left = withClaim(lane('lane-a', '/left'), 'exclusive-write', [leftPath]);
            const right = withClaim(lane('lane-b', '/right'), 'exclusive-write', [rightPath]);
            expect(inspectWritableConflicts([left, right])).toEqual([jasmine.objectContaining({
                kind: 'path-conflict', paths: [leftPath, rightPath]
            })]);
        }
    });

    it('does not report provably disjoint wildcard segment languages', function () {
        const cases: Array<[string, string]> = [['src/*.ts', 'src/*.md'], ['src/foo*', 'src/bar*']];
        for (const [leftPath, rightPath] of cases) {
            const left = withClaim(lane('lane-a', '/left'), 'exclusive-write', [leftPath]);
            const right = withClaim(lane('lane-b', '/right'), 'exclusive-write', [rightPath]);
            expect(inspectWritableConflicts([left, right])).toEqual([]);
        }
    });

    it('matches Node-compatible negated classes and excludes their declared characters', function () {
        const overlaps: Array<[string, string]> = [
            ['src/[!a].ts', 'src/b.ts'], ['src/[^a].ts', 'src/b.ts'], ['src/[!a].ts', 'src/[b-d].ts'],
            ['src/[^a].ts', 'src/[b-d].ts']
        ];
        const disjoint: Array<[string, string]> = [['src/[!a].ts', 'src/a.ts'], ['src/[^a].ts', 'src/a.ts'],
            ['src/[!a].ts', 'src/[a].ts'], ['src/[^a-c].ts', 'src/[a-c].ts']];
        expectConflictPairs(overlaps, true);
        expectConflictPairs(disjoint, false);
    });

    it('requires both shared-write overrides and keeps repository identities separate', function () {
        const left = withClaim(lane('lane-a'), 'shared-write');
        const right = lane('lane-b');
        const otherRepository = {...withClaim(lane('lane-c', '/work/other'), 'exclusive-write'), repositories: [{
            ...lane('lane-c', '/work/other').repositories[0], id: 'other'
        }], claims: [{repository: 'other', mode: 'exclusive-write' as const, paths: ['src/**']}]};
        expect(inspectWritableConflicts([left, right]).map(conflict => conflict.kind)).toEqual(['shared-write']);
        expect(inspectWritableConflicts([withClaim(right, 'shared-write'), otherRepository])).toEqual([]);
    });

    it('reports different declared branches on one writable worktree', function () {
        const left = lane('lane-a');
        const right = {...lane('lane-b'), repositories: [{...lane('lane-b').repositories[0], branch: 'release'}]};
        expect(inspectWritableConflicts([left, right]).map(conflict => conflict.kind)).toEqual(['branch-conflict', 'shared-write']);
    });

    it('ignores inactive lanes, read-only bindings, distinct worktrees, and non-overlapping paths', function () {
        const inactive = {...lane('lane-a'), lifecycle: 'paused' as const};
        const readOnly = {...lane('lane-b'), repositories: [{...lane('lane-b').repositories[0], access: 'read' as const}]};
        const distinct = lane('lane-c', '/work/other');
        const left = withClaim(lane('lane-d', '/one'), 'exclusive-write', ['src/**']);
        const right = withClaim(lane('lane-e', '/two'), 'exclusive-write', ['docs/**']);
        expect(inspectWritableConflicts([inactive, readOnly, distinct, left, right])).toEqual([]);
    });
});

function lane(laneId: string, path: string = '/work/main'): ActiveLaneClaims {
    return {laneId, lifecycle: 'active', repositories: [{id: 'main', role: 'primary', access: 'write', path,
        branch: 'feature/main', worktreeMode: 'dedicated'}], claims: []};
}

function withClaim(lane: ActiveLaneClaims, mode: 'shared-write' | 'exclusive-write', paths: string[] = ['src/**']): ActiveLaneClaims {
    return {...lane, claims: [{repository: 'main', mode, paths}]};
}

function expectConflictPairs(cases: readonly (readonly [string, string])[], expected: boolean): void {
    for (const [leftPath, rightPath] of cases) {
        const left = withClaim(lane('lane-a', '/left'), 'exclusive-write', [leftPath]);
        const right = withClaim(lane('lane-b', '/right'), 'exclusive-write', [rightPath]);
        expect(inspectWritableConflicts([left, right]).length > 0).toBe(expected);
    }
}
