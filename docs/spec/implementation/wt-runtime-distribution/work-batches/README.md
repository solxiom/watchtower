# wt-runtime-distribution — Work Batches

Status: active implementation brief pack
Date: 2026-07-30

## Purpose

This directory contains the implementation-side briefs for the
`wt-runtime-distribution` pack.

Each batch includes:

- the implementation brief
- the paired agent launch prompt

## Execution Authority

This directory is the executable implementation brief pack for 7 batches
(RT-01 through RT-07). The canonical scope documents are:

- `docs/spec/v1.md` — normative product specification
- `docs/spec/v1-contracts.md` — closed executable contracts
- `docs/spec/architecture.md` — product architecture
- `docs/spec/v1-implementation-map.md` — master construction plan (section 5)

The work briefs here translate those requirements into actionable implementation
contracts annotated with the specific proof evidence each batch must produce.

The paired review brief is the acceptance instrument; consult the
artifact-authority table in `../README.md` when following a batch across
implementation and review.

## Rules

- Before any batch work, read `AGENTS.md` and the repo-level material it names.
- Read the pack roadmap, tracker, and quality rules first.
- Read `docs/spec/implementation/wt-runtime-distribution/README.md`
  for the pack-level owner map.
- Read the normative spec documents referenced by the batch before editing
  source. The governing specifications remain authoritative when
  implementation details are disputed.
- Inspect the current source call chain; planned paths describe ownership,
  not permission to overwrite later source evolution.
- Keep commands, foundation services, and other front doors thin.
- Apply the repo file-size, helper-capsule, naming, directory-shadow,
  extensionless import, and package-script rules.
- Add focused tests with the behavior they implement. Do not defer all tests
  to the integration smoke batch.
- Use one source of truth for manifest types, XDG resolution, runtime catalog,
  invocation adapter, and managed asset ownership.
- Do not commit as the implementation agent.
- Workspace and user files must remain owned by the host user.

## Additional Operating Rules

- Treat `../implementation-quality-and-agent-rules.md` as a hard acceptance
  contract. Its source-backed rules for owner-area structure, module-size
  limits, front-door posture, and naming conventions are mandatory, not style
  suggestions.
- When the main spec leaves a detail partially open, follow the
  implementation-phase clarifications in `../implementation-roadmap.md` rather
  than inventing a new local interpretation.
- Keep work batches additive to existing foundation behavior; every batch should
  still be able to answer how the existing read-model foundation remains
  unaffected.
- If a batch reveals that roadmap, tracker, or pack docs have become stale,
  update them as part of the owned work rather than leaving hidden divergence.
- If a still-open authored question becomes blocking in a way not covered by
  the implementation-pack clarifications, stop and record the contradiction
  honestly instead of guessing around it.
- Keep normative specs and durable work/review briefs machine-neutral. Paired
  launch prompts are operator artifacts and may retain an explicitly authorized
  checkout ownership instruction; do not copy it into normative or public
  documentation.
- RT-01 owns the initial asset audit and provenance recording. No later batch
  may package an uninventoried asset.
- RT-02 owns manifest types and validation. All later foundation modules consume
  these types.
- RT-03 owns NVB distribution staging. Build validation must compare packaged
  manifests against actual files.
- RT-04 owns XDG data-root resolution and immutable catalog staging. Atomic
  writes and version coexistence must be proved.
- RT-05 owns the single runtime invocation adapter. All runtime script spawning
  must cross this boundary.
- RT-06 owns managed lane links. Manifest-only ownership and collision/path-escape
  refusal must be proved.
- RT-07 owns the integration smoke proof. The relocated package must work with
  wake, signal, and worker-account enforcement.
