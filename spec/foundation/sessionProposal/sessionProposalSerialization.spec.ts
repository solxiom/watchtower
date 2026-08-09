/**
 * CA-26 acceptance proof — **no transition is decided from one snapshot and
 * committed over a different one** (review correction CA26-R2-02, second pass).
 *
 * `SessionProposalRecorder.transition` re-reads inside the held lane lock, so
 * `confirm`/`reject` are consistent by construction and are proved by the
 * interleaving spec in `sessionProposalPublication.spec.ts`. The three
 * remaining commits — expiry, terminal stale/illegal recording, and apply's
 * terminal effect write — necessarily decide from a snapshot read *before* their
 * lock, because the decision depends on a clock, a validator verdict, or an
 * executor outcome. Those are guarded by a compare-and-swap on the document
 * revision instead, and these specs prove the loser of a race writes nothing and
 * gets a deterministic reason.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {nodeEffectFileSystem} from '../../../src/foundation/effect/index.js';
import {nodeLaneMutationLock} from '../../../src/foundation/lane/coordinator/queue/laneMutationLock.js';
import {SessionProposalRecorder} from '../../../src/foundation/lane/coordinator/sessionProposal/index.js';
import {
    confirmed, invocationsOf, makeLaneDir, OPERATOR_SESSION_ID, recorded, removeLaneDir, scenario, storedDocument,
    type Scenario
} from './support/sessionProposalFixtures.js';

describe('CA-26 compare-and-swap — a snapshot-based commit never overwrites a newer writer', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('refuses a commit whose expected revision no longer matches the stored document', function () {
        recorded(scene);
        const stale = storedDocument(scene);
        // Another writer commits first, exactly as a racing process would.
        scene.service.reject({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, 'racing writer');
        const recorder = new SessionProposalRecorder(scene.store, scene.journal, nodeLaneMutationLock(laneDir));
        const failure = recorder.replace({...stale, state: 'expired'}, null, stale);
        expect(failure).toEqual(jasmine.objectContaining({
            status: 'refused', reason: 'SESSION_PROPOSAL_WRITE_CONFLICT', recordRejected: false
        }));
        expect(storedDocument(scene).state).toBe('operator-rejected');
    });

    it('commits normally when the expected revision still matches', function () {
        recorded(scene);
        const expected = storedDocument(scene);
        const recorder = new SessionProposalRecorder(scene.store, scene.journal, nodeLaneMutationLock(laneDir));
        // A legal terminal shape: the lifecycle invariants (CA26-R3-01) refuse a
        // forged combination, so the winning write must be one the writers produce.
        expect(recorder.replace({...expected, state: 'operator-rejected'},
            {event: 'operator-session-proposal-rejected', rejectedBy: 'operator', reason: 'operator-rejected', detail: 'winner'},
            expected)).toBeNull();
        expect(storedDocument(scene).state).toBe('operator-rejected');
    });

    it('refuses a commit whose document was deleted after the decision, rather than recreating it', function () {
        recorded(scene);
        const stale = storedDocument(scene);
        nodeEffectFileSystem.remove(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId));
        const recorder = new SessionProposalRecorder(scene.store, scene.journal, nodeLaneMutationLock(laneDir));
        expect(recorder.replace({...stale, state: 'expired'}, null, stale))
            .toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_WRITE_CONFLICT'}));
        expect(existsSync(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId))).toBeFalse();
    });
});

describe('CA-26 compare-and-swap — apply\'s terminal write loses deterministically', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    /**
     * The one window `apply` cannot close with a lock: it must release the lane
     * lock before awaiting the executor, which acquires that same lock itself.
     * A writer that commits in that window used to be silently overwritten by
     * apply's terminal `effect-verified` write. Now the effect still runs — it
     * did happen, and CA-10's journal is its authority — but the caller is told
     * to recover from that journal instead of being handed a result built over
     * someone else's committed state.
     */
    it('refuses with recovery-required, and leaves the other writer\'s state intact', async function () {
        confirmed(scene);
        const interloper = {
            ...storedDocument(scene), state: 'rejected-stale-or-illegal' as const,
            publication: {
                event: 'operator-session-proposal-rejected' as const, rejectedBy: 'validator' as const,
                reason: 'OPERATOR_SESSION_PROPOSAL_STALE', detail: 'raced by another writer', status: 'published' as const
            }
        };
        const run = scene.runner.run.bind(scene.runner);
        scene.runner.run = async (invocation) => {
            // Commit directly through the store: an already-completed writer from
            // another process, not a second caller contending for this lock.
            scene.store.replace(interloper);
            return run(invocation);
        };
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({
            status: 'refused', reason: 'SESSION_PROPOSAL_RECOVERY_REQUIRED'
        }));
        expect(invocationsOf(scene.runner)).toBe(1);
        expect(storedDocument(scene).state).toBe('rejected-stale-or-illegal');
    });
});

describe('CA-26 staging — one writer\'s staged bytes are private, and nothing is left behind', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('stages under a per-write name, so no fixed path can be clobbered by another writer', function () {
        recorded(scene);
        const expected = storedDocument(scene);
        const staged: string[] = [];
        const create = nodeEffectFileSystem.createExclusive.bind(nodeEffectFileSystem);
        const spy = {...nodeEffectFileSystem, createExclusive: (path: string, text: string, mode: number) => {
            if (path.includes('.staged')) staged.push(path);
            return create(path, text, mode);
        }};
        const recorder = new SessionProposalRecorder(
            new (scene.store.constructor as new (dir: string, files: typeof nodeEffectFileSystem) => typeof scene.store)(laneDir, spy),
            scene.journal, nodeLaneMutationLock(laneDir)
        );
        recorder.replace({...expected, state: 'expired'}, null, expected);
        expect(staged.length).toBeGreaterThan(0);
        expect(staged.every((path) => /\.staged\.\d+\.\d+$/u.test(path))).toBeTrue();
        expect(existsSync(`${scene.store.path(OPERATOR_SESSION_ID, scene.proposalId)}.staged`)).toBeFalse();
    });

    it('leaves no staging debris across a complete record → confirm → apply lifecycle', async function () {
        confirmed(scene);
        await scene.service.apply(scene.applyRequest);
        const entries = readdirSync(dirname(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId)));
        expect(entries.filter((name) => name.includes('.staged'))).toEqual([]);
        expect(entries).toEqual([`${scene.proposalId}.json`]);
    });

    it('leaves no staging debris behind a refused compare-and-swap', function () {
        recorded(scene);
        const stale = storedDocument(scene);
        scene.service.reject({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, 'racing writer');
        const recorder = new SessionProposalRecorder(scene.store, scene.journal, nodeLaneMutationLock(laneDir));
        recorder.replace({...stale, state: 'expired'}, null, stale);
        const entries = readdirSync(dirname(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId)));
        expect(entries.filter((name) => name.includes('.staged'))).toEqual([]);
        expect(JSON.parse(readFileSync(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId), 'utf8')).state)
            .toBe('operator-rejected');
    });
});
