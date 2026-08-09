/**
 * CA-26 acceptance proof — **the parser accepts exactly the document shapes
 * this capsule can produce, and nothing else** (review correction CA26-R5-01).
 *
 * Corrections 03 and 04 each closed one cross-field hole by adding one rule:
 * state↔member presence, then event↔metadata. That is whack-a-mole — nothing
 * about it says a third combination does not exist. This file replaces the
 * question "did we think of that combination?" with a decidable one:
 *
 * 1. **Produced set** — drive every real lifecycle path and record the shape of
 *    *every* durable write, captured at the store rather than read back at the
 *    end, so intermediate states (an owed publication, a settled one) count.
 * 2. **Enumerated space** — every combination of state, confirmation presence,
 *    effect presence, and publication event/status/metadata: 612 shapes.
 * 3. **Assertion** — the parser accepts a shape *iff* it is producible, or is
 *    one of the explicitly enumerated spec-permitted shapes below.
 *
 * A future change that widens the parser, or that stops producing a shape the
 * parser still accepts, fails here rather than in a review.
 *
 * ## Compatibility decision: `revalidated` and `effect-prepared`
 *
 * These two §15.1 states are **never durably written** by this capsule: `apply`
 * goes `operator-confirmed` → executor → `effect-verified`/`effect-uncertain`
 * inside one call, so neither is a resting point. The parser nevertheless
 * accepts them, which this proof would otherwise flag as an unjustified
 * widening.
 *
 * The widening is deliberate and is recorded here as the decision rather than
 * left implicit. `operator-session.md` §15.1 names both states normatively and
 * CA-16R's accepted `SESSION_PROPOSAL_STATES` projects both, so a document in
 * either state is spec-legal even though *this* writer never creates one.
 * Refusing them would make this capsule's reader narrower than the accepted
 * state vocabulary: a record written by a future writer, or recovered from an
 * interrupted implementation that did persist an intermediate state, would be
 * unreadable and unprojectable rather than merely unfamiliar. The cost of
 * accepting them is bounded, because they are held to the *same* cross-field
 * invariants as the confirmed states they descend from — confirmation present,
 * effect absent, publication confirmed-or-none — so the widening admits no
 * combination that would be illegal for `operator-confirmed` itself.
 */
import {
    parseSessionProposalDocument, SessionProposalDocumentError
} from '../../../src/foundation/lane/coordinator/sessionProposal/index.js';
import {SESSION_PROPOSAL_STATES, type SessionProposalDocument} from '../../../src/contracts/index.js';
import type {LaneTaskInvocation, LaneTaskRunResult} from '../../../src/contracts/index.js';
import {readFileSync, writeFileSync} from 'node:fs';
import {bindingFor} from '../effect/support/effectFixtures.js';
import {
    confirmed, makeLaneDir, OPERATOR_SESSION_ID, recorded, removeLaneDir, scenario, storedDocument, type Scenario
} from './support/sessionProposalFixtures.js';

type Raw = Record<string, unknown>;

/** The shape of one document: everything the cross-field rules may depend on, and nothing else. */
function signature(document: Raw): string {
    const publication = document.publication as Raw | null;
    const kind = publication === null ? 'none' : [
        publication.event === 'operator-session-proposal-rejected' ? 'rejected' : 'confirmed',
        publication.status,
        `by${publication.rejectedBy === null ? 0 : 1}`,
        `rs${publication.reason === null ? 0 : 1}`,
        `dt${publication.detail === null ? 0 : 1}`
    ].join(':');
    return [document.state, `c${document.confirmation === null ? 0 : 1}`,
        `e${document.effect === null ? 0 : 1}`, kind].join('|');
}

/** Every durable write, captured at the store — not just the state a path ends in. */
function capturing(scene: Scenario, sink: Set<string>): void {
    const create = scene.store.create.bind(scene.store);
    const replace = scene.store.replace.bind(scene.store);
    scene.store.create = (document: SessionProposalDocument) => {
        sink.add(signature(JSON.parse(JSON.stringify(document)) as Raw));
        return create(document);
    };
    scene.store.replace = (document: SessionProposalDocument) => {
        sink.add(signature(JSON.parse(JSON.stringify(document)) as Raw));
        replace(document);
    };
}

