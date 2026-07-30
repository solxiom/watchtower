# wt-runtime-distribution — Batch Reasoning Difficulty Ranking

Status: **Proposed — pack-authoring baseline**
Date: 2026-07-30

## Purpose

Rank all 7 work batches from hardest to easiest based on reasoning class, state
interaction depth, security-boundary complexity, concurrency risks, multi-module
integration demands, and potential for catastrophic failure modes. This ranking
informs agent assignment, review prioritization, and parallel-wave scheduling.

## Ranking Methodology

Each batch is scored on five axes (1 = simplest, 5 = hardest):

1. **Security-boundary design**: env allowlisting, account/permission validation,
   path-escape prevention, shell-injection prevention
2. **State interaction depth**: filesystem staging, atomic writes, version
   coexistence, immutability guarantees
3. **Cross-module integration**: number of foundation modules touched, dependency
   web complexity
4. **Negative-path surface**: failure modes, rejection paths, adversarial inputs,
   concurrency/recovery states
5. **Evidence complexity**: proof posture required, real-system versus mock,
   signal/process handling

| Batch | Security | State | Integration | Negatives | Evidence | Total | Rank |
|-------|----------|-------|-------------|-----------|----------|-------|------|
| RT-05 | 5 | 3 | 4 | 5 | 5 | 22 | 1 (hardest) |
| RT-06 | 4 | 4 | 3 | 4 | 3 | 18 | 2 |
| RT-04 | 3 | 5 | 3 | 3 | 3 | 17 | 3 |
| RT-02 | 2 | 2 | 4 | 3 | 2 | 13 | 4 |
| RT-01 | 1 | 2 | 3 | 2 | 2 | 10 | 5 |
| RT-03 | 1 | 2 | 2 | 2 | 2 | 9 | 6 |
| RT-07 | 2 | 1 | 2 | 2 | 3 | 10 | 7 (easiest) |

## Detailed Ranking

### 1. RT-05 — Central Runtime Invocation Adapter (R5)

Hardest batch in the pack. This is the single security boundary between the
TypeScript control plane and the shell runtime. Every runtime invocation crosses
this adapter. The batch must:

- enforce argv-only execution with zero shell interpolation
- allowlist only `WT_*` environment variables and never pass `process.env`
- resolve the effective OS user and check filesystem access on every entrypoint
- validate cwd exists and is a directory
- forward signals (SIGINT, SIGTERM, SIGHUP) and exit status correctly
- validate every action against the runtime manifest before invocation
- log only `WT_*` key names at `--verbose`, never values
- support inherited or captured stdio for interactive and non-interactive actions
- never leak secrets or full environment maps to logs or diagnostics

The negative-path surface includes: missing runtime entrypoint, non-executable
file, resolved directory as action target, signal delivery to already-exited
child, `WT_*` injection from the calling process, cwd removal during execution,
and cross-account permission denial. Every failure must produce a deterministic
exit code and error.

### 2. RT-06 — Managed Lane Links and Compatibility Names (R4)

Hard integration batch bridging the immutable catalog, runtime adapter, and lane
layout. Managed links must:

- validate every symlink target checksum against the runtime manifest
- refuse collision with any non-managed file at the link path
- reject symlinks whose resolved target escapes the lane root
- resolve compatibility names through the manifest's `actions` array
- prove manifest-only ownership — no managed path may exist or be created outside
  the manifest's `managedAssets`

The negative-path surface includes: pre-existing non-managed file at link path,
checksum mismatch on target, target outside runtime store, symlink escape through
`..` or absolute paths, compatibility name not in `actions` array, and
dual-writer race between catalog and link staging.

### 3. RT-04 — Immutable Data-Root Catalog and Staging (R4)

Foundation of the pack's versioned runtime model. Must:

- implement XDG precedence correctly (`WATCHTOWER_DATA_HOME` >
  `XDG_DATA_HOME/watchtower` > `~/.local/share/watchtower`)
- stage version roots atomically via temp-file-plus-atomic-rename
- prove two versions coexist under `<data-root>/runtimes/`
- enforce immutability after staging — any write attempt against an existing
  version root must fail
- content-address roots by validated version string
- validate package and XDG runtime manifests

The state interaction depth is the highest in the pack: atomic staging requires
correct temp-directory placement on the same filesystem, fsync before rename, and
cleanup of partial staging on failure. Two coexisting versions must not interfere
with each other's integrity.

### 4. RT-02 — Runtime and Knowledge Manifests (R4)

Type-system foundation that every later batch consumes. Must:

- define closed, versioned manifest types (`RuntimeManifestV1`,
  `KnowledgeManifestV1`) with `schemaVersion`, `checksums`, `mode`, and `actions`
