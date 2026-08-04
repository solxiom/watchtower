# Watchtower Foundation Module Architecture

Status: **Accepted — implementation architecture**
Scope: `src/foundation/` target layout, barrels, dependency layers, and public surfaces
Applies to: v1 implementation and post-v1 foundation evolution
Last updated: 2026-08-04

This document is the **normative target architecture** for `src/foundation/`:
capability-owned domains, three-tier barrels, dependency layers, presentation
boundaries, and the public export contract commands and external packages may
depend on.

Execution — current-state diagnosis, file moves, phased migration, and
`REF-01`/`REF-02` remediation batches — lives in
[foundation-layout-remediation.md](foundation-layout-remediation.md).

It supplements, but does not replace:

- [architecture.md](../architecture.md) — product separation of concerns;
- [nirvana-integration-architecture.md](../nirvana-integration-architecture.md) —
  NVB/runtime facade boundaries and the §2.1 module ownership sketch;
- [engineering-and-review-standard.md](../../development/engineering-and-review-standard.md) —
  layer ownership, size limits, barrel rules, naming; and
- [AGENTS.md](../../../AGENTS.md) — repository layout conventions.

Normative product behavior is unchanged. Conforming to this architecture is a
**structural requirement** for new foundation code. Remediation of the legacy
flat layout is tracked separately and must not change public CLI behavior,
schema version, or lane semantics unless a separate spec amendment says
otherwise.

---

## Table of contents

