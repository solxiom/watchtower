# Watchtower Foundation Layout — Remediation Plan

Status: **Accepted — structural remediation authority**
Scope: migrate legacy flat `src/foundation/` to
[foundation-module-architecture.md](foundation-module-architecture.md)
Applies to: v1 implementation lane (outside the 74-batch product graph)
Last updated: 2026-08-04

This document is the **execution plan** for remediating the legacy foundation
layout. It covers current-state diagnosis, file migration inventory, phased
migration, `REF-01`/`REF-02` batches, acceptance criteria, and progress
tracking.

The **normative target architecture** — domains, barrels, layers, and public
export contract — lives in
[foundation-module-architecture.md](foundation-module-architecture.md). This
remediation plan must not change public CLI behavior, schema version, or lane
semantics.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Motivation and current diagnosis](#2-motivation-and-current-diagnosis)
3. [File migration inventory](#3-file-migration-inventory)
4. [Phased migration plan](#4-phased-migration-plan)
5. [Implementation batches](#5-implementation-batches)
6. [Acceptance criteria](#6-acceptance-criteria)
7. [Progress tracking](#7-progress-tracking)
8. [Appendix — reviewer checklist](#appendix--reviewer-checklist)

---

## 1. Executive summary

`src/foundation/` today mixes **93 top-level TypeScript modules** with **17
partially adopted sub-capsules**. Several capsules (`taskRuntime/`, `storage/`,
`managedAssets/`) already follow the target pattern; most read-model, lifecycle,
pack, status, and upgrade code still lives flat at the foundation root.

### Delivery shape

Two structural remediation batches:

| Batch | Scope | Risk |
|-------|-------|------|
| **REF-01** | Capsule completion, domain extraction (`status/`, `init/`, `discovery/`, …) | Low — moves + import updates |
| **REF-02** | God-barrel shrink, command import cleanup, `presentation/`, dependency gate | Medium — export surface change |

Both batches are **behavior-neutral**. All proof is `nvb test` plus new
architecture specs defined in
[foundation-module-architecture.md §9](foundation-module-architecture.md#9-architecture-test-requirements).

### Phase timeline

```text
REF-01  ──► Phase 0 + Phase 1 + Phase 2 + Phase 3
REF-02  ──► Phase 4
```

Parallel agent work is safe **only** on disjoint domain directories after Phase 1
completes. Two agents must not move files in the same domain simultaneously.

---

## 2. Motivation and current diagnosis

### 2.1 Why refactor now

The v1 lane has accepted read-model (M1), runtime-distribution (M2), and early
lifecycle/upgrade/coordinator foundations. Upcoming batches (`LC-06`…`LC-10`,
`CA-03`…`CA-31`) will add large coordinator, session, and TUI surfaces. Without
capsule discipline, new code will amplify existing flat-root debt and make
reviewer size/architecture gates harder to satisfy.

The engineering standard already requires:

- capability grouping when a capability needs multiple files;
- barrels that define a **local package surface only**;
- rejection of `thing.ts` beside a `thing/` directory;
- inward dependency direction; and
- no generic helper dumping grounds.

The current layout partially violates each rule.

### 2.2 Current layout snapshot

```text
src/foundation/
  index.ts                    ← 126-line god barrel
  *.ts                        ← 93 flat modules (mixed concerns)
  coordinatorBaseline/        ← 6 modules (good)
  distribution/               ← 7 modules (good)
  hostAdapters/               ← 9 modules (good)
  indexQuery/                 ← 2 modules (good)
  indexStore/                 ← 3 modules (good)
  laneStore/                  ← 6 modules; LaneStore.ts still at root
  managedAssets/              ← 12 modules; ManagedAssets.ts still at root
  packIndex/                  ← 7 modules; PackIndexCompiler.ts still at root
  process/                    ← 1 module (orphan)
  runtime/                    ← 4 modules (good)
  runtimeCatalog/             ← 7 modules; RuntimeCatalog.ts still at root
  runtimeKnowledgeManifest/   ← modules (good)
  schemaComposition/          ← modules (good)
  storage/                    ← modules (good)
  taskCatalogComposition/     ← modules (good)
  taskRuntime/                ← 20+ modules; exemplary barrel (template)
  transactionalWriter/        ← 3 modules; TransactionalWriter.ts still at root
```

### 2.2.1 Flat-root clusters (problem areas)

| Cluster | Root files (count) | Primary consumers | Encapsulation today |
|---------|-------------------:|-------------------|---------------------|
| **Status projection** | 18 | `StatusCommand`, status specs | ❌ None |
| **Init / preflight** | 7 | `InitCommand` | ❌ None |
| **Discovery / selection** | 8 | `ListCommand`, `StatusCommand`, init | ❌ None |
| **Pack acceptance** | 12 | `LC-02`, `CA-01`, pack specs | ⚠️ Partial (`packIndex/`) |
| **Parsing / contracts** | 6 | Many domains | ❌ Scattered |
| **Paths / workspace** | 4 | Discovery, init, storage | ❌ None |
| **Bindings / membership** | 5 | `LC-04`, init | ❌ None |
| **Upgrade / migration** | 6 | `UpgradeCommand`, `UK-*` | ❌ None |
| **Observation** | 4 | Status, read services | ❌ None |
| **Presentation** | 2 (+ command presenters) | All commands | ⚠️ Split across layers |
| **Read services** | 4 | `ListCommand`, `ConfigCommand` | ❌ None |

### 2.2.2 Shadow-structure violations

| Root facade | Existing capsule | Action |
|-------------|------------------|--------|
| `LaneStore.ts` | `laneStore/` | Move facade into capsule |
| `TransactionalWriter.ts` | `transactionalWriter/` | Move facade into capsule |
| `ManagedAssets.ts` | `managedAssets/` | Move facade into capsule |
| `LaneTaskProfileInstaller.ts` | `managedAssets/` | Move into capsule |
| `RuntimeCatalog.ts` | `runtimeCatalog/` | Move facade into capsule |
| `PackIndexCompiler.ts` | `packIndex/` | Move facade into capsule |
| `IndexStore.ts` | `indexStore/` | Move facade into capsule |
| `IndexQuery.ts` | `indexQuery/` | Move facade into capsule |
| `CoordinatorBaseline.ts` | `coordinatorBaseline/` | Move facade into capsule |

### 2.2.3 God-barrel leakage

`foundation/index.ts` currently re-exports internals that no command should need,
including:

- `PACK_INDEX_SCHEMA`, `PACK_INDEX_META_TABLE` — schema DDL owned by `packIndex/`
- `nodeManagedLinkFileSystem`, `ManagedLinkFileSystem` — FS port owned by `managedAssets/`
- `parseInstallManifest` — parser owned by `managedAssets/`
- `gitUnavailable`, `gitValue`, `nodePackGitInspector` — pack host adapters
- `createNodePackFileSystem`, `nodePackFileSystem` — pack storage hosts
- Wildcard `export *` from `taskRuntime/`, `runtime/`, `distribution/`,
  `schemaComposition/`, `taskCatalogComposition/`

`taskRuntime/index.ts` is the **positive template**: it exports the port and
typed options, documents symbols deliberately withheld, and is enforced by
`spec/foundation/taskRuntimeArchitecture.spec.ts`.

### 2.2.4 Command import leakage

| Command | Current import pattern | Target pattern |
|---------|------------------------|----------------|
| `InitCommand` | Deep: `InitPlanner.js`, `initPlanPresenter.js`, `InitContracts.js` | `foundation/init/index.js`, `foundation/presentation/index.js` |
| `UpgradeCommand` | Deep: `UpgradePlanner.js`, `UpgradePreviewSource.js`, `upgradePlanPresenter.js` | `foundation/upgrade/index.js`, `foundation/presentation/index.js` |
| `SkillInstallCommand` | Mixed: barrel + `hostAdapters/replaceConfirmation.js` | `foundation/hostAdapters/index.js` only |
| `ListCommand`, `ConfigCommand`, `StatusCommand` | Root barrel (acceptable interim) | Domain barrels (`read/`, `status/`) |
| `run.ts` | Root barrel for envelope helpers | `foundation/presentation/index.js` |

### 2.2.5 Size pressure (warning-band modules at root)

| Module | Lines | Preferred max | Notes |
|--------|------:|----------------:|-------|
| `PackAcceptance.ts` | 260 | 200 | Must split during `pack/` move |
| `PackConsumer.ts` | 232 | 200 | Facade; split if still over limit |
| `IndexQuery.ts` | 229 | 200 | Move to `indexQuery/`; split if needed |
| `PackIndexCompiler.ts` | 220 | 200 | Move to `packIndex/` |
| `laneManifestReader.ts` | 198 | 200 | Move to `discovery/` |
| `membershipIndex.ts` | 190 | 200 | Move to `discovery/` |
| `commandEnvelopeSerializer.ts` | 181 | 200 | Move to `presentation/` |
| `JsonlParser.ts` | 175 | 200 | Move to `parsing/` |
| `BindingMutator.ts` | 175 | 200 | Move to `lifecycle/` |
| `ManagedAssets.ts` | 173 | 200 | Move to `managedAssets/` |

Refactor phases must **not** evade limits by compression. Split responsibilities
while moving.

---

## 3. File migration inventory

Complete target tree:
[foundation-module-architecture.md §3.1](foundation-module-architecture.md#31-full-target-tree).

### 3.1 Phase 1 — finish existing capsules

| Current path | Target path | Notes |
|--------------|-------------|-------|
| `LaneStore.ts` | `laneStore/LaneStore.ts` | Update `laneStore/index.ts` |
| `TransactionalWriter.ts` | `transactionalWriter/TransactionalWriter.ts` | |
| `ManagedAssets.ts` | `managedAssets/ManagedAssets.ts` | Update architecture spec paths |
| `LaneTaskProfileInstaller.ts` | `managedAssets/LaneTaskProfileInstaller.ts` | |
| `RuntimeCatalog.ts` | `runtimeCatalog/RuntimeCatalog.ts` | |
| `PackIndexCompiler.ts` | `packIndex/PackIndexCompiler.ts` | |
| `IndexStore.ts` | `indexStore/IndexStore.ts` | |
| `IndexQuery.ts` | `indexQuery/IndexQuery.ts` | Split if still >200 lines |
| `CoordinatorBaseline.ts` | `coordinatorBaseline/CoordinatorBaseline.ts` | |

### 3.2 Phase 2 — new domain capsules

#### `status/` (18 modules)

| Current path | Target path |
|--------------|-------------|
| `StatusProjection.ts` | `status/StatusProjection.ts` |
| `statusHealth.ts` | `status/statusHealth.ts` |
| `statusViewProjection.ts` | `status/statusViewProjection.ts` |
| `statusLaneTypes.ts` | `status/statusLaneTypes.ts` |
| `statusPackTypes.ts` | `status/statusPackTypes.ts` |
| `statusPackRecordProjection.ts` | `status/statusPackRecordProjection.ts` |
| `statusRegularFileIdentity.ts` | `status/statusRegularFileIdentity.ts` |
| `StatusAcceptedInputInspector.ts` | `status/StatusAcceptedInputInspector.ts` |
| `StatusConflictInspector.ts` | `status/StatusConflictInspector.ts` |
| `StatusEventProjection.ts` | `status/StatusEventProjection.ts` |
| `StatusLaneInputReader.ts` | `status/StatusLaneInputReader.ts` |
| `StatusLiveObserver.ts` | `status/StatusLiveObserver.ts` |
| `StatusPackAcceptanceAuthority.ts` | `status/StatusPackAcceptanceAuthority.ts` |
| `StatusPackContractReader.ts` | `status/StatusPackContractReader.ts` |
| `StatusPackFileInventory.ts` | `status/StatusPackFileInventory.ts` |
| `StatusPackGitInspector.ts` | `status/StatusPackGitInspector.ts` |
| `StatusPackGraphValidator.ts` | `status/StatusPackGraphValidator.ts` |
| `StatusPackIntegrity.ts` | `status/StatusPackIntegrity.ts` |
| `StatusProofInputInspector.ts` | `status/StatusProofInputInspector.ts` |
| `StatusRepositoryGitInspector.ts` | `status/StatusRepositoryGitInspector.ts` |
| `StatusRuntimeInventory.ts` | `status/StatusRuntimeInventory.ts` |
| `StatusSourceBaselineInspector.ts` | `status/StatusSourceBaselineInspector.ts` |

#### `init/` (7 modules)

| Current path | Target path |
|--------------|-------------|
| `InitPlanner.ts` | `init/InitPlanner.ts` |
| `InitContracts.ts` | `init/InitContracts.ts` |
| `InitPorts.ts` | `init/InitPorts.ts` |
| `InitPreflightHost.ts` | `init/InitPreflightHost.ts` |
| `InitRoutingValidator.ts` | `init/InitRoutingValidator.ts` |
| `initLocks.ts` | `init/initLocks.ts` |
| `initPlanPresenter.ts` | `presentation/initPlanPresenter.ts` |

#### `discovery/` (8 modules)

| Current path | Target path |
|--------------|-------------|
| `homeLaneDiscovery.ts` | `discovery/homeLaneDiscovery.ts` |
| `laneDiscovery.ts` | `discovery/laneDiscovery.ts` |
| `LaneDiscoveryFileSystem.ts` | `discovery/LaneDiscoveryFileSystem.ts` |
| `RelevantLaneDiscovery.ts` | `discovery/RelevantLaneDiscovery.ts` |
| `LaneSelector.ts` | `discovery/LaneSelector.ts` |
| `SecondaryDiscovery.ts` | `discovery/SecondaryDiscovery.ts` |
| `membershipIndex.ts` | `discovery/membershipIndex.ts` |
| `laneManifestReader.ts` | `discovery/laneManifestReader.ts` |

#### `bindings/` (2 modules)

| Current path | Target path |
|--------------|-------------|
| `repositoryBindings.ts` | `bindings/repositoryBindings.ts` |
| `writableConflicts.ts` | `bindings/writableConflicts.ts` |

#### `read/` (7 modules)

| Current path | Target path |
|--------------|-------------|
| `LaneListService.ts` | `read/LaneListService.ts` |
| `LaneListCursor.ts` | `read/LaneListCursor.ts` |
| `ResolvedConfigService.ts` | `read/ResolvedConfigService.ts` |
| `LaneConfigProjectionReader.ts` | `read/LaneConfigProjectionReader.ts` |
| `LaneInstallIdentityReader.ts` | `read/LaneInstallIdentityReader.ts` |
| `LaneReadFileStore.ts` | `read/LaneReadFileStore.ts` |
| `LaneStateProjectionReader.ts` | `read/LaneStateProjectionReader.ts` |

#### `paths/` (4 modules)

| Current path | Target path |
|--------------|-------------|
| `canonicalPaths.ts` | `paths/canonicalPaths.ts` |
| `dataHomeResolver.ts` | `paths/dataHomeResolver.ts` |
| `DataRoot.ts` | `paths/DataRoot.ts` |
| `workspaceResolver.ts` | `paths/workspaceResolver.ts` |

#### `parsing/` (6 modules)

| Current path | Target path |
|--------------|-------------|
| `envParser.ts` | `parsing/envParser.ts` |
| `stateParser.ts` | `parsing/stateParser.ts` |
| `scalarLineParser.ts` | `parsing/scalarLineParser.ts` |
| `stateRecordParser.ts` | `parsing/stateRecordParser.ts` |
| `laneLifecycle.ts` | `parsing/laneLifecycle.ts` |
| `JsonlParser.ts` | `parsing/JsonlParser.ts` |

### 3.3 Phase 3 — pack, upgrade, observation, lifecycle

#### `pack/` (12 modules)

| Current path | Target path |
|--------------|-------------|
| `PackConsumer.ts` | `pack/PackConsumer.ts` |
| `PackAcceptance.ts` | `pack/PackAcceptance.ts` — **split** if still >260 lines |
| `PackDriftObserver.ts` | `pack/PackDriftObserver.ts` |
| `PackSeal.ts` | `pack/PackSeal.ts` |
| `packConsumerPorts.ts` | `pack/packConsumerPorts.ts` |
| `packFilesystemHost.ts` | `pack/packFilesystemHost.ts` |
| `packGitHost.ts` | `pack/packGitHost.ts` |
| `packSchemaValidatorsHost.ts` | `pack/packSchemaValidatorsHost.ts` |
| `packJsonReaders.ts` | `pack/packJsonReaders.ts` |
| `packSchemaFormats.ts` | `pack/packSchemaFormats.ts` |
| `schemaBundle.ts` | `schemaComposition/schemaBundle.ts` (preferred) |

#### `upgrade/` (6 modules)

| Current path | Target path |
|--------------|-------------|
| `UpgradePlanner.ts` | `upgrade/UpgradePlanner.ts` |
| `UpgradePreviewSource.ts` | `upgrade/UpgradePreviewSource.ts` |
| `upgradeFileSystem.ts` | `upgrade/upgradeFileSystem.ts` |
| `MigrationRegistry.ts` | `upgrade/MigrationRegistry.ts` |
| `MigrationSteps.ts` | `upgrade/MigrationSteps.ts` |
| `migrationValidation.ts` | `upgrade/migrationValidation.ts` |
| `upgradePlanPresenter.ts` | `presentation/upgradePlanPresenter.ts` |

#### `observation/` (4 modules)

| Current path | Target path |
|--------------|-------------|
| `runtimeObservations.ts` | `observation/runtimeObservations.ts` |
| `NirvanaTmuxObserver.ts` | `observation/NirvanaTmuxObserver.ts` |
| `heartbeatObservation.ts` | `observation/heartbeatObservation.ts` |
| `TmuxSessionProcessRunner.ts` | `observation/TmuxSessionProcessRunner.ts` |
| `process/processIdentity.ts` | `observation/processIdentity.ts` (merge orphan) |

#### `lifecycle/` (2 modules + nested capsules)

| Current path | Target path |
|--------------|-------------|
| `BindingMutator.ts` | `lifecycle/BindingMutator.ts` |
| `MembershipRegistrar.ts` | `lifecycle/MembershipRegistrar.ts` |

Add `runtimeDistribution/index.ts` re-exporting `RuntimeCatalog`, `ManagedAssets`,
and `LaneTaskProfileInstaller` from nested capsules.

### 3.4 Import rewrite checklist (every phase)

For each moved file:

- [ ] Update relative imports within the same capsule
- [ ] Update cross-domain imports to use target domain barrel
- [ ] Update `spec/**` imports
- [ ] Update architecture spec hard-coded path lists
- [ ] Update `foundation/index.ts` re-exports
- [ ] Run `nvb build && nvb test`
- [ ] Confirm zero root-level `.ts` files remain (except `index.ts`) before phase sign-off

---

## 4. Phased migration plan

### Phase 0 — Policy and baseline gates

**Goal:** Land architecture docs and establish baseline architecture tests.

| Step | Action |
|------|--------|
| 0.1 | Land [foundation-module-architecture.md](foundation-module-architecture.md) and this document |
| 0.2 | Add `foundationDependencyArchitecture.spec.ts` with current-state baseline |
| 0.3 | Add `foundationRootBarrelArchitecture.spec.ts` listing symbols to remove in REF-02 |
| 0.4 | Cross-link from [engineering-and-review-standard.md §6](../../development/engineering-and-review-standard.md#6-naming-imports-and-layout) and [nirvana-integration-architecture.md §2.1](../nirvana-integration-architecture.md#21-target-module-ownership) |

**Exit:** Tests pass on current tree; denylist documents target delta.

---

### Phase 1 — Finish existing capsules

**Goal:** Eliminate all shadow structures.

| Step | Action |
|------|--------|
| 1.1 | Move nine facades per [§3.1](#31-phase-1--finish-existing-capsules) |
| 1.2 | Add/update each capsule's `index.ts` |
| 1.3 | Update architecture spec owned-module paths |
| 1.4 | Shrink root barrel re-exports to re-export capsule barrels |

**Exit:** Shadow-structure count = 0; `nvb test` green.

---

### Phase 2 — High-pain flat clusters

**Goal:** Create `status/`, `init/`, `discovery/`, `bindings/`, `read/`, `paths/`, `parsing/`.

| Priority | Domain | Rationale |
|----------|--------|-----------|
| P1 | `status/` | Largest flat cluster; single command consumer |
| P2 | `init/` | Clear boundary; `LC-*` batches touch init |
| P3 | `discovery/` + `bindings/` | Shared by read commands and init |
| P4 | `read/` | Thin facades over discovery |
| P5 | `paths/`, `parsing/` | L1 dependencies for above |

**Exit:** Root file count ≤40; domain architecture specs pass.

---

### Phase 3 — Pack, upgrade, observation, lifecycle

**Goal:** Complete remaining L2–L4 domains per [§3.3](#33-phase-3--pack-upgrade-observation-lifecycle).

**Exit:** Root file count = 0 (only `index.ts` remains).

---

### Phase 4 — Barrel hardening and command cleanup (REF-02)

**Goal:** Enforce encapsulation at import sites.

| Step | Action |
|------|--------|
| 4.1 | Replace root wildcard exports with named domain re-exports |
| 4.2 | Remove denylisted symbols from root barrel (see [architecture §7.2](foundation-module-architecture.md#72-root-barrel--forbidden-exports-capsule-internal)) |
| 4.3 | Create `presentation/`; move presenters |
| 4.4 | Update all commands to domain-barrel imports |
| 4.5 | Add `commandImportArchitecture.spec.ts` |
| 4.6 | Tighten `foundationDependencyArchitecture.spec.ts` to full layer matrix |

**Exit:** Command deep-import count = 0; root barrel ≤50 lines; all architecture gates green.

---

## 5. Implementation batches

These batches are **structural remediation**, not v1 product batches. They may
run outside the 74-batch lane graph but must still follow the engineering
standard and independent review.

### REF-01 — Foundation capsule completion and domain extraction

| Field | Value |
|-------|-------|
| **Objective** | Eliminate shadow structures; extract `status/`, `init/`, `discovery/`, `bindings/`, `read/`, `paths/`, `parsing/`, `pack/`, `upgrade/`, `observation/`, `lifecycle/` |
| **Dependencies** | None |
| **Owns** | `src/foundation/**` moves, spec path updates, new domain architecture specs |
| **Excludes** | Product behavior changes; command import cleanup (REF-02) |
| **Proof** | `nvb build && nvb test`; zero root facades; domain specs pass; module size inventory |
| **Docs** | Update [progress tracking](#7-progress-tracking) |

### REF-02 — Barrel hardening and presentation boundary

| Field | Value |
|-------|-------|
| **Objective** | Shrink god barrel; command domain imports; `presentation/` capsule; full dependency gate |
| **Dependencies** | REF-01 accepted |
| **Owns** | `foundation/index.ts`, `src/commands/*` imports, `presentation/`, architecture gates |
| **Excludes** | New product commands |
| **Proof** | `commandImportArchitecture.spec.ts`; root barrel denylist; full `nvb test` |

---

## 6. Acceptance criteria

REF-01 and REF-02 are accepted when **all** of the following hold:

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | No `*.ts` files at `src/foundation/` root except `index.ts` | Filesystem walk in architecture spec |
| 2 | No shadow structures (`Foo.ts` beside `foo/`) | Architecture spec |
| 3 | Root barrel ≤50 lines, no `export *` | `foundationRootBarrelArchitecture.spec.ts` |
| 4 | Commands import only domain or root barrels | `commandImportArchitecture.spec.ts` |
| 5 | Layer import matrix enforced | `foundationDependencyArchitecture.spec.ts` |
| 6 | Each L3/L4 domain has `*Architecture.spec.ts` | File inventory |
| 7 | All owned modules within size limits or accepted split | Per-domain size walk |
| 8 | `nvb build && nvb test` pass with zero regressions | CI / local proof |
| 9 | No normative product spec changes unless separately amended | Reviewer checklist |
| 10 | Engineering standard acceptance matrix PASS | Review report |
| 11 | Layout conforms to [foundation-module-architecture.md](foundation-module-architecture.md) | Reviewer checklist |

---

## 7. Progress tracking

| Phase | Status | Commit / batch |
|-------|--------|----------------|
| Phase 0 — Policy docs | ✅ Accepted | This commit |
| Phase 1 — Capsule completion | ⏳ Pending | REF-01 |
| Phase 2 — Flat cluster extraction | ⏳ Pending | REF-01 |
| Phase 3 — Pack/upgrade/observation | ⏳ Pending | REF-01 |
| Phase 4 — Barrel hardening | ⏳ Pending | REF-02 |

---

## Appendix — reviewer checklist

- [ ] No product behavior change without spec amendment
- [ ] Nirvana API usage audit unchanged (moves only)
- [ ] Module size limits satisfied or split with justification
- [ ] No new circular dependencies
- [ ] Architecture specs updated with exact paths
- [ ] Root barrel denylist enforced
- [ ] Command imports use domain barrels only (REF-02)
- [ ] No `export *` at root or domain barrels
- [ ] No shadow structures remain
- [ ] `nvb build && nvb test` evidence attached
- [ ] Engineering standard acceptance matrix PASS
- [ ] Conforms to [foundation-module-architecture.md](foundation-module-architecture.md)

---

*End of document.*
