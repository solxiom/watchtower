/**
 * CA-13 ownership, model-free, and structural gate.
 *
 * These assertions are about the *source tree*, not behaviour: a queue that
 * behaves correctly today but has grown a second cursor writer, an ambient
 * `node:fs` call, or a model invocation is exactly the regression the pack
 * rules exist to catch, and no behavioural spec would notice it.
 */
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const REPO_ROOT = process.cwd();
const CAPSULE = join(REPO_ROOT, 'src', 'foundation', 'lane', 'coordinator', 'queue');
const SOURCE_ROOT = join(REPO_ROOT, 'src');

/** The exact owned module set; a new file here is a deliberate ownership decision. */
const OWNED_MODULES = [
    'CoordinatorQueue.ts', 'CoordinatorReplay.ts', 'CursorManager.ts', 'WatcherPoller.ts',
    'coordinatorJournalSources.ts', 'cycleRecovery.ts', 'cycleReservations.ts',
    'effectEvidenceSource.ts', 'index.ts',
    'laneMutationLock.ts', 'laneTaskTriggerIngest.ts', 'nodeQueueFileSystem.ts',
    'pollCursorFence.ts', 'projectionTransaction.ts', 'queueAdmission.ts', 'queuePersistence.ts', 'queuePorts.ts',
    'queuePriority.ts', 'queueSelection.ts', 'queueValidation.ts', 'uncertainEscalation.ts',
    'watcherPollReport.ts'
] as const;

/**
 * The single module allowed to name the NVB task boundary. It is the
 * composition root for the packaged read-only ingestion task and owns no
 * policy; every other capsule module must stay unable to reach a task at all.
 */
const TASK_BOUNDARY_MODULE = 'laneTaskTriggerIngest.ts';

/** Size bands from the pack's structural matrix, by module category. */
const SIZE_LIMITS: Readonly<Record<string, number>> = Object.freeze({
    'CoordinatorQueue.ts': 300, 'CoordinatorReplay.ts': 200, 'CursorManager.ts': 300,
    'WatcherPoller.ts': 200, 'coordinatorJournalSources.ts': 300, 'cycleRecovery.ts': 300,
    'effectEvidenceSource.ts': 300, 'index.ts': 180, 'nodeQueueFileSystem.ts': 300,
    'queuePersistence.ts': 300, 'queuePorts.ts': 400, 'queuePriority.ts': 300,
    'queueValidation.ts': 300, 'laneTaskTriggerIngest.ts': 300, 'watcherPollReport.ts': 200,
    'queueAdmission.ts': 300, 'laneMutationLock.ts': 300, 'projectionTransaction.ts': 300,
    'uncertainEscalation.ts': 300, 'queueSelection.ts': 300, 'cycleReservations.ts': 300, 'pollCursorFence.ts': 300
});

function capsuleFiles(): readonly string[] {
    return readdirSync(CAPSULE).filter((name) => name.endsWith('.ts')).sort();
}

function read(name: string): string {
    return readFileSync(join(CAPSULE, name), 'utf8');
}

function sourceFiles(root: string): readonly string[] {
    return readdirSync(root, {recursive: true, encoding: 'utf8'})
        .filter((name) => name.endsWith('.ts'))
        .map((name) => join(root, name));
}

describe('CA-13 capsule ownership', () => {
    it('ships exactly the declared owned modules', () => {
        expect(capsuleFiles()).toEqual([...OWNED_MODULES]);
    });

    it('keeps every module inside its structural size band', () => {
        for (const name of capsuleFiles()) {
            const lines = read(name).split('\n').length;
            expect(lines).withContext(`${name} has ${lines} lines`).toBeLessThanOrEqual(SIZE_LIMITS[name]);
        }
    });

    it('uses PascalCase only for class-owning modules and no dashes or underscores', () => {
        for (const name of capsuleFiles()) {
            expect(name).withContext(name).not.toMatch(/[-_]/);
            const isClassModule = /^export class /m.test(read(name));
            expect(/^[A-Z]/.test(name)).withContext(name).toBe(isClassModule);
        }
    });

    it('rejects generic overflow owners', () => {
        for (const name of capsuleFiles()) {
            expect(name).withContext(name).not.toMatch(/^(helpers|utils|common|misc)\.ts$/);
        }
    });
});

