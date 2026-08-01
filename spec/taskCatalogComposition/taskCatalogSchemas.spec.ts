import {createHash} from 'node:crypto';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import Ajv from 'ajv';

import {isJsonObject} from '../../src/foundation/schemaComposition/jsonCanonicalizer.js';

interface SchemaDocument {
    readonly $id: string;
    readonly [key: string]: unknown;
}

const SCHEMA_ROOT = join(process.cwd(), 'runtime-nvb', 'schemas');
const FIXTURE_ROOT = join(process.cwd(), 'spec', 'fixtures', 'taskCatalogSchemas');

function isSchemaDocument(value: unknown): value is SchemaDocument {
    return isJsonObject(value) && typeof value.$id === 'string';
}

function schemaDocuments(): readonly {readonly file: string; readonly schema: SchemaDocument}[] {
    return readdirSync(SCHEMA_ROOT).sort().map((file) => {
        const parsed: unknown = JSON.parse(readFileSync(join(SCHEMA_ROOT, file), 'utf8'));
        if (!isSchemaDocument(parsed)) throw new Error(`invalid schema artifact: ${file}`);
        return {file, schema: parsed};
    });
}

function configuredAjv(): Ajv {
    const ajv = new Ajv({strict: false, allErrors: true});
    for (const document of schemaDocuments()) ajv.addSchema(document.schema);
    return ajv;
}

function expectValid(ajv: Ajv, schemaId: string, value: unknown): void {
    expect(ajv.validate(schemaId, value)).withContext(JSON.stringify(ajv.errors)).toBeTrue();
}

function expectInvalid(ajv: Ajv, schemaId: string, value: unknown): void {
    expect(ajv.validate(schemaId, value)).withContext(JSON.stringify(value)).toBeFalse();
}

describe('task catalog closed schema artifacts', function () {
    it('validates every authoritative source and generated aggregate', function () {
        const ajv = configuredAjv();
        for (const file of readdirSync(join('runtime-nvb', 'catalog', 'capabilities')).sort()) {
            expectValid(ajv, 'watchtower://runtime/schemas/task-catalog-fragment/v1',
                JSON.parse(readFileSync(join('runtime-nvb', 'catalog', 'capabilities', file), 'utf8')));
        }
        expectValid(ajv, 'watchtower://runtime/schemas/lane-task-profile/v1',
            JSON.parse(readFileSync(join('runtime-nvb', 'profiles', 'implementationV1.profile.json'), 'utf8')));
        expectValid(ajv, 'watchtower://runtime/schemas/runtime-nvb-config/v1',
            JSON.parse(readFileSync(join('runtime-nvb', 'runtime-nvb.json'), 'utf8')));
        expectValid(ajv, 'watchtower://runtime/schemas/task-catalog/v1',
            JSON.parse(readFileSync(join('runtime-nvb', 'task-catalog.json'), 'utf8')));
    });

    it('rejects malformed, missing, extra, and unsupported catalog/profile fixtures', function () {
        const ajv = configuredAjv();
        expect(() => JSON.parse(readFileSync(join(FIXTURE_ROOT, 'malformed.json'), 'utf8'))).toThrow();
        const fragment = JSON.parse(readFileSync(
            join('runtime-nvb', 'catalog', 'capabilities', 'scaffold.catalog.json'), 'utf8'
        ));
        const profile = JSON.parse(readFileSync(
            join('runtime-nvb', 'profiles', 'implementationV1.profile.json'), 'utf8'
        ));
        expectInvalid(ajv, 'watchtower://runtime/schemas/task-catalog-fragment/v1',
            JSON.parse(readFileSync(join(FIXTURE_ROOT, 'missing-fragment-field.json'), 'utf8')));
        expectInvalid(ajv, 'watchtower://runtime/schemas/lane-task-profile/v1',
            JSON.parse(readFileSync(join(FIXTURE_ROOT, 'extra-profile-field.json'), 'utf8')));
        expectInvalid(ajv, 'watchtower://runtime/schemas/task-catalog-fragment/v1',
            JSON.parse(readFileSync(join(FIXTURE_ROOT, 'unsupported-fragment-version.json'), 'utf8')));
        expectInvalid(ajv, 'watchtower://runtime/schemas/task-catalog-fragment/v1', {...fragment, extra: true});
        expectInvalid(ajv, 'watchtower://runtime/schemas/lane-task-profile/v1', {...profile, taskIds: 'x'});
    });
});

