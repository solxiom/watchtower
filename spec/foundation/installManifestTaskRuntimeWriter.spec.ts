import {chmodSync, existsSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {LaneTaskProfileInstaller} from '../../src/foundation/runtime/distribution/index.js';
import {rebindTaskRuntime} from '../../src/foundation/runtime/distribution/installManifestTaskRuntimeWriter.js';
import {ManagedAssetsError} from '../../src/contracts/manifests.js';
import {createLockRecord, tryCreateLockRecord} from '../../src/foundation/storage/writeLockRecord.js';
import {readTaskRuntimePin} from '../../src/foundation/task/runtime/taskRuntimePin.js';
import {nodeRuntimeFileSystem} from '../../src/foundation/task/runtime/runtimeFileSystem.js';
import {
    CLI_VERSION,
    PROFILE_ID,
    RUNTIME_VERSION,
    cleanupFixture,
    installManifestFor,
    makeManagedAssetsFixture,
    type ManagedAssetsFixture
} from './support/managedAssetsFixtures.js';

function requestFor() {
    return {
        runtimeVersion: RUNTIME_VERSION,
        profile: PROFILE_ID,
        cliVersion: CLI_VERSION,
        configTargetRelative: 'runtime-nvb/runtime-nvb.json',
        moduleTargetRelative: 'runtime-nvb/runtime-nvb.js'
    };
}

const SAMPLE_PIN = {
    catalogId: 'watchtower-runtime-nvb/v1',
    catalogSha256: `sha256:${'a'.repeat(64)}` as `sha256:${string}`,
    profile: PROFILE_ID,
    configTarget: '/data/runtimes/1.0.0/runtime-nvb/runtime-nvb.json',
    moduleTarget: '/data/runtimes/1.0.0/runtime-nvb/runtime-nvb.js'
};

describe('install.json.taskRuntime atomic rebind (Correction 02, finding 1)', () => {
    let fixture: ManagedAssetsFixture;
    let installJsonPath: string;

    beforeEach(() => {
        fixture = makeManagedAssetsFixture();
        installJsonPath = join(fixture.laneDir, 'install.json');
    });

    afterEach(() => cleanupFixture(fixture.root));

    it('rebinds exactly taskRuntime, preserving every other field byte-for-byte, and durably reads back the pin', () => {
        const original = installManifestFor(fixture, {
            taskRuntime: {catalogId: 'watchtower-runtime-nvb/v1', catalogSha256: `sha256:${'0'.repeat(64)}`, profile: PROFILE_ID, configTarget: '/stale/config', moduleTarget: '/stale/module'}
        });
        writeFileSync(installJsonPath, JSON.stringify(original, null, 2));

        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        const rebound = installer.installAndRebind(fixture.laneDir, requestFor());

        expect(rebound.cliVersion).toBe(original.cliVersion);
        expect(rebound.runtimeVersion).toBe(original.runtimeVersion);
        expect(rebound.knowledgeVersion).toBe(original.knowledgeVersion);
        expect(rebound.mode).toBe(original.mode);
        expect(rebound.managedAssets).toEqual(original.managedAssets);
        expect(rebound.taskRuntime).toEqual({
            catalogId: 'watchtower-runtime-nvb/v1',
            catalogSha256: jasmine.stringMatching(/^sha256:[a-f0-9]{64}$/),
            profile: PROFILE_ID,
            configTarget: fixture.configTarget,
            moduleTarget: fixture.moduleTarget
        });

        const onDisk = JSON.parse(readFileSync(installJsonPath, 'utf8'));
        expect(onDisk.taskRuntime.configTarget).toBe(fixture.configTarget);
        expect(onDisk.managedAssets).toEqual(original.managedAssets);

        // Successful RT-05 consumption: the rebound pin resolves through the exact accepted reader.
        const pin = readTaskRuntimePin(onDisk.taskRuntime, fixture.runtimeRoot, nodeRuntimeFileSystem);
        expect(pin.configTarget).toBe(fixture.configTarget);
    });

    it('refuses a rebind when the existing runtimeVersion disagrees with the pinned runtime version, leaving bytes unchanged (Correction 02 reviewer probe)', () => {
        const original = installManifestFor(fixture, {runtimeVersion: '9.9.9'});
        const originalText = JSON.stringify(original, null, 2);
        writeFileSync(installJsonPath, originalText);

        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        expect(() => installer.installAndRebind(fixture.laneDir, requestFor())).toThrowMatching(
            (error: unknown) => error instanceof ManagedAssetsError && error.reason === 'INSTALL_MANIFEST_INVALID'
        );
        expect(readFileSync(installJsonPath, 'utf8')).toBe(originalText);
    });

    it('leaves install.json byte-for-byte unchanged when the profile/runtime request itself is invalid (failed rebind, no change)', () => {
        const original = installManifestFor(fixture);
        const originalText = JSON.stringify(original, null, 2);
        writeFileSync(installJsonPath, originalText);

        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        expect(() => installer.installAndRebind(fixture.laneDir, {...requestFor(), profile: 'no-such-profile'})).toThrow();
        expect(readFileSync(installJsonPath, 'utf8')).toBe(originalText);
    });

    it('refuses to rebind a malformed existing install.json without writing anything', () => {
        writeFileSync(installJsonPath, '{not json');
        expect(() => rebindTaskRuntime(fixture.laneDir, RUNTIME_VERSION, SAMPLE_PIN))
            .toThrowMatching((error: unknown) => error instanceof ManagedAssetsError && error.reason === 'INSTALL_MANIFEST_INVALID');
        expect(readFileSync(installJsonPath, 'utf8')).toBe('{not json');
    });

    it('refuses concurrent access with a stable lock-contention error, and succeeds once the lock is released', () => {
        writeFileSync(installJsonPath, JSON.stringify(installManifestFor(fixture), null, 2));
        const lockPath = join(fixture.laneDir, '.watchtower-managed-assets.lock');
        expect(tryCreateLockRecord(lockPath, createLockRecord())).toBeTrue();
        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        try {
            expect(() => installer.installAndRebind(fixture.laneDir, requestFor())).toThrowMatching(
                (error: unknown) => error instanceof ManagedAssetsError && error.reason === 'LINK_IO_UNAVAILABLE'
            );
        } finally {
            unlinkSync(lockPath);
        }
        const rebound = installer.installAndRebind(fixture.laneDir, requestFor());
        expect(rebound.taskRuntime.configTarget).toBe(fixture.configTarget);
    });

    it('does not corrupt the document when a stale leftover temp file from a prior interrupted run already exists (interruption/replay)', () => {
        writeFileSync(installJsonPath, JSON.stringify(installManifestFor(fixture), null, 2));
        writeFileSync(join(fixture.laneDir, '.install.json.leftover-from-a-crash.tmp'), 'garbage from an interrupted prior run');
        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        const rebound = installer.installAndRebind(fixture.laneDir, requestFor());
        expect(rebound.taskRuntime.configTarget).toBe(fixture.configTarget);
        expect(existsSync(join(fixture.laneDir, '.install.json.leftover-from-a-crash.tmp'))).toBeTrue();
    });

    it('refuses cleanly and leaves the original untouched when the lane directory is not writable for the rename (interrupted mid-effect)', () => {
        const original = installManifestFor(fixture);
        const originalText = JSON.stringify(original, null, 2);
        writeFileSync(installJsonPath, originalText);
        chmodSync(fixture.laneDir, 0o555);
        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        try {
            expect(() => installer.installAndRebind(fixture.laneDir, requestFor())).toThrow();
        } finally {
            chmodSync(fixture.laneDir, 0o755);
        }
        expect(readFileSync(installJsonPath, 'utf8')).toBe(originalText);
    });
});
