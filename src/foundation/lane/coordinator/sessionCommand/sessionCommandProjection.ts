/**
 * Bounded, deterministic JSON projections of durable operator-session bytes
 * (CA-24).
 *
 * Every function here is a pure fold over records the accepted CA-15 owner
 * already returned. Nothing reads a file, decides a transition, or summarizes
 * with a model: `docs/spec/cli-session.md` §9.1 requires `/history`, `/budget`,
 * and `/export` to render retained records deterministically, so the command
 * boundary projects and never interprets.
 */
import type {JsonObject, JsonValue} from '../../../../contracts/types.js';
import type {
    OperatorSession, SessionJournalEntry, TurnRecord
} from '../../../../contracts/operatorSession.js';

/** The pin events CA-15 admits as session metadata; `added: false` removes one. */
const PIN_EVENT = 'operator-session-pinned';

export function sessionRow(session: OperatorSession): JsonObject {
    return {
        operatorSessionId: session.operatorSessionId, laneId: session.laneId, origin: session.origin,
        state: session.state, topic: session.topic, tags: [...session.tags], turnCount: session.turnCount,
        createdAt: session.createdAt, lastTurnAt: session.lastTurnAt, activeTurnId: session.activeTurnId,
        policyProfileId: session.policyProfileId, parentOperatorSessionId: session.parentOperatorSessionId,
        retentionPolicy: session.retentionPolicy, budgetSegmentId: session.budgetSegmentId
    };
}

/**
 * The effective pin set: the creation-time refs folded with every durable pin
 * event, in journal order. `operator-session.json` is a materialized snapshot,
 * so the journal — not the snapshot — decides which refs are currently pinned.
 */
export function effectivePins(session: OperatorSession, entries: readonly SessionJournalEntry[]): string[] {
    const pins = new Set<string>(session.pinnedRefs);
    for (const entry of entries) {
        if (entry.type !== PIN_EVENT) continue;
        const ref = entry.payload.ref;
        if (typeof ref !== 'string' || ref.length === 0) continue;
        if (entry.payload.added === false) pins.delete(ref); else pins.add(ref);
    }
    return [...pins].sort();
}

/** One turn as history renders it: identity, routing, and sizes — never full text. */
export function turnRow(turn: TurnRecord): JsonObject {
    return {
        turnId: turn.turnId, turn: turn.turn, state: turn.state, stale: turn.stale,
        completedAt: turn.completedAt, decisionClass: turn.decisionClass,
        routingRuleId: turn.routingRuleId, endpointId: turn.endpointId,
        operatorMessageBytes: messageBytes(turn), resolvedRefs: [...turn.resolvedRefs],
        unresolvedRefs: [...turn.unresolvedRefs]
    };
}

/** One journal entry as export renders it: the durable record, with its payload preserved. */
export function journalRow(entry: SessionJournalEntry): JsonObject {
    return {
        eventId: entry.eventId, sequence: entry.sequence, type: entry.type, at: entry.at,
        producer: entry.producer, correlationId: entry.correlationId, causationId: entry.causationId,
        policyVersion: entry.policyVersion, payload: entry.payload as JsonObject
    };
}

export interface BudgetProjection extends JsonObject {
    readonly cumulativeTokens: number;
    readonly modelBackedTurns: number;
    readonly grants: readonly JsonValue[];
    readonly warnings: number;
    readonly exceeded: number;
    readonly telemetryQuality: string;
}

/**
 * Session budget as durable bytes report it: usage summed from the turns CA-15
 * materialized, grants read from the journal events CA-17 appends. A counter
 * this fold cannot prove from a durable record stays at zero rather than being
 * estimated, and telemetry quality degrades to `partial` when any turn omitted
 * its usage record.
 */
export function budgetProjection(
    turns: readonly TurnRecord[], entries: readonly SessionJournalEntry[]
): BudgetProjection {
    let cumulativeTokens = 0;
    let modelBackedTurns = 0;
    let missingUsage = 0;
    for (const turn of turns) {
        const tokens = usageTokens(turn);
        if (tokens === null) missingUsage += 1; else cumulativeTokens += tokens;
        if (turn.endpointId !== null) modelBackedTurns += 1;
    }
    const grants = entries.filter((entry) => entry.type === 'operator-session-budget-granted')
        .map((entry) => ({eventId: entry.eventId, at: entry.at, grant: entry.payload as JsonObject}));
    return {
        cumulativeTokens, modelBackedTurns, grants,
        warnings: countType(entries, 'operator-session-budget-warning'),
        exceeded: countType(entries, 'operator-session-budget-exceeded'),
        telemetryQuality: missingUsage === 0 ? 'reported' : 'partial'
    };
}

/** Unapplied session proposals, as the durable proposal events record them. */
export function proposalProjection(entries: readonly SessionJournalEntry[]): JsonObject[] {
    const settled = new Set<string>();
    for (const entry of entries) {
        if (entry.type !== 'operator-session-proposal-rejected') continue;
        const id = entry.payload.proposalId;
        if (typeof id === 'string') settled.add(id);
    }
    const rows: JsonObject[] = [];
    for (const entry of entries) {
        if (entry.type !== 'operator-session-proposal-confirmed') continue;
        const id = entry.payload.proposalId;
        if (typeof id !== 'string' || settled.has(id)) continue;
        rows.push({proposalId: id, eventId: entry.eventId, at: entry.at, payload: entry.payload as JsonObject});
    }
    return rows;
}

function countType(entries: readonly SessionJournalEntry[], type: SessionJournalEntry['type']): number {
    return entries.filter((entry) => entry.type === type).length;
}

function messageBytes(turn: TurnRecord): number {
    const declared = turn.operatorMessage.bytes;
    if (typeof declared === 'number' && Number.isSafeInteger(declared) && declared >= 0) return declared;
    const content = turn.operatorMessage.content;
    return typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : 0;
}

/** `null` when the turn materialized no usable token counters; never a guess. */
function usageTokens(turn: TurnRecord): number | null {
    let total = 0;
    let found = false;
    for (const key of ['inputTokens', 'outputTokens'] as const) {
        const value = turn.usage[key];
        if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) continue;
        total += value;
        found = true;
    }
    return found ? total : null;
}
