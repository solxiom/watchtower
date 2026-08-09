/**
 * Fixtures for the CA-25 mutating coordinator command boundary.
 *
 * Proposals and validation contexts are CA-09's accepted fixtures, reused
 * rather than rebuilt, so no spec here can admit a proposal the sole validator
 * would reject. Capsules are written as real JSON bytes into a real temporary
 * lane directory, because "the command reads durable authority it did not
 * author" is a property of files, not of an injected object.
 */
import {mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {dirname, join, relative} from 'node:path';
import type {DecisionProposal, LaneTaskInvocation, LaneTaskRunResult} from '../../../../src/contracts/index.js';
import type {
    CoordinatorAuthorization, CoordinatorMutationOperation, CoordinatorMutationRequest
} from '../../../../src/contracts/coordinatorMutation.js';
import type {EffectTaskRunner} from '../../../../src/foundation/effect/effectPorts.js';
import type {ValidationContext} from '../../../../src/foundation/proposal/proposalValidatorContracts.js';
import {capsuleRelativePath} from '../../../../src/foundation/lane/coordinator/mutation/coordinatorAuthorizationCapsule.js';
import {baseContext, fixtureFor, proposalFor, NOW} from '../../proposal/support/proposalFixtures.js';
import {runtimeContext} from '../../effect/support/effectFixtures.js';

export function makeLaneDir(): string {
    return mkdtempSync(join(tmpdir(), 'wt-ca25-'));
}

export function removeLaneDir(laneDir: string): void {
    rmSync(laneDir, {recursive: true, force: true});
}

/** Every file under `laneDir` with its content digest — the dry-run purity witness. */
export function laneDigest(laneDir: string): readonly string[] {
    const entries: string[] = [];
    for (const name of readdirSync(laneDir, {recursive: true, encoding: 'utf8'})) {
        const path = join(laneDir, name);
        if (!statSync(path).isFile()) continue;
        entries.push(`${relative(laneDir, path)}:${createHash('sha256').update(readFileSync(path)).digest('hex')}`);
    }
    return entries.sort();
}

/** The `place-hold` proposal, its operator-confirmed context, and matching wire bytes. */
export function placeHoldFixture(): {readonly wire: unknown; readonly proposal: DecisionProposal; readonly state: ValidationContext} {
    const fixture = fixtureFor('place-hold');
    const wire = proposalFor(fixture, {evidenceRefs: ['finding:F1', 'event:trigger-1']});
    const base = baseContext({origin: fixture.origin, decisionClass: fixture.decisionClass, ...fixture.contextOverrides});
    // The trigger the operator names must already be authorized evidence in the
    // envelope; CA-09 refuses anything else as evidence drift.
    const state = baseContext({
        origin: fixture.origin, decisionClass: fixture.decisionClass, ...fixture.contextOverrides,
        envelope: {...base.envelope, evidenceRefs: ['finding:F1', 'event:trigger-1']}
    });
    return {wire, proposal: wire, state};
}

export function escalateFixture(): {readonly wire: unknown; readonly state: ValidationContext} {
    const fixture = fixtureFor('escalate');
    return {
        wire: proposalFor(fixture),
        state: baseContext({origin: fixture.origin, decisionClass: fixture.decisionClass})
    };
}

export function resolutionProposeFixture(): {readonly wire: unknown; readonly state: ValidationContext} {
    const fixture = fixtureFor('propose-specification-resolution');
    return {
        wire: proposalFor(fixture),
        state: baseContext({origin: fixture.origin, decisionClass: fixture.decisionClass})
    };
}

export function authorizationFor(wire: unknown, state: ValidationContext): CoordinatorAuthorization {
    return {proposal: wire, currentState: state, revalidate: () => ({proposal: wire, state})};
}

export function requestFor(
    laneDir: string, operation: CoordinatorMutationOperation, authorization: CoordinatorAuthorization | undefined,
    overrides: Partial<CoordinatorMutationRequest> = {}
): CoordinatorMutationRequest {
    return {
        context: runtimeContext(laneDir), operation, subject: '', dryRun: false,
        ...(authorization === undefined ? {} : {authorization}), ...overrides
    };
}

/** The JSON bytes a coordinator writes into `coordinator/authorizations/<operation>.json`. */
export function writeCapsule(laneDir: string, operation: CoordinatorMutationOperation, wire: unknown, state: ValidationContext): string {
    const path = join(laneDir, capsuleRelativePath(operation));
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, `${JSON.stringify({schemaVersion: 1, proposal: wire, currentState: serializeState(state)}, null, 2)}\n`, 'utf8');
    return path;
}

export function writeRawCapsule(laneDir: string, operation: CoordinatorMutationOperation, text: string): string {
    const path = join(laneDir, capsuleRelativePath(operation));
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, text, 'utf8');
    return path;
}

/** Sets are wire-encoded as arrays; every other member is already JSON. */
export function serializeState(state: ValidationContext): Record<string, unknown> {
    return {
        ...state,
        journalState: {completedIdempotencyKeys: [...state.journalState.completedIdempotencyKeys]},
        operatorSession: state.operatorSession === undefined ? null : {
            sessionId: state.operatorSession.sessionId, role: state.operatorSession.role,
            confirmedProposalIds: [...state.operatorSession.confirmedProposalIds]
        },
        packAuthorSessionId: state.packAuthorSessionId ?? null,
        predecessorAcceptanceRecords: [...state.predecessorAcceptanceRecords]
    };
}

export function countingRunner(result: LaneTaskRunResult): EffectTaskRunner & {readonly invocations: LaneTaskInvocation[]} {
    const invocations: LaneTaskInvocation[] = [];
    return {
        invocations,
        async run(invocation: LaneTaskInvocation): Promise<LaneTaskRunResult> {
            invocations.push(invocation);
            return result;
        }
    };
}

export function completedRun(actionId: string, taskId: string, targetIds: readonly string[]): LaneTaskRunResult {
    return {
        outcome: 'completed', actionId, taskId, runId: 'run-1', startedAt: NOW, finishedAt: NOW, events: [],
        result: {applied: true, changed: [...targetIds], unchanged: [], warnings: []}
    };
}
