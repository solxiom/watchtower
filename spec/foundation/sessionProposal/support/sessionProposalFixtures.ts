/**
 * Shared fixture builders for the CA-26 session-proposal bridge specs.
 *
 * These run against a **real** temporary lane directory and the real
 * `nodeEffectFileSystem`, because the properties under test are properties of
 * durable bytes: an exclusive create that refuses a duplicate, an atomic
 * replace a concurrent reader cannot catch half-written, and a refusal that
 * leaves the effect journal byte-for-byte absent.
 *
 * Every collaborator is the accepted owner, never a stand-in that would prove
 * nothing: CA-09's real `ProposalValidator`, CA-10's real `EffectExecutor`, and
 * CA-09's accepted proposal fixtures — including their **origin and decision
 * class**, which is why a per-category scenario can never quietly assume an
 * origin the accepted matrix does not permit. The one instrumented seam is the
 * task runner, which counts invocations — that count *is* the sole-executor
 * proof.
 */
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {
    LaneTaskInvocation, ProposalType, SessionProposalDocument, SessionProposalType
} from '../../../../src/contracts/index.js';
import type {SessionJournalEntry, SessionMetadataEventType, SessionMetadataPayload} from '../../../../src/contracts/operatorSession.js';
import {EffectExecutor, nodeEffectFileSystem, type EffectExecutorDeps} from '../../../../src/foundation/effect/index.js';
import {ProposalValidator, validateProposalShape, type ValidationContext} from '../../../../src/foundation/proposal/index.js';
import {extractTargetIds} from '../../../../src/foundation/proposal/proposalPreconditions.js';
import {
    requiredCoordinatorType, SessionProposalService, SessionProposalStore, type SessionProposalServiceDeps
} from '../../../../src/foundation/lane/coordinator/sessionProposal/index.js';
import {baseContext, fixtureFor, proposalFor, FUTURE, NOW} from '../../proposal/support/proposalFixtures.js';
import {applyingRunner, bindingFor, countingIds, fixedClock, resolverFor, runtimeContext, RUNTIME_TARGET} from '../../effect/support/effectFixtures.js';

export const OPERATOR_SESSION_ID = 'opsess-ca26';
export const LANE_ID = 'lane-1';

/** Every session category whose §15.2 confirmation routes to a real effect. */
export const EFFECT_BEARING_CATEGORIES: readonly SessionProposalType[] = Object.freeze([
    'hold-place', 'hold-release', 'dispatch-pause', 'dispatch-resume', 'candidate-select',
    'routing-override', 'budget-override', 'amendment-request', 'correction-supersede'
]);

export function makeLaneDir(): string {
    return mkdtempSync(join(tmpdir(), 'wt-ca26-'));
}

export function removeLaneDir(laneDir: string): void {
    rmSync(laneDir, {recursive: true, force: true});
}

/** Records every appended session-journal event so a spec can prove what was published, and when. */
export class RecordingSessionJournal {
    /** Payloads are captured as plain records: a spec asserts on one field, not on the recursive JSON union. */
    readonly events: {readonly type: SessionMetadataEventType; readonly payload: Readonly<Record<string, unknown>>}[] = [];
    private failures = 0;

    /** Fail the next `count` appends — an unavailable journal, exactly as a full disk or a lock would present. */
    failNext(count = 1): void { this.failures = count; }

    appendEvent(sessionId: string, type: SessionMetadataEventType, payload: SessionMetadataPayload): SessionJournalEntry {
        if (this.failures > 0) { this.failures -= 1; throw new Error('journal append failed'); }
        this.events.push({type, payload});
        return {
            schemaVersion: 1, eventId: `evt-${this.events.length}`, sequence: this.events.length, type, at: NOW,
            laneId: LANE_ID, operatorSessionId: sessionId, producer: 'spec', correlationId: 'corr-1',
            causationId: null, policyVersion: 'shipping-v1', payload: {...payload}
        };
    }
}

/** A mutable current-state projection: specs move the world between calls exactly as a real lane would. */
export class MutableCurrentState {
    reads = 0;

    constructor(private context: ValidationContext) {}

    read(): ValidationContext { this.reads += 1; return this.context; }

    set(context: ValidationContext): void { this.context = context; }

    get(): ValidationContext { return this.context; }
}

