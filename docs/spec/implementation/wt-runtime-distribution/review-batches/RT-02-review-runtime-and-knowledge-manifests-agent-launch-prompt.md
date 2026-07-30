# Agent Launch Prompt — Review Batch RT-02

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high to very high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high to very high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing
  specs, current source, predecessor handoff, and proof output in context; if it
  cannot do so, escalate the agent rather than shortening or partitioning away
  safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help
  with bounded exploration, but it cannot issue the final implementation or
  acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only
non-normative examples and may become unavailable or stale. Select a currently
available agent that can load the complete brief/spec/source context, inspect
and edit the repository with tools, reason across package boundaries, and run
the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, driver behavior,
  destructive migration safety, or cross-package closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **review batch RT-02** for the Watchtower `wt-runtime-distribution`
pack.

Your job is to independently verify that manifest types are closed and complete,
every validator rejection path works correctly, unknown schema versions fail
closed, unknown fields are preserved, and all RT-01 assets are representable.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/review-batches/RT-02-review-runtime-and-knowledge-manifests.md`
2. Paid work brief: `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-02-runtime-and-knowledge-manifests.md`
3. Implementation report: `.local/agent-reports/wt-runtime-distribution/RT-02-runtime-and-knowledge-manifests.md`
4. Changed source: `src/contracts/manifests.ts`, `src/foundation/manifest-validator.ts`
5. `docs/spec/schemas/v1.schema.json`
6. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`

## Reasoning / Reviewer Class

- brief-declared reasoning level: `R4`
- perform an independent type and validation audit

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high to very high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

## Mandatory Reasoning Protocol

1. Build a dependency map: manifest types → validator → JSON Schema bundle →
   RT-01 inventory.
2. Inspect current source; do not infer behavior from the report.
3. Enumerate all validator rejection paths and test each independently.
4. Use counterexamples: a manifest with `schemaVersion: 99`, a file with wrong
   checksum, an extra unlisted file.
5. When source and spec disagree, stop and record. Do not silently accept.

## Your Review Mission

Verify manifest types and validator:

1. Compare manifest types with `docs/spec/v1.md` §15 — every required field
   must be present.
2. Run JSON Schema validation of manifest types.
3. Run validator against a synthetic valid manifest — assert `valid: true`.
4. Independently test each rejection path (missing, extra, checksum, mode,
   unknown schema version).
5. Verify unknown fields are preserved within schema version 1.
6. Verify every RT-01 inventoried asset fits the manifest types.

## Required Independent Proof

All five rejection paths independently verified; JSON Schema validation passes;
unknown fields preserved; RT-01 assets representable; architecture checks pass.

## Acceptance Gate

Accept only if types are closed, every rejection path works, unknown schema
versions fail closed, and RT-01 assets are fully representable.

## Rejection Correction Brief Rule

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-02-correction-<N>.md`

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-02-runtime-and-knowledge-manifests-review.md`

If accepted, create the acceptance commit.

## Always plan and make task lists
