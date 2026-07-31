# wt-upgrade-knowledge Implementation Tracker

> **Accepted bootstrap implementation artifact.** Dispatch is authorized only under the
> accepted dependency DAG and paired independent batch-review gates. Product-created
> lanes remain subject to the structured pack acceptance and seal contract in
> `docs/spec/v1-contracts.md`.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

**Status:** ❌ Pending — all 5 batches planned, none started
**Last Updated:** 2026-07-30
**Scope:** Upgrade compatibility, migration registry, atomic apply/recovery, host knowledge installers, version reporting, and help closure

## Implementation-Pack Readiness

- ✅ All 5 work briefs and 5 implementation launch prompts carry the common
  reasoning, clean-code, module-size, proof, ownership, and handoff protections.
- ✅ All 5 review briefs and 5 reviewer launch prompts carry independent
  source-verification, correction, tracker, local-report, and structural-reject
  instructions.
- ✅ Reasoning floors are assigned by state, compatibility-matrix, atomicity,
  crash-recovery, destructive-operation, and integration risk; reviewer
  reasoning is never lower than implementor reasoning.
- ✅ Every launch prompt retains a complete forwarding profile both at the top
  and beside its local implementor/reviewer reasoning section.
- ✅ Hand-maintained modules use the exact category matrix (120 command/front
  door, 140 orchestrator, 200 foundation, 240 contracts, and 300 tests as
  preferred maxima), including its category-specific warning and hard-reject
  bands; no count excuses mixed responsibilities.
- ✅ The 16-item reviewer hard-reject checklist is complete and governs every
  review batch.
- ❌ No batch has been implemented.
- ❌ No batch has been reviewed.

## Status Legend

- ✅ `Done` — implemented, reviewed, and accepted
- ⏳ `In Progress` — active implementation or review
- 🟠 `Correction Required` — implemented but rejected pending repair
- ❌ `Pending` — planned, not started
- 🚫 `Blocked` — cannot move honestly without an external dependency or decision

## Batch Status Snapshot

| Batch | Phase | Status | Short note |
|-------|-------|--------|------------|
| UK-01 | Upgrade compatibility | ❌ Pending | Runtime/knowledge/schema compatibility matrix; read-only preview; depends on LC-03, RT-02 |
| UK-02 | Migration registry | ❌ Pending | Pure version-steps; staged rebuild; value/history/pin/lifecycle preservation; depends on UK-01, LC-05 |
| UK-03 | Atomic apply/recovery | ❌ Pending | Manifest-last switch; crash recovery; old runtime usable; guarded downgrade; depends on UK-02, RT-04, RT-06 |
| UK-04 | Host knowledge installers | ❌ Pending | Codex/Cursor/Claude adapters; preview/replace/scope; version record; depends on RT-01, RT-02 |
| UK-05 | Version reporting | ❌ Pending | CLI/runtime/knowledge/schema report; two-version fixtures; collision/failed-migration proof; depends on UK-03, UK-04 |

## Batch Proof Summary

| Batch | Minimum proof posture |
|-------|-----------------------|
| UK-01 | Unit tests for every classification outcome (changed/preserved/conflict/added/removed); schema compatibility matrix across declared versions; no-change upgrade fixture; missing target runtime error; incompatible schema version refusal; lane-owned conflict detection; `--json` format validation against `upgradePlan` schema; `UpgradeCommand` human-output rendering |
| UK-02 | Unit tests for every migration step independently and composed; step chain from v1 to v2 with all intermediate steps; value preservation for every lane-owned artifact class (config, sessions, pins, holds, amendments, budgets, state); session-index rebuild correctness against known source data; policy-baseline migration with truth-equivalent output; missing intermediate step error; stale index isolation |
| UK-03 | Integration tests for successful upgrade end-to-end; interrupted upgrade at every write point (before first link, after first link, after asset stage, before manifest, before verification); recovery at each interruption point; old runtime invocable after recovery; downgrade refusal without `--allow-downgrade`; incompatible downgrade refusal; successful downgrade with compatible target; checksum mismatch during staging; manifest-last atomicity at every crash point |
| UK-04 | Unit tests for each adapter preview output (Codex, Cursor, Claude); `--replace` refusal in non-interactive mode; installed version recording for each host; scope filtering; existing-file detection; destination-path validation; no lane-specific state in installed skill paths; `--dry-run` no-write proof; `--json` format validation |
| UK-05 | Integration tests for `wt version` all-four-component report; two-version coexistence fixture; lane-bound version report; packaged-runtime-only version report; collision detection and refusal; failed migration recovery; `--json` format validation against `versionReport` schema; help fragment validation; `nvb build` pass; relevant Jasmine suite pass |

## Dependency And Gate Summary

```text
RM-01 (contracts)
  └── RT-01, RT-02 (runtime/knowledge manifests)
        ├── UK-04 (host adapters)──────────────────────┐
        └── LC-03, LC-05 (lane layout, pack index)     │
              └── UK-01 (compatibility planner)         │
                    └── UK-02 (migration registry)      │
                          └── RT-04, RT-06 (catalog,    │
                                managed links)          │
                                └── UK-03 (apply/       │
                                      recovery)─────────┤
                                                        │
                                   UK-05 (version       │
                                   reporting) ◄─────────┘
                            depends on UK-03 + UK-04
```

## Current Honest Next Step

- **Pack head:** ❌ No batch has started. Begin UK-01.
- **UK-01:** ❌ Pending. Depends on LC-03 (transactional lane layout) and RT-02
  (runtime/knowledge manifests) being accepted. Creates `src/foundation/UpgradePlanner.ts`
  and `src/commands/UpgradeCommand.ts`.
- **UK-04:** ❌ Pending. Depends on RT-01 (runtime/knowledge asset audit) and
  RT-02 being accepted. May proceed in parallel with UK-01/UK-02.
  Creates `src/foundation/HostAdapters.ts` and `src/commands/SkillInstallCommand.ts`.
- **UK-02:** ❌ Pending. Depends on UK-01 and LC-05 accepted.
- **UK-03:** ❌ Pending. Depends on UK-02, RT-04, and RT-06 accepted.
- **UK-05:** ❌ Pending. Depends on UK-03 and UK-04 accepted. Integration gate.

## Required Proof Matrix

| Proof class | UK-01 | UK-02 | UK-03 | UK-04 | UK-05 |
|-------------|:-----:|:-----:|:-----:|:-----:|:-----:|
| Unit/contract fixtures | ✅ required | ✅ required | — | ✅ required | — |
| Filesystem integration | — | — | ✅ required | ✅ required | ✅ required |
| Transaction crash/replay | — | — | ✅ required | — | ✅ required |
| Schema validation | ✅ required | ✅ required | ✅ required | — | ✅ required |
| JSON output format | ✅ required | — | — | ✅ required | ✅ required |
| Help and documentation | — | — | — | — | ✅ required |
| Build (`nvb build`) | ✅ required | ✅ required | ✅ required | ✅ required | ✅ required |

## Batch-Blocker Register

No blockers currently registered. Blockers will be added if a batch reveals
a missing upstream dependency, specification contradiction, or unresolved
product decision.
