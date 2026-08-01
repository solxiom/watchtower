import {composeSchemaFragments} from '../../src/foundation/schemaComposition/index.js';
import type {
    JsonObject,
    SchemaCompositionSuccess,
    SchemaFragmentInput
} from '../../src/foundation/schemaComposition/index.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodedFragment(source: string, content: string): SchemaFragmentInput {
    return {source, bytes: encoder.encode(content)};
}

function specialPropertyFragments(marker: string): readonly SchemaFragmentInput[] {
    return [
        encodedFragment('root.schema.json', `{
            "x-watchtower-fragment":{"schemaVersion":1,"id":"test.root","includes":["test.defs"]},
            "$schema":"https://json-schema.org/draft/2020-12/schema",
            "$id":"https://example.test/special.json","$ref":"#/$defs/__proto__",
            "__proto__":{"rootMarker":"root-value"}
        }`),
        encodedFragment('definitions.schema.json', `{
            "x-watchtower-fragment":{"schemaVersion":1,"id":"test.defs","includes":[]},
            "$defs":{"__proto__":{"type":"object","properties":{
                "nested":{"type":"object","__proto__":{"marker":"${marker}"}}
            }}}
        }`)
    ];
}

function expectSuccess(result: ReturnType<typeof composeSchemaFragments>): SchemaCompositionSuccess {
    expect(result.ok).toBeTrue();
    if (!result.ok) {
        throw new Error(result.failure.code);
    }
    return result;
}

function parseAggregate(result: SchemaCompositionSuccess): JsonObject {
    const parsed: unknown = JSON.parse(decoder.decode(result.aggregateBytes));
    if (!isJsonObject(parsed)) {
        throw new Error('aggregate is not an object');
    }
    return parsed;
}

function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

describe('JSON special-property preservation', function () {
    it('retains __proto__ as an own root, definition, and nested schema property', function () {
        const result = expectSuccess(composeSchemaFragments(specialPropertyFragments('first')));
        const aggregate = parseAggregate(result);
        const definitions = aggregate.$defs;

        expect(Object.hasOwn(aggregate, '__proto__')).toBeTrue();
        expect(isJsonObject(definitions)).toBeTrue();
        if (!isJsonObject(definitions)) {
            return;
        }
        const protoDefinition = definitions.__proto__;
        expect(Object.hasOwn(definitions, '__proto__')).toBeTrue();
        expect(isJsonObject(protoDefinition)).toBeTrue();
        if (!isJsonObject(protoDefinition) || !isJsonObject(protoDefinition.properties) ||
            !isJsonObject(protoDefinition.properties.nested)) {
            return;
        }
        expect(Object.hasOwn(protoDefinition.properties.nested, '__proto__')).toBeTrue();
        expect(result.definitionNames).toEqual(['__proto__']);
    });

    it('keeps bytes and digest stable by order and replay while covering special-key values', function () {
        const fragments = specialPropertyFragments('first');
        const first = expectSuccess(composeSchemaFragments(fragments));
        const reversed = expectSuccess(composeSchemaFragments([...fragments].reverse()));
        const replay = expectSuccess(composeSchemaFragments(fragments));
        const changed = expectSuccess(composeSchemaFragments(specialPropertyFragments('changed')));

        expect([...first.aggregateBytes]).toEqual([...reversed.aggregateBytes]);
        expect([...first.aggregateBytes]).toEqual([...replay.aggregateBytes]);
        expect(first.semanticDigest).toBe(reversed.semanticDigest);
        expect(first.semanticDigest).toBe(replay.semanticDigest);
        expect([...changed.aggregateBytes]).not.toEqual([...first.aggregateBytes]);
        expect(changed.semanticDigest).not.toBe(first.semanticDigest);
    });
});
