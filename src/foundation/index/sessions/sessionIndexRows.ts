/**
 * Translates the validated CA-15 source into the closed typed registry rows,
 * including the 500-UTF-8-byte excerpt cap on a code-point boundary. No SQLite
 * and no journal access: it consumes the `RawSessionSource` that
 * `sessionIndexSource.ts` produced. Enum membership is re-checked against
 * `enums.json`, declared content digests/lengths must match the bytes actually
 * read, and a malformed reference or proposal refuses the source rather than
 * being dropped. Excerpt incompleteness is derived, never stored.
 */
import {SessionIndexError} from '../../../contracts/index.js';
import type {CapsuleEvidenceRef, CapsuleProposalRef, SessionDecisionClass} from '../../../contracts/index.js';
import type {TypedRow} from '../../storage/index.js';
import {buildCapsule, isDigest} from './sessionCapsule.js';
import type {RawContent, RawSessionSource, RawTurnSource} from './sessionIndexSource.js';
import {
    asEnum, asInt, asOptEnum, asRecord, asText, inEnum, MAX_EXCERPT_BYTES, MAX_QUESTION_BYTES,
    MAX_TOPIC_BYTES, parseRef
} from './sessionIndexSchema.js';

export interface SessionRows {
    readonly operatorSession: TypedRow;
    readonly pins: TypedRow[];
    readonly turns: TypedRow[];
    readonly turnRefs: TypedRow[];
    readonly openQuestions: TypedRow[];
    readonly proposals: TypedRow[];
    readonly capsules: TypedRow[];
}

/** Cap a string to at most `max` UTF-8 bytes, never splitting a multibyte code point. */
export function capBytes(text: string, max: number): string {
    const buffer = Buffer.from(text, 'utf8');
    if (buffer.byteLength <= max) return text;
    let end = max;
    while (end > 0 && (buffer[end] & 0xc0) === 0x80) end -= 1;
    return buffer.toString('utf8', 0, end);
}

function fail(subject: string, message: string): never { throw new SessionIndexError('SESSION_SOURCE_INVALID', subject, message); }
/**
 * Verify a content file against the pointer that declares it and return the original byte length. Absent content is
 * legitimate pruning, but the declared digest is then the only surviving evidence of what was pruned, so it must still
 * be well formed: an unverifiable claim may not also be malformed.
 */
function contentBytes(content: RawContent, pointer: Record<string, unknown>, turnId: string, file: string): number {
    if (pointer.contentPath !== undefined && pointer.contentPath !== `turns/${turnId}/${file}`) fail(turnId, `${file} contentPath is not canonical`);
    if (pointer.sha256 !== undefined && !isDigest(pointer.sha256)) fail(turnId, `${file} declares a malformed sha256 digest`);
    if (!content.present) return pointer.bytes === undefined ? 0 : asInt(pointer.bytes, `${file}.bytes`);
    if (pointer.sha256 !== undefined && pointer.sha256 !== content.sha256) fail(turnId, `${file} sha256 does not match its bytes`);
    if (pointer.bytes !== undefined && pointer.bytes !== content.bytes) fail(turnId, `${file} byte length does not match its bytes`);
    return content.bytes;
}
/** Every `type:value` token a session or turn declares must name a closed refType; an unusable token refuses the source. */
function refsOf(tokens: readonly string[], subject: string): {refType: string; refValue: string}[] {
    return tokens.map((token) => parseRef(token) ?? fail(subject, `reference token "${token}" is not a closed <refType>:<value> pair`));
}

