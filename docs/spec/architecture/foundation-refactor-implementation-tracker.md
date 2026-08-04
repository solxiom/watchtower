# Foundation Refactor — Implementation Tracker

Status: **Active — FM-3 in progress (FR-20 … FR-21 ✅)**

Construction plan:
[foundation-refactor-implementation-map.md](foundation-refactor-implementation-map.md)

Normative target:
[foundation-module-architecture.md](foundation-module-architecture.md)

Last updated: 2026-08-04

---

## Lane summary

| Field | Value |
|-------|-------|
| Remediation | Foundation layout refactor (`REF-01`, `REF-02`) |
| Work units | **32** (`FR-00` … `FR-31`) |
| Milestones | **5** (`FM-0` … `FM-4`) |
| Score | **21 / 32** work units accepted |
| Baseline root files | 12 (target: 0) |
| Shadow structures | 0 (target: 0) |

---

## Milestone tracker

| Milestone | Name | Batch | State | Accepted proof |
|-----------|------|-------|-------|----------------|
| FM-0 | Policy and baseline gates | REF-01 | ✅ Accepted | FR-00 … FR-02 ✅; baseline arch gates green |
| FM-1 | Capsule completion | REF-01 | ✅ Accepted | FR-03 … FR-11 ✅; zero shadow structures; capsule barrel re-exports |
| FM-2 | L1–L3 domain extraction | REF-01 | ✅ Accepted | FR-12 … FR-18 ✅ |
| FM-3 | L4 domain extraction | REF-01 | ⏳ In progress | FR-18 … FR-19 ✅ |
| FM-4 | Barrel hardening | REF-02 | ❌ Pending | Full import + dependency gates |

---

## Work unit tracker

### FM-0 — Policy and baseline gates

| ID | Work unit | State | Acceptance proof |
|----|-----------|-------|------------------|
| FR-00 | Land architecture spec bundle | ✅ Accepted | `docs/spec/architecture/`; cross-links in README, engineering standard, nirvana-integration |
| FR-01 | Baseline dependency architecture gate | ✅ Accepted | `spec/foundation/foundationDependencyArchitecture.spec.ts`; `nvb test` green |
| FR-02 | Baseline root-barrel denylist gate | ✅ Accepted | `spec/foundation/foundationRootBarrelArchitecture.spec.ts`; `nvb test` green |

### FM-1 — Capsule completion

| ID | Work unit | State | Acceptance proof |
|----|-----------|-------|------------------|
| FR-03 | `laneStore` facade move | ✅ Accepted | `laneStore/index.ts`; `LaneStore.ts` removed; `nvb test` green |
| FR-04 | `transactionalWriter` facade move | ✅ Accepted | `transactionalWriter/index.ts`; `TransactionalWriter.ts` removed; `nvb test` green |
| FR-05 | `managedAssets` facade move | ✅ Accepted | `managedAssets/index.ts`; root facades removed; arch spec updated; `nvb test` green |
| FR-06 | `runtimeCatalog` facade move | ✅ Accepted | `runtimeCatalog/index.ts`; `RuntimeCatalog.ts` removed; `nvb test` green |
| FR-07 | `packIndex` facade move | ✅ Accepted | `packIndex/PackIndexCompiler.ts` + barrel; `nvb test` green |
| FR-08 | `indexStore` facade move | ✅ Accepted | `indexStore/index.ts`; `IndexStore.ts` removed; arch spec path updated; `nvb test` green |
| FR-09 | `indexQuery` facade move | ✅ Accepted | `indexQuery/index.ts`; `IndexQuery.ts` removed; arch spec updated; `nvb test` green |
| FR-10 | `coordinatorBaseline` facade move | ✅ Accepted | `coordinatorBaseline/index.ts`; `CoordinatorBaseline.ts` removed; `nvb test` green |
| FR-11 | FM-1 integration | ✅ Accepted | Shadow count 0; capsule barrels on root re-exports; `nvb test` green |

### FM-2 — L1–L3 domain extraction

