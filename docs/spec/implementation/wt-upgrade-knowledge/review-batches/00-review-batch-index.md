# Review Batch Index — wt-upgrade-knowledge

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

Status: pending index — no reviews conducted
Date: 2026-07-30

## Review Order

Review batches must be executed in numerical order, matching the work batch
sequence within each dependency chain. UK-04 review may proceed in parallel
with UK-01/UK-02 reviews.

A review batch may not begin before the paired implementation batch is
complete and the implementation report is written.

| Review batch | Reviews work batch | Reviewer minimum proof |
|-------------|-------------------|----------------------|
| UK-01 | UK-01 — Upgrade compatibility and preview planner | Independently run every classification-outcome spec; verify no-mutation invariant with write-tracking double; validate `upgradePlan` JSON against schema; trace that planner algorithm lives in foundation, not command; verify that `--apply` is parsed but deferred |
| UK-02 | UK-02 — Lane/session/index migration registry | Independently run every migration step spec and chain-composition spec; verify byte-exact preservation for config/bindings; verify field-level preservation for markers/manifests; independently rebuild session indexes from source journals and compare to migration output; verify policy-baseline operator values unchanged; confirm zero runtime execution/session closure/content pruning during any step |
| UK-03 | UK-03 — Atomic upgrade apply, recovery, and downgrade guard | Independently simulate crash at every staging write point using real filesystem operations; verify at each crash point that old manifest remains authoritative and old runtime is invocable; verify manifest-last rule (manifest not written on staging failure); verify lock released after every exit path; verify downgrade refused without `--allow-downgrade`; verify incompatible downgrade refused; verify compatible downgrade succeeds |
| UK-04 | UK-04 — Codex, Cursor, and Claude knowledge installers | Independently run each adapter preview/install spec; verify `--replace` refusal in non-interactive mode; verify version recorded after install; verify no lane-specific state in installed skill files (search for home paths, lane IDs, tmux prefixes); verify `--dry-run` produces zero writes; verify each scope filter installs only expected files; verify no false notification claim |
| UK-05 | UK-05 — Version reporting and upgrade conformance | Independently reproduce two-version coexistence fixture; independently reproduce collision fixture (verify no mutation); independently reproduce failed-migration fixture (verify recovery and old-runtime usability); verify all four version components from source files; verify `versionReport` JSON validates against schema; verify help fragments rendered correctly; run full Jasmine suite including UK-01 through UK-04 regression; verify `nvb build` passes |

## Shared Review Rule

The reviewer must independently regenerate evidence. Implementation report
conclusions are not accepted facts. Every reviewer must run the exact test
commands named by the batch and record the output, not narrate the outcome.

Acceptance commits must include all accepted non-`.local` changes with a
descriptive commit message. Rejections must produce a numbered correction
brief under `corrections/` with exact required fixes.

## Correction History

No corrections yet — no batches have been reviewed.
