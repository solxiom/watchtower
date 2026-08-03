/**
 * Invocation-envelope fixtures (`nirvana-integration-architecture.md` §7).
 *
 * Kept beside the runtime fixtures rather than inside them: an envelope is a
 * separate lane artifact with its own §7 contract, and the adversarial matrix
 * mutates one member at a time, so it earns its own focused module.
 */
import {semanticDigest} from '../../../src/foundation/schemaComposition/jsonCanonicalizer.js';
import type {JsonObject} from '../../../src/foundation/schemaComposition/schemaCompositionContracts.js';
import {
    ACTION_ID,
    CATALOG_ID,
    INPUT_SCHEMA_ID,
    LANE_DIR,
    TASK_ID,
    laneContext,
    type FakeEntry
} from './laneTaskRuntimeFixtures.js';

/** The lane-contained single-use invocation envelope the effect executor prepared. */
export const ENVELOPE_PATH = `${LANE_DIR}/effects/envelope-01.json`;

/**
 * A complete §7 invocation envelope, checksum-bound over its own canonical
 * bytes. Overrides mutate one member at a time so a refusal proves one rule.
 */
export function envelopeDocument(document: JsonObject, overrides: Record<string, unknown> = {}): JsonObject {
    const body: JsonObject = {
        schemaVersion: 1,
        actionId: ACTION_ID,
        laneId: laneContext().laneId,
        catalogId: CATALOG_ID,
        catalogSha256: semanticDigest(document),
        taskId: TASK_ID,
        inputSchema: INPUT_SCHEMA_ID,
        parameters: {reason: 'demo'},
        preconditionDigest: `sha256:${'3'.repeat(64)}`,
        idempotencyKey: 'idem-01',
        lockId: 'lane/demo/effect',
        createdAt: '2026-08-02T23:00:00.000Z',
        expiresAt: '2026-08-03T01:00:00.000Z',
        resultDestination: `${LANE_DIR}/effects/envelope-01.result.json`,
        journalDestination: `${LANE_DIR}/effects/envelope-01.journal.jsonl`,
        consumer: {handlerId: 'RuntimeSmokeTaskHandler', singleUse: true},
        ...overrides
    };
    const {checksum, ...rest} = body;
    return {...rest, checksum: typeof checksum === 'string' ? checksum : semanticDigest(rest)};
}

/** The staged envelope file: operator-owned, mode-restricted, lane-contained. */
export function envelopeEntry(document: JsonObject, overrides: Partial<FakeEntry> = {}): FakeEntry {
    return {kind: 'file', readable: true, mode: 0o600, text: JSON.stringify(document), ...overrides};
}
