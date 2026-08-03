import {LaneTaskRuntimeError} from '../../src/contracts/taskRuntime.js';
import {readTaskRuntimePin} from '../../src/foundation/taskRuntime/taskRuntimePin.js';
import {
    CATALOG_ID,
    CONFIG_TARGET,
    FakeRuntimeFileSystem,
    MODULE_TARGET,
    RUNTIME_ROOT,
    catalogDocument,
    pinDocument,
    stagedFileSystem
} from './support/laneTaskRuntimeFixtures.js';

function expectPinReason(action: () => unknown, reason: string): void {
    try {
        action();
        fail(`expected ${reason}`);
    } catch (error) {
        expect(error instanceof LaneTaskRuntimeError).toBeTrue();
        expect((error as LaneTaskRuntimeError).reason).toBe(reason as never);
    }
}

describe('pinned task runtime target', () => {
    const document = catalogDocument();

    it('accepts a complete pin and returns canonical, contained targets', () => {
        const pin = readTaskRuntimePin(pinDocument(document), RUNTIME_ROOT, stagedFileSystem(document));
        expect(pin.catalogId).toBe(CATALOG_ID);
        expect(pin.configTarget).toBe(CONFIG_TARGET);
        expect(pin.moduleTarget).toBe(MODULE_TARGET);
    });

    it('rejects malformed, missing, and extra pin members', () => {
        const files = stagedFileSystem(document);
        expectPinReason(() => readTaskRuntimePin(null, RUNTIME_ROOT, files), 'TASK_RUNTIME_PIN_INVALID');
        expectPinReason(() => readTaskRuntimePin([], RUNTIME_ROOT, files), 'TASK_RUNTIME_PIN_INVALID');
        const {profile: _removed, ...missing} = pinDocument(document);
        expectPinReason(() => readTaskRuntimePin(missing, RUNTIME_ROOT, files), 'TASK_RUNTIME_PIN_INVALID');
        expectPinReason(
            () => readTaskRuntimePin({...pinDocument(document), extra: 'x'}, RUNTIME_ROOT, files),
            'TASK_RUNTIME_PIN_INVALID'
        );
    });

    it('rejects unsupported identity, digest, and profile syntax', () => {
        const files = stagedFileSystem(document);
        for (const override of [{catalogId: 'Watchtower/V1'}, {catalogSha256: 'sha256:zz'}, {profile: 'Bad Profile'}]) {
            expectPinReason(
                () => readTaskRuntimePin(pinDocument(document, override), RUNTIME_ROOT, files),
                'TASK_RUNTIME_PIN_INVALID'
            );
        }
    });

});

describe('pinned task runtime target containment', () => {
    const document = catalogDocument();

    it('rejects relative, traversing, and out-of-root targets', () => {
        const files = stagedFileSystem(document);
        expectPinReason(
            () => readTaskRuntimePin(pinDocument(document, {configTarget: 'runtime-nvb/runtime-nvb.json'}), RUNTIME_ROOT, files),
            'TASK_RUNTIME_PIN_INVALID'
        );
        expectPinReason(
            () => readTaskRuntimePin(pinDocument(document, {configTarget: `${RUNTIME_ROOT}/../evil.json`}), RUNTIME_ROOT, files),
            'TASK_RUNTIME_PIN_INVALID'
        );
        expectPinReason(
            () => readTaskRuntimePin(pinDocument(document, {configTarget: '/etc/nvb.json'}), RUNTIME_ROOT, files),
            'TASK_RUNTIME_PIN_TARGET_ESCAPE'
        );
    });

    it('rejects a target whose link resolves outside the runtime root', () => {
        const files = stagedFileSystem(document);
        files.set(CONFIG_TARGET, {kind: 'file', canonicalPath: '/tmp/elsewhere/runtime-nvb.json', readable: true});
        expectPinReason(
            () => readTaskRuntimePin(pinDocument(document), RUNTIME_ROOT, files),
            'TASK_RUNTIME_PIN_TARGET_ESCAPE'
        );
    });

    it('rejects a missing target and a target that is not a regular file', () => {
        const missing = stagedFileSystem(document);
        missing.remove(MODULE_TARGET);
        expectPinReason(
            () => readTaskRuntimePin(pinDocument(document), RUNTIME_ROOT, missing),
            'TASK_RUNTIME_PIN_TARGET_MISSING'
        );
        const directory = stagedFileSystem(document);
        directory.set(MODULE_TARGET, {kind: 'directory'});
        expectPinReason(
            () => readTaskRuntimePin(pinDocument(document), RUNTIME_ROOT, directory),
            'TASK_RUNTIME_PIN_TARGET_MISSING'
        );
    });

    it('rejects a runtime root that is relative, absent, or not a directory', () => {
        const files = stagedFileSystem(document);
        expectPinReason(() => readTaskRuntimePin(pinDocument(document), 'runtimes/1.0.0', files), 'TASK_RUNTIME_ROOT_INVALID');
        expectPinReason(
            () => readTaskRuntimePin(pinDocument(document), '/data/watchtower/runtimes/9.9.9', files),
            'TASK_RUNTIME_ROOT_INVALID'
        );
        const notDirectory = FakeRuntimeFileSystem.of({[RUNTIME_ROOT]: {kind: 'file'}});
        expectPinReason(() => readTaskRuntimePin(pinDocument(document), RUNTIME_ROOT, notDirectory), 'TASK_RUNTIME_ROOT_INVALID');
    });
});
