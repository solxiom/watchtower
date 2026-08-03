import {LaneTaskRuntimeError, type LaneTaskBinding} from '../../src/contracts/taskRuntime.js';
import {
    BASE_ENVIRONMENT_KEYS,
    RUNTIME_ENVIRONMENT_KEYS,
    buildRuntimeEnvironment,
    redactedEnvironmentKeys
} from '../../src/foundation/taskRuntime/laneTaskEnvironment.js';
import {LaneRuntimeAccessGuard} from '../../src/foundation/taskRuntime/LaneRuntimeAccessGuard.js';
import {
    CONTROL_HOME,
    LANE_DIR,
    RESULT_SCHEMA_ID,
    RUNTIME_ROOT,
    TASK_ID,
    catalogDocument,
    laneContext,
    stagedFileSystem
} from './support/laneTaskRuntimeFixtures.js';

function binding(overrides: Partial<LaneTaskBinding> = {}): LaneTaskBinding {
    return {
        actionId: 'runtime.smoke', taskId: TASK_ID, handlerId: 'RuntimeSmokeTaskHandler',
        inputSchema: 'watchtower://runtime/schemas/runtime-smoke-input/v1', resultSchema: RESULT_SCHEMA_ID,
        mutationClass: 'read-only', requiresInvocationEnvelope: false, leafIds: [], ...overrides
    };
}

function reasonOf(action: () => unknown): string {
    try {
        action();
    } catch (error) {
        return error instanceof LaneTaskRuntimeError ? error.reason : `unexpected:${String(error)}`;
    }
    return 'no-error';
}

describe('runtime invocation environment', () => {
    it('exports exactly the specified names and never this process environment', () => {
        process.env.WT_SMUGGLED_SECRET = 'must-not-appear';
        try {
            const environment = buildRuntimeEnvironment(laneContext());
            expect(Object.keys(environment).sort()).toEqual([
                'HOME', 'PATH', 'WT_HOME_REPOSITORY_ID', 'WT_INITIATIVE_ID', 'WT_KNOWLEDGE_ROOT',
                'WT_LANE_DIR', 'WT_LANE_ID', 'WT_LANE_SLUG', 'WT_REPOSITORIES_FILE',
                'WT_RUNTIME_ROOT', 'WT_RUNTIME_VERSION', 'WT_WORKSPACE'
            ]);
            for (const key of Object.keys(environment)) {
                expect(RUNTIME_ENVIRONMENT_KEYS.includes(key as never) || BASE_ENVIRONMENT_KEYS.includes(key as never))
                    .toBeTrue();
            }
        } finally {
            delete process.env.WT_SMUGGLED_SECRET;
        }
    });

    it('separates the control home and the overlay in the exported environment', () => {
        const environment = buildRuntimeEnvironment(laneContext());
        expect(environment.WT_WORKSPACE).toBe(CONTROL_HOME);
        expect(environment.WT_LANE_DIR).toBe(LANE_DIR);
        expect(environment.WT_WORKSPACE).not.toBe(environment.WT_LANE_DIR);
    });

    it('refuses missing, empty, and control-character values', () => {
        expect(reasonOf(() => buildRuntimeEnvironment(laneContext({laneId: ''}))))
            .toBe('TASK_RUNTIME_ENVIRONMENT_INVALID');
        expect(reasonOf(() => buildRuntimeEnvironment(laneContext({workspace: undefined as never}))))
            .toBe('TASK_RUNTIME_ENVIRONMENT_INVALID');
        expect(reasonOf(() => buildRuntimeEnvironment(laneContext({laneSlug: 'demo\u0000rm'}))))
            .toBe('TASK_RUNTIME_ENVIRONMENT_INVALID');
    });

    it('freezes the exported map and keeps values out of key diagnostics', () => {
        const environment = buildRuntimeEnvironment(laneContext({decisionClass: 'C3'}));
        expect(Object.isFrozen(environment)).toBeTrue();
        expect(redactedEnvironmentKeys(environment)).toContain('WT_DECISION_CLASS');
        expect(redactedEnvironmentKeys(environment).join(' ')).not.toContain('C3');
    });
});

