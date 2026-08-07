/**
 * Cross-session turn reference capsules (operator-session.md 10.2): bounded and
 * non-transitive by construction. `buildCapsule` assembles the deterministic
 * capsule stored per source turn; `resolveCapsule` admits the stored capsule and
 * performs the lane-equality and prune checks before any source content is read.
 * The capsule never carries the operator message or the full answer (always
 * listed in `omitted`) and names references without expanding them; expanding
 * one would make it transitive. A lane mismatch denies before any capsule byte
 * is read, with OPERATOR_SESSION_REFERENCE_DENIED.
 */
import {createHash} from 'node:crypto';
import {
    SESSION_CAPSULE_OMISSIONS, SESSION_DECISION_CLASSES, SESSION_REF_TYPES, SessionIndexError
} from '../../../contracts/index.js';
import type {
    CapsuleEvidenceRef, CapsuleProposalRef, ReferenceCapsule, SessionCapsuleOmission, SessionDecisionClass
} from '../../../contracts/index.js';
import type {DerivedStore, TypedRow} from '../../storage/index.js';
import {MAX_CAPSULE_BYTES} from './sessionIndexSchema.js';

const CAPSULE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const CAPSULE_TS = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/u;
const CAPSULE_DIGEST = /^sha256:[0-9a-f]{64}$/u;
const CAPSULE_REQUIRED = ['capsuleVersion', 'sourceOperatorSessionId', 'sourceTurnId', 'turnNumber', 'laneId', 'completedAt', 'decisionClass',
    'snapshotRevision', 'stale', 'evidenceRefs', 'openQuestions', 'proposals', 'answerExcerpt', 'answerExcerptBytes', 'answerBytes', 'answerDigest', 'incomplete', 'omitted'];
const CAPSULE_OPTIONAL = new Set(['routingRuleId', 'prunedContent']);

