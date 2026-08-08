/**
 * Binds bounded trigger ingestion to the packaged
 * `wt:coordinator:poll-triggers` task through `LaneTaskRunner` (CA-13
 * correction-01 F4).
 *
 * This is the composition root of the watcher boundary: the application
 * service asks for a bounded page of candidates, the request crosses the single
 * NVB task boundary, and the packaged handler performs the mechanical scan.
 * Nothing about *policy* crosses with it — no priority, no routing class, no
 * cycle state, no cursor position — so the task can never become a second
 * coordinator.
 *
 * The action is `read-only` and declares `requiresInvocationEnvelope: false`,
 * which is why no envelope is prepared here: an envelope is CA-10's authority
 * to mutate, and asking for one to read a journal would widen the effect
 * boundary for no reason.
 *
 * The result is validated as `unknown` into the closed `TriggerCandidate`
 * contract. That is deliberate duplication of *shape*, not of *truth*: the
 * handler's grammar lives in the packaged tree and cannot be imported here, so
 * this is the same two-ended contract CA-10 already uses for the invocation
 * envelope — neither end may add, drop, or rename a member alone.
 */
import {
    CoordinatorQueueError
} from '../../../../contracts/coordinatorQueue.js';
import {
    type TriggerCandidate
} from '../../../../contracts/coordinatorReplay.js';
import type {
    LaneRuntimeContext, LaneTaskInvocation, LaneTaskRunResult
} from '../../../../contracts/taskRuntime.js';
import type {TriggerIngestSource, TriggerScanPage, TriggerScanWindow} from './queuePorts.js';

/** The allowlisted action this capsule may invoke. It is the only one. */
export const POLL_TRIGGERS_ACTION = 'coordinator.poll-triggers';

/** The `LaneTaskRunner` subset this capsule depends on (RT-05, accepted). */
export interface CoordinatorTaskRunner {
    run(invocation: LaneTaskInvocation): Promise<LaneTaskRunResult>;
}

export function triggerIngestFromTask(
    runner: CoordinatorTaskRunner, context: LaneRuntimeContext
): TriggerIngestSource {
    return Object.freeze({
        async scan(window: TriggerScanWindow): Promise<TriggerScanPage> {
            const outcome = await runner.run({
                actionId: POLL_TRIGGERS_ACTION, context,
                input: {
                    schemaVersion: 1, operation: 'poll-triggers', laneDir: context.laneDir,
                    fromSequence: Math.max(window.fromSequence, 0),
                    fromByteOffset: Math.max(window.fromByteOffset, 0),
                    // Spread into a plain JSON object: the invocation input is a
                    // closed JSON contract, not a structural pass-through of a
                    // foundation type.
                    expected: window.expected === null ? null : {
                        anchorDigest: window.expected.anchorDigest,
                        lastEventId: window.expected.lastEventId,
                        byteLength: window.expected.byteLength
                    },
                    limit: window.limit
                }
            });
            if (outcome.outcome !== 'completed') {
                throw new CoordinatorQueueError('WATCHER_INGEST_FAILED', POLL_TRIGGERS_ACTION,
                    `The packaged trigger-ingestion task did not complete (${outcome.outcome}).`);
            }
            return parsePollResult(outcome.result);
        }
    });
}

function parsePollResult(value: unknown): TriggerScanPage {
    const result = requireObject(value, 'poll result');
    if (result.ok !== true) {
        const failure = result.failure;
        const code = isObject(failure) && typeof failure.code === 'string' ? failure.code : 'unreported';
        throw new CoordinatorQueueError('WATCHER_INGEST_FAILED', POLL_TRIGGERS_ACTION,
            `The packaged trigger-ingestion task refused the scan (${code}).`);
    }
    if (!Array.isArray(result.candidates)) {
        throw new CoordinatorQueueError('WATCHER_INGEST_FAILED', POLL_TRIGGERS_ACTION,
            'The packaged trigger-ingestion task returned no candidate list.');
    }
    return Object.freeze({
        candidates: Object.freeze(result.candidates.map(parseCandidate)),
        byteLength: requireCount(result.journalByteLength, 'journalByteLength')
    });
}

function parseCandidate(value: unknown): TriggerCandidate {
    const candidate = requireObject(value, 'poll candidate');
    return Object.freeze({
        eventId: requireString(candidate.eventId, 'eventId'),
        sequence: requireCount(candidate.sequence, 'sequence'),
        eventType: requireString(candidate.eventType, 'eventType'),
        correlationId: requireString(candidate.correlationId, 'correlationId'),
        batchId: candidate.batchId === null || candidate.batchId === undefined
            ? null : requireString(candidate.batchId, 'batchId'),
        at: requireString(candidate.at, 'at'),
        byteOffset: requireCount(candidate.byteOffset, 'byteOffset'),
        // This record's own anchor digest, carried as the §9 prefix digest. No
        // whole-journal identity is claimed: a bounded reader cannot compute one,
        // and correction-03's fixed head hash was worse than none.
        prefixDigest: requireString(candidate.recordDigest, 'recordDigest')
    });
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireObject(value: unknown, subject: string): Record<string, unknown> {
    if (!isObject(value)) {
        throw new CoordinatorQueueError('WATCHER_INGEST_FAILED', POLL_TRIGGERS_ACTION, `The ${subject} is not a JSON object.`);
    }
    return value;
}

function requireString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value === '') {
        throw new CoordinatorQueueError('WATCHER_INGEST_FAILED', POLL_TRIGGERS_ACTION,
            `Poll result field ${field} is not a non-empty string.`);
    }
    return value;
}

function requireCount(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        throw new CoordinatorQueueError('WATCHER_INGEST_FAILED', POLL_TRIGGERS_ACTION,
            `Poll result field ${field} is not a non-negative integer.`);
    }
    return value;
}
