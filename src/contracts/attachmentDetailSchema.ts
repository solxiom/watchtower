/**
 * The fail-closed schema boundary for every untrusted presentation event and
 * usage record that reaches a CA-22 owner. A producer is normalized upstream
 * (`cli-session.md §6`) but is still untrusted here: this module proves an
 * event envelope, its per-type required detail keys, and a genuinely finite
 * JSON shape before any owner may branch on it.
 *
 * Finiteness is enforced on four axes at once — key count, nesting depth,
 * array length, and cumulative UTF-8 bytes. A cyclic object is rejected by the
 * depth bound rather than by an engine `RangeError`, so no owner ever observes
 * a raw `TypeError`/`RangeError` from hostile input; every rejection carries a
 * stable `AttachmentError` reason.
 */
import {
    ATTACHMENT_LIMITS, AttachmentError, type AttachmentJsonValue,
    PRESENTATION_EVENT_TYPES, type PresentationEventType, type ValidatedPresentationEvent
} from './tuiAttachment.js';

/**
 * The declared value shape of one detail field. Every field an owner reads has
 * an explicit type here: a closed key registry alone still admits a numeric
 * `confirmationId` or a boolean `title`, which an owner would then render or
 * branch on.
 */
export type DetailFieldType = 'text' | 'count' | 'flag' | 'json';
export interface DetailFieldContract { readonly required: Readonly<Record<string, DetailFieldType>>; readonly optional: Readonly<Record<string, DetailFieldType>>; }

/** The exact detail contract per closed event type: required fields, then permitted optional fields, each typed. */
export const PRESENTATION_EVENT_DETAIL_SCHEMA: Readonly<Record<PresentationEventType, DetailFieldContract>> = Object.freeze({
    'attachment.opened': schema({}, {label: 'text', role: 'text'}),
    'session.bound': schema({lifecycle: 'text'}, {label: 'text', budget: 'text'}),
    'turn.preflight': schema({}, {label: 'text', decisionClass: 'text', estimatedInputTokens: 'count'}),
    'turn.invocation-started': schema({}, {label: 'text', endpointId: 'text', decisionClass: 'text'}),
    'turn.provisional': schema({index: 'count', text: 'text'}, {label: 'text', truncated: 'flag'}),
    'turn.validated': schema({}, {label: 'text', stale: 'flag', usage: 'json'}),
    'turn.stale': schema({}, {label: 'text', changedRevision: 'count'}),
    'turn.interrupted': schema({}, {label: 'text', reason: 'text', usage: 'json'}),
    'turn.failed': schema({}, {label: 'text', reason: 'text', usage: 'json'}),
    'proposal.available': schema({proposalId: 'text'}, {label: 'text', proposalType: 'text'}),
    'effect.preview': schema({confirmationId: 'text'}, {label: 'text', title: 'text', reasonCode: 'text'}),
    'effect.confirmed': schema({confirmationId: 'text'}, {label: 'text'}),
    'effect.result': schema({}, {label: 'text', confirmationId: 'text', status: 'text'}),
    'lane.notification': schema({label: 'text'}, {category: 'text'}),
    'budget.updated': schema({budget: 'text'}, {label: 'text'}),
    'attachment.detached': schema({}, {label: 'text', reason: 'text'})
});

const ENVELOPE_KEYS = Object.freeze(['type', 'eventId', 'sequence', 'laneId', 'operatorSessionId', 'turnId', 'correlationId', 'revision', 'detail']);
/** Event types that must name the turn they belong to; a null turn identity on one of these is a refusal. */
const TURN_SCOPED = Object.freeze(['turn.preflight', 'turn.invocation-started', 'turn.provisional', 'turn.validated', 'turn.stale', 'turn.interrupted', 'turn.failed']);

