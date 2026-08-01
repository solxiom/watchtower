import {composeSchemaFragments} from '../../src/foundation/schemaComposition/index.js';
import type {
    JsonObject,
    SchemaCompositionFailureCode,
    SchemaCompositionResult,
    SchemaFragmentInput
} from '../../src/foundation/schemaComposition/index.js';

const encoder = new TextEncoder();

function fragment(
    source: string,
    id: string,
    content: JsonObject,
    includes: readonly string[] = []
): SchemaFragmentInput {
    return {
        source,
        bytes: encoder.encode(JSON.stringify({
            'x-watchtower-fragment': {schemaVersion: 1, id, includes},
            ...content
        }))
    };
}

function root(content: JsonObject = {}): SchemaFragmentInput {
    return fragment('root.schema.json', 'test.root', {
        '$schema': 'https://json-schema.org/draft/2020-12/schema',
        '$id': 'https://example.test/schema.json',
        '$ref': '#/$defs/result',
        ...content
    }, ['test.definitions']);
}

function definitions(content: JsonObject = {}): SchemaFragmentInput {
    return fragment('definitions.schema.json', 'test.definitions', {
        '$defs': {result: {type: 'object'}, ...content}
    });
}

function failureCode(result: SchemaCompositionResult): SchemaCompositionFailureCode | null {
    return result.ok ? null : result.failure.code;
}

describe('deterministic schema composer', function () {
    it('returns byte-identical aggregate bytes and digest independent of input order', function () {
        const first = composeSchemaFragments([root(), definitions()]);
        const second = composeSchemaFragments([definitions(), root()]);

        expect(first.ok).toBeTrue();
        expect(second.ok).toBeTrue();
        if (!first.ok || !second.ok) {
            return;
        }
        expect([...first.aggregateBytes]).toEqual([...second.aggregateBytes]);
        expect(first.semanticDigest).toBe(second.semanticDigest);
        expect(first.fragmentIds).toEqual(['test.definitions', 'test.root']);
        expect(first.definitionNames).toEqual(['result']);
        expect(new TextDecoder().decode(first.aggregateBytes).endsWith('\n')).toBeTrue();
    });
});

describe('schema fragment parsing', function () {
    it('rejects malformed outer values, source paths, bytes, JSON, and metadata in order', function () {
        expect(failureCode(composeSchemaFragments(null))).toBe('SCHEMA_COMPOSITION_INPUT_INVALID');
        expect(failureCode(composeSchemaFragments([]))).toBe('SCHEMA_COMPOSITION_INPUT_INVALID');
        expect(failureCode(composeSchemaFragments([{source: '../bad', bytes: encoder.encode('{}')}]))).
            toBe('SCHEMA_FRAGMENT_SOURCE_INVALID');
        expect(failureCode(composeSchemaFragments([{source: 'bad.json', bytes: new Uint8Array()}]))).
            toBe('SCHEMA_FRAGMENT_BYTES_INVALID');
        expect(failureCode(composeSchemaFragments([
            {source: 'bad.json', bytes: encoder.encode('{')}
        ]))).toBe('SCHEMA_FRAGMENT_JSON_INVALID');
        expect(failureCode(composeSchemaFragments([
            {source: 'bad.json', bytes: encoder.encode('[]')}
        ]))).toBe('SCHEMA_FRAGMENT_ROOT_INVALID');
        expect(failureCode(composeSchemaFragments([
            {source: 'bad.json', bytes: encoder.encode(
                '{"x-watchtower-fragment":{"schemaVersion":1,"id":"ok","includes":[]},"$defs":{},"$defs":{}}'
            )}
        ]))).toBe('SCHEMA_FRAGMENT_PROPERTY_DUPLICATE');
        expect(failureCode(composeSchemaFragments([
            fragment('bad.json', 'ok', {title: '\ud800'})
        ]))).toBe('SCHEMA_FRAGMENT_ROOT_INVALID');
        expect(failureCode(composeSchemaFragments([
            {source: 'bad.json', bytes: encoder.encode(JSON.stringify({
                'x-watchtower-fragment': {schemaVersion: 1, id: 'ok', includes: [], extra: true}
            }))}
        ]))).toBe('SCHEMA_FRAGMENT_METADATA_INVALID');
    });
});

