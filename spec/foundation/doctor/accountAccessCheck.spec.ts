import {createAccountAccessCheck} from '../../../src/foundation/doctor/checks/accountAccessCheck.js';
import {DoctorKernel} from '../../../src/foundation/doctor/index.js';
import type {RuntimeFileSystem} from '../../../src/foundation/task/index.js';
import {RuntimeCatalog} from '../../../src/foundation/runtime/index.js';
import {createLane, createReadCommandFixture, type ReadCommandFixture} from '../../basic/readCommandFixtures.js';

const RUNTIME_ROOT = '/installed/1.0.0';

function fakeFiles(overrides: Partial<RuntimeFileSystem> = {}): RuntimeFileSystem {
    return {
        observe: () => ({kind: 'directory', canonicalPath: RUNTIME_ROOT, executable: true, mode: null, owner: null}),
        isReadable: () => true,
        isWritable: () => false,
        isTraversable: () => true,
        readText: () => null,
        digest: () => null,
        account: () => ({uid: 1000, gid: 1000}),
        ...overrides
    };
}

function fakeCatalog(): RuntimeCatalog {
    return {getRuntimeRoot: () => RUNTIME_ROOT} as unknown as RuntimeCatalog;
}

async function runCheck(fixture: ReadCommandFixture, files: RuntimeFileSystem) {
    const kernel = new DoctorKernel([createAccountAccessCheck({runtimeCatalog: fakeCatalog(), files})]);
    return kernel.run({cwd: fixture.controlHome});
}

describe('accountAccessCheck', function () {
    it('passes when control home and runtime root are readable/traversable and the runtime root is not writable', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const report = await runCheck(fixture, fakeFiles());
            expect(report.checks[0].status).toBe('pass');
        } finally { fixture.remove(); }
    });

    it('fails when the control home is not readable by the effective account', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const report = await runCheck(fixture, fakeFiles({isReadable: (path) => path !== fixture.controlHome}));
            expect(report.checks[0].status).toBe('fail');
            expect(report.checks[0].message).toContain('control home');
        } finally { fixture.remove(); }
    });

    it('fails when the control home is not traversable by the effective account', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const report = await runCheck(fixture, fakeFiles({isTraversable: (path) => path !== fixture.controlHome}));
            expect(report.checks[0].status).toBe('fail');
        } finally { fixture.remove(); }
    });

    it('fails when the immutable runtime root is writable by the effective account', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const report = await runCheck(fixture, fakeFiles({isWritable: (path) => path === RUNTIME_ROOT}));
            expect(report.checks[0].status).toBe('fail');
            expect(report.checks[0].message).toContain('not immutable');
        } finally { fixture.remove(); }
    });

    it('fails when the runtime root is not readable/traversable by the effective account', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const report = await runCheck(fixture, fakeFiles({isReadable: (path) => path !== RUNTIME_ROOT}));
            expect(report.checks[0].status).toBe('fail');
        } finally { fixture.remove(); }
    });

    it('skips, deferring to runtime-catalog, when the pinned runtime is not installed', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const kernel = new DoctorKernel([createAccountAccessCheck({
                runtimeCatalog: {getRuntimeRoot: () => { throw new Error('not installed'); }} as unknown as RuntimeCatalog,
                files: fakeFiles()
            })]);
            const report = await kernel.run({cwd: fixture.controlHome});
            expect(report.checks[0].status).toBe('skip');
        } finally { fixture.remove(); }
    });
});
