# Foundation Refactor — Implementation Map

Status: **Accepted — structural remediation authority**
Scope: migrate legacy flat `src/foundation/` to
[foundation-module-architecture.md](foundation-module-architecture.md)
Work units: **32**
Remediation batches: **2** (`REF-01`, `REF-02`)
Last updated: 2026-08-04

This document is the **master construction plan** for the foundation layout
refactor. It defines milestones, work units, dependencies, ownership, and proof.
It is not a live status board — update
[foundation-refactor-implementation-tracker.md](foundation-refactor-implementation-tracker.md)
as work lands.

Normative target layout:
[foundation-module-architecture.md](foundation-module-architecture.md)

Execution detail (diagnosis, file paths, reviewer checklist):
[foundation-layout-remediation.md](foundation-layout-remediation.md)

All work is **behavior-neutral**. No public CLI behavior, schema version, or lane
semantics may change unless a separate product spec amendment says otherwise.

---

## Table of contents

1. [Delivery shape](#1-delivery-shape)
2. [Milestones](#2-milestones)
3. [Work unit catalog](#3-work-unit-catalog)
4. [Dependency graph](#4-dependency-graph)
5. [Parallel waves](#5-parallel-waves)
6. [Architecture gate inventory](#6-architecture-gate-inventory)
7. [Global work contract](#7-global-work-contract)
8. [Exit criteria](#8-exit-criteria)
9. [Related documents](#9-related-documents)

---

## 1. Delivery shape

The refactor is delivered as **two remediation batches** spanning **five
milestones** and **32 work units**.

| Batch | Milestones | Work units | Exit |
|-------|------------|----------:|------|
| **REF-01** | FM-0 … FM-3 | FR-00 … FR-24 | Zero root facades; all domains extracted; root only `index.ts` |
| **REF-02** | FM-4 | FR-25 … FR-31 | God barrel removed; command domain imports; full dependency gate |

### Baseline metrics (2026-08-04)

| Metric | Current | Target |
|--------|--------:|-------:|
| Root-level `.ts` files (excl. `index.ts`) | 93 | 0 |
| Shadow structures | 9 | 0 |
| Root barrel lines | ~126 | ≤50 |
| Root wildcard `export *` | 4 | 0 |
| Command deep-imports | ~6 | 0 |
| Domain architecture gates | 4 | 12+ |

---

## 2. Milestones

| ID | Name | Batch | Depends on | Exit proof |
|----|------|-------|------------|------------|
| **FM-0** | Policy and baseline gates | REF-01 | — | Architecture docs landed; baseline arch specs pass on current tree |
| **FM-1** | Capsule completion | REF-01 | FM-0 | Zero shadow structures; nine facades moved into existing capsules |
| **FM-2** | L1–L3 domain extraction | REF-01 | FM-1 | `paths/`, `parsing/`, `discovery/`, `bindings/`, `read/`, `status/`, `init/` exist with barrels |
| **FM-3** | L4 domain extraction | REF-01 | FM-2 | `pack/`, `upgrade/`, `observation/`, `lifecycle/`, `runtimeDistribution/` exist; root file count = 0 |
| **FM-4** | Barrel hardening and import cleanup | REF-02 | FM-3 | Root barrel ≤50 lines; commands use domain barrels only; full layer gate |

---

## 3. Work unit catalog

Each work unit has a stable ID `FR-NN`. Status lives in the
[tracker](foundation-refactor-implementation-tracker.md).

Legend for **Layer**: L1 pure/low I/O · L2 read-only I/O · L3 read services ·
L4 mutation · L5–L6 infrastructure (existing capsules).

### FM-0 — Policy and baseline gates

| ID | Work unit | Owns | Mandatory proof |
|----|-----------|------|-----------------|
| FR-00 | Land architecture spec bundle | `docs/spec/architecture/*` cross-links | Docs review; README index complete |
| FR-01 | Baseline dependency architecture gate | `spec/foundation/foundationDependencyArchitecture.spec.ts` | Passes on current tree; documents target layer matrix |
| FR-02 | Baseline root-barrel denylist gate | `spec/foundation/foundationRootBarrelArchitecture.spec.ts` | Passes on current tree; lists REF-02 removal targets |

### FM-1 — Capsule completion (shadow-structure elimination)

| ID | Work unit | Move / own | Files | Mandatory proof |
|----|-----------|------------|------:|-----------------|
| FR-03 | `laneStore` facade | `LaneStore.ts` → `laneStore/` | 1 | `lane-store.spec.ts`; update capsule `index.ts` |
| FR-04 | `transactionalWriter` facade | `TransactionalWriter.ts` → `transactionalWriter/` | 1 | `transactional-writer.spec.ts` |
| FR-05 | `managedAssets` facades | `ManagedAssets.ts`, `LaneTaskProfileInstaller.ts` → `managedAssets/` | 2 | `managedAssetsArchitecture.spec.ts` path inventory |
| FR-06 | `runtimeCatalog` facade | `RuntimeCatalog.ts` → `runtimeCatalog/` | 1 | `runtimeCatalog*.spec.ts` |
| FR-07 | `packIndex` facade | `PackIndexCompiler.ts` → `packIndex/` | 1 | `PackIndexCompiler.spec.ts` |
| FR-08 | `indexStore` facade | `IndexStore.ts` → `indexStore/` | 1 | `IndexQuery.spec.ts` imports |
| FR-09 | `indexQuery` facade | `IndexQuery.ts` → `indexQuery/` (split if >200 lines) | 1 | `indexQueryArchitecture.spec.ts` |
| FR-10 | `coordinatorBaseline` facade | `CoordinatorBaseline.ts` → `coordinatorBaseline/` | 1 | `coordinatorBaseline*.spec.ts` |
| FR-11 | FM-1 integration | Root barrel interim shrink; shadow-structure gate | — | Zero `Foo.ts` beside `foo/`; `nvb test` green |

### FM-2 — L1–L3 domain extraction

| ID | Domain | Layer | Files | Work unit scope | Mandatory proof |
|----|--------|------:|------:|-----------------|-----------------|
| FR-12 | `paths/` | L1 | 4 | Create domain dir + barrel; move path resolvers | `pathResolution.spec.ts`; `pathsArchitecture.spec.ts` (new) |
| FR-13 | `parsing/` | L1 | 6 | Move env/state/scalar/JSONL parsers | Parser specs; `parsingArchitecture.spec.ts` (new) |
| FR-14 | `discovery/` | L2 | 8 | Move discovery/selection/membership | `laneDiscovery.spec.ts`, `laneSelector.spec.ts`; `discoveryArchitecture.spec.ts` (new) |
| FR-15 | `bindings/` | L2 | 2 | Move bindings + writable conflicts | `repositoryBindings.spec.ts`, `writableConflicts.spec.ts`; barrel |
| FR-16 | `read/` | L3 | 7 | Move list/config services + internal readers | `listCommand.spec.ts`, `configCommand.spec.ts`; `read/index.ts` |
| FR-17 | `status/` | L3 | 22 | Move full status projection pipeline | `statusCommand.spec.ts`, status specs; `statusArchitecture.spec.ts` (new) |
| FR-18 | `init/` | L4 | 6 | Move init planner/contracts (not presenters) | `initPlanner.spec.ts`; `init/index.ts`; `initArchitecture.spec.ts` (new) |

### FM-3 — L4 domain extraction and root zero

| ID | Domain | Layer | Files | Work unit scope | Mandatory proof |
|----|--------|------:|------:|-----------------|-----------------|
| FR-19 | `pack/` | L4 | 11 | Move pack consumer/seal/drift hosts; split `PackAcceptance.ts` if needed | `pack*.spec.ts`; `packArchitecture.spec.ts` (new) |
| FR-20 | `upgrade/` | L4 | 6 | Move upgrade/migration modules | `upgrade-preview.spec.ts`; `upgradeArchitecture.spec.ts` (new) |
| FR-21 | `observation/` | L2 | 5 | Move tmux/heartbeat/runtime obs; merge `process/` orphan | `runtimeObservations.spec.ts`; barrel |
| FR-22 | `lifecycle/` | L4 | 2 | Move binding mutator + membership registrar | `binding-mutator.spec.ts`, `membership-registrar.spec.ts` |
| FR-23 | `runtimeDistribution/` | L4 | — | Domain barrel re-exporting catalog + managed assets | Managed/runtime catalog specs via facades |
| FR-24 | FM-3 integration | — | — | Confirm root has only `index.ts`; interim root barrel | Filesystem walk; `nvb test`; tracker FM-3 ✅ |

### FM-4 — Barrel hardening (REF-02)

| ID | Work unit | Owns | Mandatory proof |
|----|-----------|------|-----------------|
| FR-25 | `presentation/` domain | `commandEnvelopeSerializer.ts`, `ResultRenderer.ts`, plan presenters | `ResultRenderer.spec.ts`, `commandEnvelopeSerializer.spec.ts`; `presentation/index.ts` |
| FR-26 | Root barrel shrink | `src/foundation/index.ts` | ≤50 lines; no `export *`; `foundationRootBarrelArchitecture.spec.ts` tightened |
| FR-27 | Remove denylisted exports | Root + domain barrels | Denylist gate pass; symbols internal to capsules |
| FR-28 | Command import cleanup | `src/commands/*`, `src/run.ts` | `commandImportArchitecture.spec.ts` (new); domain barrels only |
| FR-29 | Full dependency gate | `foundationDependencyArchitecture.spec.ts` | Full L0–L6 layer matrix enforced |
| FR-30 | Remaining domain arch gates | Any missing `*Architecture.spec.ts` from FM-2/3 | 12+ gates green |
| FR-31 | REF-02 acceptance | Tracker + docs | Engineering standard matrix PASS; [§8 exit criteria](#8-exit-criteria) |

---

## 4. Dependency graph

### 4.1 Milestone graph

```text
FM-0 ──► FM-1 ──► FM-2 ──► FM-3 ──► FM-4
         │         │         │
         │         │         └── pack/upgrade depend on parsing/, paths/
         │         └── status/ depends on discovery/, observation/, parsing/
         └── facades must move before domain imports reference capsule paths
```

### 4.2 Work unit prerequisites

| Work unit | Requires accepted |
|-----------|-------------------|
| FR-03 … FR-10 | FR-00 |
| FR-11 | FR-03 … FR-10 |
| FR-12, FR-13 | FR-11 |
| FR-14, FR-15, FR-21 | FR-12, FR-13 |
| FR-16 | FR-14, FR-15 |
| FR-17 | FR-14, FR-15, FR-21, FR-13 |
| FR-18 | FR-12, FR-14 |
| FR-19 | FR-13, FR-07 (packIndex in place) |
| FR-20 | FR-05, FR-06 (managed assets / catalog facades) |
| FR-22 | FR-11, FR-03, FR-04 |
| FR-23 | FR-05, FR-06 |
| FR-24 | FR-12 … FR-23 |
| FR-25 … FR-31 | FR-24 |

---

## 5. Parallel waves

Safe parallel dispatch after prerequisites accept. **Never** move files in the
same domain from two agents simultaneously.

| Wave | Eligible after | Work units |
|------|----------------|------------|
| 1 | — | FR-00, FR-01, FR-02 |
| 2 | FR-00 | FR-03 … FR-10 (disjoint capsules — parallel OK) |
| 3 | FR-11 | FR-12, FR-13 (parallel OK) |
| 4 | FR-12, FR-13 | FR-14, FR-15, FR-21 (parallel OK) |
| 5 | FR-14, FR-15 | FR-16, FR-18 (parallel OK) |
| 6 | FR-14, FR-15, FR-21, FR-13 | FR-17 |
| 7 | FR-13, FR-07 | FR-19 |
| 8 | FR-05, FR-06 | FR-20, FR-23 (parallel OK) |
| 9 | FR-11, FR-03, FR-04 | FR-22 |
| 10 | FR-12 … FR-23 | FR-24 |
| 11 | FR-24 | FR-25 … FR-30 (FR-28 after FR-25, FR-26) |
| 12 | FR-25 … FR-30 | FR-31 |

---

## 6. Architecture gate inventory

| Spec file | Introduced by | Encodes |
|-----------|---------------|---------|
| `foundationDependencyArchitecture.spec.ts` | FR-01 | Layer import matrix (baseline → full at FR-29) |
| `foundationRootBarrelArchitecture.spec.ts` | FR-02 | Root export allowlist / denylist |
| `commandImportArchitecture.spec.ts` | FR-28 | Commands import domain barrels only |
| `pathsArchitecture.spec.ts` | FR-12 | `paths/` inventory + L1 boundary |
| `parsingArchitecture.spec.ts` | FR-13 | `parsing/` inventory + L1 boundary |
| `discoveryArchitecture.spec.ts` | FR-14 | `discovery/` inventory + L2 boundary |
| `statusArchitecture.spec.ts` | FR-17 | `status/` inventory + size limits |
| `initArchitecture.spec.ts` | FR-18 | `init/` inventory + L4 boundary |
| `packArchitecture.spec.ts` | FR-19 | `pack/` inventory + host adapter boundary |
| `upgradeArchitecture.spec.ts` | FR-20 | `upgrade/` inventory |
| `taskRuntimeArchitecture.spec.ts` | (existing) | Update paths only in FM-1 |
| `managedAssetsArchitecture.spec.ts` | (existing) | Update paths in FR-05 |
| `indexQueryArchitecture.spec.ts` | (existing) | Update paths in FR-08, FR-09 |

---

## 7. Global work contract

Every work unit must:

1. state accepted spec references (`foundation-module-architecture.md`, this map);
2. move only files in its **exclusive ownership** column;
3. update imports to use domain/capsule barrels — no new deep imports;
4. update affected architecture spec path inventories;
5. run `nvb build && nvb test` with zero regressions;
6. update [foundation-refactor-implementation-tracker.md](foundation-refactor-implementation-tracker.md);
7. produce no product behavior change.

### Hard rejects

- new `.ts` files at `src/foundation/` root (except transient migration — must clear same batch);
- new shadow structures;
- new root `export *`;
- module size evasion (compression instead of split);
- commands importing capsule internals after FR-28;
- skipping tracker update on accept.

### Size splits (pre-approved if triggered on move)

| Module | Lines | Owner work unit |
|--------|------:|-----------------|
| `PackAcceptance.ts` | 260 | FR-19 |
| `PackConsumer.ts` | 232 | FR-19 |
| `IndexQuery.ts` | 229 | FR-09 |

---

## 8. Exit criteria

**REF-01 accepted** when FM-0 … FM-3 are ✅ in the tracker and:

- root file count = 1 (`index.ts` only);
- shadow structures = 0;
- all FM-2/3 domain directories exist with barrels;
- `nvb test` green.

**REF-02 accepted** when FM-4 is ✅ and:

- root barrel ≤50 lines, no wildcards;
- `commandImportArchitecture.spec.ts` green;
- full `foundationDependencyArchitecture.spec.ts` green;
- engineering standard acceptance matrix PASS.

---

## 9. Related documents

| Document | Role |
|----------|------|
| [foundation-module-architecture.md](foundation-module-architecture.md) | Normative target layout |
| [foundation-layout-remediation.md](foundation-layout-remediation.md) | File migration inventory, reviewer checklist |
| [foundation-refactor-implementation-tracker.md](foundation-refactor-implementation-tracker.md) | **Live status** |
| [README.md](README.md) | Architecture spec index |

---

*End of map.*
