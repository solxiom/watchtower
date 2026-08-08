/**
 * CA-13 correction-01 F4 — packaged watcher/coordinator task integration.
 *
 * Two ends are proved separately and then together: the packaged handler's
 * bounded scan over a *real* journal file, and the foundation binding that
 * reaches it through the `LaneTaskRunner` boundary. The catalog surface itself
 * is asserted against the composed `task-catalog.json`, because a handler that
 * exists but is not reachable through the single NVB boundary would satisfy
 * neither the interface nor the reviewer.
 */
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {
    isContainedLaneDir, isPollTriggersInput, journalPathFor, MAX_POLL_LIMIT
} from '../../../runtime-nvb/handlers/coordinatorWatch/coordinatorWatchTaskContracts.js';
import {runPollTriggers} from '../../../runtime-nvb/handlers/coordinatorWatch/pollTriggersScan.js';
import {POLL_TRIGGERS_ACTION, triggerIngestFromTask} from '../../../src/foundation/lane/coordinator/queue/laneTaskTriggerIngest.js';
import type {CoordinatorTaskRunner} from '../../../src/foundation/lane/coordinator/queue/laneTaskTriggerIngest.js';
import type {LaneRuntimeContext, LaneTaskInvocation, LaneTaskRunResult} from '../../../src/contracts/taskRuntime.js';
import {LANE_ID, makeLaneDir, removeLaneDir} from './support/queueFixtures.js';

const CATALOG = JSON.parse(readFileSync(join(process.cwd(), 'runtime-nvb', 'task-catalog.json'), 'utf8')) as {
    actions: Record<string, {taskId: string}>;
    handlers: Record<string, {module: string}>;
    schemas: Record<string, {path: string}>;
    tasks: Record<string, {handlerId: string; mutationClass: string; requiresInvocationEnvelope: boolean; leafIds: string[]; inputSchema: string; resultSchema: string}>;
};

const TASK_ID = 'wt:coordinator:poll-triggers';

function baseInput(laneDir: string, overrides: Record<string, unknown> = {}) {
    return {
        schemaVersion: 1, operation: 'poll-triggers', laneDir, fromSequence: 0, fromByteOffset: 0,
        expected: null, limit: 128, ...overrides
    };
}

function writeJournal(laneDir: string, lines: readonly string[]): void {
    const directory = join(laneDir, 'coordinator', 'journal');
    mkdirSync(directory, {recursive: true});
    writeFileSync(join(directory, 'coordinator-events.jsonl'), lines.map((line) => `${line}\n`).join(''));
}

function event(sequence: number, overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        schemaVersion: 1, eventId: `event-${sequence}`, type: 'handoff', sequence,
        at: '2026-08-08T00:00:00.000Z', laneId: LANE_ID, producer: 'watchtower-watcher',
        correlationId: `correlation-${sequence}`, causationId: null, policyVersion: 'policy-1',
        payload: {}, ...overrides
    });
}

function runnerOf(result: unknown, outcome: LaneTaskRunResult['outcome'] = 'completed'): CoordinatorTaskRunner & {seen: LaneTaskInvocation[]} {
    const seen: LaneTaskInvocation[] = [];
    return {
        seen,
        async run(invocation: LaneTaskInvocation): Promise<LaneTaskRunResult> {
            seen.push(invocation);
            return {outcome, actionId: invocation.actionId, taskId: TASK_ID, runId: 'run-1',
                startedAt: null, finishedAt: null, result, events: []} as unknown as LaneTaskRunResult;
        }
    };
}

const CONTEXT = {laneDir: '/lanes/demo', laneId: LANE_ID} as unknown as LaneRuntimeContext;

