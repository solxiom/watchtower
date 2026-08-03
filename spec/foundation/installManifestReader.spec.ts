import {parseInstallManifest} from '../../src/foundation/managedAssets/installManifestReader.js';
import {ManagedAssetsError} from '../../src/contracts/manifests.js';

function validManifest(): Record<string, unknown> {
    return {
        schemaVersion: 1,
        cliVersion: '1.0.0',
        runtimeVersion: '1.0.0',
        knowledgeVersion: '1.0.0',
        mode: 'linked',
        taskRuntime: {
            catalogId: 'watchtower-runtime-nvb/v1',
            catalogSha256: `sha256:${'a'.repeat(64)}`,
            profile: 'implementation-v1',
            configTarget: '/data/runtimes/1.0.0/runtime-nvb/runtime-nvb.json',
            moduleTarget: '/data/runtimes/1.0.0/runtime-nvb/runtime-nvb.js'
        },
        managedAssets: {
            'bin/coordinator-watch.sh': {target: '/data/runtimes/1.0.0/coordinator/coordinatorWatch.sh', sha256: `sha256:${'b'.repeat(64)}`}
        }
    };
}

function expectInvalid(value: unknown): void {
    expect(() => parseInstallManifest(value)).toThrowMatching(
        (error: unknown) => error instanceof ManagedAssetsError && error.reason === 'INSTALL_MANIFEST_INVALID'
    );
}

describe('parseInstallManifest — closed unknown-input validation', () => {
    it('parses a well-formed manifest into the exact closed shape', () => {
        expect(parseInstallManifest(validManifest())).toEqual(validManifest() as never);
    });

    it('rejects a missing top-level field', () => {
        const {mode: _mode, ...rest} = validManifest();
        expectInvalid(rest);
    });

    it('rejects an extra top-level field', () => {
        expectInvalid({...validManifest(), extra: true});
    });

    it('rejects a non-1 schemaVersion', () => {
        expectInvalid({...validManifest(), schemaVersion: 2});
    });

    it('rejects an unsupported install mode', () => {
        expectInvalid({...validManifest(), mode: 'copied'});
    });

    for (const field of ['cliVersion', 'runtimeVersion', 'knowledgeVersion']) {
        it(`rejects a malformed ${field} instead of comparing it as equal to anything`, () => {
            expectInvalid({...validManifest(), [field]: 'not-a-version'});
            expectInvalid({...validManifest(), [field]: '1.2'});
            expectInvalid({...validManifest(), [field]: '1.2.3.4'});
            expectInvalid({...validManifest(), [field]: '1.2.3 trailing garbage'});
        });
    }

    it('rejects a taskRuntime block missing a required field', () => {
        const manifest = validManifest();
        const {profile: _profile, ...rest} = manifest.taskRuntime as Record<string, unknown>;
        expectInvalid({...manifest, taskRuntime: rest});
    });

    it('rejects a taskRuntime block with an extra field', () => {
        const manifest = validManifest();
        expectInvalid({...manifest, taskRuntime: {...manifest.taskRuntime as object, extra: 'x'}});
    });

    it('rejects a managed-asset key outside bin/', () => {
        const manifest = validManifest();
        expectInvalid({...manifest, managedAssets: {'lane.json': (manifest.managedAssets as Record<string, unknown>)['bin/coordinator-watch.sh']}});
    });

    it('rejects a managed-asset declaration with a malformed digest', () => {
        const manifest = validManifest();
        expectInvalid({...manifest, managedAssets: {'bin/coordinator-watch.sh': {target: '/x', sha256: 'not-a-digest'}}});
    });

    it('rejects a managed-asset declaration with an extra field', () => {
        const manifest = validManifest();
        expectInvalid({
            ...manifest,
            managedAssets: {'bin/coordinator-watch.sh': {target: '/x', sha256: `sha256:${'c'.repeat(64)}`, extra: 1}}
        });
    });
});
