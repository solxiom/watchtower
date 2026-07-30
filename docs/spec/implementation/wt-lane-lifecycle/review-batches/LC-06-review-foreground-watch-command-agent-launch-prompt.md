# Agent Launch Prompt — Review Batch LC-06

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
8. `docs/spec/architecture.md` — §4.5 (runtime adapter), §6.3 (runtime execution flow)
9. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
10. the actual changed source files:
     - `src/commands/WatchCommand.ts`
     - `help/commands/watch.hlp.json`
     - `help/help.json`
     - `spec/commands/WatchCommand.spec.ts`

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
3. **WT_* variable audit**: instrument or inspect the environment passed to RuntimeInvoker. Verify all required variables: `WT_WORKSPACE`, `WT_LANE_ID`, `WT_INITIATIVE_ID`, `WT_LANE_SLUG`, `WT_LANE_DIR`, `WT_HOME_REPOSITORY_ID`, `WT_REPOSITORIES_FILE`, `WT_ACTIVE_REPOSITORY_ID`, `WT_RUNTIME_ROOT`, `WT_RUNTIME_VERSION`, `WT_KNOWLEDGE_ROOT`. Verify each has the correct value. Verify coordinator-only variables (`WT_COORDINATOR_CYCLE_ID`, `WT_DECISION_CLASS`) are NOT set.
4. **RuntimeInvoker call verification**: verify the RuntimeInvoker is called with:
   - Correct action name (from runtime manifest)
   - Merged env object (process.env + WT_* vars)
   - `stdio: "inherit"`
   Verify the invoker handles argv, cwd, signal forwarding, and exit code propagation.
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
