# Agent Launch Prompt — Review Batch RT-01

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

You are assigned **review batch RT-01** for the Watchtower `wt-runtime-distribution`
pack.

Your job is to independently verify that every inherited shell runtime script
and coordinator knowledge doc is inventoried with complete provenance, SHA-256
digests match, the behavioral inventory is complete, and no asset was modified,
executed, or newly created during audit.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/review-batches/RT-01-review-runtime-and-knowledge-asset-audit-import.md`
2. `docs/spec/implementation/wt-runtime-distribution/review-batches/README.md`
3. `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-01-runtime-and-knowledge-asset-audit-import.md`
4. The implementation report: `.local/agent-reports/wt-runtime-distribution/RT-01-runtime-and-knowledge-asset-audit-import.md`
5. Changed source: `src/foundation/runtime-assets.ts`, `src/foundation/asset-audit.ts`, `src/contracts/manifests.ts`
6. `docs/spec/coordinator-automation.md` — the canonical coordinator action vocabulary
7. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`

## Reasoning / Reviewer Class

- brief-declared reasoning level: `R4`
- perform an independent source and completeness audit; do not treat implementation
  report conclusions as accepted facts

### Complete local forwarding and reasoning profile — mandatory

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

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   audit records, behavioral inventory, and provenance record.
2. Inspect the current source and accepted predecessor-batch output. Do not infer
   behavior from filenames, the implementation report, or the launch prompt.
3. Enumerate the complete set of coordinator actions from
   `docs/spec/coordinator-automation.md` and cross-reference against the
   inventory. Every action must map to at least one script or doc.
4. Use counterexamples: a script omitted from the audit, a SHA-256 that doesn't
   match the inherited source, an action with no inventory entry.
5. When the audit and the inherited source disagree, stop and record the
   contradiction. Do not silently accept the audit.
6. Treat the implementation report as a lead, not proof. Independently enumerate
   the inherited assets and recompute digests.

## Structural Design And Module-Size Gate

- `runtime-assets.ts` must be under 220 lines — focused data records only.
- `asset-audit.ts` must be under 220 lines — inventory and cross-reference only.
- No single module may exceed 350 lines for new hand-maintained code.
- No `helpers`, `utils`, `common`, or `misc` overflow modules.

## Your Review Mission

Verify the complete asset audit and behavioral inventory:

1. Independently enumerate every shell runtime script and knowledge doc in the
   inherited `implementation-lane-coordinator` source. Compare counts with the
   audit records.
2. For every recorded asset, independently recompute SHA-256 of the inherited
   source content. Compare with the recorded digest.
3. Cross-reference the behavioral inventory against
   `docs/spec/coordinator-automation.md`. Verify no action is orphaned and no
   asset is unassigned.
4. Verify the import provenance record (source URI, commit hash, import date).
5. Confirm no inherited content was modified, no script executed, no shell
   execution or subprocess logic introduced.

## Required Independent Proof

- Exact count of inherited scripts and knowledge docs compared with audit
- SHA-256 verification for every recorded asset
- Behavioral inventory completeness: every action has at least one asset, every
  asset maps to at least one action
- Import provenance is complete and verifiable
- No shell execution, subprocess, or catalog logic introduced
- Architecture checks pass
- Exact commands and outcomes recorded

## Acceptance Gate

Accept only if the asset enumeration is complete, SHA-256 digests match
inherited source, the behavioral inventory has no orphans, provenance is
recorded, and no shell execution or subprocess logic was introduced.

## Rejection Correction Brief Rule

If you reject the batch, create a correction brief under:

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-01-correction-<N>.md`

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

- `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- `docs/spec/implementation/wt-runtime-distribution/implementation-roadmap.md`
- `docs/spec/v1-implementation-map.md` (section 5)

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## What You Must Not Do

- do not accept an incomplete inventory (missing scripts or docs)
- do not accept SHA-256 mismatches
- do not accept behavioral inventory with orphan actions or assets
- do not accept prose-only proof claims
- do not commit unrelated dirty-worktree changes

## Required Disk Report

Write exactly one review report to:

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-01-runtime-and-knowledge-asset-audit-import-review.md`

If accepted, create the acceptance commit.

## Always plan and make task lists
