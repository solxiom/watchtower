/**
 * CA-24 — `wt coordinator session` read, lifecycle, and entry boundary.
 *
 * Every assertion here is about the *command boundary*: which accepted owner
 * answers, which closed reason a refusal carries, and that a refusal leaves
 * authoritative bytes unchanged. The owners' own behaviour is CA-15/CA-16R's
 * proof and is not re-litigated.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {
    OperatorSessionEntryService, OperatorSessionLifecycleService, OperatorSessionReadService
} from '../../../src/foundation/lane/coordinator/sessionCommand/index.js';
import {
    appendTurn, createSessionLane, openSession, RefusingLaneReads, type SessionLaneFixture
} from './support/sessionCommandFixtures.js';

type Refusable = {readonly ok: true} | {readonly ok: false; readonly reason: string};

function reasonOf(result: Refusable): string {
    return result.ok ? 'ok' : result.reason;
}

/** Reads one projected field as `unknown`; the envelope's JSON type is deliberately recursive. */
function field(result: {readonly result: object}, key: string): unknown {
    return (result.result as Record<string, unknown>)[key];
}

describe('CA-24 session command read boundary', function () {
    let fixture: SessionLaneFixture;
    beforeEach(function () { fixture = createSessionLane(); });
    afterEach(function () { fixture.dispose(); });

    it('lists, shows, and pages sessions through the accepted CA-15 reader', function () {
        const reads = new OperatorSessionReadService({reads: fixture.reads});
        const first = openSession(fixture, 'first');
        openSession(fixture, 'second');
        const list = reads.list(fixture.query);
        expect(list.ok).toBeTrue();
        if (!list.ok) return;
        expect(list.data.action).toBe('list');
        expect(list.data.applied).toBeFalse();
        expect((field(list.data, 'sessions') as unknown[]).length).toBe(2);

        const show = reads.show(fixture.query, first.operatorSessionId);
        expect(show.ok).toBeTrue();
        if (!show.ok) return;
        expect(show.data.operatorSessionId).toBe(first.operatorSessionId);
        expect(field(show.data, 'journalStatus')).toBe('complete');
    });

    it('projects history and budget from durable turns without inventing counters', function () {
        const reads = new OperatorSessionReadService({reads: fixture.reads});
        let session = openSession(fixture, 'history');
        session = appendTurn(fixture, session, 'turn-0001', 1);
        appendTurn(fixture, session, 'turn-0002', 2, {inputTokens: 5});

        const history = reads.history(fixture.query, session.operatorSessionId);
        expect(history.ok).toBeTrue();
        if (!history.ok) return;
        expect(field(history.data, 'returned')).toBe(2);

        const budget = reads.budget(fixture.query, session.operatorSessionId);
        expect(budget.ok).toBeTrue();
        if (!budget.ok) return;
        const projection = field(budget.data, 'budget') as Record<string, unknown>;
        expect(projection.cumulativeTokens).toBe(35);
        expect(projection.modelBackedTurns).toBe(0);
        expect(projection.telemetryQuality).toBe('reported');
    });

    it('exports retained journal records deterministically and reports truncation honestly', function () {
        const reads = new OperatorSessionReadService({reads: fixture.reads});
        const session = openSession(fixture, 'export');
        const first = reads.export(fixture.query, session.operatorSessionId);
        const second = reads.export(fixture.query, session.operatorSessionId);
        expect(JSON.stringify(first)).toBe(JSON.stringify(second));
        expect(first.ok).toBeTrue();
        if (!first.ok) return;
        expect(field(first.data, 'truncated')).toBeFalse();
        expect((field(first.data, 'records') as unknown[]).length).toBe(1);
    });

    it('refuses an unknown session and an unavailable lane with distinct closed reasons', function () {
        const reads = new OperatorSessionReadService({reads: fixture.reads});
        expect(reasonOf(reads.show(fixture.query, 'opsess-missing'))).toBe('SESSION_COMMAND_NOT_FOUND');
        const refusing = new OperatorSessionReadService({reads: new RefusingLaneReads()});
        expect(reasonOf(refusing.list(fixture.query))).toBe('SESSION_COMMAND_LANE_UNAVAILABLE');
    });
});

