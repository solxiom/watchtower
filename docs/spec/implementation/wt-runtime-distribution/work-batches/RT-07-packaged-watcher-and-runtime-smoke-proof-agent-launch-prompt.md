# Agent Launch Prompt — Work Batch RT-07

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for bounded integration smoke proof with explicit fixtures`
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

You are assigned **implementation work batch RT-07** for the Watchtower
`wt-runtime-distribution` pack.

This is the final batch of the pack — the integration smoke proof that
demonstrates the complete runtime distribution works from a relocated package.
The smoke test proves wake stdout behavior, signal forwarding, and worker
account read-but-cannot-write enforcement.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-07-packaged-watcher-and-runtime-smoke-proof.md`
2. `docs/spec/implementation/wt-runtime-distribution/work-batches/README.md`
3. `docs/spec/implementation/wt-runtime-distribution/work-batches/00-work-batch-index.md`
4. `docs/spec/implementation/wt-runtime-distribution/README.md`
5. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`
6. `docs/spec/v1.md` — especially §11.4 (wt watch), §12 (invocation contract)
7. All accepted predecessor batches: RT-03 (NVB dist), RT-05 (adapter), RT-06
   (managed links)

## Reasoning / Agent Class

- brief-declared reasoning level: `R3`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for bounded integration smoke proof with explicit fixtures`
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

1. Build a dependency and ownership map from the smoke test to the adapter,
   catalog, managed links, and NVB dist output.
2. Inspect the current source and accepted predecessor-batch output.
3. Enumerate the smoke invariants: relocated package (not source tree), wake
   stdout matches expected patterns, SIGINT stops watcher cleanly, worker
   account can read/execute but cannot write runtime assets, no hardcoded paths.
4. Use counterexamples: test running from source tree, stale NVB dist, worker
   account same as operator account, leftover subprocess after test.
5. When a spec and current source disagree, stop and resolve.
6. Treat predecessor reports as leads, not proof.

## Structural Design And Module-Size Gate

- `runtime-smoke.spec.ts` targets 300 lines or fewer. Split by test scenario if
  larger.
- No new foundation or contract code — only the integration spec file.
- Do not create `helpers`, `utils`, `common`, or `misc` overflow bags.

## Your Mission

Prove the relocated package works:

1. Create `spec/integration/runtime-smoke.spec.ts`:
   - Test 1: Wake stdout — invoke watcher through adapter, capture stdout, assert
     expected patterns
   - Test 2: Signal forwarding — start watcher, send SIGINT, assert clean exit
   - Test 3: Worker account enforcement — resolve configured worker account,
     assert read + execute on runtime entrypoints, assert cannot write
   - Test 4: No hardcoded paths — grep relocated `dist/` for source repo paths
2. Set up temporary fixture workspace with valid `lane.json` and `install.json`
3. Use temporary XDG data directories for runtime store
4. Clean up all temporary directories and subprocesses after each test

## What You Must Not Do

- Do not modify any foundation or contract code — exercise existing modules only.
- Do not depend on a real tmux server or global user state.
- Do not create new runtime scripts, knowledge docs, or npm dependencies.
- Do not leave orphaned subprocesses after test execution.
- Do not commit.

## Required Proof

- Smoke test passes from relocated package (not source tree)
- Wake stdout matches expected patterns
- SIGINT stops watcher, exit code captured correctly
- Worker account can read runtime entrypoints
- Worker account cannot write to runtime entrypoints
- No absolute paths to source repository in `dist/`
- Temporary directories cleaned up after each test
- No orphaned subprocesses remain
- Architecture checks pass

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-runtime-distribution/RT-07-packaged-watcher-and-runtime-smoke-proof.md`

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact watcher wake pattern, SIGINT exit behavior, worker account
enforcement results, and hardcoded-path grep outcome. Make explicit that this
smoke proof is the Pack 2 exit gate — Pack 3 (`wt-lane-lifecycle`) depends on
Pack 2 acceptance.
