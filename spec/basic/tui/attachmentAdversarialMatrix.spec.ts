/**
 * CA-22 consolidated adversarial matrix.
 *
 * Consolidation gate for the reject lineages: correction-01 (`CA22-01`…`05`),
 * correction-02 (`C2-01`…`05`), and correction-03 (`CA22-06`) are one
 * table-driven matrix over the complete CA-22 trust/state boundary rather than
 * a growing list of ad hoc cases.
 *
 * Trust boundary — four untrusted entries reach owned state:
 *   E1 presentation event      → PresentationEventReducer.reduce
 *   E2 normalized turn chunk   → ProvisionalTurnAccumulator.append
 *   E3 durable session answer  → TuiAttachmentController via attachmentPortValidation
 *   E4 notification page       → NotificationRefreshController.refresh
 *
 * Failure phases, in the order every entry applies them:
 *   P1 syntax/schema · P2 value type · P3 canonical identity · P4 current-state
 *   fence · P5 bounds · P6 apply · P7 post-apply/retry
 *
 * Harness contract (correction-03): a row `seed()`s the retained object and
 * `offend()`s **that same object**. The reason suite asserts the typed refusal;
 * the unchanged-state suite snapshots the seeded object before and after the
 * offending entry and requires the snapshots to match. A row that quietly
 * built a second object would prove nothing, so `offend` never constructs one.
 */
import {PresentationEventReducer} from '../../../src/presentation/tui/PresentationEventReducer.js';
import {ProvisionalTurnAccumulator} from '../../../src/presentation/tui/ProvisionalTurnAccumulator.js';
import {TuiAttachmentController} from '../../../src/presentation/tui/TuiAttachmentController.js';
import {NotificationRefreshController} from '../../../src/presentation/tui/NotificationRefreshController.js';
import {AttachmentError} from '../../../src/contracts/tuiAttachment.js';
import type {AttachmentBinding, AttachmentReason, DurableCheckpoint} from '../../../src/contracts/tuiAttachment.js';

const sanitizer = {sanitize: (text: string): string => text};
const signal = (): AbortSignal => new AbortController().signal;
const utf8 = (text: string): number => new TextEncoder().encode(text).length;

function event(type: string, sequence: number, detail: Record<string, unknown> = {}, revision = sequence, turnId: string | null = 'turn-1'): Record<string, unknown> {
    return {type, eventId: `evt-${sequence}`, sequence, laneId: 'lane-1', operatorSessionId: 'session-1', turnId, correlationId: 'corr-1', revision, detail};
}
const binding: AttachmentBinding = Object.freeze({laneId: 'lane-1', operatorSessionId: 'session-1', attachmentId: 'attach-1', role: 'operator', stream: true, waitForActiveTurn: true});
const admitted = Object.freeze({kind: 'admitted', turnId: 'turn-1', revision: 6, laneId: 'lane-1', operatorSessionId: 'session-1', attachmentId: 'attach-1'});
const opened = Object.freeze({state: 'ATTACHED', activeTurnOwner: null, revision: 5, createdSession: false});
const durable = Object.freeze({laneId: 'lane-1', operatorSessionId: 'session-1', turnId: 'turn-1', state: 'complete', stale: false, revision: 7, text: 'ok', usage: {}});
const request = Object.freeze({binding, text: 'hi', bytes: 2, usesModel: true, revision: 3});
const owner = (attachmentId: string): Record<string, unknown> => ({laneId: 'lane-1', operatorSessionId: 'session-1', turnId: 'turn-9', attachmentId, startedAt: 'now'});
const checkpoint = (sequence: number, revision = sequence): DurableCheckpoint => ({laneId: 'lane-1', sequence, revision, digest: `d${sequence}.${revision}`});
const page = (cp: DurableCheckpoint, overrides: Record<string, unknown> = {}): Record<string, unknown> =>
    ({laneId: 'lane-1', operatorSessionId: 'session-1', checkpoint: cp, items: [], ...overrides});

/**
 * One matrix row. `seed` returns the retained object under test; `offend`
 * applies the refused entry to exactly that object; `snapshot` captures the
 * state the row promises is unchanged.
 */
interface Row<T> {
    readonly id: string; readonly phase: string; readonly lineage: string; readonly reason: AttachmentReason;
    readonly seed: () => T | Promise<T>;
    readonly offend: (target: T) => unknown;
    readonly snapshot: (target: T) => unknown;
    /** Instruments the seeded object so the harness can prove `offend` actually reached it. */
    readonly witness: (target: T) => () => number;
}

