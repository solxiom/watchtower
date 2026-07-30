# Agent Launch Prompt — Review Batch RT-03

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for bounded build-automation verification`
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

You are assigned **review batch RT-03**. Independently verify that `nvb dist`
produces a correct `dist/` tree, every runtime and knowledge asset is present,
`wt:runtime:validate` works, executable bits are preserved, builds are
reproducible, and no npm scripts were added.

## Read In This Order

1. `docs/spec/implementation/wt-runtime-distribution/review-batches/RT-03-review-nvb-distribution-staging.md`
2. Paired work brief and implementation report
3. `docs/spec/v1.md` §15, RT-02 manifest types
4. Quality rules

## Required Independent Proof

- Run `nvb dist`, inspect `dist/` tree, compare against RT-01 inventory
- Run `wt:runtime:validate` — assert exit 0 on correct dist
- Independently test: missing file, extra file, checksum mismatch, mode mismatch
- Verify executable bits: `stat -c '%a'` on runtime scripts
- Prove reproducible builds: two runs produce identical SHA-256 for all files
- Confirm `nvb build` still compiles
- Confirm no npm scripts added

## Acceptance Gate

Accept only if dist layout matches spec, all assets present, validation passes,
all five rejection paths work, executables preserved, builds reproducible, no
npm scripts.

## Rejection Correction Brief Rule

- `corrections/RT-03-correction-<N>.md`

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-03-nvb-distribution-staging-review.md`

If accepted, create the acceptance commit.

## Always plan and make task lists
