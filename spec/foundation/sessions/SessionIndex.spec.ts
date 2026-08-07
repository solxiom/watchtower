import {readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {SessionIndexError} from '../../../src/contracts/index.js';
import {SessionIndex} from '../../../src/foundation/index/sessions/index.js';
import {listSessions, MAX_POPULATION, type SessionReadContext} from '../../../src/foundation/index/sessions/sessionIndexReads.js';
import {appendProducerEvent, LANE_ID, newFixture, writeSession, type Fixture} from './support/sessionFixtures.js';

async function build(fixture: Fixture): Promise<void> {
    await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
}

describe('SessionIndex build and bounded queries', () => {
    let fixture: Fixture;
    beforeEach(() => {
        fixture = newFixture();
        writeSession(fixture.sessionsRoot, {
            id: 'opsess-a', pinnedRefs: ['batch:B14', 'turn:turn-a1'],
            turns: [
                {turnId: 'turn-a1', turn: 1, evidenceRefs: ['event:evt-772', 'finding:B14:F3'], openQuestions: ['Handle F3 via amendment?'], proposedEffects: [{proposalId: 'prop-1', type: 'place-hold'}]},
                {turnId: 'turn-a2', turn: 2, state: 'failed', decisionClass: null, completedAt: null, answerPresent: false}
            ],
            proposals: [{proposalId: 'prop-1', operatorSessionId: 'opsess-a', sourceTurnId: 'turn-a1', proposalType: 'hold-place', state: 'proposed', createdAt: '2026-08-07T12:05:00Z', expiresAt: '2026-08-08T12:05:00Z'}]
        });
        writeSession(fixture.sessionsRoot, {id: 'opsess-b', state: 'closed', turns: [{turnId: 'turn-b1', turn: 1}]});
    });
    afterEach(() => fixture.cleanup());

    it('reports deterministic counts and a reproducible semantic root', async () => {
        const first = await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
        expect(first).toEqual(jasmine.objectContaining({sessions: 2, turns: 3, pins: 2, proposals: 1}));
        const second = await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
        expect(second.semanticRoot).toEqual(first.semanticRoot);
    });

    it('answers every bounded typed query with the 9.4 envelope and no SQL', async () => {
        await build(fixture);
        const index = await SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot);
        try {
            expect((await index.getSession('opsess-a')).topic).toBe('CA-16 fixture');
            const sessions = await index.listSessions({state: 'open'});
            expect(sessions.items.map((session) => session.operatorSessionId)).toEqual(['opsess-a']);
            expect(sessions.provenance.semanticRoot).toBe(index.semanticRoot);
            expect(sessions).toEqual(jasmine.objectContaining({truncated: false, maxRecords: 100, maxBytes: 65536, nextCursor: null}));
            const turns = await index.listTurns('opsess-a');
            expect(turns.items.map((turn) => turn.turnNumber)).toEqual([1, 2]);
            expect((await index.getTurn('turn-a1')).answerExcerpt).toContain('three recorded findings');
            expect(await index.getPin('opsess-a', 'batch', 'B14')).toEqual(jasmine.objectContaining({refValue: 'B14'}));
            expect((await index.listPins('opsess-a')).items.length).toBe(2);
            expect((await index.getProposal('prop-1')).proposalType).toBe('hold-place');
            expect((await index.listProposals('opsess-a')).items.length).toBe(1);
            expect((await index.listOpenQuestions('turn-a1')).items.map((question) => question.questionText)).toEqual(['Handle F3 via amendment?']);
        } finally {
            await index.close();
        }
    });

    it('paginates with a bounded limit and continuation cursor', async () => {
        await build(fixture);
        const index = await SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot);
        try {
            const first = await index.listSessions({}, 1);
            expect(first.items.length).toBe(1);
            expect(first.truncated).toBeTrue();
            expect(first.nextCursor).not.toBeNull();
            const second = await index.listSessions({}, 1, first.nextCursor ?? undefined);
            expect(second.items.length).toBe(1);
            expect(second.items[0].operatorSessionId).not.toBe(first.items[0].operatorSessionId);
            await expectAsync(index.listSessions({}, 0)).toBeRejectedWithError(SessionIndexError, /limit/);
            await expectAsync(index.listSessions({}, 1, 'not-a-cursor')).toBeRejectedWithError(SessionIndexError, /cursor/i);
        } finally {
            await index.close();
        }
    });

    it('rejects unknown sessions, turns, and proposals with typed reasons', async () => {
        await build(fixture);
        const index = await SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot);
        try {
            await expectAsync(index.getSession('missing')).toBeRejectedWithError(SessionIndexError, /SESSION_NOT_FOUND|no such/);
            await expectAsync(index.getTurn('missing')).toBeRejectedWithError(SessionIndexError, /no such turn/);
            await expectAsync(index.getProposal('missing')).toBeRejectedWithError(SessionIndexError, /no such proposal/);
            expect(await index.getPin('opsess-a', 'batch', 'nope')).toBeNull();
        } finally {
            await index.close();
        }
    });

    it('is disposable: delete the database and rebuild yields the identical semantic root', async () => {
        const original = await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
        rmSync(join(fixture.indexRoot, 'sessions.sqlite'));
        const rebuilt = await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
        expect(rebuilt.semanticRoot).toBe(original.semanticRoot);
    });

    it('blocks queries when the index is missing, never scanning journals', async () => {
        await build(fixture);
        rmSync(join(fixture.indexRoot, 'sessions.sqlite'));
        await expectAsync(SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot)).toBeRejectedWithError(SessionIndexError, /SESSION_INDEX_MISSING|no readable/);
    });

    it('fails closed as stale when the manifest root no longer matches the stored rows', async () => {
        await build(fixture);
        const manifestPath = join(fixture.indexRoot, 'index-manifest.json');
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        manifest.semanticRoot = `sha256:${'0'.repeat(64)}`;
        writeFileSync(manifestPath, JSON.stringify(manifest));
        await expectAsync(SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot)).toBeRejectedWithError(SessionIndexError, /STALE|semantic root/i);
    });

    it('fails closed as stale when a session journal changes after the index was built', async () => {
        await build(fixture);
        appendProducerEvent(fixture.sessionsRoot, 'opsess-a');
        await expectAsync(SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot)).toBeRejectedWithError(SessionIndexError, /STALE|journal checkpoint/i);
    });

    it('incrementally updates only the changed session', async () => {
        await build(fixture);
        writeSession(fixture.sessionsRoot, {id: 'opsess-a', pinnedRefs: ['batch:B14', 'turn:turn-a1'],
            turns: [
                {turnId: 'turn-a1', turn: 1, evidenceRefs: ['event:evt-772'], openQuestions: ['Handle F3 via amendment?'], proposedEffects: [{proposalId: 'prop-1', type: 'place-hold'}]},
                {turnId: 'turn-a2', turn: 2, state: 'failed', decisionClass: null, completedAt: null, answerPresent: false},
                {turnId: 'turn-a3', turn: 3}
            ],
            proposals: [{proposalId: 'prop-1', operatorSessionId: 'opsess-a', sourceTurnId: 'turn-a1', proposalType: 'hold-place', state: 'proposed', createdAt: '2026-08-07T12:05:00Z', expiresAt: '2026-08-08T12:05:00Z'}]});
        const update = await SessionIndex.incrementalUpdate(fixture.indexRoot, fixture.sessionsRoot, 'opsess-a', LANE_ID);
        expect(update.turnsIndexed).toBe(3);
        const index = await SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot);
        try {
            expect((await index.listTurns('opsess-a')).items.map((turn) => turn.turnId)).toEqual(['turn-a1', 'turn-a2', 'turn-a3']);
            expect((await index.listTurns('opsess-b')).items.map((turn) => turn.turnId)).toEqual(['turn-b1']);
        } finally {
            await index.close();
        }
    });

    it('refuses to extend a tampered generation during incremental update', async () => {
        await build(fixture);
        const manifestPath = join(fixture.indexRoot, 'index-manifest.json');
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        manifest.semanticRoot = `sha256:${'0'.repeat(64)}`;
        writeFileSync(manifestPath, JSON.stringify(manifest));
        await expectAsync(SessionIndex.incrementalUpdate(fixture.indexRoot, fixture.sessionsRoot, 'opsess-a', LANE_ID))
            .toBeRejectedWithError(SessionIndexError, /STALE|semantic root/i);
    });

    it('caps excerpts at 500 UTF-8 bytes and derives incompleteness', async () => {
        const long = newFixture();
        writeSession(long.sessionsRoot, {id: 'opsess-c', turns: [{turnId: 'turn-c1', turn: 1, operator: 'x'.repeat(900), answer: 'y'.repeat(20)}]});
        await SessionIndex.build(long.indexRoot, long.sessionsRoot, LANE_ID);
        const index = await SessionIndex.open(long.indexRoot, long.sessionsRoot);
        try {
            const operator = await index.getTurnExcerpt('turn-c1', 'operator');
            expect(operator.excerptBytes).toBe(500);
            expect(operator.originalBytes).toBe(900);
            expect(operator.incomplete).toBeTrue();
            const coordinator = await index.getTurnExcerpt('turn-c1', 'coordinator');
            expect(coordinator.incomplete).toBeFalse();
        } finally {
            await index.close();
            long.cleanup();
        }
    });
});

