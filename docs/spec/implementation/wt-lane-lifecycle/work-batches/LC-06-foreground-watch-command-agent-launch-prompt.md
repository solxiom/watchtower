# Agent Launch Prompt — Work Batch LC-06

## Governing Contract And Precedence — Mandatory

This prompt is an execution aid, not product authority. Resolve conflicts in
this order and stop for a specification amendment rather than inventing
behavior:

1. `docs/spec/v1-contracts.md` and `docs/spec/schemas/v1.schema.json`
2. `docs/spec/v1.md`
3. `docs/spec/nirvana-integration-architecture.md`,
   `docs/spec/coordinator-automation.md`, `docs/spec/operator-session.md`, and
   `docs/spec/cli-session.md` within their scopes
4. `docs/spec/architecture.md`
5. `docs/development/engineering-and-review-standard.md`
6. `AGENTS.md`
7. the accepted implementation map, pack rules, and this batch brief

The implementation/review agent must read the mandatory engineering standard
and Nirvana integration architecture in full. A stale path, module suggestion,
or technical mechanism in this prompt must be corrected to the governing
contract while preserving the batch objective and proof obligations.

## Nirvana-First And NVB Execution Gate — Mandatory

- Complete and report the required Nirvana API usage audit before introducing
  infrastructure or bare Node behavior.
- Commands use Nirvana command, argument, pretty, and terminal-view APIs and
  remain thin.
