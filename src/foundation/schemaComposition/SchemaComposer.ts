import type {
    JsonObject,
    JsonValue,
    ParsedSchemaFragment,
    SchemaCompositionFailure,
    SchemaCompositionResult
} from './schemaCompositionContracts.js';
import {
    canonicalJson,
    defineOwnJsonProperty,
    formattedCanonicalJson,
    isJsonObject,
    semanticDigest
} from './jsonCanonicalizer.js';
import {parseSchemaFragment, validateFragmentInputs} from './schemaFragmentParser.js';
import {validateSchemaReferences} from './schemaReferenceValidator.js';

const REQUIRED_ROOT: Readonly<Record<string, 'object' | 'string'>> = {
    '$defs': 'object', '$id': 'string', '$ref': 'string', '$schema': 'string'
};

interface FragmentVisitState {
    readonly byId: ReadonlyMap<string, ParsedSchemaFragment>;
    readonly ordered: ParsedSchemaFragment[];
    readonly visiting: Set<string>;
    readonly visited: Set<string>;
}

function rejected(failure: SchemaCompositionFailure): SchemaCompositionResult {
    return {ok: false, failure};
}

function failure(
    code: SchemaCompositionFailure['code'],
    source: string | null,
    subject: string | null,
    conflictingSource: string | null = null
): SchemaCompositionFailure {
    return {code, source, subject, conflictingSource};
}

function orderFragments(fragments: readonly ParsedSchemaFragment[]):
    ParsedSchemaFragment[] | SchemaCompositionFailure {
    const byId = new Map<string, ParsedSchemaFragment>();
    for (const fragment of fragments) {
        const previous = byId.get(fragment.id);
        if (previous !== undefined) {
            return failure('SCHEMA_FRAGMENT_ID_DUPLICATE', fragment.source, fragment.id, previous.source);
        }
        byId.set(fragment.id, fragment);
    }
    const state: FragmentVisitState = {
        byId, ordered: [], visiting: new Set<string>(), visited: new Set<string>()
    };
    for (const fragment of [...fragments].sort((left, right) => left.id.localeCompare(right.id))) {
        const visitFailure = visitFragment(fragment, state);
        if (visitFailure !== null) {
            return visitFailure;
        }
    }
    return state.ordered;
}

function visitFragment(
    fragment: ParsedSchemaFragment,
    state: FragmentVisitState
): SchemaCompositionFailure | null {
    if (state.visiting.has(fragment.id)) {
        return failure('SCHEMA_FRAGMENT_INCLUDE_CIRCULAR', fragment.source, fragment.id);
    }
    if (state.visited.has(fragment.id)) {
        return null;
    }
    state.visiting.add(fragment.id);
    for (const includedId of fragment.includes) {
        const included = state.byId.get(includedId);
        if (included === undefined) {
            return failure('SCHEMA_FRAGMENT_INCLUDE_MISSING', fragment.source, includedId);
        }
        const includedFailure = visitFragment(included, state);
        if (includedFailure !== null) {
            return includedFailure;
        }
    }
    state.visiting.delete(fragment.id);
    state.visited.add(fragment.id);
    state.ordered.push(fragment);
    return null;
}

function mergeFragments(fragments: readonly ParsedSchemaFragment[]):
    {readonly root: JsonObject} | {readonly failure: SchemaCompositionFailure} {
    const aggregate: {[key: string]: JsonValue} = {};
    const definitions: {[key: string]: JsonValue} = {};
    const rootOwners = new Map<string, string>();
    const definitionOwners = new Map<string, string>();
    for (const fragment of fragments) {
        for (const [key, value] of Object.entries(fragment.content)) {
            if (key === '$defs') {
                if (!isJsonObject(value)) {
                    return {failure: failure('SCHEMA_FRAGMENT_ROOT_INVALID', fragment.source, '$defs')};
                }
                for (const definition of Object.keys(value).sort()) {
                    const previous = definitionOwners.get(definition);
                    if (previous !== undefined) {
                        return {failure: failure(
                            'SCHEMA_DEFINITION_DUPLICATE', fragment.source, definition, previous
                        )};
                    }
                    definitionOwners.set(definition, fragment.source);
                    defineOwnJsonProperty(definitions, definition, value[definition]);
                }
                continue;
            }
            const previous = rootOwners.get(key);
            if (previous !== undefined && canonicalJson(aggregate[key]) !== canonicalJson(value)) {
                return {failure: failure('SCHEMA_ROOT_CONFLICT', fragment.source, key, previous)};
            }
            if (previous === undefined) {
                defineOwnJsonProperty(aggregate, key, value);
                rootOwners.set(key, fragment.source);
            }
        }
    }
    defineOwnJsonProperty(aggregate, '$defs', definitions);
    return {root: aggregate};
}

function validateRequiredRoot(root: JsonObject): SchemaCompositionFailure | null {
    for (const [key, type] of Object.entries(REQUIRED_ROOT)) {
        const value = root[key];
        const valid = type === 'object' ? isJsonObject(value) :
            typeof value === 'string' && value.length > 0;
        if (!valid) {
            return failure('SCHEMA_ROOT_REQUIRED_KEY_MISSING', null, key);
        }
    }
    if (root.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
        return failure('SCHEMA_ROOT_CONFLICT', null, '$schema');
    }
    return null;
}

export function composeSchemaFragments(input: unknown): SchemaCompositionResult {
    const inputs = validateFragmentInputs(input);
    if (!Array.isArray(inputs)) {
        return rejected(inputs);
    }
    const fragments = parseFragments(inputs);
    if (!Array.isArray(fragments)) {
        return rejected(fragments);
    }
    const ordered = orderFragments(fragments);
    if (!Array.isArray(ordered)) {
        return rejected(ordered);
    }
    const merged = mergeFragments(ordered);
    if ('failure' in merged) {
        return rejected(merged.failure);
    }
    const aggregate = merged.root;
    const rootFailure = validateRequiredRoot(aggregate);
    if (rootFailure !== null) {
        return rejected(rootFailure);
    }
    const referenceFailure = validateSchemaReferences(aggregate);
    if (referenceFailure !== null) {
        return rejected(referenceFailure);
    }
    const definitions = aggregate.$defs;
    if (!isJsonObject(definitions)) {
        return rejected(failure('SCHEMA_ROOT_REQUIRED_KEY_MISSING', null, '$defs'));
    }
    return {
        ok: true,
        aggregateBytes: new TextEncoder().encode(formattedCanonicalJson(aggregate)),
        semanticDigest: semanticDigest(aggregate),
        fragmentIds: ordered.map((fragment) => fragment.id),
        definitionNames: Object.keys(definitions).sort()
    };
}

function parseFragments(inputs: ReturnType<typeof validateFragmentInputs>):
    ParsedSchemaFragment[] | SchemaCompositionFailure {
    if (!Array.isArray(inputs)) {
        return inputs;
    }
    const fragments: ParsedSchemaFragment[] = [];
    for (const input of inputs) {
        const fragment = parseSchemaFragment(input);
        if ('code' in fragment) {
            return fragment;
        }
        fragments.push(fragment);
    }
    return fragments;
}
