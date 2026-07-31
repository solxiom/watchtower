# Work Batch Index — wt-upgrade-knowledge

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

Status: pending index — no batches started
Date: 2026-07-30

## Batch Order And Dependency Summary

Batches must be executed in numerical order within their dependency chain.
UK-04 may proceed in parallel with UK-01/UK-02. All batches converge at UK-05.

| Batch | Depends on | Primary proof system |
|-------|------------|---------------------|
| UK-01 | LC-03, RT-02 accepted | Unit tests with synthetic manifests; `upgradePlan` schema validation; no-mutation proof |
| UK-02 | UK-01, LC-05 accepted | Unit tests for every migration step and composed chain; value-preservation byte comparisons; session-index rebuild correctness |
| UK-03 | UK-02, RT-04, RT-06 accepted | Filesystem integration tests with crash simulation at every write point; lock-ordering proof; downgrade guard |
| UK-04 | RT-01, RT-02 accepted | Unit tests for each adapter; `--replace` refusal; version recording; no-lane-state-in-skill proof |
| UK-05 | UK-03, UK-04 accepted | Integration tests; two-version coexistence; collision/failed-migration proof; help registration; `nvb build` |

## Proof Expectations

| Batch | Required proof posture |
|-------|----------------------|
| UK-01 | Focused unit tests with synthetic manifest fixtures covering every classification outcome (changed/preserved/conflict/added/removed); schema compatibility matrix across declared version ranges; missing target runtime error; incompatible schema version refusal; lane-owned conflict detection; `--json` format validated against `upgradePlan` schema; preview-only purity verified via write-tracking test double |
| UK-02 | Focused unit tests for each migration step independently and composed through a version chain; byte-exact preservation proof for every lane-owned artifact class (config, sessions, pins, holds, amendments, budgets, state); session-index contents verified against known source data; policy-baseline truth equivalence after migration; missing-intermediate-step error; no runtime-action, no session-closure, no content-pruning proof |
| UK-03 | Filesystem integration tests in temporary fixture workspaces for: successful upgrade end-to-end; interrupted upgrade at every write point (before first asset stage, after first link, mid-way through links, after all links but before manifest, before fsync, after manifest but before verification, after verification); successful recovery at each point proving old runtime is still invocable; downgrade refusal without `--allow-downgrade`; incompatible downgrade refusal; successful downgrade with compatible target; checksum mismatch during staging; manifest-last atomicity (manifest not written when earlier stages fail) |
| UK-04 | Unit tests for each host adapter preview output (Codex, Cursor, Claude); `--replace` refusal in non-interactive mode; installed version recording for each host; scope filtering (`skill-only`, `guides-only`); existing-file detection in destination; destination-path validation; no lane-specific state in installed skill paths (home path, lane ID, tmux prefix, repository binding); `--dry-run` no-write proof; `--json` format validation |
| UK-05 | Integration tests: `wt version` all-four-component report (CLI, runtime, knowledge, schema); two-version coexistence fixture (stage two runtimes, report both available, report lane-bound version); collision detection (attempt upgrade on lane with unmanaged collision, verify reported and no mutation); failed migration recovery (simulate failing migration step, verify upgrade stops with recovery state, old runtime usable); help fragments registered and rendered correctly; `nvb build` pass; relevant Jasmine suite pass |

## Shared Proof Rule

Never use one batch's proof to satisfy another batch's acceptance requirement.
Every proof scenario must be independently reproducible by the reviewer.

Implementation agents must name the exact spec files, test commands, and
expected outcomes for their batch. Reviewers must independently regenerate
evidence rather than trusting the implementation report.