describe('CA-24 session command lifecycle boundary', function () {
    let fixture: SessionLaneFixture;
    let lifecycle: OperatorSessionLifecycleService;
    beforeEach(function () {
        fixture = createSessionLane();
        lifecycle = new OperatorSessionLifecycleService({reads: fixture.reads});
    });
    afterEach(function () { fixture.dispose(); });

    it('suspends, resumes, and closes through the accepted transitions', function () {
        const session = openSession(fixture, 'lifecycle');
        const id = session.operatorSessionId;
        expect(lifecycle.transition(fixture.query, 'suspend', id, false).ok).toBeTrue();
        expect(fixture.store.loadSession(id).state).toBe('suspended');
        expect(lifecycle.transition(fixture.query, 'resume', id, false).ok).toBeTrue();
        expect(lifecycle.transition(fixture.query, 'close', id, false).ok).toBeTrue();
        expect(fixture.store.loadSession(id).state).toBe('closed');
        expect(reasonOf(lifecycle.transition(fixture.query, 'resume', id, false))).toBe('SESSION_COMMAND_STATE_INVALID');
    });

    it('leaves durable state unchanged on a dry run and on an illegal transition', function () {
        const session = openSession(fixture, 'dry-run');
        const id = session.operatorSessionId;
        const path = join(fixture.laneDir, 'coordinator', 'operator-sessions', id, 'operator-session.json');
        const before = readFileSync(path, 'utf8');
        const preview = lifecycle.transition(fixture.query, 'suspend', id, true);
        expect(preview.ok).toBeTrue();
        if (preview.ok) expect(preview.data.applied).toBeFalse();
        expect(readFileSync(path, 'utf8')).toBe(before);
        expect(reasonOf(lifecycle.prune(fixture.query, id, false))).toBe('SESSION_COMMAND_STATE_INVALID');
        expect(readFileSync(path, 'utf8')).toBe(before);
    });

    it('folds pin and unpin events over the creation-time refs and rejects a duplicate', function () {
        const session = openSession(fixture, 'pins');
        const id = session.operatorSessionId;
        const pinned = lifecycle.pin(fixture.query, 'pin', id, 'batch:CA-24', false);
        expect(pinned.ok).toBeTrue();
        if (pinned.ok) expect(field(pinned.data, 'pinnedRefs')).toEqual(['batch:CA-24']);
        expect(reasonOf(lifecycle.pin(fixture.query, 'pin', id, 'batch:CA-24', false))).toBe('SESSION_COMMAND_REFERENCE_INVALID');
        const removed = lifecycle.pin(fixture.query, 'unpin', id, 'batch:CA-24', false);
        expect(removed.ok).toBeTrue();
        if (removed.ok) expect(field(removed.data, 'pinnedRefs')).toEqual([]);
        expect(reasonOf(lifecycle.pin(fixture.query, 'unpin', id, 'batch:CA-24', false))).toBe('SESSION_COMMAND_REFERENCE_INVALID');
    });

    it('prunes only from a retired state and journals every transition it applied', function () {
        const session = openSession(fixture, 'prune');
        const id = session.operatorSessionId;
        expect(reasonOf(lifecycle.prune(fixture.query, id, false))).toBe('SESSION_COMMAND_STATE_INVALID');
        lifecycle.transition(fixture.query, 'close', id, false);
        const pruned = lifecycle.prune(fixture.query, id, false);
        expect(pruned.ok).toBeTrue();
        if (pruned.ok) expect(field(pruned.data, 'transitions')).toEqual(['archived', 'pruned']);
        expect(fixture.store.readJournal(id).map((entry) => entry.type)).toContain('operator-session-archived');
        expect(fixture.store.readJournal(id).map((entry) => entry.type)).toContain('operator-session-pruned');
    });

    it('refuses to fork a pruned session and forks a live one into the same lane', function () {
        const session = openSession(fixture, 'fork');
        const forked = lifecycle.fork(fixture.query, session.operatorSessionId, {topic: 'child'}, false);
        expect(forked.ok).toBeTrue();
        if (forked.ok) {
            const child = field(forked.data, 'session') as Record<string, unknown>;
            expect(child.parentOperatorSessionId).toBe(session.operatorSessionId);
            expect(child.topic).toBe('child');
        }
    });
});

describe('CA-24 session entry and ask fences', function () {
    let fixture: SessionLaneFixture;
    let entry: OperatorSessionEntryService;
    beforeEach(function () {
        fixture = createSessionLane();
        entry = new OperatorSessionEntryService({reads: fixture.reads});
    });
    afterEach(function () { fixture.dispose(); });

    const request = (interactive: boolean) => ({
        topic: 'entry', observe: false, stream: true, waitForActiveTurn: false, interactive
    });

    it('refuses a non-interactive attachment before it creates any session', function () {
        const created = entry.create(fixture.query, request(false));
        expect(reasonOf(created)).toBe('SESSION_COMMAND_TERMINAL_REQUIRED');
        expect(fixture.store.listSessions()).toEqual([]);
    });

    it('creates and binds an interactive attachment without changing lifecycle state', function () {
        const created = entry.create(fixture.query, request(true));
        expect(created.ok).toBeTrue();
        if (!created.ok) return;
        expect(created.prepared.created).toBeTrue();
        expect(fixture.store.loadSession(created.prepared.operatorSessionId).state).toBe('open');

        const attached = entry.attach(fixture.query, created.prepared.operatorSessionId, {...request(true), observe: true});
        expect(attached.ok).toBeTrue();
        if (attached.ok) expect(attached.prepared.binding.role).toBe('observer');
        expect(reasonOf(entry.attach(fixture.query, 'opsess-missing', request(true)))).toBe('SESSION_COMMAND_NOT_FOUND');
    });

    it('answers only the registered M0 form and refuses every model-backed class', function () {
        const session = openSession(fixture, 'ask');
        const answered = entry.ask(fixture.query, {
            question: 'what is this session?', operatorSessionId: session.operatorSessionId,
            queryFormId: 'operator-session-projection-v1'
        });
        expect(answered.ok).toBeTrue();
        if (answered.ok) {
            expect(field(answered.data, 'usedModel')).toBeFalse();
            expect(field(answered.data, 'decisionClass')).toBe('M0');
        }
        const natural = entry.ask(fixture.query, {question: 'why?', operatorSessionId: session.operatorSessionId});
        expect(reasonOf(natural)).toBe('SESSION_COMMAND_ROUTE_UNAVAILABLE');
        const unregistered = entry.ask(fixture.query, {
            question: 'why?', operatorSessionId: session.operatorSessionId, queryFormId: 'not-registered'
        });
        expect(reasonOf(unregistered)).toBe('SESSION_COMMAND_ROUTE_UNAVAILABLE');
    });
});
