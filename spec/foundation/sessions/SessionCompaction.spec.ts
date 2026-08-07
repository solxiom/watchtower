import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {SessionIndexError} from '../../../src/contracts/index.js';
import {SessionIndex, SessionCompactor} from '../../../src/foundation/index/sessions/index.js';

const compact = SessionCompactor.compact;
const previewCompact = SessionCompactor.previewCompact;
import {LANE_ID, newFixture, writeSession, type Fixture, type TurnFixture} from './support/sessionFixtures.js';

const NOW = Date.parse('2026-08-20T00:00:00Z');

function turns(count: number): TurnFixture[] {
    return Array.from({length: count}, (_, index) => ({turnId: `turn-${String(index + 1).padStart(2, '0')}`, turn: index + 1}));
}

const OPTIONS = {keepRecentTurns: 2, keepRecentDays: 0, keepPinnedOnly: false, keepProposalSourceTurns: true};

describe('session index compaction', () => {
    let fixture: Fixture;
    beforeEach(async () => {
        fixture = newFixture();
        writeSession(fixture.sessionsRoot, {
            id: 'opsess-x', pinnedRefs: ['turn:turn-02'], turns: turns(10),
            proposals: [{proposalId: 'prop-x', operatorSessionId: 'opsess-x', sourceTurnId: 'turn-03', proposalType: 'hold-place', state: 'proposed', createdAt: '2026-08-07T12:05:00Z', expiresAt: '2026-08-08T12:05:00Z'}]
        });
        await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
    });
    afterEach(() => fixture.cleanup());

    it('previews the exact removal set without mutating the index', async () => {
        const preview = await previewCompact(fixture.indexRoot, fixture.sessionsRoot, 'opsess-x', OPTIONS, NOW);
        expect(preview.turnsKept).toBe(4);
        expect(preview.turnsRemoved).toBe(6);
        expect([...preview.keepTurnIds].sort()).toEqual(['turn-02', 'turn-03', 'turn-09', 'turn-10']);
        const index = await SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot);
        try {
            expect((await index.listTurns('opsess-x')).items.length).toBe(10);
        } finally {
            await index.close();
        }
    });

    it('preserves pinned, recent, and proposal-source turns and never touches journals or turn files', async () => {
        const result = await compact(fixture.indexRoot, fixture.sessionsRoot, 'opsess-x', OPTIONS, NOW);
        expect(result.turnsRemoved).toBe(6);
        expect(result.turnsKept).toBe(4);
        expect(result.bytesFreed).toBeGreaterThan(0);
        expect(existsSync(join(fixture.sessionsRoot, 'opsess-x', 'turns', 'turn-01', 'coordinator.md'))).toBeTrue();
        expect(existsSync(join(fixture.sessionsRoot, 'opsess-x', 'journal.jsonl'))).toBeTrue();
        const index = await SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot);
        try {
            expect((await index.listTurns('opsess-x')).items.map((turn) => turn.turnId).sort()).toEqual(['turn-02', 'turn-03', 'turn-09', 'turn-10']);
        } finally {
            await index.close();
        }
    });

    it('keeps only pinned turns when keepPinnedOnly is set', async () => {
        const result = await compact(fixture.indexRoot, fixture.sessionsRoot, 'opsess-x', {keepRecentTurns: 5, keepRecentDays: 30, keepPinnedOnly: true, keepProposalSourceTurns: false}, NOW);
        expect(result.turnsKept).toBe(1);
        expect(result.turnsRemoved).toBe(9);
    });

    it('refuses to compact a missing index rather than scanning journals', async () => {
        const empty = newFixture();
        await expectAsync(compact(empty.indexRoot, empty.sessionsRoot, 'opsess-x', OPTIONS, NOW)).toBeRejectedWithError(SessionIndexError, /SESSION_INDEX_MISSING|requires an existing/);
        empty.cleanup();
    });

    it('never deletes another session\'s proposal or the turn it references', async () => {
        const cross = newFixture();
        writeSession(cross.sessionsRoot, {id: 'opsess-x', pinnedRefs: [], turns: turns(10)});
        writeSession(cross.sessionsRoot, {
            id: 'opsess-y', turns: [{turnId: 'turn-y1', turn: 1}],
            proposals: [{proposalId: 'prop-y', operatorSessionId: 'opsess-y', sourceTurnId: 'turn-05', proposalType: 'hold-place', state: 'proposed', createdAt: '2026-08-07T12:05:00Z', expiresAt: '2026-08-08T12:05:00Z'}]
        });
        await SessionIndex.build(cross.indexRoot, cross.sessionsRoot, LANE_ID);
        await compact(cross.indexRoot, cross.sessionsRoot, 'opsess-x', {keepRecentTurns: 2, keepRecentDays: 0, keepPinnedOnly: false, keepProposalSourceTurns: false}, NOW);
        const index = await SessionIndex.open(cross.indexRoot, cross.sessionsRoot);
        try {
            expect((await index.getProposal('prop-y')).operatorSessionId).toBe('opsess-y');
            expect((await index.getTurn('turn-05')).turnId).toBe('turn-05');
        } finally {
            await index.close();
            cross.cleanup();
        }
    });
});
