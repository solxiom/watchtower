/**
 * The invocation-envelope contract, proved end to end across its two owners.
 *
 * CA-10 writes the envelope; RT-05's accepted
 * `task/runtime/laneInvocationEnvelope.ts` validates it before spawning a task.
 * A unit test of either half alone would pass while the halves disagreed, so
 * these specs feed CA-10's real artifact to RT-05's real validator through the
 * real `nodeRuntimeFileSystem`. If a member, a mode, a digest convention, or the
 * consumption receipt ever drifts, this fails.
 */
import {chmodSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {
    buildEnvelopeDocument, consumeInvocationEnvelope, envelopePath, writeInvocationEnvelope
} from '../../../src/foundation/effect/invocationEnvelopeWriter.js';
import {nodeEffectFileSystem} from '../../../src/foundation/effect/nodeEffectFileSystem.js';
import {planEffect} from '../../../src/foundation/effect/effectPlanner.js';
import {requireInvocationEnvelope} from '../../../src/foundation/task/runtime/laneInvocationEnvelope.js';
import {nodeRuntimeFileSystem} from '../../../src/foundation/task/runtime/runtimeFileSystem.js';
import {LaneTaskRuntimeError} from '../../../src/contracts/index.js';
import {EffectExecutionError} from '../../../src/contracts/effects.js';
import {bindingFor, fixedClock, makeLaneDir, removeLaneDir, RUNTIME_TARGET, scenario} from './support/effectFixtures.js';

const CLOCK = fixedClock();
const INSIDE_WINDOW = new Date('2026-08-06T12:01:00.000Z');
const AFTER_WINDOW = new Date('2026-08-06T13:00:00.000Z');

describe('invocation envelope — CA-10 writer accepted by the RT-05 reader', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    function write(laneDirectory: string) {
        const base = scenario(laneDirectory);
        const plan = planEffect({
            proposal: base.proposal, validation: base.validation, currentState: base.context,
            cycleId: 'cycle-1', parameters: {batchId: 'B1'}, binding: base.binding
        });
        const written = writeInvocationEnvelope(
            {laneDir: laneDirectory, plan, binding: base.binding, target: RUNTIME_TARGET, lockId: 'lock-1', laneLockHeld: true},
            {files: nodeEffectFileSystem, clock: CLOCK}
        );
        return {plan, written, binding: base.binding};
    }

    function check(laneDirectory: string, binding = bindingFor('dispatch-batch'), now = INSIDE_WINDOW) {
        return {
            laneDir: laneDirectory, laneId: 'lane-1', binding, target: RUNTIME_TARGET,
            files: nodeRuntimeFileSystem, now
        };
    }

    it('produces an envelope the RT-05 validator accepts and returns by canonical path', function () {
        const {written} = write(laneDir);
        expect(requireInvocationEnvelope(written.path, check(laneDir))).toBe(written.path);
    });

    it('writes the envelope operator-owned and mode 0600', function () {
        const {written} = write(laneDir);
        expect(statSync(written.path).mode & 0o7777).toBe(0o600);
        expect(statSync(written.path).uid).toBe(nodeEffectFileSystem.uid());
    });

    it('binds the envelope to its own bytes, so an edited member fails the reader', function () {
        const {written} = write(laneDir);
        const document = JSON.parse(readFileSync(written.path, 'utf8'));
        writeFileSync(written.path, JSON.stringify({...document, taskId: 'wt:effect:other'}));
        chmodSync(written.path, 0o600);
        expect(() => requireInvocationEnvelope(written.path, check(laneDir)))
            .toThrowMatching((error) => error instanceof LaneTaskRuntimeError
                && error.reason === 'TASK_RUNTIME_ENVELOPE_CHECKSUM_MISMATCH');
    });

    it('addresses exactly one action, task, schema, and handler', function () {
        const {written} = write(laneDir);
        const other = bindingFor('dispatch-batch', {handlerId: 'ForeignTaskHandler'});
        expect(() => requireInvocationEnvelope(written.path, check(laneDir, other)))
            .toThrowMatching((error) => error instanceof LaneTaskRuntimeError
                && error.reason === 'TASK_RUNTIME_ENVELOPE_TASK_MISMATCH');
    });

    it('expires: the reader refuses the same envelope outside its validity window', function () {
        const {written} = write(laneDir);
        expect(() => requireInvocationEnvelope(written.path, check(laneDir, bindingFor('dispatch-batch'), AFTER_WINDOW)))
            .toThrowMatching((error) => error instanceof LaneTaskRuntimeError
                && error.reason === 'TASK_RUNTIME_ENVELOPE_EXPIRED');
    });

    it('spends single use: after consumption the reader refuses even a restored envelope', function () {
        const {written} = write(laneDir);
        const bytes = readFileSync(written.path, 'utf8');
        consumeInvocationEnvelope(written.path, nodeEffectFileSystem, CLOCK);
        writeFileSync(written.path, bytes, {mode: 0o600});
        chmodSync(written.path, 0o600);
        expect(() => requireInvocationEnvelope(written.path, check(laneDir)))
            .toThrowMatching((error) => error instanceof LaneTaskRuntimeError
                && error.reason === 'TASK_RUNTIME_ENVELOPE_CONSUMED');
    });

    it('refuses to write a second envelope for an already-consumed idempotency key', function () {
        const {plan, binding} = write(laneDir);
        consumeInvocationEnvelope(envelopePath(laneDir, plan), nodeEffectFileSystem, CLOCK);
        expect(() => writeInvocationEnvelope(
            {laneDir, plan, binding, target: RUNTIME_TARGET, lockId: 'lock-2', laneLockHeld: false},
            {files: nodeEffectFileSystem, clock: CLOCK}
        )).toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'COORDINATOR_EFFECT_CONFLICT');
    });

    it('refuses a concurrent writer that finds the envelope path already taken', function () {
        const {plan, binding} = write(laneDir);
        expect(() => writeInvocationEnvelope(
            {laneDir, plan, binding, target: RUNTIME_TARGET, lockId: 'lock-2', laneLockHeld: false},
            {files: nodeEffectFileSystem, clock: CLOCK}
        )).toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'COORDINATOR_EFFECT_CONFLICT');
    });

    it('keeps the envelope inside the lane overlay', function () {
        const {plan} = write(laneDir);
        expect(envelopePath(laneDir, plan).startsWith(join(laneDir, 'coordinator', 'effects'))).toBeTrue();
    });

    it('carries exactly the members the mutation-invocation protocol enumerates', function () {
        const base = scenario(laneDir);
        const plan = planEffect({
            proposal: base.proposal, validation: base.validation, currentState: base.context,
            cycleId: 'cycle-1', parameters: {batchId: 'B1'}, binding: base.binding
        });
        const document = buildEnvelopeDocument(
            {laneDir, plan, binding: base.binding, target: RUNTIME_TARGET, lockId: 'lock-1', laneLockHeld: true}, CLOCK
        );
        expect(Object.keys(document).sort()).toEqual([
            'actionId', 'catalogId', 'catalogSha256', 'checksum', 'consumer', 'createdAt', 'expiresAt',
            'idempotencyKey', 'inputSchema', 'journalDestination', 'laneId', 'lockId', 'parameters',
            'preconditionDigest', 'resultDestination', 'schemaVersion', 'taskId'
        ]);
        expect(document.consumer).toEqual({handlerId: base.binding.handlerId, singleUse: true});
    });
});
