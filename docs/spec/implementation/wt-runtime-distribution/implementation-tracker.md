# wt-runtime-distribution — Implementation Tracker

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

**Status:** ⏳ Pack awaiting first batch acceptance
**Last Updated:** 2026-07-30
**Scope:** Inherited shell runtime and coordinator knowledge → complete, immutable,
auditable distribution — asset audit, manifests, NVB staging, immutable catalog,
`LaneTaskRunner`/leaf boundaries, managed links, and integration smoke proof

## Implementation-Pack Readiness

- ⏳ All 7 work briefs and 7 implementation launch prompts carry the common
  reasoning, clean-code, module-size, proof, ownership, and handoff protections.
- ⏳ All 7 review briefs and 7 reviewer launch prompts carry independent
  source-verification, correction, tracker, local-report, and structural-reject
  instructions.
- ⏳ Reasoning floors are assigned by state, concurrency, security-boundary,
  integration, and closure risk; reviewer reasoning is never lower than
  implementor reasoning.
- ⏳ Every launch prompt retains a complete forwarding profile both at the top
  and beside its local implementor/reviewer reasoning section.
- ⏳ Hand-maintained modules must use the exact project-wide category matrix:
  120 command/TaskHandler/front door, 140 orchestrator, 200 foundation, 240
  contracts, and 300 tests as preferred maxima, with their specified warning
  and hard-reject bands.
- ⏳ Pack 1 (`wt-read-model`) dependency interfaces are declared per batch.

## Status Legend

- ✅ `Done` — implemented, reviewed, and accepted
- ⏳ `In Progress` — active implementation or review
- 🟠 `Correction Required` — implemented but rejected pending repair
- ❌ `Pending` — planned, not started
- 🚫 `Blocked` — cannot move honestly without an external dependency or decision

## Batch Status Snapshot

| Batch | Phase | Status | Short note |
|-------|-------|--------|------------|
| RT-01 | Asset audit/import | ❌ Pending | Awaiting RM-01 acceptance |
| RT-02 | Manifest foundation | ❌ Pending | Awaiting RT-01 acceptance |
| RT-03 | NVB staging | ❌ Pending | Awaiting RT-02 and DB-01 acceptance |
| RT-04 | Immutable catalog | ❌ Pending | Awaiting RT-02 and RM-03 acceptance |
| RT-05 | `LaneTaskRunner` and leaf invocation adapter | ❌ Pending | Awaiting RT-04 and RM-01 acceptance |
| RT-06 | Managed links | ❌ Pending | Awaiting RT-04 and RT-05 acceptance |
| RT-07 | Smoke proof | ❌ Pending | Awaiting RT-03, RT-05, and RT-06 acceptance |

## Batch Proof Summary

| Batch | Minimum proof posture |
|-------|-----------------------|
| RT-01 | Audit every inherited shell runtime script and coordinator knowledge doc; record provenance, digest, size, action, inputs/outputs, mutation/authority assumptions, and external tools; classify each script as TaskHandler replacement, bounded leaf, temporary wrapper with removal owner/expiry, or removal; prove no script/doc/action is missed and no workflow shell is mislabeled as a leaf |
| RT-02 | Define `RuntimeManifestV1` and `KnowledgeManifestV1` types with `schemaVersion`, `checksums`, `mode`, and `actions`; implement validator that rejects missing, extra, non-executable, and checksum-mismatched assets; prove every asset/checksum/mode/action is represented and every rejection path works |
| RT-03 | Implement capability fragments and focused public-API TaskHandlers; deterministically generate/validate `runtime-nvb.json` and `task-catalog.json`; use actual repository `nvb.json`/handler conventions for `wt:pack:runtime` and `wt:runtime:validate`; package runtime, knowledge, complete task runtime, and DB-01-selected driver artifacts; prove clean global install per supported target, modes/checksums, stale/duplicate aggregate rejection, relocated loading, and reproducible managed output |
| RT-04 | Implement XDG precedence resolver; prove `WATCHTOWER_DATA_HOME` > `XDG_DATA_HOME/watchtower` > `~/.local/share/watchtower`; prove atomic first-stage writes via temp-file-atomic-rename; prove two versions coexist under `<data-root>/runtimes/`; prove version roots are content-addressed and immutable after staging |
| RT-05 | Implement single invocation adapter; prove argv-only execution with `{ shell: false }`; prove `WT_*` allowlist excludes non-`WT_` keys; prove cwd validated as existing directory; prove OS account resolved and entrypoint access checked; prove signal/exit forwarding; prove runtime manifest action validation |
| RT-06 | Implement `ManagedAssets`; prove manifest-only ownership for managed files; prove link targets validated against runtime manifest checksums; prove collision with non-managed files refused; prove symlink path-escape after resolution refused; prove compatibility names resolve through `actions` array |
| RT-07 | Implement integration smoke test; prove relocated package wake stdout output; prove signal forwarding (SIGINT stops watcher); prove worker accounts read/can execute but cannot write runtime assets; prove no hardcoded paths in relocated package |

## Dependency And Gate Summary

```text
Pack 1 (wt-read-model)
  │
  ├─ RM-01 (contract kernel, error taxonomy)
  │   │
  │   ├─ DB-01 (SQLite driver selection, feasibility)
  │   │     │
  │   │     └──────────────────────────────────────┐
  │   │                                            │
  │   RM-03 (canonical paths, workspace)           │
  │     │                                          │
  │     └────────────┐                             │
  │                  │                             │
  ▼                  ▼                             ▼
RT-01 ─► RT-02 ─┬─► RT-03 ──────────────► RT-07
                 │
                 └─► RT-04 ─► RT-05 ─► RT-06 ─► RT-07
```

## Current Honest Next Step

- **Current pack head:** ❌ No batch has started. RT-01 is the first eligible
  batch and requires RM-01 acceptance from Pack 1 before beginning.
- **RT-01 depends on:** RM-01 accepted — contract types and error taxonomy must
  be in place before asset audit/import.
- **Pack 1 status:** `wt-read-model` pack design is the immediate prerequisite
  for the first work agent.

## Cross-Pack Dependency Status

| Required batch | Pack | Required for | Status |
|---------------|------|-------------|--------|
| RM-01 | wt-read-model | RT-01, RT-05 | ❌ Pending |
| DB-01 | wt-read-model | RT-03 | ❌ Pending |
| RM-03 | wt-read-model | RT-04 | ❌ Pending |
