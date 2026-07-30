# wt-runtime-distribution — Implementation Pack 2

> **Draft pack-authoring artifact.** This document is not a seal, acceptance
> record, or authority to initialize a lane. Before pack acceptance, reconcile
> it with `docs/spec/v1-implementation-map.md`,
> `docs/development/engineering-and-review-standard.md`, and
> `docs/spec/nirvana-integration-architecture.md`. The normative precedence in
> `docs/spec/v1-contracts.md` governs every conflict.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: **Draft — correction audit complete; awaiting independent pack review**
Target release: `1.0.0`
Pack order: 2 of 6
Owner areas: Watchtower `src/foundation/`, `src/contracts/`, `runtime-nvb/`, `dist/`, `spec/integration/`
Date: 2026-07-30

## Purpose

This implementation pack turns the inherited shell runtime and coordinator
knowledge into a complete, immutable, auditable distribution. It is the second
of six draft implementation packs and is designed to build on the accepted read-model
foundation from Pack 1 (`wt-read-model`).

The pack establishes:

- canonical runtime and knowledge asset audit with source provenance
- versioned manifest schemas with checksum, mode, and action records
- NVB distribution staging with reproducible build validation
- immutable XDG data-root catalog with atomic first-stage and version coexistence
- central runtime invocation adapter with argv-only execution and `WT_*` allowlist
- managed lane links with manifest-only ownership and collision/path-escape refusal
- packaged watcher and runtime smoke proof

## Start Here

Read in this order:

1. `implementation-roadmap.md`
2. `implementation-tracker.md`
3. `implementation-quality-and-agent-rules.md`
4. `batch-reasoning-difficulty-ranking.md`
5. `work-batches/README.md`
6. `work-batches/00-work-batch-index.md`
7. `review-batches/README.md`
8. `review-batches/00-review-batch-index.md`

Then read the specific paired work/review batch brief and the real source
owners you will inspect or change.

## Prompt-Pack Maturity Guarantees

The 7 implementation batches and 7 paired review batches have a common
execution floor. Every durable brief and launch prompt must preserve, in
addition to its batch-specific scope:

- the declared reasoning class and capability-based agent selection rule
- source-first dependency and ownership mapping before edits or acceptance
- explicit negative-path, compatibility, concurrency, and unsupported-state
  reasoning appropriate to the batch
- clean-code and module-size gates that reject ball-of-mud growth, god objects,
  giant coordinators, generic helper bags, and unjustified oversized modules
- exact focused, regression, architecture, real-engine, and failure-injection
  evidence required by the governing acceptance cases
- protected user/ownership instructions in operator launch prompts
- tracker, roadmap, local-report, correction, handoff, and commit authority
  instructions sufficient for an agent receiving the prompt without prior chat
  context

The common rules are additive. Batch-specific details remain mandatory even
when a shared rule covers the same topic. Prompt maintainers may expand these
artifacts, but must not shorten a safety section into a link or summary. Wrong
claims and broken paths must be replaced with equally detailed or more detailed
correct instructions.

The authoritative reasoning-class matrix, source-size bands, category-specific hard-reject
ceilings, responsibility gates, and prompt-integrity policy live in
`implementation-quality-and-agent-rules.md`. A batch prompt that conflicts with
that file must be corrected before the batch starts.

## Batch Artifact Authority

The accepted Watchtower v1 specification and contracts are the normative scope
documents for all 7 batches. The work and review briefs in this directory are
the executable contracts for implementation and acceptance agents.

| Batch | Phase | Work brief | Review brief | Current status |
|-------|-------|-----------|-------------|----------------|
| RT-01 | Runtime asset audit/import | [work](work-batches/RT-01-runtime-and-knowledge-asset-audit-import.md) | [review](review-batches/RT-01-review-runtime-and-knowledge-asset-audit-import.md) | ❌ Pending |
| RT-02 | Runtime/knowledge manifests | [work](work-batches/RT-02-runtime-and-knowledge-manifests.md) | [review](review-batches/RT-02-review-runtime-and-knowledge-manifests.md) | ❌ Pending |
| RT-03 | NVB distribution staging | [work](work-batches/RT-03-nvb-distribution-staging.md) | [review](review-batches/RT-03-review-nvb-distribution-staging.md) | ❌ Pending |
| RT-04 | Immutable data-root catalog | [work](work-batches/RT-04-immutable-data-root-catalog-and-staging.md) | [review](review-batches/RT-04-review-immutable-data-root-catalog-and-staging.md) | ❌ Pending |
| RT-05 | Central runtime invocation adapter | [work](work-batches/RT-05-central-runtime-invocation-adapter.md) | [review](review-batches/RT-05-review-central-runtime-invocation-adapter.md) | ❌ Pending |
| RT-06 | Managed lane links | [work](work-batches/RT-06-managed-lane-links-and-compatibility-names.md) | [review](review-batches/RT-06-review-managed-lane-links-and-compatibility-names.md) | ❌ Pending |
| RT-07 | Packaged watcher smoke proof | [work](work-batches/RT-07-packaged-watcher-and-runtime-smoke-proof.md) | [review](review-batches/RT-07-review-packaged-watcher-and-runtime-smoke-proof.md) | ❌ Pending |

