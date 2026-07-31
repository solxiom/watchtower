# wt-lane-lifecycle Implementation Tracker

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

**Status:** ⏳ Pack authoring — 0/8 batches implemented
**Last Updated:** 2026-07-30
**Scope:** Lane lifecycle — init planning, pack validation, transactional layout, bindings, coordinator bootstrap, watch, doctor, and integration/scaffold removal

## Implementation-Pack Readiness

- ✅ All 8 work briefs and 8 implementation launch prompts carry the common
  reasoning, clean-code, module-size, proof, ownership, and handoff protections.
- ✅ All 8 review briefs and 8 reviewer launch prompts carry independent
  source-verification, correction, tracker, local-report, and structural-reject
  instructions.
- ✅ Every launch prompt retains a complete forwarding profile both at the top
  and beside its local implementer/reviewer reasoning section: suitability,
  primary models, alternatives, steering-only tools, prohibited final-pass
  classes, context requirements, and final-authority limits.
- ✅ Reasoning floors are assigned by state, concurrency, transaction,
  seal-validation, cross-repository, integration, and closure risk; reviewer
  reasoning is never lower than implementor reasoning.
- ✅ Hand-maintained modules use the exact category matrix (120 command/front
  door, 140 orchestrator, 200 foundation, 240 contracts, and 300 tests as
  preferred maxima), including its category-specific warning and hard-reject
  bands; no count excuses mixed responsibilities.
- ✅ Dependencies declare exact prerequisite batch IDs from packs 1-2.

## Status Legend

- ✅ `Done` — implemented, reviewed, and accepted
- ⏳ `In Progress` — active implementation or review
- 🟠 `Correction Required` — implemented but rejected pending repair
- ❌ `Pending` — planned, not started
- 🚫 `Blocked` — cannot move honestly without an external dependency or decision

## Batch Status Snapshot

| Batch | Phase | Status | Short note |
|-------|-------|--------|------------|
| LC-01 | Init foundation | ❌ Pending | Init argument resolution and preflight plan; depends on RM-03, RM-08, RT-04 |
| LC-02 | Pack validation | ❌ Pending | Pack acceptance, seal, and drift validation; depends on RM-01, RM-08 |
| LC-03 | Lane store | ❌ Pending | Transactional lane layout and manifests; depends on LC-01, LC-02, RT-06 |
| LC-04 | Bindings/registration | ❌ Pending | Bindings, Git-ignore, and membership registration; depends on LC-03, RM-07 |
| LC-05 | Coordinator bootstrap | ❌ Pending | Coordinator/session baselines and initial pack index; depends on LC-02, LC-03, RT-02 |
| LC-06 | Watch command | ❌ Pending | Foreground watch command; depends on LC-05, RT-07 |
| LC-07 | Doctor registry | ❌ Pending | Comprehensive doctor registry; depends on LC-04, LC-05, LC-06, RM-09 |
| LC-08 | Integration/scaffold | ❌ Pending | Lifecycle integration and scaffold removal; depends on LC-07, RM-10 |

## Batch Proof Summary

| Batch | Minimum proof posture |
|-------|-----------------------|
| LC-01 | All arg combinations (slug, prefix, scope, routing); invalid slug/prefix rejection; ambiguous binding rejection; scope JSON validation; missing/invalid impl-pack path; dry-run premise (no creation); exact preflight plan shape; prefix pattern `^[a-z0-9][a-z0-9-]{0,15}$`; slug pattern `^[a-z0-9][a-z0-9-]{0,62}$` |
| LC-02 | JSON Schema validation of `implementation-pack.json`, `implementation-pack.lock.json`, `pack-acceptance.json`; RFC 8785 seal reproduction against known-good fixtures; reject missing/deleted/shifted sealed bytes; drift codes: `PACK_BYTES_CHANGED`, `PACK_FILESET_CHANGED`, `ACCEPTED_INPUT_CHANGED`, `SOURCE_BASELINE_CRITICAL`, `SOURCE_BASELINE_UNRELATED`, `SOURCE_BASELINE_UNAVAILABLE`; untracked/changed/symlink file-set rejection; no model classification |
| LC-03 | Adjacent staging directory; atomic rename commit point; fsync before rename; rollback on write failure; rollback on fsync failure; rollback on rename failure; rollback on partial manifest generation; manifest written last; `lane.json` schema validation (every required field, slug/ID patterns, repository uniqueness, control-home match); `install.json` schema validation; duplicate lane rejection; pre-existing directory rejection; complete lane-directory layout (every subdirectory from v1.md §7.2) |
| LC-04 | Lock acquisition order (data-root, lane, session, projection/index); binding schema validation; `.gitignore` presence check; `.gitignore` update with atomic replace; original digest preservation; conditional rollback (current digest matches written value); membership index creation under its lock; post-commit registration; registration retry on failure; stale entry ignored on read; registration-warning surface on index-write failure |
| LC-05 | Shipping-policy baseline seed (exact values from v1-contracts.md §7); routing policy baseline seed (every rule from v1-contracts.md §4); operator-session policy baseline seed; provenance markers; sealed pack index build; index digest matches active seal; no full-pack fallback path; no model invocation; deterministic reproduction across rebuilds |
| LC-06 | Lane validation preflight; runtime invocation context export; `WT_*` variables correct; watcher exec with inherited stdio; stdout/stderr passthrough; Ctrl-C terminates foreground process group; signal forwarding; exit code propagation; no daemonization; no fork/detach; missing watcher binary rejection; corrupt checksum rejection; stdin passthrough for interactive mode |
| LC-07 | Tool checks: `bash`, `git`, `tmux`, `jq`, `flock`, `rg`; account checks: configured OS accounts, resolved CLIs; pack checks: structure, acceptance, seal; policy checks: routing, session, index; index checks: freshness, integrity; permission checks: owner-only full-text, retention-coupled UI-cache; config/marker schema checks; repository path/branch/worktree consistency; concurrent write conflict detection; tmux-prefix conflict detection; Git-ignore coverage; all checks return pass/warn/fail/skip; doctor is read-only (no repair); exit codes: 0 for pass/warn, 4 for fail; grouped output |
| LC-08 | Clean init in temp fixture; `wt status` reads correctly; `wt watch` runs/terminates; `wt doctor` checks pass; rollback scenario: init fails, no residual state; hello artifacts: `src/commands/HelloCommand.ts` removed; `help/commands/hello.hlp.json` removed; hello entry from `help/help.json` removed; hello from `help/commands/README.md` if present; hello runtime-nvb tasks removed; hello spec files removed; `nvb build` passes after removal; no hello references in codebase |

