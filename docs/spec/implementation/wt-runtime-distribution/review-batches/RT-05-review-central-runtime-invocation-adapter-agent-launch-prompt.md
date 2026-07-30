# Agent Launch Prompt — Review Batch RT-05

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `very high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `very high — independent security audit of the single invocation boundary`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration
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

You are assigned **review batch RT-05** — the hardest security audit in this pack.
Verify that the `RuntimeAdapter` is the single invocation boundary, enforces
argv-only execution, allowlists only `WT_*` env variables, validates
cwd/account/access, forwards signals correctly, and never leaks secrets.

## Read In This Order

1. `docs/spec/implementation/wt-runtime-distribution/review-batches/RT-05-review-central-runtime-invocation-adapter.md`
2. Paired work brief and implementation report
3. `docs/spec/v1.md` §12, `docs/spec/architecture.md` §§4.5, 6.3, 9.1
4. Quality rules

## Required Independent Proof

- Audit entire codebase for `child_process.spawn/exec/execFile/fork` — only
  `RuntimeAdapter.invoke()` may spawn
- Mock `spawn` and assert: `{ shell: false }`, no template literals
- Assert env object: only `^WT_` keys, no `process.env` keys
- Test cwd: non-existent dir, file path → rejection
- Test access: missing entrypoint, non-readable, non-executable → rejection
- Test action: unregistered action → rejection before spawn
- Test escape: `..` escaping runtime root → rejection before spawn
- Test signal forwarding: SIGINT stops real subprocess, exit code propagated
- Test verbose: `WT_*` key names present, values absent
- Test `buildInvocationContext`: correct `WT_*` map, coordinator vars absent for
  non-decision invocations
- Architecture checks

## Acceptance Gate

Accept only if one invocation boundary exists, `{ shell: false }` enforced, only
`WT_*` keys in env, `process.env` never passed, all rejection paths proved,
signal/exit forwarding works, and verbose output is safe.

## Rejection Correction Brief Rule

- `corrections/RT-05-correction-<N>.md`

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-05-central-runtime-invocation-adapter-review.md`

If accepted, create the acceptance commit.

## Always plan and make task lists
