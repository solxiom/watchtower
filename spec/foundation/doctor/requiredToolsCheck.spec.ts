import {DoctorKernel} from '../../../src/foundation/doctor/index.js';
import {createRequiredToolsCheck} from '../../../src/foundation/doctor/checks/requiredToolsCheck.js';
import type {RuntimeFileSystem} from '../../../src/foundation/task/index.js';
import {createLane, createReadCommandFixture, treeSnapshot, type ReadCommandFixture} from '../../basic/readCommandFixtures.js';

function fakeFiles(executableNames: readonly string[], dir = '/usr/bin'): RuntimeFileSystem {
    return {
        observe: (path: string) => {
            const name = path.split('/').pop() ?? '';
            return path === `${dir}/${name}` && executableNames.includes(name)
                ? {kind: 'file' as const, canonicalPath: path, executable: true, mode: 0o755, owner: null}
                : {kind: 'missing' as const, canonicalPath: '', executable: false, mode: null, owner: null};
        },
        isReadable: () => true, isWritable: () => false, isTraversable: () => true,
        readText: () => null, digest: () => null, account: () => ({uid: 1000, gid: 1000})
    };
}

async function runCheck(fixture: ReadCommandFixture, files: RuntimeFileSystem, pathEnv = '/usr/bin') {
    const kernel = new DoctorKernel([createRequiredToolsCheck({files})]);
    return kernel.run({cwd: fixture.controlHome, environment: {PATH: pathEnv}});
}

describe('requiredToolsCheck', function () {
    it('passes when every required tool resolves to an executable file on PATH', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const before = treeSnapshot(fixture.root);
            const report = await runCheck(fixture, fakeFiles(['bash', 'git', 'tmux', 'jq', 'flock', 'rg']));
            expect(report.checks[0].status).toBe('pass');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('fails and names exactly the missing tools', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const report = await runCheck(fixture, fakeFiles(['bash', 'git', 'tmux']));
            expect(report.checks[0].status).toBe('fail');
            expect(report.checks[0].message).toContain('jq, flock, rg');
        } finally { fixture.remove(); }
    });

    it('checks every PATH directory in order, not only the first', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const report = await runCheck(fixture, fakeFiles(['bash', 'git', 'tmux', 'jq', 'flock', 'rg']),
                '/first/empty/dir:/usr/bin');
            expect(report.checks[0].status).toBe('pass');
        } finally { fixture.remove(); }
    });

    it('never treats a missing directory or empty PATH segment as a match', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const report = await runCheck(fixture, fakeFiles([]), '::/usr/bin:');
            expect(report.checks[0].status).toBe('fail');
        } finally { fixture.remove(); }
    });

    it('honors the query-injected environment boundary instead of falling back to ambient process.env (isolated/relocated execution, LC10-R3)', async function () {
        const fixture = createReadCommandFixture();
        const originalPath = process.env.PATH;
        try {
            createLane(fixture, {packAvailable: false});
            // Every tool exists under /usr/bin in this fake. If the check ever fell back to
            // ambient process.env.PATH instead of the query's injected environment, it would
            // find them here and incorrectly pass despite the isolated query PATH being empty.
            process.env.PATH = '/usr/bin';
            const kernel = new DoctorKernel([createRequiredToolsCheck({files: fakeFiles(['bash', 'git', 'tmux', 'jq', 'flock', 'rg'])})]);
            const report = await kernel.run({cwd: fixture.controlHome, environment: {PATH: '/isolated/empty'}});
            expect(report.checks[0].status).toBe('fail');
        } finally {
            process.env.PATH = originalPath;
            fixture.remove();
        }
    });
});
