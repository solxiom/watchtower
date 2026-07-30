# wt-runtime-distribution — Implementation Tracker

**Status:** ⏳ Pack awaiting first batch acceptance
**Last Updated:** 2026-07-30
**Scope:** Inherited shell runtime and coordinator knowledge → complete, immutable,
auditable distribution — asset audit, manifests, NVB staging, immutable catalog,
runtime adapter, managed links, and integration smoke proof

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
- ⏳ Hand-maintained modules target focused 160/220-line bands.
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
| RT-05 | Runtime adapter | ❌ Pending | Awaiting RT-04 and RM-01 acceptance |
| RT-06 | Managed links | ❌ Pending | Awaiting RT-04 and RT-05 acceptance |
| RT-07 | Smoke proof | ❌ Pending | Awaiting RT-03, RT-05, and RT-06 acceptance |

## Batch Proof Summary

| Batch | Minimum proof posture |
|-------|-----------------------|
| RT-01 | Audit every inherited shell runtime script and coordinator knowledge doc; record source path, SHA-256, line count, description, and coordinator action mapping; build behavioral inventory covering every coordinator action and doc without omissions; prove no script or doc is missed |
| RT-02 | Define `RuntimeManifestV1` and `KnowledgeManifestV1` types with `schemaVersion`, `checksums`, `mode`, and `actions`; implement validator that rejects missing, extra, non-executable, and checksum-mismatched assets; prove every asset/checksum/mode/action is represented and every rejection path works |
| RT-03 | Configure `runtime-nvb/dist.nvb` with `wt:pack:runtime` and `wt:runtime:validate` tasks; package SQLite native driver binary from DB-01 into `dist/driver/` for all target platforms; prove `nvb dist` produces correct `dist/` layout; prove executable bits preserved; prove build validation fails on missing, extra, non-executable, and checksum-mismatched assets; prove driver binary loads from dist location; prove dist manifest includes driver checksum and platform mapping |
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
