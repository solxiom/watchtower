# wt-runtime-distribution — Implementation Roadmap

Status: **Proposed — pack-authoring baseline**
Target release: `1.0.0`
Pack order: 2 of 6
Date: 2026-07-30

Parent documents:

- `docs/spec/v1-implementation-map.md`
- `docs/spec/v1.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/architecture.md`
- `docs/spec/implementation/wt-runtime-distribution/README.md`

## Mission

Turn the inherited shell runtime and coordinator knowledge into a complete,
immutable, auditable distribution. The delivery must guarantee:

- every inherited shell runtime script and coordinator knowledge doc has recorded
  source provenance and a behavioral inventory entry
- versioned manifest schemas validate every bundled asset, reject missing/extra
  files, and enforce SHA-256 checksums and executable bits
- `nvb dist` produces a validated package whose `dist/` manifest matches actual
  bundled files with zero drift
- the immutable data-root catalog supports XDG precedence, atomic first-stage
  writes, two coexisting versions, and content-addressed version roots
- all runtime invocation crosses exactly one adapter that constructs argv without
  shell interpolation, allows only `WT_*` environment variables, and validates
  cwd, OS account, and filesystem access
- managed lane links are owned exclusively by the manifest; collision and
  path-escape attempts are refused
- relocated package smoke proof proves wake stdout, signal forwarding, and worker
  account read-but-cannot-write enforcement

## Non-Negotiable Delivery Rules

- Keep one lower-layer owner for each major concern: asset audit, manifest
  validation, data-root catalog, runtime adapter, managed assets, NVB staging
- Keep the runtime invocation adapter as the single invocation boundary; do not
  spawn shell scripts from commands or foundation services directly
- Never evaluate lane config or state through shell execution in TypeScript
- Never log secrets or complete environment maps during invocation diagnostics
- Never import `node:child_process` shell-mode in the adapter
- Do not implement runtime behavior in `src/cli.ts` or `src/run.ts`
- Do not create `helpers`, `utils`, `common`, or `misc` overflow modules
- Apply the repo file-size, naming, directory-shadow, and helper-capsule rules
- Do not commit `.local/` artifacts
- Do not add npm convenience scripts; use NVB task surfaces

## Implementation-Phase Decision Clarifications

The main specs leave some details intentionally open.

For this implementation pack, use the following clarifications so batch work
and review remain aligned:

- runtime invocation is argv-only; the adapter constructs `child_process.spawn`
  with an argv array and never uses `{ shell: true }` or template literal
  interpolation
- `WT_*` environment variables are allowlisted; the adapter exports only keys
  matching `^WT_` from the resolved lane context and never passes the full
  `process.env`
- XDG precedence is `WATCHTOWER_DATA_HOME` > `XDG_DATA_HOME/watchtower` >
  `~/.local/share/watchtower`; the adapter resolves `~` from the effective OS
  user's home directory, not `$HOME`
- immutable version roots use the runtime version string as the directory name
  after validating it matches `^[0-9]+\.[0-9]+\.[0-9]+(-.+)?$`
- atomic first-stage writes use temp-file-plus-atomic-rename within the same
  filesystem; partial staging does not leave a valid version directory
- managed lane links are symlinks from `bin/` to immutable runtime store paths;
  the link target must exist in the staged runtime, and the symlink must not
  escape the lane directory after resolution
- compatibility names are runtime action aliases; every named action must appear
  in the packaged runtime manifest's `actions` array
- NVB distribution staging runs `wt:runtime:validate` after `wt:pack:runtime` and
  fails on checksum mismatch, missing file, extra file, or non-executable bit
  where the manifest declares one
- coordinator knowledge assets are imported as committed docs under `knowledge/`
  in the package; the import record in the runtime manifest declares source URI,
  import date, and SHA-256 of the verbatim copy

## Delivery Phases

### Phase 1: Asset Audit and Manifest Foundation

Goal:

- audit and import every inherited runtime and knowledge asset with full
  provenance before defining any manifest schemas

Batches:

- RT-01 — Canonical runtime and knowledge asset audit/import
- RT-02 — Runtime and knowledge manifests

Status: ❌ Batches RT-01–RT-02 pending

Acceptance snapshot (target):

- every inherited shell runtime script has recorded source path, SHA-256, line
  count, description, and coordinator action mapping
- every coordinator knowledge doc has recorded source path, SHA-256, title, and
  behavioral role
- the behavioral inventory covers every coordinator action and doc without
  omissions
- manifest types are closed and versioned with `schemaVersion: 1`
- manifest validator rejects missing, extra, non-executable, and
  checksum-mismatched assets
- `RuntimeManifestV1` and `KnowledgeManifestV1` types are defined in contracts
- manifest files validate against the JSON Schema bundle

### Phase 2: NVB Distribution and Immutable Catalog

Goal:

- configure the NVB distribution pipeline and build the immutable runtime catalog
  foundation

Batches:

