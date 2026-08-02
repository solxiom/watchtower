import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {WatchtowerError} from '../../src/contracts/index.js';
import {createCursorHostAdapter, resolveKnowledgeRoot} from '../../src/foundation/index.js';
import type {HostAdapter, ResolvedKnowledgePack} from '../../src/foundation/index.js';
import {acquireDirectoryInstallLock, releaseDirectoryInstallLock} from '../../src/foundation/hostAdapters/directoryInstallLock.js';
import {directoryInstallPort, setDirectoryInstallPortForTests, type DirectoryInstallPort} from '../../src/foundation/hostAdapters/directoryInstallPort.js';
import {
    createKnowledgePackFixture, destinationInventory, directoryHosts, hostDestinationSiblingInventory,
    seedLegalRecoveryState, type KnowledgePackFixture
} from './skillInstallFixtures.js';

/**
 * Correction 09 closure proof: read-only boundary, post-commit cleanup outcomes, directory durability
 * port, concurrent install lock, and Cursor destination identity.
 */
const legalRecoveryStates = [
    'abandoned-before-first-rename', 'interrupted-between-renames', 'landed-pending-previous-cleanup'
] as const;

for (const host of directoryHosts) {
    describe(`${host.name} correction-09 read-only recovery boundary`, function () {
        for (const state of legalRecoveryStates) {
            it(`leaves every byte unchanged through preview() for ${state}`, function () {
                const fixture = createKnowledgePackFixture();
                try {
                    const pack = resolveKnowledgeRoot(fixture.dataHome);
                    seedLegalRecoveryState(fixture.home, host.segments, state);
                    const siblingBefore = hostDestinationSiblingInventory(fixture.home, host.segments);
                    const destination = join(fixture.home, ...host.segments);
                    const destinationBefore = destinationInventory(destination);

                    expectCode(() => host.create(fixture.home).preview(pack, 'full'), 'ERR_INTEGRITY_FAILURE');

                    expect(hostDestinationSiblingInventory(fixture.home, host.segments)).toEqual(siblingBefore);
                    expect(destinationInventory(destination)).toEqual(destinationBefore);
                } finally { fixture.remove(); }
            });

            it(`leaves every byte unchanged through getInstalledVersion() for ${state}`, function () {
                const fixture = createKnowledgePackFixture();
                try {
                    seedLegalRecoveryState(fixture.home, host.segments, state);
                    const siblingBefore = hostDestinationSiblingInventory(fixture.home, host.segments);

                    expectCode(() => host.create(fixture.home).getInstalledVersion(), 'ERR_INTEGRITY_FAILURE');

                    expect(hostDestinationSiblingInventory(fixture.home, host.segments)).toEqual(siblingBefore);
                } finally { fixture.remove(); }
            });

            it(`leaves every byte unchanged through wt skill install --dry-run for ${state}`, function () {
                const fixture = createKnowledgePackFixture();
                try {
                    seedLegalRecoveryState(fixture.home, host.segments, state);
                    const siblingBefore = hostDestinationSiblingInventory(fixture.home, host.segments);
                    const result = cli(fixture, ['skill', 'install', host.name, '--dry-run', '--replace', '--json']);
                    expect(result.status).toBe(4);
                    expect(result.stderr).toContain('ERR_INTEGRITY_FAILURE');
                    expect(hostDestinationSiblingInventory(fixture.home, host.segments)).toEqual(siblingBefore);
                } finally { fixture.remove(); }
            });
        }

        it('allows preview() and getInstalledVersion() when only marker cleanup is pending', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                seedLegalRecoveryState(fixture.home, host.segments, 'committed-pending-marker-cleanup');
                const adapter = host.create(fixture.home);
                expect(adapter.preview(pack, 'full').destinationExists).toBeTrue();
                expect(adapter.getInstalledVersion()).toBe(fixture.version);
            } finally { fixture.remove(); }
        });
    });
}

describe('correction-09 post-commit cleanup outcomes', function () {
    afterEach(() => setDirectoryInstallPortForTests(null));

    for (const host of directoryHosts) {
        it(`${host.name}: returns applied success when previous cleanup fails after the destination is committed`, function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'AGENTS.md'), 'old\n');
                let previousCleanupAttempted = false;
                withInjectedRmSync((path, options, base) => {
                    if (!previousCleanupAttempted && path.includes('.previous-') && options?.recursive === true) {
                        previousCleanupAttempted = true;
                        const error = new Error('injected previous cleanup failure') as NodeJS.ErrnoException;
                        error.code = 'EIO';
                        throw error;
                    }
                    base.rmSync(path, options);
                });

                host.create(fixture.home).install(pack, 'full', {replace: true});

                expect(readFileSync(join(destination, 'AGENTS.md'), 'utf8')).not.toBe('old\n');
                expect(existsSync(`${destination}.install-transaction.json`)).toBeTrue();
                expect(hostDestinationSiblingInventory(fixture.home, host.segments).some((name) => name.includes('.previous-'))).toBeTrue();

                setDirectoryInstallPortForTests(null);
                host.create(fixture.home).install(pack, 'full', {replace: true});
                expect(existsSync(`${destination}.install-transaction.json`)).toBeFalse();
                expect(hostDestinationSiblingInventory(fixture.home, host.segments)).toEqual(['watchtower-coordinator']);
            } finally { fixture.remove(); }
        });

        it(`${host.name}: returns applied success and retries safely when marker cleanup fails after previous cleanup`, function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'AGENTS.md'), 'old\n');
                let markerCleanupAttempted = false;
                withInjectedRmSync((path, options, base) => {
                    if (path.endsWith('.install-transaction.json') && !markerCleanupAttempted) {
                        markerCleanupAttempted = true;
                        const error = new Error('injected marker cleanup failure') as NodeJS.ErrnoException;
                        error.code = 'EIO';
                        throw error;
                    }
                    base.rmSync(path, options);
                });

                host.create(fixture.home).install(pack, 'full', {replace: true});

                expect(readFileSync(join(destination, 'AGENTS.md'), 'utf8')).not.toBe('old\n');
                expect(existsSync(`${destination}.install-transaction.json`)).toBeTrue();
                expect(host.create(fixture.home).preview(pack, 'full').destinationExists).toBeTrue();
                expect(host.create(fixture.home).getInstalledVersion()).toBe(fixture.version);

                setDirectoryInstallPortForTests(null);
                host.create(fixture.home).install(pack, 'full', {replace: true});
                expect(existsSync(`${destination}.install-transaction.json`)).toBeFalse();
            } finally { fixture.remove(); }
        });
    }
});

