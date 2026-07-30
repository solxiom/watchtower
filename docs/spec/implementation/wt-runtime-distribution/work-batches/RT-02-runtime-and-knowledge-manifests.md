# Batch RT-02 — Runtime and Knowledge Manifests

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Status: ❌ Pending
Phase: Asset audit and manifest foundation
Depends on: RT-01 accepted (asset audit/import complete)

**Required implementor reasoning class:** `R4`
**Class rationale:** manifest schemas with SHA-256 checksums, mode declarations, and action records. Closed types that every later foundation module consumes. The class is a floor; escalate when source inspection reveals missing edge cases.

## Objective

Define closed, versioned runtime, knowledge, packaged-NVB task-catalog, and lane
task-profile contracts. Every asset, handler, task, group, leaf, action,
input/result schema, mutability class, checksum, and mode must be represented.
Implement validators and the deterministic aggregate-generation contract that
reject missing/extra assets, duplicate/stale fragments, incompatible pins, and
profiles that add code or tasks. These types govern RT-03 through RT-07.

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

3. Define task-runtime contracts in a focused type-only contract module:
   - `TaskCatalogV1` with catalog ID/version, minimum runtime/CLI versions, and
     entries for every action, task/group, handler, optional leaf, input/result
     schema, mutability class, required capability, checksum, and mode;
   - `RuntimeNvbManifestV1` covering config/module/handler/catalog assets and
     their digests;
   - `LaneTaskProfileV1` containing only profile ID/version, catalog identity/
     digest, runtime compatibility, and an allowlist of existing catalog action
     IDs; it contains no code, handler, task definition, arbitrary path, or
     override;
   - explicit immutable `configTarget` and `moduleTarget` pins resolving inside
     the checksum-verified runtime root.

4. Define reviewable capability fragments under `runtime-nvb/catalog/` and a
   deterministic aggregate task contract:
   - stable canonical ordering independent of filesystem enumeration;
   - reject duplicate action/task/group/handler IDs, dangling handler/leaf
     references, incompatible schemas, and undeclared files;
   - generate `runtime-nvb.json` and `task-catalog.json`;
   - validation fails when a checked-in/generated aggregate is stale.
   RT-02 owns the fragments/schema/generator contract and fixtures; RT-03 owns
   handler implementation and packaged runtime staging.

5. Implement `ManifestValidator` in `src/foundation/ManifestValidator.ts`:
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

   Add focused task-runtime/catalog/profile validator collaborators rather than
   growing one manifest-validator god object.

6. Validate against the JSON Schema bundle in
   `docs/spec/schemas/v1.schema.json`. Add `$defs.runtimeManifest` and
   `$defs.knowledgeManifest` if not already present.

7. Write schema fixtures/templates for runtime, knowledge, NVB runtime,
   task-catalog, and lane profile outputs so RT-03 has a complete target shape.

## Expected Ownership

- `src/contracts/manifests.ts` — `RuntimeManifestV1`, `KnowledgeManifestV1`,
  `RuntimeAssetV1`, `KnowledgeAssetV1`, `ValidationResult`, `ValidationError`
- `src/foundation/ManifestValidator.ts` — `ManifestValidator` class
- focused type-only task catalog/profile contracts and focused validators/
  aggregate generator
- `runtime-nvb/catalog/` — reviewable capability fragments, not handler code

## Tests And Evidence

- Prove `RuntimeManifestV1` validates against the JSON Schema bundle
- Prove `KnowledgeManifestV1` validates against the JSON Schema bundle
- Prove the validator rejects a manifest with a missing file
- Prove the validator rejects a manifest with an extra file on disk
- Prove the validator rejects a checksum-mismatched file
- Prove the validator rejects a file with wrong execute mode
- Prove the validator rejects an unknown `schemaVersion`
- Prove closed records reject unknown executable/task/profile fields unless the
  governing schema explicitly marks a metadata extension point
- Prove every asset from the RT-01 inventory is representable in the manifest
  types
- Prove every RT-01 migration classification maps to TaskHandler, leaf,
  temporary-wrapper, or removal catalog treatment
- Prove deterministic aggregate generation and stale/duplicate/dangling/
  schema-mismatch rejection
- Prove a profile can only reduce the catalog allowlist and cannot add code,
  tasks, handlers, paths, or override checksums
- Prove config/module/profile targets cannot escape the immutable runtime root
- Run architecture checks

## What Must Not Change

- Do not create a second manifest type owner — all manifest types live in
  `src/contracts/manifests.ts`
- Do not add runtime execution to the validator — it is a pure type and
  filesystem validator, not an invoker
- Do not create actual `manifest.json` files in the source tree — only type
  definitions and schema templates
- Do not implement TaskHandlers, package staging, `LaneTaskRunner`, or managed
  links. Catalog/profile contracts, fragments, and deterministic aggregate
  generation are required scope.

## Review Procedure Highlights

1. Compare every manifest field with the v1 spec requirements in
   `docs/spec/v1.md` §15.
2. Verify the validator correctly classifies every rejection path (missing,
   extra, checksum, mode, schema version).
3. Run validator against a synthetic valid manifest with matching files.
4. Run validator against each rejection case independently.
5. Confirm all RT-01 inventoried assets are representable.
6. Check JSON Schema bundle for manifest definitions.