/**
 * Counts calls to the named methods of the seeded instance. This is what makes
 * the unchanged-state suite honest: a row that quietly constructs a second
 * object leaves this counter at zero and fails, instead of passing because
 * some *other* object threw the expected error.
 */
function witnessOf<T extends object>(target: T, methods: readonly string[]): () => number {
    let calls = 0;
    for (const name of methods) {
        const owner = target as unknown as Record<string, (...args: never[]) => unknown>;
        const original = owner[name].bind(target);
        owner[name] = (...args: never[]): unknown => { calls += 1; return original(...args); };
    }
    return () => calls;
}

const reducerSnapshot = (live: PresentationEventReducer): unknown => live.current();
function reducer(...seeded: readonly Record<string, unknown>[]): PresentationEventReducer {
    const live = new PresentationEventReducer({laneId: 'lane-1', operatorSessionId: 'session-1', role: 'operator', sanitizer});
    for (const item of seeded) live.reduce(item);
    return live;
}
/** The standard live-turn seed: a turn is running with retained provisional bytes. */
const liveTurn = (): PresentationEventReducer => reducer(
    event('turn.preflight', 1), event('turn.invocation-started', 2), event('turn.provisional', 3, {index: 0, text: 'kept'})
);

const EVENT_ROWS: readonly Row<PresentationEventReducer>[] = Object.freeze([
    row('E1/P1 unknown event type', 'P1', 'CA22-04', 'ATTACHMENT_EVENT_INVALID', liveTurn, (live) => live.reduce({...event('lane.notification', 9, {label: 'l'}), type: 'turn.nope'})),
    row('E1/P1 extra envelope key', 'P1', 'CA22-04', 'ATTACHMENT_EVENT_INVALID', liveTurn, (live) => live.reduce({...event('lane.notification', 9, {label: 'l'}), extra: 1})),
    row('E1/P1 missing required detail key', 'P1', 'CA22-04', 'ATTACHMENT_DETAIL_INVALID', liveTurn, (live) => live.reduce(event('effect.preview', 9, {}))),
    row('E1/P1 unsupported detail key', 'P1', 'CA22-04', 'ATTACHMENT_DETAIL_INVALID', liveTurn, (live) => live.reduce(event('lane.notification', 9, {label: 'l', nope: 1}))),
    row('E1/P2 numeric confirmationId', 'P2', 'C2-04', 'ATTACHMENT_DETAIL_INVALID', liveTurn, (live) => live.reduce(event('effect.preview', 9, {confirmationId: 42}))),
    row('E1/P2 numeric title', 'P2', 'C2-04', 'ATTACHMENT_DETAIL_INVALID', liveTurn, (live) => live.reduce(event('effect.preview', 9, {confirmationId: 'c', title: 7}))),
    row('E1/P2 boolean reasonCode', 'P2', 'C2-04', 'ATTACHMENT_DETAIL_INVALID', liveTurn, (live) => live.reduce(event('effect.preview', 9, {confirmationId: 'c', reasonCode: true}))),
    row('E1/P2 empty-string confirmationId', 'P2', 'C2-04', 'ATTACHMENT_DETAIL_INVALID', liveTurn, (live) => live.reduce(event('effect.preview', 9, {confirmationId: ''}))),
    row('E1/P2 non-boolean stale flag', 'P2', 'C2-04', 'ATTACHMENT_DETAIL_INVALID', liveTurn, (live) => live.reduce(event('turn.validated', 9, {stale: 'yes'}))),
    row('E1/P2 non-integer chunk index', 'P2', 'C2-04', 'ATTACHMENT_DETAIL_INVALID', liveTurn, (live) => live.reduce(event('turn.provisional', 9, {index: 1.5, text: 'x'}))),
    row('E1/P2 non-finite number', 'P2', 'CA22-04', 'ATTACHMENT_DETAIL_INVALID', liveTurn, (live) => live.reduce(event('turn.stale', 9, {changedRevision: Number.NaN}))),
    row('E1/P3 foreign lane', 'P3', 'CA22-03', 'ATTACHMENT_IDENTITY_MISMATCH', liveTurn, (live) => live.reduce({...event('lane.notification', 9, {label: 'l'}), laneId: 'lane-2'})),
    row('E1/P3 foreign operator session', 'P3', 'CA22-03', 'ATTACHMENT_IDENTITY_MISMATCH', liveTurn, (live) => live.reduce({...event('lane.notification', 9, {label: 'l'}), operatorSessionId: 'session-2'})),
    row('E1/P3 turn-scoped event with null turn', 'P3', 'CA22-04', 'ATTACHMENT_EVENT_INVALID', liveTurn, (live) => live.reduce(event('turn.provisional', 9, {index: 0, text: 'x'}, 9, null))),
    row('E1/P4 cross-turn provisional', 'P4', 'C2-02', 'ATTACHMENT_IDENTITY_MISMATCH', liveTurn, (live) => live.reduce(event('turn.provisional', 9, {index: 1, text: 'foreign'}, 9, 'turn-2'))),
    row('E1/P4 cross-turn settlement', 'P4', 'C2-02', 'ATTACHMENT_IDENTITY_MISMATCH', liveTurn, (live) => live.reduce(event('turn.validated', 9, {}, 9, 'turn-2'))),
    row('E1/P4 second turn while one is live', 'P4', 'C2-02', 'TURN_STREAM_STATE_INVALID', liveTurn, (live) => live.reduce(event('turn.preflight', 9, {}, 9, 'turn-2'))),
    row('E1/P4 illegal stream transition', 'P4', 'CA22-04', 'TURN_STREAM_STATE_INVALID',
        () => reducer(event('turn.preflight', 1), event('turn.validated', 2)), (live) => live.reduce(event('turn.provisional', 9, {index: 0, text: 'late'}))),
    row('E1/P5 over-deep detail', 'P5', 'CA22-04', 'ATTACHMENT_DETAIL_LIMIT_EXCEEDED', liveTurn, (live) => live.reduce(event('turn.validated', 9, {usage: {a: {b: {c: {d: 1}}}}}))),
    row('E1/P5 over-long detail string', 'P5', 'CA22-04', 'ATTACHMENT_DETAIL_LIMIT_EXCEEDED', liveTurn, (live) => live.reduce(event('lane.notification', 9, {label: 'x'.repeat(5000)}))),
    row('E1/P7 replayed sequence', 'P7', 'CA22-03', 'ATTACHMENT_EVENT_REPLAYED', liveTurn, (live) => live.reduce(event('lane.notification', 3, {label: 'replay'})))
]);
function row(id: string, phase: string, lineage: string, reason: AttachmentReason, seed: () => PresentationEventReducer, offend: (live: PresentationEventReducer) => unknown): Row<PresentationEventReducer> {
    return Object.freeze({id, phase, lineage, reason, seed, offend, snapshot: reducerSnapshot, witness: (live: PresentationEventReducer) => witnessOf(live, ['reduce'])});
}

