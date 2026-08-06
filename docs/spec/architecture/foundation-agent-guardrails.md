# Foundation Layout — Agent Guardrails

Status: **Mandatory — every implementation and review launch that touches foundation code**
Scope: `src/foundation/`, `src/commands/`, `src/run.ts`, foundation architecture specs, and matching `spec/foundation/*Architecture*.spec.ts` gates
Authority: [foundation-module-architecture.md](foundation-module-architecture.md), [foundation-capability-tree-amendment.md](foundation-capability-tree-amendment.md), [foundation-refactor-implementation-tracker.md](foundation-refactor-implementation-tracker.md) (REF-01 … REF-03 ✅)
Last updated: 2026-08-04

---

## 1. Purpose

The foundation refactor is **accepted**. New code must conform to the capability-tree layout on the **first commit**, not in a follow-up refactor.

These guardrails bind:

- **Implementation agents** — where to place code, how to import, what proof to run before handoff.
- **Independent reviewers** — what to inspect, when to **REJECT**, and what to record in correction briefs.
- **Coordinators** — do not dispatch review when foundation architecture gates are missing from the implementation report.

Normative layout detail lives in the architecture specs above. This document is the **operational enforcement layer** for agents.

---

## 2. Implementer rules (hard)

### 2.1 Before editing

