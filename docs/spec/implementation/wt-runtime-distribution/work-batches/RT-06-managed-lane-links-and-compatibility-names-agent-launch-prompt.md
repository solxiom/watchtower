# Agent Launch Prompt — Work Batch RT-06

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high — managed ownership, checksum validation, collision and escape safety`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
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

You are assigned **implementation work batch RT-06** for the Watchtower
`wt-runtime-distribution` pack.

This batch implements managed lane links — the bridge between the immutable
runtime catalog and the lane's `bin/` directory. Every symlink must validate its
target checksums against the runtime manifest, refuse collisions with
non-managed files, and reject path-escape after resolution. Manifest-only
ownership means no managed path may exist without a manifest entry.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-06-managed-lane-links-and-compatibility-names.md`
2. `docs/spec/implementation/wt-runtime-distribution/work-batches/README.md`
3. `docs/spec/implementation/wt-runtime-distribution/work-batches/00-work-batch-index.md`
4. `docs/spec/implementation/wt-runtime-distribution/README.md`
5. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`
6. `docs/spec/v1.md` — especially §7 (install manifest schema, managed assets)
7. `docs/spec/v1-contracts.md` — especially §11 (locking)
8. RT-04 catalog, RT-05 adapter, RT-02 manifest types

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high — managed ownership, checksum validation, collision and escape safety`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
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

1. Build a dependency and ownership map from the install manifest to managed
   links, the runtime catalog, and the lane directory.
2. Inspect the current source and accepted predecessor-batch output.
3. Enumerate safety invariants: checksum must match before link creation, no
   collision with non-managed files, symlink target must not escape runtime root
   after resolution, link source must not escape lane directory.
4. Use counterexamples: creating link without checksum check, overwriting
   operator-modified file, symlink following `..` outside lane, dead symlink
   treated as valid, compatibility name not in manifest.
5. When a spec and current source disagree, stop and resolve.
6. Treat predecessor reports as leads, not proof.

## Structural Design And Module-Size Gate

- `managed-assets.ts` targets 300 lines or fewer. Split if create/remove/validate
  accumulate in one method.
- No single module may exceed 350 lines for new hand-maintained code.
- Do not create `helpers`, `utils`, `common`, or `misc` overflow bags.

## Your Mission

Implement manifest-only managed file ownership:

1. Implement `ManagedAssets` in `src/foundation/managed-assets.ts`:
   - `createLinks()` — validate target checksum, refuse escape/collision, create
     symlinks
   - `removeLinks()` — remove only manifest-owned symlinks with matching targets
   - `validateLinks()` — check every managed link exists, is a symlink, has
     valid target
2. Implement `resolveCompatibilityName()` — map historical names to canonical
   manifest actions
3. Error codes: `LINK_TARGET_CHECKSUM_MISMATCH`, `LINK_TARGET_ESCAPE`,
   `LINK_SOURCE_COLLISION`, `LINK_SOURCE_ESCAPE`, `LINK_NOT_MANAGED`,
   `COMPATIBILITY_NAME_UNKNOWN`

## What You Must Not Do

- Do not manage files outside the lane `bin/` path.
- Do not resolve symlink targets without checksum validation against the catalog.
- Do not overwrite non-managed files.
- Do not allow link targets that escape the runtime root or lane directory.
- Do not introduce adapter or smoke-proof logic.
- Do not commit.

## Required Proof

- Link creation with valid target and checksum
- Refusal: checksum mismatch, target escape (`..`), source collision, source
  escape
- Link removal only removes manifest-matching symlinks
- Link removal does not touch replaced regular files
- Link validation reports missing, broken, wrong-target, checksum-mismatched
- Compatibility name resolution: known → canonical, unknown → null
- `createLinks` creates containing directories
- Architecture checks pass

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-runtime-distribution/RT-06-managed-lane-links-and-compatibility-names.md`

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact rejection paths (checksum, escape, collision), compatibility
name resolution map, and the manifest-only ownership rule. Make explicit that
RT-07 and LC-03 (Pack 3 lane layout) depend on managed links for `bin/`
construction.