const accumulatorSnapshot = (stream: ProvisionalTurnAccumulator): unknown => ({view: stream.view(), state: stream.current()});
function seededAccumulator(): ProvisionalTurnAccumulator {
    const stream = new ProvisionalTurnAccumulator({turnId: 'turn-1', sanitizer});
    stream.append({turnId: 'turn-1', index: 0, text: 'kept', bytes: 4});
    return stream;
}
const CHUNK_ROWS: readonly Row<ProvisionalTurnAccumulator>[] = Object.freeze([
    chunkRow('E2/P1 extra chunk key', 'P1', 'CA22-02', 'TURN_STREAM_CHUNK_INVALID', (stream) => stream.append({turnId: 'turn-1', index: 1, text: 'x', bytes: 1, extra: true})),
    chunkRow('E2/P2 mis-counted bytes', 'P2', 'CA22-02', 'TURN_STREAM_CHUNK_INVALID', (stream) => stream.append({turnId: 'turn-1', index: 1, text: 'xy', bytes: 1})),
    chunkRow('E2/P3 foreign turn', 'P3', 'C2-02', 'TURN_STREAM_CHUNK_INVALID', (stream) => stream.append({turnId: 'turn-2', index: 1, text: 'x', bytes: 1})),
    chunkRow('E2/P5 over-limit usage on validate', 'P5', 'CA22-04', 'ATTACHMENT_DETAIL_LIMIT_EXCEEDED', (stream) => stream.validate({turnId: 'turn-1', text: 'x', stale: false, revision: 1, usage: {t: 'x'.repeat(5000)}})),
    chunkRow('E2/P7 conflicting replayed index', 'P7', 'CA22-02', 'TURN_STREAM_CHUNK_INVALID', (stream) => stream.append({turnId: 'turn-1', index: 0, text: 'different', bytes: 9})),
    Object.freeze({
        id: 'E2/P4 append after terminal', phase: 'P4', lineage: 'CA22-02', reason: 'TURN_STREAM_STATE_INVALID' as AttachmentReason,
        seed: (): ProvisionalTurnAccumulator => { const stream = seededAccumulator(); stream.interrupt('done'); return stream; },
        offend: (stream: ProvisionalTurnAccumulator): unknown => stream.append({turnId: 'turn-1', index: 1, text: 'x', bytes: 1}),
        snapshot: accumulatorSnapshot, witness: accumulatorWitness
    }),
    Object.freeze({
        id: 'E2/P7 double termination', phase: 'P7', lineage: 'CA22-02', reason: 'TURN_STREAM_STATE_INVALID' as AttachmentReason,
        seed: (): ProvisionalTurnAccumulator => { const stream = seededAccumulator(); stream.interrupt('one'); return stream; },
        offend: (stream: ProvisionalTurnAccumulator): unknown => stream.interrupt('two'),
        snapshot: accumulatorSnapshot, witness: accumulatorWitness
    })
]);
function chunkRow(id: string, phase: string, lineage: string, reason: AttachmentReason, offend: (stream: ProvisionalTurnAccumulator) => unknown): Row<ProvisionalTurnAccumulator> {
    return Object.freeze({id, phase, lineage, reason, seed: seededAccumulator, offend, snapshot: accumulatorSnapshot, witness: accumulatorWitness});
}
function accumulatorWitness(stream: ProvisionalTurnAccumulator): () => number { return witnessOf(stream, ['append', 'validate', 'interrupt', 'fail']); }

