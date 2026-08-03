import {
    COMPATIBILITY_NAMES,
    requireCompatibilityAction,
    resolveCompatibilityName,
    resolveCompatibilityNameFrom
} from '../../src/foundation/managedAssets/compatibilityNameResolver.js';
import {ManagedAssetsError} from '../../src/contracts/manifests.js';
import {LaneTaskCatalog} from '../../src/foundation/taskRuntime/LaneTaskCatalog.js';
import {nodeRuntimeFileSystem} from '../../src/foundation/taskRuntime/runtimeFileSystem.js';
import {semanticDigest} from '../../src/foundation/schemaComposition/jsonCanonicalizer.js';
import {
    ACTION_ID,
    CATALOG_ID,
    PROFILE_ID,
    TASK_ID,
    catalogDocument,
    cleanupFixture,
    makeManagedAssetsFixture,
    type ManagedAssetsFixture
} from './support/managedAssetsFixtures.js';

const OTHER_TASK_ID = 'wt:runtime:other';
const OTHER_ACTION_ID = 'runtime.other';

function openCatalog(fixture: ManagedAssetsFixture, document = fixture.document): LaneTaskCatalog {
    const pin = {
        catalogId: CATALOG_ID,
        catalogSha256: semanticDigest(document),
        profile: PROFILE_ID,
        configTarget: fixture.configTarget,
        moduleTarget: fixture.moduleTarget
    };
    return LaneTaskCatalog.open(pin, fixture.runtimeRoot, nodeRuntimeFileSystem);
}

describe('compatibility name resolution — bound to the selected catalog/profile', () => {
    const table = Object.freeze({'coordinator-watch.sh': ACTION_ID});
    let fixture: ManagedAssetsFixture;

    afterEach(() => cleanupFixture(fixture.root));

    it('maps a known historical name to its canonical action when the catalog/profile allow it', () => {
        fixture = makeManagedAssetsFixture();
        const catalog = openCatalog(fixture);
        expect(resolveCompatibilityNameFrom('coordinator-watch.sh', table, catalog)).toBe(ACTION_ID);
    });

    it('returns null for an unrecognized name', () => {
        fixture = makeManagedAssetsFixture();
        const catalog = openCatalog(fixture);
        expect(resolveCompatibilityNameFrom('never-heard-of-this.sh', table, catalog)).toBeNull();
    });

    it('returns null when the canonical action is not declared by the catalog at all (dangling)', () => {
        fixture = makeManagedAssetsFixture();
        const catalog = openCatalog(fixture);
        const danglingTable = Object.freeze({'coordinator-watch.sh': 'runtime.does-not-exist'});
        expect(resolveCompatibilityNameFrom('coordinator-watch.sh', danglingTable, catalog)).toBeNull();
    });

    it('returns null when the canonical action names a task outside the selected profile (out-of-profile)', () => {
        const document = catalogDocument();
        (document.tasks as Record<string, unknown>)[OTHER_TASK_ID] = (document.tasks as Record<string, {readonly [key: string]: unknown}>)[TASK_ID];
        (document.actions as Record<string, unknown>)[OTHER_ACTION_ID] = {taskId: OTHER_TASK_ID};
        // profiles[PROFILE_ID] intentionally still allows only TASK_ID, not OTHER_TASK_ID.
        fixture = makeManagedAssetsFixture(document);
        const catalog = openCatalog(fixture, document);
        const outOfProfileTable = Object.freeze({'legacy-other.sh': OTHER_ACTION_ID});
        expect(resolveCompatibilityNameFrom('legacy-other.sh', outOfProfileTable, catalog)).toBeNull();
    });

    it('raises COMPATIBILITY_NAME_UNKNOWN instead of returning null when a caller requires an action', () => {
        fixture = makeManagedAssetsFixture();
        const catalog = openCatalog(fixture);
        expect(() => requireCompatibilityAction('never-heard-of-this.sh', catalog))
            .toThrowMatching((error: unknown) => error instanceof ManagedAssetsError && error.reason === 'COMPATIBILITY_NAME_UNKNOWN');
    });

    it('resolves against the production table by default, which is honestly empty until legacy names are classified', () => {
        fixture = makeManagedAssetsFixture();
        const catalog = openCatalog(fixture);
        expect(Object.keys(COMPATIBILITY_NAMES)).toEqual([]);
        expect(resolveCompatibilityName('coordinator-watch.sh', catalog)).toBeNull();
    });
});
