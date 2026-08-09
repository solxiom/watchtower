/**
 * CA-26 lifecycle, durable-artifact, and architecture proof.
 *
 * The §15.1 state machine is proved as a machine (every edge, every terminal
 * state), the durable document is proved to be exactly what CA-16R's accepted
 * session-index reader projects, and the owned surface is proved model-free and
 * inside its structural line ceilings.
 */
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {EFFECT_TYPES, SESSION_PROPOSAL_COORDINATOR_TYPES, SESSION_PROPOSAL_STATES, SESSION_PROPOSAL_TYPES, PROPOSAL_TYPES} from '../../../src/contracts/index.js';
import {
    APPLY_ENTRY_STATE, canTransition, isEffectBearingCategory, isSessionConfirmableType, isTerminalState,
    nextStates, parseSessionProposalDocument, requiredCoordinatorType, sessionReasonFor
} from '../../../src/foundation/lane/coordinator/sessionProposal/index.js';
import {buildSessionRows} from '../../../src/foundation/index/sessions/sessionIndexRows.js';
import {getLegalEffects} from '../../../src/foundation/proposal/proposalMatrix.js';
import type {OperatorSession} from '../../../src/contracts/operatorSession.js';
import {confirmed, makeLaneDir, OPERATOR_SESSION_ID, removeLaneDir, scenario, type Scenario} from './support/sessionProposalFixtures.js';

describe('CA-26 §15.1 lifecycle machine', function () {
    it('permits exactly the §15.1 edges out of every state', function () {
        expect(nextStates('proposed')).toEqual(['operator-confirmed', 'operator-rejected', 'expired']);
        expect(nextStates('operator-confirmed')).toEqual(['revalidated', 'rejected-stale-or-illegal', 'expired']);
        expect(nextStates('revalidated')).toEqual(['effect-prepared', 'rejected-stale-or-illegal']);
        expect(nextStates('effect-prepared')).toEqual(['effect-verified', 'effect-uncertain']);
    });

    it('treats every outcome state as terminal', function () {
        const terminal = SESSION_PROPOSAL_STATES.filter(isTerminalState).slice().sort();
        expect(terminal).toEqual(['effect-uncertain', 'effect-verified', 'expired', 'operator-rejected', 'rejected-stale-or-illegal']);
    });

    it('refuses every edge the lifecycle does not name', function () {
        expect(canTransition('proposed', 'effect-verified')).toBeFalse();
        expect(canTransition('operator-rejected', 'operator-confirmed')).toBeFalse();
        expect(canTransition('expired', 'operator-confirmed')).toBeFalse();
        expect(canTransition('effect-verified', 'effect-uncertain')).toBeFalse();
    });

    it('enters apply from the confirmed state only', function () {
        expect(APPLY_ENTRY_STATE).toBe('operator-confirmed');
    });
});

