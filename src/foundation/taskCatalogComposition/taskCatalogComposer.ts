import {isJsonObject} from '../schemaComposition/jsonCanonicalizer.js';
import type {
    CatalogSourceInput,
    ParsedCatalogFragment,
    ParsedLaneTaskProfile,
    TaskCatalogCompositionFailure,
    TaskCatalogCompositionResult
} from './taskCatalogContracts.js';
import {validateCatalogSources} from './catalogParsing.js';
import {parseCatalogFragment} from './catalogFragmentParser.js';
import {parseLaneTaskProfile} from './laneTaskProfileParser.js';
import {orderCatalogFragments} from './catalogFragmentOrder.js';
import {collectCatalogFragments} from './catalogCollections.js';
import {validateCatalogReferences, validateProfiles} from './catalogReferenceValidator.js';
import {buildCatalogAggregates} from './catalogAggregateBuilder.js';
import {parseCatalogSchemas, validateCatalogSchemaReferences} from './catalogSchemaRegistry.js';

function rejected(failure: TaskCatalogCompositionFailure): TaskCatalogCompositionResult {
    return {ok: false, failure};
}

function parseFragments(inputs: readonly CatalogSourceInput[]):
    ParsedCatalogFragment[] | TaskCatalogCompositionFailure {
    const fragments: ParsedCatalogFragment[] = [];
    for (const input of inputs) {
        const fragment = parseCatalogFragment(input);
        if ('code' in fragment) {
            return fragment;
        }
        fragments.push(fragment);
    }
    return fragments;
}

function parseProfiles(inputs: readonly CatalogSourceInput[]):
    ParsedLaneTaskProfile[] | TaskCatalogCompositionFailure {
    const profiles: ParsedLaneTaskProfile[] = [];
    for (const input of inputs) {
        const profile = parseLaneTaskProfile(input);
        if ('code' in profile) {
            return profile;
        }
        profiles.push(profile);
    }
    return profiles;
}

export function composeTaskCatalog(input: unknown): TaskCatalogCompositionResult {
    if (!isJsonObject(input) || Object.keys(input).sort().join(',') !== 'fragments,profiles,schemas') {
        return rejected({
            code: 'TASK_CATALOG_COMPOSITION_INPUT_INVALID', source: null,
            subject: null, conflictingSource: null
        });
    }
    const fragmentInputs = validateCatalogSources(input.fragments, 'fragments');
    const profileInputs = validateCatalogSources(input.profiles, 'profiles');
    const schemaInputs = validateCatalogSources(input.schemas, 'schemas');
    if (!Array.isArray(fragmentInputs)) return rejected(fragmentInputs);
    if (!Array.isArray(profileInputs)) return rejected(profileInputs);
    if (!Array.isArray(schemaInputs)) return rejected(schemaInputs);
    const fragments = parseFragments(fragmentInputs);
    if (!Array.isArray(fragments)) return rejected(fragments);
    const profiles = parseProfiles(profileInputs);
    if (!Array.isArray(profiles)) return rejected(profiles);
    const schemas = parseCatalogSchemas(schemaInputs);
    if (!Array.isArray(schemas)) return rejected(schemas);
    const ordered = orderCatalogFragments(fragments);
    if (!Array.isArray(ordered)) return rejected(ordered);
    const collections = collectCatalogFragments(ordered);
    if ('code' in collections) return rejected(collections);
    const referenceFailure = validateCatalogReferences(collections) ??
        validateProfiles(profiles, collections) ?? validateCatalogSchemaReferences(schemas, collections);
    return referenceFailure === null ? buildCatalogAggregates(ordered, profiles, schemas, collections) :
        rejected(referenceFailure);
}
