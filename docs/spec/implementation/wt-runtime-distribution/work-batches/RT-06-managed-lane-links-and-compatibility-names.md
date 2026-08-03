# Batch RT-06 — Managed lane links, task profiles, and compatibility names

## Synchronized batch execution matrix

- **Accepted-map title:** Managed lane links, task profiles, and compatibility names
- **Dependencies:** `RT-04`, `RT-05`
- **Exclusive ownership/interface:** managed-asset/task-profile foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Manifest-only ownership; task catalog/profile pin; project `nvb.json` unchanged; link targets/checksums; collision/path-escape refusal
- **Implementation report:** `.local/agent-reports/wt-runtime-distribution/RT-06-managed-lane-links-and-compatibility-names.md`
- **Review report:** `.local/agent-reports/wt-runtime-distribution/reviews/RT-06-managed-lane-links-and-compatibility-names-review.md`
- **Correction report:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-06-managed-lane-links-and-compatibility-names-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Pending
Phase: Runtime adapter, managed links, and smoke proof
Depends on: RT-04 accepted (immutable catalog), RT-05 accepted (lane task runner)

**Correction 02 amendment:** [`RT-06-specification-resolution-amendment.md`](../RT-06-specification-resolution-amendment.md)
records the operator-authorized resolution of two cross-batch scope
questions raised by Correction 02: the `install.json.taskRuntime` writer
boundary between RT-06 and `wt-lane-lifecycle` LC-03, and the narrowing of
RT-06's compatibility-name acceptance criterion to the resolution mechanism
only (production data deferred to a future classification batch). This
batch's proof obligations are unchanged except as that amendment states.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **managed-asset/task-profile foundation**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-runtime-distribution/RT-06-managed-lane-links-and-compatibility-names.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RT-04`, `RT-05`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Manifest-only ownership; task catalog/profile pin; project `nvb.json` unchanged; link targets/checksums; collision/path-escape refusal**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **managed-asset/task-profile foundation** and **Manifest-only ownership; task catalog/profile pin; project `nvb.json` unchanged; link targets/checksums; collision/path-escape refusal**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-runtime-distribution/RT-06-managed-lane-links-and-compatibility-names.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
