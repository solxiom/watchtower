/**
 * CA-22 lifecycle outcomes: the post-open cancellation boundary (`CA22-06`)
 * and the post-apply/retry outcomes of both reject lineages.
 *
 * Split from `attachmentAdversarialMatrix.spec.ts` by contract family: that
 * file owns the refusal tables and their unchanged-state harness, this one
 * owns behaviour that must *succeed* correctly after an entry is applied.
 */
import {PresentationEventReducer} from '../../../src/presentation/tui/PresentationEventReducer.js';
import {TuiAttachmentController} from '../../../src/presentation/tui/TuiAttachmentController.js';
import {NotificationRefreshController} from '../../../src/presentation/tui/NotificationRefreshController.js';
import {AttachmentError} from '../../../src/contracts/tuiAttachment.js';
import type {AttachmentBinding, DurableCheckpoint} from '../../../src/contracts/tuiAttachment.js';

const sanitizer = {sanitize: (text: string): string => text};
const signal = (): AbortSignal => new AbortController().signal;

function event(type: string, sequence: number, detail: Record<string, unknown> = {}, revision = sequence, turnId: string | null = 'turn-1'): Record<string, unknown> {
    return {type, eventId: `evt-${sequence}`, sequence, laneId: 'lane-1', operatorSessionId: 'session-1', turnId, correlationId: 'corr-1', revision, detail};
}
const binding: AttachmentBinding = Object.freeze({laneId: 'lane-1', operatorSessionId: 'session-1', attachmentId: 'attach-1', role: 'operator', stream: true, waitForActiveTurn: true});
const admitted = Object.freeze({kind: 'admitted', turnId: 'turn-1', revision: 6, laneId: 'lane-1', operatorSessionId: 'session-1', attachmentId: 'attach-1'});
const opened = Object.freeze({state: 'ATTACHED', activeTurnOwner: null, revision: 5, createdSession: false});
const durable = Object.freeze({laneId: 'lane-1', operatorSessionId: 'session-1', turnId: 'turn-1', state: 'complete', stale: false, revision: 7, text: 'ok', usage: {}});
const request = Object.freeze({binding, text: 'hi', bytes: 2, usesModel: true, revision: 3});
const checkpoint = (sequence: number, revision = sequence): DurableCheckpoint => ({laneId: 'lane-1', sequence, revision, digest: `d${sequence}.${revision}`});
const page = (cp: DurableCheckpoint, overrides: Record<string, unknown> = {}): Record<string, unknown> =>
    ({laneId: 'lane-1', operatorSessionId: 'session-1', checkpoint: cp, items: [], ...overrides});

function reducer(...seeded: readonly Record<string, unknown>[]): PresentationEventReducer {
    const live = new PresentationEventReducer({laneId: 'lane-1', operatorSessionId: 'session-1', role: 'operator', sanitizer});
    for (const item of seeded) live.reduce(item);
    return live;
}
const liveTurn = (): PresentationEventReducer => reducer(
    event('turn.preflight', 1), event('turn.invocation-started', 2), event('turn.provisional', 3, {index: 0, text: 'kept'})
);

describe('CA-22 post-open attach cancellation (CA22-06)', () => {
    /** A port that ignores its signal: the controller, not the port, must enforce cancellation. */
    function gatedPort(): {port: {open: () => Promise<unknown>; admit: () => Promise<unknown>; awaitTurn: () => Promise<unknown>}; release: () => void; opens: () => number} {
        let release = (): void => {};
        const gate = new Promise<void>((resolve) => { release = resolve; });
        let opens = 0;
        return {
            port: {
                open: async (): Promise<unknown> => { opens += 1; await gate; return opened; },
                admit: async (): Promise<unknown> => admitted,
                awaitTurn: async (): Promise<unknown> => durable
            },
            release: () => { release(); },
            opens: () => opens
        };
    }

    it('refuses an attach aborted while the durable open was in flight', async () => {
        const gated = gatedPort();
        const controller = new TuiAttachmentController({port: gated.port});
        const aborter = new AbortController();
        const started = controller.start(binding, aborter.signal);
        aborter.abort();
        gated.release();
        await expectAsync(started).toBeRejectedWithError(AttachmentError, /cancelled while it was opening/u);
        expect(controller.current()).toBe('STARTING');
        expect(controller.activeTurnOwner()).toBeNull();
        expect(gated.opens()).toBe(1);
    });

    it('commits no binding, so a later submit or wait has nothing to act on', async () => {
        const gated = gatedPort();
        const controller = new TuiAttachmentController({port: gated.port});
        const aborter = new AbortController();
        const started = controller.start(binding, aborter.signal);
        aborter.abort();
        gated.release();
        await expectAsync(started).toBeRejected();
        await expectAsync(controller.submit(request)).toBeRejectedWithError(AttachmentError, /has not been started/u);
        await expectAsync(controller.wait('turn-1', signal())).toBeRejectedWithError(AttachmentError, /has not been started/u);
        expect(controller.current()).toBe('STARTING');
    });

    it('still refuses before the durable open when the signal is already aborted', async () => {
        const gated = gatedPort();
        const controller = new TuiAttachmentController({port: gated.port});
        const aborter = new AbortController();
        aborter.abort();
        await expectAsync(controller.start(binding, aborter.signal)).toBeRejectedWithError(AttachmentError, /cancelled before it opened/u);
        expect(gated.opens()).toBe(0);
        expect(controller.current()).toBe('STARTING');
    });

    it('attaches normally when the signal never aborts', async () => {
        const gated = gatedPort();
        const controller = new TuiAttachmentController({port: gated.port});
        const started = controller.start(binding, signal());
        gated.release();
        expect((await started).state).toBe('ATTACHED');
        expect(controller.current()).toBe('ATTACHED');
    });
});