describe('schema composition failure ordering', function () {
    it('reports the lexicographically first malformed fragment before composition failures', function () {
        const duplicate = fragment('z.schema.json', 'test.definitions', {'$defs': {result: {type: 'null'}}});
        const malformed = {source: 'a.schema.json', bytes: encoder.encode('{')};
        const result = composeSchemaFragments([root(), definitions(), duplicate, malformed]);

        expect(failureCode(result)).toBe('SCHEMA_FRAGMENT_JSON_INVALID');
        if (!result.ok) {
            expect(result.failure.source).toBe('a.schema.json');
        }
    });
});

describe('schema fragment graph and merge validation', function () {
    it('rejects duplicate fragment identities and duplicate definitions', function () {
        const duplicateIdentity = fragment('other.schema.json', 'test.definitions', {'$defs': {other: {}}});
        const identityResult = composeSchemaFragments([root(), definitions(), duplicateIdentity]);
        expect(failureCode(identityResult)).toBe('SCHEMA_FRAGMENT_ID_DUPLICATE');

        const duplicateDefinition = fragment('other.schema.json', 'test.other', {
            '$defs': {result: {type: 'string'}}
        });
        const definitionResult = composeSchemaFragments([root(), definitions(), duplicateDefinition]);
        expect(failureCode(definitionResult)).toBe('SCHEMA_DEFINITION_DUPLICATE');
        if (!definitionResult.ok) {
            expect(definitionResult.failure.subject).toBe('result');
        }
    });
});

describe('schema fragment inclusion validation', function () {
    it('rejects missing and circular fragment inclusion', function () {
        const missing = fragment('root.schema.json', 'test.root', {
            '$schema': 'https://json-schema.org/draft/2020-12/schema'
        }, ['test.missing']);
        expect(failureCode(composeSchemaFragments([missing]))).toBe('SCHEMA_FRAGMENT_INCLUDE_MISSING');

        const left = fragment('left.schema.json', 'test.left', {}, ['test.right']);
        const right = fragment('right.schema.json', 'test.right', {}, ['test.left']);
        expect(failureCode(composeSchemaFragments([left, right]))).toBe('SCHEMA_FRAGMENT_INCLUDE_CIRCULAR');
    });
});

describe('schema root metadata validation', function () {
    it('rejects conflicting root metadata but permits byte-equivalent repeated metadata', function () {
        const conflicting = fragment('conflict.schema.json', 'test.conflict', {
            '$id': 'https://example.test/other.json'
        });
        expect(failureCode(composeSchemaFragments([root(), definitions(), conflicting]))).
            toBe('SCHEMA_ROOT_CONFLICT');

        const repeated = fragment('repeat.schema.json', 'test.repeat', {
            title: 'same'
        });
        const titledRoot = root({title: 'same'});
        expect(composeSchemaFragments([titledRoot, definitions(), repeated]).ok).toBeTrue();
    });

    it('requires the complete draft-2020-12 root metadata contract', function () {
        const noReference = fragment('root.schema.json', 'test.root', {
            '$schema': 'https://json-schema.org/draft/2020-12/schema',
            '$id': 'https://example.test/schema.json'
        });
        expect(failureCode(composeSchemaFragments([noReference]))).
            toBe('SCHEMA_ROOT_REQUIRED_KEY_MISSING');

        const wrongDraft = root({'$schema': 'http://json-schema.org/draft-07/schema#'});
        expect(failureCode(composeSchemaFragments([wrongDraft, definitions()]))).
            toBe('SCHEMA_ROOT_CONFLICT');
    });
});