describe('CA-13 packaged poll-triggers catalog surface (F4)', () => {
    it('declares the action, handler, task, and both schemas in the composed catalog', () => {
        expect(CATALOG.actions[POLL_TRIGGERS_ACTION]?.taskId).toBe(TASK_ID);
        expect(CATALOG.handlers.CoordinatorWatchTaskHandler?.module).toBe('./handlers/CoordinatorWatchTaskHandler.js');
        expect(CATALOG.schemas['watchtower://runtime/schemas/coordinator-poll-triggers-input/v1']).toBeDefined();
        expect(CATALOG.schemas['watchtower://runtime/schemas/coordinator-poll-triggers-result/v1']).toBeDefined();
    });

    it('is read-only, envelope-free, and reaches no cataloged leaf', () => {
        const task = CATALOG.tasks[TASK_ID];
        expect(task.handlerId).toBe('CoordinatorWatchTaskHandler');
        expect(task.mutationClass).toBe('read-only');
        expect(task.requiresInvocationEnvelope).toBeFalse();
        expect(task.leafIds).toEqual([]);
    });

    it('is the only coordinator action CA-13 contributes to the catalog', () => {
        const coordinatorActions = Object.keys(CATALOG.actions).filter((action) => action.startsWith('coordinator.'));
        expect(coordinatorActions).toEqual(['coordinator.index.apply', 'coordinator.index.build', POLL_TRIGGERS_ACTION]);
    });
});

describe('CA-13 packaged poll-triggers scan', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('returns typed candidates with byte offsets and the journal identity', () => {
        writeJournal(laneDir, [event(0), event(1, {type: 'blocked', batchId: 'CA-13'})]);

        const result = runPollTriggers(baseInput(laneDir) as never);

        expect(result.ok).toBeTrue();
        if (!result.ok) return;
        expect(result.candidates.map((candidate) => candidate.eventType)).toEqual(['handoff', 'blocked']);
        expect(result.candidates[1].batchId).toBe('CA-13');
        expect(result.candidates[0].byteOffset).toBeGreaterThan(0);
        expect(result.candidates[1].byteOffset).toBeGreaterThan(result.candidates[0].byteOffset);
        expect(result.candidates[0].recordDigest).toMatch(/^sha256-anchor:[0-9a-f]{64}$/);
        expect(result.partialTail).toBeFalse();
    });

    it('honours the cursor position and the bounded limit', () => {
        writeJournal(laneDir, [event(0), event(1), event(2), event(3)]);
        const afterFirst = Buffer.byteLength(`${event(0)}\n`);

        const result = runPollTriggers(baseInput(laneDir, {fromSequence: 1, fromByteOffset: afterFirst, limit: 2}) as never);

        expect(result.ok).toBeTrue();
        if (result.ok) {
            expect(result.candidates.map((candidate) => candidate.sequence)).toEqual([1, 2]);
            // Stopped on the record bound with journal left over, so the page is
            // not exhausted and the next poll resumes at the reported offset.
            expect(result.exhausted).toBeFalse();
            expect(result.endByteOffset).toBe(Buffer.byteLength([event(0), event(1), event(2)].map((line) => `${line}\n`).join('')));
        }
    });

    it('reads nothing before the cursor offset, so page cost is independent of history', () => {
        // 400 records ahead of the cursor; the poll must touch only the one page
        // that follows the offset, never the 399 records before it.
        const lines = Array.from({length: 400}, (_unused, sequence) => event(sequence));
        writeJournal(laneDir, lines);
        const offset = Buffer.byteLength(lines.slice(0, 399).map((line) => `${line}\n`).join(''));

        const result = runPollTriggers(baseInput(laneDir, {fromSequence: 399, fromByteOffset: offset, limit: 10}) as never);

        expect(result.ok).toBeTrue();
        if (result.ok) {
            expect(result.candidates.map((candidate) => candidate.sequence)).toEqual([399]);
            expect(result.exhausted).toBeTrue();
        }
    });

    it('refuses a cursor offset that does not land on the claimed sequence, with no full rescan', () => {
        writeJournal(laneDir, [event(0), event(1), event(2)]);

        // The offset names record 0 while the cursor claims sequence 2 — a
        // rebuilt or rewritten journal. Rescanning from zero would answer this
        // with an unbounded read and re-deliver every historical event.
        const result = runPollTriggers(baseInput(laneDir, {fromSequence: 2, fromByteOffset: 0}) as never);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.failure.code).toBe('COORDINATOR_POLL_CURSOR_MISMATCH');
    });

    it('refuses a cursor offset past the end of the journal', () => {
        writeJournal(laneDir, [event(0)]);

        const result = runPollTriggers(baseInput(laneDir, {fromSequence: 1, fromByteOffset: 1_000_000}) as never);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.failure.code).toBe('COORDINATOR_POLL_CURSOR_MISMATCH');
    });

    it('reports an exhausted empty page when the cursor already stands at the journal end', () => {
        writeJournal(laneDir, [event(0)]);
        const end = Buffer.byteLength(`${event(0)}\n`);

        const result = runPollTriggers(baseInput(laneDir, {fromSequence: 1, fromByteOffset: end}) as never);

        expect(result.ok).toBeTrue();
        if (result.ok) {
            expect(result.candidates).toEqual([]);
            expect(result.exhausted).toBeTrue();
            expect(result.endByteOffset).toBe(end);
        }
    });

    it('reports a partial final line without repairing it', () => {
        const directory = join(laneDir, 'coordinator', 'journal');
        mkdirSync(directory, {recursive: true});
        writeFileSync(join(directory, 'coordinator-events.jsonl'), `${event(0)}\n${event(1).slice(0, 20)}`);

        const result = runPollTriggers(baseInput(laneDir) as never);

        expect(result.ok).toBeTrue();
        if (result.ok) {
            expect(result.partialTail).toBeTrue();
            expect(result.candidates.length).toBe(1);
        }
    });

    it('refuses a missing journal with one typed reason', () => {
        const result = runPollTriggers(baseInput(laneDir) as never);
        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.failure.code).toBe('COORDINATOR_POLL_JOURNAL_UNREADABLE');
    });

    it('refuses a corrupt record rather than skipping it', () => {
        writeJournal(laneDir, [event(0), '{"schemaVersion":1,"eventId":""}']);
        const result = runPollTriggers(baseInput(laneDir) as never);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.failure.code).toBe('COORDINATOR_POLL_JOURNAL_UNREADABLE');
    });

    it('refuses a traversal or relative lane directory before reading anything', () => {
        for (const laneDirValue of ['relative/lane', '/lanes/../etc', '/lanes/./demo']) {
            const result = runPollTriggers(baseInput(laneDirValue) as never);
            expect(result.ok).withContext(laneDirValue).toBeFalse();
            if (!result.ok) expect(result.failure.code).toBe('COORDINATOR_POLL_PATH_ESCAPE');
        }
    });

    it('derives the journal path from the lane directory and never accepts one', () => {
        expect(journalPathFor('/lanes/demo')).toBe('/lanes/demo/coordinator/journal/coordinator-events.jsonl');
        expect(journalPathFor('/lanes/demo/')).toBe('/lanes/demo/coordinator/journal/coordinator-events.jsonl');
        expect(isContainedLaneDir('/lanes/demo')).toBeTrue();
        expect(isContainedLaneDir('/lanes/../demo')).toBeFalse();
    });
});

