/**
 * CA-26 acceptance proof — **the durable lifecycle transition and its
 * authoritative event never disagree**.
 *
 * The proposal document and CA-15's append-only session journal are two
 * authorities that cannot be written atomically. The batch failure order
 * requires that a *pre-commit* failure leave authoritative bytes unchanged, and
 * that an uncertain or *post-commit* outcome be resolved from durable state
 * rather than reported as a refusal that a retry cannot repeat.
 *
 * These specs interrupt the sequence at each point — before the commit, between
 * the commit and the append, and between the append and the published mark —
 * for confirm, operator rejection, expiry, and terminal stale/illegal
 * recording, and assert the durable bytes and the event sequence on both sides
 * of every interruption.
 */
import {chmodSync, existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {acquireEffectLocks, nodeEffectFileSystem} from '../../../src/foundation/effect/index.js';
import {nodeLaneMutationLock} from '../../../src/foundation/lane/coordinator/queue/laneMutationLock.js';
import {SessionProposalRecorder} from '../../../src/foundation/lane/coordinator/sessionProposal/index.js';
import {
    confirmed, invocationsOf, makeLaneDir, OPERATOR_SESSION_ID, recorded, removeLaneDir, scenario, storedDocument,
    type Scenario
} from './support/sessionProposalFixtures.js';

describe('CA-26 publication — a committed transition is never reported as a refusal', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('commits the confirmation and marks its event published when the journal accepts it', function () {
        confirmed(scene);
        expect(storedDocument(scene).publication).toEqual({
            event: 'operator-session-proposal-confirmed', rejectedBy: null, reason: null, detail: null, status: 'published'
        });
        expect(scene.journal.events.map((event) => event.type)).toEqual(['operator-session-proposal-confirmed']);
    });

    it('keeps the confirmed state durable and the event owed when the journal append fails', function () {
        recorded(scene);
        scene.journal.failNext();
        const result = scene.service.confirm({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, OPERATOR_SESSION_ID);
        expect(result.status).toBe('confirmed');
        expect(storedDocument(scene).state).toBe('operator-confirmed');
        expect(storedDocument(scene).publication?.status).toBe('pending');
        expect(scene.journal.events).toEqual([]);
    });

    it('settles the owed event on the next load, without repeating the transition', async function () {
        recorded(scene);
        scene.journal.failNext();
        scene.service.confirm({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, OPERATOR_SESSION_ID);
        const applied = await scene.service.apply(scene.applyRequest);
        expect(applied.status).toBe('applied');
        expect(scene.journal.events.map((event) => event.type)).toEqual(['operator-session-proposal-confirmed']);
        // The effect write owes no session event of its own — CA-10's effect journal is that record —
        // so a settled document carries no further debt.
        expect(storedDocument(scene).publication).toBeNull();
    });

    /**
     * The interrupted-between-append-and-mark case: the durable bytes still say
     * `pending`, so recovery republishes. The republished event must be
     * byte-identical to the original, which is what lets a consumer keyed by
     * (proposalId, event, resultingState) collapse the at-least-once duplicate.
     */
    it('republishes an identical event when the published mark was lost after the append', function () {
        confirmed(scene);
        const first = scene.journal.events[0];
        forcePublicationPending(scene);
        scene.service.preview(scene.applyRequest);
        expect(scene.journal.events.length).toBe(2);
        expect(scene.journal.events[1]).toEqual(first);
        expect(storedDocument(scene).publication?.status).toBe('published');
    });

    it('never publishes an event a second time once the mark is durable', function () {
        confirmed(scene);
        scene.service.preview(scene.applyRequest);
        scene.service.preview(scene.applyRequest);
        expect(scene.journal.events.length).toBe(1);
    });

    /**
     * The independent reviewer's exact reproduction (correction CA26-R2-01):
     * confirm's own append fails once, leaving the confirmation durable and an
     * event owed; `apply`'s own fresh read then fails to settle that debt a
     * second time. `apply` must refuse — never invoke the executor, never
     * record an effect, never null out the still-unsettled publication — so a
     * later successful load can still repay the debt it owes.
     */
    it('refuses to apply over a publication debt that could not settle twice, and invokes the executor zero times (CA26-R2-01)', async function () {
        recorded(scene);
        scene.journal.failNext(2);
        const confirmResult = scene.service.confirm({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, OPERATOR_SESSION_ID);
        expect(confirmResult.status).toBe('confirmed');
        expect(storedDocument(scene).publication?.status).toBe('pending');
        const applyResult = await scene.service.apply(scene.applyRequest);
        expect(applyResult).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_RECOVERY_REQUIRED'}));
        expect(invocationsOf(scene.runner)).toBe(0);
        expect(storedDocument(scene).state).toBe('operator-confirmed');
        expect(storedDocument(scene).publication?.status).toBe('pending');
        expect(scene.journal.events).toEqual([]);
        // The debt is still real and still repayable: a clean load settles it and only then may apply proceed.
        const settled = await scene.service.apply(scene.applyRequest);
        expect(settled.status).toBe('applied');
        expect(scene.journal.events.map((event) => event.type)).toEqual(['operator-session-proposal-confirmed']);
        expect(storedDocument(scene).publication).toBeNull();
    });
});

describe('CA-26 concurrent writers — the lane lock excludes a second transition, never a lost update (CA26-R2-02)', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    /**
     * `SessionProposalRecorder.transition` reads fresh bytes *inside* the held
     * lane lock before deciding. Reassigning `store.read` to synchronously
     * attempt a second transition from within the first's own held lock is
     * the same shape as two processes racing to be the writer that observes
     * `proposed` first: the inner attempt must fail with the same typed
     * lock-conflict reason a real second process gets, not silently interleave
     * and overwrite the winner's document.
     */
    it('excludes a second confirm/reject that starts while the first is still deciding, before either write lands', function () {
        recorded(scene);
        let racing: ReturnType<typeof scene.service.reject> | undefined;
        const read = scene.store.read.bind(scene.store);
        scene.store.read = (operatorSessionId: string, proposalId: string) => {
            if (racing === undefined) {
                racing = scene.service.reject({operatorSessionId, proposalId}, 'racing writer');
            }
            return read(operatorSessionId, proposalId);
        };
        const result = scene.service.confirm({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, OPERATOR_SESSION_ID);
        expect(result.status).toBe('confirmed');
        expect(racing).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_LANE_LOCKED', recordRejected: false}));
        expect(storedDocument(scene).state).toBe('operator-confirmed');
        expect(existsSync(`${scene.store.path(OPERATOR_SESSION_ID, scene.proposalId)}.staged`)).toBeFalse();
    });

    it('reports a bounded refusal rather than throwing when apply\'s own load finds the lane locked, and touches no byte', async function () {
        confirmed(scene);
        const held = acquireEffectLocks(laneDir, ['lane'], nodeEffectFileSystem);
        try {
            const result = await scene.service.apply(scene.applyRequest);
            expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_LANE_LOCKED', recordRejected: false}));
        } finally {
            held.release();
        }
        expect(storedDocument(scene).state).toBe('operator-confirmed');
    });
});

describe('CA-26 publication — pre-commit failure changes nothing', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('refuses and leaves the proposal bytes untouched when the document cannot be replaced', function () {
        recorded(scene);
        const before = rawBytes(scene);
        sealProposalDirectory(scene, 0o500);
        try {
            const result = scene.service.confirm({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, OPERATOR_SESSION_ID);
            expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_STORE_UNWRITABLE'}));
        } finally {
            sealProposalDirectory(scene, 0o700);
        }
        expect(rawBytes(scene)).toBe(before);
        expect(scene.journal.events).toEqual([]);
    });
});

describe('CA-26 publication — every terminal transition owes and settles its event', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('records an operator rejection as terminal with a published rejection event', function () {
        recorded(scene);
        const result = scene.service.reject({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, 'not now');
        expect(result.status).toBe('operator-rejected');
        expect(storedDocument(scene).publication).toEqual({
            event: 'operator-session-proposal-rejected', rejectedBy: 'operator', reason: 'operator-rejected',
            detail: 'not now', status: 'published'
        });
        expect(scene.journal.events[0].payload.rejectedBy).toBe('operator');
    });

    it('keeps an operator rejection terminal and durable when its event could not be appended', function () {
        recorded(scene);
        scene.journal.failNext();
        const result = scene.service.reject({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, 'not now');
        expect(result.status).toBe('operator-rejected');
        expect(storedDocument(scene).state).toBe('operator-rejected');
        expect(storedDocument(scene).publication?.status).toBe('pending');
    });

    it('records expiry as terminal and settles its event on the next load', async function () {
        confirmed(scene);
        scene.journal.failNext();
        rewriteExpiry(scene, '2026-08-06T11:00:00Z');
        const expiredResult = await scene.service.apply(scene.applyRequest);
        expect(expiredResult).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_EXPIRED'}));
        expect(storedDocument(scene).state).toBe('expired');
        expect(storedDocument(scene).publication?.status).toBe('pending');
        await scene.service.apply(scene.applyRequest);
        expect(storedDocument(scene).publication?.status).toBe('published');
        expect(scene.journal.events.filter((event) => event.type === 'operator-session-proposal-rejected').length).toBe(1);
        expect(invocationsOf(scene.runner)).toBe(0);
    });

    it('records a terminal stale rejection and settles its event on the next load', async function () {
        confirmed(scene);
        scene.journal.failNext();
        moveSnapshot(scene);
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_PROPOSAL_STALE'}));
        expect(storedDocument(scene).state).toBe('rejected-stale-or-illegal');
        expect(storedDocument(scene).publication?.status).toBe('pending');
        await scene.service.apply(scene.applyRequest);
        const rejections = scene.journal.events.filter((event) => event.type === 'operator-session-proposal-rejected');
        expect(rejections.length).toBe(1);
        expect(rejections[0].payload.resultingState).toBe('rejected-stale-or-illegal');
        expect(invocationsOf(scene.runner)).toBe(0);
    });
});

function rawBytes(scene: Scenario): string {
    return readFileSync(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId), 'utf8');
}

/** Exactly the interrupted-between-append-and-mark state a crash leaves behind. */
function forcePublicationPending(scene: Scenario): void {
    rewrite(scene, (document) => {
        (document.publication as Record<string, unknown>).status = 'pending';
    });
}

/** A non-writable proposals directory makes the staged create fail before the live document is touched. */
function sealProposalDirectory(scene: Scenario, mode: number): void {
    chmodSync(dirname(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId)), mode);
}

function moveSnapshot(scene: Scenario): void {
    const state = scene.state.get();
    scene.state.set({...state, laneState: {...state.laneState, snapshotDigest: `sha256:${'9'.repeat(64)}`}});
}

function rewriteExpiry(scene: Scenario, expiresAt: string): void {
    rewrite(scene, (document) => {
        document.expiresAt = expiresAt;
        (document.proposal as Record<string, unknown>).expiresAt = expiresAt;
    });
}

function rewrite(scene: Scenario, mutate: (document: Record<string, unknown>) => void): void {
    const path = scene.store.path(OPERATOR_SESSION_ID, scene.proposalId);
    const document = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    mutate(document);
    writeFileSync(path, `${JSON.stringify(document)}\n`);
}

describe('CA-26 reject rationale — validated before any store or journal write (correction CA26-R3-02)', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    /**
     * The reviewer's probe: `reject(ref, '\n')` used to report success, publish
     * an event, and commit a document the capsule's own reader then refused —
     * a proposal bricked by its own success path.
     */
    for (const [label, reason] of [
        ['a bare newline', '\n'], ['an empty rationale', ''], ['an overlong rationale', 'x'.repeat(513)],
        ['an embedded control character', 'why\u0007not']
    ] as const) {
        it(`refuses ${label} without writing a byte or publishing an event`, function () {
            recorded(scene);
            const before = readFileSync(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId), 'utf8');
            const result = scene.service.reject({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, reason);
            expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_SCHEMA_INVALID'}));
            expect(readFileSync(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId), 'utf8')).toBe(before);
            expect(scene.journal.events).toEqual([]);
            expect(storedDocument(scene).state).toBe('proposed');
        });
    }

    it('accepts a normal rationale and leaves the record readable by its own parser', function () {
        recorded(scene);
        const result = scene.service.reject({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, 'not now');
        expect(result.status).toBe('operator-rejected');
        expect(storedDocument(scene).publication?.detail).toBe('not now');
    });

    /**
     * Internally generated detail is a diagnostic, not operator authority, so it
     * is flattened rather than refused — an I/O error message containing a
     * newline must not be able to brick the record it is describing.
     */
    it('flattens control characters in an internally generated detail rather than storing an unreadable record', function () {
        recorded(scene);
        const expected = storedDocument(scene);
        const recorder = new SessionProposalRecorder(scene.store, scene.journal, nodeLaneMutationLock(laneDir));
        expect(recorder.replace({...expected, state: 'operator-rejected'}, {
            event: 'operator-session-proposal-rejected', rejectedBy: 'validator',
            reason: 'SESSION_PROPOSAL_STORE_UNWRITABLE', detail: 'ENOSPC:\nno space left\ton device'
        }, expected)).toBeNull();
        expect(storedDocument(scene).publication?.detail).toBe('ENOSPC: no space left on device');
    });
});
