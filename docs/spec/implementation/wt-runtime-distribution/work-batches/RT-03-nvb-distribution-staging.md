# Batch RT-03 — NVB Distribution Staging

Status: ❌ Pending
Phase: NVB distribution and immutable catalog
Depends on: RT-02 accepted (manifest types and validator), DB-01 accepted (SQLite driver selection and feasibility)

**Required implementor reasoning class:** `R3`
**Class rationale:** bounded NVB build configuration with explicit owners and focused proof. The class is a floor; escalate when source inspection reveals missing edge cases.

## Objective

Configure NVB distribution tasks that produce a validated `dist/` tree containing
the runtime and knowledge assets plus the SQLite native driver selected and proven
by DB-01. Build validation must compare packaged manifests against actual files
and fail on missing, extra, non-executable, or checksum-mismatched managed
assets.

## Required Work

1. Create `runtime-nvb/dist.nvb` (or extend existing NVB task file) with:
   - `wt:pack:runtime` task — copies runtime and knowledge assets into the
     `dist/` tree:
     - `dist/runtime/manifest.json`
     - `dist/runtime/coordinator/*.sh`
     - `dist/knowledge/manifest.json`
     - `dist/knowledge/playbook.md`
     - `dist/knowledge/guides/`
     - `dist/knowledge/skill/`
     - `dist/knowledge/adapters/`
   - `wt:runtime:validate` task — runs `ManifestValidator` against the packaged
     `dist/runtime/` and `dist/knowledge/` directories, reads their
     `manifest.json` files, and fails on any validation error
   - Task dependency ordering: `wt:pack:runtime` runs before `wt:runtime:validate`
   - Build validation must reject: missing asset, extra file in dist directory,
     checksum mismatch, non-executable file where manifest says executable,
     executable file where manifest says non-executable
2. Update `nira.json` with NVB task registrations if needed.
3. Ensure executable bits are preserved during copy. Use a copy mechanism that
   propagates mode `0o755` for scripts declared `executable: true` in the
   manifest.
4. Generate the actual `dist/runtime/manifest.json` and
   `dist/knowledge/manifest.json` from the RT-01 asset records.
5. Package the SQLite native driver binary selected and proven by DB-01 into the
   `dist/` tree under `dist/driver/`. The driver binary and its associated loader
   must be included for all target platforms (linux-x64, linux-arm64, darwin-x64,
   darwin-arm64). The `dist/` manifest must record the driver checksum and
   platform mapping.
6. Validate reproducible build: two consecutive `nvb dist` runs must produce
   identical `dist/` trees (same file list, same SHA-256 digests, same mode bits).

## Expected Ownership

- `runtime-nvb/dist.nvb` — NVB task definitions
- `nira.json` — task registration updates
- Generated `dist/runtime/manifest.json` and `dist/knowledge/manifest.json`
  — shipped in the npm package, generated at build time from canonical records

## Tests And Evidence

- Prove `nvb dist` produces a `dist/` tree with all required directories and files
- Prove `dist/runtime/coordinator/` contains every script from RT-01 inventory
- Prove `dist/knowledge/playbook.md`, `guides/`, `skill/`, `adapters/` contain
  every doc from RT-01 inventory
- Prove `wt:runtime:validate` passes when dist matches manifest
- Prove `wt:runtime:validate` fails on missing file in dist
- Prove `wt:runtime:validate` fails on extra file in dist
- Prove `wt:runtime:validate` fails on checksum mismatch
- Prove `wt:runtime:validate` fails on executable mode mismatch
- Prove executable bits are preserved (scripts in `dist/runtime/coordinator/`
  have execute permission)
- Prove the SQLite native driver binary is present in `dist/driver/` for each
  target platform
- Prove the native driver module loads from its dist location on each target
  platform
- Prove the `dist/` manifest includes the driver checksum and platform mapping
  from DB-01
- Prove two consecutive `nvb dist` runs produce identical `dist/` trees (SHA-256
  comparison of all files)
- Prove `nvb build` still compiles the TypeScript source
- Run architecture checks

## What Must Not Change

- Do not create npm convenience scripts — use NVB tasks only
- Do not copy the complete `node_modules/` tree into `dist/` — the package
  layout stays as defined in `docs/spec/v1.md` §15
- Do not modify runtime script content — asset content comes from RT-01
  inventory
- Do not introduce catalog, adapter, or managed-link logic

## Review Procedure Highlights

1. Run `nvb dist` and inspect the output tree.
2. Compare every file in `dist/runtime/` and `dist/knowledge/` against the
   RT-01 inventory and RT-02 manifest types.
3. Introduce intentional manifest defects and verify validation failure.
4. Verify executable bits on runtime scripts.
5. Verify two consecutive builds produce identical outputs.
6. Confirm no npm scripts were added.