describe('CA-22 consolidated matrix — post-apply and retry outcomes', () => {
    it('C2-01: a later preview cannot re-arm a superseded confirmation', () => {
        const live = reducer(event('effect.preview', 1, {confirmationId: 'confirmation-a'}, 1), event('effect.preview', 2, {confirmationId: 'confirmation-b'}, 2));
        const confirmation = live.current().confirmation;
        expect(confirmation?.confirmationId).toBe('confirmation-a');
        expect(confirmation?.derivedRevision).toBe(1);
        expect(confirmation?.valid).toBeFalse();
        expect(confirmation?.invalidatedBy).toBe('evt-2');
    });

    it('C2-01: an explicit operator dismissal is the only path back to a fresh confirmation', () => {
        const live = reducer(event('effect.preview', 1, {confirmationId: 'confirmation-a'}, 1), event('effect.preview', 2, {confirmationId: 'confirmation-b'}, 2));
        live.dismissConfirmation();
        live.reduce(event('effect.preview', 3, {confirmationId: 'confirmation-c'}, 3));
        expect(live.current().confirmation).toEqual(jasmine.objectContaining({confirmationId: 'confirmation-c', valid: true, derivedRevision: 3}));
    });

    it('C2-01: an equal-revision event preserves validity', () => {
        const live = reducer(event('effect.preview', 1, {confirmationId: 'confirmation-a'}, 4), event('effect.result', 2, {}, 4));
        expect(live.current().confirmation?.valid).toBeTrue();
    });

    it('C2-05: three concurrent callers all observe the follow-up result', async () => {
        let release = (): void => {};
        const gate = new Promise<void>((resolve) => { release = resolve; });
        const polls: string[] = [];
        const made = new NotificationRefreshController({
            laneId: 'lane-1', operatorSessionId: 'session-1',
            port: {poll: async (cp: DurableCheckpoint) => { polls.push(`${cp.sequence}/${cp.revision}`); if (polls.length === 1) await gate; return page(cp); }}
        });
        const first = made.refresh(checkpoint(1), signal());
        const second = made.refresh(checkpoint(5), signal());
        const third = made.refresh(checkpoint(6), signal());
        release();
        const results = await Promise.all([first, second, third]);
        expect(results.map((update) => update.checkpoint.sequence)).toEqual([1, 6, 6]);
        expect(results[1]).toBe(results[2]);
        expect(polls).toEqual(['1/1', '6/6']);
        expect(made.pendingCheckpoint()).toBeNull();
    });

    it('C2-05: a same-sequence higher-revision checkpoint is not discarded', async () => {
        const polls: string[] = [];
        const made = new NotificationRefreshController({
            laneId: 'lane-1', operatorSessionId: 'session-1',
            port: {poll: async (cp: DurableCheckpoint) => { polls.push(`${cp.sequence}/${cp.revision}`); if (polls.length === 1) await new Promise((resolve) => { setTimeout(resolve, 1); }); return page(cp); }}
        });
        const results = await Promise.all([made.refresh(checkpoint(1, 1), signal()), made.refresh(checkpoint(1, 2), signal())]);
        expect(results.map((update) => update.checkpoint.revision)).toEqual([1, 2]);
        expect(polls).toEqual(['1/1', '1/2']);
    });

    it('C2-02: a refused cross-turn event does not open a second accumulator', () => {
        const live = liveTurn();
        expect(() => live.reduce(event('turn.provisional', 9, {index: 1, text: 'foreign'}, 9, 'turn-2'))).toThrowError(AttachmentError, /active turn/u);
        expect(live.current().provisional?.text).toBe('kept');
        expect(live.current().activeTurnId).toBe('turn-1');
        live.reduce(event('turn.provisional', 10, {index: 1, text: ' continues'}));
        expect(live.current().provisional?.text).toBe('kept continues');
    });

    it('a settled turn releases its accumulator so the next turn starts clean', () => {
        const live = liveTurn();
        live.reduce(event('turn.validated', 9, {}));
        expect(live.current().provisional).toBeNull();
        live.reduce(event('turn.preflight', 10, {}, 10, 'turn-2'));
        live.reduce(event('turn.provisional', 11, {index: 0, text: 'second'}, 11, 'turn-2'));
        expect(live.current().provisional?.text).toBe('second');
        expect(live.current().activeTurnId).toBe('turn-2');
    });
});
