# Batch RT-04 — Immutable Data-Root Catalog and Staging

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
Phase: NVB distribution and immutable catalog
Depends on: RT-02 accepted (manifest types), RM-03 accepted (canonical paths and workspace resolution from Pack 1)

**Required implementor reasoning class:** `R4`
**Class rationale:** immutable catalog with atomic staging, XDG precedence, and version coexistence. Filesystem state transitions and integrity guarantees require deep cross-module reasoning. The class is a floor.

## Objective

Implement XDG precedence for the Watchtower data root. Stage immutable runtime
versions atomically. Support two coexisting versions with content-addressed
roots. Validate package and staged runtime manifests.

## Required Work

1. Implement `resolveDataRoot()` in `src/foundation/DataRoot.ts`:
   - precedence: `WATCHTOWER_DATA_HOME` env > `XDG_DATA_HOME/watchtower` >
     `~/.local/share/watchtower`
   - resolve `~` from the effective OS user's home directory (via `os.userInfo()`,
     not `$HOME` environment variable)
   - canonicalize the resolved path
   - return the canonical path; throw if the path is unresolvable
   - the function is pure resolution — it does not create directories

2. Implement `RuntimeCatalog` in `src/foundation/RuntimeCatalog.ts`:
   - `stageRuntime(runtimeVersion: string, packageManifest: RuntimeManifestV1,
     sourceRuntimeDir: string): void`
     - validate `runtimeVersion` matches `^[0-9]+\.[0-9]+\.[0-9]+(-.+)?$`
     - compute staging path: `<data-root>/runtimes/<runtimeVersion>/`
     - fail if the version directory already exists (immutability: no overwrite)
     - stage via temp-directory-plus-atomic-rename on the same filesystem
     - write the manifest into the staged directory
     - preserve executable bits from source
     - validate staged manifest against actual files using `ManifestValidator`
     - on failure before the atomic rename, remove the temp directory and leave
       the data root unchanged
   - `stageKnowledge(knowledgeVersion: string, packageManifest: KnowledgeManifestV1,
     sourceKnowledgeDir: string): void` — same pattern for knowledge
   - `isRuntimeInstalled(runtimeVersion: string): boolean`
   - `isKnowledgeInstalled(knowledgeVersion: string): boolean`
   - `getRuntimeRoot(runtimeVersion: string): string` — returns the canonical
     path to a staged runtime version, or throws if not installed
   - `getKnowledgeRoot(knowledgeVersion: string): string`
   - `listInstalledRuntimes(): string[]` — returns version directories that exist
     and pass manifest validation
   - `listInstalledKnowledge(): string[]`
   - failures are classified with error codes: `VERSION_ALREADY_INSTALLED`,
     `VERSION_NOT_INSTALLED`, `INVALID_VERSION_STRING`,
     `STAGING_VALIDATION_FAILED`, `STAGING_IO_ERROR`

3. Prove immutability: any attempt to write into a staged version directory after
   the atomic commit must fail. The catalog must not provide a mutable path.

4. Prove version coexistence: stage two different runtime versions and verify
   both are independently usable and have no overlapping files.

## Expected Ownership

- `src/foundation/DataRoot.ts` — `resolveDataRoot()`, XDG precedence logic
- `src/foundation/RuntimeCatalog.ts` — `RuntimeCatalog` class with staging,
  validation, and query methods

## Tests And Evidence

- Prove XDG precedence: `WATCHTOWER_DATA_HOME` overrides `XDG_DATA_HOME`
- Prove XDG precedence: `XDG_DATA_HOME` overrides `~/.local/share/watchtower`
- Prove `~` resolves from OS user home, not `$HOME`
- Prove atomic staging: interrupted staging (kill before rename) leaves no valid
  version directory
- Prove version directory is immutable after staging (write attempt fails)
- Prove two versions coexist under `<data-root>/runtimes/`
- Prove staging fails on invalid version string
- Prove staging fails on already-installed version
- Prove staging validation passes with correct manifest and files
- Prove staging validation fails with manifest/file mismatch
- Prove `getRuntimeRoot` throws for uninstalled version
- Prove `listInstalledRuntimes` returns correct sorted list
- Run architecture checks

## What Must Not Change

- Do not execute any runtime script during staging — pure filesystem operation
- Do not create directories outside `<data-root>/runtimes/<version>/` or
  `<data-root>/knowledge/<version>/`
- Do not use `$HOME` directly — use `os.userInfo().homedir`
- Do not introduce adapter or managed-link logic
