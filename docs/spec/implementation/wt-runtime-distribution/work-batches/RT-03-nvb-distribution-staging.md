# Batch RT-03 — NVB Distribution Staging

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
Depends on: RT-02 accepted (manifest types and validator), DB-01 accepted (SQLite driver selection and feasibility)

**Required implementor reasoning class:** `R3`
**Class rationale:** bounded NVB build configuration with explicit owners and focused proof. The class is a floor; escalate when source inspection reveals missing edge cases.

## Objective

Implement the packaged Watchtower NVB task runtime and distribution staging.
The batch owns focused public-API `TaskHandler` implementations, the validated
generated `runtime-nvb.json` and `task-catalog.json` aggregates accepted from
RT-02, and a `dist/` tree containing the runtime, knowledge, packaged task
runtime, and DB-01-selected SQLite driver. Build validation compares every
manifest/catalog entry with actual files and rejects missing, extra,
non-executable, stale-aggregate, or checksum-mismatched assets.

## Required Work

1. Extend the existing `runtime-nvb/` source layout and current NVB JSON/module
   entrypoints; do not invent a `.nvb` file format:
   - implement focused handlers under capability directories, each extending
     the pinned public Nirvana `TaskHandler` export and owning one mechanical
     capability;
   - compile `runtime-nvb/runtimeNvb.ts` to the shipped
     `runtime-nvb/runtime-nvb.js`;
   - generate and validate `runtime-nvb/runtime-nvb.json` and
     `runtime-nvb/task-catalog.json` from the accepted RT-02 fragments;
   - keep product policy, terminal rendering, and mutation authority out of
     handlers.
2. Add/extend repository-development NVB task definitions using the repository's
   actual `nvb.json`/NVB configuration conventions:
   - `wt:pack:runtime` stages runtime, knowledge, task runtime, and selected
     SQLite driver assets into `dist/`:
     - `dist/runtime/manifest.json`
     - `dist/runtime/coordinator/*.sh`
     - `dist/knowledge/manifest.json`
     - `dist/knowledge/playbook.md`
     - `dist/knowledge/guides/`
     - `dist/knowledge/skill/`
     - `dist/knowledge/adapters/`
     - `dist/runtime-nvb/nvb-manifest.json`
     - `dist/runtime-nvb/runtime-nvb.json`
     - `dist/runtime-nvb/runtime-nvb.js`
     - `dist/runtime-nvb/task-catalog.json`
     - `dist/runtime-nvb/handlers/`
   - `wt:runtime:validate` task — runs `ManifestValidator` against the packaged
     runtime, knowledge, and task-runtime directories and fails on any manifest,
     schema, catalog, checksum, mode, handler/task/action, or stale-aggregate
     error
   - Task dependency ordering: `wt:pack:runtime` runs before `wt:runtime:validate`
   - Build validation must reject: missing asset, extra file in dist directory,
     checksum mismatch, non-executable file where manifest says executable,
     executable file where manifest says non-executable
3. Keep `nira.json` limited to ecosystem metadata. Do not register NVB tasks
   there unless inspection of the pinned build system proves that exact
   repository convention; the current repository uses `nvb.json` and
   `runtime-nvb/`.
4. Ensure executable bits are preserved during copy. Use a copy mechanism that
   propagates mode `0o755` for scripts declared `executable: true` in the
   manifest.
5. Generate the actual `dist/runtime/manifest.json` and
   `dist/knowledge/manifest.json` from the RT-01 asset records.
6. Package the DB-01-selected SQLite driver's required JS/native/prebuilt
   artifacts according to the accepted ADR and supported-target matrix. Do not
   assume a universal `dist/driver/` shape or claim cross-platform proof from
   one host. The distribution manifest records the actual package version,
   artifacts, checksums, ABI/platform mapping, and loader path.
7. Validate reproducible managed output: two clean `nvb dist` runs must produce
   identical `dist/` trees (same file list, same SHA-256 digests, same mode bits).

## Expected Ownership

- `runtime-nvb/catalog/` and `runtime-nvb/handlers/` — capability fragments and
  focused TaskHandlers
- `runtime-nvb/runtimeNvb.ts`, generated `runtime-nvb/runtime-nvb.json`, and
  generated `runtime-nvb/task-catalog.json`
- existing repository NVB configuration (`nvb.json` and its owning handlers)
  only where needed for build/dist validation; `nira.json` remains ecosystem
  metadata
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
- Prove every packaged handler extends the pinned public `TaskHandler` API and
  emits/returns the accepted structured event/result contracts.
- Prove generated task/config aggregates match their capability fragments and
  reject duplicate/stale task or action IDs.
- Prove the selected SQLite driver resolves from a clean globally installed
  package on the current target and require CI/artifact evidence for every
  additional supported target; no cross-platform claim is made from one host.
- Prove the distribution manifest includes the selected driver version,
  required artifacts, checksums, and ABI/platform mapping from DB-01.
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
- Do not introduce `LaneTaskRunner` invocation logic or managed-link logic;
  this batch does implement the packaged catalog and handler runtime.

## Review Procedure Highlights

1. Run `nvb dist` and inspect the output tree.
2. Compare every file in `dist/runtime/` and `dist/knowledge/` against the
   RT-01 inventory and RT-02 manifest types.
3. Introduce intentional manifest defects and verify validation failure.
4. Verify executable bits on runtime scripts.
5. Verify two consecutive builds produce identical outputs.
6. Confirm no npm scripts were added.
