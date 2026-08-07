import type {
    SchemaCompositionResult,
    SchemaFragmentInput
} from '../../../src/foundation/schemaComposition/schemaCompositionContracts.js';

export function composeSchemaFragments(input: unknown): SchemaCompositionResult;
export type {SchemaFragmentInput};

/** CA-12: canonical JSON helpers, mirroring `jsonCanonicalizer.ts`'s public surface. */
export function isJsonObject(value: unknown): value is Record<string, unknown>;
export function isJsonValue(value: unknown): boolean;
export function semanticDigest(value: unknown): string;