/** A port whose canned answers are swapped per row; counters prove no durable call escaped a refusal. */
class CountingPort {
    admits = 0; waits = 0; opens = 0;
    constructor(readonly answers: {open?: unknown; admit?: unknown; wait?: unknown} = {}) {}
    async open(): Promise<unknown> { this.opens += 1; return this.answers.open ?? opened; }
    async admit(): Promise<unknown> { this.admits += 1; return this.answers.admit ?? admitted; }
    async awaitTurn(): Promise<unknown> { this.waits += 1; return this.answers.wait ?? durable; }
}
interface ControllerTarget { readonly controller: TuiAttachmentController; readonly port: CountingPort; }
/**
 * Local retained state only. Port counters are deliberately excluded: several
 * rows refuse the *answer* to a durable read that legitimately happened, so
 * counting the call as mutation would conflate "no local state changed" with
 * "no durable read occurred". The latter is asserted separately, for exactly
 * the rows that must refuse before reaching the port.
 */
const controllerSnapshot = (target: ControllerTarget): unknown =>
    ({state: target.controller.current(), owner: target.controller.activeTurnOwner()});
async function seededController(answers: {open?: unknown; admit?: unknown; wait?: unknown} = {}, submitFirst = false): Promise<ControllerTarget> {
    const port = new CountingPort(answers);
    const controller = new TuiAttachmentController({port});
    await controller.start(binding, signal());
    if (submitFirst) await controller.submit(request);
    port.admits = 0;
    port.waits = 0;
    return {controller, port};
}
const PORT_ROWS: readonly Row<ControllerTarget>[] = Object.freeze([
    portRow('E3/P3 admitted for foreign lane', 'P3', 'CA22-03', 'ATTACHMENT_IDENTITY_MISMATCH', {admit: {...admitted, laneId: 'lane-2'}}, (target) => target.controller.submit(request)),
    portRow('E3/P3 admitted for foreign attachment', 'P3', 'CA22-03', 'ATTACHMENT_IDENTITY_MISMATCH', {admit: {...admitted, attachmentId: 'attach-9'}}, (target) => target.controller.submit(request)),
    portRow('E3/P3 owner names this attachment', 'P3', 'CA22-03', 'ATTACHMENT_IDENTITY_MISMATCH', {admit: {kind: 'waiting', holdsLock: false, owner: owner('attach-1')}}, (target) => target.controller.submit(request)),
    portRow('E3/P4 waiting admission claims a lock', 'P4', 'CA22-03', 'ATTACHMENT_STATE_INVALID', {admit: {kind: 'waiting', holdsLock: true, owner: owner('attach-2')}}, (target) => target.controller.submit(request)),
    portRow('E3/P4 unauthorized wait', 'P4', 'CA22-03', 'ATTACHMENT_WAIT_UNAUTHORIZED', {}, (target) => target.controller.wait('turn-unrelated', signal())),
    portRow('E3/P5 over-limit turn request', 'P5', 'CA22-03', 'ATTACHMENT_STATE_INVALID', {}, (target) => target.controller.submit({...request, text: 'x'.repeat(40000), bytes: utf8('x'.repeat(40000))})),
    Object.freeze({
        id: 'E3/P3 durable result for foreign session', phase: 'P3', lineage: 'CA22-03', reason: 'ATTACHMENT_IDENTITY_MISMATCH' as AttachmentReason,
        seed: (): Promise<ControllerTarget> => seededController({wait: {...durable, operatorSessionId: 'session-2'}}, true),
        offend: (target: ControllerTarget): unknown => target.controller.wait('turn-1', signal()),
        snapshot: controllerSnapshot, witness: controllerWitness
    }),
    Object.freeze({
        id: 'E3/P7 wait replayed after consumption', phase: 'P7', lineage: 'C2-02', reason: 'ATTACHMENT_WAIT_UNAUTHORIZED' as AttachmentReason,
        seed: async (): Promise<ControllerTarget> => {
            const target = await seededController({}, true);
            await target.controller.wait('turn-1', signal());
            target.port.waits = 0;
            return target;
        },
        offend: (target: ControllerTarget): unknown => target.controller.wait('turn-1', signal()),
        snapshot: controllerSnapshot, witness: controllerWitness
    })
]);
function portRow(id: string, phase: string, lineage: string, reason: AttachmentReason, answers: {open?: unknown; admit?: unknown; wait?: unknown}, offend: (target: ControllerTarget) => unknown): Row<ControllerTarget> {
    return Object.freeze({id, phase, lineage, reason, seed: () => seededController(answers), offend, snapshot: controllerSnapshot, witness: controllerWitness});
}
function controllerWitness(target: ControllerTarget): () => number { return witnessOf(target.controller, ['submit', 'wait', 'start']); }

