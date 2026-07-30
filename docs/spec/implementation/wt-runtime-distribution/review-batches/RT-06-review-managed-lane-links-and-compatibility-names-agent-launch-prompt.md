# Agent Launch Prompt — Review Batch RT-06

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high to very high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high to very high — managed-link ownership and collision/escape safety verification`
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

The declared `R` class is authoritative. Select a currently available agent that
can load the complete context, inspect and edit the repository, and run proof
without replacing evidence with narrative confidence.

## Your Review Mission

You are assigned **review batch RT-06**. Independently verify manifest-only
managed-link ownership: checksum validation, collision refusal, path-escape
rejection, safe link removal, and compatibility name resolution.

## Read In This Order

1. `docs/spec/implementation/wt-runtime-distribution/review-batches/RT-06-review-managed-lane-links-and-compatibility-names.md`
2. Paired work brief and implementation report
3. `docs/spec/v1.md` §7, RT-04 catalog, RT-05 adapter
4. Quality rules

## Required Independent Proof

- Audit codebase for `fs.symlink`/`fs.promises.symlink` — only `ManagedAssets`
  creates managed symlinks
- Test: valid link creation with correct target and checksum
- Test: checksum mismatch → `LINK_TARGET_CHECKSUM_MISMATCH`
- Test: target path-escape (`..`) → `LINK_TARGET_ESCAPE`
- Test: source collision (non-managed file at link path) → `LINK_SOURCE_COLLISION`
- Test: source path-escape → `LINK_SOURCE_ESCAPE`
- Test: link removal removes only manifest-matching symlinks
- Test: link removal does NOT remove replaced symlink (different target) or
  regular file
- Test: `validateLinks()` reports missing, broken, wrong-target, checksum-mismatched
- Test: compatibility name resolution: known → canonical, unknown → `null`
- Test: `createLinks` creates parent directories
- Architecture checks

## Acceptance Gate

Accept only if checksums enforced, collisions refused, escapes rejected, removal
is safe, validation reports all defect classes, and `ManagedAssets` is the sole
authority.

## Rejection Correction Brief Rule

- `corrections/RT-06-correction-<N>.md`

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-06-managed-lane-links-and-compatibility-names-review.md`

If accepted, create the acceptance commit.

## Always plan and make task lists