function operatorSessionRow({identity, checkpoint}: RawSessionSource): TypedRow {
    return {
        operator_session_id: identity.operatorSessionId, lane_id: asText(identity.laneId, 'laneId'),
        origin: asEnum('origin', identity.origin, 'origin'), policy_profile_id: asText(identity.policyProfileId, 'policyProfileId'),
        state: asEnum('sessionState', identity.state, 'state'), topic: capBytes(identity.topic, MAX_TOPIC_BYTES),
        created_at: identity.createdAt, last_turn_at: identity.lastTurnAt, turn_count: asInt(identity.turnCount, 'turnCount'),
        parent_operator_session_id: identity.parentOperatorSessionId, budget_segment_id: asText(identity.budgetSegmentId, 'budgetSegmentId'),
        journal_checkpoint: checkpoint, content_root: `coordinator/operator-sessions/${identity.operatorSessionId}`
    };
}

/** CA-15 identity carries pinned refs as `type:value` tokens with no per-pin time; the pin's time is the session's creation time. */
function pinRows(source: RawSessionSource): TypedRow[] {
    const id = source.identity.operatorSessionId;
    return refsOf(source.identity.pinnedRefs, id)
        .map((ref) => ({operator_session_id: id, ref_type: ref.refType, ref_value: ref.refValue, pinned_at: source.identity.createdAt}));
}
interface MappedTurn {readonly row: TypedRow; readonly response: Record<string, unknown> | null; readonly answer: {bytes: number; digest: string}}

function turnRow(source: RawSessionSource, turn: RawTurnSource): MappedTurn {
    const record = turn.record;
    const response = record.response === null ? null : asRecord(record.response, 'response');
    const usage = asRecord(record.usage, 'usage');
    const operatorBytes = contentBytes(turn.operator, record.operatorMessage as Record<string, unknown>, record.turnId, 'operator.md');
    const answerBytes = response === null ? 0 : contentBytes(turn.answer, response, record.turnId, 'coordinator.md');
    // contentBytes() is the single owner of declared-digest admission, so a surviving declared digest is already well formed.
    const digest = turn.answer.present ? turn.answer.sha256 : String(response?.sha256 ?? `sha256:${'0'.repeat(64)}`);
    return {
        response, answer: {bytes: answerBytes, digest},
        row: {
            turn_id: record.turnId, operator_session_id: source.identity.operatorSessionId,
            turn_number: asInt(record.turn, 'turn', 1), state: asEnum('turnState', record.state, 'turnState'),
            decision_class: asOptEnum('decisionClass', record.decisionClass, 'decisionClass'), routing_rule_id: record.routingRuleId,
            endpoint_id: record.endpointId, snapshot_revision: typeof record.snapshot.laneRevision === 'number' ? asInt(record.snapshot.laneRevision, 'laneRevision') : null,
            stale: record.stale ? 1 : 0, completed_at: record.completedAt,
            content_excerpt: capBytes(turn.operator.text, MAX_EXCERPT_BYTES), answer_excerpt: capBytes(turn.answer.text, MAX_EXCERPT_BYTES),
            answer_digest: digest,
            input_tokens: typeof usage.inputTokens === 'number' ? asInt(usage.inputTokens, 'inputTokens') : null,
            output_tokens: typeof usage.outputTokens === 'number' ? asInt(usage.outputTokens, 'outputTokens') : null,
            telemetry_quality: usage.quality === undefined ? 'unavailable' : asEnum('telemetryQuality', usage.quality, 'quality'),
            operator_bytes: operatorBytes, coordinator_bytes: answerBytes
        }
    };
}

/** Resolved evidence references come from the journal turn record; unresolved refs carry no target and are not indexed. */
function turnRefRows(turnId: string, record: {resolvedRefs: readonly string[]}): TypedRow[] {
    const seen = new Set<string>();
    return refsOf(record.resolvedRefs, turnId)
        .filter((ref) => !seen.has(`${ref.refType} ${ref.refValue}`) && seen.add(`${ref.refType} ${ref.refValue}`) !== undefined)
        .map((ref) => ({turn_id: turnId, ref_type: ref.refType, ref_value: ref.refValue}));
}

function openQuestionRows(turnId: string, response: Record<string, unknown> | null): TypedRow[] {
    const questions = response !== null && Array.isArray(response.openQuestions) ? response.openQuestions : [];
    return questions.map((question, index) => ({turn_id: turnId, question_index: index, question_text: capBytes(asText(question, 'openQuestion'), MAX_QUESTION_BYTES)}));
}

