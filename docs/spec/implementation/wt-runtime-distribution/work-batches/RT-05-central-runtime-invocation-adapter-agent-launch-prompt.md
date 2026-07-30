# Agent Launch Prompt — Work Batch RT-05

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `very high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `very high — single security boundary between control plane and shell runtime`
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

You are assigned **implementation work batch RT-05** for the Watchtower
`wt-runtime-distribution` pack.

This is the **hardest batch in the pack** — the single security boundary between
the TypeScript control plane and the shell runtime. Every runtime invocation
crosses this adapter. No command or foundation service may spawn runtime scripts
directly. The adapter must enforce argv-only execution, `WT_*` environment
allowlisting, cwd/account/access validation, signal forwarding, and subprocess
lifecycle safety.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-05-central-runtime-invocation-adapter.md`
2. `docs/spec/implementation/wt-runtime-distribution/work-batches/README.md`
3. `docs/spec/implementation/wt-runtime-distribution/work-batches/00-work-batch-index.md`
4. `docs/spec/implementation/wt-runtime-distribution/README.md`
5. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`
6. `docs/spec/v1.md` — especially §12 (runtime invocation contract)
7. `docs/spec/v1-contracts.md` — especially §4 (routing), §6 (adapter contract)
8. `docs/spec/architecture.md` — especially §4.5 (runtime adapter), §6.3 (runtime execution), §9.1 (trust zones)
9. RT-04 catalog — `src/foundation/runtime-catalog.ts` and `src/foundation/data-root.ts`
10. RT-02 manifest types — `src/contracts/manifests.ts`

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `very high — single security boundary between control plane and shell runtime`
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

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the runtime invocation contract to
   the exact adapter, invoker, and manifest entry points.
2. Inspect the current source and accepted predecessor-batch output.
3. Enumerate every safety invariant: no shell-mode spawn, no `process.env` leak,
   `WT_*` only, cwd must exist, entrypoint must be readable/executable, action
   must be in manifest, script path must not escape runtime root.
4. Use counterexamples for every invariant: `spawn` with `{ shell: true }`,
   merging `process.env`, invoking unregistered action, path with `..` escaping
   runtime root, cwd removed after validation, signal to already-exited child.
5. Treat the adapter as a security boundary. Every bypass is a hard reject.
6. Treat predecessor reports as leads, not proof.

## Structural Design And Module-Size Gate

- `runtime-adapter.ts` must be a thin facade: validate inputs, resolve action,
  spawn, forward signals. Target 160 lines or fewer. Max 300 lines.
- `runtime-invoke.ts` owns context construction and action resolution. Target
  220 lines or fewer.
- Split below thresholds when the adapter accumulates subprocess management,
  environment validation, and signal handling in one class.
- Do not create `helpers`, `utils`, `common`, or `misc` overflow bags.

## Your Mission

Implement the single runtime invocation adapter:

1. Implement `RuntimeAdapter.invoke()` in `src/foundation/runtime-adapter.ts`:
   - `spawn()` with `{ shell: false }` and argv array — never string command
   - `WT_*` environment only — never `process.env`
   - cwd must exist and be a directory
   - OS account must have read + execute on the entrypoint
   - action must be in the runtime manifest
   - script path must not escape the runtime root after canonical resolution
   - `--verbose` logs `WT_*` key names only, never values
   - signal forwarding: SIGINT, SIGTERM, SIGHUP
   - exit code and signal status preserved from child
2. Implement `RuntimeInvoker.buildInvocationContext()` in
   `src/foundation/runtime-invoke.ts`:
   - resolve runtime version from lane's install manifest and catalog
   - build `WT_*` map: `WT_WORKSPACE`, `WT_LANE_ID`, `WT_INITIATIVE_ID`,
     `WT_LANE_SLUG`, `WT_LANE_DIR`, `WT_HOME_REPOSITORY_ID`,
     `WT_REPOSITORIES_FILE`, `WT_ACTIVE_REPOSITORY_ID`, `WT_RUNTIME_ROOT`,
     `WT_RUNTIME_VERSION`, `WT_KNOWLEDGE_ROOT`
   - coordinator-only variables for decision invocations only

## What You Must Not Do

- Do not use `{ shell: true }` anywhere in the adapter.
- Do not use template literals for command construction.
- Do not pass `process.env` to child processes.
- Do not log environment values at any level.
- Do not invoke actions outside the runtime manifest.
- Do not create a second invocation boundary.
- Do not introduce managed-link or smoke-proof logic.
- Do not commit.

## Required Proof

- `spawn` called with `{ shell: false }` (mock and assert)
- Only `WT_*` keys in env object (assert exact keys)
- `process.env` never merged or passed
- cwd rejection: non-existent dir, file path
- Access rejection: non-readable, non-executable entrypoint
- Unregistered action rejected before spawn
- Path escape rejected (e.g., `..` segments)
- SIGINT forwarded to child
- Exit code preserved
- Signal exit detected
- Verbose output has key names only, never values
- `buildInvocationContext` produces correct `WT_*` map
- Coordinator-only variables absent for non-decision invocations
- Architecture checks pass

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-runtime-distribution/RT-05-central-runtime-invocation-adapter.md`

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact `WT_*` variable names, every rejection path and its error code,
the signal forwarding behavior, the mock-based proof strategy, and the adapter's
role as the single invocation boundary. Make explicit that every later command
and coordinator automation batch must cross this adapter for any runtime action.
