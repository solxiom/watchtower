import {appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {OperatorSessionError, SessionLifecycle, SessionStore, type TurnRecord} from '../../src/foundation/lane/coordinator/session/index.js';

describe('SessionStore and SessionLifecycle', function () {
    let laneDir: string;
    let sequence: number;
    let store: SessionStore;

    beforeEach(function () {
        laneDir = mkdtempSync(join(tmpdir(), 'watchtower-session-spec-'));
        sequence = 0;
        store = new SessionStore({
            laneDir,
            idFactory: () => `opsess-${++sequence}`,
            now: () => '2026-08-05T00:00:00.000Z'
        });
    });

    afterEach(function () { rmSync(laneDir, {recursive: true, force: true}); });

    it('creates many isolated sessions with durable identities and opening events', function () {
        const first = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'first'});
        const second = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'second', tags: ['triage']});
        const third = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'third'});

        expect(store.listSessions()).toEqual([first, second, third]);
        expect(store.readJournal(second.operatorSessionId).map(entry => entry.type)).toEqual(['operator-session-opened']);
        expect(JSON.parse(readFileSync(join(laneDir, 'coordinator/operator-sessions', first.operatorSessionId, 'operator-session.json'), 'utf8')).state).toBe('open');
        expect(store.listSessions({tags: ['triage']})).toEqual([second]);
        expect(store.listSessions({cursor: Buffer.from(first.operatorSessionId).toString('base64url')})).toEqual([second, third]);
    });

    it('enforces the lifecycle, one active turn, and closed-history immutability', function () {
        const session = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'lifecycle'});
        const lifecycle = new SessionLifecycle({store, now: () => '2026-08-05T00:00:00.000Z'});
        const active = lifecycle.startTurn(session);
        expectCode(() => lifecycle.startTurn(active), 'OPERATOR_SESSION_TURN_ACTIVE');
        expectCode(() => lifecycle.transition(active, 'closed', 'active turn cannot close'), 'OPERATOR_SESSION_STATE_INVALID');
        const open = lifecycle.completeTurn(active);
        const suspended = lifecycle.transition(open, 'suspended', 'operator paused');
        const resumed = lifecycle.transition(suspended, 'open', 'operator resumed');
        const closed = lifecycle.transition(resumed, 'closed', 'operator finished');
        expect(closed.state).toBe('closed');
        expect(store.readJournal(session.operatorSessionId).map(entry => entry.type)).toEqual([
            'operator-session-opened', 'operator-session-turn-routed', 'operator-session-response-complete',
            'operator-session-suspended', 'operator-session-resumed', 'operator-session-closed'
        ]);
        expectCode(() => lifecycle.transition(closed, 'open', 'invalid reopen'), 'OPERATOR_SESSION_STATE_INVALID');
        expectCode(() => store.appendTurn(session.operatorSessionId, turn(session.operatorSessionId, 'turn-0001')), 'OPERATOR_SESSION_STATE_INVALID');
    });

    it('stores and reads complete turns, paginates, and ignores an incomplete final journal line', function () {
        const session = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'turns'});
        const active = new SessionLifecycle({store}).startTurn(session, 'turn-0001');
        store.appendTurn(active.operatorSessionId, turn(active.operatorSessionId, 'turn-0001'));
        expect(store.readTurn(session.operatorSessionId, 'turn-0001').operatorMessage.content).toBe('hello');
        expect(store.listTurns(session.operatorSessionId, {limit: 1})).toHaveSize(1);
        const journal = join(laneDir, 'coordinator/operator-sessions', session.operatorSessionId, 'journal.jsonl');
        appendFileSync(journal, '{"partial":');
        expect(store.readJournal(session.operatorSessionId)).toHaveSize(4);
        expect(store.readJournalResult(session.operatorSessionId).status).toBe('recoverable-incomplete-final-line');
        const opening = store.readJournal(session.operatorSessionId)[0];
        expectCode(() => store.appendJournalEntry(session.operatorSessionId, {...opening, eventId: 'evt-recovery', sequence: 5, type: 'operator-session-pinned', payload: {reference: 'recovery'}}), 'OPERATOR_SESSION_JOURNAL_RECOVERY_REQUIRED');
        expect(store.recoverJournal(session.operatorSessionId).status).toBe('complete');
        expect(existsSync(join(laneDir, 'coordinator/operator-sessions', session.operatorSessionId, 'turns/turn-0001/operator.md'))).toBeTrue();
    });

    it('forks with only explicitly selected pins and turn references', function () {
        const parent = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'parent', pinnedRefs: ['hidden']});
        const active = new SessionLifecycle({store}).startTurn(parent, 'turn-0001');
        store.appendTurn(active.operatorSessionId, turn(active.operatorSessionId, 'turn-0001'));
        const child = new SessionLifecycle({store}).forkSession(store.loadSession(parent.operatorSessionId), {pinnedRefs: ['chosen'], turnRefs: ['turn-0001']});
        expect(child.operatorSessionId).not.toBe(parent.operatorSessionId);
        expect(child.parentOperatorSessionId).toBe(parent.operatorSessionId);
        expect(child.pinnedRefs).toEqual(['chosen']);
        expect(store.readJournal(child.operatorSessionId).map(entry => entry.type)).toEqual(['operator-session-opened', 'operator-session-forked']);
    });
});

