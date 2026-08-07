/**
 * Fail-closed validation of the CA-15 operator-session tree (CA-16 negative-case
 * contract): malformed, missing, extra, duplicate, symlinked, non-UTF-8, and
 * digest-mismatched predecessor bytes must produce a typed SESSION_SOURCE_INVALID
 * refusal and never partially decode into an index.
 */
import {mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {SessionIndexError} from '../../../src/contracts/index.js';
import {SessionIndex} from '../../../src/foundation/index/sessions/index.js';
import {liveAggregateCheckpoint} from '../../../src/foundation/index/sessions/sessionIndexSource.js';
import {
    appendJournal, LANE_ID, newFixture, resyncSidecars, rewriteJournal, rewriteJournalTurn, symlinkTurnContent,
    writeSession, type Fixture
} from './support/sessionFixtures.js';

function turnDir(fixture: Fixture, sessionId: string, turnId: string, file: string): string {
    return join(fixture.sessionsRoot, sessionId, 'turns', turnId, file);
}

describe('operator-session source fails closed', () => {
    let fixture: Fixture;
    beforeEach(() => {
        fixture = newFixture();
        writeSession(fixture.sessionsRoot, {id: 'opsess-a', turns: [{turnId: 'turn-a1', turn: 1}]});
    });
    afterEach(() => fixture.cleanup());

    async function expectRejected(): Promise<void> {
        try {
            await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
        } catch (error) {
            expect(error instanceof SessionIndexError).toBeTrue();
            expect((error as SessionIndexError).reason).toBe('SESSION_SOURCE_INVALID');
            return;
        }
        fail('expected the build to fail closed with SESSION_SOURCE_INVALID');
    }

    it('rejects a symlinked turn content file', async () => {
        symlinkTurnContent(fixture.sessionsRoot, 'opsess-a', 'turn-a1', 'operator.md', '/etc/hostname');
        await expectRejected();
    });

    it('rejects invalid UTF-8 turn content', async () => {
        writeFileSync(turnDir(fixture, 'opsess-a', 'turn-a1', 'operator.md'), Buffer.from([0xff, 0xfe, 0x00]));
        await expectRejected();
    });

    it('rejects a turn content file whose sha256 does not match its declared digest', async () => {
        writeFileSync(turnDir(fixture, 'opsess-a', 'turn-a1', 'operator.md'), 'tampered operator message');
        await expectRejected();
    });

    it('rejects a materialized snapshot that disagrees with the journal record', async () => {
        writeFileSync(turnDir(fixture, 'opsess-a', 'turn-a1', 'snapshot.json'), JSON.stringify({laneRevision: 999}));
        await expectRejected();
    });

    it('rejects a turn directory with no journal record (extra entry)', async () => {
        mkdirSync(join(fixture.sessionsRoot, 'opsess-a', 'turns', 'turn-a9'), {recursive: true});
        await expectRejected();
    });

    it('rejects a journaled turn with no materialized directory (missing entry)', async () => {
        rmSync(join(fixture.sessionsRoot, 'opsess-a', 'turns', 'turn-a1'), {recursive: true, force: true});
        await expectRejected();
    });

    it('rejects an identity whose operatorSessionId does not match its directory', async () => {
        const identity = join(fixture.sessionsRoot, 'opsess-a', 'operator-session.json');
        const value = JSON.parse(readFileSync(identity, 'utf8')) as Record<string, unknown>;
        writeFileSync(identity, JSON.stringify({...value, operatorSessionId: 'opsess-imposter'}));
        await expectRejected();
    });

    it('rejects an identity carrying an origin the producer can never emit', async () => {
        const identity = join(fixture.sessionsRoot, 'opsess-a', 'operator-session.json');
        const value = JSON.parse(readFileSync(identity, 'utf8')) as Record<string, unknown>;
        writeFileSync(identity, JSON.stringify({...value, origin: 'fork'}));
        await expectRejected();
    });

    it('rejects an identity carrying a field outside the CA-15 key set', async () => {
        const identity = join(fixture.sessionsRoot, 'opsess-a', 'operator-session.json');
        const value = JSON.parse(readFileSync(identity, 'utf8')) as Record<string, unknown>;
        writeFileSync(identity, JSON.stringify({...value, smuggled: 'extra'}));
        await expectRejected();
    });

    it('rejects a symlinked turn sidecar', async () => {
        symlinkTurnContent(fixture.sessionsRoot, 'opsess-a', 'turn-a1', 'snapshot.json', '/etc/hostname');
        await expectRejected();
    });

    it('rejects a missing authoritative turn sidecar', async () => {
        rmSync(turnDir(fixture, 'opsess-a', 'turn-a1', 'usage.json'), {force: true});
        await expectRejected();
    });

    it('rejects an unsafe entry under turns/ instead of silently filtering it', async () => {
        symlinkSync('/etc', join(fixture.sessionsRoot, 'opsess-a', 'turns', 'elsewhere'));
        await expectRejected();
    });

    it('rejects a journal line whose envelope is not a CA-15 event', async () => {
        appendJournal(fixture.sessionsRoot, 'opsess-a', `${JSON.stringify({type: 'wt-not-a-ca15-event', payload: {}})}\n`);
        await expectRejected();
    });

    it('rejects a journal whose sequence is not continuous', async () => {
        const path = join(fixture.sessionsRoot, 'opsess-a', 'journal.jsonl');
        const lines = readFileSync(path, 'utf8').split('\n').filter((line) => line !== '');
        writeFileSync(path, `${lines.slice(1).join('\n')}\n`);
        await expectRejected();
    });

    it('rejects a journal whose event lane disagrees with the operator-session identity', async () => {
        rewriteJournal(fixture.sessionsRoot, 'opsess-a', (entry) => ({...entry, laneId: 'lane-other'}));
        await expectRejected();
    });

    it('rejects a lane-mismatched journal while computing the live admission checkpoint', () => {
        rewriteJournal(fixture.sessionsRoot, 'opsess-a', (entry) => ({...entry, laneId: 'lane-other'}));
        expect(() => liveAggregateCheckpoint(fixture.sessionsRoot, LANE_ID)).toThrowError(SessionIndexError, /journal event lane/);
    });

    it('rejects an authoritative sidecar that is not byte-identical, even when it parses equal', async () => {
        const path = turnDir(fixture, 'opsess-a', 'turn-a1', 'snapshot.json');
        writeFileSync(path, `\n${readFileSync(path, 'utf8').trim()}\n`);
        await expectRejected();
    });

    it('rejects a malformed declared digest on pruned operator content', async () => {
        rewriteJournalTurn(fixture.sessionsRoot, 'opsess-a', 'turn-a1', (turn) => {
            (turn.operatorMessage as Record<string, unknown>).sha256 = 'not-a-digest';
        });
        rmSync(turnDir(fixture, 'opsess-a', 'turn-a1', 'operator.md'), {force: true});
        await expectRejected();
    });

    it('rejects a malformed declared digest on pruned answer content', async () => {
        rewriteJournalTurn(fixture.sessionsRoot, 'opsess-a', 'turn-a1', (turn) => {
            (turn.response as Record<string, unknown>).sha256 = 'sha256:short';
        });
        // Re-materialize the sidecars so this case isolates the digest guard rather than sidecar disagreement.
        resyncSidecars(fixture.sessionsRoot, 'opsess-a', 'turn-a1');
        rmSync(turnDir(fixture, 'opsess-a', 'turn-a1', 'coordinator.md'), {force: true});
        await expectRejected();
    });

    it('rejects a pinned reference token that names no closed refType', async () => {
        const identity = join(fixture.sessionsRoot, 'opsess-a', 'operator-session.json');
        const value = JSON.parse(readFileSync(identity, 'utf8')) as Record<string, unknown>;
        writeFileSync(identity, JSON.stringify({...value, pinnedRefs: ['not-a-reftype:value']}));
        await expectRejected();
    });

    it('rejects a missing session journal', async () => {
        rmSync(join(fixture.sessionsRoot, 'opsess-a', 'journal.jsonl'), {force: true});
        await expectRejected();
    });

    it('rejects a non-JSON entry in the proposals directory', async () => {
        mkdirSync(join(fixture.sessionsRoot, 'opsess-a', 'proposals'), {recursive: true});
        writeFileSync(join(fixture.sessionsRoot, 'opsess-a', 'proposals', 'notes.txt'), 'not json');
        await expectRejected();
    });

    it('rejects a journal that no longer parses (corrupt predecessor)', async () => {
        appendJournal(fixture.sessionsRoot, 'opsess-a', 'this is not json\n');
        await expectRejected();
    });
});