function bad(subject: string, message: string): never { throw new SessionIndexError('SESSION_INDEX_CORRUPT', subject, message); }
function id(value: unknown): boolean { return typeof value === 'string' && CAPSULE_ID.test(value); }
function intAtLeast(value: unknown, min: number): boolean { return typeof value === 'number' && Number.isSafeInteger(value) && value >= min; }
/** The one admitted digest form for indexed answer content, shared with the row mapper so the rule has a single owner. */
export function isDigest(value: unknown): value is string { return typeof value === 'string' && CAPSULE_DIGEST.test(value); }
/** Digest of content the capsule actually carries; never a transcribed literal (gate C6). */
function digestOf(text: string): string { return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`; }

/**
 * Enforce every `capsule.schema.json` constraint on a capsule: the exact key set
 * (additionalProperties:false), identifier/timestamp/digest formats, array
 * maxima, enum membership, and the derived `incomplete` rule. Used at build and
 * at admission so no schema-invalid capsule is ever produced or served.
 */
export function assertCapsuleSchema(capsule: ReferenceCapsule, subject: string): void {
    const value = capsule as unknown as Record<string, unknown>;
    for (const key of Object.keys(value)) if (!CAPSULE_REQUIRED.includes(key) && !CAPSULE_OPTIONAL.has(key)) bad(subject, `capsule carries an unexpected field ${key}`);
    for (const key of CAPSULE_REQUIRED) if (!Object.hasOwn(value, key)) bad(subject, `capsule is missing ${key}`);
    if (capsule.capsuleVersion !== 'session-index-capsule/2' || !id(capsule.sourceOperatorSessionId) || !id(capsule.sourceTurnId) || !id(capsule.laneId)
        || (capsule.routingRuleId !== undefined && !id(capsule.routingRuleId)) || !CAPSULE_TS.test(capsule.completedAt)
        || !(SESSION_DECISION_CLASSES as readonly string[]).includes(capsule.decisionClass) || !intAtLeast(capsule.turnNumber, 1) || !intAtLeast(capsule.snapshotRevision, 0)
        || typeof capsule.stale !== 'boolean' || typeof capsule.incomplete !== 'boolean' || (capsule.prunedContent !== undefined && typeof capsule.prunedContent !== 'boolean')) {
        bad(subject, 'capsule violates a scalar constraint in capsule.schema.json');
    }
    if (!Array.isArray(capsule.evidenceRefs) || capsule.evidenceRefs.length > 64 || capsule.evidenceRefs.some((ref) => Object.keys(ref).length !== 3
        || !(SESSION_REF_TYPES as readonly string[]).includes(ref.refType) || !id(ref.refValue) || typeof ref.stale !== 'boolean')) bad(subject, 'capsule evidenceRefs violate the schema');
    if (!Array.isArray(capsule.openQuestions) || capsule.openQuestions.length > 32 || capsule.openQuestions.some((question) => typeof question !== 'string' || question.length > 1000)) bad(subject, 'capsule openQuestions violate the schema');
    if (!Array.isArray(capsule.proposals) || capsule.proposals.length > 32 || capsule.proposals.some((proposal) => Object.keys(proposal).length !== 2 || !id(proposal.proposalId) || !id(proposal.proposalType))) bad(subject, 'capsule proposals violate the schema');
    if (typeof capsule.answerExcerpt !== 'string' || capsule.answerExcerpt.length > 500 || !intAtLeast(capsule.answerExcerptBytes, 0) || capsule.answerExcerptBytes > 500
        || !intAtLeast(capsule.answerBytes, 0) || !isDigest(capsule.answerDigest)) bad(subject, 'capsule answer fields violate the schema');
    if (capsule.incomplete !== (capsule.answerExcerptBytes < capsule.answerBytes)) bad(subject, 'capsule incomplete flag disagrees with its derivation');
    if (!Array.isArray(capsule.omitted) || capsule.omitted.length > 4 || new Set(capsule.omitted).size !== capsule.omitted.length
        || capsule.omitted.some((entry) => !(SESSION_CAPSULE_OMISSIONS as readonly string[]).includes(entry))) bad(subject, 'capsule omitted list violates the schema');
}

export interface CapsuleBuildInput {
    readonly sourceOperatorSessionId: string; readonly sourceTurnId: string; readonly turnNumber: number;
    readonly laneId: string; readonly completedAt: string; readonly decisionClass: SessionDecisionClass;
    readonly routingRuleId: string | null; readonly snapshotRevision: number; readonly stale: boolean;
    readonly evidenceRefs: readonly CapsuleEvidenceRef[]; readonly openQuestions: readonly string[];
    readonly proposals: readonly CapsuleProposalRef[]; readonly answerExcerpt: string;
    readonly answerBytes: number; readonly answerDigest: string; readonly prunedContent: boolean;
}

/** CA-15 stamps `Date.toISOString()`; `capsule.schema.json` bounds a capsule timestamp to second precision, which is the resolution a bounded summary carries. */
export function capsuleTimestamp(value: string): string { return value.replace(/\.\d+Z$/u, 'Z'); }

/** Assemble the deterministic bounded capsule for one source turn. Excerpt bytes are already capped by the row builder. */
export function buildCapsule(input: CapsuleBuildInput): ReferenceCapsule {
    const answerExcerpt = input.prunedContent ? '' : input.answerExcerpt;
    const answerExcerptBytes = Buffer.byteLength(answerExcerpt, 'utf8');
    const omitted: SessionCapsuleOmission[] = ['operator-message', 'full-answer', 'transitive-references'];
    if (input.prunedContent) omitted.push('pruned-content');
    const capsule: ReferenceCapsule = {
        capsuleVersion: 'session-index-capsule/2',
        sourceOperatorSessionId: input.sourceOperatorSessionId, sourceTurnId: input.sourceTurnId,
        turnNumber: input.turnNumber, laneId: input.laneId, completedAt: capsuleTimestamp(input.completedAt),
        decisionClass: input.decisionClass, snapshotRevision: input.snapshotRevision, stale: input.stale,
        evidenceRefs: input.evidenceRefs, openQuestions: input.openQuestions, proposals: input.proposals,
        answerExcerpt, answerExcerptBytes, answerBytes: input.answerBytes, answerDigest: input.answerDigest,
        incomplete: answerExcerptBytes < input.answerBytes, omitted, prunedContent: input.prunedContent,
        ...(input.routingRuleId === null ? {} : {routingRuleId: input.routingRuleId})
    };
    assertCapsuleSchema(capsule, input.sourceTurnId);
    if (Buffer.byteLength(JSON.stringify(capsule), 'utf8') > MAX_CAPSULE_BYTES) throw new SessionIndexError('SESSION_INDEX_BUILD_FAILED', input.sourceTurnId, `capsule exceeds ${MAX_CAPSULE_BYTES} bytes`);
    return capsule;
}

/**
 * Admit a stored capsule before it can leave the index. Having once built a
 * capsule is not evidence that the row still holds one, so the byte bound, the
 * derived excerpt length, the answer digest, and every relational field are
 * re-proved here against the admitted `turns`/`operator_sessions` rows.
 */
function parseStoredCapsule(raw: unknown, subject: string, turn: TypedRow, session: TypedRow): ReferenceCapsule {
    if (typeof raw !== 'string') bad(subject, 'capsule_json is not text');
    if (Buffer.byteLength(raw, 'utf8') > MAX_CAPSULE_BYTES) bad(subject, `stored capsule exceeds ${MAX_CAPSULE_BYTES} bytes`);
    let value: unknown;
    try { value = JSON.parse(raw); } catch { bad(subject, 'capsule_json is not valid JSON'); }
    if (typeof value !== 'object' || value === null || (value as {capsuleVersion?: unknown}).capsuleVersion !== 'session-index-capsule/2') {
        bad(subject, 'capsule_json is not a session-index-capsule/2');
    }
    const capsule = value as ReferenceCapsule;
    assertCapsuleSchema(capsule, subject);
    if (capsule.answerExcerptBytes !== Buffer.byteLength(capsule.answerExcerpt, 'utf8')) bad(subject, 'capsule answerExcerptBytes disagrees with its own excerpt');
    // A pruned source is exactly an indexed turn that kept its answer length and lost its excerpt, so deriving the
    // relation from the row refuses a forged tombstone before the prune branch can act on the claim. The complete-answer
    // digest is never taken from the capsule in any branch: it is pinned to turns.answer_digest, which the row mapper
    // wrote from the producer bytes. When the capsule also carries the whole answer, the indexed digest must in addition
    // reproduce that excerpt, so a truncated capsule cannot masquerade as complete to escape the stronger check.
    const pruned = String(turn.answer_excerpt) === '' && Number(turn.coordinator_bytes) > 0;
    const complete = !capsule.incomplete && !pruned;
    if (complete && String(turn.answer_digest) !== digestOf(capsule.answerExcerpt)) bad(subject, 'indexed answer digest does not reproduce the complete answer it indexes');
    const expected: ReadonlyArray<readonly [string, unknown, unknown]> = [
        ['prunedContent', capsule.prunedContent === true, pruned], ['answerDigest', capsule.answerDigest, String(turn.answer_digest)],
        ['sourceTurnId', capsule.sourceTurnId, String(turn.turn_id)], ['sourceOperatorSessionId', capsule.sourceOperatorSessionId, String(turn.operator_session_id)],
        ['laneId', capsule.laneId, String(session.lane_id)], ['turnNumber', capsule.turnNumber, Number(turn.turn_number)],
        ['decisionClass', capsule.decisionClass, String(turn.decision_class)], ['snapshotRevision', capsule.snapshotRevision, Number(turn.snapshot_revision)],
        ['stale', capsule.stale, Number(turn.stale) === 1], ['completedAt', capsule.completedAt, capsuleTimestamp(String(turn.completed_at))],
        ['answerBytes', capsule.answerBytes, Number(turn.coordinator_bytes)],
        ['answerExcerpt', capsule.answerExcerpt, pruned ? '' : String(turn.answer_excerpt)]
    ];
    for (const [field, actual, indexed] of expected) if (actual !== indexed) bad(subject, `capsule ${field} disagrees with its indexed source turn`);
    return capsule;
}

/**
 * Resolve the stored capsule for `sourceTurnId` on behalf of a requesting lane.
 * Lane equality is compared before any capsule content is read; a mismatch
 * denies. A genuinely pruned source resolves to its tombstone with
 * OPERATOR_SESSION_CONTENT_PRUNED, but only after admission proved the claim.
 */
export async function resolveCapsule(store: DerivedStore, requestingLaneId: string, sourceTurnId: string): Promise<ReferenceCapsule> {
    const turn = await store.getByPrimaryKey('turns', sourceTurnId);
    if (turn === undefined) throw new SessionIndexError('TURN_NOT_FOUND', sourceTurnId, 'no such turn in this lane');
    const session = await store.getByPrimaryKey('operator_sessions', turn.operator_session_id as string);
    if (session === undefined) throw new SessionIndexError('SESSION_INDEX_CORRUPT', sourceTurnId, 'turn references an unknown operator session');
    if (session.lane_id !== requestingLaneId) {
        throw new SessionIndexError('OPERATOR_SESSION_REFERENCE_DENIED', sourceTurnId, 'cross-lane turn reference is denied');
    }
    const stored: TypedRow | undefined = await store.getByPrimaryKey('turn_reference_capsules', sourceTurnId);
    if (stored === undefined) throw new SessionIndexError('TURN_NOT_FOUND', sourceTurnId, 'turn is not cross-session referenceable');
    const capsule = parseStoredCapsule(stored.capsule_json, sourceTurnId, turn, session);
    if (capsule.prunedContent === true) {
        throw new SessionIndexError('OPERATOR_SESSION_CONTENT_PRUNED', sourceTurnId, 'source turn content is pruned; only its tombstone remains');
    }
    return capsule;
}
