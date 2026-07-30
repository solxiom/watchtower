# Watchtower v1 Lane Lifecycle Review Batches

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

Status: active review brief pack
Date: 2026-07-30

## Purpose

This directory contains the reviewer-side acceptance briefs for the Watchtower v1
lane lifecycle delivery pack — 8 batches forming the M3–M4 creation and operation
foundation.

Each review batch includes:

- the review brief
- the paired review-agent launch prompt

## Acceptance Authority

This directory is the only executable acceptance brief pack for the 8
wt-lane-lifecycle batches (LC-01 through LC-08). Reviewers rerun proofs, inspect
source independently, and are the acceptance authority. The implementation agent
does not commit; the reviewer owns the acceptance decision and the commit.

## Rules

- Before any batch review, read the repo-level mandatory material named in
  `AGENTS.md`.
- Read the lane roadmap, tracker, and quality rules first.
- Read `docs/spec/implementation/wt-lane-lifecycle/README.md` for the lane-level
  owner map.
- Read the paired implementation work brief and the implementation report.
- Rerun the focused and broader proofs independently. Do not treat the
  implementation report's conclusions as accepted facts.
- Compare every changed file against the allowed-areas table and the accepted
  prerequisite commit before evaluating behavior.
- Accept only when the batch satisfies its deliverables, tests pass, safety
  guarantees are proven, all status docs are updated.
- If rejected and implementation follow-up is required, create a numbered
  correction brief in `corrections/`.
- Workspace and user files must remain owned by the host user.

## Additional Review Rules

- Use `../implementation-quality-and-agent-rules.md#reviewer-hard-reject-checklist`
  as a stop/go gate before discussing polish, naming, or minor cleanup.
- Verify that the implementation followed the ownership shape declared in the
  lane-level README and the governing specs. Cross-layer leakage is a hard
  reject.
- For LC-01, verify that dry-run invents nothing on disk. Reject if any
  directory or file is created during preview.
- For LC-02, independently verify RFC 8785 canonicalization. Do not accept
  seal reproduction on trust — produce the canonical bytes yourself.
- For LC-03, verify the transactional commit is truly atomic. Reject if
  partial state is observable between staging write and rename commit.
- For LC-04, verify lock order in all code paths. Lock inversion is a hard
  reject.
- For LC-05, verify every seeded policy value against the contracts. Verify
  deterministic byte-identical index reproduction.
- For LC-06, verify the watcher is NOT daemonized. Verify Ctrl-C cleanly
  terminates without orphans.
- For LC-07, verify doctor is read-only with zero filesystem writes. Verify
  all 15 check categories are represented.
- For LC-08, run an independent search for every hello reference. A single
  remaining `HelloCommand` import is a hard reject. Verify `nvb build` and
  `nvb test` pass after removal.
- Reject any batch that leaves trackers, roadmap, or spec docs stale.
- Reject any batch whose implementation agent committed changes. The reviewer
  owns the acceptance commit.

## Mandatory Reviewer Independence

The reviewer must:

1. Rerun all proof commands independently from a clean build.
2. Inspect every changed file against the allowed ownership areas.
3. Compare the implementation against the governing specs, not just the
   implementation report's narrative.
4. Reject structural defects before discussing naming or polish.
5. Record correction briefs with exact required fixes when rejecting.
6. Create the acceptance commit only after all proofs pass and status docs
   are synchronized.

The reviewer's acceptance commit message must reference the batch ID, a
one-line summary, and the implementation report path.
