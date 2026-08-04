/** UK-01 read-only upgrade preview contracts. */
import type {InstallManifestV1, ManagedAssetDeclaration} from './manifests.js';
import type {KnowledgeManifestV1, RuntimeManifestV1} from './runtimeKnowledgeManifests.js';

export type AssetClassification = 'preserved' | 'changed' | 'added' | 'removed' | 'conflict';
export interface UpgradeAssetDeclaration extends ManagedAssetDeclaration {}
export interface AssetClassificationEntry {
    readonly path: string;
    readonly classification: AssetClassification;
    readonly currentSha256: string | null;
    readonly targetSha256: string | null;
    readonly currentTarget: string | null;
    readonly targetTarget: string | null;
}
export interface SchemaCompatibility {
    readonly laneSchemaVersion: number;
    readonly supportedLaneSchemaVersions: readonly number[];
    readonly compatible: boolean;
}
export interface RuntimeKnowledgeCompatibility {
    readonly runtimeVersion: string;
    readonly knowledgeVersion: string;
    readonly runtimeCompatibleKnowledgeVersions: readonly string[];
    readonly knowledgeCompatibleRuntimeVersions: readonly string[];
    readonly compatible: boolean;
}
export interface CompatibilityMatrix {
    readonly assets: readonly AssetClassificationEntry[];
    readonly runtimeKnowledge: RuntimeKnowledgeCompatibility;
    readonly schema: SchemaCompatibility;
}
export interface UpgradePlan {
    readonly from: {readonly runtimeVersion: string; readonly knowledgeVersion: string; readonly laneSchemaVersion: number};
    readonly to: {readonly runtimeVersion: string; readonly knowledgeVersion: string};
    readonly applied: false;
    readonly changed: readonly AssetClassificationEntry[];
    readonly unchanged: readonly AssetClassificationEntry[];
    readonly preserved: readonly AssetClassificationEntry[];
    readonly migrated: readonly string[];
    readonly conflicts: readonly AssetClassificationEntry[];
    readonly added: readonly AssetClassificationEntry[];
    readonly removed: readonly AssetClassificationEntry[];
    readonly matrix: CompatibilityMatrix;
}
export interface UpgradePlannerInput {
    readonly laneDir: string;
    readonly laneSchemaVersion: number;
    readonly currentInstall: InstallManifestV1;
    readonly targetRuntime: RuntimeManifestV1;
    readonly targetKnowledge: KnowledgeManifestV1;
    readonly targetManagedAssets?: Readonly<Record<string, UpgradeAssetDeclaration>>;
    readonly currentRuntimeRoot?: string;
    readonly targetRuntimeRoot?: string;
}