/**
 * R5 retrieval completeness: a filtered query must consider the whole indexed
 * population, not a recent window. The target here is the second-oldest of 110
 * sessions, so any implementation that reads only the most recent MAX_RECORDS+1
 * rows before filtering cannot find it.
 */
describe('session index bounded queries stay complete beyond the recent-read window', () => {
    let deep: Fixture;
    const total = 110;
    beforeAll(async () => {
        deep = newFixture();
        for (let index = 0; index < total; index += 1) {
            const id = `opsess-${String(index).padStart(3, '0')}`;
            writeSession(deep.sessionsRoot, {
                id, parent: index === 1 ? 'opsess-000' : null,
                turns: [{turnId: `turn-${String(index).padStart(3, '0')}`, turn: 1, completedAt: new Date(Date.parse('2026-08-07T12:00:00Z') + index * 60000).toISOString()}]
            });
        }
        await SessionIndex.build(deep.indexRoot, deep.sessionsRoot, LANE_ID);
    }, 120000);
    afterAll(() => deep.cleanup());

    it('finds a matching session older than the most recent hundred', async () => {
        const index = await SessionIndex.open(deep.indexRoot, deep.sessionsRoot);
        try {
            const page = await index.listSessions({parentOperatorSessionId: 'opsess-000'});
            expect(page.items.map((session) => session.operatorSessionId)).toEqual(['opsess-001']);
        } finally {
            await index.close();
        }
    });

    it('pages the complete unfiltered population rather than a recent window', async () => {
        const index = await SessionIndex.open(deep.indexRoot, deep.sessionsRoot);
        try {
            const seen: string[] = [];
            let cursor: string | undefined;
            do {
                const page = await index.listSessions({}, 100, cursor);
                seen.push(...page.items.map((session) => session.operatorSessionId));
                cursor = page.nextCursor ?? undefined;
            } while (cursor !== undefined);
            expect(seen.length).toBe(total);
            expect(seen).toContain('opsess-000');
        } finally {
            await index.close();
        }
    });
});

