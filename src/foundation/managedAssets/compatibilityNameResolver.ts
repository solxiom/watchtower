/**
 * Compatibility-name resolution (`docs/spec/v1.md` §16.2). A compatibility
 * name is immutable catalog data, never an executable alias, shell text, task
 * override, or project configuration: it only maps a historical coordinator
 * script name to the canonical `wt` action it now resolves to, and only when
 * that action is both declared by the packaged catalog and allowed by the
 * lane's own pinned profile.
 *
 * Correction 01, finding 6: checking only `RuntimeManifestV1.actions` proved
 * the action existed somewhere in the runtime, but not that the *selected*
 * catalog/profile actually allows it. This now resolves through the exact
 * accepted `LaneTaskCatalog.resolveAction` — the same authority `LaneTaskRunner`
 * will use to execute the action — so catalog-absent, dangling, and
 * out-of-profile names are refused by the one accepted profile authority,
 * never a second copy of that check.
 *
 * No accepted predecessor batch has yet classified the legacy script-name
 * inventory into canonical actions (RT-01 explicitly deferred script
 * classification to its later capability owners), so the production table
 * below intentionally starts empty. The resolution mechanism is fully proved
 * against an injected table and a real staged catalog; population is an
 * additive data change for the batch that performs that classification, never
 * a change to this logic. This narrows RT-06's compatibility-name acceptance
 * claim to "mechanism proven, catalog/profile-bound" and is recorded as a
 * formal scope note pending explicit ruling (Correction 01, finding 6).
 */
import {ManagedAssetsError} from '../../contracts/manifests.js';
import {LaneTaskRuntimeError} from '../../contracts/taskRuntime.js';
import type {LaneTaskCatalog} from '../taskRuntime/LaneTaskCatalog.js';

export type CompatibilityNameTable = Readonly<Record<string, string>>;

/** The currently classified production compatibility-name table. */
export const COMPATIBILITY_NAMES: CompatibilityNameTable = Object.freeze({});

/** Resolve `name` through `table`, honoring only catalog/profile-allowed actions. */
export function resolveCompatibilityNameFrom(name: string, table: CompatibilityNameTable, catalog: LaneTaskCatalog): string | null {
    const canonicalAction = table[name];
    if (canonicalAction === undefined) return null;
    try {
        catalog.resolveAction(canonicalAction);
        return canonicalAction;
    } catch (error) {
        if (error instanceof LaneTaskRuntimeError) return null;
        throw error;
    }
}

/** Resolve a historical/alternative action name against the production table. */
export function resolveCompatibilityName(name: string, catalog: LaneTaskCatalog): string | null {
    return resolveCompatibilityNameFrom(name, COMPATIBILITY_NAMES, catalog);
}

/** `resolveCompatibilityName`, raising `COMPATIBILITY_NAME_UNKNOWN` instead of `null`. */
export function requireCompatibilityAction(name: string, catalog: LaneTaskCatalog): string {
    const action = resolveCompatibilityName(name, catalog);
    if (action === null) {
        throw new ManagedAssetsError('COMPATIBILITY_NAME_UNKNOWN', name,
            'The compatibility name is unrecognized, or its canonical action is not declared by the pinned catalog/profile.');
    }
    return action;
}
