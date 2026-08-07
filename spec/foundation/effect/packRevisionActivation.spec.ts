/**
 * CA-10 acceptance proof — atomic pack-revision activation, same-session
 * resume, and the absence of any automatic Git synchronization
 * (`specification-resolution.md` §7–§8).
 */
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {EffectExecutionError} from '../../../src/contracts/effects.js';
import {
    activatePackRevision, assertResumable, readActiveRevision
} from '../../../src/foundation/effect/packRevisionActivation.js';
import {nodeEffectFileSystem} from '../../../src/foundation/effect/nodeEffectFileSystem.js';
import type {
    AdmittedRevisionState, OriginalAssignmentRecord, WorktreeSyncRecord
} from '../../../src/foundation/proposal/proposalValidatorContracts.js';
import {fixedClock, makeLaneDir, removeLaneDir} from './support/effectFixtures.js';

const DEPS = {files: nodeEffectFileSystem, clock: fixedClock()};
const FIRST_SEAL = `sha256:${'1'.repeat(64)}`;
const SECOND_SEAL = `sha256:${'2'.repeat(64)}`;
const COMMIT = '0'.repeat(40);

const ADMITTED: AdmittedRevisionState = Object.freeze({blockerId: 'blocker-1', activeSeal: FIRST_SEAL, requiredCommit: COMMIT});
const ASSIGNMENT: OriginalAssignmentRecord = Object.freeze({
    blockerId: 'blocker-1', workerSessionId: 'worker-1', operatorSessionId: 'opsess-1', worktreeId: 'wt-1', claimIds: []
});
const SYNCHRONIZED: WorktreeSyncRecord = Object.freeze({worktreeId: 'wt-1', status: 'synchronized', syncedRevision: COMMIT});
const RESUMED = Object.freeze({workerSessionId: 'worker-1', operatorSessionId: 'opsess-1', worktreeId: 'wt-1'});

function activateFirst(laneDir: string) {
    return activatePackRevision({
        laneDir, laneId: 'lane-1', blockerId: 'blocker-1', admitted: ADMITTED, supersedesSeal: '',
        affectedWorktreeIds: ['wt-1']
    }, DEPS);
}

describe('pack-revision activation — atomic and all-or-nothing', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('activates the first revision and reads it back as the single active pointer', function () {
        const activated = activateFirst(laneDir);
        expect(activated.activeSeal).toBe(FIRST_SEAL);
        expect(activated.supersedesSeal).toBeNull();
        expect(readActiveRevision(laneDir, nodeEffectFileSystem)).toEqual(activated);
    });

    it('leaves no staging artifact behind, so no half-active revision can be observed', function () {
        activateFirst(laneDir);
        expect(readdirSync(join(laneDir, 'coordinator', 'revision'))).toEqual(['active-revision.json']);
    });

    it('is idempotent: re-activating the live seal returns the live pointer unchanged', function () {
        const first = activateFirst(laneDir);
        const bytes = readFileSync(join(laneDir, 'coordinator', 'revision', 'active-revision.json'), 'utf8');
        expect(activateFirst(laneDir)).toEqual(first);
        expect(readFileSync(join(laneDir, 'coordinator', 'revision', 'active-revision.json'), 'utf8')).toBe(bytes);
    });

    it('supersedes only the currently active seal and refuses a stale supersedesSeal', function () {
        activateFirst(laneDir);
        const next = activatePackRevision({
            laneDir, laneId: 'lane-1', blockerId: 'blocker-1', supersedesSeal: FIRST_SEAL,
            admitted: {blockerId: 'blocker-1', activeSeal: SECOND_SEAL, requiredCommit: COMMIT}, affectedWorktreeIds: []
        }, DEPS);
        expect(next.supersedesSeal).toBe(FIRST_SEAL);
        expect(() => activatePackRevision({
            laneDir, laneId: 'lane-1', blockerId: 'blocker-1', supersedesSeal: FIRST_SEAL,
            admitted: {blockerId: 'blocker-1', activeSeal: `sha256:${'3'.repeat(64)}`, requiredCommit: COMMIT}, affectedWorktreeIds: []
        }, DEPS)).toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'EFFECT_REVISION_NOT_ADMITTED');
        expect(readActiveRevision(laneDir, nodeEffectFileSystem)?.activeSeal).toBe(SECOND_SEAL);
    });

    it('refuses an admitted revision bound to a different blocker', function () {
        expect(() => activatePackRevision({
            laneDir, laneId: 'lane-1', blockerId: 'blocker-other', admitted: ADMITTED, supersedesSeal: '', affectedWorktreeIds: []
        }, DEPS)).toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'EFFECT_REVISION_NOT_ADMITTED');
        expect(readActiveRevision(laneDir, nodeEffectFileSystem)).toBeNull();
    });

    it('fails closed on a corrupt active pointer rather than treating it as absent', function () {
        activateFirst(laneDir);
        writeFileSync(join(laneDir, 'coordinator', 'revision', 'active-revision.json'), '{"schemaVersion":1,');
        expect(() => readActiveRevision(laneDir, nodeEffectFileSystem))
            .toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'EFFECT_REVISION_NOT_ADMITTED');
    });

    it('records the affected worktrees as sync-required instead of synchronizing them', function () {
        expect(activateFirst(laneDir).worktreeSyncRequired).toEqual(['wt-1']);
    });
});

describe('same-session resume — original identity and explicit sync evidence', function () {
    it('admits a resume for the original worker, operator session, and worktree', function () {
        expect(() => assertResumable(ASSIGNMENT, SYNCHRONIZED, ADMITTED, RESUMED)).not.toThrow();
    });

    it('refuses a substituted worker or operator-session identity', function () {
        for (const substituted of [{...RESUMED, workerSessionId: 'worker-2'}, {...RESUMED, operatorSessionId: 'opsess-2'}, {...RESUMED, worktreeId: 'wt-2'}]) {
            expect(() => assertResumable(ASSIGNMENT, SYNCHRONIZED, ADMITTED, substituted))
                .toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'EFFECT_RESUME_IDENTITY_MISMATCH');
        }
    });

    it('refuses a resume with missing, stale, or mismatched synchronization evidence', function () {
        const cases: readonly (WorktreeSyncRecord | undefined)[] = [
            undefined,
            {worktreeId: 'wt-1', status: 'stale', syncedRevision: COMMIT},
            {worktreeId: 'wt-1', status: 'synchronized', syncedRevision: '9'.repeat(40)},
            {worktreeId: 'wt-2', status: 'synchronized', syncedRevision: COMMIT}
        ];
        for (const sync of cases) {
            expect(() => assertResumable(ASSIGNMENT, sync, ADMITTED, RESUMED))
                .toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'EFFECT_WORKTREE_STALE');
        }
    });
});