/** Rows whose refusal must land before any durable call, so the port is never reached at all. */
const PRE_DURABLE_ROWS: readonly {readonly id: string; readonly offend: (target: ControllerTarget) => unknown}[] = Object.freeze([
    {id: 'E3/P4 unauthorized wait', offend: (target) => target.controller.wait('turn-unrelated', signal())},
    {id: 'E3/P5 over-limit turn request', offend: (target) => target.controller.submit({...request, text: 'x'.repeat(40000), bytes: utf8('x'.repeat(40000))})},
    {id: 'E3/P3 request for another attachment', offend: (target) => target.controller.submit({...request, binding: {...binding, attachmentId: 'attach-9'}})}
]);

interface RefreshTarget { readonly refresher: NotificationRefreshController; reply: (cp: DurableCheckpoint) => unknown; }
const refreshSnapshot = (target: RefreshTarget): unknown =>
    ({queued: target.refresher.queued(), current: target.refresher.current(), pending: target.refresher.pendingCheckpoint()});
/**
 * Seeds a refresher with one successful page so the unchanged-state assertion
 * has real retained state to protect, then swaps in the offending reply.
 */
async function seededRefresher(offending: (cp: DurableCheckpoint) => unknown): Promise<RefreshTarget> {
    const target: RefreshTarget = {
        refresher: null as unknown as NotificationRefreshController,
        reply: (cp) => page(cp, {items: [{eventId: 'seed', sequence: 1, label: 'seed', type: 'lane.notification'}]})
    };
    const mutable = target as {refresher: NotificationRefreshController; reply: (cp: DurableCheckpoint) => unknown};
    mutable.refresher = new NotificationRefreshController({
        laneId: 'lane-1', operatorSessionId: 'session-1', port: {poll: async (cp: DurableCheckpoint) => target.reply(cp)}
    });
    await mutable.refresher.refresh(checkpoint(2), signal());
    mutable.reply = offending;
    return target;
}
const PAGE_ROWS: readonly Row<RefreshTarget>[] = Object.freeze([
    pageRow('E4/P1 page missing key', 'P1', 'CA22-05', 'ATTACHMENT_PAGE_INVALID', (cp) => ({laneId: 'lane-1', checkpoint: cp, items: []}), 3),
    pageRow('E4/P1 item outside vocabulary', 'P1', 'CA22-05', 'ATTACHMENT_PAGE_INVALID', (cp) => page(cp, {items: [{eventId: 'e', sequence: 1, label: 'l', type: 'not.an.event'}]}), 3),
    pageRow('E4/P3 foreign lane page', 'P3', 'CA22-05', 'ATTACHMENT_IDENTITY_MISMATCH', (cp) => page(cp, {laneId: 'lane-2'}), 3),
    pageRow('E4/P3 foreign session page', 'P3', 'CA22-05', 'ATTACHMENT_IDENTITY_MISMATCH', (cp) => page(cp, {operatorSessionId: 'session-2'}), 3),
    pageRow('E4/P4 regressed page checkpoint', 'P4', 'CA22-05', 'ATTACHMENT_CHECKPOINT_REGRESSED', () => page(checkpoint(2)), 5),
    pageRow('E4/P5 oversized page', 'P5', 'CA22-05', 'ATTACHMENT_QUEUE_OVERFLOW',
        (cp) => page(cp, {items: new Array(300).fill(0).map((_, index) => ({eventId: `e${index}`, sequence: index, label: 'l', type: 'lane.notification'}))}), 3),
    pageRow('E4/P7 regressed retry after success', 'P7', 'CA22-05', 'ATTACHMENT_CHECKPOINT_REGRESSED', (cp) => page(cp), 1)
]);
function pageRow(id: string, phase: string, lineage: string, reason: AttachmentReason, offending: (cp: DurableCheckpoint) => unknown, requested: number): Row<RefreshTarget> {
    return Object.freeze({
        id, phase, lineage, reason,
        seed: () => seededRefresher(offending),
        offend: (target: RefreshTarget) => target.refresher.refresh(checkpoint(requested), signal()),
        snapshot: refreshSnapshot, witness: (target: RefreshTarget) => witnessOf(target.refresher, ['refresh'])
    });
}