/**
 * A run that names the right action and reports success but accounts for none
 * of the planned targets. `dispatch-batch` is an external effect, so CA-10
 * classifies that as **uncertain** rather than failed — the one real path to a
 * durable `effect-uncertain` record.
 */
function unaccountedRun(binding: {actionId: string; taskId: string}) {
    return async (invocation: LaneTaskInvocation): Promise<LaneTaskRunResult> => ({
        outcome: 'completed', actionId: invocation.actionId, taskId: binding.taskId, runId: 'run-1',
        startedAt: '2026-08-06T12:00:00Z', finishedAt: '2026-08-06T12:00:00Z', events: [],
        result: {applied: true, changed: [], unchanged: [], warnings: []}
    });
}

/** Expiry is read from the carried proposal, so it is moved in the durable bytes, exactly as time passing would. */
function expireStoredProposal(scene: Scenario): void {
    const path = scene.store.path(OPERATOR_SESSION_ID, scene.proposalId);
    const document = JSON.parse(readFileSync(path, 'utf8')) as Raw;
    document.expiresAt = '2026-08-06T11:00:00Z';
    (document.proposal as Raw).expiresAt = '2026-08-06T11:00:00Z';
    writeFileSync(path, `${JSON.stringify(document)}\n`);
}

/** Drive every path this capsule has, collecting the shape of every write each one makes. */
async function producedShapes(): Promise<Set<string>> {
    const produced = new Set<string>();
    const paths: ((lane: string) => Promise<void>)[] = [
        // proposed
        async (lane) => { const s = scenario(lane); capturing(s, produced); recorded(s); },
        // operator-confirmed, published and (journal failure) still owed
        async (lane) => { const s = scenario(lane); capturing(s, produced); confirmed(s); },
        async (lane) => {
            const s = scenario(lane); capturing(s, produced); recorded(s); s.journal.failNext();
            s.service.confirm({operatorSessionId: OPERATOR_SESSION_ID, proposalId: s.proposalId}, OPERATOR_SESSION_ID);
        },
        // operator-rejected
        async (lane) => {
            const s = scenario(lane); capturing(s, produced); recorded(s);
            s.service.reject({operatorSessionId: OPERATOR_SESSION_ID, proposalId: s.proposalId}, 'not now');
        },
        // effect-verified
        async (lane) => { const s = scenario(lane); capturing(s, produced); confirmed(s); await s.service.apply(s.applyRequest); },
        // effect-uncertain: an external effect that started and could not be verified
        async (lane) => {
            const s = scenario(lane);
            const binding = bindingFor('dispatch-batch');
            s.runner.run = unaccountedRun(binding);
            capturing(s, produced); confirmed(s);
            await s.service.apply(s.applyRequest);
        },
        // expired, reached from proposed (at confirm)
        async (lane) => {
            const s = scenario(lane); recorded(s); capturing(s, produced);
            expireStoredProposal(s);
            s.service.confirm({operatorSessionId: OPERATOR_SESSION_ID, proposalId: s.proposalId}, OPERATOR_SESSION_ID);
        },
        // expired, reached from operator-confirmed (at apply)
        async (lane) => {
            const s = scenario(lane); confirmed(s); capturing(s, produced);
            expireStoredProposal(s);
            await s.service.apply(s.applyRequest);
        },
        // rejected-stale-or-illegal
        async (lane) => {
            const s = scenario(lane); capturing(s, produced); confirmed(s);
            const state = s.state.get();
            s.state.set({...state, laneState: {...state.laneState, snapshotDigest: `sha256:${'9'.repeat(64)}`}});
            await s.service.apply(s.applyRequest);
        }
    ];
    for (const drive of paths) {
        const lane = makeLaneDir();
        try { await drive(lane); } finally { removeLaneDir(lane); }
    }
    return produced;
}

