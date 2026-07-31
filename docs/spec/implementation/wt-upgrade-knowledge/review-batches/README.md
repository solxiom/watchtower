# wt-upgrade-knowledge Review Batches

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

Status: active review brief pack
Date: 2026-07-30

## Purpose

This directory contains the reviewer-side acceptance briefs for the
wt-upgrade-knowledge implementation pack.

Each review batch includes:

- the review brief
- the paired review-agent launch prompt

## Acceptance Authority

This directory is the only executable acceptance brief pack for 5 batches:
UK-01 through UK-05. Reviewers rerun proofs, inspect source independently,
and are the acceptance authority. The implementation agent does not commit;
the reviewer owns the acceptance decision and the commit.

## Rules

- Before any batch review, read the repo-level mandatory material named in
  `AGENTS.md`.
- Read the pack roadmap, tracker, and quality rules first.
- Read `docs/spec/implementation/wt-upgrade-knowledge/README.md`
  for the pack-level owner map.
- Read the paired implementation work brief and the implementation report.
- Rerun the focused and broader proofs independently. Do not treat the
  implementation report's conclusions as accepted facts.
- Compare every changed file against the allowed-areas table and the accepted
  prerequisite commit before evaluating behavior.
- Accept only when the batch satisfies its deliverables, tests pass,
  lane-owned values are preserved, managed-file safety holds, and all
  status docs are updated.
- If rejected and implementation follow-up is required, create a numbered
  correction brief in `corrections/`.
- Workspace and user files must remain owned by the host user (`kavan`).

## Additional Review Rules

- Use `../implementation-quality-and-agent-rules.md#reviewer-hard-reject-checklist`
  as a stop/go gate before discussing polish, naming, or minor cleanup.
- Verify that the implementation followed the ownership shape declared in the
  pack-level README and the governing specs. Cross-module leakage is a hard
  reject.
- For UK-01, verify that preview never mutates lane state by using a
  write-tracking filesystem double or equivalent mechanism.
- For UK-02, independently verify byte-exact preservation for every lane-owned
  artifact class and truth-equivalence for rebuilt indexes.
- For UK-03, independently simulate crash recovery at every staging write
  point using real filesystem operations. Do not trust the implementation
  report's crash-matrix summary.
- For UK-04, independently verify that installed skill files contain no
  lane-specific state by searching for lane home paths, lane IDs, and tmux
  prefixes in the installed files.
- For UK-05, independently reproduce the two-version coexistence, collision,
  and failed-migration fixtures.
- Reject any batch that overwrites lane-owned values during upgrade or
  migration.
- Reject any batch that allows downgrade without `--allow-downgrade` or
  with incompatible schema.
- Reject any batch that leaves trackers, roadmap, or spec docs stale.

## Shared Acceptance Criteria

Every review must independently confirm:

1. No behavior was invented beyond accepted specifications.
2. Layer ownership and dependency direction are preserved.
3. Public JSON and errors match the schema/version contract.
4. Reads have no hidden writes (UK-01 preview, UK-04 preview).
5. Path/config/untrusted-input boundaries fail closed.
6. Mutations use declared locks, atomic writes (`fsync` + `rename`), and
   recovery rules (UK-03).
7. Lane-owned values are never overwritten during upgrade or migration.
8. Human help and normative documentation match.
9. `nvb build` and the relevant Jasmine suites pass.
10. No generated, distribution, local-lane, or dependency artifact is committed.
