export const RUNTIME_KNOWLEDGE_MANIFEST_REASONS = [
  "MANIFEST_SCHEMA_INVALID",
  "MANIFEST_IDENTITY_INVALID",
  "MANIFEST_ASSET_MISSING",
  "MANIFEST_ASSET_EXTRA",
  "MANIFEST_ASSET_CHECKSUM_MISMATCH",
  "MANIFEST_ASSET_MODE_MISMATCH",
  "MANIFEST_ACTION_MISSING",
  "MANIFEST_ACTION_EXTRA",
  "MANIFEST_ASSET_DUPLICATE",
  "MANIFEST_ACTION_DUPLICATE",
  "MANIFEST_PROVENANCE_UNACCEPTED",
  "MANIFEST_COMPATIBILITY_INVALID",
] as const;

export type RuntimeKnowledgeManifestReason =
  (typeof RUNTIME_KNOWLEDGE_MANIFEST_REASONS)[number];
export type ManifestAssetMode = "0644" | "0755";

export interface ManifestAsset {
  readonly path: string;
  readonly sha256: `sha256:${string}`;
  readonly mode: ManifestAssetMode;
}

export interface RuntimeManifestV1 {
  readonly schemaVersion: 1;
  readonly manifestId: "watchtower-runtime/v1";
  readonly runtimeVersion: string;
  readonly minimumCliVersion: string;
  readonly compatibleLaneSchemaVersions: readonly [1];
  readonly compatibleKnowledgeVersions: readonly string[];
  readonly assets: readonly ManifestAsset[];
  readonly actions: readonly string[];
  readonly requiredCommands: readonly string[];
}

export interface KnowledgeManifestV1 {
  readonly schemaVersion: 1;
  readonly manifestId: "watchtower-knowledge/v1";
  readonly knowledgeVersion: string;
  readonly compatibleRuntimeVersions: readonly string[];
  readonly provenance: {
    readonly repository: string;
    readonly commit: string;
    readonly importRecordSha256: `sha256:${string}`;
  };
  readonly assets: readonly ManifestAsset[];
}

export type RuntimeKnowledgeManifestV1 =
  | RuntimeManifestV1
  | KnowledgeManifestV1;

export interface ManifestAssetObservation {
  readonly path: string;
  readonly sha256: `sha256:${string}`;
  readonly mode: ManifestAssetMode;
}

export interface ManifestVerificationFailure {
  readonly ok: false;
  readonly reason: RuntimeKnowledgeManifestReason;
  readonly subject: string;
}

export interface ManifestVerificationSuccess {
  readonly ok: true;
}
export type ManifestVerificationResult =
  | ManifestVerificationSuccess
  | ManifestVerificationFailure;
export interface KnowledgeProvenanceEvidence {
  readonly repository: string;
  readonly commit: string;
  readonly importRecordSha256: `sha256:${string}`;
}

export class RuntimeKnowledgeManifestError extends Error {
  constructor(
    readonly reason: RuntimeKnowledgeManifestReason,
    readonly subject: string,
    message: string,
  ) {
    super(message);
  }
}