/**
 * Validates one untrusted presentation event into the closed contract. Nothing
 * is dereferenced before its shape is proved, and the detail record must match
 * the exact per-type schema, so a malformed, extra-key, missing-key, cyclic, or
 * over-limit event raises a stable typed reason and changes no retained state.
 */
export function validatePresentationEvent(value: unknown): ValidatedPresentationEvent {
    const invalid = (detail: string): never => { throw new AttachmentError('ATTACHMENT_EVENT_INVALID', 'presentation event', detail); };
    if (!isRecord(value) || !exactKeys(value, ENVELOPE_KEYS)) return invalid('The event is not a closed presentation-event envelope.');
    if (!isEventType(value.type)) return invalid('The event type is outside the closed presentation vocabulary.');
    if (!isText(value.eventId) || !isText(value.laneId) || !isText(value.operatorSessionId) || !isText(value.correlationId)) return invalid('The event is missing a stable identity field.');
    if (!isCount(value.sequence) || !isCount(value.revision)) return invalid('The event sequence and revision must be non-negative integers.');
    if (value.turnId !== null && !isText(value.turnId)) return invalid('The event turn identity is a non-empty string or null.');
    if (value.turnId === null && TURN_SCOPED.includes(value.type)) return invalid(`A ${value.type} event must name the turn it belongs to.`);
    const detail = validateEventDetail(value.detail, value.type);
    return Object.freeze({
        type: value.type, eventId: value.eventId, sequence: value.sequence, laneId: value.laneId,
        operatorSessionId: value.operatorSessionId, turnId: value.turnId, correlationId: value.correlationId,
        revision: value.revision, detail
    });
}

/**
 * Proves one detail record against its event type's exact key contract, the
 * declared value type of every present field, and the finite JSON bounds. A
 * field whose value has the wrong type is refused before any owner reads it,
 * so a numeric `confirmationId` or a boolean `title` can never reach a view
 * model.
 */
export function validateEventDetail(value: unknown, type: PresentationEventType): Readonly<Record<string, AttachmentJsonValue>> {
    const contract = PRESENTATION_EVENT_DETAIL_SCHEMA[type];
    const invalid = (detail: string): never => { throw new AttachmentError('ATTACHMENT_DETAIL_INVALID', type, detail); };
    if (!isRecord(value)) return invalid('The event detail is not a JSON object.');
    const keys = Object.keys(value);
    const declared: Readonly<Record<string, DetailFieldType>> = {...contract.required, ...contract.optional};
    const unknownKey = keys.find((key) => !(key in declared));
    if (unknownKey) return invalid(`The detail carries the unsupported key ${unknownKey}.`);
    const missing = Object.keys(contract.required).find((key) => !keys.includes(key));
    if (missing) return invalid(`The detail is missing the required key ${missing}.`);
    for (const key of keys) {
        if (!matchesFieldType(value[key], declared[key])) return invalid(`The detail field ${key} is not a ${declared[key]} value.`);
    }
    return Object.freeze(validateBoundedJsonRecord(value, type));
}

/** The declared value types. `json` defers to the finite JSON gate; the rest are exact primitives. */
function matchesFieldType(value: unknown, type: DetailFieldType): boolean {
    if (type === 'text') return typeof value === 'string' && value.length > 0;
    if (type === 'count') return isCount(value);
    if (type === 'flag') return typeof value === 'boolean';
    return isRecord(value);
}

/**
 * Proves one untrusted usage/telemetry record. Usage is producer-supplied
 * numeric metadata, so it gets the same finite treatment as event detail
 * rather than being trusted because it looks small.
 */
export function validateBoundedUsage(value: unknown, subject: string): Readonly<Record<string, AttachmentJsonValue>> {
    if (!isRecord(value)) throw new AttachmentError('ATTACHMENT_DETAIL_INVALID', subject, 'The usage record is not a JSON object.');
    return Object.freeze(validateBoundedJsonRecord(value, subject));
}

