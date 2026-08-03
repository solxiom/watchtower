/**
 * The mutation invocation envelope is authority, not a label
 * (`docs/spec/nirvana-integration-architecture.md` §7, Correction 04 finding 3).
 *
 * Every case below is a refusal *before the process starts*, asserted through the
 * production runner rather than through the validator alone, so a rule that
 * stopped being wired into the failure order would fail here even if the
 * validator still knew about it. Document rules run against in-memory bytes;
 * ownership, mode, and lane containment are real filesystem facts and are also
 * proved against a real temporary lane in the integration suite.
 */
import {harness, reasonOf} from './support/laneTaskRunnerHarness.js';
import {
    LANE_DIR,
    TASK_ID,
    catalogDocument,
    invocation,
    taskEntry
} from './support/laneTaskRuntimeFixtures.js';
import {ENVELOPE_PATH, envelopeDocument, envelopeEntry} from './support/laneEnvelopeFixtures.js';
import type {FakeEntry} from './support/laneTaskRuntimeFixtures.js';

/** A task that carries effect authority, so an envelope is required. */
const EFFECT_DOCUMENT = catalogDocument({
    tasks: {[TASK_ID]: taskEntry({mutationClass: 'authoritative-effect', requiresInvocationEnvelope: true})}
});

/** Run the production runner with one staged envelope and report the refusal. */
async function envelopeReason(
    overrides: Record<string, unknown> = {},
    entry: Partial<FakeEntry> = {},
    extra: Record<string, FakeEntry> = {}
): Promise<string> {
    const document = envelopeDocument(EFFECT_DOCUMENT, overrides);
    const {runner, processes} = harness({
        document: EFFECT_DOCUMENT,
        extra: {[ENVELOPE_PATH]: envelopeEntry(document, entry), ...extra}
    });
    const reason = await reasonOf(() => runner.run(invocation({invocationEnvelope: ENVELOPE_PATH})));
    return processes.requests.length === 0 ? reason : `started-process:${reason}`;
}

/** Stage raw bytes rather than a well-formed document. */
async function rawEnvelopeReason(text: string): Promise<string> {
    const {runner, processes} = harness({
        document: EFFECT_DOCUMENT,
        extra: {[ENVELOPE_PATH]: {kind: 'file', readable: true, mode: 0o600, text}}
    });
    const reason = await reasonOf(() => runner.run(invocation({invocationEnvelope: ENVELOPE_PATH})));
    return processes.requests.length === 0 ? reason : `started-process:${reason}`;
}

describe('invocation envelope authority is proved before any process starts', () => {
    it('accepts the complete, checksum-bound, unexpired envelope for this exact task', async () => {
        const {runner, processes} = harness({
            document: EFFECT_DOCUMENT,
            extra: {[ENVELOPE_PATH]: envelopeEntry(envelopeDocument(EFFECT_DOCUMENT))}
        });
        const result = await runner.run(invocation({invocationEnvelope: ENVELOPE_PATH}));
        expect(result.outcome).toBe('completed');
        expect(processes.lastRequest.args).toContain(`--wt-invocation-envelope=${ENVELOPE_PATH}`);
    });

    it('refuses a reference that is not an absolute lane artifact', async () => {
        const {runner} = harness({document: EFFECT_DOCUMENT});
        expect(await reasonOf(() => runner.run(invocation({invocationEnvelope: 'envelope-01'}))))
            .toBe('TASK_RUNTIME_ENVELOPE_INVALID');
        expect(await reasonOf(() => runner.run(invocation({invocationEnvelope: `${LANE_DIR}/absent.json`}))))
            .toBe('TASK_RUNTIME_ENVELOPE_INVALID');
    });

    it('refuses an envelope that resolves outside the selected lane overlay', async () => {
        expect(await envelopeReason({}, {canonicalPath: '/tmp/attacker/envelope-01.json'}))
            .toBe('TASK_RUNTIME_ENVELOPE_PATH_ESCAPE');
    });

    it('refuses an envelope the effective account does not own', async () => {
        expect(await envelopeReason({}, {owner: {uid: 4242, gid: 4242}}))
            .toBe('TASK_RUNTIME_ENVELOPE_OWNER_INVALID');
    });

    it('refuses an envelope that is not mode-restricted to its owner', async () => {
        expect(await envelopeReason({}, {mode: 0o644})).toBe('TASK_RUNTIME_ENVELOPE_MODE_INVALID');
        expect(await envelopeReason({}, {mode: 0o660})).toBe('TASK_RUNTIME_ENVELOPE_MODE_INVALID');
    });

    it('refuses an unreadable envelope', async () => {
        expect(await envelopeReason({}, {text: undefined})).toBe('TASK_RUNTIME_ENVELOPE_UNREADABLE');
    });
});

