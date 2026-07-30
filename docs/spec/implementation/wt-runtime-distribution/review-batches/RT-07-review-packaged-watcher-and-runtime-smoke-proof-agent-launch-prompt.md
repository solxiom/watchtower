# Agent Launch Prompt — Review Batch RT-07

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for bounded integration smoke verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
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

You are assigned **review batch RT-07** — the final batch of Pack 2. Independently
verify the integration smoke proof: relocated package operation, wake stdout, signal
forwarding, worker account enforcement, and no hardcoded paths. Upon acceptance,
update the pack tracker to mark `wt-runtime-distribution` as complete.

## Read In This Order

1. `docs/spec/implementation/wt-runtime-distribution/review-batches/RT-07-review-packaged-watcher-and-runtime-smoke-proof.md`
2. Paired work brief and implementation report
3. RT-03 (NVB dist), RT-05 (adapter), RT-06 (managed links) accepted output
4. Quality rules

## Required Independent Proof

- Build from clean (`nvb build` + `nvb dist`)
- Run smoke test from clean state
- Verify the test uses relocated package (not source tree) — assert no `src/`,
  `build/`, or project-root references
- Verify wake stdout matches expected patterns within timeout
- Verify SIGINT stops watcher and exit code is correct
- Verify worker account enforcement: read + execute allowed, write denied (or
  legitimately skipped with documented reason)
- Grep `dist/` for absolute source-repo paths — assert zero matches
- Verify temp directories and orphaned subprocesses cleaned up
- Architecture checks pass

## Acceptance Gate

Accept only if relocated package smoke test passes, wake stdout matches, SIGINT
works, worker accounts are enforced, no hardcoded paths, and cleanup is clean.

Upon acceptance:
- Update pack tracker to mark `wt-runtime-distribution` as complete
- Update `docs/spec/v1-implementation-map.md` section 5 status
- Pack 3 (`wt-lane-lifecycle`) may now begin

## Rejection Correction Brief Rule

- `corrections/RT-07-correction-<N>.md`

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-07-packaged-watcher-and-runtime-smoke-proof-review.md`

If accepted, create the acceptance commit.

## Always plan and make task lists