The executable implementation contract for each batch is the complete set of:

1. the canonical work brief
2. its paired implementation agent launch prompt
3. the governing specifications
4. the lane quality rules
5. accepted outcomes and handoffs from prerequisite batches

The executable review contract for each batch is the complete set of:

1. the canonical review brief
2. its paired review agent launch prompt
3. the paired work contract above
4. the implementation report and real changed source
5. the governing specifications and quality rules

## Mission

Deliver a provably complete runtime and knowledge distribution that:

- audits and imports every inherited shell runtime and coordinator knowledge asset
  with recorded source provenance and behavioral inventory
- defines versioned manifest schemas with SHA-256 checksums, mode bits, and action
  records for every managed asset
- configures NVB distribution staging that validates packaged manifests against
  actual files and fails on missing, extra, non-executable, or checksum-mismatched
  assets
- stages immutable runtime versions under XDG data with atomic first-stage, two
  coexisting versions, and content-addressed version roots
- provides a single runtime invocation adapter with argv-only execution,
  allowlisted `WT_*` environment, and cwd/account/access/signal validation
- manages lane links through manifest-only ownership with target checksums and
  collision/path-escape refusal
- proves the relocated package works with wake stdout/signal behavior and worker
  account read-but-cannot-write enforcement

## Canonical Pack Rules

- `src/contracts/` owns the manifest types and public shapes for runtime/knowledge
  distribution
- `src/foundation/` owns the runtime catalog, data-root, adapter, asset audit,
  manifest validator, managed assets, and runtime invoke services
- `runtime-nvb/` owns NVB distribution tasks; do not add npm convenience scripts
- `spec/integration/` owns the runtime smoke proof fixtures
- keep front doors, commands, and public barrels thin
- apply the repo file-size, helper-capsule, naming, and directory-shadow rules
- `.local/` reports are required working artifacts but never committed
- `implementation-quality-and-agent-rules.md` is a hard acceptance gate, not
  advisory background

## Pack Owner Map

This pack should be read with an explicit owner map in mind.

### Contract owners

- `src/contracts/manifests.ts` — runtime/knowledge manifest types, checksum records,
  mode declarations, action registries

### Foundation owners

- `src/foundation/RuntimeAssets.ts` — canonical runtime asset importer with source
  provenance tracking
- `src/foundation/AssetAudit.ts` — behavioral inventory for every coordinator
  action and doc
- `src/foundation/ManifestValidator.ts` — manifest validation with missing/extra
  file rejection and checksum enforcement
- `src/foundation/RuntimeCatalog.ts` — immutable version catalog with atomic
  staging and version coexistence
- `src/foundation/DataRoot.ts` — XDG precedence for `WATCHTOWER_DATA_HOME`,
  atomic first-stage, content-addressed roots
- `src/foundation/LaneTaskRunner.ts` — sole application task-invocation port
- `src/foundation/NirvanaLaneTaskRunner.ts` — explicit pinned NVB target and
  typed event/result adapter
- `src/foundation/LeafRuntimeInvoker.ts` — argv-only cataloged executable-leaf
  boundary beneath owning TaskHandlers
- `src/foundation/ManagedAssets.ts` — manifest-only managed file ownership, link
  targets/checksums, collision/path-escape refusal

### NVB automation owners

- `runtime-nvb/catalog/`, `runtime-nvb/handlers/`, `runtime-nvb/runtimeNvb.ts`,
  generated `runtime-nvb.json`, and generated `task-catalog.json` — packaged
  task runtime