/**
 * The finite JSON gate. Depth, key count, array length, and cumulative bytes
 * are all bounded, and depth is what makes a cyclic graph terminate: every
 * descent increments depth, so a cycle exhausts the bound and is refused with
 * `ATTACHMENT_DETAIL_LIMIT_EXCEEDED` instead of overflowing the stack.
 */
function validateBoundedJsonRecord(value: Record<string, unknown>, subject: string): Record<string, AttachmentJsonValue> {
    const budget = {bytes: 0};
    if (Object.keys(value).length > ATTACHMENT_LIMITS.maxDetailKeys) {
        throw new AttachmentError('ATTACHMENT_DETAIL_LIMIT_EXCEEDED', subject, `A JSON record carries at most ${ATTACHMENT_LIMITS.maxDetailKeys} keys.`);
    }
    const copy: Record<string, AttachmentJsonValue> = {};
    for (const [key, item] of Object.entries(value)) copy[key] = boundedValue(item, 1, budget, subject);
    return copy;
}

function boundedValue(value: unknown, depth: number, budget: {bytes: number}, subject: string): AttachmentJsonValue {
    const exceeded = (detail: string): never => { throw new AttachmentError('ATTACHMENT_DETAIL_LIMIT_EXCEEDED', subject, detail); };
    const invalid = (detail: string): never => { throw new AttachmentError('ATTACHMENT_DETAIL_INVALID', subject, detail); };
    if (depth > ATTACHMENT_LIMITS.maxDetailDepth) return exceeded(`A JSON value nests at most ${ATTACHMENT_LIMITS.maxDetailDepth} levels deep.`);
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : invalid('A JSON number must be finite.');
    if (typeof value === 'string') return boundedString(value, budget, subject);
    if (Array.isArray(value)) {
        if (value.length > ATTACHMENT_LIMITS.maxDetailArrayItems) return exceeded(`A JSON array carries at most ${ATTACHMENT_LIMITS.maxDetailArrayItems} items.`);
        return Object.freeze(value.map((item) => boundedValue(item, depth + 1, budget, subject)));
    }
    if (!isRecord(value)) return invalid('A JSON value is null, boolean, finite number, string, array, or plain object.');
    if (Object.keys(value).length > ATTACHMENT_LIMITS.maxDetailKeys) return exceeded(`A JSON object carries at most ${ATTACHMENT_LIMITS.maxDetailKeys} keys.`);
    const nested: Record<string, AttachmentJsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
        boundedString(key, budget, subject);
        nested[key] = boundedValue(item, depth + 1, budget, subject);
    }
    return Object.freeze(nested);
}

function boundedString(value: string, budget: {bytes: number}, subject: string): string {
    const bytes = new TextEncoder().encode(value).length;
    if (bytes > ATTACHMENT_LIMITS.maxDetailStringBytes) {
        throw new AttachmentError('ATTACHMENT_DETAIL_LIMIT_EXCEEDED', subject, `A JSON string carries at most ${ATTACHMENT_LIMITS.maxDetailStringBytes} bytes.`);
    }
    budget.bytes += bytes;
    if (budget.bytes > ATTACHMENT_LIMITS.maxDetailBytes) {
        throw new AttachmentError('ATTACHMENT_DETAIL_LIMIT_EXCEEDED', subject, `A JSON record carries at most ${ATTACHMENT_LIMITS.maxDetailBytes} bytes.`);
    }
    return value;
}

function schema(required: Record<string, DetailFieldType>, optional: Record<string, DetailFieldType>): DetailFieldContract {
    return Object.freeze({required: Object.freeze(required), optional: Object.freeze(optional)});
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key)); }
function isText(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }
function isCount(value: unknown): value is number { return Number.isInteger(value) && (value as number) >= 0; }
function isEventType(value: unknown): value is PresentationEventType { return typeof value === 'string' && (PRESENTATION_EVENT_TYPES as readonly string[]).includes(value); }
