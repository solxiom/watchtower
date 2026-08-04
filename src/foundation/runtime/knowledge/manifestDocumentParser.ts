import type {
  KnowledgeManifestV1,
  ManifestAsset,
  RuntimeManifestV1,
} from "../../../contracts/runtimeKnowledgeManifests.js";
import { RuntimeKnowledgeManifestError } from "../../../contracts/runtimeKnowledgeManifests.js";

const digestPattern = /^sha256:[0-9a-f]{64}$/;
const versionPattern = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;

export function parseRuntimeManifest(value: unknown): RuntimeManifestV1 {
  const root = record(value);
  keys(root, [
    "actions",
    "assets",
    "compatibleKnowledgeVersions",
    "compatibleLaneSchemaVersions",
    "manifestId",
    "minimumCliVersion",
    "requiredCommands",
    "runtimeVersion",
    "schemaVersion",
  ]);
  if (root.schemaVersion !== 1 || root.manifestId !== "watchtower-runtime/v1")
    identity();
  if (
    !Array.isArray(root.compatibleLaneSchemaVersions) ||
    root.compatibleLaneSchemaVersions.length !== 1 ||
    root.compatibleLaneSchemaVersions[0] !== 1
  )
    invalid();
  return freeze({
    schemaVersion: 1,
    manifestId: "watchtower-runtime/v1",
    runtimeVersion: version(root.runtimeVersion),
    minimumCliVersion: version(root.minimumCliVersion),
    compatibleLaneSchemaVersions: [1] as [1],
    compatibleKnowledgeVersions: strings(
      root.compatibleKnowledgeVersions,
      version,
    ),
    assets: assets(root.assets),
    actions: strings(root.actions, action),
    requiredCommands: strings(root.requiredCommands, command),
  });
}

export function parseKnowledgeManifest(value: unknown): KnowledgeManifestV1 {
  const root = record(value);
  keys(root, [
    "assets",
    "compatibleRuntimeVersions",
    "knowledgeVersion",
    "manifestId",
    "provenance",
    "schemaVersion",
  ]);
  if (root.schemaVersion !== 1 || root.manifestId !== "watchtower-knowledge/v1")
    identity();
  const provenance = record(root.provenance);
  keys(provenance, ["commit", "importRecordSha256", "repository"]);
  return freeze({
    schemaVersion: 1,
    manifestId: "watchtower-knowledge/v1",
    knowledgeVersion: version(root.knowledgeVersion),
    compatibleRuntimeVersions: strings(root.compatibleRuntimeVersions, version),
    provenance: {
      repository: text(provenance.repository),
      commit: commit(provenance.commit),
      importRecordSha256: digest(provenance.importRecordSha256),
    },
    assets: assets(root.assets),
  });
}

function assets(value: unknown): readonly ManifestAsset[] {
  if (!Array.isArray(value)) invalid();
  const result = value.map((entry) => {
    const item = record(entry);
    keys(item, ["mode", "path", "sha256"]);
    return {
      path: path(item.path),
      sha256: digest(item.sha256),
      mode: mode(item.mode),
    };
  });
  unique(result.map((item) => item.path));
  return result;
}
function strings(
  value: unknown,
  check: (item: unknown) => string,
): readonly string[] {
  if (!Array.isArray(value)) invalid();
  const result = value.map(check);
  unique(result);
  return result;
}
function record(value: unknown): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    invalid();
  return Object.fromEntries(Object.entries(value));
}
function keys(
  value: Record<string, unknown>,
  expected: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  )
    invalid();
}
function text(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value)
    invalid();
  return value;
}
function version(value: unknown): string {
  const result = text(value);
  if (!versionPattern.test(result)) invalid();
  return result;
}
function action(value: unknown): string {
  const result = text(value);
  if (!/^[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)*$/.test(result)) invalid();
  return result;
}
function command(value: unknown): string {
  const result = text(value);
  if (!/^[a-z][a-z0-9-]*$/.test(result)) invalid();
  return result;
}
function path(value: unknown): string {
  const result = text(value);
  if (
    result.startsWith("/") ||
    result.includes("\\") ||
    result.split("/").some((part) => !part || part === "." || part === "..")
  )
    invalid();
  return result;
}
function mode(value: unknown): "0644" | "0755" {
  if (value !== "0644" && value !== "0755") invalid();
  return value;
}
function digest(value: unknown): `sha256:${string}` {
  const result = text(value);
  if (!digestPattern.test(result)) invalid();
  return result as `sha256:${string}`;
}
function commit(value: unknown): string {
  const result = text(value);
  if (!/^[0-9a-f]{40}$/.test(result)) invalid();
  return result;
}
function unique(values: readonly string[]): void {
  if (values.some((item, index) => index > 0 && values[index - 1] >= item))
    invalid();
}
function invalid(): never {
  throw new RuntimeKnowledgeManifestError(
    "MANIFEST_SCHEMA_INVALID",
    "manifest",
    "Manifest syntax or schema is invalid.",
  );
}
function identity(): never {
  throw new RuntimeKnowledgeManifestError(
    "MANIFEST_IDENTITY_INVALID",
    "manifest",
    "Manifest identity is unsupported.",
  );
}
function freeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.freeze(value);
    for (const item of Object.values(value)) freeze(item);
  }
  return value;
}