## Proof Evidence Tracking

| Batch | Focused tests | Integration tests | Adversarial tests | Architecture checks |
|-------|--------------|-------------------|-------------------|---------------------|
| LC-01 | init planner arg validation | — | path escape, invalid utf-8, malformed json | `nvb build` |
| LC-02 | schema validation, seal reproduction | pack fixtures | truncated/manipulated lock, extra files | `nvb build` |
| LC-03 | writer fail-stages, rollback | temp-fixture lanes | concurrent rename, fsync failure | `nvb build` |
| LC-04 | lock order, ignore rollback | multi-repo fixture | lock inversion detection | `nvb build` |
| LC-05 | baseline seed, index build | full bootstrap | index tampering, seal mismatch | `nvb build` |
| LC-06 | exec, stdio, ctrl-c | foreground process | missing binary, SIGTERM forwarding | `nvb build` |
| LC-07 | every check category | full doctor run | corrupted state, missing tools | `nvb build` |
| LC-08 | e2e fixture, rollback | scaffold removal | missing hello reference audit | `nvb build` |

## Implementation Report Tracking

| Batch | Implementation report | Review report |
|-------|----------------------|---------------|
| LC-01 | `.local/agent-reports/wt-lane-lifecycle/LC-01-init-argument-resolution-and-preflight-plan.md` | `.local/agent-reports/wt-lane-lifecycle/reviews/LC-01-init-argument-resolution-and-preflight-plan-review.md` |
| LC-02 | `.local/agent-reports/wt-lane-lifecycle/LC-02-pack-acceptance-seal-and-drift-validation.md` | `.local/agent-reports/wt-lane-lifecycle/reviews/LC-02-pack-acceptance-seal-and-drift-validation-review.md` |
| LC-03 | `.local/agent-reports/wt-lane-lifecycle/LC-03-transactional-lane-layout-and-manifests.md` | `.local/agent-reports/wt-lane-lifecycle/reviews/LC-03-transactional-lane-layout-and-manifests-review.md` |
| LC-04 | `.local/agent-reports/wt-lane-lifecycle/LC-04-bindings-gitignore-and-membership-registration.md` | `.local/agent-reports/wt-lane-lifecycle/reviews/LC-04-bindings-gitignore-and-membership-registration-review.md` |
| LC-05 | `.local/agent-reports/wt-lane-lifecycle/LC-05-coordinator-session-baselines-and-pack-index.md` | `.local/agent-reports/wt-lane-lifecycle/reviews/LC-05-coordinator-session-baselines-and-pack-index-review.md` |
| LC-06 | `.local/agent-reports/wt-lane-lifecycle/LC-06-foreground-watch-command.md` | `.local/agent-reports/wt-lane-lifecycle/reviews/LC-06-foreground-watch-command-review.md` |
| LC-07 | `.local/agent-reports/wt-lane-lifecycle/LC-07-comprehensive-doctor-registry.md` | `.local/agent-reports/wt-lane-lifecycle/reviews/LC-07-comprehensive-doctor-registry-review.md` |
| LC-08 | `.local/agent-reports/wt-lane-lifecycle/LC-08-lifecycle-integration-and-scaffold-removal.md` | `.local/agent-reports/wt-lane-lifecycle/reviews/LC-08-lifecycle-integration-and-scaffold-removal-review.md` |

## Correction Tracking

No corrections have been filed yet — all batches are pending first implementation.

| Correction ID | Batch | Status | Filed | Resolved | Acceptance commit |
|--------------|-------|--------|-------|----------|-------------------|
| — | — | — | — | — | — |

## Pack-Level Acceptance Gates

The entire pack is accepted when:

- [ ] All 8 work batches have matching accepted review outcomes
- [ ] Every batch has a complete implementation report and independent review report
- [ ] No unresolved corrections remain open
- [ ] `nvb build` passes without hello/scaffold artifacts
- [ ] All Jasmine suites pass
- [ ] End-to-end fixture passes: init → status → watch/doctor → rollback
- [ ] No `.local/`, `dist/`, `build/`, `node_modules/`, or `.watchtower/` committed
- [ ] All tracker, roadmap, and spec docs are synchronized