function capsuleProposals(response: Record<string, unknown> | null): CapsuleProposalRef[] {
    const effects = response !== null && Array.isArray(response.proposedEffects) ? response.proposedEffects : [];
    return effects.map((effect) => {
        const object = asRecord(effect, 'proposedEffect');
        return {proposalId: asText(object.proposalId, 'proposalId'), proposalType: asText(object.type, 'proposedEffect.type')};
    });
}

/** session_proposals rows come from the session's proposals/ directory; the owner is always this session. */
function proposalRows(source: RawSessionSource): TypedRow[] {
    const id = source.identity.operatorSessionId;
    return source.proposals.map((entry) => {
        const proposal = asRecord(entry, 'proposal');
        if (proposal.operatorSessionId !== undefined && proposal.operatorSessionId !== id) fail(id, 'proposal operatorSessionId does not match its session');
        return {
            proposal_id: asText(proposal.proposalId, 'proposalId'), operator_session_id: id,
            source_turn_id: asText(proposal.sourceTurnId, 'sourceTurnId'), proposal_type: asEnum('proposalType', proposal.proposalType, 'proposalType'),
            state: asEnum('proposalState', proposal.state, 'proposalState'), created_at: asText(proposal.createdAt, 'createdAt'),
            expires_at: asText(proposal.expiresAt, 'expiresAt')
        };
    });
}

/** A turn is cross-session referenceable only once it carries a decision class, a snapshot revision, and a completion time. */
function capsuleRow(source: RawSessionSource, turn: RawTurnSource, mapped: MappedTurn): TypedRow | null {
    const {decision_class: decisionClass, snapshot_revision: revision, completed_at: completedAt} = mapped.row;
    if (typeof decisionClass !== 'string' || !inEnum('decisionClass', decisionClass) || typeof revision !== 'number' || typeof completedAt !== 'string') return null;
    const capsule = buildCapsule({
        sourceOperatorSessionId: source.identity.operatorSessionId, sourceTurnId: turn.record.turnId, turnNumber: mapped.row.turn_number as number,
        laneId: source.identity.laneId, completedAt, decisionClass: decisionClass as SessionDecisionClass, routingRuleId: mapped.row.routing_rule_id as string | null,
        snapshotRevision: revision, stale: turn.record.stale,
        evidenceRefs: turnRefRows(turn.record.turnId, turn.record).map((ref) => ({refType: ref.ref_type as CapsuleEvidenceRef['refType'], refValue: ref.ref_value as string, stale: turn.record.stale})),
        openQuestions: openQuestionRows(turn.record.turnId, mapped.response).map((row) => row.question_text as string),
        proposals: capsuleProposals(mapped.response), answerExcerpt: mapped.row.answer_excerpt as string,
        answerBytes: mapped.answer.bytes, answerDigest: mapped.answer.digest, prunedContent: !turn.answer.present && mapped.answer.bytes > 0
    });
    return {source_turn_id: turn.record.turnId, capsule_json: JSON.stringify(capsule), created_at: capsule.completedAt};
}

/** Build every registry row for one validated operator session. */
export function buildSessionRows(source: RawSessionSource): SessionRows {
    const rows: SessionRows = {
        operatorSession: operatorSessionRow(source), pins: pinRows(source),
        turns: [], turnRefs: [], openQuestions: [], proposals: proposalRows(source), capsules: []
    };
    for (const turn of source.turns) {
        const mapped = turnRow(source, turn);
        rows.turns.push(mapped.row);
        rows.turnRefs.push(...turnRefRows(turn.record.turnId, turn.record));
        rows.openQuestions.push(...openQuestionRows(turn.record.turnId, mapped.response));
        const capsule = capsuleRow(source, turn, mapped);
        if (capsule !== null) rows.capsules.push(capsule);
    }
    return rows;
}
