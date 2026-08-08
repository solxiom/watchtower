import {symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DoctorKernel} from '../../../src/foundation/doctor/index.js';
import {nodeRepositoryBindingInspector} from '../../../src/foundation/bindings/index.js';
import type {DoctorCheckId} from '../../../src/contracts/index.js';
import {
    createLane, createReadCommandFixture, createRepository
} from '../../basic/readCommandFixtures.js';

function ignoreWatchtower(controlHome: string): void {
    writeFileSync(join(controlHome, '.gitignore'), '.watchtower/\n');
}

function statusOf(checks: readonly {id: DoctorCheckId; status: string}[], id: DoctorCheckId): string | undefined {
    return checks.find(check => check.id === id)?.status;
}

describe('binding-identity closed contract and single-read consistency (LC07-R3)', function () {
    it('rejects a read binding that omits required access and worktreeMode fields', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false, repositories: [
                {id: 'main', path: fixture.controlHome, role: 'primary', access: 'read', worktreeMode: 'dedicated'}
            ]});
            ignoreWatchtower(fixture.controlHome);
            writeFileSync(join(laneDir, 'repositories.local.json'), JSON.stringify({schemaVersion: 1, repositories: [{
                id: 'main', path: fixture.controlHome, branch: 'main', role: 'primary'
            }]}));
            const report = new DoctorKernel().run({cwd: fixture.controlHome});
            expect(statusOf(report.checks, 'repository-bindings')).toBe('fail');
            expect(statusOf(report.checks, 'repository-permissions')).toBe('skip');
        } finally { fixture.remove(); }
    });

    it('rejects a repositories.local.json with a duplicate top-level JSON member', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            ignoreWatchtower(fixture.controlHome);
            writeFileSync(join(laneDir, 'repositories.local.json'),
                '{"schemaVersion":1,"schemaVersion":1,"repositories":[]}\n');
            const report = new DoctorKernel().run({cwd: fixture.controlHome});
            expect(statusOf(report.checks, 'repository-bindings')).toBe('fail');
            expect(statusOf(report.checks, 'repository-permissions')).toBe('skip');
        } finally { fixture.remove(); }
    });

    it('rejects a repository entry with an extra, unrecognized key', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            ignoreWatchtower(fixture.controlHome);
            const entry = {id: 'main', path: fixture.controlHome, branch: 'main', worktreeMode: 'dedicated',
                role: 'primary', access: 'write', extraUnknownField: 'x'};
            writeFileSync(join(laneDir, 'repositories.local.json'),
                JSON.stringify({schemaVersion: 1, repositories: [entry]}));
            const report = new DoctorKernel().run({cwd: fixture.controlHome});
            expect(statusOf(report.checks, 'repository-bindings')).toBe('fail');
            expect(statusOf(report.checks, 'repository-permissions')).toBe('skip');
        } finally { fixture.remove(); }
    });

    it('rejects an unsupported access value rather than silently coercing it to read', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            ignoreWatchtower(fixture.controlHome);
            const entry = {id: 'main', path: fixture.controlHome, branch: 'main', worktreeMode: 'dedicated',
                role: 'primary', access: 'admin'};
            writeFileSync(join(laneDir, 'repositories.local.json'),
                JSON.stringify({schemaVersion: 1, repositories: [entry]}));
            const report = new DoctorKernel().run({cwd: fixture.controlHome});
            expect(statusOf(report.checks, 'repository-bindings')).toBe('fail');
            expect(statusOf(report.checks, 'repository-permissions')).toBe('skip');
        } finally { fixture.remove(); }
    });

    it('rejects a repositories.local.json above the 256 KiB read bound', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            ignoreWatchtower(fixture.controlHome);
            writeFileSync(join(laneDir, 'repositories.local.json'), ' '.repeat(300 * 1024));
            const report = new DoctorKernel().run({cwd: fixture.controlHome});
            expect(statusOf(report.checks, 'repository-bindings')).toBe('fail');
            expect(statusOf(report.checks, 'repository-permissions')).toBe('skip');
        } finally { fixture.remove(); }
    });

    it('rejects a declared path that is a symlink rather than its own canonical resolution', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            const real = createRepository(join(fixture.root, 'secondary-real'));
            const link = join(fixture.root, 'secondary-link');
            symlinkSync(real, link);
            ignoreWatchtower(fixture.controlHome);
            const entry = {id: 'main', path: fixture.controlHome, branch: 'main', worktreeMode: 'dedicated',
                role: 'primary', access: 'write'};
            const linked = {id: 'secondary', path: link, branch: 'main', worktreeMode: 'dedicated',
                role: 'integration', access: 'read'};
            writeFileSync(join(laneDir, 'lane.json'), JSON.stringify({
                schemaVersion: 1, laneId: '11111111-1111-4111-8111-111111111111', kind: 'implementation',
                slug: 'lane-a', initiativeId: 'initiative-a', controlHomeRepository: 'main',
                laneDir: '.watchtower/lanes/lane-a',
                repositories: [{id: 'main', role: 'primary', access: 'write'},
                    {id: 'secondary', role: 'integration', access: 'read'}]
            }));
            writeFileSync(join(laneDir, 'repositories.local.json'), JSON.stringify({schemaVersion: 1, repositories: [entry, linked]}));
            const report = new DoctorKernel().run({cwd: fixture.controlHome});
            expect(statusOf(report.checks, 'repository-bindings')).toBe('fail');
            expect(statusOf(report.checks, 'repository-permissions')).toBe('skip');
        } finally { fixture.remove(); }
    });

    it('derives repository-bindings and repository-permissions from exactly one read of repositories.local.json', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            ignoreWatchtower(fixture.controlHome);
            const bindingsPath = join(laneDir, 'repositories.local.json');
            let readCount = 0;
            const kernel = new DoctorKernel(undefined, {
                bindingInspector: {
                    ...nodeRepositoryBindingInspector,
                    readText(path: string) {
                        if (path === bindingsPath) readCount += 1;
                        return nodeRepositoryBindingInspector.readText(path);
                    }
                }
            });
            const report = kernel.run({cwd: fixture.controlHome});
            expect(readCount).toBe(1);
            expect(statusOf(report.checks, 'repository-bindings')).toBe('pass');
            expect(statusOf(report.checks, 'repository-permissions')).toBe('pass');
        } finally { fixture.remove(); }
    });
});