1. Read [foundation-module-architecture.md §3–§7](foundation-module-architecture.md#3-normative-target-tree-capability-grouped).
2. Identify the **owning capability** (runtime, task, lane, pack, index, init, read, …) and **layer** (L1–L6).
3. Map the change to **one exclusive owner** named in the batch brief. Do not expand scope into adjacent capsules.

### 2.2 Placement rules

| If the concern is… | Place it under… | Never at foundation root as… |
|--------------------|-----------------|--------------------------------|
| Runtime catalog, managed assets, manifests, leaf invoke | `runtime/catalog/`, `runtime/distribution/`, `runtime/knowledge/`, `runtime/leaf/` | `runtimeCatalog/`, `managedAssets/`, flat `runtime/` leaf capsule |
| Lane task execution, catalog composition | `task/runtime/`, `task/catalog/` | `taskRuntime/`, `taskCatalogComposition/` |
| Lane persistence, writer, coordinator bootstrap | `lane/store/`, `lane/writer/`, `lane/coordinator/` | `laneStore/`, `transactionalWriter/`, `coordinatorBaseline/` |
| Pack index compile (CA-01) | `pack/index/` | `packIndex/` |
| Index store and query (CA-02) | `index/store/`, `index/query/` | `indexStore/`, `indexQuery/` |
| Context broker, cycle-budget ledger (CA-08) | `broker/` | flat prefix cluster, `contextBroker/` at foundation root |
| Pack consumer, seal, drift | `pack/` (L4 domain) | mixed into unrelated trees |
| Command orchestration | `src/commands/` | `src/foundation/` |
| Shared types | `src/contracts/` | foundation modules |

**Foundation root** (`src/foundation/`) may contain only `index.ts` as a file. All other entries are top-level capability/domain directories listed in [foundationCapabilityTreeArchitecture.spec.ts](../../spec/foundation/foundationCapabilityTreeArchitecture.spec.ts).

### 2.3 Import rules

**Commands** (`src/commands/*`, `src/run.ts`):

- Import foundation only through **domain barrels** (`../foundation/<domain>/index.js`) or **capability barrels** (`../foundation/runtime/index.js`, `task/`, `lane/`, `index/`).
- **Forbidden:** `../foundation/index.js` from commands (except external package consumers outside this repo).
- **Forbidden:** deep imports into capsule internals (`../foundation/pack/PackConsumer.js`, `../foundation/runtime/catalog/...`).

**Foundation modules**:

- Import sibling domains through their **`index.js` barrel**, not internal module paths in another domain.
- **L4** (`init/`, `lifecycle/`, `pack/` root modules, `upgrade/`) may reach **L5** only through capability barrels (`../runtime/index.js`, `../task/index.js`, `../lane/index.js`, `../index/index.js`) — never sub-capsule paths (`../runtime/catalog/`, `../task/runtime/`, …).
- **L1** must not import **L2+** (documented exception: `presentation/initPlanPresenter.ts` type-imports `InitPlan` from `init/`).
- **L2** must not import **L3+**; **L3** must not import **L4+**.
- **L4** must not import peer **L4** domains except lifecycle → `init/` for init-lock delegation.
- **SQLite driver** only in `foundation/storage/`.

**Root barrel** (`src/foundation/index.ts`):

- ≤50 lines, **no `export *`**, command-facing named re-exports only per [§7.1](foundation-module-architecture.md#71-root-barrel--permitted-exports).
- **Forbidden on root barrel:** capsule-internal symbols listed in [§7.2](foundation-module-architecture.md#72-root-barrel--forbidden-exports-capsule-internal).

### 2.4 Structural rejects (implementer must not introduce)

- Flat prefix clusters at foundation root (see amendment §5.1).
- Directory-shadow layout (`Thing.ts` beside `thing/`).
- Generic helper bags (`utils/`, `helpers/`, `common/`, `misc/`, `shared/` under foundation).
- Re-export-only fake parent barrels with no owned subtree.
- New product logic in `src/cli.ts` or `src/run.ts`.
- `node:child_process` in L4 domains.

### 2.5 Mandatory proof before handoff

When the batch touches foundation layout, imports, barrels, or commands:

```sh
nvb build && nvb test
```

The implementation report must state that these architecture specs ran green (they are part of `nvb test`):

| Gate spec | Encodes |
|-----------|---------|
| `foundationCapabilityTreeArchitecture.spec.ts` | Allowed top-level dirs; forbidden flat prefixes |
| `foundationRootBarrelArchitecture.spec.ts` | Root barrel size, no wildcards, denylist |
| `commandImportArchitecture.spec.ts` | Command domain-barrel imports (recursive) |
| `commandLayoutArchitecture.spec.ts` | Command groups; root ratchet; cross-group imports |
| `foundationDependencyArchitecture.spec.ts` | Layer matrix + gate inventory |
| Per-domain `*Architecture.spec.ts` | Domain inventory and boundary for owned areas |

Also complete **§5 Foundation layout** in [pre-handoff-self-audit.md](../implementation/pre-handoff-self-audit.md).

---

## 3. Reviewer enforcement (hard)

Reviewers treat foundation guardrails as **first-class acceptance gates**, not style preferences.

### 3.1 Review procedure (foundation-touching batches)

After specification scope, before accepting layering generally:

1. **Diff scan** — list every new/changed file under `src/foundation/`, `src/commands/`, `src/run.ts`.
2. **Placement** — each file belongs to the batch owner and the correct capability tree path (§2.2).
3. **Imports** — run the mental checklist in §2.3 against the diff; grep for forbidden patterns:
   - `foundation/(runtimeCatalog|taskRuntime|laneStore|packIndex|indexStore|indexQuery|…)/` retired paths
   - commands importing `foundation/index.js` or deep capsule paths
   - L4 importing `../runtime/catalog/` (or other sub-capsules) instead of `../runtime/index.js`
4. **Root barrel** — if `src/foundation/index.ts` changed: line count ≤50, no wildcards, no denylisted exports.
5. **Automated proof** — independently run `nvb build && nvb test`; do not trust the implementation report alone.
6. **Gate specs** — if the batch adds a domain or moves files, confirm the matching `*Architecture.spec.ts` inventory/boundary tests were updated in the same batch.

### 3.2 Mandatory reject triggers

**REJECT** immediately (correction brief required) when any of the following appear in the batch diff:

| Code | Violation |
|------|-----------|
| **FLG-01** | New flat prefix cluster at `src/foundation/` root (forbidden names in amendment §5.1) |
| **FLG-02** | New `.ts` file at foundation root other than `index.ts` |
| **FLG-03** | Root barrel >50 lines, contains `export *`, or exports denylisted capsule-internal symbols |
| **FLG-04** | Command or `run.ts` imports `foundation/index.js` or a deep capsule path |
| **FLG-05** | L4 module imports L5 sub-capsule internals (e.g. `runtime/catalog/` instead of `runtime/index.js`) |
| **FLG-06** | Upward layer violation (L1→L2+, L2→L3+, L3→L4+) except documented lifecycle→init lock delegation |
| **FLG-07** | Directory-shadow or generic helper bag introduced under foundation |
| **FLG-08** | SQLite driver import outside `foundation/storage/` |
| **FLG-09** | Architecture gate spec fails or was not updated when file inventory/boundaries changed |
| **FLG-10** | Implementation report omits foundation layout proof (`nvb test` gate list) for a foundation-touching batch |

Working behavior **does not** excuse layout violations. **REJECT**, do not "accept with follow-up."

### 3.3 Correction brief requirements

When rejecting for **FLG-***, the correction brief must include:

1. Reject code(s) from the table above.
2. Exact file paths and import lines violating the guardrail.
3. Expected target path or barrel import after correction.
4. Requirement to re-run `nvb build && nvb test` with all architecture gates green.
5. Statement that unrelated acceptance criteria remain unchanged.

Use the pack's `review-batches/corrections/` naming convention.

### 3.4 Review report matrix extension

For foundation-touching batches, add this row to the engineering acceptance matrix:

| Gate | Required verdict |
|------|------------------|
| Foundation layout and import guardrails | PASS / FAIL |

`FAIL` → **REJECT** with FLG codes.

---

## 4. Coordinator dispatch rules

- Do not dispatch review for a foundation-touching batch unless the implementation report includes completed [pre-handoff-self-audit.md §5](../implementation/pre-handoff-self-audit.md) and explicit `nvb test` architecture gate confirmation.
- Do not dispatch an implementer on a correction unless the correction brief cites FLG codes and expected barrel/path targets.

---

## 5. Quick reference — allowed top-level foundation directories

```text
bindings, broker, discovery, distribution, hostAdapters, index, init, lane,
lifecycle, observation, pack, parsing, paths, presentation, read, runtime,
schemaComposition, status, storage, task, upgrade
```

Plus `index.ts` only at root. **Zero** flat prefix clusters.

Capability trees: `runtime/`, `task/`, `lane/`, `index/`; nested `pack/index/`.

---

## 6. Related documents

| Document | Role |
|----------|------|
| [foundation-module-architecture.md](foundation-module-architecture.md) | Normative tree, layers, barrels, export contract |
| [foundation-capability-tree-amendment.md](foundation-capability-tree-amendment.md) | REF-03 capability grouping |
| [foundation-layout-remediation.md](foundation-layout-remediation.md) | Migration inventory, reviewer checklist |
| [engineering-and-review-standard.md §11–§12](../../development/engineering-and-review-standard.md) | Global hard rejects and review procedure |
| [pre-handoff-self-audit.md §5](../implementation/pre-handoff-self-audit.md) | Implementer checklist |
| Pack `agent-launch-contract.md` | Mandatory launch envelope reference to this document |

---

*End of guardrails.*
