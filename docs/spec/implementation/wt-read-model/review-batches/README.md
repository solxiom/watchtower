# Watchtower v1 Read Model Review Batches

Status: active review brief pack
Date: 2026-07-30

## Purpose

This directory contains the reviewer-side acceptance briefs for the Watchtower v1
read-model delivery pack — 10 batches forming the M1 read-only foundation.

Each review batch includes:

- the review brief
- the paired review-agent launch prompt

## Acceptance Authority

This directory is the only executable acceptance brief pack for the 10 wt-read-model
batches (RM-01 through RM-10). Reviewers rerun proofs, inspect source
independently, and are the acceptance authority. The implementation agent does
not commit; the reviewer owns the acceptance decision and the commit.

## Rules

- Before any batch review, read the repo-level mandatory material named in
  `AGENTS.md`.
- Read the lane roadmap, tracker, and quality rules first.
- Read `docs/spec/implementation/wt-read-model/README.md` for the lane-level
  owner map.
- Read the paired implementation work brief and the implementation report.
- Rerun the focused and broader proofs independently. Do not treat the
  implementation report's conclusions as accepted facts.
- Compare every changed file against the allowed-areas table and the accepted
  prerequisite commit before evaluating behavior.
- Accept only when the batch satisfies its deliverables, tests pass, read-only
  integrity is proved, all status docs are updated.
- If rejected and implementation follow-up is required, create a numbered
  correction brief in `corrections/`.
- Workspace and user files must remain owned by the host user.

## Additional Review Rules

- Use `../implementation-quality-and-agent-rules.md#reviewer-hard-reject-checklist`
  as a stop/go gate before discussing polish, naming, or minor cleanup.
- Verify that the implementation followed the ownership shape declared in the
  lane-level README and the governing specs. Cross-layer leakage is a hard
  reject.
- For all foundation batches (RM-01–RM-09), verify that no command or CLI
  rendering logic has entered the foundation layer.
- For RM-03, RM-04, verify path/config boundaries fail closed. Reject if
  any path escape or shell injection passes undetected.
- For RM-05, verify every malformation class is handled and no records are
  silently dropped.
- For RM-06, verify the complete ambiguity matrix: every cell must have a
  focused test. Reject any unhandled case.
- For RM-10, independently run the read-only hash proof. Reject if any
  command writes even one byte to the lane directory.
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