describe('declared task input and result schemas', function () {
    it('accepts the minimum valid task contracts', function () {
        const ajv = configuredAjv();
        expectValid(ajv, 'watchtower://runtime/schemas/scaffold-message-input/v1', 'hello');
        expectValid(ajv, 'watchtower://runtime/schemas/scaffold-message-result/v1', null);
        expectValid(ajv, 'watchtower://runtime/schemas/task-catalog-composition-input/v1', {mode: 'check'});
        expectValid(ajv, 'watchtower://runtime/schemas/schema-composition-input/v1', {mode: 'write'});
        expectValid(ajv, 'watchtower://runtime/schemas/task-catalog-composition-result/v1', {
            schemaVersion: 1, ok: false, mode: null,
            failure: {code: 'TASK_CATALOG_TASK_INPUT_INVALID', subject: null}
        });
        expectValid(ajv, 'watchtower://runtime/schemas/schema-composition-result/v1', {
            schemaVersion: 1, ok: false, mode: null,
            failure: {code: 'SCHEMA_TASK_INPUT_INVALID', subject: null}
        });
    });

    it('rejects missing, extra, and unsupported task contracts', function () {
        const ajv = configuredAjv();
        for (const id of ['task-catalog-composition-input', 'schema-composition-input']) {
            const schemaId = `watchtower://runtime/schemas/${id}/v1`;
            expectInvalid(ajv, schemaId, {});
            expectInvalid(ajv, schemaId, {mode: 'check', extra: true});
            expectInvalid(ajv, schemaId,
                JSON.parse(readFileSync(join(FIXTURE_ROOT, 'unsupported-task-mode.json'), 'utf8')));
        }
        expectInvalid(ajv, 'watchtower://runtime/schemas/scaffold-message-input/v1', '');
        expectInvalid(ajv, 'watchtower://runtime/schemas/scaffold-message-result/v1', {});
        const rejected = {schemaVersion: 1, ok: false, mode: null,
            failure: {code: 'UNSUPPORTED', subject: null}};
        expectInvalid(ajv, 'watchtower://runtime/schemas/task-catalog-composition-result/v1', rejected);
        expectInvalid(ajv, 'watchtower://runtime/schemas/schema-composition-result/v1', rejected);
    });
});

describe('task catalog staged schema bindings', function () {
    it('binds every schema ID to checksum-verified staged bytes', function () {
        const catalog: unknown = JSON.parse(readFileSync(join('runtime-nvb', 'task-catalog.json'), 'utf8'));
        if (!isJsonObject(catalog) || !isJsonObject(catalog.schemas)) {
            fail('task catalog schema registry is absent');
            return;
        }
        expect(Object.keys(catalog.schemas).sort()).toEqual(schemaDocuments().map((entry) => entry.schema.$id).sort());
        for (const [schemaId, entry] of Object.entries(catalog.schemas)) {
            if (!isJsonObject(entry) || typeof entry.path !== 'string' || typeof entry.sha256 !== 'string') {
                fail(`invalid task catalog schema entry: ${schemaId}`);
                continue;
            }
            const path = join('runtime-nvb', entry.path);
            const bytes = readFileSync(path);
            expect(JSON.parse(bytes.toString('utf8')).$id).toBe(schemaId);
            expect(entry.sha256).toBe(`sha256:${createHash('sha256').update(bytes).digest('hex')}`);
        }
    });
});