describe('CA-13 packaged poll-triggers input grammar', () => {
    it('accepts exactly the declared input', () => {
        expect(isPollTriggersInput(baseInput('/lanes/demo'))).toBeTrue();
    });

    it('rejects extra, missing, and out-of-range members', () => {
        expect(isPollTriggersInput({...baseInput('/lanes/demo'), extra: 1})).toBeFalse();
        expect(isPollTriggersInput({schemaVersion: 1, operation: 'poll-triggers', laneDir: '/x', limit: 1})).toBeFalse();
        expect(isPollTriggersInput(baseInput('/lanes/demo', {fromByteOffset: -1}))).toBeFalse();
        expect(isPollTriggersInput(baseInput('/lanes/demo', {fromByteOffset: 1.5}))).toBeFalse();
        expect(isPollTriggersInput(baseInput('/lanes/demo', {limit: MAX_POLL_LIMIT + 1}))).toBeFalse();
        expect(isPollTriggersInput(baseInput('/lanes/demo', {limit: 0}))).toBeFalse();
        expect(isPollTriggersInput(baseInput('/lanes/demo', {fromSequence: -1}))).toBeFalse();
        expect(isPollTriggersInput(baseInput('/lanes/demo', {operation: 'apply-effect'}))).toBeFalse();
        expect(isPollTriggersInput(baseInput('/lanes/demo', {schemaVersion: 2}))).toBeFalse();
        expect(isPollTriggersInput([])).toBeFalse();
        expect(isPollTriggersInput(null)).toBeFalse();
    });
});