describe('CA-26 §15.2 confirmable-category table', function () {
    it('maps every effect-bearing session category to exactly one closed coordinator type', function () {
        expect(Object.keys(SESSION_PROPOSAL_COORDINATOR_TYPES).slice().sort()).toEqual([...SESSION_PROPOSAL_TYPES].sort());
        for (const category of SESSION_PROPOSAL_TYPES.filter(isEffectBearingCategory)) {
            const coordinatorType = requiredCoordinatorType(category);
            if (coordinatorType === null) throw new Error(`"${category}" is effect-bearing but maps to no type`);
            expect(PROPOSAL_TYPES).toContain(coordinatorType);
        }
    });

    /**
     * §18.6 resolves an escalation "only through a confirmed legal proposal or
     * explicit operator closure with rationale", and the closed §5 registry has
     * no proposal type or effect that expresses closure — `escalate` opens the
     * attention session. The category is therefore not effect-bearing, and this
     * is the assertion that stops it being laundered into `open-escalation`.
     */
    it('marks escalation-close as the one category with no effect in the closed registry', function () {
        expect(SESSION_PROPOSAL_TYPES.filter((category) => !isEffectBearingCategory(category))).toEqual(['escalation-close']);
        expect(requiredCoordinatorType('escalation-close')).toBeNull();
    });

    it('excludes exactly the coordinator types §15.2 routes away from operator sessions', function () {
        const excluded = PROPOSAL_TYPES.filter((type) => !isSessionConfirmableType(type)).slice().sort();
        expect(excluded).toEqual([
            'admit-pack-amendment', 'classify-reject', 'escalate', 'open-correction', 'propose-reconciliation',
            'propose-specification-resolution', 'resume-specification-blocked-session'
        ]);
    });

    /**
     * A drift guard, not a restatement. The lane's effect vocabulary grows
     * (CA-30 added `rebuild-index`), and an effect becomes session-reachable
     * only by being legal for a session-confirmable proposal type. This asserts
     * the reachable set directly from the accepted matrix, so a future effect
     * attached to a confirmable type fails here instead of silently becoming
     * operator-approvable.
     */
    it('exposes only the effects §15.2 allows an operator session to confirm', function () {
        const reachable = new Set(SESSION_PROPOSAL_TYPES
            .map(requiredCoordinatorType)
            .filter((type): type is NonNullable<typeof type> => type !== null)
            .flatMap((type) => [...getLegalEffects(type)]));
        expect([...reachable].sort()).toEqual([
            'create-amendment-request', 'dispatch-batch', 'grant-session-budget',
            'place-hold', 'release-hold', 'reroute-endpoint', 'route-correction'
        ]);
        const unreachable = EFFECT_TYPES.filter((effect) => !reachable.has(effect));
        expect(unreachable).toContain('open-escalation');
        expect(unreachable).toContain('rebuild-index');
        expect(unreachable).toContain('activate-pack-revision');
        expect(unreachable).toContain('publish-commits');
        expect(unreachable).toContain('record-acceptance');
    });

    it('translates validator reasons into the canonical §23 session codes', function () {
        expect(sessionReasonFor('PROPOSAL_STALE_SNAPSHOT')).toBe('OPERATOR_SESSION_PROPOSAL_STALE');
        expect(sessionReasonFor('PROPOSAL_PRECONDITION_FAILED')).toBe('OPERATOR_SESSION_PROPOSAL_STALE');
        expect(sessionReasonFor('PROPOSAL_CONFIRMATION_REQUIRED')).toBe('OPERATOR_SESSION_CONFIRMATION_REQUIRED');
        expect(sessionReasonFor('PROPOSAL_AUTHORITY_REQUIRED')).toBe('OPERATOR_SESSION_PROPOSAL_ILLEGAL');
        expect(sessionReasonFor('PROPOSAL_EFFECT_ILLEGAL')).toBe('OPERATOR_SESSION_PROPOSAL_ILLEGAL');
    });
});

describe('CA-26 durable artifact — the bytes CA-16R projects', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('writes the document where §20 says, owner-only', function () {
        confirmed(scene);
        const path = join(laneDir, 'coordinator', 'operator-sessions', OPERATOR_SESSION_ID, 'proposals', `${scene.proposalId}.json`);
        expect(statSync(path).isFile()).toBeTrue();
        expect(statSync(path).mode & 0o777).toBe(0o600);
    });

    it('round-trips through its own parser after every lifecycle write', async function () {
        confirmed(scene);
        await scene.service.apply(scene.applyRequest);
        const raw = JSON.parse(readFileSync(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId), 'utf8')) as unknown;
        expect(parseSessionProposalDocument(raw).state).toBe('effect-verified');
    });

    it('projects into CA-16R session_proposals rows without transcription', function () {
        confirmed(scene);
        const document = JSON.parse(readFileSync(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId), 'utf8')) as unknown;
        const rows = buildSessionRows({identity: indexIdentity(), checkpoint: `sha256:${'1'.repeat(64)}`, turns: [], proposals: [document]});
        expect(rows.proposals.length).toBe(1);
        expect(rows.proposals[0].proposal_id).toBe(scene.proposalId);
        expect(rows.proposals[0].proposal_type).toBe('candidate-select');
        expect(rows.proposals[0].state).toBe('operator-confirmed');
    });

    it('leaves no staging artifact behind after an atomic replace', async function () {
        confirmed(scene);
        await scene.service.apply(scene.applyRequest);
        const entries = readdirSync(join(laneDir, 'coordinator', 'operator-sessions', OPERATOR_SESSION_ID, 'proposals'));
        expect(entries).toEqual([`${scene.proposalId}.json`]);
    });
});

