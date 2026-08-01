import {composeSchemaFragments} from '../../src/foundation/schemaComposition/index.js';
import type {JsonObject, JsonValue, SchemaCompositionResult, SchemaFragmentInput} from
    '../../src/foundation/schemaComposition/index.js';

const encoder = new TextEncoder();

function schema(reference: JsonValue, definitions: JsonObject = {result: {type: 'object'}}): SchemaFragmentInput[] {
    return [
        makeFragment('root.schema.json', 'test.root', {
            '$schema': 'https://json-schema.org/draft/2020-12/schema',
            '$id': 'https://example.test/schema.json',
            '$ref': reference
        }, ['test.definitions']),
        makeFragment('definitions.schema.json', 'test.definitions', {'$defs': definitions})
    ];
}

function makeFragment(
    source: string,
    id: string,
    content: JsonObject,
    includes: readonly string[] = []
): SchemaFragmentInput {
    return {source, bytes: encoder.encode(JSON.stringify({
        'x-watchtower-fragment': {schemaVersion: 1, id, includes}, ...content
    }))};
}

function code(result: SchemaCompositionResult): string | null {
    return result.ok ? null : result.failure.code;
}

describe('schema reference validation', function () {
    it('accepts resolved local root, object, array, and escaped-token pointers', function () {
        expect(composeSchemaFragments(schema('#')).ok).toBeTrue();
        expect(composeSchemaFragments(schema('#/$defs/result')).ok).toBeTrue();
        expect(composeSchemaFragments(schema('#/$defs/result/items/0', {
            result: {items: [{type: 'string'}]}
        })).ok).toBeTrue();
        expect(composeSchemaFragments(schema('#/$defs/a~1b', {'a/b': {type: 'null'}})).ok).toBeTrue();
    });

    it('rejects a non-string reference before resolution', function () {
        expect(code(composeSchemaFragments(schema('#/$defs/result', {
            result: {nested: {'$ref': 42}}
        })))).toBe('SCHEMA_REFERENCE_INVALID');
    });
});

describe('schema reference refusal', function () {
    it('rejects external, traversal-like, encoded, and malformed-pointer references', function () {
        for (const reference of [
            'https://example.test/schema.json', '../schema.json', '#/$defs/../result',
            '#/$defs/%72esult', '#/$defs/a~2b'
        ]) {
            expect({reference, code: code(composeSchemaFragments(schema(reference)))})
                .toEqual({reference, code: 'SCHEMA_REFERENCE_ESCAPES'});
        }
    });

    it('rejects unresolved object properties and array indexes', function () {
        for (const reference of ['#/$defs/missing', '#/$defs/result/items/1']) {
            const definitions = reference.endsWith('/1') ? {result: {items: [{type: 'string'}]}} : undefined;
            expect(code(composeSchemaFragments(schema(reference, definitions)))).
                toBe('SCHEMA_REFERENCE_UNRESOLVED');
        }
    });

    it('validates nested references in stable sorted-property order', function () {
        const nested = schema('#/$defs/result', {
            result: {
                z: {'$ref': '#/$defs/z-missing'},
                a: {'$ref': '../escape'}
            }
        });
        expect(code(composeSchemaFragments(nested))).toBe('SCHEMA_REFERENCE_ESCAPES');
    });
});
