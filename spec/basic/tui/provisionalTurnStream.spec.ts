import {ProvisionalTurnAccumulator} from '../../../src/presentation/tui/ProvisionalTurnAccumulator.js';
import {PresentationEventReducer} from '../../../src/presentation/tui/PresentationEventReducer.js';
import {AttachmentError, ATTACHMENT_LIMITS, presentationEventPriority, turnStreamTransitionAllowed} from '../../../src/contracts/tuiAttachment.js';
import {validatePresentationEvent} from '../../../src/contracts/attachmentDetailSchema.js';
import type {AttachmentRole} from '../../../src/contracts/tuiAttachment.js';

const sanitizer = {sanitize: (text: string): string => text.replace(/\u001b\[[0-9;]*m/gu, '')};
const bytes = (text: string): number => new TextEncoder().encode(text).length;
const chunk = (index: number, text: string): Record<string, unknown> => ({turnId: 'turn-1', index, text, bytes: bytes(text)});

function accumulator(overrides: {maxChunks?: number; maxBytes?: number} = {}): ProvisionalTurnAccumulator {
    return new ProvisionalTurnAccumulator({turnId: 'turn-1', sanitizer, ...overrides});
}

function event(type: string, sequence: number, detail: Record<string, unknown> = {}, revision = sequence): Record<string, unknown> {
    return {
        type, eventId: `evt-${sequence}`, sequence, laneId: 'lane-1', operatorSessionId: 'session-1',
        turnId: 'turn-1', correlationId: 'corr-1', revision, detail
    };
}
const provisionalEvent = (sequence: number, index: number, text: string): Record<string, unknown> => event('turn.provisional', sequence, {index, text});

function reducer(role: AttachmentRole = 'operator'): PresentationEventReducer {
    return new PresentationEventReducer({laneId: 'lane-1', operatorSessionId: 'session-1', role, sanitizer});
}

describe('CA-22 provisional streaming and validated replacement', () => {
    it('orders chunks by normalized index and never presents them as authoritative', () => {
        const stream = accumulator();
        stream.append(chunk(1, 'world'));
        const update = stream.append(chunk(0, 'hello '));
        expect(update.view.text).toBe('hello world');
        expect(update.view.authoritative).toBeFalse();
        expect(update.accepted).toBeTrue();
        expect(stream.current()).toBe('PROVISIONAL');
    });

    it('treats an identical replayed index as idempotent and a conflicting replay as a typed refusal', () => {
        const stream = accumulator();
        stream.append(chunk(0, 'hello'));
        expect(stream.append(chunk(0, 'hello')).duplicate).toBeTrue();
        expect(stream.view().chunks).toBe(1);
        expect(() => stream.append(chunk(0, 'other'))).toThrowError(AttachmentError, /replayed with different content/u);
    });

    it('bounds the accumulator and reports truncation instead of growing without limit', () => {
        const stream = accumulator({maxChunks: 2});
        stream.append(chunk(0, 'a'));
        stream.append(chunk(1, 'b'));
        const overflow = stream.append(chunk(2, 'c'));
        expect(overflow.accepted).toBeFalse();
        expect(overflow.droppedBytes).toBe(1);
        expect(overflow.view.truncated).toBeTrue();
        expect(overflow.view.text).toBe('ab');
    });

    it('refuses a malformed, foreign, or mis-counted chunk without changing retained state', () => {
        const stream = accumulator();
        stream.append(chunk(0, 'kept'));
        expect(() => stream.append({turnId: 'turn-2', index: 1, text: 'x', bytes: 1})).toThrowError(AttachmentError, /another turn/u);
        expect(() => stream.append({turnId: 'turn-1', index: 1, text: 'xy', bytes: 1})).toThrowError(AttachmentError, /byte count/u);
        expect(() => stream.append({turnId: 'turn-1', index: -1, text: 'x', bytes: 1})).toThrowError(AttachmentError, /non-negative integer/u);
        expect(() => stream.append({turnId: 'turn-1', index: 1, text: 'x', bytes: 1, extra: true})).toThrowError(AttachmentError, /closed normalized chunk envelope/u);
        expect(stream.view().text).toBe('kept');
    });

    it('replaces provisional prose with the one validated answer and flags a differing final answer', () => {
        const stream = accumulator();
        stream.append(chunk(0, 'partial guess'));
        stream.beginValidation();
        const replacement = stream.validate({turnId: 'turn-1', text: 'final answer', stale: false, revision: 4, usage: {}});
        expect(replacement.state).toBe('VALIDATED');
        expect(replacement.authoritative).toBeTrue();
        expect(replacement.provisionalRetained).toBeFalse();
        expect(replacement.differsFromProvisional).toBeTrue();
        expect(stream.view().text).toBe('');
    });

    it('marks a validated-but-stale answer STALE_VALIDATED and keeps identical prose undifferentiated', () => {
        const stream = accumulator();
        stream.append(chunk(0, 'same text'));
        const replacement = stream.validate({turnId: 'turn-1', text: 'same text', stale: true, revision: 9, usage: {}});
        expect(replacement.state).toBe('STALE_VALIDATED');
        expect(replacement.differsFromProvisional).toBeFalse();
    });

    it('refuses an invalid, foreign, or over-limit validated result and never adopts it as an answer', () => {
        const stream = accumulator();
        expect(() => stream.validate({turnId: 'turn-1', text: '', stale: false, revision: 1, usage: {}})).toThrowError(AttachmentError, /non-empty text/u);
        expect(() => stream.validate({turnId: 'turn-2', text: 'x', stale: false, revision: 1, usage: {}})).toThrowError(AttachmentError, /another turn/u);
        expect(() => stream.validate({turnId: 'turn-1', text: 'x', stale: false, revision: 1, usage: {tokens: 'x'.repeat(ATTACHMENT_LIMITS.maxDetailStringBytes + 1)}}))
            .toThrowError(AttachmentError, /at most 4096 bytes/u);
        expect(stream.current()).toBe('PREFLIGHT');
    });

    it('keeps interrupted and failed provisional bytes as bounded diagnostic evidence only', () => {
        const interrupted = accumulator();
        interrupted.append(chunk(0, 'half a thought'));
        const stopped = interrupted.interrupt('operator interrupt');
        expect(stopped.state).toBe('INTERRUPTED');
        expect(stopped.authoritative).toBeFalse();
        expect(stopped.appliedProposal).toBeFalse();
        expect(stopped.diagnosticText).toBe('half a thought');

        const failing = accumulator();
        failing.append(chunk(0, 'broken'));
        failing.beginValidation();
        expect(failing.fail('schema invalid').state).toBe('FAILED');
    });

    it('closes the stream state machine against illegal transitions', () => {
        expect(turnStreamTransitionAllowed('VALIDATED', 'PROVISIONAL')).toBeFalse();
        expect(turnStreamTransitionAllowed('VALIDATING', 'PROVISIONAL')).toBeFalse();
        expect(turnStreamTransitionAllowed('PROVISIONAL', 'VALIDATING')).toBeTrue();
        const stream = accumulator();
        stream.interrupt('done');
        expect(() => stream.append(chunk(0, 'late'))).toThrowError(AttachmentError, /accepts no further provisional chunks/u);
        expect(() => stream.interrupt('again')).toThrowError(AttachmentError, /already terminated/u);
    });
});

describe('CA-22 live edge and bounded reducer-side provisional (CA22-02)', () => {
    it('follows provisional output at the live edge and raises new output when scrolled away', () => {
        const live = reducer();
        live.reduce(provisionalEvent(1, 0, 'chunk'));
        expect(live.current().newOutput).toBeFalse();
        expect(live.current().provisional?.text).toBe('chunk');

        live.setFollowLive(false);
        live.reduce(provisionalEvent(2, 1, ' more'));
        expect(live.current().newOutput).toBeTrue();
        expect(live.current().provisional?.text).toBe('chunk more');
        expect(live.current().followLive).toBeFalse();
    });

    it('resumes follow and clears the indicator when the operator returns to the live edge', () => {
        const live = reducer();
        live.setFollowLive(false);
        live.reduce(provisionalEvent(1, 0, 'a'));
        expect(live.current().newOutput).toBeTrue();
        expect(live.setFollowLive(true).newOutput).toBeFalse();
    });

    it('CA22-02: keeps retained provisional bytes inside policy under a large hostile payload', () => {
        const live = new PresentationEventReducer({
            laneId: 'lane-1', operatorSessionId: 'session-1', role: 'operator', sanitizer,
            maxProvisionalChunks: 4, maxProvisionalBytes: 32
        });
        for (let index = 0; index < 40; index += 1) live.reduce(provisionalEvent(index + 1, index, 'x'.repeat(64)));
        const provisional = live.current().provisional;
        expect(provisional).not.toBeNull();
        expect(provisional!.authoritative).toBeFalse();
        expect(provisional!.truncated).toBeTrue();
        expect(provisional!.chunks).toBeLessThanOrEqual(4);
        expect(provisional!.bytes).toBeLessThanOrEqual(32);
        expect(bytes(provisional!.text)).toBeLessThanOrEqual(ATTACHMENT_LIMITS.maxProvisionalPreviewBytes);
    });

    it('CA22-02: preserves ordered and idempotent semantics through the reducer', () => {
        const live = reducer();
        live.reduce(provisionalEvent(1, 1, 'world'));
        live.reduce(provisionalEvent(2, 0, 'hello '));
        expect(live.current().provisional?.text).toBe('hello world');
        live.reduce(provisionalEvent(3, 0, 'hello '));
        expect(live.current().provisional?.chunks).toBe(2);
        expect(live.current().provisional?.text).toBe('hello world');
    });

    it('CA22-02: releases the accumulator when the turn settles, so bytes never outlive the turn', () => {
        const live = reducer();
        live.reduce(provisionalEvent(1, 0, 'partial'));
        live.reduce(event('turn.validated', 2, {}));
        expect(live.current().provisional).toBeNull();
        expect(live.current().stream).toBe('VALIDATED');
        expect(live.current().activeTurnId).toBeNull();
    });

    it('never lets a presentation event steal focus', () => {
        const live = reducer();
        live.reduce(event('lane.notification', 1, {label: 'batch ready'}));
        live.reduce(provisionalEvent(2, 0, 'x'));
        expect(live.current().attention.every((item) => item.stealsFocus === false)).toBeTrue();
    });

    it('fences foreign and replayed events out of the reducer', () => {
        const live = reducer();
        live.reduce(provisionalEvent(5, 0, 'a'));
        expect(() => live.reduce(provisionalEvent(5, 1, 'b'))).toThrowError(AttachmentError, /not newer than the retained durable sequence/u);
        expect(() => live.reduce({...provisionalEvent(6, 1, 'b'), laneId: 'lane-2'})).toThrowError(AttachmentError, /another lane or operator session/u);
        expect(() => live.reduce({...provisionalEvent(7, 1, 'b'), operatorSessionId: 'session-9'})).toThrowError(AttachmentError, /another lane or operator session/u);
        expect(live.current().provisional?.text).toBe('a');
    });

    it('CA22-04: refuses an illegal stream transition before mutating the view model', () => {
        const live = reducer();
        live.reduce(event('turn.validated', 1, {}));
        expect(() => live.reduce(provisionalEvent(2, 0, 'late'))).toThrowError(AttachmentError, /cannot move to PROVISIONAL/u);
        expect(live.current().stream).toBe('VALIDATED');
        expect(live.current().provisional).toBeNull();
    });

    it('maps every closed event type to exactly one P0-P5 class', () => {
        expect(presentationEventPriority('attachment.detached')).toBe('P0');
        expect(presentationEventPriority('turn.stale')).toBe('P1');
        expect(presentationEventPriority('turn.failed')).toBe('P2');
        expect(presentationEventPriority('budget.updated')).toBe('P3');
        expect(presentationEventPriority('lane.notification')).toBe('P4');
        expect(presentationEventPriority('turn.preflight')).toBe('P5');
    });
});

describe('CA-22 fail-closed bounded event schemas (CA22-04)', () => {
    it('rejects an envelope that is malformed, unknown, or carries an extra key', () => {
        expect(() => validatePresentationEvent({...event('turn.provisional', 1, {index: 0, text: 'x'}), type: 'turn.unknown'})).toThrowError(AttachmentError, /closed presentation vocabulary/u);
        expect(() => validatePresentationEvent({...event('lane.notification', 1, {label: 'l'}), sequence: -1})).toThrowError(AttachmentError, /non-negative integers/u);
        expect(() => validatePresentationEvent({...event('lane.notification', 1, {label: 'l'}), extra: 1})).toThrowError(AttachmentError, /closed presentation-event envelope/u);
        expect(validatePresentationEvent(event('turn.validated', 3, {})).type).toBe('turn.validated');
    });

    it('enforces the exact per-type required and permitted detail keys', () => {
        expect(() => validatePresentationEvent(event('turn.provisional', 1, {text: 'x'}))).toThrowError(AttachmentError, /missing the required key index/u);
        expect(() => validatePresentationEvent(event('lane.notification', 1, {}))).toThrowError(AttachmentError, /missing the required key label/u);
        expect(() => validatePresentationEvent(event('effect.preview', 1, {confirmationId: 'c', nope: 1}))).toThrowError(AttachmentError, /unsupported key nope/u);
        expect(() => validatePresentationEvent(event('turn.provisional', 1, {index: -1, text: 'x'}))).toThrowError(AttachmentError, /field index is not a count value/u);
        expect(() => validatePresentationEvent(event('budget.updated', 1, {budget: 'ok'})).detail.budget).not.toThrow();
    });

    it('requires a turn identity on every turn-scoped event', () => {
        expect(() => validatePresentationEvent({...event('turn.provisional', 1, {index: 0, text: 'x'}), turnId: null})).toThrowError(AttachmentError, /must name the turn/u);
        expect(validatePresentationEvent({...event('lane.notification', 1, {label: 'l'}), turnId: null}).turnId).toBeNull();
    });

    it('rejects cyclic, over-deep, over-wide, and over-long detail without leaking a TypeError or RangeError', () => {
        const cyclic: Record<string, unknown> = {label: 'l'};
        cyclic.self = cyclic;
        let thrown: unknown = null;
        try { validatePresentationEvent(event('lane.notification', 1, cyclic)); } catch (error) { thrown = error; }
        expect(thrown instanceof AttachmentError).toBeTrue();
        expect((thrown as AttachmentError).reason).toBe('ATTACHMENT_DETAIL_INVALID');

        expect(() => validatePresentationEvent(event('turn.validated', 1, {usage: {a: {b: {c: {d: 1}}}}}))).toThrowError(AttachmentError, /nests at most 4 levels/u);
        expect(() => validatePresentationEvent(event('turn.validated', 1, {usage: {items: new Array(64).fill(1)}}))).toThrowError(AttachmentError, /at most 32 items/u);
        expect(() => validatePresentationEvent(event('lane.notification', 1, {label: 'x'.repeat(5000)}))).toThrowError(AttachmentError, /at most 4096 bytes/u);
    });

    it('rejects a non-finite number and a non-JSON value with a stable reason', () => {
        expect(() => validatePresentationEvent(event('turn.validated', 1, {usage: {tokens: Number.NaN}}))).toThrowError(AttachmentError, /must be finite/u);
        expect(() => validatePresentationEvent(event('turn.validated', 1, {usage: {tokens: () => 1}}))).toThrowError(AttachmentError, /null, boolean, finite number, string, array, or plain object/u);
    });
});
