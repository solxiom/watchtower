/**
 * The closed session-index table registry, column types, enums, and `index_meta`
 * identity rows — the `registry.json`/`enums.json` contract in the accepted
 * `DerivedStoreSchema` shape. Declarations and pure guards only; no I/O.
 * `index_meta` participates in the semantic root and carries no root-derived
 * field, so identity stays a pure function of journal content plus
 * compiler/schema identity (v1-contracts.md 8A.3). `databaseSchemaVersion` is 2
 * so a store written by the rejected CA-16 implementation fails admission.
 */
import {
    SESSION_DECISION_CLASSES, SESSION_LIFECYCLE_STATES, SESSION_ORIGINS, SESSION_PROPOSAL_STATES,
    SESSION_PROPOSAL_TYPES, SESSION_REF_TYPES, SESSION_TELEMETRY_QUALITIES, SESSION_TURN_STATES,
    SessionIndexError
} from '../../../contracts/index.js';
import type {DerivedStoreSchema} from '../../storage/index.js';

export const SESSION_STORE_KIND = 'sessions';
export const SESSION_INDEX_DATABASE_SCHEMA_VERSION = 2;
export const SESSION_INDEX_COMPILER_VERSION = '1.0.0';
export const SESSION_SOURCE_IDENTITY = 'operator-session-journals';
/** Excerpts are capped at 500 UTF-8 bytes on a code-point boundary (registry.json excerptRule). */
export const MAX_EXCERPT_BYTES = 500;
export const MAX_TOPIC_BYTES = 500;
export const MAX_QUESTION_BYTES = 1000;
export const MAX_CAPSULE_BYTES = 4096;

export const SESSION_INDEX_SCHEMA: DerivedStoreSchema = [
    {
        name: 'index_meta',
        columns: [{name: 'key', type: 'text', notNull: true}, {name: 'value', type: 'text', notNull: true}],
        primaryKey: ['key']
    },
    {
        name: 'operator_sessions',
        columns: [
            {name: 'operator_session_id', type: 'text', notNull: true}, {name: 'lane_id', type: 'text', notNull: true},
            {name: 'origin', type: 'text', notNull: true}, {name: 'policy_profile_id', type: 'text', notNull: true},
            {name: 'state', type: 'text', notNull: true}, {name: 'topic', type: 'text', notNull: true},
            {name: 'created_at', type: 'text', notNull: true}, {name: 'last_turn_at', type: 'text'},
            {name: 'turn_count', type: 'integer', notNull: true}, {name: 'parent_operator_session_id', type: 'text'},
            {name: 'budget_segment_id', type: 'text', notNull: true}, {name: 'journal_checkpoint', type: 'text', notNull: true},
            {name: 'content_root', type: 'text', notNull: true}
        ],
        primaryKey: ['operator_session_id'],
        foreignKeys: [{columns: ['parent_operator_session_id'], references: {table: 'operator_sessions', columns: ['operator_session_id']}}],
        indexes: [{name: 'operator_sessions_last_turn_idx', columns: ['last_turn_at']}]
    },
    {
        name: 'session_pins',
        columns: [
            {name: 'operator_session_id', type: 'text', notNull: true}, {name: 'ref_type', type: 'text', notNull: true},
            {name: 'ref_value', type: 'text', notNull: true}, {name: 'pinned_at', type: 'text', notNull: true}
        ],
        primaryKey: ['operator_session_id', 'ref_type', 'ref_value'],
        foreignKeys: [{columns: ['operator_session_id'], references: {table: 'operator_sessions', columns: ['operator_session_id']}}]
    },
    {
        name: 'turns',
        columns: [
            {name: 'turn_id', type: 'text', notNull: true}, {name: 'operator_session_id', type: 'text', notNull: true},
            {name: 'turn_number', type: 'integer', notNull: true}, {name: 'state', type: 'text', notNull: true},
            {name: 'decision_class', type: 'text'}, {name: 'routing_rule_id', type: 'text'},
            {name: 'endpoint_id', type: 'text'}, {name: 'snapshot_revision', type: 'integer'},
            {name: 'stale', type: 'integer', notNull: true}, {name: 'completed_at', type: 'text'},
            {name: 'content_excerpt', type: 'text', notNull: true}, {name: 'answer_excerpt', type: 'text', notNull: true},
            {name: 'answer_digest', type: 'text', notNull: true},
            {name: 'input_tokens', type: 'integer'}, {name: 'output_tokens', type: 'integer'},
            {name: 'telemetry_quality', type: 'text', notNull: true}, {name: 'operator_bytes', type: 'integer', notNull: true},
            {name: 'coordinator_bytes', type: 'integer', notNull: true}
        ],
        primaryKey: ['turn_id'],
        foreignKeys: [{columns: ['operator_session_id'], references: {table: 'operator_sessions', columns: ['operator_session_id']}}],
        indexes: [{name: 'turns_session_idx', columns: ['operator_session_id']}]
    },
    {
        name: 'turn_refs',
        columns: [
            {name: 'turn_id', type: 'text', notNull: true}, {name: 'ref_type', type: 'text', notNull: true},
            {name: 'ref_value', type: 'text', notNull: true}
        ],
        primaryKey: ['turn_id', 'ref_type', 'ref_value'],
        foreignKeys: [{columns: ['turn_id'], references: {table: 'turns', columns: ['turn_id']}}]
    },
    {
        name: 'turn_open_questions',
        columns: [
            {name: 'turn_id', type: 'text', notNull: true}, {name: 'question_index', type: 'integer', notNull: true},
            {name: 'question_text', type: 'text', notNull: true}
        ],
        primaryKey: ['turn_id', 'question_index'],
        foreignKeys: [{columns: ['turn_id'], references: {table: 'turns', columns: ['turn_id']}}]
    },
    {
        name: 'session_proposals',
        columns: [
            {name: 'proposal_id', type: 'text', notNull: true}, {name: 'operator_session_id', type: 'text', notNull: true},
            {name: 'source_turn_id', type: 'text', notNull: true}, {name: 'proposal_type', type: 'text', notNull: true},
            {name: 'state', type: 'text', notNull: true}, {name: 'created_at', type: 'text', notNull: true},
            {name: 'expires_at', type: 'text', notNull: true}
        ],
        primaryKey: ['proposal_id'],
        foreignKeys: [
            {columns: ['operator_session_id'], references: {table: 'operator_sessions', columns: ['operator_session_id']}},
            {columns: ['source_turn_id'], references: {table: 'turns', columns: ['turn_id']}}
        ],
        indexes: [{name: 'session_proposals_session_idx', columns: ['operator_session_id']}]
    },
    {
        name: 'turn_reference_capsules',
        columns: [
            {name: 'source_turn_id', type: 'text', notNull: true}, {name: 'capsule_json', type: 'text', notNull: true},
            {name: 'created_at', type: 'text', notNull: true}
        ],
        primaryKey: ['source_turn_id'],
        foreignKeys: [{columns: ['source_turn_id'], references: {table: 'turns', columns: ['turn_id']}}]
    }
];