describe('CA-13 LaneTaskRunner composition root (F4)', () => {
    it('invokes the allowlisted read-only action with no invocation envelope', async () => {
        const runner = runnerOf({
            schemaVersion: 1, ok: true, operation: 'poll-triggers', partialTail: false,
            journalByteLength: 4096,
            candidates: [{eventId: 'event-0', sequence: 0, eventType: 'handoff', correlationId: 'c0', batchId: null, at: 'now', byteOffset: 120, recordDigest: 'sha256-anchor:abc'}]
        });

        const page = await triggerIngestFromTask(runner, CONTEXT).scan({fromSequence: 0, fromByteOffset: 0, limit: 64, expected: null});

        expect(runner.seen.length).toBe(1);
        expect(runner.seen[0].actionId).toBe(POLL_TRIGGERS_ACTION);
        expect(runner.seen[0].invocationEnvelope).toBeUndefined();
        expect(runner.seen[0].input as unknown as Record<string, unknown>).toEqual({
            schemaVersion: 1, operation: 'poll-triggers', laneDir: '/lanes/demo', fromSequence: 0,
            fromByteOffset: 0, expected: null, limit: 64
        } as Record<string, unknown>);
        expect(page.candidates.length).toBe(1);
        expect(page.candidates[0].byteOffset).toBe(120);
        // The record's own anchor digest, carried as the §9 prefix digest; the
        // task claims no whole-journal identity.
        expect(page.candidates[0].prefixDigest).toBe('sha256-anchor:abc');
        expect(page.candidates[0].journalIdentity).toBeUndefined();
        expect(page.byteLength).toBe(4096);
    });

    it('fails closed when the task does not complete', async () => {
        const runner = runnerOf(null, 'failed');
        await expectAsync(triggerIngestFromTask(runner, CONTEXT).scan({fromSequence: 0, fromByteOffset: 0, limit: 64, expected: null}))
            .toBeRejectedWithError(/did not complete/);
    });

    it('fails closed on a refused scan and names the packaged failure code', async () => {
        const runner = runnerOf({schemaVersion: 1, ok: false, failure: {code: 'COORDINATOR_POLL_PATH_ESCAPE'}});
        await expectAsync(triggerIngestFromTask(runner, CONTEXT).scan({fromSequence: 0, fromByteOffset: 0, limit: 64, expected: null}))
            .toBeRejectedWithError(/COORDINATOR_POLL_PATH_ESCAPE/);
    });

    it('validates the returned candidates instead of trusting the packaged result', async () => {
        const runner = runnerOf({
            schemaVersion: 1, ok: true, operation: 'poll-triggers', partialTail: false,
            journalByteLength: 4096, candidates: [{eventId: '', sequence: 0}]
        });
        await expectAsync(triggerIngestFromTask(runner, CONTEXT).scan({fromSequence: 0, fromByteOffset: 0, limit: 64, expected: null}))
            .toBeRejectedWithError(/eventId/);
    });

    it('end-to-end: a real journal scan reaches the foundation contract unchanged', async () => {
        const laneDir = makeLaneDir();
        try {
            writeJournal(laneDir, [event(0), event(1)]);
            // The runner stands in for the NVB process boundary and returns
            // exactly what the packaged handler produces for this journal.
            const runner = runnerOf(runPollTriggers(baseInput(laneDir) as never));
            const page = await triggerIngestFromTask(runner, {...CONTEXT, laneDir} as LaneRuntimeContext)
                .scan({fromSequence: 0, fromByteOffset: 0, limit: 128, expected: null});

            expect(page.candidates.map((candidate) => candidate.eventId)).toEqual(['event-0', 'event-1']);
            expect(page.candidates[1].byteOffset).toBeGreaterThan(0);
            expect(page.candidates[0].prefixDigest).toMatch(/^sha256-anchor:/);
            expect(page.byteLength).toBeGreaterThan(0);
        } finally {
            removeLaneDir(laneDir);
        }
    });
});