- Public reason codes, exit mappings, event names, and schema identifiers remain
  owned by accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`. A
  batch-local symbolic name is not automatically public; reconcile it with the
  registry, and update the owning contract/schema in the same batch when a new
  public identifier is genuinely required.
- Use the Nirvana storage facade for ordinary managed-root operations only
  after CLI-safe root/bootstrap semantics are proved. Atomic durability,
  canonical path security, locking, append-only journals, ownership/modes, and
  SQLite stay behind focused adapters when the facade lacks required semantics.
- Use the Nirvana logger only through the Watchtower logging boundary for
  redacted diagnostics. Logs are never command output, lifecycle events,
  acceptance evidence, or authoritative journals.
- Substantial deterministic workflows use the immutable packaged Watchtower
  NVB catalog, focused TaskHandlers, and task groups.
- `LaneTaskRunner` is the only internal NVB invocation boundary. Task selection
  is an allowlisted Watchtower action mapping, never an arbitrary user/agent
  task name or parent-project discovery.
- Never create or modify a participating repository's root `nvb.json`.
- Shell is restricted to checksum-manifested leaf adapters for tmux, Git, or
  external tools when no conforming Nirvana API exists. Workflow-level shell is
  a hard reject.
- Mutating tasks do not gain authority from NVB. They require the normal
  Watchtower effect executor, current-state validation, locks, idempotency, and
  a valid single-use invocation envelope.

## Project-Wide Structural And Size Gate — Mandatory

Apply the exact limits in
`docs/development/engineering-and-review-standard.md`; pack-local numbers may
be stricter but may never relax them:

- CLI entry, command, or NVB task: preferred at most 120 lines, warning at
  121–160, hard reject over 180.
- Orchestrator, controller, or renderer shell: preferred at most 140 lines,
  warning at 141–180, hard reject over 200.
- Foundation service, planner, validator, adapter, or store: preferred at most
  200 lines, warning at 201–260, hard reject over 300.
- Contract/type/schema registry: preferred at most 240 lines, warning at
  241–320, hard reject over 400.
- Test/spec module: preferred at most 300 lines, warning at 301–420, hard reject
  over 500.
- Function: target at most 40 lines, justification at 41–60, reject over 80.
- Constructor: target at most 25 lines, warning at 26–40, reject over 50.

Passing a line limit never excuses mixed responsibilities, a god object,
generic helper bag, hidden cycle, foreign API laundering, or layer violation.
Use `PascalCase` for classes/class-owning files, `lowerCamelCase` for non-class
modules and directories, and never introduce dashed or underscored backend
source/spec names.

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
7. `docs/spec/architecture.md` — §4.5 (lane task runtime and leaf adapter),
   §6.3 (runtime execution flow)
8. `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
9. `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
10. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
11. `docs/spec/implementation/wt-lane-lifecycle/batch-reasoning-difficulty-ranking.md`
12. the canonical source owners you will create:
    - `src/commands/WatchCommand.ts` (new)
    - `src/foundation/ForegroundWatcher.ts` (new)
    - `help/commands/watch.hlp.json` (new)
    - `help/help.json` (edit to register watch)
13. the dependency modules you must inspect:
    - RM-03: workspace resolution
    - RM-06: lane discovery/selection
    - RT-04: runtime catalog
    - RT-05: `LaneTaskRunner`, central foreground/leaf invocation capability,
      environment isolation, and signal/exit evidence
    - RT-07: manifest-selected watcher entrypoint and relocated-package smoke
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

Line count is a design alarm, never permission to accumulate unrelated work.
Count physical lines, including comments and blanks, in new and materially
rewritten hand-maintained files. Generated artifacts are excluded only when
their generator ownership is explicit and they contain no hand-maintained
behavior.

Use the exact project-wide matrix:

| Category | Preferred maximum | Warning band | Hard reject |
| --- | ---: | ---: | ---: |
| CLI command, NVB TaskHandler/front door, registry, renderer, public barrel | 120 | 121–160 | over 180 |
| Orchestrator, controller, coordinator, presenter | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contract/type-only module | 240 | 241–320 | over 400 |
| Test/spec module | 300 | 301–420 | over 500 |

Functions target 40 lines, warn at 41–60, and reject above 80. Constructors
target 25 lines, warn at 26–40, and reject above 50. Warning-band owners require
a responsibility inventory and explicit reviewer judgment.

Every module has one primary responsibility and one cohesive reason to change.
Commands and TaskHandlers validate, normalize, delegate, and map results.
Orchestrators sequence collaborators without absorbing their algorithms.
Storage, validation, rendering, subprocess/leaf I/O, and state-machine policy do
not accumulate in one owner. Three independently nameable responsibilities
require a split even below a preferred maximum.

Class-owning TypeScript modules use PascalCase filenames; function/value modules
use lowerCamelCase. New source filenames do not use dashes or underscores.
Generic `helpers`, `utils`, `common`, and `misc` overflow bags are rejected.

Any size exception must be approved before implementation and name the exact
file, proposed maximum, cohesion reason, reviewer, and expiry/follow-up batch.
Existing oversized files are not precedent: when touched they become smaller,
split, or remain line-count neutral under an approved extraction plan.

The implementation report records categorized line counts for every new or
materially rewritten file plus warning-band functions/constructors. The
reviewer reproduces those counts and independently judges cohesion. Passing a
line-count check never overrides the responsibility gate.

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
       - Build from a closed allowlist; do not merge `process.env`, forward
         undeclared parent variables, or print environment values even under
         `--verbose`
     - **Resolve the watcher entrypoint:**
       - Resolve the `"watch"` action through the checksum-verified runtime
         catalog and lane-pinned task profile
       - Resolve its managed entrypoint from the manifest; never hardcode a
         filename, assume `.sh`, or consult participating-project `nvb.json`
       - Verify path containment, regular-file type, executable mode, and
         checksum against the installed manifest → otherwise exit 4
     - **Invoke through `ForegroundWatcher` and RT-05:**
       - Keep `WatchCommand` thin: parse, delegate one typed request, render/map
         the typed result
       - If accepted RT-05 evidence proves NVB foreground stdin/signal
         semantics, invoke the exact allowlisted catalog action through
         `LaneTaskRunner`
       - Otherwise use the manifest-declared watcher compatibility entrypoint
         through RT-05's narrow Nirvana `cmd`-based central foreground adapter,
         as allowed by `nirvana-integration-architecture.md §9`; do not invent
         another subprocess wrapper
       - Use `LaneTaskRunner` for bounded watcher sub-operations whenever doing
         so preserves the foreground contract
       - Inherit stdio, forward cancellation/signals, preserve exit status, and
         emit only redacted path/action diagnostics under `--verbose`
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
     - `ForegroundWatcher` called with correct selected lane/action
     - exact RT-05 boundary called with explicit allowlisted env and inherited
       stdio; parent sentinel secrets are absent
     - Signal forwarding: SIGINT terminates process group
     - Verbose mode prints debug context

## What You Must Not Do

- Do not reimplement the watcher loop in `WatchCommand` or
  `ForegroundWatcher`; invoke the manifest-selected packaged implementation
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
- Watcher execution: `ForegroundWatcher` uses the accepted RT-05 foreground
  path with inherited stdio and explicit environment isolation
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
- watcher-loop logic remains in its manifest-selected packaged owner; the CLI
  parses, delegates, and renders, while `ForegroundWatcher` owns lifecycle
  mechanics
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
- Watcher invocation path: catalog/profile resolution, selected RT-05
  foreground boundary, and typed call signature
- Signal handling: SIGINT and SIGTERM forwarding proof
- Help fragment registered
- proof commands and outcomes
- `nvb build` result
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the WatchCommand/ForegroundWatcher responsibility split, preflight
sequence, the exact WT_* allowlist, the selected RT-05 foreground contract,
and signal handling behavior.
Make explicit that LC-07 (doctor) reads watcher status from heartbeat/lock
files but does not start or stop the watcher.