- implement a manifest validator that rejects missing, extra, non-executable, and
  checksum-mismatched assets
- prove every bundled asset has a manifest entry and every manifest entry has a
  bundled file
- reject unknown manifest schema versions
- preserve unknown fields for forward compatibility within schema version 1
- ensure manifest files validate against the JSON Schema bundle

The cross-module integration is significant: every later foundation module and
NVB task depends on these types. Getting the contract wrong here forces
corrections in RT-03 through RT-07.

### 5. RT-01 — Canonical Runtime and Knowledge Asset Audit/Import (R4)

Exploratory batch that must inventory every inherited asset before anything else
happens. Must:

- discover every shell runtime script and coordinator knowledge doc in the
  inherited source
- record source path, SHA-256, line count, description, and coordinator action
  mapping for every script
- record source path, SHA-256, title, and behavioral role for every knowledge doc
- build a complete behavioral inventory covering every coordinator action and doc
  without omissions
- prove no script or doc was missed by cross-referencing against the
  implementation-lane-coordinator source

While reasoning depth is moderate (R4), the work is largely systematic:
enumerate, hash, describe, cross-reference. The primary risk is omissions rather
than incorrect behavior.

### 6. RT-03 — NVB Distribution Staging (R3)

Build-automation batch. Must:

- configure `runtime-nvb/dist.nvb` with `wt:pack:runtime` and
  `wt:runtime:validate` tasks
- produce correct `dist/` layout with `runtime/manifest.json`,
  `runtime/coordinator/`, `knowledge/manifest.json`, `knowledge/playbook.md`,
  `knowledge/guides/`, `knowledge/skill/`, `knowledge/adapters/`
- preserve executable bits on runtime scripts
- run build validation comparing packaged manifests with actual files
- fail on missing, extra, non-executable, or checksum-mismatched assets
- update `nira.json` with NVB task registrations

The work is bounded: NVB task configuration following accepted patterns, manifest
validation against known schemas, and layout verification. No novel security or
state-machine design is required.

### 7. RT-07 — Packaged Watcher and Runtime Smoke Proof (R3)

Easiest batch — integration proof. Must:

- implement an integration smoke test (`spec/integration/runtime-smoke.spec.ts`)
- prove the relocated package works (wake stdout output matches expected patterns)
- prove signal forwarding (SIGINT stops the watcher process cleanly)
- prove worker accounts can read and execute runtime entrypoints but cannot write
  to them
- prove no hardcoded paths exist in the relocated package (the smoke test runs
  from a temporary directory)

The proof is focused and well-bounded. The batch depends on RT-03, RT-05, and
RT-06 being accepted, so the implementation surface at this point is narrow:
invoke the watcher through the adapter, observe stdout, send a signal, verify
exit, and check worker-account permissions.

## Agent Assignment Guidance

| Batch | Reasoning | Recommend strongest available | Fallback with human steering |
|-------|-----------|-------------------------------|------------------------------|
| RT-05 | R5 | GPT-5.4, Claude Opus 4.1 | Claude Sonnet 4.6 with mandatory independent re-review |
| RT-06 | R4 | GPT-5.4, Claude Opus 4.1 | Claude Sonnet 4.6 with strong human steering |
| RT-04 | R4 | GPT-5.4, Claude Opus 4.1 | Claude Sonnet 4.6 |
| RT-02 | R4 | GPT-5.4, Claude Opus 4.1 | Claude Sonnet 4.6 |
| RT-01 | R4 | GPT-5.4, Claude Opus 4.1 | Claude Sonnet 4.6 |
| RT-03 | R3 | Claude Sonnet 4.6, GPT-5.2 | Composer 2.5 with human steering |
| RT-07 | R3 | Claude Sonnet 4.6, GPT-5.2 | Composer 2.5 with human steering |

## Parallel Wave Scheduling

Given the dependency graph and these difficulty scores:

| Wave | Eligible after | Batches |
|------|---------------|---------|
| 1 | RM-01 accepted (Pack 1) | RT-01 |
| 2 | RT-01 accepted | RT-02 |
| 3 | RT-02 accepted + RM-03 accepted (Pack 1) | RT-03, RT-04 |
| 4 | RT-04 accepted | RT-05 |
| 5 | RT-04 + RT-05 accepted | RT-06 |
| 6 | RT-03 + RT-05 + RT-06 accepted | RT-07 |

Wave 3 is the only true parallel opportunity: RT-03 (NVB staging, R3) and RT-04
(immutable catalog, R4) can proceed in parallel after RT-02 accepts. The most
critical path is RT-01 → RT-02 → RT-04 → RT-05 → RT-06 → RT-07, which
determines the pack's minimum completion time.
