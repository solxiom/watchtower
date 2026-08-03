import {LaneTaskRuntimeError} from '../../src/contracts/taskRuntime.js';
import {LeafRuntimeError} from '../../src/contracts/leafRuntime.js';
import {LaneTaskCatalog} from '../../src/foundation/taskRuntime/LaneTaskCatalog.js';
import {
    ACTION_ID,
    CATALOG_TARGET,
    LEAF_ID,
    LEAF_PATH,
    PROFILE_ID,
    RESULT_SCHEMA_DIGEST,
    RESULT_SCHEMA_ID,
    RESULT_SCHEMA_PATH,
    RUNTIME_ROOT,
    TASK_ID,
    catalogDocument,
    leafEntry,
    pinFor,
    stagedFileSystem,
    taskEntry
} from './support/laneTaskRuntimeFixtures.js';

function reasonOf(action: () => unknown): string {
    try {
        action();
    } catch (error) {
        if (error instanceof LaneTaskRuntimeError || error instanceof LeafRuntimeError) return error.reason;
        return `unexpected:${String(error)}`;
    }
    return 'no-error';
}

describe('lane task catalog identity and digest', () => {
    it('opens a catalog whose identity and digest match the lane pin', () => {
        const document = catalogDocument();
        const catalog = LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, stagedFileSystem(document));
        expect(catalog.resolveAction(ACTION_ID).taskId).toBe(TASK_ID);
    });

    it('fails closed on a missing, oversized, malformed, or duplicate-keyed catalog', () => {
        const document = catalogDocument();
        const missing = stagedFileSystem(document);
        missing.remove(CATALOG_TARGET);
        expect(reasonOf(() => LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, missing)))
            .toBe('TASK_RUNTIME_CATALOG_UNREADABLE');

        const malformed = stagedFileSystem(document);
        malformed.set(CATALOG_TARGET, {kind: 'file', text: '{'});
        expect(reasonOf(() => LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, malformed)))
            .toBe('TASK_RUNTIME_CATALOG_INVALID');

        const duplicated = stagedFileSystem(document);
        duplicated.set(CATALOG_TARGET, {kind: 'file', text: '{"catalogId": "a", "catalogId": "b"}'});
        expect(reasonOf(() => LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, duplicated)))
            .toBe('TASK_RUNTIME_CATALOG_INVALID');

        const array = stagedFileSystem(document);
        array.set(CATALOG_TARGET, {kind: 'file', text: '[]'});
        expect(reasonOf(() => LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, array)))
            .toBe('TASK_RUNTIME_CATALOG_INVALID');
    });

    it('rejects a swapped identity and a stale digest', () => {
        const document = catalogDocument();
        const foreign = catalogDocument({catalogId: 'other-runtime/v1'});
        expect(reasonOf(() => LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, stagedFileSystem(foreign))))
            .toBe('TASK_RUNTIME_CATALOG_IDENTITY_MISMATCH');

        const drifted = catalogDocument({profiles: {[PROFILE_ID]: {taskIds: [TASK_ID]}, extra: {taskIds: []}}});
        expect(reasonOf(() => LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, stagedFileSystem(drifted))))
            .toBe('TASK_RUNTIME_CATALOG_DIGEST_MISMATCH');
    });

    it('rejects an unknown profile and an invalid profile allowlist', () => {
        const document = catalogDocument();
        expect(reasonOf(() => LaneTaskCatalog.open(
            pinFor(document, {profile: 'absent-profile'}), RUNTIME_ROOT, stagedFileSystem(document)
        ))).toBe('TASK_RUNTIME_PROFILE_UNKNOWN');

        const broken = catalogDocument({profiles: {[PROFILE_ID]: {taskIds: ['not-a-task']}}});
        expect(reasonOf(() => LaneTaskCatalog.open(pinFor(broken), RUNTIME_ROOT, stagedFileSystem(broken))))
            .toBe('TASK_RUNTIME_CATALOG_INVALID');
    });
});

describe('catalog canonical containment', () => {
    it('refuses a catalog whose canonical target resolves outside the runtime root', () => {
        const document = catalogDocument();
        const files = stagedFileSystem(document);
        files.set(CATALOG_TARGET, {kind: 'file', canonicalPath: '/tmp/outside/task-catalog.json', text: '{}'});
        expect(reasonOf(() => LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, files)))
            .toBe('TASK_RUNTIME_CATALOG_UNREADABLE');
    });

    it('refuses a schema whose canonical target or digest does not match before validation', () => {
        const document = catalogDocument();
        const escaping = stagedFileSystem(document);
        escaping.set(RESULT_SCHEMA_PATH, {kind: 'file', canonicalPath: '/tmp/outside/x.json', digest: RESULT_SCHEMA_DIGEST});
        const catalog = LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, escaping);
        expect(reasonOf(() => catalog.readCheckedSchema(RESULT_SCHEMA_ID, escaping)))
            .toBe('TASK_RUNTIME_RESULT_SCHEMA_UNAVAILABLE');

        const drifted = stagedFileSystem(document);
        drifted.set(RESULT_SCHEMA_PATH, {kind: 'file', digest: `sha256:${'9'.repeat(64)}`, text: '{}'});
        const catalog2 = LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, drifted);
        expect(reasonOf(() => catalog2.readCheckedSchema(RESULT_SCHEMA_ID, drifted)))
            .toBe('TASK_RUNTIME_RESULT_SCHEMA_UNAVAILABLE');
    });
});

