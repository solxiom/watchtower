import type {
    ParsedCatalogFragment,
    TaskCatalogCompositionFailure
} from './taskCatalogContracts.js';
import {catalogFailure} from './catalogParsing.js';

interface VisitState {
    readonly byId: ReadonlyMap<string, ParsedCatalogFragment>;
    readonly ordered: ParsedCatalogFragment[];
    readonly visiting: Set<string>;
    readonly visited: Set<string>;
}

function visitFragment(
    fragment: ParsedCatalogFragment,
    state: VisitState
): TaskCatalogCompositionFailure | null {
    if (state.visiting.has(fragment.fragmentId)) {
        return catalogFailure('TASK_CATALOG_INCLUDE_CIRCULAR', fragment.source, fragment.fragmentId);
    }
    if (state.visited.has(fragment.fragmentId)) {
        return null;
    }
    state.visiting.add(fragment.fragmentId);
    for (const includedId of fragment.includes) {
        const included = state.byId.get(includedId);
        if (included === undefined) {
            return catalogFailure('TASK_CATALOG_INCLUDE_MISSING', fragment.source, includedId);
        }
        const failure = visitFragment(included, state);
        if (failure !== null) {
            return failure;
        }
    }
    state.visiting.delete(fragment.fragmentId);
    state.visited.add(fragment.fragmentId);
    state.ordered.push(fragment);
    return null;
}

export function orderCatalogFragments(fragments: readonly ParsedCatalogFragment[]):
    ParsedCatalogFragment[] | TaskCatalogCompositionFailure {
    const byId = new Map<string, ParsedCatalogFragment>();
    for (const fragment of fragments) {
        const existing = byId.get(fragment.fragmentId);
        if (existing !== undefined) {
            return catalogFailure(
                'TASK_CATALOG_FRAGMENT_ID_DUPLICATE', fragment.source, fragment.fragmentId, existing.source
            );
        }
        byId.set(fragment.fragmentId, fragment);
    }
    const state: VisitState = {
        byId, ordered: [], visiting: new Set<string>(), visited: new Set<string>()
    };
    for (const fragment of [...fragments].sort((left, right) =>
        left.fragmentId.localeCompare(right.fragmentId))) {
        const failure = visitFragment(fragment, state);
        if (failure !== null) {
            return failure;
        }
    }
    return state.ordered;
}
