import type {
  KnowledgeManifestV1,
  KnowledgeProvenanceEvidence,
  ManifestAssetObservation,
  ManifestVerificationResult,
  RuntimeManifestV1,
  RuntimeKnowledgeManifestV1,
} from "../../../contracts/runtimeKnowledgeManifests.js";
import {
  parseKnowledgeManifest,
  parseRuntimeManifest,
} from "./manifestDocumentParser.js";

export class RuntimeKnowledgeManifestValidator {
  validateRuntime(value: unknown): RuntimeManifestV1 {
    return parseRuntimeManifest(value);
  }
  validateKnowledge(value: unknown): KnowledgeManifestV1 {
    return parseKnowledgeManifest(value);
  }
  verifyAssets(
    manifest: RuntimeKnowledgeManifestV1,
    observed: readonly ManifestAssetObservation[],
  ): ManifestVerificationResult {
    const paths = observed.map((item) => item.path);
    const duplicatePath = duplicate(paths);
    if (duplicatePath)
      return failure("MANIFEST_ASSET_DUPLICATE", duplicatePath);
    const actual = new Map(observed.map((item) => [item.path, item]));
    for (const asset of manifest.assets) {
      const item = actual.get(asset.path);
      if (!item) return failure("MANIFEST_ASSET_MISSING", asset.path);
      if (item.sha256 !== asset.sha256)
        return failure("MANIFEST_ASSET_CHECKSUM_MISMATCH", asset.path);
      if (item.mode !== asset.mode)
        return failure("MANIFEST_ASSET_MODE_MISMATCH", asset.path);
      actual.delete(asset.path);
    }
    const extra = actual.keys().next();
    return extra.done
      ? { ok: true }
      : failure("MANIFEST_ASSET_EXTRA", extra.value);
  }
  verifyActions(
    manifest: RuntimeManifestV1,
    observed: readonly string[],
  ): ManifestVerificationResult {
    const item = duplicate(observed);
    if (item) return failure("MANIFEST_ACTION_DUPLICATE", item);
    return compare(manifest.actions, observed);
  }
  verifyKnowledgeProvenance(
    manifest: KnowledgeManifestV1,
    accepted: KnowledgeProvenanceEvidence,
  ): ManifestVerificationResult {
    const item = manifest.provenance;
    return item.repository === accepted.repository &&
      item.commit === accepted.commit &&
      item.importRecordSha256 === accepted.importRecordSha256
      ? { ok: true }
      : failure("MANIFEST_PROVENANCE_UNACCEPTED", "provenance");
  }
  verifyCompatibility(
    runtime: RuntimeManifestV1,
    knowledge: KnowledgeManifestV1,
  ): ManifestVerificationResult {
    return runtime.compatibleKnowledgeVersions.includes(
      knowledge.knowledgeVersion,
    ) && knowledge.compatibleRuntimeVersions.includes(runtime.runtimeVersion)
      ? { ok: true }
      : failure("MANIFEST_COMPATIBILITY_INVALID", "runtime/knowledge");
  }
}
function duplicate(values: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}
function compare(
  expected: readonly string[],
  observed: readonly string[],
): ManifestVerificationResult {
  const actual = new Set(observed);
  for (const item of expected)
    if (!actual.delete(item)) return failure("MANIFEST_ACTION_MISSING", item);
  const extra = actual.values().next();
  return extra.done
    ? { ok: true }
    : failure("MANIFEST_ACTION_EXTRA", extra.value);
}
function failure(
  reason: Exclude<
    import("../../../contracts/runtimeKnowledgeManifests.js").RuntimeKnowledgeManifestReason,
    "MANIFEST_SCHEMA_INVALID" | "MANIFEST_IDENTITY_INVALID"
  >,
  subject: string,
): ManifestVerificationResult {
  return { ok: false, reason, subject };
}
