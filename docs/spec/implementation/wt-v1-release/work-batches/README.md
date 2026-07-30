# Watchtower v1 Release Work Batches

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

Status: active implementation brief pack
Date: 2026-07-30

## Purpose

This directory contains the implementation-side briefs for the Watchtower v1
release qualification pack.

Each batch includes:

- the implementation brief
- the paired agent launch prompt

## Execution Authority

This directory is the executable implementation brief pack for 4 batches:
REL-01 through REL-04. The canonical scope document
`docs/spec/v1-implementation-map.md` section 9 owns the pack-level
requirements. The work briefs here translate those requirements into
actionable implementation contracts annotated with the specific proof
evidence each batch must produce.

The paired review brief is the acceptance instrument; consult the
artifact-authority table in `../README.md` when following a batch across
implementation and review.

## Rules

- Before any batch work, read the repo-level mandatory material named in
  `AGENTS.md`, especially the architecture and spec docs.
- Read the pack roadmap, tracker, and quality rules first.
- Read `docs/spec/implementation/wt-v1-release/README.md` for the pack-level
  owner map and quality rules.
- Read the normative spec documents referenced by the batch before writing
  fixtures or running trials:
  - `docs/spec/v1.md`
  - `docs/spec/v1-contracts.md`
  - `docs/spec/architecture.md`
  - `docs/spec/coordinator-automation.md`
  - `docs/spec/operator-session.md`
  - `docs/spec/cli-session.md`
- Inspect the current source and the accepted packs 1–5 before creating
  fixtures. Fixtures must exercise the real product through its public
  interface, not bypass into internal modules.
- Add focused specs with the behavior they qualify. Do not defer all checks
  to REL-04.
- Do not add product features. If a missing feature blocks a release
  criterion, record it as a finding; do not implement it in this pack.
- Use one source of truth for expected behavior: the governing specs.
- Do not commit as the implementation agent.
- Workspace and user files must remain owned by the host user.

## Additional Operating Rules

- Treat `../implementation-quality-and-agent-rules.md` as a hard acceptance
  contract. Its source-backed rules for module-size limits, security evidence,
  and reviewer independence are mandatory, not style suggestions.
- Every end-to-end trial must use the globally installed `wt` binary. Mock
  trials that bypass the real CLI, filesystem, or Git are rejected.
- Security and performance claims require fixture-based, reproducible evidence.
- REL-04 audits; it does not create missing content.
- If a batch reveals that tracker, roadmap, or pack docs have become stale,
  update them as part of the owned work rather than leaving hidden divergence.
- Keep normative specs and durable work/review briefs machine-neutral. Paired
  launch prompts are operator artifacts and may retain an explicitly authorized
  checkout ownership instruction; do not copy it into normative or public
  documentation.
- All packs 1–5 must be independently verified as accepted before REL-01 begins.
  Each REL batch depends on the prior REL batch's acceptance.
