# wt-runtime-distribution — Review Batches

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
`wt-runtime-distribution` pack.

Each review batch includes:

- the review brief
- the paired review-agent launch prompt

## Acceptance Authority

This directory is the executable acceptance brief pack for 7 batches (RT-01
through RT-07). Reviewers rerun proofs, inspect source independently, and are
the acceptance authority. The implementation agent does not commit; the reviewer
owns the acceptance decision and the commit.

## Rules

- Before any batch review, read `AGENTS.md` and the repo-level material it names.
- Read the pack roadmap, tracker, and quality rules first.
- Read `docs/spec/implementation/wt-runtime-distribution/README.md`
  for the pack-level owner map.
- Read the paired implementation work brief and the implementation report.
- Rerun the focused and broader proofs independently. Do not treat the
  implementation report's conclusions as accepted facts.
- Compare every changed file against the allowed-areas table and the accepted
  prerequisite commit before evaluating behavior.
- Accept only when the batch satisfies its deliverables, tests pass, all
  invariants are proved, and all status docs are updated.
- If rejected and implementation follow-up is required, create a numbered
  correction brief in `corrections/`.
- Workspace and user files must remain owned by the host user.

## Additional Review Rules

- Use `../implementation-quality-and-agent-rules.md#reviewer-hard-reject-checklist`
  as a stop/go gate before discussing polish, naming, or minor cleanup.
- Verify that the implementation followed the ownership shape declared in the
  pack-level README and the governing specs. Cross-module leakage is a hard
  reject.
- For RT-01, independently enumerate inherited assets and cross-reference
  against the behavioral inventory for completeness.
- For RT-02, run every manifest validator rejection path independently and
  verify JSON Schema bundle conformance.
- For RT-03, run `nvb dist` and independently compare `dist/` layout against the
  v1 spec and RT-02 manifest types. Prove reproducible builds.
- For RT-04, independently stage and verify runtime versions. Prove atomicity by
  simulating kill-during-staging. Prove immutability and coexistence.
- For RT-05, mock the subprocess layer and assert every safety invariant
  independently. Prove no shell-mode or `process.env` leak.
- For RT-06, independently attempt every rejection path (checksum mismatch,
  collision, escape) and verify managed-link safety.
- For RT-07, run the smoke test from a clean state and independently verify
  wake, signal, and worker-account enforcement.
- Reject any batch that marks capability support without independent proof
  where proof is required.
- Reject any batch that leaves trackers, roadmap, or spec docs stale.
