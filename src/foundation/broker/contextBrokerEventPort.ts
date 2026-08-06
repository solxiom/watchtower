/**
 * The durable `coordinator-context-requested` event boundary
 * (`docs/spec/coordinator-automation.md` §10.1 step 5). This capsule owns
 * the *event shape and idempotency key*, never the durable journal itself —
 * append-only journal ownership (checkpoint digest, sequence gap detection,
 * single-writer/WAL semantics) belongs to CA-03/CA-13
 * (`src/foundation/index/runtime/journalIndexAppend.ts`), neither of which
 * is an accepted CA-08 predecessor. `BrokerEventPort` is the injected
 * collaborator a future coordinator-queue batch implements against a real
 * journal; `ContextBroker` only ever calls it and interprets its result.
 *
 * `eventId` is the SHA-256 semantic digest of every field that identifies
 * *this exact resolved request* (cycle, batch, lane, kind, ref, content
 * digest) — mirroring the idempotency-key pattern already normative for
 * effects (`docs/spec/v1-contracts.md` §5: "SHA-256 semantic digest of lane
 * ID, proposal ID, effect type, target identities, snapshot digest, and
 * policy version"). A retried append with the same identifying fields
 * produces the same `eventId`, so a conforming port can detect and report
 * `duplicate` instead of appending twice.
 */
import type {BrokerReferenceKind, ContextRequestedAppendResult, ContextRequestedEvent, EnvelopeDigest} from '../../contracts/index.js';
import {semanticDigest} from '../schemaComposition/index.js';
import {brokerFailure} from './contextBrokerErrors.js';

/** Injected accepted journal/event port; a future CA-13 coordinator queue supplies the durable implementation. */
export interface BrokerEventPort {
    appendContextRequested(event: ContextRequestedEvent): Promise<ContextRequestedAppendResult>;
}

export function contextRequestedEventId(params: Readonly<{
    cycleId: string; laneId: string; batchId: string; kind: BrokerReferenceKind; ref: string; digest: EnvelopeDigest;
}>): string {
    return semanticDigest({
        cycleId: params.cycleId, laneId: params.laneId, batchId: params.batchId,
        kind: params.kind, ref: params.ref, digest: params.digest
    });
}

export function buildContextRequestedEvent(params: Readonly<{
    cycleId: string; laneId: string; batchId: string; kind: BrokerReferenceKind; ref: string;
    digest: EnvelopeDigest; byteLength: number; requestedAt: string;
}>): ContextRequestedEvent {
    return Object.freeze({
        eventId: contextRequestedEventId(params), cycleId: params.cycleId, laneId: params.laneId, batchId: params.batchId,
        kind: params.kind, ref: params.ref, digest: params.digest, byteLength: params.byteLength, requestedAt: params.requestedAt
    });
}

/** Wraps a thrown/rejected append as a stable typed reason; a genuinely uncertain append (timeout, disconnect) surfaces the same way — the caller retries with the identical event and the port's own idempotency key resolves it to `duplicate` rather than a second record. */
export async function appendContextRequestedEvent(port: BrokerEventPort, event: ContextRequestedEvent): Promise<ContextRequestedAppendResult> {
    try {
        return await port.appendContextRequested(event);
    } catch (error) {
        brokerFailure('BROKER_EVENT_APPEND_FAILED', event.eventId, error instanceof Error ? error.message : 'context-requested event append failed');
    }
}