describe('CA-15 correction-01 adversarial boundaries', function () {
    let laneDir: string;
    let store: SessionStore;

    beforeEach(function () {
        laneDir = mkdtempSync(join(tmpdir(), 'watchtower-session-adversarial-'));
        store = new SessionStore({laneDir, idFactory: () => 'opsess-one', now: () => '2026-08-05T00:00:00.000Z'});
    });
    afterEach(function () { rmSync(laneDir, {recursive: true, force: true}); });

    it('enforces one durable active turn across independent store instances', function () {
        const firstStore = store;
        const secondStore = new SessionStore({laneDir, now: () => '2026-08-05T00:00:00.000Z'});
        const session = firstStore.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'fence'});
        const first = new SessionLifecycle({store: firstStore}).startTurn(session, 'turn-0001');
        expect(first.activeTurnId).toBe('turn-0001');
        expectCode(() => new SessionLifecycle({store: secondStore}).startTurn(session, 'turn-0002'), 'OPERATOR_SESSION_TURN_ACTIVE');
        expect(secondStore.loadSession(session.operatorSessionId).activeTurnId).toBe('turn-0001');
    });

    it('fences concurrent child processes at the durable start-turn boundary', async function () {
        const session = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'process-fence'});
        const moduleUrl = pathToFileURL(join(process.cwd(), 'build/src/foundation/lane/coordinator/session/index.js')).href;
        const script = `import {SessionLifecycle, SessionStore} from ${JSON.stringify(moduleUrl)}; const session = JSON.parse(process.argv[1]); try { new SessionLifecycle({store: new SessionStore(process.env.LANE_DIR)}).startTurn(session, process.argv[2]); process.stdout.write('ok'); } catch (error) { process.stdout.write(error.code ?? 'error'); process.exitCode = 2; }`;
        const run = (turnId: string) => new Promise<string>(resolve => {
            const child = spawn(process.execPath, ['--input-type=module', '-e', script, JSON.stringify(session), turnId], {cwd: process.cwd(), env: {...process.env, LANE_DIR: laneDir}});
            let output = ''; child.stdout.on('data', chunk => { output += chunk.toString(); }); child.on('close', () => resolve(output));
        });
        const results = await Promise.all([run('turn-child-a'), run('turn-child-b')]);
        expect(results.filter(result => result === 'ok')).toHaveSize(1);
        expect(results.filter(result => result === 'OPERATOR_SESSION_TURN_ACTIVE')).toHaveSize(1);
    });

    it('recovers an interrupted eighth journal write and resumes through ten entries', function () {
        const session = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'recovery'});
        for (let index = 2; index <= 7; index++) store.appendEvent(session.operatorSessionId, 'operator-session-pinned', {reference: `ref-${index}`});
        const journal = join(laneDir, 'coordinator/operator-sessions', session.operatorSessionId, 'journal.jsonl');
        appendFileSync(journal, '{"schemaVersion":1,"eventId":"evt-partial"');
        const interrupted = store.readJournalResult(session.operatorSessionId);
        expect(interrupted.status).toBe('recoverable-incomplete-final-line');
        expect(interrupted.entries).toHaveSize(7);
        expect(store.recoverJournal(session.operatorSessionId).nextSequence).toBe(8);
        for (let index = 8; index <= 10; index++) store.appendEvent(session.operatorSessionId, 'operator-session-pinned', {reference: `ref-${index}`});
        expect(store.readJournal(session.operatorSessionId)).toHaveSize(10);
    });

    it('rejects stale journal sequences, replay conflicts, and illegal transitions', function () {
        const session = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'replay'});
        const opening = store.readJournal(session.operatorSessionId)[0];
        expectCode(() => store.appendJournalEntry(session.operatorSessionId, {...opening, eventId: 'evt-new', sequence: 3, type: 'operator-session-pinned', payload: {reference: 'stale'}}), 'OPERATOR_SESSION_JOURNAL_SEQUENCE_INVALID');
        expectCode(() => store.appendJournalEntry(session.operatorSessionId, {...opening, type: 'operator-session-pinned', payload: {reference: 'replay'}}), 'OPERATOR_SESSION_JOURNAL_REPLAY_CONFLICT');
        const lifecycle = new SessionLifecycle({store});
        const closed = lifecycle.transition(lifecycle.transition(session, 'closed', 'close'), 'closed', 'idempotent close');
        expect(closed.state).toBe('closed');
        expectCode(() => lifecycle.transition(closed, 'open', 'illegal reopen'), 'OPERATOR_SESSION_STATE_INVALID');
        const archived = lifecycle.transition(closed, 'archived', 'archive');
        expectCode(() => lifecycle.transition(archived, 'open', 'illegal archived reopen'), 'OPERATOR_SESSION_STATE_INVALID');
    });

    it('does not allow metadata events to forge lifecycle state or active-turn ownership', function () {
        const session = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'authority'});
        expectCode(() => appendUnsafeEvent(store, session.operatorSessionId, 'operator-session-pinned', {reference: 'safe', state: 'closed'}), 'OPERATOR_SESSION_STATE_INVALID');
        expectCode(() => appendUnsafeEvent(store, session.operatorSessionId, 'operator-session-pinned', {reference: 'safe', state: 'active-turn', activeTurnId: 'turn-0001'}), 'OPERATOR_SESSION_STATE_INVALID');
        expectCode(() => appendUnsafeEvent(store, session.operatorSessionId, 'operator-session-closed', {state: 'closed'}), 'OPERATOR_SESSION_STATE_INVALID');
        const opening = store.readJournal(session.operatorSessionId)[0];
        expectCode(() => store.appendJournalEntry(session.operatorSessionId, {...opening, eventId: 'evt-forged', sequence: 2, type: 'operator-session-pinned', payload: {reference: 'safe', state: 'closed'}}), 'OPERATOR_SESSION_STATE_INVALID');
        expect(store.loadSession(session.operatorSessionId).state).toBe('open');
        expect(store.readJournal(session.operatorSessionId)).toHaveSize(1);
    });

    it('makes direct persistence transitions non-forgeable', function () {
        const session = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'port'});
        expectCode(() => store.transitionSession(session, 'active-turn', 'operator-session-turn-routed', 'forged start'), 'OPERATOR_SESSION_TURN_ACTIVE');
        expectCode(() => store.transitionSession(session, 'closed', 'operator-session-suspended', 'mismatched event'), 'OPERATOR_SESSION_STATE_INVALID');
        const active = new SessionLifecycle({store}).startTurn(session, 'turn-port');
        expectCode(() => store.transitionSession(active, 'closed', 'operator-session-closed', 'skip completion'), 'OPERATOR_SESSION_STATE_INVALID');
        const closed = new SessionLifecycle({store}).transition(new SessionLifecycle({store}).completeTurn(active), 'closed', 'close');
        expectCode(() => store.transitionSession(closed, 'open', 'operator-session-resumed', 'reopen'), 'OPERATOR_SESSION_STATE_INVALID');
        expectCode(() => store.transitionSession({...session, topic: 'stale'}, 'closed', 'operator-session-closed', 'stale'), 'OPERATOR_SESSION_STATE_INVALID');
        expectCode(() => store.transitionSession(closed, 'closed', 'operator-session-closed', 'duplicate'), 'OPERATOR_SESSION_STATE_INVALID');
    });

    it('derives replay authority from lifecycle event type and rejects forged transitions', function () {
        const session = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'replay-authority'});
        const journalPath = join(laneDir, 'coordinator/operator-sessions', session.operatorSessionId, 'journal.jsonl');
        const opening = store.readJournal(session.operatorSessionId)[0];
        appendFileSync(journalPath, `${JSON.stringify({...opening, eventId: 'evt-forged-archive', sequence: 2, type: 'operator-session-archived', payload: {
            reason: 'forged', state: 'archived', activeTurnId: null, turnCount: 0, lastTurnAt: null
        }})}\n`);
        expectCode(() => store.loadSession(session.operatorSessionId), 'OPERATOR_SESSION_NOT_FOUND');
    });

    it('rejects malformed extra identity fields and duplicate journal events', function () {
        const session = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'contracts'});
        const identityPath = join(laneDir, 'coordinator/operator-sessions', session.operatorSessionId, 'operator-session.json');
        const identity = JSON.parse(readFileSync(identityPath, 'utf8')) as Record<string, unknown>;
        writeFileSync(identityPath, JSON.stringify({...identity, unexpected: true}));
        expectCode(() => store.loadSession(session.operatorSessionId), 'OPERATOR_SESSION_NOT_FOUND');
        writeFileSync(identityPath, JSON.stringify(identity));
        const journalPath = join(laneDir, 'coordinator/operator-sessions', session.operatorSessionId, 'journal.jsonl');
        const opening = store.readJournal(session.operatorSessionId)[0];
        appendFileSync(journalPath, `${JSON.stringify({...opening, sequence: 2})}\n`);
        expectCode(() => store.readJournal(session.operatorSessionId), 'OPERATOR_SESSION_JOURNAL_WRITE_FAILED');
    });

    it('keeps authoritative state unchanged when staging fails before journal commit', function () {
        const session = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'fault'});
        const active = new SessionLifecycle({store}).startTurn(session, 'turn-0001');
        const before = readFileSync(join(laneDir, 'coordinator/operator-sessions', session.operatorSessionId, 'operator-session.json'), 'utf8');
        const failing = new SessionStore({laneDir, faultInjector: stage => { if (stage === 'turn-stage-write') throw new Error('injected stage failure'); }});
        expectCode(() => failing.appendTurn(active.operatorSessionId, turn(active.operatorSessionId, 'turn-0001')), 'OPERATOR_SESSION_TURN_WRITE_FAILED');
        expect(readFileSync(join(laneDir, 'coordinator/operator-sessions', session.operatorSessionId, 'operator-session.json'), 'utf8')).toBe(before);
        expect(failing.readJournal(active.operatorSessionId)).toHaveSize(2);
    });

    it('replays a committed turn when identity materialization fails after journal commit', function () {
        const session = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'post-commit'});
        const active = new SessionLifecycle({store}).startTurn(session, 'turn-0001');
        const failing = new SessionStore({laneDir, faultInjector: stage => { if (stage === 'turn-identity-write') throw new Error('injected identity failure'); }});
        expectCode(() => failing.appendTurn(active.operatorSessionId, turn(active.operatorSessionId, 'turn-0001')), 'OPERATOR_SESSION_TURN_WRITE_FAILED');
        expect(failing.loadSession(active.operatorSessionId).state).toBe('open');
        expect(failing.readTurn(active.operatorSessionId, 'turn-0001').turnId).toBe('turn-0001');
    });

    it('validates fork references and refuses closed-turn overwrite', function () {
        const session = store.createSession({laneId: 'lane-1', policyProfileId: 'operator-standard', topic: 'fork'});
        const active = new SessionLifecycle({store}).startTurn(session, 'turn-0001');
        store.appendTurn(active.operatorSessionId, turn(active.operatorSessionId, 'turn-0001'));
        const lifecycle = new SessionLifecycle({store});
        const closed = lifecycle.transition(store.loadSession(active.operatorSessionId), 'closed', 'close');
        expectCode(() => store.appendTurn(closed.operatorSessionId, turn(closed.operatorSessionId, 'turn-0002')), 'OPERATOR_SESSION_STATE_INVALID');
        expectCode(() => lifecycle.forkSession(closed, {turnRefs: ['turn-missing']}), 'OPERATOR_SESSION_REFERENCE_INVALID');
    });
});

function turn(operatorSessionId: string, turnId: string): TurnRecord {
    return {
        schemaVersion: 1, turnId, operatorSessionId, turn: 1, state: 'complete', operatorMessage: {content: 'hello'},
        resolvedRefs: [], unresolvedRefs: [], snapshot: {laneRevision: 1}, decisionClass: null, routingRuleId: null,
        endpointId: null, response: {answer: 'advice'}, usage: {inputTokens: 1, outputTokens: 1}, stale: false,
        completedAt: '2026-08-05T00:00:00.000Z'
    };
}

function expectCode(action: () => void, code: OperatorSessionError['code']): void {
    let thrown: unknown;
    try { action(); } catch (error) { thrown = error; }
    expect(thrown instanceof OperatorSessionError).withContext(`Expected ${code}`).toBeTrue();
    expect((thrown as OperatorSessionError | undefined)?.code).toBe(code);
}

function appendUnsafeEvent(store: SessionStore, sessionId: string, type: string, payload: Record<string, unknown>): void {
    const append = store.appendEvent as unknown as (id: string, eventType: string, eventPayload: Record<string, unknown>) => void;
    append.call(store, sessionId, type, payload);
}