1. [Purpose and target outcome](#1-purpose-and-target-outcome)
2. [Design principles](#2-design-principles)
3. [Target topology](#3-target-topology)
4. [Capability domain catalog](#4-capability-domain-catalog)
5. [Three-tier barrel model](#5-three-tier-barrel-model)
6. [Dependency layers and allowed imports](#6-dependency-layers-and-allowed-imports)
7. [Public export contract](#7-public-export-contract)
8. [Presentation boundary](#8-presentation-boundary)
9. [Architecture test requirements](#9-architecture-test-requirements)
10. [Non-goals](#10-non-goals)
11. [Related documents](#11-related-documents)

---

## 1. Purpose and target outcome

`src/foundation/` is the application layer between `src/commands/` and
infrastructure ports (storage, NVB task runtime, leaf adapters). Every module
must belong to a **named capability domain** with a deliberate barrel surface.

### Target outcome

| Dimension | Legacy (pre-remediation) | Target |
|-----------|------------------------|--------|
| Root-level `.ts` files (excluding `index.ts`) | 93 | **0** |
| Foundation root barrel size | ~126 lines, ~80+ symbols | **≤50 lines**, domain re-exports only |
| Command deep-imports into foundation internals | 6+ paths | **0** (domain barrels only) |
| Shadow structures (`Foo.ts` beside `foo/`) | 8+ | **0** |
| Architecture gates per major domain | 4 | **12+** |
| Wildcard re-exports at root | 4 (`export *`) | **0** |

New foundation work must land in the target shape even before remediation
completes. Do not add files to the foundation root except `index.ts`.

---

## 2. Design principles

### 2.1 Capability-first layout

Group code by **what it does for the product**, not by file type or
implementation-pack ID. Implementation packs (`wt-read-model`, `wt-lane-lifecycle`,
etc.) are delivery boundaries; foundation domains are runtime capability
boundaries. A domain may span evidence from multiple packs (for example `status/`
implements read-model batch `RM-12` only).

### 2.2 Inward dependencies

```text
commands/  →  foundation domain barrels  →  foundation capsules  →  contracts/
                                                              ↓
                                                    Nirvana / leaf ports
```

Commands never import capsule internals. Foundation domains never import
commands. Infrastructure capsules (`storage/`, `taskRuntime/`, `runtime/`) never
import application services (`status/`, `init/`).

### 2.3 Facade + capsule pattern

Every domain follows the `taskRuntime/` template:

```text
domain/
  index.ts              ← tier-1 barrel (public surface)
  DomainFacade.ts       ← primary service / planner (optional if index is thin)
  internalModule.ts     ← lowerCamelCase helpers
  ports/                ← optional injected ports (only if multiple files)
```

Rules:

1. **One primary responsibility** per module (engineering standard §5).
2. **Barrels export deliberately** — no wildcard growth at domain or root level.
3. **Document withheld exports** in barrel header comments (see
   `taskRuntime/index.ts`).
4. **No shadow structures** — the facade lives inside the capsule directory.

### 2.4 Presentation stays at the edge

Foundation services return **typed results** and throw **typed errors**.
Human/JSON rendering lives in `foundation/presentation/` and command presenters.
This matches the engineering standard layer table and Nira's CLI mental model.

### 2.5 Architecture tests are mandatory

Each domain maintains an `*Architecture.spec.ts` that encodes:

- allowed import boundaries;
- barrel export allowlists/denylists;
- module size inventory for owned files; and
- forbidden patterns (SQL outside `storage/`, `child_process` outside approved
  adapters, etc.).

---

## 3. Target topology

### 3.1 Full target tree

```text
src/foundation/
  index.ts                         # tier-3 root barrel (domain re-exports only)

  # ── L1: pure / low I/O ─────────────────────────────────────────────
  paths/
    index.ts
    canonicalPaths.ts
    dataHomeResolver.ts
    DataRoot.ts
    workspaceResolver.ts

  parsing/
    index.ts
    envParser.ts
    stateParser.ts
    scalarLineParser.ts
    stateRecordParser.ts
    laneLifecycle.ts
    JsonlParser.ts

  presentation/
    index.ts
    commandEnvelopeSerializer.ts
    ResultRenderer.ts
    initPlanPresenter.ts
    upgradePlanPresenter.ts

  # ── L2: read-only I/O / observation ────────────────────────────────
  discovery/
    index.ts
    homeLaneDiscovery.ts
    laneDiscovery.ts
    LaneDiscoveryFileSystem.ts
    RelevantLaneDiscovery.ts
    LaneSelector.ts
    SecondaryDiscovery.ts
    membershipIndex.ts
    laneManifestReader.ts

  bindings/
    index.ts
    repositoryBindings.ts
    writableConflicts.ts

  observation/
    index.ts
    runtimeObservations.ts
    NirvanaTmuxObserver.ts
    heartbeatObservation.ts
    TmuxSessionProcessRunner.ts

  # ── L3: application read services ──────────────────────────────────
  read/
    index.ts
    LaneListService.ts
    LaneListCursor.ts
    ResolvedConfigService.ts
    LaneConfigProjectionReader.ts
    LaneInstallIdentityReader.ts
    LaneReadFileStore.ts
    LaneStateProjectionReader.ts

  status/
    index.ts
    StatusProjection.ts
    statusHealth.ts
    statusViewProjection.ts
    statusLaneTypes.ts
    statusPackTypes.ts
    statusPackRecordProjection.ts
    statusRegularFileIdentity.ts
    StatusAcceptedInputInspector.ts
    StatusConflictInspector.ts
    StatusEventProjection.ts
    StatusLaneInputReader.ts
    StatusLiveObserver.ts
    StatusPackAcceptanceAuthority.ts
    StatusPackContractReader.ts
    StatusPackFileInventory.ts
    StatusPackGitInspector.ts
    StatusPackGraphValidator.ts
    StatusPackIntegrity.ts
    StatusProofInputInspector.ts
    StatusRepositoryGitInspector.ts
    StatusRuntimeInventory.ts
    StatusSourceBaselineInspector.ts

  # ── L4: mutation / planners ────────────────────────────────────────
  init/
    index.ts
    InitPlanner.ts
    InitContracts.ts
    InitPorts.ts
    InitPreflightHost.ts
    InitRoutingValidator.ts
    initLocks.ts

  lifecycle/
    index.ts
    BindingMutator.ts
    MembershipRegistrar.ts
    # facades delegate to nested capsules:
    #   laneStore/, transactionalWriter/, coordinatorBaseline/

  pack/
    index.ts
    PackConsumer.ts
    PackAcceptance.ts
    PackDriftObserver.ts
    PackSeal.ts
    packConsumerPorts.ts
    packFilesystemHost.ts
    packGitHost.ts
    packSchemaValidatorsHost.ts
    packJsonReaders.ts
    packSchemaFormats.ts

  upgrade/
    index.ts
    UpgradePlanner.ts
    UpgradePreviewSource.ts
    upgradeFileSystem.ts
    MigrationRegistry.ts
    MigrationSteps.ts
    migrationValidation.ts

  runtimeDistribution/
    index.ts
    # re-exports RuntimeCatalog, ManagedAssets, LaneTaskProfileInstaller facades
    # from nested capsules

  # ── L5–L6: infrastructure capsules (unchanged names) ───────────────
  laneStore/
  transactionalWriter/
  coordinatorBaseline/
  managedAssets/
  runtimeCatalog/
  packIndex/
  indexStore/
  indexQuery/
  storage/
  taskRuntime/
  runtime/
  hostAdapters/
  distribution/
  runtimeKnowledgeManifest/
  schemaComposition/
  taskCatalogComposition/
```

### 3.2 Structural diagram

```mermaid
flowchart TB
  subgraph commands ["src/commands/"]
    InitCmd[InitCommand]
    ListCmd[ListCommand]
    StatusCmd[StatusCommand]
    UpgradeCmd[UpgradeCommand]
  end

  subgraph foundationRoot ["foundation/index.ts — tier 3"]
    direction LR
  end

  subgraph L3read ["L3 read services"]
    readDomain[read/]
    statusDomain[status/]
  end

  subgraph L4mut ["L4 mutation"]
    initDomain[init/]
    lifecycleDomain[lifecycle/]
    packDomain[pack/]
    upgradeDomain[upgrade/]
  end

  subgraph L5infra ["L5 infrastructure"]
    storageCap[storage/]
    taskRuntimeCap[taskRuntime/]
    runtimeCap[runtime/]
  end

  subgraph contracts ["src/contracts/"]
    types[types / schemas / errors]
  end

  InitCmd --> initDomain
  ListCmd --> readDomain
  StatusCmd --> statusDomain
  UpgradeCmd --> upgradeDomain

  foundationRoot --> L3read
  foundationRoot --> L4mut

  L3read --> L2disc[discovery/]
  L3read --> L2obs[observation/]
  L4mut --> L2disc
  L4mut --> packDomain

  L2disc --> L1parse[parsing/]
  L2disc --> L1paths[paths/]
  L3read --> L1parse
  packDomain --> storageCap
  lifecycleDomain --> laneStore[laneStore/]
  upgradeDomain --> runtimeDistribution[runtimeDistribution/]

  L3read --> types
  L4mut --> types
  L5infra --> types
```

### 3.3 Import direction (target)

```text
commands ──► domain/index.ts ──► capsule internals
                                  (never the reverse path for consumers)
```

All domains follow the `taskRuntime/` encapsulation model.

---

## 4. Capability domain catalog

Each domain has a single tier-1 barrel. The table states purpose, layer,
primary facade, and pack traceability.

| Domain directory | Layer | Purpose | Primary facade / entry | Pack evidence |
|------------------|------:|---------|------------------------|---------------|
| `paths/` | L1 | Canonical path rules, data-home resolution, workspace context | `resolveWorkspace`, `resolveWatchtowerDataHome` | RM-03 |
| `parsing/` | L1 | Strict env/state/scalar/JSONL parsing | `parseEnvConfig`, `parseLaneState`, `parseJsonlStream` | RM-04, RM-05 |
| `presentation/` | L1 | Command envelope serialization and terminal/JSON rendering | `buildCommandResult`, `renderResult` | RM-02 |
| `discovery/` | L2 | Home and secondary lane discovery, selection | `discoverHomeLanes`, `selectLane` | RM-06, RM-07 |
| `bindings/` | L2 | Repository bindings and writable conflict inspection | `readRepositoryBindings`, `inspectWritableConflicts` | RM-08 |
| `observation/` | L2 | Tmux, heartbeat, runtime session observation | `observeRuntimeSessions`, `NirvanaTmuxObserver` | RM-09 |
| `read/` | L3 | `list` and `config show` services | `LaneListService`, `ResolvedConfigService` | RM-10 |
| `status/` | L3 | `status` projection and health derivation | `StatusProjection` | RM-12 |
| `init/` | L4 | Init argument resolution, preflight planning | `InitPlanner`, `validateInitRequest` | LC-01 |
| `lifecycle/` | L4 | Post-init binding/membership orchestration | `BindingMutator`, `MembershipRegistrar` | LC-04 |
| `pack/` | L4 | Pack acceptance, seal, drift, consumption hosts | `consumePack`, `observePackDrift` | LC-02, CA-01 |
| `upgrade/` | L4 | Upgrade preview/apply planning, migrations | `UpgradePlanner`, `MigrationRegistry` | UK-01–UK-03 |
| `runtimeDistribution/` | L4 | Runtime catalog and managed asset facades | `RuntimeCatalog`, `ManagedAssets` | RT-04–RT-06 |
| `laneStore/` | L5 | Transactional lane layout generation | `LaneStore` | LC-03 |
| `transactionalWriter/` | L5 | Atomic lane directory commit | `commitLane` | LC-03 |
| `coordinatorBaseline/` | L5 | Coordinator/session policy baselines at init | `buildCoordinatorBaseline` | LC-05 |
| `managedAssets/` | L5 | Managed runtime links and task profile install | `ManagedAssets`, `LaneTaskProfileInstaller` | RT-06 |
| `runtimeCatalog/` | L5 | Immutable runtime version tree | `RuntimeCatalog` | RT-04 |
| `packIndex/` | L5 | Sealed-pack SQLite compile pipeline | `PackIndexCompiler` | CA-01 |
| `indexStore/` | L5 | Pack index store open/read | `IndexStore` | CA-02 |
| `indexQuery/` | L5 | Bounded typed index queries | `IndexQuery` | CA-02 |
| `storage/` | L5 | Derived SQLite stores and migrations | `openDerivedStorage` | DB-01, CA-03 |
| `taskRuntime/` | L5 | Lane task runner port and catalog | `LaneTaskRunner`, `NirvanaLaneTaskRunner` | RT-05 |
| `runtime/` | L6 | Leaf/process invocation adapters | `LeafRuntimeInvoker` | RT-05 |
| `hostAdapters/` | L6 | Knowledge pack installers (Codex/Cursor/Claude) | `resolveHostAdapter` | UK-04 |
| `distribution/` | L6 | Nirvana closure/install verification | `NirvanaInstallVerifier` | RT-08 |
| `schemaComposition/` | L1 | Deterministic JSON Schema composition | (module exports) | RM-13 |
| `taskCatalogComposition/` | L5 | Task catalog aggregate composition | (module exports) | RT-09 |
| `runtimeKnowledgeManifest/` | L5 | Runtime/knowledge manifest validation | `RuntimeKnowledgeManifestValidator` | RT-02 |

---

## 5. Three-tier barrel model

### 5.1 Tier definitions

| Tier | Location | Responsibility | Wildcards |
|------|----------|----------------|-----------|
| **T1 — Capsule** | `foundation/<capsule>/index.ts` | Export the capability port, options types, and narrowly shared helpers | ❌ Forbidden |
| **T2 — Domain** | `foundation/<domain>/index.ts` | Aggregate T1 exports for one product concern; hide internal inspectors | ❌ Forbidden |
| **T3 — Root** | `foundation/index.ts` | Stable import path for commands and external packages (`src/index.ts`) | ❌ Forbidden |

### 5.2 Import rules by consumer

| Consumer | Allowed import paths | Forbidden |
|----------|---------------------|-----------|
| `src/commands/*` | `foundation/<domain>/index.js`, `foundation/index.js` | Any path matching `foundation/<domain>/<internal>.js` except through T1/T2 barrel |
| `src/run.ts`, `src/cli.ts` | `foundation/presentation/index.js` | Domain internals |
| `spec/foundation/<domain>/*` | Domain under test + its declared dependencies | Unrelated domain internals (use public barrel instead) |
| `spec/integration/*` | `foundation/index.js` or specific domain barrels | Deep FS/SQL ports unless testing that capsule |
| Foundation domain A | Domain B's **barrel** or B's contracts types via `src/contracts/` | Domain B's internal files |
| Foundation domain A | Own capsule internals freely | — |

### 5.3 Template: tier-1 barrel header

Every capsule barrel must include a header modeled on `taskRuntime/index.ts`:

```typescript
// Public surface of the <domain> capability.
// Deliberately NOT exported:
//   - <InternalHelper>
//   - <FsPort>
//   - <SqlSchemaConstant>
export {PrimaryFacade} from './PrimaryFacade.js';
export type {PrimaryFacadeOptions} from './PrimaryFacade.js';
```

### 5.4 Template: tier-3 root barrel

```typescript
// Foundation root — domain barrels only. Do not export capsule internals here.
export {
  LaneListService,
  ResolvedConfigService,
  type LaneListQuery,
  type ResolvedConfigQuery
} from './read/index.js';

export {
  StatusProjection,
  type StatusProjectionOptions,
  type StatusProjectionQuery
} from './status/index.js';

export {
  InitPlanner,
  validateInitRequest,
  type InitPlan,
  type InitRequest
} from './init/index.js';

export {
  buildCommandError,
  buildCommandResult,
  renderError,
  renderResult
} from './presentation/index.js';

// … explicit named re-exports only; no `export *`
```

---

## 6. Dependency layers and allowed imports

### 6.1 Layer matrix

| Layer | Domains / capsules | May import from |
|------:|--------------------|-----------------|
| **L0** | `src/contracts/` | Other contracts, schema refs only |
| **L1** | `paths/`, `parsing/`, `presentation/`, `schemaComposition/` | L0 |
| **L2** | `discovery/`, `bindings/`, `observation/` | L0, L1 |
| **L3** | `read/`, `status/` | L0, L1, L2 |
| **L4** | `init/`, `lifecycle/`, `pack/`, `upgrade/`, `runtimeDistribution/` | L0–L3, L5 (via ports only) |
| **L5** | `laneStore/`, `storage/`, `taskRuntime/`, `packIndex/`, `indexStore/`, `indexQuery/`, `managedAssets/`, `runtimeCatalog/`, `taskCatalogComposition/`, `runtimeKnowledgeManifest/`, `transactionalWriter/`, `coordinatorBaseline/` | L0, L1 (paths/parsing only) |
| **L6** | `runtime/`, `hostAdapters/`, `distribution/` | L0, L1, L5 ports as needed |

**Hard rules:**

1. L1 must not import L2+.
2. L3 must not import L4+.
3. L5 `storage/` is the **only** layer that imports the SQLite driver.
4. L6 `runtime/` owns process invocation; L4 never imports `node:child_process`.
5. No circular dependencies — break cycles by moving shared types to `contracts/`.

Enforcement lives in `spec/foundation/foundationDependencyArchitecture.spec.ts`
(see [remediation plan](foundation-layout-remediation.md)).

---

## 7. Public export contract

### 7.1 Root barrel — permitted exports

| Symbol | Domain barrel | Used by |
|--------|---------------|---------|
| `LaneListService`, `LaneListQuery`, pagination helpers | `read/` | `ListCommand` |
| `ResolvedConfigService`, `ResolvedConfigQuery` | `read/` | `ConfigCommand` |
| `StatusProjection`, `StatusProjectionQuery` | `status/` | `StatusCommand` |
| `InitPlanner`, `validateInitRequest`, `InitPlan`, `InitRequest` | `init/` | `InitCommand` |
| `UpgradePlanner`, `UpgradePreviewSource` | `upgrade/` | `UpgradeCommand` |
| `buildCommandResult`, `buildCommandError`, `renderResult`, `renderError` | `presentation/` | All commands, `run.ts` |
| `resolveHostAdapter`, `create*HostAdapter`, `INSTALL_SCOPES`, `HOST_NAMES` | `hostAdapters/` | `SkillInstallCommand` |
| `LaneTaskRunner`, `NirvanaLaneTaskRunner`, `LaneTaskCatalog` | `taskRuntime/` | Watch/coordinator batches |
| `RuntimeCatalog`, `ManagedAssets` | `runtimeDistribution/` | Init, upgrade, doctor batches |

### 7.2 Root barrel — forbidden exports (capsule-internal)

| Symbol | Owner capsule | Why internal |
|--------|---------------|--------------|
| `PACK_INDEX_SCHEMA`, `PACK_INDEX_META_TABLE` | `packIndex/` | SQL DDL |
| `nodeManagedLinkFileSystem`, `ManagedLinkFileSystem` | `managedAssets/` | FS port |
| `parseInstallManifest` | `managedAssets/` | Parser |
| `COMPATIBILITY_NAMES`, `resolveCompatibilityName*` | `managedAssets/` | RT-06 internal |
| `gitUnavailable`, `nodePackGitInspector` | `pack/` | Host adapter |
| `createNodePackFileSystem`, `nodePackFileSystem` | `pack/` | Host adapter |
| `loadPackSchemaValidators` | `pack/` | Host adapter |
| `consumePack`, `observePackDrift`, pack seal helpers | `pack/` | Lifecycle/coordinator facades only |
| `IndexStore`, `IndexQuery` | `indexStore/`, `indexQuery/` | CA batches use domain barrels |
| Wildcard re-exports from infrastructure capsules | respective capsules | Import capsule directly when needed |

### 7.3 Domain barrel surfaces (tier-2 examples)

#### `read/index.ts`

```typescript
export {LaneListService} from './LaneListService.js';
export type {LaneListQuery, LaneListServiceOptions} from './LaneListService.js';
export {ResolvedConfigService} from './ResolvedConfigService.js';
export type {ResolvedConfigQuery, ResolvedConfigServiceOptions} from './ResolvedConfigService.js';
export {digestLaneListQuery, paginateLaneList, validateLaneListPageInput, MAX_LIST_PAGE_SIZE} from './LaneListCursor.js';
// Internal readers — NOT exported
```

#### `status/index.ts`

```typescript
export {StatusProjection} from './StatusProjection.js';
export type {StatusProjectionOptions, StatusProjectionQuery} from './StatusProjection.js';
export {deriveStatusHealth} from './statusHealth.js';
export type {StatusHealthInput} from './statusHealth.js';
// All Status*Inspector modules — NOT exported
```

#### `init/index.ts`

```typescript
export {InitPlanner, validateInitRequest} from './InitPlanner.js';
export type {InitPlan, InitRequest, CoordinatorRoutingPolicy} from './InitContracts.js';
export type {InitPreflightPort, ScopeReadResult} from './InitPorts.js';
// initLocks, InitPreflightHost — NOT exported
```

#### `upgrade/index.ts`

```typescript
export {UpgradePlanner} from './UpgradePlanner.js';
export type {UpgradePlannerOptions} from './UpgradePlanner.js';
export {UpgradePreviewSource} from './UpgradePreviewSource.js';
export type {UpgradePreviewSourceOptions, UpgradeSourceQuery} from './UpgradePreviewSource.js';
export {MigrationRegistry} from './MigrationRegistry.js';
export type {MigrationRegistryOptions} from './MigrationRegistry.js';
export {stageMigrationPlan} from './MigrationSteps.js';
// upgradeFileSystem port — NOT exported
```

---

## 8. Presentation boundary

### 8.1 Ownership split

| Concern | Owner | Must not own |
|---------|-------|--------------|
| Typed query/result construction | Domain service (`read/`, `status/`, `init/`) | Terminal formatting |
| Envelope wrapping + schema validation | `presentation/commandEnvelopeSerializer.ts` | Discovery or mutation |
| Human/JSON rendering | `presentation/ResultRenderer.ts` | Business rules |
| Command-specific field layout | `src/commands/*Presenter.ts` | Domain algorithms |

### 8.2 Target command import pattern

```typescript
// InitCommand.ts
import {InitPlanner} from '../foundation/init/index.js';
import {presentInitPlan} from '../foundation/presentation/index.js';

// StatusCommand.ts
import {StatusProjection} from '../foundation/status/index.js';
import {buildCommandResult, renderResult} from '../foundation/presentation/index.js';
```

### 8.3 Command → domain import map

| Command | Domain imports |
|---------|----------------|
| `ListCommand` | `read/`, `presentation/` |
| `ConfigCommand` | `read/`, `presentation/` |
| `StatusCommand` | `status/`, `presentation/` |
| `InitCommand` | `init/`, `presentation/` |
| `UpgradeCommand` | `upgrade/`, `presentation/` |
| `SkillInstallCommand` | `hostAdapters/`, `presentation/` |
| `run.ts` | `presentation/` |

Command-specific presenters remain in `src/commands/`.

---

## 9. Architecture test requirements

### 9.1 Existing gates (update paths on move)

| Spec file | Domain |
|-----------|--------|
| `taskRuntimeArchitecture.spec.ts` | `taskRuntime/`, `runtime/` |
| `managedAssetsArchitecture.spec.ts` | `managedAssets/` |
| `indexQueryArchitecture.spec.ts` | `indexQuery/`, `indexStore/`, `storage/` |
| `runtimeKnowledgeManifestArchitecture.spec.ts` | `runtimeKnowledgeManifest/` |
| `coordinatorBaselinePolicy.spec.ts` | `coordinatorBaseline/` |

### 9.2 Required gates (added during remediation)

| Spec file | Encodes |
|-----------|---------|
| `foundationDependencyArchitecture.spec.ts` | Layer import matrix (§6) |
| `foundationRootBarrelArchitecture.spec.ts` | Root export allowlist; forbidden internals |
| `commandImportArchitecture.spec.ts` | Commands import only domain/root barrels |
| `statusArchitecture.spec.ts` | Module inventory, size limits, import boundary |
| `initArchitecture.spec.ts` | Same |
| `discoveryArchitecture.spec.ts` | Same |
| `packArchitecture.spec.ts` | Same |
| `upgradeArchitecture.spec.ts` | Same |

### 9.3 Gate template (per domain)

Each `*Architecture.spec.ts` must include:

1. **Module inventory** — walk `src/foundation/<domain>/` recursively.
2. **Size inventory** — owned modules ≤200 lines (foundation service limit).
3. **Import boundary** — forbidden import patterns for that layer.
4. **Barrel export denylist** — symbols that must not appear in `foundation/index.js` or `src/index.js`.
5. **Positive control** — at least one regex self-test.

### 9.4 Positive template in codebase

```text
src/foundation/taskRuntime/index.ts
spec/foundation/taskRuntimeArchitecture.spec.ts
```

---

## 10. Non-goals

| Item | Reason |
|------|--------|
| Renaming domains to match pack IDs | Capability names are clearer at runtime |
| Refactoring `src/contracts/` | Separate concern |
| Reorganizing `runtime-nvb/` handlers | Different layer; already capability-split |
| Changing public CLI commands, flags, or JSON shapes | Structural refactor only |
| Merging command presenters into foundation | Command-specific layout stays in commands |

---

## 11. Related documents

| Document | Role |
|----------|------|
| [foundation-layout-remediation.md](foundation-layout-remediation.md) | File migration inventory, reviewer checklist |
| [foundation-refactor-implementation-map.md](foundation-refactor-implementation-map.md) | Milestones, work units, dependencies, waves |
| [foundation-refactor-implementation-tracker.md](foundation-refactor-implementation-tracker.md) | **Live status** |
| [architecture.md](../architecture.md) | Product separations |
| [nirvana-integration-architecture.md](../nirvana-integration-architecture.md) | NVB/runtime facade targets |
| [engineering-and-review-standard.md](../../development/engineering-and-review-standard.md) | Mandatory gates |
| [AGENTS.md](../../../AGENTS.md) | Repository conventions |

### Pack traceability

| Foundation domain | Primary accepted batch evidence |
|-------------------|--------------------------------|
| `paths/`, `parsing/` | RM-03, RM-04, RM-05 |
| `discovery/`, `bindings/` | RM-06, RM-07, RM-08 |
| `read/` | RM-10 |
| `status/` | RM-12 |
| `taskRuntime/`, `runtime/` | RT-05 |
| `managedAssets/`, `runtimeCatalog/` | RT-04, RT-06 |
| `pack/`, `packIndex/`, `indexStore/`, `indexQuery/` | LC-02, CA-01, CA-02 |
| `init/`, `laneStore/`, `transactionalWriter/` | LC-01, LC-03 |
| `coordinatorBaseline/` | LC-05 |
| `upgrade/` | UK-01, UK-02 |
| `hostAdapters/` | UK-04 |
| `distribution/` | RT-08 |
| `schemaComposition/` | RM-13 |
| `taskCatalogComposition/` | RT-09 |

---

*End of document.*