const ALL_ROWS: readonly Row<unknown>[] = Object.freeze([
    ...EVENT_ROWS, ...CHUNK_ROWS, ...PORT_ROWS, ...PAGE_ROWS
] as readonly Row<unknown>[]);

describe('CA-22 consolidated adversarial matrix — typed refusal', () => {
    for (const entry of ALL_ROWS) {
        it(`${entry.id} (${entry.phase}, ${entry.lineage}) fails closed with ${entry.reason}`, async () => {
            const target = await entry.seed();
            let thrown: unknown = null;
            try { await entry.offend(target); } catch (error) { thrown = error; }
            expect(thrown instanceof AttachmentError)
                .withContext(`${entry.id} threw ${thrown === null ? 'nothing' : String(thrown)}`).toBeTrue();
            expect((thrown as AttachmentError).reason).toBe(entry.reason);
        });
    }
});

describe('CA-22 consolidated adversarial matrix — retained state unchanged', () => {
    for (const entry of ALL_ROWS) {
        it(`${entry.id} leaves the seeded object byte-identical`, async () => {
            const target = await entry.seed();
            const before = entry.snapshot(target);
            expect(before).withContext(`${entry.id} seeded no retained state`).toBeDefined();
            const reached = entry.witness(target);
            try { await entry.offend(target); } catch { /* the refusal is the point; state must not move */ }
            expect(reached()).withContext(`${entry.id} never reached the seeded object`).toBeGreaterThan(0);
            expect(entry.snapshot(target)).withContext(`${entry.id} mutated retained state`).toEqual(before);
        });
    }

    it('performs no durable call when the refusal lands before the port', async () => {
        for (const entry of PRE_DURABLE_ROWS) {
            const target = await seededController();
            const before = controllerSnapshot(target);
            try { await entry.offend(target); } catch { /* expected */ }
            expect(target.port.admits).withContext(`${entry.id} reached admit`).toBe(0);
            expect(target.port.waits).withContext(`${entry.id} reached awaitTurn`).toBe(0);
            expect(controllerSnapshot(target)).withContext(`${entry.id} mutated local state`).toEqual(before);
        }
    });

    it('proves the harness is wired to the seeded object, not a fresh one', async () => {
        const live = liveTurn();
        const before = live.current();
        expect(before.provisional?.text).toBe('kept');
        expect(() => live.reduce(event('turn.provisional', 9, {index: 1, text: 'foreign'}, 9, 'turn-2'))).toThrowError(AttachmentError);
        expect(live.current()).toBe(before);
        live.reduce(event('turn.provisional', 9, {index: 1, text: ' continues'}));
        expect(live.current()).not.toBe(before);
        expect(live.current().provisional?.text).toBe('kept continues');
    });
});