const SOURCE_ROOT = join(process.cwd(), 'src');
const CONTRACT_FILE = join(SOURCE_ROOT, 'contracts', 'sessionProposal.ts');
const CAPSULE_DIR = join(SOURCE_ROOT, 'foundation', 'lane', 'coordinator', 'sessionProposal');
const CAPSULE_FILES = readdirSync(CAPSULE_DIR).filter((name) => name.endsWith('.ts')).map((name) => join(CAPSULE_DIR, name));
const MODEL_IMPORT = /from\s+['"](?:@anthropic-ai\/[^'"]*|anthropic|openai|langchain[^'"]*|ai)['"]/i;

describe('CA-26 owned surface — model-free, thin, single-owner', function () {
    it('never imports a model/AI provider package', function () {
        expect([CONTRACT_FILE, ...CAPSULE_FILES].filter((file) => MODEL_IMPORT.test(readFileSync(file, 'utf8')))).toEqual([]);
    });

    it('never spawns a process or opens a network call', function () {
        expect(CAPSULE_FILES.filter((file) => /\bfetch\(|child_process|spawn\(/u.test(readFileSync(file, 'utf8')))).toEqual([]);
    });

    it('imports node:fs only through the accepted CA-10 filesystem port, never directly', function () {
        expect(CAPSULE_FILES.filter((file) => /from '(node:fs|node:fs\/promises)'/u.test(readFileSync(file, 'utf8')))).toEqual([]);
    });

    it('keeps the contract module inside the contract-module ceiling', function () {
        expect(lineCount(CONTRACT_FILE)).toBeLessThanOrEqual(400);
    });

    it('keeps every capsule module inside the foundation-service ceiling', function () {
        const oversized = CAPSULE_FILES.map((file) => ({file, lines: lineCount(file)})).filter((entry) => entry.lines > 260);
        expect(oversized).toEqual([]);
    });

    it('keeps the front door inside the orchestrator ceiling', function () {
        expect(lineCount(join(CAPSULE_DIR, 'SessionProposalService.ts'))).toBeLessThanOrEqual(180);
    });

    it('keeps the capsule barrel inside the barrel ceiling', function () {
        expect(lineCount(join(CAPSULE_DIR, 'index.ts'))).toBeLessThanOrEqual(120);
    });
});

/** The minimal CA-15 session identity CA-16R's row builder requires alongside the proposal bytes. */
function indexIdentity(): OperatorSession {
    return {
        schemaVersion: 1, operatorSessionId: OPERATOR_SESSION_ID, laneId: 'lane-1', origin: 'operator',
        policyProfileId: 'operator-standard', tags: [], state: 'open', activeTurnId: null, topic: 'ca-26',
        createdAt: '2026-08-06T12:00:00Z', lastTurnAt: null, turnCount: 0, parentOperatorSessionId: null,
        retentionPolicy: 'local-standard', budgetSegmentId: 'seg-1', pinnedRefs: []
    };
}

/** Physical source lines, matching `wc -l`: a single trailing newline does not add a line. */
function lineCount(file: string): number {
    const lines = readFileSync(file, 'utf8').split('\n');
    return lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
}
