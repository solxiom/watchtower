# Agent Launch Prompt — Review Batch LC-08

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
- agent suitability: `high for end-to-end integration verification, scaffold removal audit, and cross-command lifecycle proof`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying the end-to-end lifecycle, rollback behavior,
and exhaustive scaffold removal. The reviewer must be capable of comprehensive
codebase search and build verification.

You are assigned **review batch LC-08** for the Watchtower v1 wt-lane-lifecycle
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-lane-lifecycle/review-batches/LC-08-review-lifecycle-integration-and-scaffold-removal.md`
2. `docs/spec/implementation/wt-lane-lifecycle/review-batches/README.md`
3. `docs/spec/implementation/wt-lane-lifecycle/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-08-lifecycle-integration-and-scaffold-removal.md` (paired work brief)
5. `.local/agent-reports/wt-lane-lifecycle/LC-08-lifecycle-integration-and-scaffold-removal.md` (implementation report)
6. `docs/spec/v1.md` — §7 (lane layout), §8 (config), §11.1 (init), §11.3 (status), §11.4 (watch), §11.7 (doctor), §15 (rollback)
7. `docs/spec/v1-contracts.md` — §8 (exit codes)
8. `docs/spec/architecture.md` — §6.3 (runtime execution flow)
9. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
10. the actual changed source files:
     - `spec/e2e/lifecycle.spec.ts` (new)
     - `src/commands/index.ts` (modified — HelloCommand removed)
     - `help/help.json` (modified — hello entry removed)
     - `help/commands/README.md` (modified — hello section removed if present)
11. the files that should be deleted:
     - `src/commands/HelloCommand.ts`
     - `help/commands/hello.hlp.json`
     - `spec/commands/HelloCommand.spec.ts` (if present)

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

Independently verify the complete lifecycle chain works, rollback works, and
scaffold removal is exhaustive:

1. **End-to-end fixture — init**: run the lifecycle spec. Verify init creates the expected lane directory. Verify `lane.json`, `install.json`, and `lane.config.env` are present and schema-valid. Verify all v1.md §7.2 subdirectories exist.
2. **End-to-end fixture — status**: verify status reads the created lane correctly. Verify output contains slug, UUID, initiative, and status.
3. **End-to-end fixture — watch**: start watch in test mode. Verify preflight passes (no exit 3/4/5). Verify the process starts correctly. Send SIGINT. Verify clean exit. Verify no orphaned processes.
4. **End-to-end fixture — doctor**: run doctor on the created lane. Verify exit code 0. Verify expected check categories appear. Verify no unexpected failures.
5. **Rollback proof — invalid init**: attempt init with invalid slug. Verify non-zero exit. Verify no `.watchtower/lanes/{invalid-slug}/` directory. Verify `.watchtower/` is either absent or contains only valid lanes.
6. **Rollback proof — missing arg init**: attempt init without required arguments. Verify non-zero exit. Verify no residual state.
7. **Rollback proof — partial failure**: if the implementation simulates mid-transaction failure, verify rollback cleans up completely. Verify no partial lane directory.
8. **Scaffold removal — file existence audit**: verify `src/commands/HelloCommand.ts` does not exist. Verify `help/commands/hello.hlp.json` does not exist. Verify `spec/commands/HelloCommand.spec.ts` does not exist (or never existed).
9. **Scaffold removal — import audit**: search `src/commands/index.ts` for `HelloCommand` (case-insensitive). Verify zero results.
10. **Scaffold removal — help audit**: search `help/help.json` for `hello` (case-insensitive). Verify zero results. Verify the JSON is still valid.
11. **Scaffold removal — comprehensive search**: run `grep -ril "hello" src/ help/ spec/ runtime-nvb/`. Verify zero results (excluding intentional historical documentation references in `docs/spec/` that mention the hello scaffold).
12. **Command index integrity**: verify `src/commands/index.ts` still exports all real commands (init, status, watch, doctor, list, config, etc.). Verify no real command was accidentally removed.
13. **Build verification**: run `nvb build`. Verify zero errors. Verify no build errors from missing hello module references. Verify the build succeeds in a clean checkout.
14. **Test verification**: run `nvb test`. Verify all tests pass. Verify no test failures from missing hello test dependencies. Verify the lifecycle e2e spec passes.
15. **Hard-reject checklist**: run the quality-and-agent-rules reviewer hard-reject checklist. Reject immediately if any item flags.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept if any hello artifact remains.
- Do not accept if `nvb build` fails.
- Do not accept if `nvb test` fails.
- Do not accept if any real command was removed alongside hello.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun the complete lifecycle e2e fixture. Record full output.
- Independently run rollback scenarios and verify no residual state.
- Independently search for hello references in all code directories.
- Independently run `nvb build` and `nvb test`. Record output.
- Independently verify every deleted file is actually gone.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All hard-reject checklist items are clear.
- End-to-end fixture passes: init→status→watch/doctor chain works.
- Rollback proof: failed init leaves no residual state.
- All hello artifacts deleted and confirmed gone.
- Zero hello references in `src/`, `help/`, `spec/`, `runtime-nvb/`.
- `help/help.json` and `src/commands/index.ts` cleaned correctly.
- `nvb build` passes with zero errors.
- `nvb test` passes with zero failures.
- All real commands still intact and functional.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/LC-08-correction-01.md` with exact required fixes.
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
- `docs/spec/v1.md` — update status markers for init, watch, doctor, and scaffold removal

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
- `.local/agent-reports/wt-lane-lifecycle/reviews/LC-08-lifecycle-integration-and-scaffold-removal-review.md`

Include: documents studied, independent proof reruns and outcomes, end-to-end
fixture execution output (init, status, watch, doctor sections), rollback proof
execution output, scaffold removal audit table (every file: deleted/modified/
unmodified, hello-search results), `nvb build` output, `nvb test` output,
command index integrity verification, structural verification, acceptance/
rejection decision, final git status, and if accepting, create the acceptance
commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
LC-08: Lifecycle integration and scaffold removal accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified lifecycle chain, rollback proof,
scaffold removal completeness, and any limitations noted. Confirm that the
wt-lane-lifecycle pack is complete and Pack 4 (wt-upgrade-knowledge) and
Pack 5 (wt-coordinator-automation) are now unblocked.
