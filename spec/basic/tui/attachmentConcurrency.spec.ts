import {TuiAttachmentController} from '../../../src/presentation/tui/TuiAttachmentController.js';
import {NotificationRefreshController} from '../../../src/presentation/tui/NotificationRefreshController.js';
import {PresentationEventReducer} from '../../../src/presentation/tui/PresentationEventReducer.js';
import {AttachmentError, orderAttentionItems} from '../../../src/contracts/tuiAttachment.js';
import type {AttachmentBinding, AttachmentRole, AttachmentSessionPort, DurableCheckpoint} from '../../../src/contracts/tuiAttachment.js';

const sanitizer = {sanitize: (text: string): string => text};
const OWNER = Object.freeze({laneId: 'lane-1', operatorSessionId: 'session-1', turnId: 'turn-9', attachmentId: 'attach-2', startedAt: '2026-08-11T10:00:00Z'});

function binding(overrides: Partial<AttachmentBinding> = {}): AttachmentBinding {
    return {laneId: 'lane-1', operatorSessionId: 'session-1', attachmentId: 'attach-1', role: 'operator', stream: true, waitForActiveTurn: false, ...overrides};
}
function request(bound: AttachmentBinding, text = 'hello'): Record<string, unknown> {
    return {binding: bound, text, bytes: new TextEncoder().encode(text).length, usesModel: true, revision: 3};
}
const admitted = (turnId = 'turn-1'): Record<string, unknown> => ({kind: 'admitted', turnId, revision: 6, laneId: 'lane-1', operatorSessionId: 'session-1', attachmentId: 'attach-1'});
const durable = (turnId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> =>
    ({laneId: 'lane-1', operatorSessionId: 'session-1', turnId, state: 'complete', stale: false, revision: 7, text: 'done', usage: {}, ...overrides});

class FakePort implements AttachmentSessionPort {
    opens = 0; admits = 0; waits = 0;
    constructor(private readonly openResult: unknown, private readonly admitResult: unknown = null, private readonly waitResult: unknown = null) {}
    async open(): Promise<unknown> { this.opens += 1; return this.openResult; }
    async admit(): Promise<unknown> { this.admits += 1; return this.admitResult; }
    async awaitTurn(): Promise<unknown> { this.waits += 1; return this.waitResult; }
}

const openedAs = (state: string, owner: unknown = null): Record<string, unknown> => ({state, activeTurnOwner: owner, revision: 5, createdSession: false});
const signal = (): AbortSignal => new AbortController().signal;

function reducer(role: AttachmentRole = 'operator'): PresentationEventReducer {
    return new PresentationEventReducer({laneId: 'lane-1', operatorSessionId: 'session-1', role, sanitizer});
}
function event(type: string, sequence: number, detail: Record<string, unknown> = {}, revision = sequence): Record<string, unknown> {
    return {type, eventId: `evt-${sequence}`, sequence, laneId: 'lane-1', operatorSessionId: 'session-1', turnId: 'turn-1', correlationId: 'corr-1', revision, detail};
}

async function started(port: AttachmentSessionPort, bound = binding()): Promise<TuiAttachmentController> {
    const controller = new TuiAttachmentController({port});
    await controller.start(bound, signal());
    return controller;
}

describe('CA-22 cross-attachment contention and wait', () => {
    it('attaches without creating a session and refuses an open result that claims it did', async () => {
        const result = await new TuiAttachmentController({port: new FakePort(openedAs('ATTACHED'))}).start(binding(), signal());
        expect(result.state).toBe('ATTACHED');
        expect(result.createdSession).toBeFalse();
        const lying = new FakePort({...openedAs('ATTACHED'), createdSession: true});
        await expectAsync(new TuiAttachmentController({port: lying}).start(binding(), signal())).toBeRejectedWithError(AttachmentError, /never creates an operator session/u);
    });

    it('returns the durable contention reason and owner instead of a second invocation', async () => {
        const port = new FakePort(openedAs('ATTACHED'), {kind: 'refused', reason: 'OPERATOR_SESSION_TURN_ACTIVE', detail: 'another attachment owns the turn', owner: OWNER});
        const controller = await started(port);
        const admission = await controller.submit(request(binding()));
        expect(admission).toEqual(jasmine.objectContaining({kind: 'refused', reason: 'OPERATOR_SESSION_TURN_ACTIVE'}));
        expect(controller.activeTurnOwner()).toEqual(OWNER);
        expect(controller.current()).toBe('ATTACHED');
    });

    it('waits for the durable result only under an explicit wait binding and holds no lock', async () => {
        const bound = binding({waitForActiveTurn: true});
        const port = new FakePort(openedAs('ATTACHED'), {kind: 'waiting', owner: OWNER, holdsLock: false}, durable('turn-9'));
        const controller = await started(port, bound);
        const admission = await controller.submit(request(bound));
        expect(admission).toEqual(jasmine.objectContaining({kind: 'waiting', holdsLock: false}));
        expect(controller.current()).toBe('ATTACHED');
        expect((await controller.wait('turn-9', signal())).state).toBe('complete');
        expect(port.admits).toBe(1);
    });

    it('refuses a waiting admission when the binding never asked to wait, and one that claims a lock', async () => {
        const plain = await started(new FakePort(openedAs('ATTACHED'), {kind: 'waiting', owner: OWNER, holdsLock: false}));
        await expectAsync(plain.submit(request(binding()))).toBeRejectedWithError(AttachmentError, /explicit wait-for-active-turn binding/u);
        const bound = binding({waitForActiveTurn: true});
        const locking = await started(new FakePort(openedAs('ATTACHED'), {kind: 'waiting', owner: OWNER, holdsLock: true}), bound);
        await expectAsync(locking.submit(request(bound))).toBeRejectedWithError(AttachmentError, /holds no session, lane, or endpoint lock/u);
    });

    it('bounds and fences operator turn input before any durable call', async () => {
        const port = new FakePort(openedAs('ATTACHED'), admitted());
        const controller = new TuiAttachmentController({port, maxTurnRequestBytes: 8});
        await controller.start(binding(), signal());
        await expectAsync(controller.submit(request(binding(), 'far too long'))).toBeRejectedWithError(AttachmentError, /exceeds 8 bytes/u);
        await expectAsync(controller.submit(request(binding({attachmentId: 'attach-9'})))).toBeRejectedWithError(AttachmentError, /another attachment, lane, or operator session/u);
        expect(port.admits).toBe(0);
        expect((await controller.submit(request(binding()))).kind).toBe('admitted');
        expect(controller.current()).toBe('TURN_ACTIVE');
    });
});

describe('CA-22 durable identity binding (CA22-03)', () => {
    it('refuses an admitted turn bound to a foreign lane, session, or attachment', async () => {
        for (const [override, pattern] of [
            [{laneId: 'lane-2'}, /another lane or operator session/u],
            [{operatorSessionId: 'session-2'}, /another lane or operator session/u],
            [{attachmentId: 'attach-7'}, /granted to another attachment/u]
        ] as const) {
            const controller = await started(new FakePort(openedAs('ATTACHED'), {...admitted(), ...override}));
            await expectAsync(controller.submit(request(binding()))).toBeRejectedWithError(AttachmentError, pattern);
            expect(controller.current()).toBe('ATTACHED');
        }
    });

    it('refuses an admitted record missing its durable identity', async () => {
        const controller = await started(new FakePort(openedAs('ATTACHED'), {kind: 'admitted', turnId: 't', revision: 1}));
        await expectAsync(controller.submit(request(binding()))).toBeRejectedWithError(AttachmentError, /closed admitted record/u);
    });

    it('refuses an active-turn owner from a foreign lane or naming this attachment', async () => {
        const bound = binding({waitForActiveTurn: true});
        const foreign = await started(new FakePort(openedAs('ATTACHED'), {kind: 'waiting', owner: {...OWNER, laneId: 'lane-2'}, holdsLock: false}), bound);
        await expectAsync(foreign.submit(request(bound))).toBeRejectedWithError(AttachmentError, /another lane or operator session/u);
        const self = await started(new FakePort(openedAs('ATTACHED'), {kind: 'waiting', owner: {...OWNER, attachmentId: 'attach-1'}, holdsLock: false}), bound);
        await expectAsync(self.submit(request(bound))).toBeRejectedWithError(AttachmentError, /names this attachment/u);
    });

    it('refuses a wait for a turn this attachment never established a relationship with', async () => {
        const port = new FakePort(openedAs('ATTACHED'), admitted(), durable('turn-unrelated'));
        const controller = await started(port);
        await expectAsync(controller.wait('turn-unrelated', signal())).toBeRejectedWithError(AttachmentError, /no admitted or waiting relationship/u);
        expect(port.waits).toBe(0);
        expect(controller.current()).toBe('ATTACHED');
    });

    it('authorizes a wait only for the admitted turn, and only once', async () => {
        const port = new FakePort(openedAs('ATTACHED'), admitted('turn-1'), durable('turn-1'));
        const controller = await started(port);
        await controller.submit(request(binding()));
        expect((await controller.wait('turn-1', signal())).turnId).toBe('turn-1');
        await expectAsync(controller.wait('turn-1', signal())).toBeRejectedWithError(AttachmentError, /no admitted or waiting relationship/u);
        expect(port.waits).toBe(1);
    });

    it('refuses a durable result bound to a foreign lane, session, or turn', async () => {
        for (const [override, pattern] of [
            [{laneId: 'lane-2'}, /another lane or operator session/u],
            [{operatorSessionId: 'session-2'}, /another lane or operator session/u],
            [{turnId: 'turn-other'}, /belongs to another turn/u]
        ] as const) {
            const port = new FakePort(openedAs('ATTACHED'), admitted('turn-1'), durable('turn-1', override));
            const controller = await started(port);
            await controller.submit(request(binding()));
            await expectAsync(controller.wait('turn-1', signal())).toBeRejectedWithError(AttachmentError, pattern);
        }
    });

    it('cancels a wait pre-flight and in-flight without touching durable state', async () => {
        const port = new FakePort(openedAs('ATTACHED'), admitted('turn-1'), durable('turn-1'));
        const controller = await started(port);
        await controller.submit(request(binding()));
        const aborted = new AbortController();
        aborted.abort();
        await expectAsync(controller.wait('turn-1', aborted.signal)).toBeRejectedWithError(AttachmentError, /cancelled before it started/u);
        expect(port.waits).toBe(0);
    });
});

describe('CA-22 observer restrictions', () => {
    it('settles an observer binding read-only and refuses a turn before any durable call', async () => {
        const port = new FakePort(openedAs('OBSERVING'));
        const observer = binding({role: 'observer'});
        const controller = await started(port, observer);
        expect(controller.current()).toBe('OBSERVING');
        const admission = await controller.submit(request(observer));
        expect(admission).toEqual(jasmine.objectContaining({kind: 'refused', reason: 'OPERATOR_SESSION_OBSERVER_READ_ONLY'}));
        expect(port.admits).toBe(0);
    });

    it('refuses an open result that settles an observer in a writable state', async () => {
        await expectAsync(new TuiAttachmentController({port: new FakePort(openedAs('ATTACHED'))}).start(binding({role: 'observer'}), signal()))
            .toBeRejectedWithError(AttachmentError, /never settles in a writable attachment state/u);
    });

    it('locks the observer composer and drops another process provisional chunks', () => {
        const observer = reducer('observer');
        expect(observer.current().composerLocked).toBeTrue();
        observer.reduce(event('attachment.opened', 1));
        expect(observer.current().attachment).toBe('OBSERVING');
        observer.reduce(event('turn.provisional', 2, {index: 0, text: 'not for observers'}));
        expect(observer.current().provisional).toBeNull();
        observer.reduce(event('turn.validated', 3, {}));
        expect(observer.current().stream).toBe('VALIDATED');
        expect(observer.current().attachment).toBe('OBSERVING');
    });

    it('locks the composer when the durable session can no longer accept input', () => {
        const live = reducer();
        live.reduce(event('session.bound', 1, {lifecycle: 'closed'}));
        expect(live.current().attachment).toBe('SESSION_UNAVAILABLE');
        expect(live.current().composerLocked).toBeTrue();
    });
});

describe('CA-22 stale confirmation invalidation (CA22-01)', () => {
    const preview = (sequence: number, revision: number): Record<string, unknown> =>
        event('effect.preview', sequence, {confirmationId: 'confirm-1', title: 'Apply', reasonCode: 'APPLY'}, revision);

    it('invalidates on any event type past the derived revision', () => {
        for (const [type, detail] of [
            ['turn.stale', {}], ['turn.validated', {}], ['budget.updated', {budget: '2 left'}],
            ['effect.result', {}], ['proposal.available', {proposalId: 'p1'}], ['lane.notification', {label: 'x'}]
        ] as const) {
            const live = reducer();
            live.reduce(preview(1, 4));
            expect(live.current().confirmation).toEqual(jasmine.objectContaining({valid: true, derivedRevision: 4}));
            live.reduce(event(type, 2, detail as Record<string, unknown>, 5));
            expect(live.current().confirmation).toEqual(jasmine.objectContaining({valid: false, invalidatedBy: 'evt-2'}));
        }
    });

    it('preserves validity at an equal revision', () => {
        const live = reducer();
        live.reduce(preview(1, 7));
        live.reduce(event('effect.result', 2, {}, 7));
        live.reduce(event('lane.notification', 3, {label: 'same revision'}, 7));
        expect(live.current().confirmation?.valid).toBeTrue();
    });

    it('never re-arms an invalidated confirmation, including through a later effect.preview', () => {
        const live = reducer();
        live.reduce(preview(1, 2));
        live.reduce(event('turn.stale', 2, {}, 3));
        expect(live.current().confirmation).toEqual(jasmine.objectContaining({valid: false, invalidatedBy: 'evt-2'}));
        live.reduce(preview(3, 9));
        expect(live.current().confirmation).toEqual(jasmine.objectContaining({valid: false, invalidatedBy: 'evt-2', derivedRevision: 2}));
        live.reduce(event('effect.result', 4, {}, 12));
        expect(live.current().confirmation?.valid).toBeFalse();
    });

    it('requires an explicit operator dismissal before a fresh confirmation can arm', () => {
        const live = reducer();
        live.reduce(preview(1, 2));
        live.reduce(event('turn.stale', 2, {}, 3));
        live.dismissConfirmation();
        expect(live.current().confirmation).toBeNull();
        live.reduce(preview(3, 9));
        expect(live.current().confirmation).toEqual(jasmine.objectContaining({valid: true, derivedRevision: 9}));
    });

    it('clears a confirmation when the session becomes unavailable', () => {
        const live = reducer();
        live.reduce(preview(1, 2));
        live.reduce(event('session.bound', 2, {lifecycle: 'suspended'}, 3));
        expect(live.current().confirmation).toBeNull();
    });
});

describe('CA-22 notification page identity and coalescing (CA22-05)', () => {
    const checkpoint = (sequence: number, revision = sequence): DurableCheckpoint => ({laneId: 'lane-1', sequence, revision, digest: `sha-${sequence}`});
    const item = (eventId: string, type: string, sequence: number): Record<string, unknown> => ({eventId, sequence, label: eventId, type});
    const page = (cp: DurableCheckpoint, items: readonly unknown[], overrides: Record<string, unknown> = {}): Record<string, unknown> =>
        ({laneId: 'lane-1', operatorSessionId: 'session-1', checkpoint: cp, items, ...overrides});

    class FakeCheckpointPort {
        polls = 0; requested: DurableCheckpoint[] = [];
        constructor(private readonly reply: (cp: DurableCheckpoint) => unknown, private readonly gate?: Promise<void>) {}
        async poll(cp: DurableCheckpoint): Promise<unknown> { this.polls += 1; this.requested.push(cp); if (this.gate) await this.gate; return this.reply(cp); }
    }

    function controller(port: {poll: (cp: DurableCheckpoint) => Promise<unknown>}, maxQueue?: number): NotificationRefreshController {
        return new NotificationRefreshController({laneId: 'lane-1', operatorSessionId: 'session-1', port, maxQueue});
    }

    it('derives priorities from the closed table and never advances the watcher cursor', async () => {
        const port = new FakeCheckpointPort((cp) => page(cp, [item('e1', 'lane.notification', 1), item('e2', 'turn.stale', 2)]));
        const update = await controller(port).refresh(checkpoint(1), signal());
        expect(update.items.map((entry) => entry.priority)).toEqual(['P1', 'P4']);
        expect(update.advancedWatcherCursor).toBeFalse();
        expect(update.usedModel).toBeFalse();
    });

    it('drops the low-priority tail so a visible high-priority condition always survives', async () => {
        const items = [item('e1', 'lane.notification', 1), item('e2', 'turn.stale', 2), item('e3', 'lane.notification', 3)];
        const update = await controller(new FakeCheckpointPort((cp) => page(cp, items)), 2).refresh(checkpoint(1), signal());
        expect(update.dropped).toBe(1);
        expect(update.items.map((entry) => entry.eventId)).toEqual(['e2', 'e1']);
    });

    it('CA22-05: retains the newest checkpoint and covers it with one bounded follow-up poll', async () => {
        let release = (): void => {};
        const gate = new Promise<void>((resolve) => { release = resolve; });
        const port = new FakeCheckpointPort((cp) => page(cp, [item(`e${cp.sequence}`, 'lane.notification', cp.sequence)]), gate);
        const refresher = controller(port);
        const first = refresher.refresh(checkpoint(1), signal());
        const second = refresher.refresh(checkpoint(5), signal());
        release();
        const [a, b] = await Promise.all([first, second]);
        expect(a.checkpoint.sequence).toBe(1);
        expect(a.coalesced).toBe(1);
        expect(a.deferred).toBeTrue();
        expect(b.checkpoint.sequence).toBe(5);
        expect(port.polls).toBe(2);
        expect(port.requested.map((cp) => cp.sequence)).toEqual([1, 5]);
        expect(refresher.pendingCheckpoint()).toBeNull();
        expect(refresher.current()?.sequence).toBe(5);
    });

    it('CA22-05: does not start a follow-up when the in-flight poll already covered the newest checkpoint', async () => {
        let release = (): void => {};
        const gate = new Promise<void>((resolve) => { release = resolve; });
        const port = new FakeCheckpointPort(() => page(checkpoint(9), []), gate);
        const refresher = controller(port);
        const first = refresher.refresh(checkpoint(1), signal());
        const second = refresher.refresh(checkpoint(4), signal());
        release();
        const [a, b] = await Promise.all([first, second]);
        expect(port.polls).toBe(1);
        expect(a).toBe(b);
        expect(a.checkpoint.sequence).toBe(9);
        expect(refresher.pendingCheckpoint()).toBeNull();
    });

    it('CA22-05: refuses a foreign-lane, foreign-session, or malformed page before touching the queue', async () => {
        for (const [overrides, pattern] of [
            [{laneId: 'lane-2'}, /another lane or operator session/u],
            [{operatorSessionId: 'session-2'}, /another lane or operator session/u],
            [{extra: 1}, /closed page envelope/u]
        ] as const) {
            const refresher = controller(new FakeCheckpointPort((cp) => page(cp, [], overrides as Record<string, unknown>)));
            await expectAsync(refresher.refresh(checkpoint(1), signal())).toBeRejected();
            expect(refresher.queued()).toEqual([]);
            expect(refresher.current()).toBeNull();
        }
    });

    it('CA22-05: refuses a page whose checkpoint regressed behind the requested one', async () => {
        const refresher = controller(new FakeCheckpointPort(() => page(checkpoint(1), [])));
        await expectAsync(refresher.refresh(checkpoint(5), signal())).toBeRejectedWithError(AttachmentError, /moved backwards/u);
        expect(refresher.current()).toBeNull();
    });

    it('CA22-05: a hidden view performs no durable read and stays pure', async () => {
        const port = new FakeCheckpointPort((cp) => page(cp, [item('e1', 'lane.notification', 1)]));
        const refresher = controller(port);
        refresher.setVisible(false);
        const hidden = await refresher.refresh(checkpoint(1), signal());
        expect(port.polls).toBe(0);
        expect(hidden.items).toEqual([]);
        expect(hidden.usedModel).toBeFalse();
        expect(hidden.advancedWatcherCursor).toBeFalse();
    });

    it('CA22-05: cancels pre-flight and in-flight without mutating the queue', async () => {
        const aborted = new AbortController();
        aborted.abort();
        const refresher = controller(new FakeCheckpointPort((cp) => page(cp, [])));
        await expectAsync(refresher.refresh(checkpoint(1), aborted.signal)).toBeRejectedWithError(AttachmentError, /cancelled before it started/u);

        const late = new AbortController();
        const gate = new Promise<void>((resolve) => { setTimeout(resolve, 0); });
        const slow = controller(new FakeCheckpointPort((cp) => { late.abort(); return page(cp, [item('e1', 'lane.notification', 1)]); }, gate));
        await expectAsync(slow.refresh(checkpoint(1), late.signal)).toBeRejectedWithError(AttachmentError, /cancelled while it was in flight/u);
        expect(slow.queued()).toEqual([]);
    });

    it('queues while a confirmation is open and releases at a safe boundary', async () => {
        const refresher = controller(new FakeCheckpointPort((cp) => page(cp, [item('e1', 'lane.notification', 1)])));
        await refresher.refresh(checkpoint(2), signal());
        refresher.setConfirming(true);
        expect(refresher.release()).toEqual([]);
        refresher.setConfirming(false);
        expect(refresher.release().map((entry) => entry.eventId)).toEqual(['e1']);
        expect(refresher.queued()).toEqual([]);
    });

    it('orders attention deterministically by priority, sequence, then event id', () => {
        const items = orderAttentionItems([
            {priority: 'P4', sequence: 2, eventId: 'b', label: 'b', type: 'lane.notification', stealsFocus: false},
            {priority: 'P4', sequence: 2, eventId: 'a', label: 'a', type: 'lane.notification', stealsFocus: false},
            {priority: 'P0', sequence: 9, eventId: 'z', label: 'z', type: 'attachment.detached', stealsFocus: false}
        ]);
        expect(items.map((entry) => entry.eventId)).toEqual(['z', 'a', 'b']);
    });
});
