# Batch RT-06 — Managed Lane Links, Task Profiles, and Compatibility Names

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
Phase: Runtime adapter, managed links, and smoke proof
Depends on: RT-04 accepted (immutable catalog), RT-05 accepted (lane task runner)

**Required implementor reasoning class:** `R4`
**Class rationale:** managed link ownership with checksum validation, collision safety, and path-escape refusal across the lane directory boundary. The class is a floor; escalate when source inspection reveals missing safety cases.

## Objective

Implement manifest-only ownership for managed lane files and install-time
pinning of the accepted lane task profile. Symlinks from the lane
`bin/` directory to immutable runtime store paths must validate link targets
against the runtime manifest checksum, refuse collision with non-managed files,
and reject path-escape after symlink resolution. Compatibility names must
resolve through the task catalog/profile. Participating-project `nvb.json`
files remain untouched and cannot affect Watchtower execution.

## Required Work

1. Implement `ManagedAssets` in `src/foundation/ManagedAssets.ts`:
   - `createLinks(laneDir: string, installManifest: InstallManifestV1,
     runtimeCatalog: RuntimeCatalog): ManagedLinkResult[]`
     - for each managed asset in the install manifest:
       - the link source is `laneDir/<assetPath>` (typically `bin/<scriptName>`)
       - validate the link target exists in the staged runtime by checking the
         runtime manifest SHA-256 against the catalog
       - refuse if the link target path escapes the runtime root after resolution
         (test against the resolved canonical path; reject `..` segments and
         absolute paths outside the runtime root)
       - refuse if the link source path already exists and is not a managed file
         (check install manifest for existing managed claim; any other regular
         file, directory, or symlink at that path is a collision)
       - refuse if the link source path would escape the lane directory after
         canonical resolution (the resolved absolute path must start with the
         canonical lane directory prefix)
       - create the containing directory if it does not exist
       - create the symlink with the resolved target path
       - record the result (created, skipped/already-exists-with-correct-target,
         or error with reason)
   - `removeLinks(laneDir: string, installManifest: InstallManifestV1):
     ManagedLinkResult[]`
     - for each managed asset: remove the symlink only if its current target
       matches the manifest declaration (do not remove if someone replaced the
       symlink with a regular file or different target)
   - `validateLinks(laneDir: string, installManifest: InstallManifestV1,
     runtimeCatalog: RuntimeCatalog): ValidationResult`
     - check each managed link exists, is a symlink, and points to a valid
       checksum-matched target
     - report missing, broken, wrong-target, and checksum-mismatched links

2. Implement compatibility name resolution:
   - `resolveCompatibilityName(name: string, runtimeManifest: RuntimeManifestV1):
     string | null`
     - map historical/alternative action names to canonical catalog actions
       allowed by the selected lane profile
     - return the canonical action name, or `null` if unrecognized/disallowed
   - compatibility names are immutable catalog data, never executable aliases,
     shell text, task overrides, or project configuration
   - this lets old coordinator scripts keep their historical names while the
     CLI resolves them to current runtime actions

3. Implement focused task-profile installation/rebinding:
   - resolve catalog/profile/runtime from the immutable RT-04 version root;
   - validate catalog/profile IDs, versions, checksums, compatibility, and
     explicit `configTarget`/`moduleTarget` containment;
   - write the exact `install.json.taskRuntime` pin defined by RT-02;
   - prove the profile only narrows catalog actions and adds no tasks/code;
   - never create, edit, merge, discover, or trust a participating repository's
     root `nvb.json`.

4. Define error codes: `LINK_TARGET_CHECKSUM_MISMATCH`, `LINK_TARGET_ESCAPE`,
   `LINK_SOURCE_COLLISION`, `LINK_SOURCE_ESCAPE`, `LINK_NOT_MANAGED`,
   `COMPATIBILITY_NAME_UNKNOWN`

## Expected Ownership

- focused managed-link planner/validator/mutator collaborators under a thin
  `ManagedAssets` facade; do not combine resolution, mutation, validation,
  compatibility mapping, and task-profile binding in one god object
- focused `LaneTaskProfileInstaller`/validator foundation owners
- `src/contracts/manifests.ts` — `ManagedLinkResult`, `InstallManifestV1` types
  (if not already present)

## Tests And Evidence

- Prove managed link creation with valid target and checksum
- Prove link creation refuses when target checksum does not match runtime manifest
- Prove link creation refuses when target path escapes runtime root (e.g., `../..`
  segments)
- Prove link creation refuses when link source path exists with a non-managed
  file (collision)
- Prove link creation refuses when link source would escape lane directory
- Prove link removal removes only links with matching manifest-declared targets
- Prove link removal does not remove a replaced regular file or different-target
  symlink
- Prove link validation reports missing, broken, wrong-target, and
  checksum-mismatched links
- Prove compatibility name resolution maps known names to canonical actions
- Prove compatibility name resolution returns `null` for unknown names
- Prove `install.json.taskRuntime` contains exact catalog/profile/config/module
  pins and each target/digest is verified against the immutable root
- Prove a profile cannot add tasks/code or enable an action outside its catalog
- Seed a participating repository with a malicious `nvb.json`; prove init/
  rebinding does not read or modify it and RT-05 still selects the pinned target
- Prove `createLinks` creates containing directories as needed
- Run architecture checks

## What Must Not Change

- Do not create or manage files outside the lane directory's `bin/` path
- Do not resolve symlink targets without checksum validation
- Do not overwrite non-managed files at link source paths
- Do not allow link targets that escape the runtime root
- Do not introduce runner-adapter or smoke-proof logic