/**
 * Spec-legal shapes this writer never produces — the documented widening above.
 * Each mirrors the `operator-confirmed` shape it descends from.
 */
const SPEC_PERMITTED_UNPRODUCED: readonly string[] = Object.freeze([
    'revalidated|c1|e0|none', 'effect-prepared|c1|e0|none',
    ...['revalidated', 'effect-prepared'].flatMap((state) => ['pending', 'published']
        .map((status) => `${state}|c1|e0|confirmed:${status}:by0:rs0:dt0`))
]);

const PUBLICATIONS: readonly (Raw | null)[] = Object.freeze([
    null,
    ...(['operator-session-proposal-confirmed', 'operator-session-proposal-rejected'] as const).flatMap((event) =>
        (['pending', 'published'] as const).flatMap((status) =>
            [
                {rejectedBy: null, reason: null, detail: null},
                {rejectedBy: 'operator', reason: 'r', detail: 'd'},
                {rejectedBy: null, reason: 'r', detail: 'd'},
                {rejectedBy: 'operator', reason: null, detail: 'd'}
            ].map((metadata) => ({event, status, ...metadata}))))
]);

describe('CA-26 shape closure — the parser accepts exactly what the writers produce', function () {
    let produced: Set<string>;
    let base: SessionProposalDocument;
    let confirmationRecord: unknown;
    let effectRecord: unknown;

    beforeAll(async function () {
        produced = await producedShapes();
        const lane = makeLaneDir();
        try {
            const proposedScene = scenario(lane);
            recorded(proposedScene);
            base = storedDocument(proposedScene);
        } finally { removeLaneDir(lane); }
        const applied = makeLaneDir();
        try {
            const scene = scenario(applied);
            confirmed(scene);
            confirmationRecord = storedDocument(scene).confirmation;
            await scene.service.apply(scene.applyRequest);
            effectRecord = storedDocument(scene).effect;
        } finally { removeLaneDir(applied); }
    });

    it('produces at least one shape for every terminal and resting state it can reach', function () {
        const states = new Set([...produced].map((shape) => shape.split('|')[0]));
        expect([...states].sort()).toEqual([
            'effect-uncertain', 'effect-verified', 'expired', 'operator-confirmed',
            'operator-rejected', 'proposed', 'rejected-stale-or-illegal'
        ]);
    });

    it('documents exactly the two spec-legal states it never produces', function () {
        const producedStates = new Set([...produced].map((shape) => shape.split('|')[0]));
        const unproduced = SESSION_PROPOSAL_STATES.filter((state) => !producedStates.has(state));
        expect([...unproduced].sort()).toEqual(['effect-prepared', 'revalidated']);
        expect(SPEC_PERMITTED_UNPRODUCED.every((shape) => unproduced.includes(shape.split('|')[0] as never))).toBeTrue();
    });

    it('accepts a document shape if and only if it is producible or explicitly spec-permitted', function () {
        const legal = new Set([...produced, ...SPEC_PERMITTED_UNPRODUCED]);
        const wrong: string[] = [];
        let checked = 0;
        for (const state of SESSION_PROPOSAL_STATES) {
            for (const confirmation of [null, confirmationRecord]) {
                for (const effect of [null, effectRecord]) {
                    for (const publication of PUBLICATIONS) {
                        const candidate = {...base, state, confirmation, effect, publication} as unknown as Raw;
                        const shape = signature(candidate);
                        const expected = legal.has(shape);
                        let accepted = true;
                        try {
                            parseSessionProposalDocument(candidate);
                        } catch (error) {
                            if (!(error instanceof SessionProposalDocumentError)) throw error;
                            accepted = false;
                        }
                        checked += 1;
                        if (accepted !== expected) wrong.push(`${shape} expected=${expected ? 'accept' : 'refuse'}`);
                    }
                }
            }
        }
        expect(checked).toBe(SESSION_PROPOSAL_STATES.length * 2 * 2 * PUBLICATIONS.length);
        expect(wrong).toEqual([]);
    });
});