- repository `nvb.json`/handler surfaces — distribution staging, manifest/
  catalog validation, executable preservation, reproducible builds

### Integration proof owners

- `spec/integration/runtime-smoke.spec.ts` — relocated package smoke test, wake
  stdout/signal behavior, worker account read/write enforcement

## Mandatory Status-Doc Sync

Whenever a review accepts or rejects a batch, explicitly audit:

- `implementation-tracker.md`
- `implementation-roadmap.md`
- `docs/spec/v1-implementation-map.md` (section 5)

Also audit these if the batch outcome changes what they claim:

- `docs/spec/v1.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/architecture.md`

If the outcome exposes a stale claim, update the document as part of the same
review/closure pass rather than leaving it as cleanup debt.

## Durable Artifact Rules

- implementation reports go under `.local/agent-reports/wt-runtime-distribution/`
- review reports go under `.local/agent-reports/wt-runtime-distribution/reviews/`
- correction briefs go under `review-batches/corrections/`
- `.local/` artifacts are never staged or committed

## Completion Meaning

This pack is not complete when code merely exists.

Completion for `wt-runtime-distribution` means:

- every inherited shell runtime script and coordinator knowledge doc has a
  recorded source file, provenance hash, and behavioral inventory entry
- runtime and knowledge manifest schemas validate every bundled asset, reject
  missing/extra files, and enforce SHA-256 checksums and executable bits
- `nvb dist` produces a validated package whose `dist/` manifest matches actual
  bundled files with zero drift
- the immutable data-root catalog supports XDG precedence, atomic first-stage
  writes, two coexisting versions, and content-addressed version roots
- all runtime invocation crosses exactly one adapter that constructs argv without
  shell interpolation, allows only `WT_*` environment variables, and validates
  cwd, OS account, and filesystem access before execution
- managed lane links are owned exclusively by the manifest; attempts to link
  outside declared targets, escape the lane root, or collide with non-managed
  files are refused
- a relocated package smoke test proves wake stdout output, signal forwarding, and
  that configured worker accounts can read and execute but cannot write runtime
  assets

## Pack Dependency Graph

```text
wt-read-model (Pack 1)
  │
  └─ RM-01 (contract kernel and error taxonomy)
      RM-03 (canonical paths and workspace resolution)
      │
      ▼
wt-runtime-distribution (Pack 2)
  │
  └─ RT-01 ──► RT-02 ──► RT-03 ──► RT-07
                  │          │
                  ▼          ▼
                RT-04 ──► RT-05 ──► RT-06 ──► RT-07
```

## Sequencing Rule

- RT-01 depends on RM-01 accepted (contract types in place)
- RT-02 depends on RT-01 accepted (assets inventoried before manifests)
- RT-03 depends on RT-02 accepted (manifest schemas defined before NVB staging)
- RT-04 depends on RT-02 and RM-03 accepted (manifests and paths in place)
- RT-05 depends on RT-04 and RM-01 accepted (catalog plus contracts)
- RT-06 depends on RT-04 and RT-05 accepted (catalog and adapter)
- RT-07 depends on RT-03, RT-05, and RT-06 accepted (packaging, invocation, links)

No NVB distribution staging work may begin before the manifest schemas are
accepted. No runtime invocation adapter work may begin before the immutable
catalog foundation is accepted. No smoke proof may begin before the NVB dist
pipeline, `LaneTaskRunner`/leaf boundaries, and managed links are all accepted.

## Reviewer Operating Standard

The `wt-runtime-distribution` review briefs are acceptance instruments, not
courtesy checks.

Every reviewer should be able to answer:

1. what exact owner now holds the behavior
2. whether every inherited runtime asset has recorded provenance
3. whether manifest schemas reject missing, extra, and mismatched files
4. whether the NVB dist pipeline produces a provably complete package
5. whether the immutable catalog supports atomic staging and version coexistence
6. whether `WT_*` allowlisting and argv-only execution are enforced at the adapter
7. whether managed links refuse collision and path escape
8. whether the smoke proof runs from a relocated package and enforces worker
   account read-but-cannot-write
9. whether proof was rerun rather than narrated
10. whether the status docs still tell the truth after the accept/reject decision

Reviewers should use
`implementation-quality-and-agent-rules.md#reviewer-hard-reject-checklist`
as a stop/go gate before discussing polish, naming, or minor cleanup.
