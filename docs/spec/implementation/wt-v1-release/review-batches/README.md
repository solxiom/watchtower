# Watchtower v1 Release Review Batches

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

This directory contains the reviewer-side acceptance briefs for the Watchtower
v1 release qualification pack.

Each review batch includes:

- the review brief
- the paired review-agent launch prompt

## Acceptance Authority

This directory is the only executable acceptance brief pack for 4 batches:
REL-01 through REL-04. Reviewers rerun proofs, inspect source independently,
and are the acceptance authority. The implementation agent does not commit;
the reviewer owns the acceptance decision and the commit.

## Rules

- Before any batch review, read the repo-level mandatory material named in
  `AGENTS.md`, especially the architecture and spec docs.
- Read the pack roadmap, tracker, and quality rules first.
- Read `docs/spec/implementation/wt-v1-release/README.md` for the pack-level
  owner map.
- Read the paired implementation work brief and the implementation report.
- Rerun the focused and broader proofs independently. Do not treat the
  implementation report's conclusions as accepted facts.
- Compare every changed file against the allowed-areas table and the accepted
  prerequisite commit before evaluating behavior.
- Accept only when the batch satisfies its deliverables, proof passes, safety
  is independently verified, and all status docs are updated.
- If rejected and implementation follow-up is required, create a numbered
  correction brief in `corrections/`.
- Workspace and user files must remain owned by the host user.

## Additional Review Rules

- Use `../implementation-quality-and-agent-rules.md#reviewer-hard-reject-checklist`
  as a stop/go gate before discussing polish, naming, or minor cleanup.
- For REL-01: verify the full end-to-end pipeline is independently reproducible.
  Do not accept a trial that uses mocks where the spec requires the real binary.
- For REL-02: verify concurrent lane isolation, shared-write refusal, partial
  push recovery, and idempotency replay are independently reproducible.
- For REL-03: verify security negative fixtures actually prevent the exploit.
  A traversal test that provides a safe path but claims safety is insufficient.
  Verify performance measurements are actual, not estimated.
- For REL-04: verify traceability, help, doc, scaffold, and artifact audits
  independently. Read the source, help fragments, and Git-tracked files
  yourself. Do not trust the implementer's cross-reference table without
  re-reading the referenced documents.
- Reject any batch that adds product features beyond the qualification scope.
- Reject any batch that marks a release criterion satisfied from narrative
  alone.
- Reject any batch that leaves trackers, roadmap, or spec docs stale.
