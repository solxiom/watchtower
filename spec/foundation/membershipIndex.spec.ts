import {chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {discoverSecondaryLanes, readMembershipIndex} from '../../src/foundation/discovery/index.js';

const LANE_ID = '10000000-0000-4000-8000-000000000001';

describe('repository membership index', function () {
    it('returns only an authoritative lane with a matching canonical local binding', function () {
        const fixture = makeFixture();
        try {
            const paths = createLane(fixture);
            writeIndex(paths.dataHome, {[paths.secondary]: {laneId: LANE_ID, laneHome: paths.home}});
            const result = readMembershipIndex(paths.dataHome);
            expect(result.warnings).toEqual([]);
            expect(result.memberships).toEqual([jasmine.objectContaining({
                worktreePath: paths.secondary, laneId: LANE_ID, laneHome: paths.home,
                lane: jasmine.objectContaining({slug: 'lane-a', controlHome: paths.home})
            })]);
            expect(discoverSecondaryLanes(paths.secondary, paths.dataHome).memberships.length).toBe(1);
        } finally { remove(fixture); }
    });

    it('reports each stale class, ignores it, and never repairs the index bytes', function () {
        const fixture = makeFixture();
        try {
            const paths = createLane(fixture);
            const missing = join(fixture, 'missing');
            const noMarker = join(fixture, 'no-marker');
            mkdirSync(noMarker);
            const wrong = join(fixture, 'wrong');
            mkdirSync(wrong);
            writeIndex(paths.dataHome, {
                [paths.secondary]: {laneId: LANE_ID, laneHome: paths.home},
                [missing]: {laneId: LANE_ID, laneHome: paths.home},
                [noMarker]: {laneId: LANE_ID, laneHome: noMarker},
                [wrong]: {laneId: LANE_ID, laneHome: paths.home}
            });
            const indexPath = join(paths.dataHome, 'index', 'repository-memberships.json');
            const before = {bytes: readFileSync(indexPath, 'hex'), mtime: statSync(indexPath).mtimeMs};
            const result = readMembershipIndex(paths.dataHome);
            expect(result.memberships.length).toBe(1);
            expect(result.warnings.map(warning => warning.reason)).toEqual([
                'PATH_MISSING', 'LANE_JSON_MISSING', 'BINDING_MISMATCH'
            ]);
            expect({bytes: readFileSync(indexPath, 'hex'), mtime: statSync(indexPath).mtimeMs}).toEqual(before);
        } finally { remove(fixture); }
    });

    it('treats a missing index as empty and rejects malformed index contracts', function () {
            const fixture = makeFixture();
        try {
            const dataHome = join(fixture, 'data-home');
            const workspace = join(fixture, 'workspace');
            mkdirSync(dataHome);
            mkdirSync(workspace);
            const missingBefore = snapshot(fixture);
            expect(readMembershipIndex(dataHome)).toEqual({memberships: [], warnings: []});
            expect(discoverSecondaryLanes(workspace, dataHome)).toEqual({memberships: [], warnings: []});
            expect(snapshot(fixture)).toEqual(missingBefore);
            const indexPath = join(dataHome, 'index', 'repository-memberships.json');
            mkdirSync(join(dataHome, 'index'));
            for (const content of ['{', '[]', '{"bad":{}}', '{"x":{"laneId":"x","laneId":"x","laneHome":"/x"}}']) {
                writeFileSync(indexPath, content);
                expectCode(() => readMembershipIndex(dataHome), 'ERR_INDEX_UNAVAILABLE');
            }
        } finally { remove(fixture); }
    });

    it('filters warnings and memberships to the requested secondary worktree', function () {
        const fixture = makeFixture();
        try {
            const paths = createLane(fixture);
            const unrelated = join(fixture, 'unrelated');
            mkdirSync(unrelated);
            writeIndex(paths.dataHome, {
                [paths.secondary]: {laneId: LANE_ID, laneHome: paths.home},
                [unrelated]: {laneId: LANE_ID, laneHome: paths.home}
            });
            const result = discoverSecondaryLanes(paths.secondary, paths.dataHome);
            expect(result.memberships.length).toBe(1);
            expect(result.warnings).toEqual([]);
        } finally { remove(fixture); }
    });

    it('fails closed for malformed, unsupported, duplicate, and unreadable authority files', function () {
        const fixture = makeFixture();
        try {
            const paths = createLane(fixture);
            writeIndex(paths.dataHome, {[paths.secondary]: {laneId: LANE_ID, laneHome: paths.home}});
            const lanePath = join(paths.home, '.watchtower', 'lanes', 'lane-a', 'lane.json');
            const bindingPath = join(paths.home, '.watchtower', 'lanes', 'lane-a', 'repositories.local.json');
            for (const [path, content, code] of [
                [lanePath, '{', 'ERR_INVALID_LANE_CONFIG'],
                [lanePath, JSON.stringify({...lane(paths), schemaVersion: 2}), 'ERR_UNSUPPORTED_VERSION'],
                [bindingPath, '{"schemaVersion":1,"repositories":[{"path":"x"}]}', 'ERR_INVALID_LANE_CONFIG'],
                [bindingPath, '{"schemaVersion":1,"repositories":[],"extra":true}', 'ERR_INVALID_LANE_CONFIG'],
                [bindingPath, '{"schemaVersion":1,"repositories":[],"repositories":[]}', 'ERR_INVALID_LANE_CONFIG']
            ] as const) {
                writeFileSync(path, content);
                expectCode(() => readMembershipIndex(paths.dataHome), code);
                writeFileSync(lanePath, JSON.stringify(lane(paths)));
                writeFileSync(bindingPath, JSON.stringify(bindings(paths)));
            }
            chmodSync(bindingPath, 0o000);
            try { expectCode(() => readMembershipIndex(paths.dataHome), 'ERR_INVALID_LANE_CONFIG'); }
            finally { chmodSync(bindingPath, 0o644); }
            chmodSync(lanePath, 0o000);
            try { expectCode(() => readMembershipIndex(paths.dataHome), 'ERR_INVALID_LANE_CONFIG'); }
            finally { chmodSync(lanePath, 0o644); }
            writeFileSync(bindingPath, '{');
            expectCode(() => readMembershipIndex(paths.dataHome), 'ERR_INVALID_LANE_CONFIG');
            writeFileSync(bindingPath, JSON.stringify(bindings(paths)));
            rmSync(bindingPath);
            expectCode(() => readMembershipIndex(paths.dataHome), 'ERR_INVALID_LANE_CONFIG');
        } finally { remove(fixture); }
    });

    it('uses RM-03 canonical-path policy for aliases, long paths, and noncanonical or traversal input', function () {
        const fixture = makeFixture();
        try {
            const paths = createLane(fixture);
            const alias = join(fixture, 'secondary-alias');
            symlinkSync(paths.secondary, alias);
            const longSecondary = join(fixture, ...Array.from({length: 12}, () => 'long-path-segment-123'));
            mkdirSync(longSecondary, {recursive: true});
            writeFileSync(join(paths.home, '.watchtower', 'lanes', 'lane-a', 'lane.json'), JSON.stringify(lane(paths, true)));
            writeBinding(paths, [...bindings(paths).repositories, binding('long', longSecondary, 'long-role')]);
            writeIndex(paths.dataHome, {
                [paths.secondary]: {laneId: LANE_ID, laneHome: paths.home},
                [longSecondary]: {laneId: LANE_ID, laneHome: paths.home},
                [alias]: {laneId: LANE_ID, laneHome: paths.home}
            });
            expect(longSecondary.length).toBeGreaterThan(200);
            expect(discoverSecondaryLanes(alias, paths.dataHome).memberships.length).toBe(1);
            const result = readMembershipIndex(paths.dataHome);
            expect(result.memberships.map(item => item.worktreePath)).toEqual([longSecondary, paths.secondary]);
            expect(result.warnings).toEqual([jasmine.objectContaining({worktreePath: alias, reason: 'PATH_MISSING'})]);
            writeIndex(paths.dataHome, {'/tmp/../escaped': {laneId: LANE_ID, laneHome: paths.home}});
            expectCode(() => readMembershipIndex(paths.dataHome), 'ERR_INDEX_UNAVAILABLE');
        } finally { remove(fixture); }
    });

    it('reports an alias-only stale registration through scoped secondary discovery without repair', function () {
        const fixture = makeFixture();
        try {
            const paths = createLane(fixture);
            const alias = join(fixture, 'secondary-alias');
            symlinkSync(paths.secondary, alias);
            writeIndex(paths.dataHome, {[alias]: {laneId: LANE_ID, laneHome: paths.home}});
            const before = snapshot(fixture);
            expect(discoverSecondaryLanes(alias, paths.dataHome)).toEqual({memberships: [], warnings: [
                jasmine.objectContaining({worktreePath: alias, reason: 'PATH_MISSING'})
            ]});
            expect(snapshot(fixture)).toEqual(before);
        } finally { remove(fixture); }
    });

    it('does not mutate authoritative bytes for each public operation and outcome', function () {
        const fixture = makeFixture();
        try {
            const paths = createLane(fixture);
            const notIndexed = join(fixture, 'not-indexed');
            mkdirSync(notIndexed);
            writeIndex(paths.dataHome, {[paths.secondary]: {laneId: LANE_ID, laneHome: paths.home}});
            for (const operation of [
                () => readMembershipIndex(paths.dataHome),
                () => discoverSecondaryLanes(paths.secondary, paths.dataHome),
                () => discoverSecondaryLanes(notIndexed, paths.dataHome)
            ]) {
                const before = snapshot(fixture);
                operation();
                expect(snapshot(fixture)).toEqual(before);
            }
            writeIndex(paths.dataHome, {[join(fixture, 'missing')]: {laneId: LANE_ID, laneHome: paths.home}});
            const warningBefore = snapshot(fixture);
            expect(readMembershipIndex(paths.dataHome).warnings[0].reason).toBe('PATH_MISSING');
            expect(snapshot(fixture)).toEqual(warningBefore);
            writeIndex(paths.dataHome, {[paths.secondary]: {laneId: LANE_ID, laneHome: paths.home}});
            writeBinding(paths, [{path: paths.secondary}]);
            for (const operation of [
                () => readMembershipIndex(paths.dataHome),
                () => discoverSecondaryLanes(paths.secondary, paths.dataHome)
            ]) {
                const failureBefore = snapshot(fixture);
                expectCode(operation, 'ERR_INVALID_LANE_CONFIG');
                expect(snapshot(fixture)).toEqual(failureBefore);
            }
            const missingDataHome = join(fixture, 'missing-data-home');
            const before = snapshot(fixture);
            expectCode(() => readMembershipIndex(missingDataHome), 'ERR_PATH_ESCAPE');
            expect(snapshot(fixture)).toEqual(before);
        } finally { remove(fixture); }
    });
});

function createLane(root: string): {dataHome: string; home: string; secondary: string} {
    const dataHome = join(root, 'data-home');
    const home = join(root, 'home');
    const secondary = join(root, 'secondary');
    const laneDir = join(home, '.watchtower', 'lanes', 'lane-a');
    mkdirSync(secondary, {recursive: true});
    mkdirSync(laneDir, {recursive: true});
    writeFileSync(join(laneDir, 'lane.json'), JSON.stringify(lane({home, secondary})));
    writeFileSync(join(laneDir, 'repositories.local.json'), JSON.stringify(bindings({home, secondary})));
    mkdirSync(dataHome);
    return {dataHome, home, secondary};
}

function writeIndex(dataHome: string, entries: Record<string, {laneId: string; laneHome: string}>): void {
    mkdirSync(join(dataHome, 'index'), {recursive: true});
    writeFileSync(join(dataHome, 'index', 'repository-memberships.json'), JSON.stringify(entries));
}

function lane(paths: {home: string; secondary: string}, includeLong: boolean = false) {
    return {schemaVersion: 1, laneId: LANE_ID, kind: 'implementation', slug: 'lane-a', initiativeId: 'lane-a-v1',
        controlHomeRepository: 'main', laneDir: '.watchtower/lanes/lane-a', repositories: [
            {id: 'main', role: 'primary', access: 'write'}, {id: 'secondary', role: 'integration', access: 'read'},
            ...(includeLong ? [{id: 'long', role: 'long-role', access: 'read'}] : [])]};
}

function bindings(paths: {home: string; secondary: string}) {
    return {schemaVersion: 1, repositories: [
        binding('main', paths.home, 'primary', 'dedicated', 'write'), binding('secondary', paths.secondary, 'integration')
    ]};
}

function binding(id: string, path: string, role: string, worktreeMode: 'dedicated' | 'shared' = 'shared', access: 'read' | 'write' = 'read') {
    return {id, path, branch: 'main', worktreeMode, role, access};
}

function writeBinding(paths: {home: string; secondary: string}, repositories: unknown[]): void {
    writeFileSync(join(paths.home, '.watchtower', 'lanes', 'lane-a', 'repositories.local.json'),
        JSON.stringify({schemaVersion: 1, repositories}));
}

function snapshot(root: string): string[] {
    const items: string[] = [];
    const visit = (path: string): void => {
        for (const name of readdirSync(path).sort()) {
            const child = join(path, name);
            const stat = lstatSync(child);
            items.push(`${child.slice(root.length)}:${stat.mode}:${stat.size}:${stat.mtimeMs}:${stat.isFile() ? readFileSync(child, 'hex') : ''}`);
            if (stat.isDirectory()) visit(child);
        }
    };
    visit(root);
    return items;
}

function makeFixture(): string { return mkdtempSync(join(tmpdir(), 'watchtower-rm07-')); }
function remove(path: string): void { rmSync(path, {recursive: true, force: true}); }
function expectCode(action: () => unknown, code: string): void {
    try { action(); fail(`Expected ${code}.`); } catch (error) {
        expect((error as {code?: string}).code).toBe(code);
    }
}
