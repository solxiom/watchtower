# Foundation Capability Tree — Architecture Amendment

Status: **Accepted — supersedes flat L5 sibling layout in REF-01 interim state**
Scope: nested capability grouping under `src/foundation/`
Supersedes: [foundation-module-architecture.md §3.1](foundation-module-architecture.md#31-full-target-tree) flat L5–L6 sibling list (2026-08-04 interim)
Applies to: all foundation work after REF-01 acceptance
Last updated: 2026-08-04

---

## 1. Problem statement

REF-01 achieved its exit criterion — **zero `.ts` files at the foundation root
except `index.ts`** — but left **~20 parallel top-level directories** that share
obvious product capability prefixes without sharing a parent:

| Flat siblings (unacceptable interim) | Shared capability |
|-----------------------------------|-------------------|
| `runtime/`, `runtimeCatalog/`, `runtimeDistribution/`, `runtimeKnowledgeManifest/` | **Runtime** staging, catalog, assets, manifests, leaf invocation |
| `taskRuntime/`, `taskCatalogComposition/` | **Task** execution and catalog composition |
| `laneStore/`, `transactionalWriter/`, `coordinatorBaseline/` | **Lane** persistence and coordinator bootstrap |
| `packIndex/` beside `pack/` | **Pack** consumption vs index compile (same product concern, split across roots) |
| `indexStore/`, `indexQuery/` beside `packIndex/` | **Index** store and query (coordinator index surface) |

`runtimeDistribution/` was especially misleading: an L4 **re-export barrel** with
no owned modules, forwarding symbols from unrelated sibling capsules. That is
barrel indirection, not capability grouping.

The engineering standard requires **capability grouping when a capability needs
multiple files**. REF-01 grouped *files* into domains but did not group
*domains* into capability trees. **This amendment closes that gap.**

---

## 2. Decision

### 2.1 Capability tree rule

When two or more foundation directories serve the **same named product
capability** (runtime, task, lane, pack index, …), they **must** live under a
**single parent capability directory** with a parent barrel:

```text
<capability>/
  index.ts                 ← tier-1 capability barrel (aggregate public surface)
  <sub-capability>/
    index.ts               ← tier-2 capsule barrel
    …modules
```

Foundation root (`src/foundation/`) may contain:

1. **`index.ts`** only as a file at root.
2. **Top-level capability directories** — one directory per product capability
   (see §3).
3. **No flat prefix clusters** — names like `runtimeCatalog/` at foundation root
   are **forbidden** after REF-03.

### 2.2 Naming rule

- Parent directory = **short capability noun** (`runtime`, `task`, `lane`, `index`).
- Child directory = **sub-capability role** without repeating the parent prefix
  (`catalog`, not `runtimeCatalog`; `runtime`, not `taskRuntime`).
- The current L6 `runtime/` capsule (leaf/process invocation) moves to
  **`runtime/leaf/`** to avoid `runtime/runtime/` and to free the parent name
  for the capability tree.

### 2.3 Layer rule (unchanged semantics, nested paths)

Layer numbers (L0–L6) describe **dependency authority**, not directory depth.
Nesting does not relax import rules: `runtime/catalog/` remains L5; `init/`
remains L4 and imports `runtime/index.js`, not `runtime/catalog/` internals.

### 2.4 Interim REF-01 state

Directories created during REF-01 (`runtimeDistribution/`, flat `runtimeCatalog/`,
etc.) are **accepted interim debt**. They are **not** the long-term target.
REF-03 remediates them without product behavior change.

---

## 3. Normative target tree (capability-grouped)

Legend: `→` = physical move from current path.

```text
src/foundation/
  index.ts

  # ── L1 ───────────────────────────────────────────────────────────
  paths/
  parsing/
  presentation/
  schemaComposition/

  # ── L2 ───────────────────────────────────────────────────────────
  discovery/
  bindings/
  observation/

  # ── L3 ───────────────────────────────────────────────────────────
  read/
  status/

  # ── L4 ───────────────────────────────────────────────────────────
  init/
  lifecycle/                    # binding + membership orchestration (unchanged)
  pack/                         # consumer, seal, drift, hosts (unchanged)
  upgrade/

  # ── L5–L6 capability trees ───────────────────────────────────────
  runtime/
    index.ts                    # public: RuntimeCatalog, ManagedAssets, manifests, leaf port
    catalog/          → runtimeCatalog/
    distribution/   → managedAssets/     # managed links, task profile install (RT-04–RT-06)
    knowledge/      → runtimeKnowledgeManifest/
    leaf/             → runtime/         # L6 process/leaf invocation (RT-05)

  task/
    index.ts
    runtime/          → taskRuntime/
    catalog/          → taskCatalogComposition/

  lane/
    index.ts
    store/            → laneStore/
    writer/           → transactionalWriter/
    coordinator/      → coordinatorBaseline/

  pack/                         # L4 domain (existing)
    …
    index/            → packIndex/         # nested L5 compile pipeline (CA-01)

  index/                        # coordinator sealed-pack index (CA-02)
    index.ts
    store/            → indexStore/
    query/            → indexQuery/

  storage/                      # cross-cutting SQLite (unchanged top-level)
  hostAdapters/                 # L6 knowledge installers (unchanged)
  distribution/                 # L6 Nirvana install/closure verify (RT-08) — NOT runtime/distribution
```

### 3.1 Name collision note

| Path | Meaning |
|------|---------|
| `runtime/distribution/` | Managed runtime **assets** on disk (links, task profiles) |
| `foundation/distribution/` | Nirvana ecosystem **install verification** (separate L6 concern) |

Do not merge these. If `foundation/distribution/` causes confusion after the
tree lands, a follow-up rename to `nirvanaInstall/` is allowed in a separate
amendment.

---

## 4. Barrel model (extended tiers)

| Tier | Location | Example |
|------|----------|---------|
| **T3** | `foundation/index.ts` | Re-exports capability/domain barrels only |
| **T2** | `foundation/<capability>/index.ts` | `runtime/index.ts` aggregates catalog + distribution + knowledge + leaf |
| **T1** | `foundation/<capability>/<sub>/index.ts` | `runtime/catalog/index.ts` |
| **T0** | Internal modules | Not exported from any barrel |

Import rule for L4 consumers (`init/`, `upgrade/`):

```typescript
import {RuntimeCatalog, ManagedAssets} from '../runtime/index.js';
// NOT from '../runtimeCatalog/index.js' or '../runtime/distribution/index.js'
```

---

## 5. Delivery batch REF-03

| Field | Value |
|-------|-------|
| **Batch** | REF-03 — capability tree re-nesting |
| **Depends on** | REF-01 accepted (FM-3), REF-02 may run in parallel where disjoint |
| **Risk** | Medium — wide import path churn, `runtime-nvb/` tsconfig paths, manifest checksums |
| **Behavior** | Neutral — moves + barrel updates only |

Work units: **FR-32 … FR-38** in
[foundation-refactor-implementation-map.md](foundation-refactor-implementation-map.md).

### 5.1 Forbidden after REF-03

- Top-level `runtimeCatalog/`, `runtimeDistribution/`, `managedAssets/`,
  `runtimeKnowledgeManifest/`, `taskRuntime/`, `taskCatalogComposition/`,
  `laneStore/`, `transactionalWriter/`, `coordinatorBaseline/`, `packIndex/`,
  `indexStore/`, `indexQuery/` as siblings of `runtime/`, `task/`, etc.
- Re-export-only “fake parent” barrels with no owned subtree (old
  `runtimeDistribution/` pattern).

### 5.2 Transition

Prefer **one-shot moves** with import retargeting in the same work unit. Optional
deprecated shim re-exports at old paths are **discouraged**; if used, they must
be removed in FR-38 integration with an architecture gate forbidding flat names.

---

## 6. Architecture gates (REF-03)

New or tightened specs:

| Spec | Encodes |
|------|---------|
| `foundationCapabilityTreeArchitecture.spec.ts` | Allowed top-level dirs; forbidden flat prefix clusters |
| `runtimeCapabilityArchitecture.spec.ts` | `runtime/` subtree inventory + L5 boundary |
| `taskCapabilityArchitecture.spec.ts` | `task/` subtree inventory |
| `laneCapabilityArchitecture.spec.ts` | `lane/` subtree inventory |
| `indexCapabilityArchitecture.spec.ts` | `index/` + `pack/index/` inventory |

Update existing gates to use nested paths (`runtime/leaf/` for tmux compat leaf in
`taskRuntimeArchitecture.spec.ts`, etc.).

---

## 7. Related documents

| Document | Update required |
|----------|-----------------|
| [foundation-module-architecture.md](foundation-module-architecture.md) | §2, §3, §4, §6, §7 — **updated by this amendment** |
| [foundation-layout-remediation.md](foundation-layout-remediation.md) | REF-03 section + migration inventory |
| [foundation-refactor-implementation-map.md](foundation-refactor-implementation-map.md) | FM-5, FR-32 … FR-38 |
| [foundation-refactor-implementation-tracker.md](foundation-refactor-implementation-tracker.md) | REF-03 tracker rows |

---

*End of amendment.*