describe('invocation envelope documents are closed and self-bound', () => {
    it('refuses malformed bytes and a duplicate JSON member', async () => {
        expect(await rawEnvelopeReason('not json at all')).toBe('TASK_RUNTIME_ENVELOPE_INVALID');
        const document = envelopeDocument(EFFECT_DOCUMENT);
        const duplicated = `${JSON.stringify(document).slice(0, -1)},"taskId":"${TASK_ID}"}`;
        expect(await rawEnvelopeReason(duplicated)).toBe('TASK_RUNTIME_ENVELOPE_INVALID');
    });

    it('refuses a missing member and an unsupported extra member', async () => {
        const document = envelopeDocument(EFFECT_DOCUMENT) as Record<string, unknown>;
        const {lockId: _omitted, ...missing} = document;
        expect(await rawEnvelopeReason(JSON.stringify(missing))).toBe('TASK_RUNTIME_ENVELOPE_INVALID');
        expect(await envelopeReason({smuggled: true})).toBe('TASK_RUNTIME_ENVELOPE_INVALID');
    });

    it('refuses a consumer that is not a single-use named handler', async () => {
        expect(await envelopeReason({consumer: {handlerId: 'RuntimeSmokeTaskHandler', singleUse: false}}))
            .toBe('TASK_RUNTIME_ENVELOPE_INVALID');
        expect(await envelopeReason({consumer: {singleUse: true}})).toBe('TASK_RUNTIME_ENVELOPE_INVALID');
    });

    it('refuses an envelope whose contents no longer match its own checksum', async () => {
        expect(await envelopeReason({checksum: `sha256:${'0'.repeat(64)}`}))
            .toBe('TASK_RUNTIME_ENVELOPE_CHECKSUM_MISMATCH');
    });

    it('refuses parameters edited after the envelope was sealed', async () => {
        const sealed = envelopeDocument(EFFECT_DOCUMENT) as Record<string, unknown>;
        const tampered = JSON.stringify({...sealed, parameters: {reason: 'escalated'}});
        expect(await rawEnvelopeReason(tampered)).toBe('TASK_RUNTIME_ENVELOPE_CHECKSUM_MISMATCH');
    });
});

describe('invocation envelopes are addressed, timely, and single use', () => {
    it('refuses an envelope addressed to another lane or another catalog', async () => {
        expect(await envelopeReason({laneId: '00000000-0000-4000-8000-000000000000'}))
            .toBe('TASK_RUNTIME_ENVELOPE_TASK_MISMATCH');
        expect(await envelopeReason({catalogId: 'watchtower-runtime-nvb/v2'}))
            .toBe('TASK_RUNTIME_ENVELOPE_TASK_MISMATCH');
        expect(await envelopeReason({catalogSha256: `sha256:${'9'.repeat(64)}`}))
            .toBe('TASK_RUNTIME_ENVELOPE_TASK_MISMATCH');
    });

    it('refuses an envelope naming another action, task, schema, or consuming handler', async () => {
        expect(await envelopeReason({actionId: 'runtime.other'}))
            .toBe('TASK_RUNTIME_ENVELOPE_TASK_MISMATCH');
        expect(await envelopeReason({taskId: 'wt:runtime:other'}))
            .toBe('TASK_RUNTIME_ENVELOPE_TASK_MISMATCH');
        expect(await envelopeReason({inputSchema: 'watchtower://runtime/schemas/other-input/v1'}))
            .toBe('TASK_RUNTIME_ENVELOPE_TASK_MISMATCH');
        expect(await envelopeReason({consumer: {handlerId: 'OtherTaskHandler', singleUse: true}}))
            .toBe('TASK_RUNTIME_ENVELOPE_TASK_MISMATCH');
    });

    it('refuses an expired envelope and one that is not yet valid', async () => {
        expect(await envelopeReason({
            createdAt: '2026-08-01T00:00:00.000Z', expiresAt: '2026-08-02T00:00:00.000Z'
        })).toBe('TASK_RUNTIME_ENVELOPE_EXPIRED');
        expect(await envelopeReason({
            createdAt: '2026-08-04T00:00:00.000Z', expiresAt: '2026-08-05T00:00:00.000Z'
        })).toBe('TASK_RUNTIME_ENVELOPE_EXPIRED');
    });

    it('refuses an impossible validity window', async () => {
        expect(await envelopeReason({
            createdAt: '2026-08-03T02:00:00.000Z', expiresAt: '2026-08-03T01:00:00.000Z'
        })).toBe('TASK_RUNTIME_ENVELOPE_EXPIRED');
    });

    it('refuses replay of an envelope the effect executor already consumed', async () => {
        const consumed = {[`${ENVELOPE_PATH}.consumed`]: {kind: 'file' as const, readable: true, text: '{}'}};
        expect(await envelopeReason({}, {}, consumed)).toBe('TASK_RUNTIME_ENVELOPE_CONSUMED');
    });
});
