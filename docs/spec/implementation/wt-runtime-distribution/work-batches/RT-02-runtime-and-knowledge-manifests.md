# Batch RT-02 — Runtime and Knowledge Manifests

Status: ❌ Pending
Phase: Asset audit and manifest foundation
Depends on: RT-01 accepted (asset audit/import complete)

**Required implementor reasoning class:** `R4`
**Class rationale:** manifest schemas with SHA-256 checksums, mode declarations, and action records. Closed types that every later foundation module consumes. The class is a floor; escalate when source inspection reveals missing edge cases.

## Objective

Define closed, versioned manifest schemas with SHA-256 checksums, mode bits, and
action records for every bundled runtime and knowledge asset. Implement a
manifest validator that rejects missing, extra, non-executable, and
checksum-mismatched assets. These types are consumed by every later foundation
module and NVB task.

## Required Work

1. Define `RuntimeManifestV1` in `src/contracts/manifests.ts`:
   - `schemaVersion: 1`
   - `runtimeVersion: string` — semver-compatible version string
   - `minimumCliVersion: string` — minimum CLI version required
   - `assets: RuntimeAssetV1[]` — every bundled runtime file
     - `path: string` — repository-relative path within the runtime root
     - `sha256: string` — lowercase `sha256:<64 hex>` digest
     - `executable: boolean` — whether execute permission is required
     - `actions: string[]` — coordinator action(s) this script implements
     - `role: 'watcher' | 'worker-launcher' | 'event-writer' | 'tmux-helper' | 'other'`
   - `requiredCommands: string[]` — external commands needed at runtime
   - `compatibleLaneSchemaVersions: number[]` — supported lane schema versions

2. Define `KnowledgeManifestV1` in `src/contracts/manifests.ts`:
   - `schemaVersion: 1`
   - `knowledgeVersion: string` — semver-compatible version string
   - `minimumCliVersion: string` — minimum CLI version required
   - `assets: KnowledgeAssetV1[]` — every bundled knowledge file
     - `path: string` — repository-relative path within the knowledge root
     - `sha256: string` — lowercase `sha256:<64 hex>` digest
     - `role: 'playbook' | 'guide' | 'state-machine' | 'skill' | 'adapter' | 'other'`
   - `compatibleRuntimeVersions: string[]` — runtime versions this knowledge is
     compatible with

3. Implement `ManifestValidator` in `src/foundation/manifest-validator.ts`:
   - `validateRuntimeManifest(manifest: RuntimeManifestV1, actualDir: string):
     ValidationResult` — scans the directory and checks:
     - every manifest asset exists as a regular file
     - no extra files exist that are not in the manifest
     - every file's SHA-256 matches the manifest
     - every `executable: true` file has the execute bit (mode `0o755` at minimum)
     - every `executable: false` file is non-executable
   - `validateKnowledgeManifest(manifest: KnowledgeManifestV1, actualDir: string):
     ValidationResult`
   - `ValidationResult` has `valid: boolean`, `errors: ValidationError[]`, and
     `warnings: ValidationWarning[]`
   - Errors include: `MISSING_ASSET`, `EXTRA_ASSET`, `CHECKSUM_MISMATCH`,
     `MODE_MISMATCH`, `UNKNOWN_SCHEMA_VERSION`

4. Validate against the JSON Schema bundle in
   `docs/spec/schemas/v1.schema.json`. Add `$defs.runtimeManifest` and
   `$defs.knowledgeManifest` if not already present.

5. Write `manifest.json` schema templates (the actual JSON content that will be
   shipped in the `dist/` tree) so NVB tasks in RT-03 have a target shape.

## Expected Ownership

- `src/contracts/manifests.ts` — `RuntimeManifestV1`, `KnowledgeManifestV1`,
  `RuntimeAssetV1`, `KnowledgeAssetV1`, `ValidationResult`, `ValidationError`
- `src/foundation/manifest-validator.ts` — `ManifestValidator` class

## Tests And Evidence

- Prove `RuntimeManifestV1` validates against the JSON Schema bundle
- Prove `KnowledgeManifestV1` validates against the JSON Schema bundle
- Prove the validator rejects a manifest with a missing file
- Prove the validator rejects a manifest with an extra file on disk
- Prove the validator rejects a checksum-mismatched file
- Prove the validator rejects a file with wrong execute mode
- Prove the validator rejects an unknown `schemaVersion`
- Prove the validator preserves unknown fields within schema version 1
- Prove every asset from the RT-01 inventory is representable in the manifest
  types
- Run architecture checks

## What Must Not Change

- Do not create a second manifest type owner — all manifest types live in
  `src/contracts/manifests.ts`
- Do not add runtime execution to the validator — it is a pure type and
  filesystem validator, not an invoker
- Do not create actual `manifest.json` files in the source tree — only type
  definitions and schema templates
- Do not introduce NVB staging, catalog, or adapter logic

## Review Procedure Highlights

1. Compare every manifest field with the v1 spec requirements in
   `docs/spec/v1.md` §15.
2. Verify the validator correctly classifies every rejection path (missing,
   extra, checksum, mode, schema version).
3. Run validator against a synthetic valid manifest with matching files.
4. Run validator against each rejection case independently.
5. Confirm all RT-01 inventoried assets are representable.
6. Check JSON Schema bundle for manifest definitions.
