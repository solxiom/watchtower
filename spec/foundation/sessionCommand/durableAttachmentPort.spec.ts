/**
 * CA-24 — the durable attachment port behind CA-22's state machine.
 *
 * These are the concurrency, replay, and identity proofs for the binding this
 * batch owns: one durable turn per session, a losing concurrent writer that is
 * refused rather than admitted, a cancelled open that commits nothing, and a
 * foreign-identity answer that CA-22's own trust boundary rejects.
 */
import {
    DurableAttachmentSessionPort
} from '../../../src/foundation/lane/coordinator/sessionCommand/index.js';
import {TuiAttachmentController} from '../../../src/presentation/tui/index.js';
import type {AttachmentBinding, BoundedTurnRequest} from '../../../src/contracts/tuiAttachment.js';
import {AttachmentError} from '../../../src/contracts/tuiAttachment.js';
import {createSessionLane, LANE_ID, openSession, type SessionLaneFixture} from './support/sessionCommandFixtures.js';

function binding(operatorSessionId: string, overrides: Partial<AttachmentBinding> = {}): AttachmentBinding {
    return Object.freeze({
        laneId: LANE_ID, operatorSessionId, attachmentId: 'att-1', role: 'operator',
        stream: true, waitForActiveTurn: false, ...overrides
    });
}

function turnRequest(bound: AttachmentBinding, text = 'status'): BoundedTurnRequest {
    return {binding: bound, text, bytes: Buffer.byteLength(text, 'utf8'), usesModel: false, revision: 1};
}

function makePort(fixture: SessionLaneFixture, ids: readonly string[] = ['turn-0001', 'turn-0002']): DurableAttachmentSessionPort {
    let index = 0;
    return new DurableAttachmentSessionPort({
        store: fixture.store, laneId: LANE_ID,
        answer: (request) => ({text: `projection:${request.text}`, usage: {inputTokens: 1, outputTokens: 2}}),
        turnIdFactory: () => ids[index++] ?? `turn-${index}`
    });
}

describe('CA-24 durable attachment port', function () {
    let fixture: SessionLaneFixture;
    beforeEach(function () { fixture = createSessionLane(); });
    afterEach(function () { fixture.dispose(); });

    it('attaches without appending a turn or changing lifecycle state', async function () {
        const session = openSession(fixture, 'attach');
        const controller = new TuiAttachmentController({port: makePort(fixture)});
        const opened = await controller.start(binding(session.operatorSessionId), new AbortController().signal);
        expect(opened.state).toBe('ATTACHED');
        expect(opened.createdSession).toBeFalse();
        expect(fixture.store.loadSession(session.operatorSessionId).state).toBe('open');
        expect(fixture.store.listTurns(session.operatorSessionId)).toEqual([]);
    });

    it('settles an observer in OBSERVING and refuses its turns before any durable call', async function () {
        const session = openSession(fixture, 'observer');
        const controller = new TuiAttachmentController({port: makePort(fixture)});
        const bound = binding(session.operatorSessionId, {role: 'observer'});
        expect((await controller.start(bound, new AbortController().signal)).state).toBe('OBSERVING');
        const admission = await controller.submit(turnRequest(bound));
        expect(admission.kind).toBe('refused');
        expect(fixture.store.listTurns(session.operatorSessionId)).toEqual([]);
    });

    it('settles an unavailable session without inventing a writable state', async function () {
        const controller = new TuiAttachmentController({port: makePort(fixture)});
        const opened = await controller.start(binding('opsess-missing'), new AbortController().signal);
        expect(opened.state).toBe('SESSION_UNAVAILABLE');
    });

    it('commits nothing when the open is cancelled', async function () {
        const session = openSession(fixture, 'cancelled');
        const controller = new TuiAttachmentController({port: makePort(fixture)});
        const aborted = new AbortController();
        aborted.abort();
        await expectAsync(controller.start(binding(session.operatorSessionId), aborted.signal)).toBeRejectedWithError(AttachmentError);
        expect(controller.current()).toBe('STARTING');
        expect(fixture.store.listTurns(session.operatorSessionId)).toEqual([]);
    });

    it('admits one durable turn and reads exactly that turn back', async function () {
        const session = openSession(fixture, 'turn');
        const controller = new TuiAttachmentController({port: makePort(fixture)});
        const bound = binding(session.operatorSessionId);
        await controller.start(bound, new AbortController().signal);
        const admission = await controller.submit(turnRequest(bound));
        expect(admission.kind).toBe('admitted');
        if (admission.kind !== 'admitted') return;
        const result = await controller.wait(admission.turnId, new AbortController().signal);
        expect(result.turnId).toBe('turn-0001');
        expect(result.state).toBe('complete');
        expect(result.text).toBe('projection:status');
        expect(fixture.store.loadSession(session.operatorSessionId).turnCount).toBe(1);
    });

    it('refuses a second concurrent writer with the durable contention reason', async function () {
        const session = openSession(fixture, 'contention');
        const shared = makePort(fixture);
        const first = new TuiAttachmentController({port: shared});
        const bound = binding(session.operatorSessionId);
        await first.start(bound, new AbortController().signal);
        // A durable active turn that never completes, established through the accepted producer.
        fixture.store.acquireTurn(fixture.store.loadSession(session.operatorSessionId), 'turn-9999', 'foreign writer');

        const second = new TuiAttachmentController({port: shared});
        const otherBinding = binding(session.operatorSessionId, {attachmentId: 'att-2'});
        await second.start(otherBinding, new AbortController().signal);
        const admission = await second.submit(turnRequest(otherBinding));
        expect(admission.kind).toBe('refused');
        if (admission.kind === 'refused') expect(admission.reason).toBe('OPERATOR_SESSION_TURN_ACTIVE');
        expect(fixture.store.loadSession(session.operatorSessionId).activeTurnId).toBe('turn-9999');
    });

    it('refuses a wait for a turn this attachment never established', async function () {
        const session = openSession(fixture, 'wait');
        const controller = new TuiAttachmentController({port: makePort(fixture)});
        await controller.start(binding(session.operatorSessionId), new AbortController().signal);
        await expectAsync(controller.wait('turn-0001', new AbortController().signal)).toBeRejectedWithError(AttachmentError);
    });

    it('rejects a foreign-lane answer at CA-22\'s trust boundary', async function () {
        const session = openSession(fixture, 'foreign');
        const port = new DurableAttachmentSessionPort({
            store: fixture.store, laneId: 'a-different-lane',
            answer: () => ({text: '', usage: {}})
        });
        const controller = new TuiAttachmentController({port});
        const bound = binding(session.operatorSessionId);
        await controller.start(bound, new AbortController().signal);
        const admission = await controller.submit(turnRequest(bound));
        expect(admission.kind).toBe('admitted');
        if (admission.kind !== 'admitted') return;
        await expectAsync(controller.wait(admission.turnId, new AbortController().signal)).toBeRejectedWithError(AttachmentError);
    });
});