describe('lane runtime task account and access fences', () => {
    const document = catalogDocument();

    it('uses the control home as working directory, not the overlay', () => {
        const access = new LaneRuntimeAccessGuard(stagedFileSystem(document))
            .authorize(CONTROL_HOME, LANE_DIR, RUNTIME_ROOT, binding());
        expect(access.workingDirectory).toBe(CONTROL_HOME);
        expect(access.workingDirectory).not.toBe(LANE_DIR);
        expect(access.account.uid).toBe(1000);
    });

    it('refuses a runtime-writing task and a writable runtime root', () => {
        expect(reasonOf(() => new LaneRuntimeAccessGuard(stagedFileSystem(document))
            .authorize(CONTROL_HOME, LANE_DIR, RUNTIME_ROOT, binding({mutationClass: 'managed-runtime-write'}))))
            .toBe('TASK_RUNTIME_TASK_MUTATION_FORBIDDEN');
        const files = stagedFileSystem(document);
        files.set(RUNTIME_ROOT, {kind: 'directory', readable: true, traversable: true, writable: true});
        expect(reasonOf(() => new LaneRuntimeAccessGuard(files).authorize(CONTROL_HOME, LANE_DIR, RUNTIME_ROOT, binding())))
            .toBe('TASK_RUNTIME_ROOT_WRITABLE');
    });

    it('lets a read-only overlay run a read-only task but refuses a lane-writing task', () => {
        const files = stagedFileSystem(document);
        files.set(LANE_DIR, {kind: 'directory', readable: true, traversable: true, writable: false});
        const guard = new LaneRuntimeAccessGuard(files);
        expect(guard.authorize(CONTROL_HOME, LANE_DIR, RUNTIME_ROOT, binding()).workingDirectory).toBe(CONTROL_HOME);
        expect(reasonOf(() => guard.authorize(CONTROL_HOME, LANE_DIR, RUNTIME_ROOT,
            binding({mutationClass: 'journaled-mutation'})))).toBe('TASK_RUNTIME_ACCOUNT_ACCESS_DENIED');
    });

    it('refuses an invalid control home distinctly from an invalid overlay', () => {
        const files = stagedFileSystem(document);
        const guard = new LaneRuntimeAccessGuard(files);
        expect(reasonOf(() => guard.authorize('control/home', LANE_DIR, RUNTIME_ROOT, binding())))
            .toBe('TASK_RUNTIME_CONTROL_HOME_INVALID');
        expect(reasonOf(() => guard.authorize('/absent/home', LANE_DIR, RUNTIME_ROOT, binding())))
            .toBe('TASK_RUNTIME_CONTROL_HOME_INVALID');
        files.set(LANE_DIR, {kind: 'file'});
        expect(reasonOf(() => guard.authorize(CONTROL_HOME, LANE_DIR, RUNTIME_ROOT, binding())))
            .toBe('TASK_RUNTIME_WORKING_DIRECTORY_INVALID');
    });

    it('refuses an unreadable control home and an unreadable runtime root', () => {
        const unreadableHome = stagedFileSystem(document);
        unreadableHome.set(CONTROL_HOME, {kind: 'directory', readable: false, traversable: true});
        expect(reasonOf(() => new LaneRuntimeAccessGuard(unreadableHome)
            .authorize(CONTROL_HOME, LANE_DIR, RUNTIME_ROOT, binding()))).toBe('TASK_RUNTIME_ACCOUNT_ACCESS_DENIED');
        const unreadableRoot = stagedFileSystem(document);
        unreadableRoot.set(RUNTIME_ROOT, {kind: 'directory', readable: false, traversable: true, writable: false});
        expect(reasonOf(() => new LaneRuntimeAccessGuard(unreadableRoot)
            .authorize(CONTROL_HOME, LANE_DIR, RUNTIME_ROOT, binding()))).toBe('TASK_RUNTIME_ACCOUNT_ACCESS_DENIED');
    });
});

describe('lane runtime owned-leaf access uses the owning task contract', () => {
    const document = catalogDocument();
    const owner = binding({leafIds: ['coordinator.watch']});

    it('authorizes a read-only owning task against a non-writable overlay', () => {
        const files = stagedFileSystem(document);
        files.set(LANE_DIR, {kind: 'directory', readable: true, traversable: true, writable: false});
        expect(new LaneRuntimeAccessGuard(files).authorize(CONTROL_HOME, LANE_DIR, RUNTIME_ROOT, owner)
            .workingDirectory).toBe(CONTROL_HOME);
    });

    it('applies the owning task write fence to a lane-writing leaf', () => {
        const files = stagedFileSystem(document);
        files.set(LANE_DIR, {kind: 'directory', readable: true, traversable: true, writable: false});
        expect(reasonOf(() => new LaneRuntimeAccessGuard(files).authorize(CONTROL_HOME, LANE_DIR, RUNTIME_ROOT,
            binding({leafIds: ['coordinator.watch'], mutationClass: 'managed-lane-write'}))))
            .toBe('TASK_RUNTIME_ACCOUNT_ACCESS_DENIED');
    });

    it('refuses an owned leaf whose control home or runtime root is inaccessible', () => {
        const noHome = stagedFileSystem(document);
        noHome.remove(CONTROL_HOME);
        expect(reasonOf(() => new LaneRuntimeAccessGuard(noHome)
            .authorize(CONTROL_HOME, LANE_DIR, RUNTIME_ROOT, owner))).toBe('TASK_RUNTIME_CONTROL_HOME_INVALID');
        const writableRoot = stagedFileSystem(document);
        writableRoot.set(RUNTIME_ROOT, {kind: 'directory', readable: true, traversable: true, writable: true});
        expect(reasonOf(() => new LaneRuntimeAccessGuard(writableRoot)
            .authorize(CONTROL_HOME, LANE_DIR, RUNTIME_ROOT, owner))).toBe('TASK_RUNTIME_ROOT_WRITABLE');
    });
});
