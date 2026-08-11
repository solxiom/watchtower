/**
 * The trust boundary between an attachment and the accepted durable session
 * capabilities behind `AttachmentSessionPort`. Every value the port returns is
 * `unknown` until one of these functions proves it into the closed CA-22
 * contract **and** binds it to the current lane, operator-session, and where
 * applicable attachment/owner identity. A foreign-lane, foreign-session, or
 * foreign-attachment answer is refused with `ATTACHMENT_IDENTITY_MISMATCH`
 * before it can mutate any local state.
 *
 * This module owns validation only. It sequences nothing, performs no effect,
 * and holds no state; `TuiAttachmentController` owns the state machine.
 */
import {
    type ActiveTurnOwner, AttachmentError, type AttachmentBinding, type AttachmentResult,
    type AttachmentRole, type AttachmentState, type DurableSessionIdentity, type DurableTurnResult, type TurnAdmission
} from '../../contracts/tuiAttachment.js';
import {validateBoundedUsage} from '../../contracts/attachmentDetailSchema.js';

/** Every attachment binding is untrusted input until each field validates into the closed contract. */
export function parseAttachmentBinding(value: unknown): AttachmentBinding {
    const invalid = (detail: string): never => { throw new AttachmentError('ATTACHMENT_BINDING_INVALID', 'binding', detail); };
    if (!isRecord(value) || !onlyKeys(value, ['laneId', 'operatorSessionId', 'attachmentId', 'role', 'stream', 'waitForActiveTurn'])) return invalid('The binding is not a closed attachment-binding envelope.');
    if (!isText(value.laneId) || !isText(value.operatorSessionId) || !isText(value.attachmentId)) return invalid('The binding is missing a stable identity field.');
    if (!isRole(value.role) || typeof value.stream !== 'boolean' || typeof value.waitForActiveTurn !== 'boolean') return invalid('The binding role or mode flags are not closed values.');
    return Object.freeze({laneId: value.laneId, operatorSessionId: value.operatorSessionId, attachmentId: value.attachmentId, role: value.role, stream: value.stream, waitForActiveTurn: value.waitForActiveTurn});
}

/**
 * The durable open result. Attaching may never report that it created a
 * session, may never leave the state unsettled, and may never settle an
 * observer binding in a writable state.
 */
export function parseAttachmentOpen(value: unknown, binding: AttachmentBinding): AttachmentResult {
    const invalid = (detail: string): never => { throw new AttachmentError('ATTACHMENT_STATE_INVALID', binding.attachmentId, detail); };
    if (!isRecord(value) || !onlyKeys(value, ['state', 'activeTurnOwner', 'revision', 'createdSession'])) return invalid('The open result is not a closed attachment-open envelope.');
    if (!isState(value.state) || value.state === 'STARTING') return invalid('The open result did not settle the attachment state.');
    if (value.createdSession !== false) return invalid('Attaching never creates an operator session.');
    if (!isCount(value.revision)) return invalid('The open revision is not a non-negative integer.');
    if (binding.role === 'observer' && value.state !== 'OBSERVING' && value.state !== 'SESSION_UNAVAILABLE' && value.state !== 'STOPPED') {
        return invalid('An observer binding never settles in a writable attachment state.');
    }
    const owner = value.activeTurnOwner === null ? null : parseActiveTurnOwner(value.activeTurnOwner, binding);
    return Object.freeze({binding, state: value.state, activeTurnOwner: owner, revision: value.revision, createdSession: false});
}

/**
 * `tui-operational-experience.md §6`: contention names the owner and start
 * time. The owner is bound to this lane and operator session, and must be a
 * *different* attachment — an owner claiming to be this attachment would mean
 * the local state machine and durable state disagree, which is a refusal, not
 * a wait.
 */
export function parseActiveTurnOwner(value: unknown, binding: AttachmentBinding): ActiveTurnOwner {
    const invalid = (detail: string): never => { throw new AttachmentError('ATTACHMENT_STATE_INVALID', binding.attachmentId, detail); };
    if (!isRecord(value) || !onlyKeys(value, ['laneId', 'operatorSessionId', 'turnId', 'attachmentId', 'startedAt'])
        || !isText(value.turnId) || !isText(value.attachmentId) || !isText(value.startedAt)) return invalid('The active-turn owner is not a closed owner record.');
    const identity = requireIdentity(value, binding, 'active-turn owner');
    if (value.attachmentId === binding.attachmentId) {
        throw new AttachmentError('ATTACHMENT_IDENTITY_MISMATCH', binding.attachmentId, 'The active-turn owner names this attachment; local and durable state disagree.');
    }
    return Object.freeze({...identity, turnId: value.turnId, attachmentId: value.attachmentId, startedAt: value.startedAt});
}

/**
 * The durable admission decision, bound to this exact attachment. A `waiting`
 * admission must prove it holds no lock — which keeps `--wait-for-active-turn`
 * from becoming a second writer — and is legal only when the binding asked to
 * wait. A refusal must carry the exact normative contention reason.
 */
