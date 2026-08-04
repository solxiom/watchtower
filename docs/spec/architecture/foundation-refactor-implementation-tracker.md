# Foundation Refactor — Implementation Tracker

Status: **Active — FM-2 in progress (FM-1 ✅)**

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
| Score | **12 / 32** work units accepted |
| Baseline root files | 84 (target: 0) |
| Shadow structures | 0 (target: 0) |

---

## Milestone tracker

| Milestone | Name | Batch | State | Accepted proof |
|-----------|------|-------|-------|----------------|
| FM-0 | Policy and baseline gates | REF-01 | ✅ Accepted | FR-00 … FR-02 ✅; baseline arch gates green |
| FM-1 | Capsule completion | REF-01 | ✅ Accepted | FR-03 … FR-11 ✅; zero shadow structures; capsule barrel re-exports |
| FM-2 | L1–L3 domain extraction | REF-01 | ⏳ In progress | FR-12 next |
| FM-3 | L4 domain extraction | REF-01 | ❌ Pending | Root only `index.ts` |
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
| FR-12 | `paths/` | ❌ Pending | 4 modules; `paths/index.ts`; arch gate |
| FR-13 | `parsing/` | ❌ Pending | 6 modules; `parsing/index.ts`; arch gate |
| FR-14 | `discovery/` | ❌ Pending | 8 modules; barrel; arch gate |
| FR-15 | `bindings/` | ❌ Pending | 2 modules; barrel |
| FR-16 | `read/` | ❌ Pending | 7 modules; `read/index.ts`; list/config specs |
| FR-17 | `status/` | ❌ Pending | 22 modules; `status/index.ts`; status arch gate |
| FR-18 | `init/` | ❌ Pending | 6 modules; `init/index.ts`; init arch gate |

### FM-3 — L4 domain extraction

| ID | Domain | State | Acceptance proof |
|----|--------|-------|------------------|
| FR-19 | `pack/` | ❌ Pending | 11 modules; split if needed; arch gate |
| FR-20 | `upgrade/` | ❌ Pending | 6 modules; arch gate |
| FR-21 | `observation/` | ❌ Pending | 5 modules; `process/` merged |
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
| REF-01 | FR-00 … FR-24 | 12 / 25 | ⏳ In progress |
| REF-02 | FR-25 … FR-31 | 0 / 7 | ❌ Blocked on REF-01 |

---

## Domain directory checklist

Target domains from
[foundation-module-architecture.md §4](foundation-module-architecture.md#4-capability-domain-catalog).
Mark ✅ when directory exists, barrel lands, and owning FR work unit accepts.

| Domain | Layer | FR | Directory exists | Barrel | State |
|--------|------:|-----|:----------------:|:------:|-------|
| `paths/` | L1 | FR-12 | ❌ | ❌ | Pending |
| `parsing/` | L1 | FR-13 | ❌ | ❌ | Pending |
| `presentation/` | L1 | FR-25 | ❌ | ❌ | Pending |
| `discovery/` | L2 | FR-14 | ❌ | ❌ | Pending |
| `bindings/` | L2 | FR-15 | ❌ | ❌ | Pending |
| `observation/` | L2 | FR-21 | ❌ | ❌ | Pending |
| `read/` | L3 | FR-16 | ❌ | ❌ | Pending |
| `status/` | L3 | FR-17 | ❌ | ❌ | Pending |
| `init/` | L4 | FR-18 | ❌ | ❌ | Pending |
| `lifecycle/` | L4 | FR-22 | ❌ | ❌ | Pending |
| `pack/` | L4 | FR-19 | ❌ | ❌ | Pending |
| `upgrade/` | L4 | FR-20 | ❌ | ❌ | Pending |
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
| `pathsArchitecture.spec.ts` | FR-12 | ❌ Not created |
| `parsingArchitecture.spec.ts` | FR-13 | ❌ Not created |
| `discoveryArchitecture.spec.ts` | FR-14 | ❌ Not created |
| `statusArchitecture.spec.ts` | FR-17 | ❌ Not created |
| `initArchitecture.spec.ts` | FR-18 | ❌ Not created |
| `packArchitecture.spec.ts` | FR-19 | ❌ Not created |
| `upgradeArchitecture.spec.ts` | FR-20 | ❌ Not created |
| `taskRuntimeArchitecture.spec.ts` | — | ✅ Exists — no path changes required |
| `managedAssetsArchitecture.spec.ts` | FR-05 | ✅ Exists — update paths in FR-05 |
| `indexQueryArchitecture.spec.ts` | FR-08, FR-09 | ✅ Accepted — paths updated |
| `runtimeKnowledgeManifestArchitecture.spec.ts` | — | ✅ Exists |

---

## Metrics snapshot

Refresh after each accepted work unit.

| Metric | Value | Target | Last verified |
|--------|------:|-------:|---------------|
| Root `.ts` files (excl. `index.ts`) | 84 | 0 | 2026-08-04 |
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
