# Agent Launch Prompt — Review Batch LC-08

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