| ID | Domain | State | Acceptance proof |
|----|--------|-------|------------------|
| FR-12 | `paths/` | ✅ Accepted | 4 modules + barrel; `pathsArchitecture.spec.ts`; `nvb test` green |
| FR-13 | `parsing/` | ✅ Accepted | 6 modules + barrel; `parsingArchitecture.spec.ts`; `nvb test` green |
| FR-14 | `discovery/` | ✅ Accepted | 8 modules + barrel; `discoveryArchitecture.spec.ts`; `nvb test` green |
| FR-15 | `bindings/` | ✅ Accepted | 2 modules + barrel; binding specs green; `nvb test` green |
| FR-16 | `read/` | ✅ Accepted | 7 modules + barrel; list/config specs green; `nvb test` green |
| FR-17 | `status/` | ✅ Accepted | 22 modules + barrel; `statusArchitecture.spec.ts`; status specs green; `nvb test` green |
| FR-18 | `init/` | ✅ Accepted | 6 modules + barrel; `initArchitecture.spec.ts`; init specs green; `nvb test` green |

### FM-3 — L4 domain extraction

| ID | Domain | State | Acceptance proof |
|----|--------|-------|------------------|
| FR-19 | `pack/` | ✅ Accepted | 10 modules + barrel; `packArchitecture.spec.ts`; pack specs green; `nvb test` green |
| FR-20 | `upgrade/` | ✅ Accepted | 6 modules + barrel; `upgradeArchitecture.spec.ts`; upgrade specs green; `nvb test` green |
| FR-21 | `observation/` | ✅ Accepted | 5 modules + barrel; `runtimeObservations.spec.ts` green; `nvb test` green |
| FR-22 | `lifecycle/` | ❌ Pending | 2 modules; barrel |
| FR-23 | `runtimeDistribution/` | ❌ Pending | Re-export barrel for catalog + managed assets |
| FR-24 | FM-3 integration | ❌ Pending | Root file count = 1; `nvb test` |

### FM-4 — Barrel hardening (REF-02)

| ID | Work unit | State | Acceptance proof |
|----|-----------|-------|------------------|
| FR-25 | `presentation/` domain | ❌ Pending | Presenters + envelope/renderer; barrel |
| FR-26 | Root barrel shrink | ❌ Pending | ≤50 lines; no `export *` |
| FR-27 | Remove denylisted exports | ❌ Pending | Root denylist gate green |
| FR-28 | Command import cleanup | ❌ Pending | `commandImportArchitecture.spec.ts` |
| FR-29 | Full dependency gate | ❌ Pending | Full L0–L6 matrix |
| FR-30 | Remaining arch gates | ❌ Pending | All gates from map §6 green |
| FR-31 | REF-02 acceptance | ❌ Pending | Map §8 exit criteria; reviewer matrix PASS |

---

## Batch rollup

| Batch | Work units | Accepted | State |
|-------|----------:|---------:|-------|
| REF-01 | FR-00 … FR-24 | 21 / 25 | ⏳ In progress |
| REF-02 | FR-25 … FR-31 | 0 / 7 | ❌ Blocked on REF-01 |

---

## Domain directory checklist

