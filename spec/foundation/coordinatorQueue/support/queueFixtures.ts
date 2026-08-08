/**
 * Shared fixture builders for the CA-13 queue, cursor, and replay specs.
 *
 * These run against a **real** temporary lane directory and the real
 * `nodeQueueFileSystem`, not an in-memory double. `queue.json` and
 * `cursor.json` are durability claims — staged create, `fsync`, atomic rename
 * — and a mocked port would prove control flow while saying nothing about the
 * bytes actually left on disk after a fault.
 *
 * The effect journal used by the cursor specs is written through CA-10's
 * accepted `appendEffectPhase`, never hand-assembled, so no spec can prove a
 * cursor advance against a journal shape the real executor would not produce.
 */
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {
    CoordinatorTrigger, ImpactScopedHold, TriggerClass
} from '../../../../src/contracts/coordinatorQueue.js';
import type {
    TriggerCandidate
} from '../../../../src/contracts/coordinatorReplay.js';
import type {DurableEvent, DurableEventPage} from '../../../../src/contracts/runtimeJournal.js';
import type {EffectPhase, EffectPlan} from '../../../../src/contracts/effects.js';
import {appendEffectPhase} from '../../../../src/foundation/effect/effectJournal.js';
import {nodeEffectFileSystem} from '../../../../src/foundation/effect/nodeEffectFileSystem.js';
import type {EffectFileSystem} from '../../../../src/foundation/effect/effectPorts.js';
import {nodeQueueFileSystem, queueFileSystemOver} from '../../../../src/foundation/lane/coordinator/queue/nodeQueueFileSystem.js';
import {nodeLaneMutationLock, type LaneMutationLock} from '../../../../src/foundation/lane/coordinator/queue/laneMutationLock.js';
import {CoordinatorQueue} from '../../../../src/foundation/lane/coordinator/queue/CoordinatorQueue.js';
import {CursorManager} from '../../../../src/foundation/lane/coordinator/queue/CursorManager.js';
import {effectEvidenceFromJournal} from '../../../../src/foundation/lane/coordinator/queue/effectEvidenceSource.js';
import type {
    CycleHistoryEntry, CycleHistorySource, QueueClock, QueueFileSystem, QueueIdFactory,
    TriggerClassification, TriggerClassifier, TriggerIngestSource, TriggerScanWindow
} from '../../../../src/foundation/lane/coordinator/queue/queuePorts.js';
import type {RuntimeEventReader} from '../../../../src/foundation/lane/coordinator/queue/coordinatorJournalSources.js';

export const LANE_ID = '11111111-2222-4333-8444-555555555555';
export const PACK_REVISION = 'pack-revision-1';
export const NOW = '2026-08-08T00:00:00.000Z';

export function makeLaneDir(): string {
    return mkdtempSync(join(tmpdir(), 'wt-ca13-'));
}

export function removeLaneDir(laneDir: string): void {
    rmSync(laneDir, {recursive: true, force: true});
}

export const files: QueueFileSystem = nodeQueueFileSystem;

/**
 * The **real** CA-10 lane lock over a real temp lane. Serialization is the claim
 * under test in the concurrency scenarios, so a no-op double would prove the
 * call happened and nothing about mutual exclusion.
 */
export function lockFor(laneDir: string): LaneMutationLock {
    return nodeLaneMutationLock(laneDir);
}

/** A queue bound to a real lane directory, its real durability adapter, and the real lane lock. */
export function queueFor(laneDir: string, overrides: {laneId?: string; maxQueueLength?: number} = {}): CoordinatorQueue {
    return new CoordinatorQueue({
        laneDir, laneId: overrides.laneId ?? LANE_ID, files, lock: lockFor(laneDir), clock: fixedClock(),
        maxQueueLength: overrides.maxQueueLength
    });
}

export function fixedClock(at = NOW): QueueClock {
    return {now: () => new Date(at)};
}

/** Deterministic identity so an ordering proof never depends on a random value. */
export function countingIds(prefix = 'gen'): QueueIdFactory {
    let triggers = 0, cycles = 0;
    return {
        nextTriggerId: () => `${prefix}-trigger-${++triggers}`,
        nextCycleId: () => `${prefix}-cycle-${++cycles}`
    };
}

