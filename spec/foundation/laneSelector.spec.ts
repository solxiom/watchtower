import {mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {LaneManifestV1, ReadModelLaneLifecycle} from '../../src/contracts/index.js';
import type {DiscoveredLane} from '../../src/foundation/discovery/index.js';
import {resolveLane, selectLane} from '../../src/foundation/discovery/index.js';
import {canonicalizePath} from '../../src/foundation/paths/index.js';

const IDS = [
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000003'
];

describe('deterministic lane selection', function () {
    it('resolves a discovered lane from its directory through the combined public entrypoint', function () {
        const root = fixture();
        const laneDir = join(root, '.watchtower', 'lanes', 'lane-a');
        mkdirSync(laneDir, {recursive: true});
        writeFileSync(join(laneDir, 'lane.json'), JSON.stringify({schemaVersion: 1, laneId: IDS[0],
            kind: 'implementation', slug: 'lane-a', initiativeId: 'initiative.a', controlHomeRepository: 'main',
            laneDir: '.watchtower/lanes/lane-a', repositories: [{id: 'main', role: 'primary', access: 'write'}]}));
        try {
            expect(resolveLane({cwd: laneDir})).toEqual(jasmine.objectContaining({laneId: IDS[0], slug: 'lane-a'}));
        } finally { remove(root); }
    });

    it('applies exact lane ID before a matching relevant slug', function () {
        const cwd = fixture();
        const slugCollision = lane(IDS[0], IDS[1], '/a', 'paused');
        const idMatch = lane(IDS[1], 'id-winner', '/b', 'paused');
        try { expect(selectLane([slugCollision, idMatch], {cwd, lane: IDS[1]})).toBe(idMatch); }
        finally { remove(cwd); }
    });

    it('selects a unique slug after ID lookup and rejects explicit misses', function () {
        const cwd = fixture();
        const first = lane(IDS[0], 'first', '/a', 'paused');
        const second = lane(IDS[1], 'second', '/b', 'active');
        try {
            expect(selectLane([first, second], {cwd, lane: 'second'})).toBe(second);
            expectCode(() => selectLane([first, second], {cwd, lane: IDS[2]}), 'ERR_LANE_NOT_FOUND');
            expectCode(() => selectLane([first, second], {cwd, lane: 'missing'}), 'ERR_LANE_NOT_FOUND');
        } finally { remove(cwd); }
    });

    it('rejects duplicate explicit ID or slug matches instead of silently selecting', function () {
        const cwd = fixture();
        try {
            expectCode(() => selectLane([lane(IDS[0], 'first', '/a'), lane(IDS[0], 'second', '/b')],
                {cwd, lane: IDS[0]}), 'ERR_AMBIGUOUS_SELECTION');
            expectCode(() => selectLane([lane(IDS[0], 'same', '/a'), lane(IDS[1], 'same', '/b')],
                {cwd, lane: 'same'}), 'ERR_AMBIGUOUS_SELECTION');
        } finally { remove(cwd); }
    });

    it('deduces the lane directory containing cwd before active-lane selection', function () {
        const root = fixture();
        const insideDir = join(root, 'lane-a');
        const descendant = join(insideDir, 'reports', 'nested');
        mkdirSync(descendant, {recursive: true});
        const inside = lane(IDS[0], 'inside', insideDir, 'paused');
        const active = lane(IDS[1], 'active', join(root, 'lane-b'), 'active');
        try {
            expect(selectLane([active, inside], {cwd: insideDir})).toBe(inside);
            expect(selectLane([active, inside], {cwd: descendant})).toBe(inside);
        } finally { remove(root); }
    });

    it('fails closed when more than one candidate claims to contain cwd', function () {
        const root = fixture();
        const cwd = join(root, 'lane', 'nested');
        mkdirSync(cwd, {recursive: true});
        try {
            expectCode(() => selectLane([
                lane(IDS[0], 'first', root), lane(IDS[1], 'second', join(root, 'lane'))
            ], {cwd}), 'ERR_AMBIGUOUS_SELECTION');
        } finally { remove(root); }
    });

    it('uses canonical cwd identity for symlinked lane descendants', function () {
        const root = fixture();
        const aliases = fixture();
        const laneDir = join(root, 'lane-a');
        const descendant = join(laneDir, 'reports');
        mkdirSync(descendant, {recursive: true});
        const alias = join(aliases, 'lane-link');
        symlinkSync(laneDir, alias);
        const selected = lane(IDS[0], 'lane-a', canonicalizePath(laneDir), 'paused');
        try { expect(selectLane([selected, lane(IDS[1], 'other', '/b', 'active')], {cwd: alias})).toBe(selected); }
        finally { remove(root); remove(aliases); }
    });

    it('selects the sole active relevant lane, then the sole relevant lane', function () {
        const cwd = fixture();
        const active = lane(IDS[0], 'active', '/a', 'active');
        const paused = lane(IDS[1], 'paused', '/b', 'paused');
        const unknown = lane(IDS[2], 'unknown', '/c', 'unknown');
        try {
            expect(selectLane([paused, active, unknown], {cwd})).toBe(active);
            expect(selectLane([paused], {cwd})).toBe(paused);
        } finally { remove(cwd); }
    });

    it('filters relevant lanes by initiative before applying lane precedence', function () {
        const cwd = fixture();
        const first = lane(IDS[0], 'first', '/a', 'active');
        const second = lane(IDS[1], 'second', '/b', 'paused');
        try {
            expect(selectLane([first, second], {cwd, initiative: 'second-initiative'})).toBe(second);
            expectCode(() => selectLane([first], {cwd, initiative: 'missing'}), 'ERR_LANE_NOT_FOUND');
            expectCode(() => selectLane([first], {cwd, initiative: ''}), 'ERR_INVALID_ARGUMENT');
        } finally { remove(cwd); }
    });

    it('reports every candidate identity field on ambiguity and never prompts', function () {
        const cwd = fixture();
        const candidates = [lane(IDS[0], 'first', '/a', 'paused'), lane(IDS[1], 'second', '/b', 'paused')];
        try {
            const error = captureError(() => selectLane(candidates, {cwd}));
            expect(error.code).toBe('ERR_AMBIGUOUS_SELECTION');
            for (const value of [IDS[0], 'first', 'first-initiative', 'implementation', '/a',
                IDS[1], 'second', 'second-initiative', '/b']) {
                expect(error.message).toContain(value);
            }
        } finally { remove(cwd); }
    });

    it('rejects malformed selectors before inspecting candidates', function () {
        const cwd = fixture();
        try {
            for (const selector of ['', 'bad\u0000selector', 'bad\nselector', 'token=do-not-echo',
                'x'.repeat(201), 'x'.repeat(5000)]) {
                expectCode(() => selectLane([], {cwd, lane: selector}), 'ERR_INVALID_ARGUMENT');
            }
            const boundary = captureError(() => selectLane([], {cwd, lane: 'x'.repeat(200)}));
            expect(boundary.code).toBe('ERR_LANE_NOT_FOUND');
            expect(boundary.details?.target.length).toBe(200);
        } finally { remove(cwd); }
    });

    it('keeps long real-path ambiguity diagnostics bounded and registered', function () {
        const cwd = fixture();
        const longRoot = `/${'control-home-segment/'.repeat(12)}`;
        const candidates = IDS.map((id, index) => lane(id, `lane-${index}`, `${longRoot}${index}`, 'paused'));
        try {
            const error = captureError(() => selectLane(candidates, {cwd}));
            expect(error.code).toBe('ERR_AMBIGUOUS_SELECTION');
            expect(error.details?.target.length).toBe(200);
            expect(error.details?.target).toContain(IDS[0]);
            expect(error.details?.target).toContain('lane-0-initiative');
            expect(error.details?.target).toContain('implementation');
            expect(error.details?.target).toContain('/control-home-segment/');
            expect(error.details?.target.endsWith('...[truncated]')).toBeTrue();
        } finally { remove(cwd); }
    });
});

function lane(laneId: string, slug: string, laneDir: string,
    lifecycle: ReadModelLaneLifecycle = 'paused'): DiscoveredLane {
    const manifest: LaneManifestV1 = {schemaVersion: 1, laneId, kind: 'implementation', slug,
        initiativeId: `${slug}-initiative`, controlHomeRepository: 'main', laneDir: `.watchtower/lanes/${slug}`,
        repositories: [{id: 'main', role: 'primary', access: 'write'}]};
    return {laneId, slug, initiativeId: manifest.initiativeId, kind: 'implementation',
        controlHome: laneDir === '/a' || laneDir === '/b' || laneDir === '/c' ? laneDir : join(laneDir, '..'),
        laneDir, manifest, lifecycle};
}

function fixture(): string { return mkdtempSync(join(tmpdir(), 'watchtower-rm06-select-')); }
function remove(path: string): void { rmSync(path, {recursive: true, force: true}); }
function expectCode(action: () => unknown, code: string): void { expect(captureError(action).code).toBe(code); }
function captureError(action: () => unknown): {code?: string; message: string; details?: {target: string}} {
    try { action(); fail('Expected an error.'); } catch (error) {
        return error as {code?: string; message: string};
    }
    throw new Error('unreachable');
}