Target domains from
[foundation-module-architecture.md §4](foundation-module-architecture.md#4-capability-domain-catalog).
Mark ✅ when directory exists, barrel lands, and owning FR work unit accepts.

| Domain | Layer | FR | Directory exists | Barrel | State |
|--------|------:|-----|:----------------:|:------:|-------|
| `paths/` | L1 | FR-12 | ✅ | ✅ | Accepted |
| `parsing/` | L1 | FR-13 | ✅ | ✅ | Accepted |
| `presentation/` | L1 | FR-25 | ❌ | ❌ | Pending |
| `discovery/` | L2 | FR-14 | ✅ | ✅ | Accepted |
| `bindings/` | L2 | FR-15 | ✅ | ✅ | Accepted |
| `observation/` | L2 | FR-21 | ✅ | ✅ | Accepted |
| `read/` | L3 | FR-16 | ✅ | ✅ | Accepted |
| `status/` | L3 | FR-17 | ✅ | ✅ | Accepted |
| `init/` | L4 | FR-18 | ✅ | ✅ | Accepted |
| `lifecycle/` | L4 | FR-22 | ❌ | ❌ | Pending |
| `pack/` | L4 | FR-19 | ✅ | ✅ | Accepted |
| `upgrade/` | L4 | FR-20 | ✅ | ✅ | Accepted |
| `runtimeDistribution/` | L4 | FR-23 | ❌ | ❌ | Pending |
| `laneStore/` | L5 | FR-03 | ✅ | ✅ | Accepted |
| `transactionalWriter/` | L5 | FR-04 | ✅ | ✅ | Accepted |
| `coordinatorBaseline/` | L5 | FR-10 | ✅ | ✅ | Accepted |
| `managedAssets/` | L5 | FR-05 | ✅ | ✅ | Accepted |
| `runtimeCatalog/` | L5 | FR-06 | ✅ | ✅ | Accepted |
| `packIndex/` | L5 | FR-07 | ✅ | ✅ | Accepted |
| `indexStore/` | L5 | FR-08 | ✅ | ✅ | Accepted |
| `indexQuery/` | L5 | FR-09 | ✅ | ✅ | Accepted |
| `storage/` | L5 | — | ✅ | ✅ | Pre-refactor OK |
| `taskRuntime/` | L5 | — | ✅ | ✅ | Template reference |
| `runtime/` | L6 | — | ✅ | ✅ | Pre-refactor OK |
| `hostAdapters/` | L6 | — | ✅ | ✅ | Pre-refactor OK |
| `distribution/` | L6 | — | ✅ | ✅ | Pre-refactor OK |
| `schemaComposition/` | L1 | FR-19 | ✅ | ✅ | `schemaBundle` move pending |
| `taskCatalogComposition/` | L5 | — | ✅ | ✅ | Pre-refactor OK |
| `runtimeKnowledgeManifest/` | L5 | — | ✅ | ✅ | Pre-refactor OK |

---

## Architecture gate tracker

| Spec | FR | State |
|------|-----|-------|
| `foundationDependencyArchitecture.spec.ts` | FR-01, FR-29 | ⏳ Baseline gate (FR-01 ✅); full matrix at FR-29 |
| `foundationRootBarrelArchitecture.spec.ts` | FR-02, FR-27 | ⏳ Baseline gate (FR-02 ✅); denylist removal at FR-27 |
| `commandImportArchitecture.spec.ts` | FR-28 | ❌ Not created |
| `pathsArchitecture.spec.ts` | FR-12 | ✅ Accepted |
| `parsingArchitecture.spec.ts` | FR-13 | ✅ Accepted |
| `discoveryArchitecture.spec.ts` | FR-14 | ✅ Accepted |
| `statusArchitecture.spec.ts` | FR-17 | ✅ Accepted |
| `initArchitecture.spec.ts` | FR-18 | ✅ Accepted |
| `packArchitecture.spec.ts` | FR-19 | ✅ Accepted |
| `upgradeArchitecture.spec.ts` | FR-20 | ✅ Accepted |
| `taskRuntimeArchitecture.spec.ts` | — | ✅ Exists — no path changes required |
| `managedAssetsArchitecture.spec.ts` | FR-05 | ✅ Exists — update paths in FR-05 |
| `indexQueryArchitecture.spec.ts` | FR-08, FR-09 | ✅ Accepted — paths updated |
| `runtimeKnowledgeManifestArchitecture.spec.ts` | — | ✅ Exists |

---

## Metrics snapshot

Refresh after each accepted work unit.

| Metric | Value | Target | Last verified |
|--------|------:|-------:|---------------|
| Root `.ts` files (excl. `index.ts`) | 12 | 0 | 2026-08-04 |
| Shadow structures | 0 | 0 | 2026-08-04 |
| Root barrel lines | ~126 | ≤50 | 2026-08-04 |
| Root `export *` count | 5 | 0 | 2026-08-04 |
| Command deep-imports | ~6 | 0 | 2026-08-04 |

---

## Update protocol

When a work unit completes:

1. Run `nvb build && nvb test`.
2. Set the work unit row to ✅ Accepted with commit hash or spec evidence.
3. Roll up milestone state when all child units accept.
4. Update **Metrics snapshot** if the unit changes countable baselines.
5. Update **Domain directory checklist** for domain moves.
6. Update **Score** in lane summary.

Do not mark a milestone ✅ until every child work unit is ✅ and integration
proof (FR-11, FR-24, FR-31) passes.

---

*End of tracker.*