describe('CA-13 single-authority boundaries', () => {
    it('routes every projection mutation through the one lane-locked transaction', () => {
        // A `writeQueueDocument`/`writeCursorDocument` call outside a
        // `commitProjection` callback would be a mutation with no lane lock and
        // no compare-and-swap — exactly the lost update correction-03 F2/F3
        // closed. The two owners are allowed to name the writers; nothing else
        // in the capsule may, and both must reach them through the transaction.
        for (const name of ['CoordinatorQueue.ts', 'CursorManager.ts']) {
            expect(read(name)).withContext(name).toContain('commitProjection');
            expect(read(name).match(/write(Queue|Cursor)Document\(/g)?.length).withContext(name).toBe(1);
        }
    });

    it('acquires the lane lock from exactly one module, and never mints a second lock', () => {
        const holders = capsuleFiles()
            .filter((name) => name !== 'index.ts')
            .filter((name) => /acquireEffectLocks|LOCK_ORDER|\.lock'/.test(read(name)));
        expect(holders).toEqual(['laneMutationLock.ts']);
    });

    it('writes coordinator/cursor.json from exactly one module', () => {
        const writers = capsuleFiles().filter((name) => /writeCursorDocument\(/.test(read(name)) && name !== 'index.ts');
        expect(writers).toEqual(['CursorManager.ts', 'queuePersistence.ts']);
    });

    it('writes coordinator/queue.json from exactly one module', () => {
        const writers = capsuleFiles().filter((name) => /writeQueueDocument\(/.test(read(name)) && name !== 'index.ts');
        expect(writers).toEqual(['CoordinatorQueue.ts', 'queuePersistence.ts']);
    });

    it('keeps every `node:fs` and `node:crypto` call out of the capsule', () => {
        const offenders = capsuleFiles().filter((name) => /from 'node:(fs|crypto|child_process)'/.test(read(name)));
        expect(offenders).toEqual([]);
    });

    it('reuses CA-10s effect journal reader instead of parsing the journal again', () => {
        expect(read('effectEvidenceSource.ts')).toContain("from '../../../effect/effectJournal.js'");
        // No module builds a journal path or parses journal lines of its own:
        // the accepted readers own both, and a second one would be a second
        // answer to "what does the journal say?".
        const parsers = capsuleFiles().filter((name) => /JSON\.parse\([^)]*split|'journal'/.test(read(name)));
        expect(parsers).toEqual([]);
    });

    it('never re-implements routing classification', () => {
        const offenders = capsuleFiles().filter((name) => /classifyRoute|routingPolicy|RoutingRule/.test(read(name)));
        expect(offenders).toEqual([]);
    });

    it('is the only place in src/ that writes the queue or cursor projections', () => {
        // Barrels forward the symbol without being able to call it; a caller
        // that *uses* it outside the capsule is the regression under test.
        const offenders = sourceFiles(SOURCE_ROOT)
            .filter((path) => !path.startsWith(CAPSULE) && !path.endsWith('index.ts'))
            .filter((path) => /writeQueueDocument|writeCursorDocument/.test(readFileSync(path, 'utf8')));
        expect(offenders).toEqual([]);
    });
});

describe('CA-13 model-free guarantee', () => {
    it('invokes no endpoint, adapter, or model from queue, cursor, or replay logic', () => {
        const forbidden = /EndpointAdapter|opencode|hermes|invokeEndpoint|DecisionEnvelope|contextBroker/i;
        const offenders = capsuleFiles().filter((name) => forbidden.test(read(name)));
        expect(offenders).toEqual([]);
    });

    it('spawns no process from the capsule', () => {
        const offenders = capsuleFiles().filter((name) => /spawn\(|execFile|child_process/.test(read(name)));
        expect(offenders).toEqual([]);
    });

    it('reaches the NVB task boundary from exactly one module', () => {
        const callers = capsuleFiles()
            .filter((name) => name !== 'index.ts')
            .filter((name) => /LaneTaskInvocation|runner\.run\(/.test(read(name)));
        expect(callers).toEqual([TASK_BOUNDARY_MODULE]);
    });

    it('never prepares an invocation envelope for its read-only task', () => {
        const offenders = capsuleFiles().filter((name) => /invocationEnvelope:/.test(read(name)));
        expect(offenders).toEqual([]);
    });

    it('positive control: the forbidden-import scan can actually fail', () => {
        expect(/EndpointAdapter/i.test("import {HermesEndpointAdapter} from 'x';")).toBeTrue();
    });
});
