# Batch RT-06 — Managed Lane Links and Compatibility Names

Status: ❌ Pending
Phase: Runtime adapter, managed links, and smoke proof
Depends on: RT-04 accepted (immutable catalog), RT-05 accepted (runtime adapter)

**Required implementor reasoning class:** `R4`
**Class rationale:** managed link ownership with checksum validation, collision safety, and path-escape refusal across the lane directory boundary. The class is a floor; escalate when source inspection reveals missing safety cases.

## Objective

Implement manifest-only ownership for managed lane files. Symlinks from the lane
`bin/` directory to immutable runtime store paths must validate link targets
against the runtime manifest checksum, refuse collision with non-managed files,
and reject path-escape after symlink resolution. Compatibility names must
resolve through the runtime manifest's `actions` array.

## Required Work

1. Implement `ManagedAssets` in `src/foundation/managed-assets.ts`:
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
     - map historical/alternative action names to current manifest actions
     - return the canonical action name, or `null` if unrecognized
   - compatibility names are declared in the runtime manifest's `actions` array
     or in a separate `compatibilityNames` map on the manifest
   - this lets old coordinator scripts keep their historical names while the
     CLI resolves them to current runtime actions

3. Define error codes: `LINK_TARGET_CHECKSUM_MISMATCH`, `LINK_TARGET_ESCAPE`,
   `LINK_SOURCE_COLLISION`, `LINK_SOURCE_ESCAPE`, `LINK_NOT_MANAGED`,
   `COMPATIBILITY_NAME_UNKNOWN`

## Expected Ownership

- `src/foundation/managed-assets.ts` — `ManagedAssets` class
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
- Prove `createLinks` creates containing directories as needed
- Run architecture checks

## What Must Not Change

- Do not create or manage files outside the lane directory's `bin/` path
- Do not resolve symlink targets without checksum validation
- Do not overwrite non-managed files at link source paths
- Do not allow link targets that escape the runtime root
- Do not introduce adapter or smoke-proof logic
