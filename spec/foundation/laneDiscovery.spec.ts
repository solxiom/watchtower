import {
    chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {discoverHomeLanes, readLaneManifest, selectLane} from '../../src/foundation/discovery/index.js';
import {canonicalizePath} from '../../src/foundation/paths/index.js';
import type {LaneDiscoveryFileSystem} from '../../src/foundation/discovery/index.js';
import {NodeLaneDiscoveryFileSystem} from '../../src/foundation/discovery/index.js';

const UUIDS = [
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002'
];

describe('home-lane discovery', function () {
    it('walks from a control-home descendant, lane directory, and lane descendant', function () {
        const root = fixture();
        const laneDir = writeLane(root, 'lane-a', UUIDS[0], 'active');
        const homeDescendant = join(root, 'source', 'nested');
        const laneDescendant = join(laneDir, 'reports', 'nested');
        mkdirSync(homeDescendant, {recursive: true});
        mkdirSync(laneDescendant, {recursive: true});
        try {
            for (const cwd of [root, homeDescendant, laneDir, laneDescendant]) {
                const lanes = discoverHomeLanes(cwd);
                expect(lanes.length).toBe(1);
                expect(lanes[0]).toEqual(jasmine.objectContaining({
                    laneId: UUIDS[0], slug: 'lane-a', controlHome: canonicalizePath(root),
                    laneDir: canonicalizePath(laneDir), lifecycle: 'active'
                }));
            }
        } finally { remove(root); }
    });

    it('discovers valid lanes at multiple ancestors in deterministic identity order', function () {
        const root = fixture();
        const nestedHome = join(root, 'nested-home');
        const cwd = join(nestedHome, 'source');
        mkdirSync(cwd, {recursive: true});
        writeLane(root, 'lane-b', UUIDS[1], 'paused');
        writeLane(nestedHome, 'lane-a', UUIDS[0], 'active');
        try {
            expect(discoverHomeLanes(cwd).map(lane => lane.slug)).toEqual(['lane-b', 'lane-a']);
        } finally { remove(root); }
    });

    it('silently ignores non-Watchtower directories and non-directory lane entries', function () {
        const root = fixture();
        const lanesRoot = join(root, '.watchtower', 'lanes');
        mkdirSync(join(lanesRoot, 'no-marker'), {recursive: true});
        writeFileSync(join(lanesRoot, 'plain-file'), 'not a lane');
        try { expect(discoverHomeLanes(root)).toEqual([]); } finally { remove(root); }
    });

    it('rejects malformed, duplicate-member, missing-field, and unsupported markers', function () {
        const cases: Array<{content: string; code: string}> = [
            {content: '{', code: 'ERR_INVALID_LANE_CONFIG'},
            {content: validManifest('lane-a', UUIDS[0]).replace('"slug":"lane-a"', '"slug":"lane-b","slug":"lane-a"'), code: 'ERR_INVALID_LANE_CONFIG'},
            {content: JSON.stringify({...JSON.parse(validManifest('lane-a', UUIDS[0])), schemaVersion: undefined}), code: 'ERR_INVALID_LANE_CONFIG'},
            {content: JSON.stringify({...JSON.parse(validManifest('lane-a', UUIDS[0])), schemaVersion: 2}), code: 'ERR_UNSUPPORTED_VERSION'},
            {content: JSON.stringify({...JSON.parse(validManifest('lane-a', UUIDS[0])), kind: 'future-kind'}), code: 'ERR_UNSUPPORTED_VERSION'},
            {content: JSON.stringify({...JSON.parse(validManifest('lane-a', UUIDS[0])), initiativeId: undefined}), code: 'ERR_INVALID_LANE_CONFIG'}
        ];
        for (const item of cases) {
            const root = fixture();
            writeMarker(root, 'lane-a', item.content);
            try { expectCode(() => discoverHomeLanes(root), item.code); } finally { remove(root); }
        }
    });

    it('rejects a marker symlink and globally duplicate lane IDs', function () {
        const root = fixture();
        const external = fixture();
        writeFileSync(join(external, 'lane.json'), validManifest('lane-a', UUIDS[0]));
        const laneDir = join(root, '.watchtower', 'lanes', 'lane-a');
        mkdirSync(laneDir, {recursive: true});
        symlinkSync(join(external, 'lane.json'), join(laneDir, 'lane.json'));
        try { expectCode(() => discoverHomeLanes(root), 'ERR_INVALID_LANE_CONFIG'); } finally {
            remove(root); remove(external);
        }

        const parent = fixture();
        const child = join(parent, 'child');
        mkdirSync(child);
        writeLane(parent, 'lane-a', UUIDS[0]);
        writeLane(child, 'lane-b', UUIDS[0]);
        try { expectCode(() => discoverHomeLanes(child), 'ERR_INVALID_LANE_CONFIG'); } finally { remove(parent); }
    });

    it('rejects oversized, unreadable, and invalid optional marker data while preserving extensions', function () {
        const root = fixture();
        const laneDir = writeLane(root, 'lane-a', UUIDS[0]);
        const marker = join(laneDir, 'lane.json');
        const extended = {...JSON.parse(validManifest('lane-a', UUIDS[0])), futureExtension: {enabled: true}};
        writeFileSync(marker, JSON.stringify(extended));
        try {
            expect(readLaneManifest(marker).futureExtension).toEqual({enabled: true});
            writeFileSync(marker, JSON.stringify({...extended, implementationPack: {repository: 'main', path: '../escape'}}));
            expectCode(() => discoverHomeLanes(root), 'ERR_INVALID_LANE_CONFIG');
            writeFileSync(marker, 'x'.repeat(256 * 1024 + 1));
            expectCode(() => discoverHomeLanes(root), 'ERR_INVALID_LANE_CONFIG');
            writeFileSync(marker, validManifest('lane-a', UUIDS[0]));
            chmodSync(marker, 0);
            expectCode(() => discoverHomeLanes(root), 'ERR_INVALID_LANE_CONFIG');
        } finally {
            chmodSync(marker, 0o644);
            remove(root);
        }
    });

    it('rejects pack and every claim reference to an undeclared repository', function () {
        const root = fixture();
        const laneDir = writeLane(root, 'lane-a', UUIDS[0]);
        const marker = join(laneDir, 'lane.json');
        const manifest = JSON.parse(validManifest('lane-a', UUIDS[0]));
        const invalidReferences = [
            {...manifest, implementationPack: {repository: 'undeclared', path: 'docs/pack'}},
            {...manifest, claims: [{repository: 'undeclared', paths: ['src/**'], mode: 'exclusive-write'}]},
            {...manifest, claims: [
                {repository: 'main', paths: ['src/**'], mode: 'exclusive-write'},
                {repository: 'undeclared', paths: ['spec/**'], mode: 'read'}
            ]}
        ];
        try {
            for (const value of invalidReferences) {
                writeFileSync(marker, JSON.stringify(value));
                expectCode(() => discoverHomeLanes(root), 'ERR_INVALID_LANE_CONFIG');
            }
            const valid = {...manifest,
                repositories: [...manifest.repositories, {id: 'docs', role: 'documentation', access: 'read'}],
                implementationPack: {repository: 'docs', path: 'packs/current'},
                claims: [{repository: 'main', paths: ['src/**'], mode: 'exclusive-write'}],
                futureExtension: {enabled: true}};
            writeFileSync(marker, JSON.stringify(valid));
            expect(readLaneManifest(marker)).toEqual(jasmine.objectContaining({
                implementationPack: valid.implementationPack, claims: valid.claims,
                futureExtension: valid.futureExtension
            }));
        } finally { remove(root); }
    });

    it('projects every invalid or missing lane-state as unknown before selection', function () {
        const cases: Array<{name: string; content?: string; expected: string}> = [
            {name: 'missing', expected: 'unknown'},
            {name: 'malformed active', content: 'lane_status=active\nbroken\n', expected: 'unknown'},
            {name: 'duplicate active', content: 'lane_status=active\nlane_status=paused\n', expected: 'unknown'},
            {name: 'contradictory paused', content: 'lane_status=paused\nwatcher_status=running\n', expected: 'unknown'},
            {name: 'valid bootstrap', content: 'lane_status=bootstrap\n', expected: 'bootstrap'},
            {name: 'valid active', content: 'lane_status=active\n', expected: 'active'},
            {name: 'valid paused', content: 'lane_status=paused\n', expected: 'paused'},
            {name: 'valid complete', content: 'lane_status=complete\n', expected: 'complete'}
        ];
        for (const item of cases) {
            const root = fixture();
            const laneDir = writeLane(root, 'lane-a', UUIDS[0]);
            if (item.content !== undefined) {
                mkdirSync(join(laneDir, 'state'));
                writeFileSync(join(laneDir, 'state', 'coordinator-lane-state.txt'), item.content);
            }
            try {
                expect(discoverHomeLanes(root)[0].lifecycle).withContext(item.name).toBe(item.expected);
            } finally { remove(root); }
        }

        const root = fixture();
        writeLane(root, 'invalid-active', UUIDS[0], 'active\nbroken');
        writeLane(root, 'valid-paused', UUIDS[1], 'paused');
        try {
            const lanes = discoverHomeLanes(root);
            expect(lanes.map(lane => lane.lifecycle)).toEqual(['unknown', 'paused']);
            expectCode(() => selectLane(lanes, {cwd: root}), 'ERR_AMBIGUOUS_SELECTION');
        } finally { remove(root); }
    });

    it('routes ordinary filesystem access through an injected discovery adapter', function () {
        const root = fixture();
        writeLane(root, 'lane-a', UUIDS[0], 'active');
        const delegate = new NodeLaneDiscoveryFileSystem();
        const calls: string[] = [];
        const fileSystem: LaneDiscoveryFileSystem = {
            inspect(path) { calls.push(`inspect:${path}`); return delegate.inspect(path); },
            list(path) { calls.push(`list:${path}`); return delegate.list(path); },
            readText(path) { calls.push(`read:${path}`); return delegate.readText(path); }
        };
        try {
            expect(discoverHomeLanes(root, fileSystem)[0].lifecycle).toBe('active');
            expect(calls.some(call => call.startsWith('list:'))).toBeTrue();
            expect(calls.filter(call => call.startsWith('read:')).length).toBe(2);
        } finally { remove(root); }
    });

    it('canonicalizes a symlinked cwd, preserves exact case, and ignores an escaping lanes symlink', function () {
        const root = fixture();
        const aliasRoot = fixture();
        const alias = join(aliasRoot, 'workspace');
        writeLane(root, 'CaseLane', UUIDS[0]);
        symlinkSync(root, alias);
        try {
            expectCode(() => discoverHomeLanes(root), 'ERR_INVALID_LANE_CONFIG');
            rmSync(join(root, '.watchtower'), {recursive: true, force: true});
            writeLane(root, 'case-lane', UUIDS[0]);
            expect(discoverHomeLanes(alias)[0].controlHome).toBe(canonicalizePath(root));
            expectCode(() => discoverHomeLanes(join(root, 'CASE-LANE')), 'ERR_PATH_ESCAPE');
        } finally { remove(root); remove(aliasRoot); }

        const home = fixture();
        const outside = fixture();
        mkdirSync(join(home, '.watchtower'));
        symlinkSync(outside, join(home, '.watchtower', 'lanes'));
        try { expect(discoverHomeLanes(home)).toEqual([]); } finally { remove(home); remove(outside); }
    });

    it('does not alter any workspace byte while discovering', function () {
        const root = fixture();
        writeLane(root, 'lane-a', UUIDS[0], 'active');
        const before = snapshot(root);
        try {
            discoverHomeLanes(root);
            expect(snapshot(root)).toEqual(before);
        } finally { remove(root); }
    });
});

function writeLane(root: string, slug: string, laneId: string, status?: string): string {
    const laneDir = writeMarker(root, slug, validManifest(slug, laneId));
    if (status !== undefined) {
        mkdirSync(join(laneDir, 'state'));
        writeFileSync(join(laneDir, 'state', 'coordinator-lane-state.txt'), `lane_status=${status}\n`);
    }
    return laneDir;
}

function writeMarker(root: string, slug: string, content: string): string {
    const laneDir = join(root, '.watchtower', 'lanes', slug);
    mkdirSync(laneDir, {recursive: true});
    writeFileSync(join(laneDir, 'lane.json'), content);
    return laneDir;
}

function validManifest(slug: string, laneId: string): string {
    return JSON.stringify({schemaVersion: 1, laneId, kind: 'implementation', slug,
        initiativeId: `${slug}-initiative`, controlHomeRepository: 'main',
        laneDir: `.watchtower/lanes/${slug}`, repositories: [{id: 'main', role: 'primary', access: 'write'}]});
}

function snapshot(root: string): string[] {
    const result: string[] = [];
    const visit = (path: string): void => {
        for (const name of readdirSync(path).sort()) {
            const child = join(path, name);
            const stat = lstatSync(child);
            result.push(`${child.slice(root.length)}:${stat.mode}:${stat.size}:${stat.isFile() ? readFileSync(child, 'hex') : ''}`);
            if (stat.isDirectory()) visit(child);
        }
    };
    visit(root);
    return result;
}

function fixture(): string { return mkdtempSync(join(tmpdir(), 'watchtower-rm06-')); }
function remove(path: string): void { rmSync(path, {recursive: true, force: true}); }
function expectCode(action: () => unknown, code: string): void {
    try { action(); fail(`Expected ${code}.`); } catch (error) {
        expect((error as {code?: string}).code).toBe(code);
    }
}