export function parseTurnAdmission(value: unknown, binding: AttachmentBinding): TurnAdmission {
    const invalid = (detail: string): never => { throw new AttachmentError('ATTACHMENT_STATE_INVALID', binding.attachmentId, detail); };
    if (!isRecord(value) || typeof value.kind !== 'string') return invalid('The admission is not a closed admission envelope.');
    if (value.kind === 'admitted') {
        if (!onlyKeys(value, ['kind', 'turnId', 'revision', 'laneId', 'operatorSessionId', 'attachmentId']) || !isText(value.turnId) || !isCount(value.revision)) return invalid('The admitted turn is not a closed admitted record.');
        const identity = requireIdentity(value, binding, 'admitted turn');
        if (typeof value.attachmentId !== 'string' || value.attachmentId !== binding.attachmentId) {
            throw new AttachmentError('ATTACHMENT_IDENTITY_MISMATCH', binding.attachmentId, 'The admitted turn was granted to another attachment.');
        }
        return Object.freeze({kind: 'admitted', turnId: value.turnId, revision: value.revision, ...identity, attachmentId: value.attachmentId});
    }
    if (value.kind === 'waiting') {
        if (!onlyKeys(value, ['kind', 'owner', 'holdsLock']) || value.holdsLock !== false) return invalid('A waiting attachment must prove it holds no session, lane, or endpoint lock.');
        if (!binding.waitForActiveTurn) return invalid('A waiting admission requires an explicit wait-for-active-turn binding.');
        return Object.freeze({kind: 'waiting', owner: parseActiveTurnOwner(value.owner, binding), holdsLock: false});
    }
    if (value.kind === 'refused') {
        if (!onlyKeys(value, ['kind', 'reason', 'detail', 'owner']) || value.reason !== 'OPERATOR_SESSION_TURN_ACTIVE' || !isText(value.detail)) return invalid('A refused admission carries the exact durable contention reason.');
        return Object.freeze({kind: 'refused', reason: 'OPERATOR_SESSION_TURN_ACTIVE', detail: value.detail, owner: value.owner === null ? null : parseActiveTurnOwner(value.owner, binding)});
    }
    return invalid('The admission kind is outside the closed admission vocabulary.');
}

/**
 * The durable turn result a wait resolves to, bound to this lane, operator
 * session, and the exact awaited turn. Usage passes the same finite JSON gate
 * as event detail rather than being trusted for looking small.
 */
export function parseDurableTurnResult(value: unknown, turnId: string, binding: AttachmentBinding): DurableTurnResult {
    const invalid = (detail: string): never => { throw new AttachmentError('TURN_RESULT_INVALID', turnId, detail); };
    if (!isRecord(value) || !onlyKeys(value, ['laneId', 'operatorSessionId', 'turnId', 'state', 'stale', 'revision', 'text', 'usage'])) return invalid('The turn result is not a closed durable-result envelope.');
    if (value.turnId !== turnId) return invalid('The durable result belongs to another turn.');
    if (!isResultState(value.state) || typeof value.stale !== 'boolean' || typeof value.text !== 'string') return invalid('The durable result state, staleness, or text is not a closed value.');
    if (!isCount(value.revision)) return invalid('The durable result revision is not a non-negative integer.');
    const identity = requireIdentity(value, binding, 'durable turn result');
    return Object.freeze({
        ...identity, turnId, state: value.state,
        stale: value.stale, revision: value.revision, text: value.text, usage: validateBoundedUsage(value.usage, turnId)
    });
}

/**
 * The one identity fence every durable answer passes; a foreign lane or
 * session never reaches local state. It returns the proved pair so callers
 * build their frozen record from validated values rather than re-asserting.
 */
export function requireIdentity(value: Record<string, unknown>, binding: AttachmentBinding, subject: string): DurableSessionIdentity {
    if (!isText(value.laneId) || !isText(value.operatorSessionId)) {
        throw new AttachmentError('ATTACHMENT_IDENTITY_MISMATCH', subject, 'The durable answer does not name its lane and operator session.');
    }
    if (value.laneId !== binding.laneId || value.operatorSessionId !== binding.operatorSessionId) {
        throw new AttachmentError('ATTACHMENT_IDENTITY_MISMATCH', subject, 'The durable answer belongs to another lane or operator session.');
    }
    return Object.freeze({laneId: value.laneId, operatorSessionId: value.operatorSessionId});
}

export function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
export function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key)); }
export function isText(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }
export function isCount(value: unknown): value is number { return Number.isInteger(value) && (value as number) >= 0; }
function isRole(value: unknown): value is AttachmentRole { return value === 'operator' || value === 'observer'; }
function isState(value: unknown): value is AttachmentState {
    return value === 'STARTING' || value === 'ATTACHED' || value === 'TURN_ACTIVE' || value === 'OBSERVING'
        || value === 'SESSION_UNAVAILABLE' || value === 'DETACHING' || value === 'STOPPED';
}
function isResultState(value: unknown): value is DurableTurnResult['state'] { return value === 'complete' || value === 'interrupted' || value === 'failed' || value === 'cancelled'; }