for (const host of directoryHosts) {
    describe(`${host.name} correction-09 concurrent install lock`, function () {
        it('refuses a second install while the destination-parent lock is held', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.home, ...host.segments);
                const {staging, markerPath} = seedLegalRecoveryState(fixture.home, host.segments, 'abandoned-before-first-rename');
                const siblingBefore = hostDestinationSiblingInventory(fixture.home, host.segments);
                const lock = acquireDirectoryInstallLock(destination);
                try {
                    expectCode(() => host.create(fixture.home).install(pack, 'full', {replace: true}), 'ERR_INTEGRITY_FAILURE');
                    const after = hostDestinationSiblingInventory(fixture.home, host.segments)
                        .filter((name) => name !== '.watchtower-skill-install.lock');
                    expect(after).toEqual(siblingBefore);
                    expect(existsSync(staging)).toBeTrue();
                    expect(existsSync(markerPath)).toBeTrue();
                } finally {
                    releaseDirectoryInstallLock(lock);
                }
            } finally { fixture.remove(); }
        });
    });
}

describe('correction-09 Cursor destination identity', function () {
    const entryPoints: ReadonlyArray<{
        readonly name: string; readonly invoke: (adapter: HostAdapter, pack: ResolvedKnowledgePack) => void;
    }> = [
        {name: 'preview()', invoke: (adapter, pack) => { adapter.preview(pack, 'full'); }},
        {name: 'install()', invoke: (adapter, pack) => { adapter.install(pack, 'full', {replace: true}); }},
        {name: 'getInstalledVersion()', invoke: (adapter) => { adapter.getInstalledVersion(); }}
    ];

    for (const entryPoint of entryPoints) {
        it(`fails closed with ERR_MANAGED_CONFLICT when .cursorrules is a directory via ${entryPoint.name}`, function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.projectRoot, '.cursorrules');
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'sentinel.txt'), 'sentinel\n');
                const before = destinationInventory(destination);

                expectCode(() => entryPoint.invoke(createCursorHostAdapter(fixture.projectRoot), pack), 'ERR_MANAGED_CONFLICT');

                expect(destinationInventory(destination)).toEqual(before);
            } finally { fixture.remove(); }
        });

        it(`fails closed with ERR_PATH_ESCAPE when .cursorrules is a symlink via ${entryPoint.name}`, function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.projectRoot, '.cursorrules');
                const target = join(fixture.root, 'cursor-target.txt');
                writeFileSync(target, 'target\n');
                symlinkSync(target, destination);

                expectCode(() => entryPoint.invoke(createCursorHostAdapter(fixture.projectRoot), pack), 'ERR_PATH_ESCAPE');
            } finally { fixture.remove(); }
        });
    }
});

function withInjectedRmSync(
    handler: (path: string, options: {recursive?: boolean; force?: boolean} | undefined, base: DirectoryInstallPort) => void
): void {
    setDirectoryInstallPortForTests(null);
    const base = directoryInstallPort();
    setDirectoryInstallPortForTests({...base, rmSync: (path, options) => handler(path, options, base)});
}

function cli(fixture: KnowledgePackFixture, args: readonly string[]) {
    const entry = join(process.cwd(), 'build', 'src', 'cli.js');
    const source = `import run from ${JSON.stringify(entry)}; await run(...JSON.parse(process.env.WT_PROOF_ARGS));`;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
        cwd: fixture.projectRoot, encoding: 'utf8',
        env: {
            ...process.env, WT_PROOF_ARGS: JSON.stringify([...args]), HOME: fixture.home,
            WATCHTOWER_DATA_HOME: fixture.dataHome, PATH: '/usr/bin:/bin'
        }
    });
    return {status: result.status, stdout: result.stdout, stderr: result.stderr};
}

function expectCode(action: () => unknown, code: string): void {
    try {
        action();
        fail(`expected ${code}`);
    } catch (error) {
        expect((error as WatchtowerError).code).toBe(code);
    }
}
