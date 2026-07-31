# wt-upgrade-knowledge Work Batches

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

Status: active implementation brief pack
Date: 2026-07-30

## Purpose

This directory contains the implementation-side briefs for the wt-upgrade-knowledge
delivery pack.

Each batch includes:

- the implementation brief
- the paired agent launch prompt

## Execution Authority

This directory is the executable implementation brief pack for 5 batches:
UK-01 through UK-05. The canonical scope document
`docs/spec/v1-implementation-map.md` §7 owns detailed requirements. The work
briefs here translate those requirements into actionable implementation
contracts annotated with the specific proof evidence each batch must produce.

The paired review brief is the acceptance instrument; consult the
artifact-authority table in `../README.md` when following a batch across
implementation and review.

## Rules

- Before any batch work, read the repo-level mandatory material named in
  `AGENTS.md`.
- Read the pack roadmap, tracker, and quality rules first.
- Read `docs/spec/implementation/wt-upgrade-knowledge/README.md`
  for the pack-level owner map.
- Read the normative spec documents referenced by the batch before editing
  source: `docs/spec/v1.md` §11.5, §11.8, §10.3; `docs/spec/v1-contracts.md`
  §11; `docs/spec/schemas/v1.schema.json`.
- Inspect the current source call chain; planned paths describe ownership,
  not permission to overwrite later source evolution.
- Keep commands and foundation services thin. Foundation modules own algorithms;
  commands own argument validation, service resolution, delegation, and rendering.
- Apply the module size, clean-code, front-door, one-owner, naming, and
  no-helper-bag rules from `../implementation-quality-and-agent-rules.md`.
- Add focused tests with the behavior they implement. Do not defer all tests
  to the integration batch (UK-05).
- Do not commit as the implementation agent.
- Workspace and user files must remain owned by the host user (`kavan`).

## Additional Operating Rules

- Treat `../implementation-quality-and-agent-rules.md` as a hard acceptance
  contract. Its source-backed rules for owner-area structure, module-size
  limits, front-door posture, and the 16-item reviewer hard-reject checklist
  are mandatory, not style suggestions.
- When the main spec leaves a detail partially open, follow the implementation
  clarifications in the pack README rather than inventing a new local
  interpretation.
- UK-01 must be preview-only. Verify that no mutation occurs with a
  write-tracking test double or temporary filesystem.
- UK-02 migration steps must be pure functions. Verify that no runtime action,
  session closure, content pruning, or lifecycle change occurs.
- UK-03 must use manifest-last writes and fynsc before manifest. Prove recovery
  at every staging write point.
- UK-04 adapters must embed no lane-specific state in skill paths. Verify each
  installed file's content does not contain the current lane's home path, lane
  ID, tmux prefix, or repository bindings.
- UK-05 must derive all version components from manifest sources. Verify no
  hardcoded strings.
- If a batch reveals that roadmap, tracker, or pack docs have become stale,
  update them as part of the owned work rather than leaving hidden divergence.
- If a still-open authored question becomes blocking in a way not covered by
  the pack's clarifications, stop and record the contradiction honestly instead
  of guessing around it.
- Keep normative specs and durable work/review briefs machine-neutral. Paired
  launch prompts are operator artifacts and may retain an explicitly authorized
  checkout ownership instruction; do not copy it into normative or public
  documentation.