describe('allowlisted action to task mapping', () => {
    function open(document = catalogDocument()): LaneTaskCatalog {
        return LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, stagedFileSystem(document));
    }

    it('refuses malformed, unknown, and dangling actions with distinct reasons', () => {
        expect(reasonOf(() => open().resolveAction('Not An Action'))).toBe('TASK_RUNTIME_REQUEST_INVALID');
        expect(reasonOf(() => open().resolveAction('runtime.absent'))).toBe('TASK_RUNTIME_ACTION_UNKNOWN');

        const dangling = catalogDocument({actions: {[ACTION_ID]: {taskId: 'wt:runtime:absent'}}});
        expect(reasonOf(() => open(dangling).resolveAction(ACTION_ID))).toBe('TASK_RUNTIME_ACTION_DANGLING');

        const unshaped = catalogDocument({actions: {[ACTION_ID]: {taskId: 'not-a-task-id'}}});
        expect(reasonOf(() => open(unshaped).resolveAction(ACTION_ID))).toBe('TASK_RUNTIME_ACTION_DANGLING');
    });

    it('refuses a task the lane profile does not allow', () => {
        const document = catalogDocument({profiles: {[PROFILE_ID]: {taskIds: ['wt:runtime:other']}}});
        expect(reasonOf(() => open(document).resolveAction(ACTION_ID))).toBe('TASK_RUNTIME_TASK_NOT_IN_PROFILE');
    });

    it('refuses a repository-development task and an incomplete task contract', () => {
        const development = catalogDocument({tasks: {[TASK_ID]: taskEntry({executionScope: 'repository-development'})}});
        expect(reasonOf(() => open(development).resolveAction(ACTION_ID))).toBe('TASK_RUNTIME_TASK_SCOPE_INVALID');

        const unsupported = catalogDocument({tasks: {[TASK_ID]: taskEntry({mutationClass: 'invented-class'})}});
        expect(reasonOf(() => open(unsupported).resolveAction(ACTION_ID))).toBe('TASK_RUNTIME_CATALOG_INVALID');
    });

    it('returns the complete execution contract for an allowed action', () => {
        const document = catalogDocument({
            tasks: {[TASK_ID]: taskEntry({mutationClass: 'authoritative-effect', requiresInvocationEnvelope: true})}
        });
        const binding = open(document).resolveAction(ACTION_ID);
        expect(binding).toEqual(jasmine.objectContaining({
            actionId: ACTION_ID, taskId: TASK_ID, handlerId: 'RuntimeSmokeTaskHandler',
            mutationClass: 'authoritative-effect', requiresInvocationEnvelope: true
        }));
    });
});

describe('cataloged leaf resolution', () => {
    it('resolves a declared leaf inside the runtime root', () => {
        const document = catalogDocument({leaves: {[LEAF_ID]: leafEntry()}});
        const catalog = LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, stagedFileSystem(document));
        expect(catalog.resolveLeaf(LEAF_ID).path).toBe(LEAF_PATH);
    });

    it('refuses unknown, malformed, and escaping leaf declarations', () => {
        const document = catalogDocument({leaves: {[LEAF_ID]: leafEntry()}});
        const catalog = LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, stagedFileSystem(document));
        expect(reasonOf(() => catalog.resolveLeaf('absent.leaf'))).toBe('LEAF_UNKNOWN');
        expect(reasonOf(() => catalog.resolveLeaf('Bad Leaf'))).toBe('LEAF_REQUEST_INVALID');

        const writable = catalogDocument({leaves: {[LEAF_ID]: {...leafEntry(), mode: '0755'}}});
        const loose = LaneTaskCatalog.open(pinFor(writable), RUNTIME_ROOT, stagedFileSystem(writable));
        expect(reasonOf(() => loose.resolveLeaf(LEAF_ID))).toBe('LEAF_REQUEST_INVALID');

        const escaping = catalogDocument({leaves: {[LEAF_ID]: {...leafEntry(), path: './leaves/../../evil.sh'}}});
        const escaped = LaneTaskCatalog.open(pinFor(escaping), RUNTIME_ROOT, stagedFileSystem(escaping));
        expect(reasonOf(() => escaped.resolveLeaf(LEAF_ID))).toBe('LEAF_REQUEST_INVALID');
    });
});
