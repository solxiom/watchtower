# Watchtower v1 Read Model Work Batches

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
read-model delivery pack — 10 batches forming the M1 read-only foundation.

Each batch includes:

- the implementation brief
- the paired agent launch prompt

## Execution Authority

This directory is the executable implementation brief pack for the 10 wt-read-model
batches (RM-01 through RM-10). The canonical scope document is
`docs/spec/v1.md` backed by `docs/spec/v1-contracts.md`. The work briefs here
translate those requirements into actionable implementation contracts
annotated with the specific proof evidence each batch must produce.

The paired review brief is the acceptance instrument; consult the
artifact-authority table in `../README.md` when following a batch across
implementation and review.

## Rules

- Before any batch work, read the repo-level mandatory material named in
  `AGENTS.md`.
- Read the lane roadmap, tracker, and quality rules first.
- Read `docs/spec/implementation/wt-read-model/README.md` for the lane-level
  owner map and implementation-phase decision clarifications.
- Read the normative spec documents referenced by the batch before editing
  source. The product specification and contract-closure documents remain
  authoritative when implementation details are disputed.
- Inspect the current source call chain; planned paths describe ownership,
  not permission to overwrite later source evolution.
- Keep commands, serializers, renderers, and other front doors thin.
- Apply the module-size, helper-capsule, naming, and ownership rules.
- Add focused tests with the behavior they implement. Do not defer all tests
  to the command-integration batch.
- Read-only commands perform zero hidden writes or repairs.
- Use one source of truth for error codes, path resolution, discovery
  precedence, and config parsing.
- Do not commit as the implementation agent.
- Workspace and user files must remain owned by the host user.

## Additional Operating Rules

- Treat `../implementation-quality-and-agent-rules.md` as a hard acceptance
  contract. Its source-backed rules for owner-area structure, module-size
  limits, front-door posture, and naming conventions are mandatory, not style
  suggestions.
- When the main spec leaves a detail partially open, follow the
  implementation-phase clarifications in `implementation/README.md` rather
  than inventing a new local interpretation.
- Keep work batches additive to existing scaffold behavior; no batch should
  remove or weaken existing functionality without explicit authorization.
- If a batch reveals that roadmap, tracker, or pack docs have become stale,
  update them as part of the owned work rather than leaving hidden divergence.
- If a still-open authored question becomes blocking in a way not covered by
  the implementation-lane clarifications, stop and record the contradiction
  honestly instead of guessing around it.
- Keep normative specs and durable work/review briefs machine-neutral. Paired
  launch prompts are operator artifacts and may retain an explicitly authorized
  checkout ownership instruction; do not copy it into normative or public
  documentation.
- RM-01 owns the initial contract and error taxonomy foundation. Batches
  RM-02 through RM-05 may proceed in parallel after RM-01 is accepted.
- RM-03 through RM-05 must not import or depend on command classes.
- RM-06 through RM-08 must consume the accepted path/parser/event services
  from earlier foundation batches.
- RM-09 must use the accepted env-parser and event-jsonl-parser services
  without duplicating their logic.
- RM-10 must delegate every foundation concern to the appropriate service
  and contain no local path, parser, discovery, or observation implementation.
