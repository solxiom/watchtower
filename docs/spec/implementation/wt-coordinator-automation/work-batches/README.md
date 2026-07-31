# Work Batches — wt-coordinator-automation

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

Status: **accepted bootstrap implementation brief pack**
Date: 2026-07-31

## Purpose

This directory contains the implementation-side briefs for the
`wt-coordinator-automation` pack — 24 work batches (CA-01 through CA-24).

Each batch includes:

- The implementation brief
- The paired agent launch prompt

## Execution Authority

This directory is the accepted executable implementation brief pack for 24 batches
forming the complete coordinator automation surface. The canonical scope
document `docs/spec/v1-implementation-map.md` §8 owns detailed requirements.
Normative behavior is owned by:

- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- `docs/spec/v1-contracts.md`

The work briefs here translate those requirements into actionable implementation
contracts annotated with the specific proof evidence each batch must produce.

The paired review brief is the acceptance instrument; consult the
artifact-authority table in `../README.md` when following a batch across
implementation and review.

## Rules

- Before any batch work, read the repo-level mandatory material named in
  `AGENTS.md`.
- Read the pack roadmap, tracker, and quality rules first.
- Include `../agent-launch-contract.md` in every launch envelope.
- Read `docs/spec/implementation/wt-coordinator-automation/README.md` for the
  pack-level owner map and dependency graph.
- Read the normative spec documents referenced by the batch before editing
  source. The focused design documents remain authoritative when implementation
  details are disputed.
- Inspect the current source call chain; planned paths describe ownership, not
  permission to overwrite later source evolution.
- Keep commands, registries, renderers, and other front doors thin.
- Apply the pack's file-size, helper-capsule, naming, and module-ownership rules.
- Add focused tests with the behavior they implement. Do not defer all tests to
  later batches.
- Preserve read-model and lane-lifecycle behavior unless the batch explicitly
  defines a reviewed compatibility change.
- Use one source of truth for index compilation, query routing, proposal
  validation, effect execution, and session persistence.
- Do not commit as the implementation agent.
- Workspace and user files must remain owned by the host user (`kavan`).

## Additional Operating Rules

- Treat `../implementation-quality-and-agent-rules.md` as a hard acceptance
  contract. Its source-backed rules for owner-area structure, module-size limits,
  front-door posture, and naming conventions are mandatory, not style suggestions.
- When the main spec leaves a detail partially open, follow the implementation-phase
  clarifications in `../README.md` rather than inventing a new local interpretation.
- Keep work batches additive to existing behavior; no batch should silently change
  read-model, lane-lifecycle, or runtime-distribution output.
- If a batch reveals that roadmap, tracker, or pack docs have become stale, update
  them as part of the owned work rather than leaving hidden divergence.
- If a still-open authored question becomes blocking in a way not covered by the
  pack clarifications, stop and record the contradiction honestly instead of guessing
  around it.
- Keep normative specs and durable work/review briefs machine-neutral. Paired launch
  prompts are operator artifacts and may retain an explicitly authorized checkout
  ownership instruction; do not copy it into normative or public documentation.
- CA-01 through CA-04 must be entirely model-free. No model may be invoked, directly
  or through any foundation service, during index compilation, query, journal
  projection, or ready-set calculation.
- CA-05 classifies; it must not execute effects, invoke models, or mutate state.
- CA-06 must prove adapter eligibility before any unattended invocation.
- CA-09 and CA-10 must be accepted before enabling CA-11 through CA-13.
- CA-15 through CA-17 may be developed against accepted service fixtures while
  CA-14 is built; CA-18 requires all four accepted.
- CA-18 gates OpenTUI feasibility; CA-19–CA-23 own bounded TUI delivery.
- CA-24 must show that unrelated pack/session growth does not increase ordinary
  model context and that advisory turns never hold the lane lock.

## Shared Proof Rule

Never use one batch's proof to satisfy another batch's acceptance requirement.
Every acceptance scenario ID requires independent evidence for the claimed behavior.
Implementation agents must name the exact spec files, test commands, and expected
outcomes for their batch. Reviewers must independently regenerate evidence rather
than trusting the implementation report.
