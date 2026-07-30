# Agent Launch Prompt — Work Batch LC-06

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for foreground process management, signal handling, and preflight validation`
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

You are assigned **implementation work batch LC-06** for the Watchtower v1
wt-lane-lifecycle delivery lane.

This batch implements the `wt watch` command: lane preflight, runtime
invocation context export, watcher exec in foreground, stdio passthrough,
and Ctrl-C termination. No daemonization.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-06-foreground-watch-command.md`
3. `docs/spec/implementation/wt-lane-lifecycle/work-batches/README.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`
5. `docs/spec/v1.md` — §11.4 (watch command behavior), §12 (runtime invocation contract: WT_* vars), §14 (no daemonization)
6. `docs/spec/v1-contracts.md` — §8 (watch rejects --json)
7. `docs/spec/architecture.md` — §4.5 (runtime adapter), §6.3 (runtime execution flow)
8. `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
9. `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
10. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
11. `docs/spec/implementation/wt-lane-lifecycle/batch-reasoning-difficulty-ranking.md`
12. the canonical source owners you will create:
    - `src/commands/WatchCommand.ts` (new)
    - `help/commands/watch.hlp.json` (new)
    - `help/help.json` (edit to register watch)
13. the dependency modules you must inspect:
    - RM-03: workspace resolution
    - RM-06: lane discovery/selection
    - RT-04: runtime catalog
    - RT-05: runtime invoker (RuntimeInvoker)
    - RT-07: watcher binary path and smoke
    - LC-05: `coordinator/routing-policy.json`, `coordinator/pack-index.json` (preflight checks)
    - `src/contracts/` — for type conventions

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for foreground process management, signal handling, and preflight validation`
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

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, factories, lower-layer capsules, front doors, tests, and status
   artifacts affected by this batch.
2. Inspect the current source and accepted predecessor-batch output. Do not infer
   behavior from filenames, the implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, failure precedence, concurrency
   or re-entrancy risks, compatibility constraints, and deliberately unsupported
   behavior before choosing or evaluating a design.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating ownership, safety, boundedness, or public
   result semantics, then ensure focused proof rejects it.
5. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
6. Treat predecessor reports as leads, not proof. Re-open the actual changed
   files and reproduce all acceptance-critical evidence from the current tree.

## Structural Design And Module-Size Gate

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- Front doors, factories, registries, directors, commands, renderers, and public
  barrels target 160 lines or fewer. Files from 161 through 220 lines require an
  explicit cohesion justification. A hand-maintained front door over 220 lines
  is rejectable without a narrow pre-existing constraint, and no front door may
  exceed 300 lines.
- Focused implementation modules target 220 lines or fewer. Files from 221
  through 300 lines require a responsibility inventory and independent reviewer
  scrutiny. Files from 301 through 350 lines are expected to split; acceptance
  requires a source-backed reason why splitting would reduce ownership clarity.
  New or materially rewritten implementation modules above 350 lines are
  rejected.
- Four hundred physical lines is the absolute ceiling for every hand-maintained
  JS/TS source or spec module touched by this lane. The ceiling does not make a
  mixed-responsibility file acceptable.
- Split a module below those thresholds when it owns three or more independently
  nameable concerns or combines state policy, I/O, normalization, planning,
  error translation, or rendering.
- Coordinators sequence focused collaborators; they do not absorb collaborator
  algorithms. Barrels expose a local capsule; they do not launder foreign APIs.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
  Use feature-local capsules with explicit owner names.
- Record physical line counts for every new or materially rewritten file. The
  reviewer must independently verify warning-band files and reject unjustified
  growth in an existing oversized module.

## Your Mission

Implement `wt watch`. Preflight the lane, export WT_* env, exec watcher in
foreground. Stdio passthrough. Ctrl-C. No daemonization.

1. Create `src/commands/WatchCommand.ts`:
   - Extend BaseCommand; class name `WatchCommand`
   - `name: "watch"`; `group: "lane"`
   - `description: "Run the lane watcher in the foreground"`
   - `usage: "watch [--lane=<slug-or-uuid>] [--workspace=<path>]"`
   - `async run()`:
     - Reject `--json` with exit 2 (watch is foreground attachment, not
       data-format output)
     - Parse `--lane=<slug-or-uuid>` (optional) and `--workspace=<path>` (optional)
     - Call workspace resolver (RM-03) to get control home
     - Call lane discovery/selector (RM-06) to resolve the target lane
     - **Preflight checks:**
       - Verify `lane.json` exists and is valid → else exit 3
       - Verify `install.json` exists and is valid → else exit 4
       - Verify pinned runtime version is staged → else exit 4
       - Verify `coordinator/routing-policy.json` exists (from LC-05)
       - Verify `coordinator/pack-index.json` exists and seal matches → else exit 4
       - Verify pack index freshness (not stale) → else exit 4
       - Check if watcher is already running (via lane lock or heartbeat file)
         → if running, exit 5
       - If verbose: print resolved lane info, runtime version, watcher path
     - **Construct invocation context:**
       - Build env object with all required `WT_*` variables:
         - `WT_WORKSPACE`: control home absolute path
         - `WT_LANE_ID`: lane UUID
         - `WT_INITIATIVE_ID`: initiative ID
         - `WT_LANE_SLUG`: lane slug
         - `WT_LANE_DIR`: relative path within workspace (`.watchtower/lanes/{slug}`)
         - `WT_HOME_REPOSITORY_ID`: control home repository ID
         - `WT_REPOSITORIES_FILE`: absolute path to `repositories.local.json`
         - `WT_ACTIVE_REPOSITORY_ID`: control home repo ID (watcher default)
         - `WT_RUNTIME_ROOT`: absolute path to staged runtime root
         - `WT_RUNTIME_VERSION`: pinned runtime version string
         - `WT_KNOWLEDGE_ROOT`: absolute path to knowledge pack root
       - Do not set coordinator-only variables (`WT_COORDINATOR_CYCLE_ID`,
         `WT_DECISION_CLASS`)
       - Do not print full environment unless `--verbose`
     - **Resolve watcher binary:**
       - Compute path: `{runtimeRoot}/coordinator/coordinator-watch.sh`
       - Verify path exists and is a regular file → else exit 4
       - Verify file is executable → else exit 4
       - Verify checksum against `install.json` managedAssets entry → else exit 4
     - **Invoke watcher via RuntimeInvoker (RT-05):**
       - Look up the `"watch"` action from the runtime manifest
       - Verify the action is declared
       - Call `RuntimeInvoker.exec(action, { env: { ...process.env, ...wtEnv }, stdio: "inherit" })`
       - The invoker handles: argv construction, cwd, signal forwarding,
         exit code propagation
       - Print debug context only if `--verbose`
     - **Post-exec:**
       - Return exit code from watcher process
       - Do not restart, daemonize, or background the watcher

2. Create `help/commands/watch.hlp.json`:
   - Command name, description, usage
   - Flags: `--lane`, `--workspace`
   - Preflight description: what is validated before exec
   - Behavior: foreground exec, stdout/stderr passthrough
   - Signal handling: Ctrl-C terminates the watcher
   - Error codes: 3 (lane not found), 4 (preflight failed), 5 (watcher running)

3. Register watch in `help/help.json`:
   - Add entry for `watch` in the lane group
   - Verify no json documentation conflicts

4. Write focused specs:
   - `spec/commands/WatchCommand.spec.ts`:
     - Parse `--lane=<slug>` and `--workspace=<path>`
     - Reject `--json` with exit 2
     - Lane not found → exit 3
     - Missing `lane.json` → exit 3
     - Invalid `install.json` → exit 4
     - Runtime not staged → exit 4
     - Missing `routing-policy.json` → exit 4
     - Stale pack index → exit 4
     - Watcher already running → exit 5
     - Missing watcher binary → exit 4
     - Non-executable watcher → exit 4
     - Checksum mismatch → exit 4
     - WT_* env exported with correct values
     - RuntimeInvoker called with correct action name
     - RuntimeInvoker called with correct env and stdio: "inherit"
     - Signal forwarding: SIGINT terminates process group
     - Verbose mode prints debug context

## What You Must Not Do

- Do not implement watcher logic — the watcher is in the shell runtime
- Do not daemonize, fork, or background the watcher process
- Do not use a model for idle polling, heartbeat detection, or any watcher operation
- Do not infer lifecycle facts from tmux prose
- Do not add hidden state writes — watch observation writes are the watcher's job
- Do not add product logic to `src/cli.ts`
- Do not commit
- Do not add `.local` artifacts to git

## Required Proof

Before finishing, verify and report:

- `--lane` and `--workspace` parsed correctly
- `--json` rejected with exit 2
- Lane preflight: missing lane → exit 3, missing files → exit 4
- Watcher preflight: missing binary → exit 4, non-executable → exit 4,
  checksum mismatch → exit 4
- Watcher already running → exit 5
- WT_* env: all required variables present with correct values
- Watcher exec: RuntimeInvoker called with inherited stdio
- Ctrl-C: SIGINT forwarded, no orphaned child process
- Exit code: watcher's exit code propagated
- `nvb build` passes from tracked-only checkout
- Final `git status --short`
- Proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
- `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- foreground exec only; no daemonization
- no model use for watcher operations
- no hidden state writes
- no product logic in `src/cli.ts`
- watcher logic remains in shell runtime; CLI only validates and execs
- `nvb build` must pass
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-lane-lifecycle/LC-06-foreground-watch-command.md`

The report must include:

- documents studied
- exact files created and changed
- WatchCommand public API shape
- Preflight matrix: every check, every error code
- WT_* env variable list with descriptions
- Watcher invocation path: RuntimeInvoker call signature
- Signal handling: SIGINT and SIGTERM forwarding proof
- Help fragment registered
- proof commands and outcomes
- `nvb build` result
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the WatchCommand preflight sequence, the exact WT_* env variables
exported, the RuntimeInvoker call contract, and the signal handling behavior.
Make explicit that LC-07 (doctor) reads watcher status from heartbeat/lock
files but does not start or stop the watcher.
