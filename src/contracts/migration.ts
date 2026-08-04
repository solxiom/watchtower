/** UK-02 closed migration registry/staging/preservation contracts. */
import type {JsonValue} from './types.js';

export type SchemaVersion = number;

/** A single named artifact carried through a migration: 'json' values compare deep-structurally, 'bytes' compare byte-for-byte. */
export interface MigrationSnapshotEntry {
    readonly kind: 'json' | 'bytes';
    readonly value: JsonValue | Uint8Array;
}

/** A closed, capability-supplied set of named lane-owned artifacts staged through a migration plan. */
export type MigrationSnapshot = Readonly<Record<string, MigrationSnapshotEntry>>;

/** Declares which snapshot entries a migration step guarantees remain byte/deep-identical across its rebuild. */
export interface PreservationPolicy {
    readonly protectedEntries: readonly string[];
}

export interface MigrationRebuildContext {
    readonly fromSchemaVersion: SchemaVersion;
    readonly toSchemaVersion: SchemaVersion;
}

/**
 * Capability-owned pure rebuild adapter for exactly one accepted schema transition. It receives the
 * validated snapshot and returns the rebuilt snapshot; it must not perform I/O, close sessions, prune
 * content, or change lifecycle state.
 */
export type MigrationRebuildAdapter = (input: MigrationSnapshot, context: MigrationRebuildContext) => MigrationSnapshot;

export interface MigrationStepDefinition {
    readonly id: string;
    readonly fromSchemaVersion: SchemaVersion;
    readonly toSchemaVersion: SchemaVersion;
    readonly preservation: PreservationPolicy;
    readonly rebuild: MigrationRebuildAdapter;
}

export interface MigrationStagingPlan {
    readonly fromSchemaVersion: SchemaVersion;
    readonly toSchemaVersion: SchemaVersion;
    readonly steps: readonly MigrationStepDefinition[];
}

export interface MigrationStageResult {
    readonly fromSchemaVersion: SchemaVersion;
    readonly toSchemaVersion: SchemaVersion;
    readonly appliedStepIds: readonly string[];
    readonly snapshot: MigrationSnapshot;
}

export interface MigrationRegistryOptions {
    /** The complete closed set of schema versions this registry may plan across. No fictional version is accepted. */
    readonly acceptedSchemaVersions: readonly SchemaVersion[];
    /** The complete closed, capability-supplied step set. Empty when no accepted schema transition exists yet. */
    readonly steps: readonly MigrationStepDefinition[];
}

export const MIGRATION_REGISTRY_REASONS = Object.freeze({
    UNSUPPORTED_VERSION: 'ERR_UNSUPPORTED_VERSION',
    INVALID_ARGUMENT: 'ERR_INVALID_ARGUMENT',
    INTEGRITY_FAILURE: 'ERR_INTEGRITY_FAILURE'
} as const);
