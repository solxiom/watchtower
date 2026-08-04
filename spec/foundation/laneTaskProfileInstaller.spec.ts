import {LaneTaskProfileInstaller} from '../../src/foundation/runtime/distribution/index.js';
import {LaneTaskCatalog} from '../../src/foundation/task/runtime/LaneTaskCatalog.js';
import {LaneTaskRuntimeError} from '../../src/contracts/taskRuntime.js';
import {RuntimeCatalogError} from '../../src/contracts/runtimeCatalog.js';
import {nodeRuntimeFileSystem} from '../../src/foundation/task/runtime/runtimeFileSystem.js';
import {
    ACTION_ID,
    CLI_VERSION,
    PROFILE_ID,
    RUNTIME_VERSION,
    TASK_ID,
    catalogDocument,
    cleanupFixture,
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

function expectRuntimeReason(action: () => void, reason: LaneTaskRuntimeError['reason']): void {
    try {
        action();
        fail('expected a LaneTaskRuntimeError');
    } catch (error) {
        expect(error instanceof LaneTaskRuntimeError).toBeTrue();
        expect((error as LaneTaskRuntimeError).reason).toBe(reason);
    }
}

describe('LaneTaskProfileInstaller', () => {
    let fixture: ManagedAssetsFixture;

    afterEach(() => cleanupFixture(fixture.root));

    it('pins exact catalog/profile/config/module identities and digests, each verified against the immutable root', () => {
        fixture = makeManagedAssetsFixture();
        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        const pin = installer.install(requestFor());
        expect(pin).toEqual({
            catalogId: 'watchtower-runtime-nvb/v1',
            catalogSha256: jasmine.stringMatching(/^sha256:[a-f0-9]{64}$/),
            profile: PROFILE_ID,
            configTarget: fixture.configTarget,
            moduleTarget: fixture.moduleTarget
        });
    });

    it('proves the produced pin is genuinely usable: the catalog resolves the profile-allowed action', () => {
        fixture = makeManagedAssetsFixture();
        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        const pin = installer.install(requestFor());
        const catalog = LaneTaskCatalog.open(pin, fixture.runtimeRoot, nodeRuntimeFileSystem);
        expect(catalog.resolveAction(ACTION_ID).taskId).toBe(TASK_ID);
    });

    it('rejects an unknown profile', () => {
        fixture = makeManagedAssetsFixture();
        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        expectRuntimeReason(() => installer.install({...requestFor(), profile: 'no-such-profile'}), 'TASK_RUNTIME_PROFILE_UNKNOWN');
    });

    it('rejects a profile that names a task the catalog does not define (profile-added task)', () => {
        const document = catalogDocument();
        (document.profiles as Record<string, unknown>)[PROFILE_ID] = {taskIds: [TASK_ID, 'wt:runtime:not-a-real-task']};
        fixture = makeManagedAssetsFixture(document);
        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        expectRuntimeReason(() => installer.install(requestFor()), 'TASK_RUNTIME_CATALOG_INVALID');
    });

    it('rejects a profile that declares an extra field beyond taskIds (profile-added code)', () => {
        const document = catalogDocument();
        (document.profiles as Record<string, unknown>)[PROFILE_ID] = {taskIds: [TASK_ID], handlers: {Injected: {module: './evil.js'}}};
        fixture = makeManagedAssetsFixture(document);
        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        expectRuntimeReason(() => installer.install(requestFor()), 'TASK_RUNTIME_CATALOG_INVALID');
    });

    it('rejects when the running CLI is older than the catalog declares as its minimum', () => {
        fixture = makeManagedAssetsFixture();
        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        expectRuntimeReason(() => installer.install({...requestFor(), cliVersion: '0.0.1'}), 'TASK_RUNTIME_CATALOG_INVALID');
    });

    it('rejects a malformed CLI version rather than silently comparing it as equal (Correction 01, finding 7)', () => {
        fixture = makeManagedAssetsFixture();
        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        expectRuntimeReason(() => installer.install({...requestFor(), cliVersion: 'not-a-version'}), 'TASK_RUNTIME_CATALOG_INVALID');
        expectRuntimeReason(() => installer.install({...requestFor(), cliVersion: '1.2'}), 'TASK_RUNTIME_CATALOG_INVALID');
    });

    it('rejects a moduleTarget that escapes the immutable runtime root', () => {
        fixture = makeManagedAssetsFixture();
        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        expectRuntimeReason(() => installer.install({...requestFor(), moduleTargetRelative: '../../etc/passwd'}), 'TASK_RUNTIME_PIN_TARGET_ESCAPE');
    });

    it('fails through the immutable RuntimeCatalog, not a guessed default, when the runtime version is not installed', () => {
        fixture = makeManagedAssetsFixture();
        const installer = new LaneTaskProfileInstaller(fixture.runtimeCatalog);
        expect(() => installer.install({...requestFor(), runtimeVersion: '9.9.9'})).toThrowMatching(
            (error: unknown) => error instanceof RuntimeCatalogError && error.reason === 'VERSION_NOT_INSTALLED'
        );
    });
});