export interface TriggerOverrides {
    readonly triggerId?: string;
    readonly cycleId?: string;
    readonly eventId?: string;
    readonly eventType?: string;
    readonly eventSequence?: number;
    readonly triggerClass?: TriggerClass;
    readonly decisionClass?: CoordinatorTrigger['decisionClass'];
    readonly batchId?: string | null;
    readonly correlationId?: string;
    readonly packRevision?: string;
    readonly enqueuedAt?: string;
    readonly priorUncertainCycleId?: string | null;
}

export function triggerFor(id: string, overrides: TriggerOverrides = {}): CoordinatorTrigger {
    return Object.freeze({
        priorUncertainCycleId: overrides.priorUncertainCycleId ?? null,
        schemaVersion: 1 as const,
        triggerId: overrides.triggerId ?? `trigger-${id}`,
        cycleId: overrides.cycleId ?? `cycle-${id}`,
        eventId: overrides.eventId ?? `event-${id}`,
        eventType: overrides.eventType ?? 'handoff',
        eventSequence: overrides.eventSequence ?? 0,
        triggerClass: overrides.triggerClass ?? 'routine-event',
        decisionClass: overrides.decisionClass ?? 'D2',
        batchId: overrides.batchId === undefined ? `CA-${id}` : overrides.batchId,
        laneId: LANE_ID,
        correlationId: overrides.correlationId ?? `correlation-${id}`,
        packRevision: overrides.packRevision ?? PACK_REVISION,
        enqueuedAt: overrides.enqueuedAt ?? NOW
    });
}

export function holdFor(blockerId: string, batchIds: readonly string[], scope: ImpactScopedHold['scope'] = 'impact-scoped'): ImpactScopedHold {
    return Object.freeze({blockerId, scope, batchIds: Object.freeze([...batchIds]), recordedAt: NOW});
}

export function candidateFor(id: string, overrides: Partial<TriggerCandidate> = {}): TriggerCandidate {
    return Object.freeze({
        eventId: `event-${id}`, sequence: 0, eventType: 'handoff',
        correlationId: `correlation-${id}`, batchId: `CA-${id}`, at: NOW, ...overrides
    });
}

/** A classifier that answers from a fixed table — CA-05 policy is never re-derived in a spec. */
export function classifierFor(table: Readonly<Record<string, TriggerClassification>>, fallback?: TriggerClassification): TriggerClassifier {
    return {
        classify(candidate) {
            const found = table[candidate.eventId] ?? fallback;
            if (found === undefined) throw new Error(`no classification fixture for ${candidate.eventId}`);
            return found;
        }
    };
}

export function classification(overrides: Partial<TriggerClassification> = {}): TriggerClassification {
    return Object.freeze({
        decisionClass: 'D2' as const, triggerClass: 'routine-event' as const, packRevision: PACK_REVISION, ...overrides
    });
}

export function ingestOf(candidates: readonly TriggerCandidate[], byteLength: number | null = null): TriggerIngestSource {
    return {
        async scan(window) {
            return {
                candidates: candidates.filter((candidate) => candidate.sequence >= window.fromSequence).slice(0, window.limit),
                byteLength
            };
        }
    };
}

/** Records the scan windows a poller presented, so a spec can assert the fence it carried. */
export function recordingIngest(candidates: readonly TriggerCandidate[]): TriggerIngestSource & {seen: TriggerScanWindow[]} {
    const seen: TriggerScanWindow[] = [];
    return {
        seen,
        async scan(window) {
            seen.push(window);
            return {
                candidates: candidates.filter((candidate) => candidate.sequence >= window.fromSequence).slice(0, window.limit),
                byteLength: 4096
            };
        }
    };
}

export function historyOf(entries: readonly CycleHistoryEntry[], presentEventIds: readonly string[] = []): CycleHistorySource {
    return {
        async cycles() { return entries; },
        async completedCycleFor(correlationId) {
            return entries.find((entry) => entry.correlationId === correlationId
                && entry.lastPhase === 'coordinator-cycle-complete')?.cycleId ?? null;
        },
        async cycleForTriggerEvent(eventId) {
            return entries.find((entry) => entry.triggerEventId === eventId)?.cycleId ?? null;
        },
        async escalationCycleFor(priorCycleId) {
            return entries.find((entry) => entry.priorUncertainCycleId === priorCycleId)?.cycleId ?? null;
        },
        async containsEvent(eventId) { return presentEventIds.includes(eventId); }
    };
}