export interface Scenario {
    readonly laneDir: string;
    readonly service: SessionProposalService;
    readonly store: SessionProposalStore;
    readonly journal: RecordingSessionJournal;
    readonly state: MutableCurrentState;
    readonly runner: ReturnType<typeof applyingRunner>;
    readonly proposalId: string;
    readonly wire: Record<string, unknown>;
    readonly sessionType: SessionProposalType;
    readonly coordinatorType: ProposalType;
    readonly effect: string;
    readonly applyRequest: {
        readonly operatorSessionId: string; readonly proposalId: string; readonly cycleId: string;
        readonly parameters: {readonly [field: string]: string}; readonly runtimeContext: ReturnType<typeof runtimeContext>;
    };
}

export interface ScenarioOverrides {
    readonly contextOverrides?: Partial<ValidationContext>;
    readonly category?: SessionProposalType;
}

/**
 * One fully wired scenario for a session category, defaulting to
 * `candidate-select` → `select-ready-batch` → `dispatch-batch`.
 *
 * Origin, decision class, and the collaborating current state all come from
 * CA-09's accepted fixture for the mapped coordinator type, so a category is
 * exercised under exactly the authority the accepted matrix grants it — never
 * under an origin this bridge invented. The operator session is present in
 * current state but confirms nothing: every spec that needs a confirmation must
 * go through `service.confirm`.
 */
export function scenario(laneDir: string, overrides: ScenarioOverrides = {}): Scenario {
    const sessionType = overrides.category ?? 'candidate-select';
    const coordinatorType = requiredCoordinatorType(sessionType);
    if (coordinatorType === null) throw new Error(`"${sessionType}" is not an effect-bearing category`);
    const fixture = fixtureFor(coordinatorType);
    const wire = proposalFor(fixture) as unknown as Record<string, unknown>;
    const effect = fixture.effects[0]?.effect ?? '';
    const state = new MutableCurrentState(baseContext({
        origin: fixture.origin, decisionClass: fixture.decisionClass, ...fixture.contextOverrides,
        operatorSession: {sessionId: OPERATOR_SESSION_ID, role: 'operator', confirmedProposalIds: new Set<string>()},
        ...overrides.contextOverrides
    }));
    const binding = bindingFor(effect as Parameters<typeof bindingFor>[0]);
    const runner = applyingRunner({
        actionId: binding.actionId, taskId: binding.taskId,
        targetIds: extractTargetIds(validateProposalShape(wire))
    });
    const executorDeps: EffectExecutorDeps = {
        files: nodeEffectFileSystem, clock: fixedClock(), ids: countingIds(), runner,
        actions: resolverFor(binding), target: RUNTIME_TARGET
    };
    const store = new SessionProposalStore(laneDir, nodeEffectFileSystem);
    const journal = new RecordingSessionJournal();
    const deps: SessionProposalServiceDeps = {
        laneDir, store, validator: new ProposalValidator(), executor: new EffectExecutor(executorDeps),
        journal, state, clock: {now: () => NOW}
    };
    return {
        laneDir, service: new SessionProposalService(deps), store, journal, state, runner,
        proposalId: String(wire.proposalId), wire, sessionType, coordinatorType, effect,
        applyRequest: {
            operatorSessionId: OPERATOR_SESSION_ID, proposalId: String(wire.proposalId), cycleId: 'cycle-1',
            parameters: {}, runtimeContext: runtimeContext(laneDir)
        }
    };
}

/** Record the scenario's proposal in `proposed` state and fail loudly if that step itself refused. */
export function recorded(scene: Scenario, overrides: Record<string, unknown> = {}): void {
    const result = scene.service.record({
        operatorSessionId: OPERATOR_SESSION_ID, sourceTurnId: 'turn-0001',
        proposalType: scene.sessionType, proposal: {...scene.wire, ...overrides}
    });
    if (result.status !== 'recorded') throw new Error(`fixture could not record the proposal: ${result.reason} ${result.message}`);
}

/** Record then explicitly confirm, the only path that produces a durable confirmation. */
export function confirmed(scene: Scenario): void {
    recorded(scene);
    const result = scene.service.confirm({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, OPERATOR_SESSION_ID);
    if (result.status !== 'confirmed') throw new Error(`fixture could not confirm the proposal: ${result.reason} ${result.message}`);
}

/** The durable document as it now stands, or a loud failure — specs assert on bytes, not on a returned value. */
export function storedDocument(scene: Scenario): SessionProposalDocument {
    const read = scene.store.read(OPERATOR_SESSION_ID, scene.proposalId);
    if (read.kind !== 'document') throw new Error(`expected a stored document, got ${read.kind}`);
    return read.document;
}

export function invocationsOf(runner: {invocations: LaneTaskInvocation[]}): number {
    return runner.invocations.length;
}

export {FUTURE, NOW};