- RT-03 — NVB distribution staging
- RT-04 — Immutable data-root catalog and staging

Status: ❌ Batches RT-03–RT-04 pending

Acceptance snapshot (target):

- `runtime-nvb/dist.nvb` defines `wt:pack:runtime` and `wt:runtime:validate` tasks
- `nvb dist` produces a `dist/` tree with `runtime/manifest.json`,
  `runtime/coordinator/`, `knowledge/manifest.json`, `knowledge/playbook.md`,
  `knowledge/guides/`, `knowledge/skill/`, and `knowledge/adapters/`
- build validation compares packaged manifests with actual files and fails on
  missing, extra, non-executable, or checksum-mismatched managed assets
- `nira.json` updated with NVB task registrations
- XDG precedence resolver returns canonical data-root path
- atomic first-stage writes use temp-file-atomic-rename
- two runtime versions coexist under `<data-root>/runtimes/`
- version roots are content-addressed and immutable after staging
- `RuntimeCatalog` validates package and XDG runtime manifests

### Phase 3: Runtime Adapter, Managed Links, and Smoke Proof

Goal:

- deliver the central runtime invocation adapter, managed lane links, and
  integration smoke proof

Batches:

- RT-05 — Central runtime invocation adapter
- RT-06 — Managed lane links and compatibility names
- RT-07 — Packaged watcher and runtime smoke proof

Status: ❌ Batches RT-05–RT-07 pending

Acceptance snapshot (target):

- `RuntimeAdapter` is the single invocation boundary for all runtime actions
- actions are validated against the runtime manifest before invocation
- invocation uses `child_process.spawn` with argv array and `{ shell: false }`
- only `WT_*` environment variables are exported; `process.env` is never passed
- cwd is validated to exist and be a directory
- effective OS user is resolved and access is checked on runtime entrypoints
- signal forwarding preserves SIGINT, SIGTERM, and SIGHUP semantics
- exit status is forwarded from the child process
- `RuntimeInvoker` maps supported actions to subprocess invocation context
- managed lane links are symlinks from `bin/` to immutable runtime store paths
- `ManagedAssets` validates link targets against the runtime manifest checksum
- collisions with non-managed files are refused
- symlink path-escape after resolution is refused
- compatibility names resolve through the runtime manifest's `actions` array
- `ManagedAssets` is the sole authority for managed file ownership
- relocated package smoke test runs `wt watch` and proves wake stdout output
- smoke test proves signal forwarding (SIGINT stops the watcher)
- smoke test proves worker accounts can read and execute but cannot write runtime
  assets
- smoke test passes with a relocated `node_modules` (no hardcoded paths)

## Sequencing Rule

- batches RT-01 through RT-02 must be accepted in order
- batch RT-03 depends on RT-02 accepted
- batch RT-04 depends on RT-02 and RM-03 accepted (manifests plus workspace
  resolution from Pack 1)
- batch RT-05 depends on RT-04 and RM-01 accepted (catalog plus contracts from
  Pack 1)
- batch RT-06 depends on RT-04 and RT-05 accepted (catalog plus adapter)
- batch RT-07 depends on RT-03, RT-05, and RT-06 accepted (packaging, invocation,
  and links)
- no NVB staging work may begin before manifest schemas are accepted
- no runtime invocation work may begin before the immutable catalog is accepted
- no smoke proof may begin before the NVB dist pipeline, adapter, and links are
  accepted

## Recommended Honest Execution Order

1. audit every inherited shell script and knowledge doc; record provenance and
   behavioral inventory (RT-01)
2. define manifest types and validation contracts (RT-02)
3. configure NVB distribution staging tasks (RT-03)
4. build XDG data-root resolution and atomic staging foundation (RT-04)
5. implement the central runtime invocation adapter (RT-05)
6. implement managed lane links and compatibility names (RT-06)
7. prove relocated package works with watcher wake, signal, and worker-account
   enforcement (RT-07)

## Rejected Shortcuts

This roadmap rejects:

- a "code first, manifest later" posture — manifest schemas are defined before
  NVB staging
- implementing NVB staging before asset audit — runtime assets must be
  inventoried and described before they are packaged
- invoking runtime scripts from commands directly — all invocation crosses one
  adapter
- passing full `process.env` to runtime subprocesses — `WT_*` allowlisting is
  required
- using shell-mode `child_process` — argv-only execution is required
- using `$HOME` directly instead of resolving the effective OS user's home
  directory
- writing runtime entrypoints without cwd, account, and access validation
- managed links that accept any target path — checksum validation is required
- collision ignorance — managed links must refuse to overwrite non-managed files
- path-escape tolerance — symlink resolution must reject paths outside the lane
  root
- smoke proof from the source tree — relocated package proof is required
- smoke proof without worker-account write enforcement — read-but-cannot-write
  must be proved
- deferring any proof to a later pack — all 7 batches must be accepted before
  Pack 2 exits
- adding npm scripts or convenience wrappers for agent or workflow convenience
