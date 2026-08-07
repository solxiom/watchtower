import {createHash} from 'node:crypto';
import {SessionIndexError} from '../../../src/contracts/index.js';
import type {ReferenceCapsule} from '../../../src/contracts/index.js';
import {SessionIndex} from '../../../src/foundation/index/sessions/index.js';
import {resolveCapsule} from '../../../src/foundation/index/sessions/sessionCapsule.js';
import type {DerivedStore, TypedRow} from '../../../src/foundation/storage/index.js';
import {LANE_ID, newFixture, writeSession, type Fixture} from './support/sessionFixtures.js';

describe('cross-session reference capsules', () => {
    let fixture: Fixture;
    beforeEach(async () => {
        fixture = newFixture();
        writeSession(fixture.sessionsRoot, {
            id: 'opsess-a', pinnedRefs: [],
            turns: [
                {turnId: 'turn-a1', turn: 1, answer: 'Batch B14 was rejected for three recorded findings.',
                    evidenceRefs: ['event:evt-772', 'turn:turn-a2', 'finding:B14:F3'], openQuestions: ['Handle F3 via amendment?'],
                    proposedEffects: [{proposalId: 'prop-9', type: 'place-hold'}]},
                {turnId: 'turn-a2', turn: 2, answer: 'Secret transitive detail that must never be inlined.'}
            ]
        });
        writeSession(fixture.sessionsRoot, {id: 'opsess-b', turns: [{turnId: 'turn-b1', turn: 1}]});
        await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
    });
    afterEach(() => fixture.cleanup());

    it('authorizes a same-lane request from another operator session', async () => {
        const index = await SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot);
        try {
            const capsule = await index.getReferenceCapsule('opsess-b', 'turn-a1');
            expect(capsule.sourceOperatorSessionId).toBe('opsess-a');
        } finally {
            await index.close();
        }
    });

    it('is bounded, excludes the operator message and full answer, and carries the complete answer digest', async () => {
        const index = await SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot);
        try {
            const capsule = await index.getReferenceCapsule('opsess-a', 'turn-a1');
            expect(capsule.capsuleVersion).toBe('session-index-capsule/2');
            expect(capsule.omitted).toContain('operator-message');
            expect(capsule.omitted).toContain('full-answer');
            expect(JSON.stringify(capsule)).not.toContain('Why was B14 rejected');
            expect(capsule.answerDigest).toBe(`sha256:${createHash('sha256').update('Batch B14 was rejected for three recorded findings.', 'utf8').digest('hex')}`);
            expect(capsule.answerBytes).toBe(Buffer.byteLength('Batch B14 was rejected for three recorded findings.', 'utf8'));
            expect(capsule.incomplete).toBeFalse();
            expect(capsule.proposals).toEqual([{proposalId: 'prop-9', proposalType: 'place-hold'}]);
        } finally {
            await index.close();
        }
    });

    it('names a referenced turn without inlining its content (non-transitive)', async () => {
        const index = await SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot);
        try {
            const capsule = await index.getReferenceCapsule('opsess-a', 'turn-a1');
            expect(capsule.evidenceRefs).toContain(jasmine.objectContaining({refType: 'turn', refValue: 'turn-a2'}));
            expect(capsule.omitted).toContain('transitive-references');
            expect(JSON.stringify(capsule)).not.toContain('Secret transitive detail');
        } finally {
            await index.close();
        }
    });

    it('denies a request from a session outside this lane before reading content', async () => {
        const index = await SessionIndex.open(fixture.indexRoot, fixture.sessionsRoot);
        try {
            await expectAsync(index.getReferenceCapsule('opsess-outside-lane', 'turn-a1')).toBeRejectedWithError(SessionIndexError, /OPERATOR_SESSION_REFERENCE_DENIED|not authorized/);
        } finally {
            await index.close();
        }
    });

    it('resolves a pruned source turn to its tombstone', async () => {
        const pruned = newFixture();
        writeSession(pruned.sessionsRoot, {id: 'opsess-p', turns: [{turnId: 'turn-p1', turn: 1, answer: 'gone', answerPresent: false}]});
        await SessionIndex.build(pruned.indexRoot, pruned.sessionsRoot, LANE_ID);
        const index = await SessionIndex.open(pruned.indexRoot, pruned.sessionsRoot);
        try {
            await expectAsync(index.getReferenceCapsule('opsess-p', 'turn-p1')).toBeRejectedWithError(SessionIndexError, /OPERATOR_SESSION_CONTENT_PRUNED|pruned/);
        } finally {
            await index.close();
            pruned.cleanup();
        }
    });
});

