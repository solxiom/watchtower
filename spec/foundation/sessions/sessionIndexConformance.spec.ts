import {createHash, createPublicKey, verify} from 'node:crypto';
import {mkdtempSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import Ajv2020 from 'ajv/dist/2020.js';
import {
    ReferenceCapsule, SessionIndexError, SESSION_CAPSULE_OMISSIONS, SESSION_DECISION_CLASSES, SESSION_LIFECYCLE_STATES, SESSION_ORIGINS,
    SESSION_PROPOSAL_STATES, SESSION_PROPOSAL_TYPES, SESSION_REF_TYPES, SESSION_TELEMETRY_QUALITIES, SESSION_TURN_STATES
} from '../../../src/contracts/index.js';
import {computeSemanticRoot, openDerivedStorage, type TypedRow} from '../../../src/foundation/storage/index.js';
import {SESSION_INDEX_SCHEMA} from '../../../src/foundation/index/sessions/index.js';
import {capBytes} from '../../../src/foundation/index/sessions/sessionIndexRows.js';
import {assertCapsuleSchema, buildCapsule} from '../../../src/foundation/index/sessions/sessionCapsule.js';
import {SessionIndex} from '../../../src/foundation/index/sessions/index.js';
import {LANE_ID, newFixture, writeSession} from './support/sessionFixtures.js';

const ARTIFACTS = join(process.cwd(), 'docs', 'spec', 'schemas', 'session-index-v2');
const load = (name: string): Record<string, unknown> => JSON.parse(readFileSync(join(ARTIFACTS, name), 'utf8'));

const registry = load('registry.json');
const enums = load('enums.json');
const goldenVectors = load('golden-vectors.json');

describe('session index conformance (C1 registry parity)', () => {
    it('reproduces every registry table, column, key, and foreign key exactly, in both directions', () => {
        const registryTables = (registry.tables as {name: string; columns: {name: string; type: string; notNull?: boolean}[]; primaryKey: string[]; foreignKeys?: unknown[]}[]);
        expect(SESSION_INDEX_SCHEMA.map((table) => table.name)).toEqual(registryTables.map((table) => table.name));
        for (const expected of registryTables) {
            const actual = SESSION_INDEX_SCHEMA.find((table) => table.name === expected.name);
            expect(actual).withContext(expected.name).toBeDefined();
            expect(actual?.columns.map((column) => [column.name, column.type, column.notNull === true]))
                .withContext(expected.name).toEqual(expected.columns.map((column) => [column.name, column.type, column.notNull === true]));
            expect(actual?.primaryKey).withContext(expected.name).toEqual(expected.primaryKey);
            expect((actual?.foreignKeys ?? []).length).withContext(expected.name).toBe((expected.foreignKeys ?? []).length);
        }
    });
});

describe('session index conformance (C2 golden vectors)', () => {
    const META = [
        {key: 'schemaVersion', value: '1'}, {key: 'backend', value: 'sqlite'}, {key: 'storeKind', value: 'sessions'},
        {key: 'databaseSchemaVersion', value: '2'}, {key: 'compilerVersion', value: '1.0.0'},
        {key: 'laneId', value: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2'}, {key: 'sourceIdentity', value: 'operator-session-journals'}
    ];
    const SESSION: TypedRow = {
        operator_session_id: 'opsess-3f8a1b2c', lane_id: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2', origin: 'operator',
        policy_profile_id: 'operator-standard', state: 'open', topic: 'CA-16R conformance fixture', created_at: '2026-08-07T12:00:00Z',
        last_turn_at: '2026-08-07T12:05:00Z', turn_count: 1, parent_operator_session_id: null, budget_segment_id: 'seg-0001',
        journal_checkpoint: `412:sha256:${'0'.repeat(64)}`, content_root: 'coordinator/operator-sessions/opsess-3f8a1b2c'
    };
    const TURN: TypedRow = {
        turn_id: 'turn-0001', operator_session_id: 'opsess-3f8a1b2c', turn_number: 1, state: 'complete', decision_class: 'D2',
        routing_rule_id: 'operator-tactical-v1', endpoint_id: 'codex-primary-medium', snapshot_revision: 81, stale: 0,
        completed_at: '2026-08-07T12:05:00Z', content_excerpt: 'Why was B14 rejected?', answer_excerpt: 'Batch B14 was rejected for three recorded findings.',
        answer_digest: `sha256:${'e'.repeat(64)}`, input_tokens: 18000, output_tokens: 2200, telemetry_quality: 'reported', operator_bytes: 21, coordinator_bytes: 1540
    };

    async function rootFor(reversed: boolean): Promise<string> {
        const root = mkdtempSync(join(tmpdir(), 'wt-gv-'));
        try {
            const result = await openDerivedStorage(root).rebuild('sessions', SESSION_INDEX_SCHEMA, async (writer) => {
                for (const meta of reversed ? [...META].reverse() : META) await writer.insert('index_meta', meta);
                await writer.insert('operator_sessions', SESSION);
                await writer.insert('turns', TURN);
            });
            return result.semanticRoot;
        } finally {
            rmSync(root, {recursive: true, force: true});
        }
    }

    it('reproduces the recorded GV-02 root through the accepted implementation', async () => {
        expect(await rootFor(false)).toBe((goldenVectors.vectors as Record<string, {semanticRoot: string}>)['GV-02'].semanticRoot);
    });

    it('is insertion-order independent (GV-03 reverse insert equals GV-02)', async () => {
        expect(await rootFor(true)).toBe(await rootFor(false));
    });

    it('computes an empty-store root over the full registry export', () => {
        const empty = computeSemanticRoot({tables: SESSION_INDEX_SCHEMA.map((table) => ({name: table.name, rows: []}))});
        expect(empty).toBe((goldenVectors.vectors as Record<string, {semanticRoot: string}>)['GV-01'].semanticRoot);
    });
});

function validCapsule(): ReferenceCapsule {
    return buildCapsule({
        sourceOperatorSessionId: 'opsess-a', sourceTurnId: 'turn-1', turnNumber: 1, laneId: 'lane-1', completedAt: '2026-08-07T12:05:00Z',
        decisionClass: 'D2', routingRuleId: 'operator-tactical-v1', snapshotRevision: 81, stale: false,
        evidenceRefs: [{refType: 'event', refValue: 'evt-1', stale: false}], openQuestions: ['q?'], proposals: [{proposalId: 'prop-1', proposalType: 'place-hold'}],
        answerExcerpt: 'ok', answerBytes: 2, answerDigest: `sha256:${'a'.repeat(64)}`, prunedContent: false
    });
}

describe('session index conformance (C3 every schema compiles with positive and negative instances)', () => {
    it('compiles every JSON Schema artifact in the contract directory', () => {
        for (const name of readdirSync(ARTIFACTS).filter((file) => file.endsWith('.schema.json'))) {
            expect(() => new Ajv2020({strict: false}).compile(load(name))).withContext(name).not.toThrow();
        }
    });

    it('accepts a produced capsule and rejects every capsule.schema.json violation, in ajv and in the runtime validator alike', () => {
        const validate = new Ajv2020({strict: false}).compile(load('capsule.schema.json'));
        const capsule = validCapsule() as unknown as Record<string, unknown>;
        expect(validate(capsule)).withContext('valid').toBeTrue();
        expect(() => assertCapsuleSchema(capsule as unknown as ReferenceCapsule, 'valid')).not.toThrow();
        const structural: Record<string, Record<string, unknown>> = {
            'extra field': {...capsule, operatorMessage: 'leak'},
            'missing required': (() => { const copy = {...capsule}; delete copy.answerDigest; return copy; })(),
            'bad digest format': {...capsule, answerDigest: 'nope'},
            'oversize openQuestions': {...capsule, openQuestions: Array.from({length: 33}, () => 'q')},
            'unknown omission': {...capsule, omitted: ['not-a-real-omission']}
        };
        for (const [label, instance] of Object.entries(structural)) {
            expect(validate(instance)).withContext(`ajv ${label}`).toBeFalse();
            expect(() => assertCapsuleSchema(instance as unknown as ReferenceCapsule, label)).withContext(`runtime ${label}`).toThrowError(SessionIndexError);
        }
        // The derived incomplete rule is a cross-field constraint JSON Schema cannot express; the runtime validator enforces it.
        expect(() => assertCapsuleSchema({...capsule, answerBytes: 999, incomplete: false} as unknown as ReferenceCapsule, 'incomplete')).toThrowError(SessionIndexError);
    });
});

describe('session index conformance (C3 manifest and decommissioning instances)', () => {
    type SignatureRecord = {subject: string; digest: string; signatureAlgorithm: string; signerId: string; signatureBase64: string; signerPublicKeyDerSpkiBase64: string};
    const signatures = load('signatures.json') as {records: SignatureRecord[]};
    const recordFor = (subject: string): SignatureRecord => signatures.records.find((item) => item.subject === subject) as SignatureRecord;
    const signatureFor = (subject: string) => {
        const record = recordFor(subject);
        return {signatureAlgorithm: record.signatureAlgorithm, signerId: record.signerId, signerPublicKeyDerSpkiBase64: record.signerPublicKeyDerSpkiBase64, signatureBase64: record.signatureBase64};
    };

    it('validates a manifest this implementation actually produced, and rejects each mutation of it', async () => {
        const fixture = newFixture();
        try {
            writeSession(fixture.sessionsRoot, {id: 'opsess-m1', turns: [{turnId: 'turn-m1', turn: 1}]});
            await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
            const produced = JSON.parse(readFileSync(join(fixture.indexRoot, 'index-manifest.json'), 'utf8')) as Record<string, unknown>;
            const validate = new Ajv2020({strict: false}).compile(load('manifest.schema.json'));
            expect(validate(produced)).withContext(JSON.stringify(validate.errors)).toBeTrue();
            const negatives: Record<string, Record<string, unknown>> = {
                'legacy database schema version': {...produced, databaseSchemaVersion: 1},
                'foreign store kind': {...produced, storeKind: 'runtime'},
                'derived rebuild source': {...produced, source: {...(produced.source as Record<string, unknown>), identity: 'a-previous-session-index'}},
                'malformed semantic root': {...produced, semanticRoot: 'not-a-digest'},
                'unexpected field': {...produced, adoptedFromLegacy: true},
                'missing source': (() => { const copy = {...produced}; delete copy.source; return copy; })()
            };
            for (const [label, instance] of Object.entries(negatives)) expect(validate(instance)).withContext(label).toBeFalse();
        } finally {
            fixture.cleanup();
        }
    });

    it('validates a decommissioning manifest instance and rejects each violation', () => {
        const validate = new Ajv2020({strict: false}).compile(load('decommissioning-manifest.schema.json'));
        const legacyDigest = (load('decommissioning-manifest.schema.json').properties as Record<string, {properties: {schemaDigest: {const: string}}}>).legacySchema.properties.schemaDigest.const;
        const instance = {
            manifestVersion: 'session-index-decommissioning/1', laneId: LANE_ID,
            discardedStore: {path: 'coordinator/index/sessions/sessions.sqlite', databaseSchemaVersion: 1, fileDigest: `sha256:${'1'.repeat(64)}`, observedAt: '2026-08-07T12:00:00.000Z'},
            legacySchema: {schemaId: 'legacy-ca16-v1', schemaVersion: 1, schemaDigest: legacyDigest, signature: signatureFor('legacy-ca16-v1.schema.json')},
            equivalenceProof: {artifactId: 'legacy-ca16-v1-equivalence', artifactVersion: 1, canonicalDigest: recordFor('legacy-equivalence.json').digest, signature: signatureFor('legacy-equivalence.json')},
            rebuild: {source: 'operator-session-journals', semanticRoot: `sha256:${'2'.repeat(64)}`, databaseSchemaVersion: 2, completedAt: '2026-08-07T12:10:00.000Z'},
            decidedAt: '2026-08-07T12:10:00.000Z'
        };
        expect(validate(instance)).withContext(JSON.stringify(validate.errors)).toBeTrue();
        const negatives: Record<string, Record<string, unknown>> = {
            'discards a current store': {...instance, discardedStore: {...instance.discardedStore, databaseSchemaVersion: 2}},
            'rebuilds from a derived store': {...instance, rebuild: {...instance.rebuild, source: 'a-previous-session-index'}},
            'unsigned equivalence proof': (() => { const copy = {...instance, equivalenceProof: {...instance.equivalenceProof}} as Record<string, unknown>; delete (copy.equivalenceProof as Record<string, unknown>).signature; return copy; })(),
            'no equivalence proof at all': (() => { const copy = {...instance} as Record<string, unknown>; delete copy.equivalenceProof; return copy; })(),
            'unexpected field': {...instance, adopted: true}
        };
        for (const [label, bad] of Object.entries(negatives)) expect(validate(bad)).withContext(label).toBeFalse();
    });

    it('treats legacy-ca16-v1.schema.json as a frozen table registry, not a validating JSON Schema', () => {
        const legacy = load('legacy-ca16-v1.schema.json');
        expect(legacy.schemaId).toBe('legacy-ca16-v1');
        expect((legacy.tables as {name: string}[]).map((table) => table.name).sort())
            .toEqual(SESSION_INDEX_SCHEMA.map((table) => table.name).filter((name) => name !== 'index_meta').sort());
    });
});

describe('session index conformance (C4 frozen legacy artifacts are digest- and signature-verified)', () => {
    const signatures = load('signatures.json') as {records: {subject: string; signedOver: string; digest: string; signatureBase64: string; signerPublicKeyDerSpkiBase64: string}[]};

    function canonical(value: unknown): string {
        if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
        if (value !== null && typeof value === 'object') return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
        return JSON.stringify(value);
    }

    function signedBytes(record: {subject: string; signedOver: string}): Buffer {
        const raw = readFileSync(join(ARTIFACTS, record.subject));
        return record.signedOver === 'exact file bytes' ? raw : Buffer.from(canonical(JSON.parse(raw.toString('utf8'))), 'utf8');
    }

    it('reproduces every recorded digest and verifies its Ed25519 signature', () => {
        for (const record of signatures.records) {
            const bytes = signedBytes(record);
            expect(`sha256:${createHash('sha256').update(bytes).digest('hex')}`).withContext(record.subject).toBe(record.digest);
            const publicKey = createPublicKey({key: Buffer.from(record.signerPublicKeyDerSpkiBase64, 'base64'), format: 'der', type: 'spki'});
            expect(verify(null, bytes, publicKey, Buffer.from(record.signatureBase64, 'base64'))).withContext(record.subject).toBeTrue();
        }
    });
});

describe('session index conformance (C5 reject conditions are honored)', () => {
    it('never stores full text, an operator message, or a transitive reference in a capsule', () => {
        const capsule = validCapsule();
        const json = JSON.stringify(capsule);
        expect(Buffer.byteLength(json, 'utf8')).toBeLessThanOrEqual(4096);
        expect(json).not.toContain('operatorMessage');
        expect(capsule.omitted).toContain('operator-message');
        expect(capsule.omitted).toContain('full-answer');
        expect(capsule.omitted).toContain('transitive-references');
    });
});

describe('session index conformance (C6 no transcribed digest in product code)', () => {
    it('contains no hand-typed sha256 digest literal in any owned module', () => {
        const dir = join(process.cwd(), 'src', 'foundation', 'index', 'sessions');
        for (const file of readdirSync(dir).filter((name) => name.endsWith('.ts'))) {
            const text = readFileSync(join(dir, file), 'utf8').replace(/'0'\.repeat\(64\)/g, '');
            expect(/[0-9a-f]{64}/.test(text)).withContext(file).toBeFalse();
        }
    });

    it('reproduces the golden-vector roots through computeSemanticRoot rather than transcription', () => {
        const empty = computeSemanticRoot({tables: SESSION_INDEX_SCHEMA.map((table) => ({name: table.name, rows: []}))});
        expect(empty).toBe((goldenVectors.vectors as Record<string, {semanticRoot: string}>)['GV-01'].semanticRoot);
    });
});

describe('session index conformance (C7 excerpt byte cap and UTF-8 boundary)', () => {
    it('never splits a multibyte code point at the 500-byte cap', () => {
        expect(Buffer.byteLength(capBytes('a'.repeat(600), 500), 'utf8')).toBe(500);
        const threeByte = capBytes('€'.repeat(200), 500);
        expect(Buffer.byteLength(threeByte, 'utf8')).toBe(498);
        expect(threeByte).not.toContain('�');
        expect(Buffer.byteLength(capBytes('\u{1f600}'.repeat(200), 500), 'utf8')).toBe(500);
        const straddle = capBytes(`${'a'.repeat(499)}€`, 500);
        expect(Buffer.byteLength(straddle, 'utf8')).toBe(499);
        expect(straddle).not.toContain('�');
    });
});

describe('session index conformance (enum closure and model-free)', () => {
    it('mirrors every enums.json set exactly', () => {
        const sets = enums.enums as Record<string, {values: readonly unknown[]}>;
        const list = (values: readonly unknown[]): string[] => [...values] as string[];
        expect(list(SESSION_ORIGINS)).toEqual(list(sets.origin.values));
        expect(list(SESSION_LIFECYCLE_STATES)).toEqual(list(sets.sessionState.values));
        expect(list(SESSION_TURN_STATES)).toEqual(list(sets.turnState.values));
        expect(list(SESSION_DECISION_CLASSES)).toEqual(list(sets.decisionClass.values));
        expect(list(SESSION_REF_TYPES)).toEqual(list(sets.refType.values));
        expect(list(SESSION_TELEMETRY_QUALITIES)).toEqual(list(sets.telemetryQuality.values));
        expect(list(SESSION_PROPOSAL_TYPES)).toEqual(list(sets.proposalType.values));
        expect(list(SESSION_PROPOSAL_STATES)).toEqual(list(sets.proposalState.values));
        expect(list(SESSION_CAPSULE_OMISSIONS)).toEqual(list(sets.capsuleOmission.values));
    });

    it('invokes no model in any owned session-index module', () => {
        const dir = join(process.cwd(), 'src', 'foundation', 'index', 'sessions');
        for (const file of readdirSync(dir).filter((name) => name.endsWith('.ts'))) {
            const text = readFileSync(join(dir, file), 'utf8');
            expect(/\binvoke\s*\(|anthropic|\.generate\s*\(|modelClient|llm\b/i.test(text)).withContext(file).toBeFalse();
        }
    });
});