/**
 * R5 total-work bound. The declared population maximum must refuse *before* the
 * traversal continues, not merely cap the rows kept: a large nonmatching table
 * must not be walked to its end. Driven through a stub port rather than a real
 * store, so the bound is proved at the query boundary with no leaf call.
 */
describe('session index bounded retrieval refuses past its declared total-scan bound', () => {
    const CHUNK = 200;

    /** A synthetic operator_sessions table of `total` rows, none of which match the query under test. */
    function stubContext(total: number): {ctx: SessionReadContext; reads: () => number} {
        let reads = 0;
        const store = {
            listFrom: async (_table: string, key: string, from: unknown, limit: number) => {
                reads += 1;
                const start = from === '' ? 0 : Number(String(from).slice(5)) + 1;
                return Array.from({length: Math.max(Math.min(limit, total - start), 0)}, (_unused, offset) => ({
                    [key]: `sess-${String(start + offset).padStart(6, '0')}`, state: 'open', origin: 'operator',
                    parent_operator_session_id: null
                }));
            }
        } as unknown as SessionReadContext['store'];
        const provenance = () => ({semanticRoot: `sha256:${'0'.repeat(64)}`, databaseSchemaVersion: 2, compilerVersion: '1.0.0', checkpoint: '0:sha256:x'});
        return {ctx: {store, provenance}, reads: () => reads};
    }

    it('refuses a nonmatching population larger than MAX_POPULATION instead of scanning it', async () => {
        const {ctx, reads} = stubContext(MAX_POPULATION + 1000);
        await expectAsync(listSessions(ctx, {state: 'closed'})).toBeRejectedWithError(SessionIndexError, /QUERY_LIMIT_INVALID|examined population/);
        expect(reads()).toBeLessThanOrEqual(Math.ceil(MAX_POPULATION / CHUNK) + 1);
    });

    it('still answers completely when the whole population is within the bound', async () => {
        const {ctx} = stubContext(CHUNK * 3);
        const page = await listSessions(ctx, {state: 'closed'});
        expect(page.items).toEqual([]);
        expect(page.truncated).toBeFalse();
    });
});
