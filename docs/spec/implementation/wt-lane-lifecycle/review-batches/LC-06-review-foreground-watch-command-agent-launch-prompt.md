# Agent Launch Prompt — Review Batch LC-06

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
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for foreground process verification, signal handling, preflight matrix audit, and WT_* variable correctness`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying the preflight matrix, WT_* variable
correctness, foreground exec behavior, and signal handling. The reviewer
must be capable of process lifecycle testing including orphan detection.

You are assigned **review batch LC-06** for the Watchtower v1 wt-lane-lifecycle
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-lane-lifecycle/review-batches/LC-06-review-foreground-watch-command.md`
2. `docs/spec/implementation/wt-lane-lifecycle/review-batches/README.md`
3. `docs/spec/implementation/wt-lane-lifecycle/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-06-foreground-watch-command.md` (paired work brief)
5. `.local/agent-reports/wt-lane-lifecycle/LC-06-foreground-watch-command.md` (implementation report)
6. `docs/spec/v1.md` — §11.4 (watch command), §12 (runtime invocation contract: WT_* vars), §14 (no daemonization)
7. `docs/spec/v1-contracts.md` — §8 (watch exit codes, rejects --json)
8. `docs/spec/architecture.md` — §4.5 (lane task runtime and leaf adapter),
   §6.3 (runtime execution flow)
9. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
10. the actual changed source files:
     - `src/commands/WatchCommand.ts`
     - `help/commands/watch.hlp.json`
     - `help/help.json`
     - `spec/commands/WatchCommand.spec.ts`

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

## Your Review Mission

Independently verify that the watch command correctly preflights the lane,
exports WT_* variables, and execs the watcher in the foreground:

1. **Flag parsing audit**: verify `--lane=<slug>` and `--workspace=<path>` are parsed correctly. Verify `--json` is rejected with exit code 2 and a clear error message.
2. **Lane preflight matrix**: test every preflight failure condition independently:
   - Missing lane → exit 3
   - Missing `lane.json` → exit 3
   - Invalid `install.json` → exit 4
   - Runtime not staged → exit 4
   - Missing `routing-policy.json` → exit 4
   - Stale pack index → exit 4
   - Watcher already running → exit 5
   - Missing watcher binary → exit 4
   - Non-executable watcher → exit 4
   - Checksum mismatch → exit 4
   For each, verify the error message is clear and actionable.
3. **WT_* variable and isolation audit**: instrument the environment passed
   through the RT-05 foreground boundary. Verify all required variables:
   `WT_WORKSPACE`, `WT_LANE_ID`, `WT_INITIATIVE_ID`, `WT_LANE_SLUG`,
   `WT_LANE_DIR`, `WT_HOME_REPOSITORY_ID`, `WT_REPOSITORIES_FILE`,
   `WT_ACTIVE_REPOSITORY_ID`, `WT_RUNTIME_ROOT`, `WT_RUNTIME_VERSION`, and
   `WT_KNOWLEDGE_ROOT`. Verify canonical values, verify coordinator-only
   variables (`WT_COORDINATOR_CYCLE_ID`, `WT_DECISION_CLASS`) are absent, seed
   parent sentinel secrets/undeclared keys and prove they are absent, and prove
   diagnostics contain no environment values.
4. **Foreground-boundary verification**: verify:
   - the action and entrypoint come from the checksum-verified runtime catalog
     and lane profile, never a hardcoded path or project `nvb.json`;
   - `WatchCommand` delegates to `ForegroundWatcher`;
   - the environment is an explicit allowlist and stdio is inherited;
   - `LaneTaskRunner` is used only if RT-05 evidence proves required foreground
     stdin/signal semantics; otherwise the exact documented narrow Nirvana
     `cmd`-based central foreground path is used; and
   - argv, cwd, signal forwarding, cancellation, and exit propagation follow
     the accepted RT-05 contract.
5. **Foreground exec proof**: verify the watcher is NOT daemonized. The CLI must exec the watcher and wait — no fork/detach, no backgrounding, no setsid. Verify by inspecting the code and by observing process tree during execution.
6. **Stdio passthrough**: verify the watcher's stdout and stderr appear in the terminal. The CLI must not capture, buffer, or redirect them.
7. **Ctrl-C termination**: start the watcher, send SIGINT. Verify the foreground process group terminates. Verify no orphaned child processes remain (use `ps` or `pgrep` to check).
8. **Exit code propagation**: verify the watcher's exit code is propagated by the CLI. Test with watcher exiting 0, 1, and a custom code.
9. **Help fragment**: verify `help/commands/watch.hlp.json` exists with correct name, description, usage, flags, preflight description, signal handling, and error codes. Verify registered in `help/help.json`.
10. **Hard-reject checklist**: run the quality-and-agent-rules reviewer hard-reject checklist. Reject immediately if any item flags.
11. **Build and test**: run `nvb build` and `nvb test` independently. Record exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept if any preflight check is bypassed.
- Do not accept if any WT_* variable is missing or incorrect.
- Do not accept if the watcher is daemonized or backgrounded.
- Do not accept if Ctrl-C leaves orphaned processes.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently test every preflight failure condition.
- Independently inspect WT_* variables and verify values.
- Independently verify foreground exec (no daemonization).
- Independently test Ctrl-C and verify no orphans.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All hard-reject checklist items are clear.
- Every preflight check produces correct exit code.
- `--json` rejected with exit 2.
- WT_* variables complete and correct.
- Watcher execs in foreground with inherited stdio.
- Ctrl-C terminates cleanly (no orphans).
- Exit code propagated correctly.
- No daemonization.
- Help fragment registered.
- Build and tests pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/LC-06-correction-01.md` with exact required fixes.
The correction brief must include: rejection reasons with source locations,
expected corrected state, required additional proof, exact files to change,
and reference to this review.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- the reviewer is the acceptance authority; independent proof is mandatory
- accept only when all criteria are satisfied
- if rejecting, create a correction brief with exact required fixes
- do not add `.local` artifacts to git
- the reviewer owns the acceptance commit; the implementation agent never commits
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one review report to:
- `.local/agent-reports/wt-lane-lifecycle/reviews/LC-06-foreground-watch-command-review.md`

Include: documents studied, independent proof reruns and outcomes, preflight
matrix results (every check, every exit code), WT_* variable audit with
verified values, foreground exec and signal handling proof, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
LC-06: Foreground watch command accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified preflight matrix, WT_* variable audit,
and any limitations noted. Confirm that LC-07 may now be reviewed after LC-04,
LC-05, and LC-06 are all accepted.
