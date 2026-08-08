import {chmodSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DoctorKernel} from '../../../src/foundation/doctor/index.js';
import {watchtowerErrorReason} from '../../../src/foundation/doctor/DoctorCheckResult.js';
import {nodeLaneDiscoveryFileSystem} from '../../../src/foundation/discovery/index.js';
import type {DoctorCheckProvider} from '../../../src/foundation/doctor/index.js';
import type {DoctorCheckId} from '../../../src/contracts/index.js';
import {
    createLane, createReadCommandFixture, createRepository, repository, treeSnapshot
} from '../../basic/readCommandFixtures.js';

function ignoreWatchtower(controlHome: string): void {
    writeFileSync(join(controlHome, '.gitignore'), '.watchtower/\n');
}

function statusOf(checks: readonly {id: DoctorCheckId; status: string}[], id: DoctorCheckId): string | undefined {
    return checks.find(check => check.id === id)?.status;
}

describe('DoctorKernel lane-local checks', function () {
    it('snapshots injected providers and rejects duplicate or unsupported IDs', function () {
        const input: DoctorCheckProvider[] = [];
        const kernel = new DoctorKernel(input);
        input.push({id: 'git-ignore-coverage', run: () => ({
            id: 'git-ignore-coverage', status: 'pass', message: 'unused', reason: null
        })});
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            expect(kernel.run({cwd: fixture.controlHome}).checks).toEqual([]);
        } finally { fixture.remove(); }

        const provider: DoctorCheckProvider = {id: 'lane-marker', run: () => ({
            id: 'lane-marker', status: 'pass', message: 'unused', reason: null
        })};
        expect(() => new DoctorKernel([provider, provider]))
            .toThrow(jasmine.objectContaining({code: 'ERR_INVALID_ARGUMENT'}));
        expect(() => new DoctorKernel([{
            ...provider, id: 'unsupported-provider'
        } as unknown as DoctorCheckProvider]))
            .toThrow(jasmine.objectContaining({code: 'ERR_INVALID_ARGUMENT'}));
    });

    it('reports pass for every owned check on a healthy lane without writing bytes', function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            ignoreWatchtower(fixture.controlHome);
            const before = treeSnapshot(fixture.root);
            const report = new DoctorKernel().run({cwd: fixture.controlHome});
            expect(report.schemaVersion).toBe(1);
            expect(report.lane.slug).toBe('lane-a');
            expect(report.checks.length).toBe(5);
            expect(report.checks.every(check => check.status === 'pass')).toBeTrue();
            expect(report.summary.pass).toBe(5);
            expect(report.summary.warn).toBe(0);
            expect(report.summary.fail).toBe(0);
            expect(report.summary.skip).toBe(0);
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('fails the git-ignore check when /.watchtower/ is not ignored', function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const before = treeSnapshot(fixture.root);
            const report = new DoctorKernel().run({cwd: fixture.controlHome});
            expect(statusOf(report.checks, 'git-ignore-coverage')).toBe('fail');
            expect(report.summary.fail).toBe(1);
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('fails the binding check and skips the permission check for a repositories.local.json with an incomplete identity', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            ignoreWatchtower(fixture.controlHome);
            writeFileSync(join(laneDir, 'repositories.local.json'), '{"schemaVersion":1,"repositories":[]}\n');
            const before = treeSnapshot(fixture.root);
            const report = new DoctorKernel().run({cwd: fixture.controlHome});
            expect(statusOf(report.checks, 'repository-bindings')).toBe('fail');
            expect(statusOf(report.checks, 'repository-permissions')).toBe('skip');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('skips the permission check when repositories.local.json cannot be parsed at all', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            ignoreWatchtower(fixture.controlHome);
            writeFileSync(join(laneDir, 'repositories.local.json'), 'not valid json\n');
            const before = treeSnapshot(fixture.root);
            const report = new DoctorKernel().run({cwd: fixture.controlHome});
            expect(statusOf(report.checks, 'repository-permissions')).toBe('skip');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('fails the config check when lane state is missing', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            ignoreWatchtower(fixture.controlHome);
            rmSync(join(laneDir, 'state', 'coordinator-lane-state.txt'));
            const before = treeSnapshot(fixture.root);
            const report = new DoctorKernel().run({cwd: fixture.controlHome});
            expect(statusOf(report.checks, 'lane-config')).toBe('fail');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('fails the config check for a contradictory lane state', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            ignoreWatchtower(fixture.controlHome);
            writeFileSync(join(laneDir, 'state', 'coordinator-lane-state.txt'), 'lane_status=complete\nactive_batch=RM-1\n');
            const report = new DoctorKernel().run({cwd: fixture.controlHome});
            expect(statusOf(report.checks, 'lane-config')).toBe('fail');
        } finally { fixture.remove(); }
    });

    it('fails the permission check for an inaccessible participating repository', function () {
        const fixture = createReadCommandFixture();
        try {
            const secondRepo = join(fixture.root, 'second-repo');
            mkdirSync(secondRepo, {recursive: true});
            createLane(fixture, {packAvailable: false, repositories: [
                {id: 'main', path: fixture.controlHome, role: 'primary', access: 'write', worktreeMode: 'dedicated'}
            ]});
            const laneDir = join(fixture.controlHome, '.watchtower', 'lanes', 'lane-a');
            ignoreWatchtower(fixture.controlHome);
            chmodSync(fixture.controlHome, 0o500);
            try {
                const before = treeSnapshot(fixture.root);
                const report = new DoctorKernel().run({cwd: fixture.controlHome});
                expect(statusOf(report.checks, 'repository-permissions')).toBe('fail');
                expect(treeSnapshot(fixture.root)).toBe(before);
            } finally {
                chmodSync(fixture.controlHome, 0o700);
            }
            void laneDir;
        } finally { fixture.remove(); }
    });

    it('fails the permission check for a read-denied, otherwise validly declared secondary repository', function () {
        const fixture = createReadCommandFixture();
        try {
            const secondary = createRepository(join(fixture.root, 'secondary-repo'));
            createLane(fixture, {packAvailable: false, repositories: [
                repository('main', fixture.controlHome, 'primary', 'write'),
                repository('secondary', secondary, 'integration', 'read')
            ]});
            ignoreWatchtower(fixture.controlHome);
            chmodSync(secondary, 0o000);
            try {
                const report = new DoctorKernel().run({cwd: fixture.controlHome});
                expect(statusOf(report.checks, 'repository-permissions')).toBe('fail');
                expect(statusOf(report.checks, 'repository-bindings')).toBe('fail');
            } finally {
                chmodSync(secondary, 0o700);
            }
        } finally { fixture.remove(); }
    });

    it('fails the permission check for a write-denied, otherwise validly declared secondary repository', function () {
        const fixture = createReadCommandFixture();
        try {
            const secondary = createRepository(join(fixture.root, 'secondary-repo'));
            createLane(fixture, {packAvailable: false, repositories: [
                repository('main', fixture.controlHome, 'primary', 'write'),
                repository('secondary', secondary, 'integration', 'write')
            ]});
            ignoreWatchtower(fixture.controlHome);
            chmodSync(secondary, 0o500);
            try {
                const report = new DoctorKernel().run({cwd: fixture.controlHome});
                expect(statusOf(report.checks, 'repository-permissions')).toBe('fail');
                expect(statusOf(report.checks, 'repository-bindings')).toBe('fail');
            } finally {
                chmodSync(secondary, 0o700);
            }
        } finally { fixture.remove(); }
    });

    it('propagates lane-not-found without touching the filesystem for an empty relevant set', function () {
        const fixture = createReadCommandFixture();
        try {
            const before = treeSnapshot(fixture.root);
            expect(() => new DoctorKernel().run({cwd: fixture.controlHome}))
                .toThrow(jasmine.objectContaining({code: 'ERR_LANE_NOT_FOUND'}));
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('selects among multiple lanes with --lane and rejects ambiguity otherwise', function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            createLane(fixture, {slug: 'lane-b', laneId: '22222222-2222-4222-8222-222222222222', packAvailable: false});
            ignoreWatchtower(fixture.controlHome);
            expect(() => new DoctorKernel().run({cwd: fixture.controlHome}))
                .toThrow(jasmine.objectContaining({code: 'ERR_AMBIGUOUS_SELECTION'}));
            const report = new DoctorKernel().run({cwd: fixture.controlHome, lane: 'lane-b'});
            expect(report.lane.slug).toBe('lane-b');
        } finally { fixture.remove(); }
    });
});

describe('DoctorKernel isolated check adversarial proof', function () {
    it('fails the marker check independently of discovery for a corrupted lane.json read after selection', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            ignoreWatchtower(fixture.controlHome);
            const markerPath = join(laneDir, 'lane.json');
            const kernel = new DoctorKernel(undefined, {
                fileSystem: {
                    inspect(path: string) {
                        return path === markerPath ? {kind: 'file' as const, size: 2} : nodeLaneDiscoveryFileSystem.inspect(path);
                    },
                    list(path: string) { return nodeLaneDiscoveryFileSystem.list(path); },
                    readText(path: string) {
                        return path === markerPath ? '{}' : nodeLaneDiscoveryFileSystem.readText(path);
                    }
                }
            });
            const report = kernel.run({cwd: fixture.controlHome});
            expect(statusOf(report.checks, 'lane-marker')).toBe('fail');
        } finally { fixture.remove(); }
    });
});

describe('DoctorCheckResult reason-code contract (LC07-R1)', function () {
    it('never lets an arbitrary, unregistered code escape into a DoctorCheck reason', function () {
        expect(watchtowerErrorReason({code: 'NOT_A_WATCHTOWER_CODE', message: 'x'})).toBeNull();
        expect(watchtowerErrorReason({code: 'ARBITRARY_INJECTED_VALUE'})).toBeNull();
        expect(watchtowerErrorReason(new Error('plain error, no code field'))).toBeNull();
        expect(watchtowerErrorReason(null)).toBeNull();
        expect(watchtowerErrorReason(undefined)).toBeNull();
        expect(watchtowerErrorReason('a bare string')).toBeNull();
    });

    it('accepts only a code registered in the closed ErrorCode contract', function () {
        expect(watchtowerErrorReason({code: 'ERR_INVALID_LANE_CONFIG', message: 'x'})).toBe('ERR_INVALID_LANE_CONFIG');
        expect(watchtowerErrorReason({code: 'ERR_PREFLIGHT_FAILED', message: 'x'})).toBe('ERR_PREFLIGHT_FAILED');
    });
});