export function cycleEntry(cycleId: string, lastPhase: string, overrides: Partial<CycleHistoryEntry> = {}): CycleHistoryEntry {
    return Object.freeze({
        cycleId, correlationId: `correlation-${cycleId}`, lastPhase,
        triggerEventId: `event-${cycleId}`, uncertainOutcomeEventId: null, priorUncertainCycleId: null, ...overrides
    });
}

/** A `CursorManager` bound to a real lane directory, the real effect journal, and the real lane lock. */
export function cursorFor(laneDir: string, laneId: string = LANE_ID): CursorManager {
    return new CursorManager({
        laneDir, laneId, files, clock: fixedClock(), evidence: effectEvidenceFromJournal(laneDir),
        lock: lockFor(laneDir)
    });
}

/** An M0 sink that reports every candidate handled, unless its ID is listed as unhandled. */
export function m0SinkExcept(unhandledEventIds: readonly string[] = []) {
    return async (candidate: TriggerCandidate) => ({handled: !unhandledEventIds.includes(candidate.eventId)});
}

/** A `RuntimeEventReader` over a fixed event list, paging exactly like CA-03's index. */
export function readerOf(events: readonly DurableEvent[]): RuntimeEventReader {
    return {
        async readEvents(fromSequence: number, limit: number): Promise<DurableEventPage> {
            const matching = events.filter((event) => event.sequence >= fromSequence);
            const items = matching.slice(0, limit);
            return {
                items, fromSequence, limit,
                nextSequence: matching.length > limit ? items[items.length - 1].sequence + 1 : null
            };
        }
    };
}

export function durableEvent(sequence: number, type: string, overrides: Partial<DurableEvent> = {}): DurableEvent {
    return Object.freeze({
        schemaVersion: 1 as const, eventId: `event-${sequence}`, type, sequence, at: NOW, laneId: LANE_ID,
        producer: 'watchtower-watcher', correlationId: `correlation-${sequence}`, causationId: null,
        policyVersion: 'policy-1', payload: {}, ...overrides
    });
}

export function planFor(cycleId: string, idempotencyKey = `key-${cycleId}`): EffectPlan {
    return Object.freeze({
        schemaVersion: 1 as const, laneId: LANE_ID, cycleId, proposalId: `proposal-${cycleId}`,
        effect: 'record-acceptance', actionId: 'git.record-acceptance', taskId: 'wt:git:record-acceptance',
        scope: 'lane-local' as const, targetIds: Object.freeze(['CA-13']), parameters: {},
        preconditionDigest: `sha256:${'a'.repeat(64)}` as const, idempotencyKey,
        snapshotDigest: `sha256:${'b'.repeat(64)}`, policyVersion: 'policy-1'
    });
}

/** Append one real effect-journal phase record and return its event ID. */
export function appendPhase(laneDir: string, plan: EffectPlan, phase: EffectPhase, sequence: number, eventId: string): string {
    const record = appendEffectPhase(laneDir, plan, phase, phase, sequence, {
        files: nodeEffectFileSystem, clock: {now: () => new Date(NOW)}, ids: {nextEventId: () => eventId}
    });
    return record.eventId;
}

/**
 * The real durability adapter with exactly one operation faulted, so every
 * untouched operation still reaches the real filesystem.
 */
export function faultingQueueFiles(op: 'createExclusive' | 'renameOver' | 'syncDirectory', match: (path: string) => boolean): QueueFileSystem {
    const faulted: EffectFileSystem = {
        ...nodeEffectFileSystem,
        createExclusive(path, content, mode) {
            if (op === 'createExclusive' && match(path)) throw new Error('injected staged-create failure');
            return nodeEffectFileSystem.createExclusive(path, content, mode);
        },
        renameOver(stagedPath, path) {
            if (op === 'renameOver' && match(path)) throw new Error('injected rename failure');
            nodeEffectFileSystem.renameOver(stagedPath, path);
        },
        syncDirectory(path) {
            if (op === 'syncDirectory' && match(path)) throw new Error('injected directory sync failure');
            nodeEffectFileSystem.syncDirectory(path);
        }
    };
    return queueFileSystemOver(faulted);
}