/**
 * Stored-capsule admission (R7). Building a capsule is not evidence that the row
 * still holds one, so the byte bound, the derived excerpt length, and every
 * relational field are re-proved at resolution against the indexed source turn.
 */
const digestOf = (text: string): string => `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;

describe('session index stored capsule admission', () => {
    const laneId = LANE_ID;
    const sound: ReferenceCapsule = {
        capsuleVersion: 'session-index-capsule/2', sourceOperatorSessionId: 'opsess-a', sourceTurnId: 'turn-a1', turnNumber: 1,
        laneId, completedAt: '2026-08-07T12:05:00Z', decisionClass: 'D2', snapshotRevision: 81, stale: false,
        evidenceRefs: [], openQuestions: [], proposals: [], answerExcerpt: 'answer', answerExcerptBytes: 6, answerBytes: 6,
        answerDigest: digestOf('answer'), incomplete: false, omitted: ['operator-message', 'full-answer', 'transitive-references'],
        prunedContent: false
    };
    const turnRow: TypedRow = {
        turn_id: 'turn-a1', operator_session_id: 'opsess-a', turn_number: 1, decision_class: 'D2', snapshot_revision: 81,
        stale: 0, completed_at: '2026-08-07T12:05:00.000Z', answer_excerpt: 'answer', coordinator_bytes: 6,
        answer_digest: digestOf('answer')
    };

    // A truncated turn: the excerpt is the capped prefix, the indexed digest covers the complete 600-byte answer.
    const longAnswer = 'a'.repeat(600);
    const excerpt = 'a'.repeat(500);
    const truncatedTurn: TypedRow = {...turnRow, answer_excerpt: excerpt, coordinator_bytes: 600, answer_digest: digestOf(longAnswer)};
    const truncated: ReferenceCapsule = {
        ...sound, answerExcerpt: excerpt, answerExcerptBytes: 500, answerBytes: 600,
        answerDigest: digestOf(longAnswer), incomplete: true
    };

    /** A store that answers only the three primary-key reads `resolveCapsule` performs, so admission is proved in isolation. */
    function storeWith(capsuleJson: string, turn: TypedRow = turnRow): DerivedStore {
        return {
            getByPrimaryKey: async (table: string) => table === 'turns' ? turn
                : table === 'operator_sessions' ? {operator_session_id: 'opsess-a', lane_id: laneId}
                    : {source_turn_id: 'turn-a1', capsule_json: capsuleJson}
        } as unknown as DerivedStore;
    }

    /** Consumers branch on the typed reason, never on message text, so admission is asserted the same way. */
    async function expectCorrupt(capsuleJson: string, turn?: TypedRow): Promise<void> {
        try {
            await resolveCapsule(storeWith(capsuleJson, turn), laneId, 'turn-a1');
        } catch (error) {
            expect(error instanceof SessionIndexError).toBeTrue();
            expect((error as SessionIndexError).reason).toBe('SESSION_INDEX_CORRUPT');
            return;
        }
        fail('expected stored-capsule admission to refuse with SESSION_INDEX_CORRUPT');
    }

    it('admits a sound stored capsule', async () => {
        expect((await resolveCapsule(storeWith(JSON.stringify(sound)), laneId, 'turn-a1')).sourceTurnId).toBe('turn-a1');
    });

    it('refuses a stored capsule beyond the 4096-byte bound', async () => {
        await expectCorrupt(JSON.stringify({...sound, openQuestions: Array.from({length: 32}, () => 'q'.repeat(999))}));
    });

    it('refuses a stored capsule whose answerExcerptBytes is not derived from its own excerpt', async () => {
        await expectCorrupt(JSON.stringify({...sound, answerExcerptBytes: 5, incomplete: true}));
    });

    it('refuses a stored capsule that claims another session, lane, or turn', async () => {
        await expectCorrupt(JSON.stringify({...sound, sourceOperatorSessionId: 'opsess-other'}));
        await expectCorrupt(JSON.stringify({...sound, laneId: 'lane-other'}));
        await expectCorrupt(JSON.stringify({...sound, turnNumber: 2}));
    });

    it('refuses a stored capsule whose decision, revision, staleness, or answer bytes contradict the indexed turn', async () => {
        await expectCorrupt(JSON.stringify({...sound, decisionClass: 'D3'}));
        await expectCorrupt(JSON.stringify({...sound, snapshotRevision: 7}));
        await expectCorrupt(JSON.stringify({...sound, stale: true}));
        await expectCorrupt(JSON.stringify({...sound, answerBytes: 4096, incomplete: true}));
        await expectCorrupt(JSON.stringify({...sound, answerExcerpt: 'forged', answerDigest: digestOf('forged')}));
    });

    it('refuses a forged answer digest even when every other field is untouched', async () => {
        await expectCorrupt(JSON.stringify({...sound, answerDigest: digestOf('a different answer entirely')}));
        await expectCorrupt(JSON.stringify({...sound, answerDigest: `sha256:${'b'.repeat(64)}`}));
    });

    it('admits a truncated capsule whose digest matches the indexed complete-answer digest', async () => {
        const resolved = await resolveCapsule(storeWith(JSON.stringify(truncated), truncatedTurn), laneId, 'turn-a1');
        expect(resolved.incomplete).toBeTrue();
        expect(resolved.answerDigest).toBe(digestOf(longAnswer));
    });

    /**
     * The R7 rejection case. A truncated capsule cannot be checked against its own excerpt, so admission must
     * compare it to turns.answer_digest. Before that column existed the expected digest was the capsule's own
     * field and this comparison was `x === x`.
     */
    it('refuses a forged complete-answer digest on a truncated capsule', async () => {
        await expectCorrupt(JSON.stringify({...truncated, answerDigest: `sha256:${'f'.repeat(64)}`}), truncatedTurn);
        await expectCorrupt(JSON.stringify({...truncated, answerDigest: digestOf(excerpt)}), truncatedTurn);
        await expectCorrupt(JSON.stringify({...truncated, answerDigest: digestOf('some other complete answer')}), truncatedTurn);
    });

    it('refuses a truncated capsule that claims to be complete to escape the stronger check', async () => {
        await expectCorrupt(JSON.stringify({...truncated, incomplete: false}), truncatedTurn);
        await expectCorrupt(JSON.stringify({...truncated, incomplete: false, answerBytes: 500}), truncatedTurn);
    });

    it('refuses an indexed digest that does not reproduce the complete answer it indexes', async () => {
        await expectCorrupt(JSON.stringify(sound), {...turnRow, answer_digest: digestOf('not the indexed answer')});
    });

    it('admits an empty answer only when the indexed digest is the digest of empty content', async () => {
        const emptyTurn: TypedRow = {...turnRow, answer_excerpt: '', coordinator_bytes: 0, answer_digest: digestOf('')};
        const empty = {...sound, answerExcerpt: '', answerExcerptBytes: 0, answerBytes: 0, answerDigest: digestOf('')};
        expect((await resolveCapsule(storeWith(JSON.stringify(empty), emptyTurn), laneId, 'turn-a1')).answerBytes).toBe(0);
        await expectCorrupt(JSON.stringify({...empty, answerDigest: digestOf(' ')}), emptyTurn);
    });

    it('refuses a false pruned-content claim before the tombstone branch, never resolving it as pruned', async () => {
        const forgedTombstone = JSON.stringify({
            ...sound, prunedContent: true, answerExcerpt: '', answerExcerptBytes: 0, incomplete: true,
            omitted: ['operator-message', 'full-answer', 'transitive-references', 'pruned-content']
        });
        await expectAsync(resolveCapsule(storeWith(forgedTombstone), laneId, 'turn-a1'))
            .toBeRejectedWithError(SessionIndexError, /prunedContent disagrees/);
    });

    it('still resolves a genuine tombstone, whose prune relation the indexed row confirms', async () => {
        const prunedTurn: TypedRow = {...turnRow, answer_excerpt: '', coordinator_bytes: 6};
        const tombstone = JSON.stringify({
            ...sound, prunedContent: true, answerExcerpt: '', answerExcerptBytes: 0, incomplete: true,
            omitted: ['operator-message', 'full-answer', 'transitive-references', 'pruned-content']
        });
        await expectAsync(resolveCapsule(storeWith(tombstone, prunedTurn), laneId, 'turn-a1'))
            .toBeRejectedWithError(SessionIndexError, /OPERATOR_SESSION_CONTENT_PRUNED|pruned/);
    });
});
