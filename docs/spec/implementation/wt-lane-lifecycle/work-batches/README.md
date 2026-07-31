# wt-lane-lifecycle Work Batches

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

Status: ⏳ Pack authoring — implementation brief pack
Date: 2026-07-30

## Purpose

This directory contains the implementation-side briefs for the Watchtower v1
lane lifecycle delivery pack.

Each batch includes:

- the implementation brief
- the paired agent launch prompt

## Execution Authority

This directory is the executable implementation brief pack for 8 batches:
LC-01 through LC-08. The canonical scope document
`docs/spec/v1-implementation-map.md` (section 6) owns detailed requirements.
The work briefs here translate those requirements into actionable
implementation contracts annotated with the specific proof evidence each batch
must produce.

The paired review brief is the acceptance instrument; consult the
artifact-authority table in `../README.md` when following a batch across
implementation and review.

## Rules

- Before any batch work, read the repo-level mandatory material named in
  `AGENTS.md`.
- Read the lane roadmap, tracker, and quality rules first.
- Read `docs/spec/implementation/wt-lane-lifecycle/README.md` for the
  lane-level owner map and implementation-phase decision clarifications.
- Read the normative spec documents referenced by the batch before editing
  source. The focused specification documents remain authoritative when
  implementation details are disputed.
- Inspect the current source call chain; planned paths describe ownership,
  not permission to overwrite later source evolution.
- Keep commands thin. `InitCommand`, `WatchCommand`, and `DoctorCommand`
  validate args and delegate to foundation services.
- Apply the repo module-size, helper-capsule, naming, and file-ownership rules.
- Add focused tests with the behavior they implement. Do not defer all tests
  to later batches.
- Product logic must never be added to `src/cli.ts`.
- Shell config or state must never be executed by TypeScript.
- Drift classification is mechanical; no model may classify drift.
- Doctor checks are read-only; no repair, rebuild, or migration.
- Do not commit as the implementation agent.
- Workspace and user files must remain owned by `kavan`.

## Additional Operating Rules

- Treat `../implementation-quality-and-agent-rules.md` as a hard acceptance
  contract. Its source-backed rules for owner-area structure, module-size
  limits, front-door posture, and naming conventions are mandatory, not style
  suggestions.
- When the main spec leaves a detail partially open, follow the
  implementation-phase clarifications in `implementation/README.md` rather
  than inventing a new local interpretation.
- If a batch reveals that roadmap, tracker, or pack docs have become stale,
  update them as part of the owned work rather than leaving hidden divergence.
- If a still-open authored question becomes blocking in a way not covered by
  the implementation-lane clarifications, stop and record the contradiction
  honestly instead of guessing around it.
- Keep normative specs and durable work/review briefs machine-neutral. Paired
  launch prompts are operator artifacts and may retain an explicitly authorized
  checkout ownership instruction; do not copy it into normative or public
  documentation.
- LC-01 and LC-02 are parallel-ready after external dependencies accept.
- LC-03 depends on both LC-01 and LC-02.
- LC-04 and LC-05 depend on LC-03 and may proceed in parallel.
- LC-06 depends on LC-05.
- LC-07 depends on LC-04, LC-05, and LC-06.
- LC-08 depends on LC-07.

## Batch Status Quick Reference

| Batch | Brief | Launch prompt | Status |
|-------|-------|---------------|--------|
| LC-01 | [brief](LC-01-init-argument-resolution-and-preflight-plan.md) | [prompt](LC-01-init-argument-resolution-and-preflight-plan-agent-launch-prompt.md) | ❌ Pending |
| LC-02 | [brief](LC-02-pack-acceptance-seal-and-drift-validation.md) | [prompt](LC-02-pack-acceptance-seal-and-drift-validation-agent-launch-prompt.md) | ❌ Pending |
| LC-03 | [brief](LC-03-transactional-lane-layout-and-manifests.md) | [prompt](LC-03-transactional-lane-layout-and-manifests-agent-launch-prompt.md) | ❌ Pending |
| LC-04 | [brief](LC-04-bindings-gitignore-and-membership-registration.md) | [prompt](LC-04-bindings-gitignore-and-membership-registration-agent-launch-prompt.md) | ❌ Pending |
| LC-05 | [brief](LC-05-coordinator-session-baselines-and-pack-index.md) | [prompt](LC-05-coordinator-session-baselines-and-pack-index-agent-launch-prompt.md) | ❌ Pending |
| LC-06 | [brief](LC-06-foreground-watch-command.md) | [prompt](LC-06-foreground-watch-command-agent-launch-prompt.md) | ❌ Pending |
| LC-07 | [brief](LC-07-comprehensive-doctor-registry.md) | [prompt](LC-07-comprehensive-doctor-registry-agent-launch-prompt.md) | ❌ Pending |
| LC-08 | [brief](LC-08-lifecycle-integration-and-scaffold-removal.md) | [prompt](LC-08-lifecycle-integration-and-scaffold-removal-agent-launch-prompt.md) | ❌ Pending |