const ENUM_SETS = {
    origin: new Set<string>(SESSION_ORIGINS), sessionState: new Set<string>(SESSION_LIFECYCLE_STATES),
    turnState: new Set<string>(SESSION_TURN_STATES), decisionClass: new Set<string>(SESSION_DECISION_CLASSES),
    refType: new Set<string>(SESSION_REF_TYPES), telemetryQuality: new Set<string>(SESSION_TELEMETRY_QUALITIES),
    proposalType: new Set<string>(SESSION_PROPOSAL_TYPES), proposalState: new Set<string>(SESSION_PROPOSAL_STATES)
} as const;

/** Membership guard against one closed enum set from enums.json. */
export function inEnum(name: keyof typeof ENUM_SETS, value: unknown): value is string {
    return typeof value === 'string' && ENUM_SETS[name].has(value);
}

/**
 * `unknown` → declared column-type coercions. Each fails closed with
 * SESSION_SOURCE_INVALID, so a malformed predecessor value never partially
 * decodes into a row (the syntax/schema validation boundary of the batch).
 */
export function asRecord(value: unknown, subject: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new SessionIndexError('SESSION_SOURCE_INVALID', subject, 'expected a JSON object');
    }
    return value as Record<string, unknown>;
}

export function asText(value: unknown, subject: string): string {
    if (typeof value !== 'string' || value.length === 0) throw new SessionIndexError('SESSION_SOURCE_INVALID', subject, 'expected a non-empty string');
    return value;
}

export function asInt(value: unknown, subject: string, min = 0): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) throw new SessionIndexError('SESSION_SOURCE_INVALID', subject, `expected an integer >= ${min}`);
    return value;
}

export function asEnum(name: keyof typeof ENUM_SETS, value: unknown, subject: string): string {
    if (!inEnum(name, value)) throw new SessionIndexError('SESSION_SOURCE_INVALID', subject, `value is not a member of the ${name} enum`);
    return value;
}

export function asOptEnum(name: keyof typeof ENUM_SETS, value: unknown, subject: string): string | null {
    return value === null || value === undefined ? null : asEnum(name, value, subject);
}

/** Split a `type:value` reference token into a validated ref type and its value, or null when the type is unknown. */
export function parseRef(token: unknown): {refType: string; refValue: string} | null {
    if (typeof token !== 'string') return null;
    const separator = token.indexOf(':');
    if (separator <= 0 || separator === token.length - 1) return null;
    const refType = token.slice(0, separator);
    return inEnum('refType', refType) ? {refType, refValue: token.slice(separator + 1)} : null;
}

/** The exact `index_meta` identity rows written for one lane, cross-checked at admission. */
export function expectedSessionMetaRows(laneId: string): ReadonlyArray<readonly [string, string]> {
    return [
        ['schemaVersion', '1'], ['backend', 'sqlite'], ['storeKind', SESSION_STORE_KIND],
        ['databaseSchemaVersion', String(SESSION_INDEX_DATABASE_SCHEMA_VERSION)],
        ['compilerVersion', SESSION_INDEX_COMPILER_VERSION], ['laneId', laneId],
        ['sourceIdentity', SESSION_SOURCE_IDENTITY]
    ];
}
