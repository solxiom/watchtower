# Agent Launch Prompt — Review Batch LC-01

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for argument resolution validation, preflight plan correctness, and path escape / shell injection detection`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying argument resolution, preflight plan
construction, and rejecting implementation that creates destination state during
dry-run. The reviewer must be capable of identifying path escape and shell
injection vectors in string argument handling.

You are assigned **review batch LC-01** for the Watchtower v1 wt-lane-lifecycle
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-lane-lifecycle/review-batches/LC-01-review-init-argument-resolution-and-preflight-plan.md`
2. `docs/spec/implementation/wt-lane-lifecycle/review-batches/README.md`
3. `docs/spec/implementation/wt-lane-lifecycle/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-01-init-argument-resolution-and-preflight-plan.md` (paired work brief)
5. `.local/agent-reports/wt-lane-lifecycle/LC-01-init-argument-resolution-and-preflight-plan.md` (implementation report)
6. `docs/spec/v1.md` — §11.1 (init command)
7. `docs/spec/v1-contracts.md` — §8 (init exit codes), relevant argument contracts
8. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
9. the actual changed source files:
    - `src/foundation/init-planner.ts`
    - `src/commands/InitCommand.ts`
    - `help/commands/init.hlp.json`
    - `help/help.json`
    - `spec/foundation/init-planner.spec.ts`
    - `spec/commands/InitCommand.spec.ts`

## Your Review Mission

Independently verify that the init argument resolution and preflight plan
implementation is correct, safe, and side-effect-free:

1. **Argument parsing audit**: verify slug pattern (`^[a-z0-9][a-z0-9-]{0,62}$`), prefix pattern (`^[a-z0-9][a-z0-9-]{0,15}$`), and scope validation. Every boundary value must produce the correct result. Every invalid value must be rejected with a clear error.
2. **Dry-run premise**: run `wt init --dry-run` with valid arguments. Verify the preflight plan is printed. Verify absolutely zero filesystem mutations occurred — no directories created, no files written, no config changed. Use `find`, `stat`, or equivalent to prove nothing was created in the workspace or `.watchtower/` paths.
3. **Ambiguous binding rejection**: create a scenario with ambiguous bindings. Verify init rejects with a clear resolution message rather than silently choosing one.
4. **Missing/invalid pack rejection**: run init with missing or invalid implementation pack path. Verify rejection with clear error. Verify no destination directory creation.
5. **Path escape audit**: attempt to inject path traversal sequences (`../`, `..\\`, symlinks) into slug, prefix, workspace, and scope arguments. Verify every vector is rejected.
6. **Shell injection audit**: attempt to inject shell metacharacters (`$(...)`, `` `...` ``, `;`, `|`, `&`) into all string arguments. Verify they are treated as literal strings, never executed.
7. **Hard-reject checklist**: run the quality-and-agent-rules reviewer hard-reject checklist. Reject immediately if any item flags.
8. **Layer integrity**: verify `InitCommand` delegates to `init-planner` and does not duplicate argument parsing or validation logic. Verify no CLI rendering logic in `init-planner`.
9. **Build and test**: run `nvb build` and `nvb test` independently. Record exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept if dry-run creates any destination state.
- Do not accept if any path escape or shell injection passes undetected.
- Do not accept if the command duplicates foundation logic.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently test all argument combinations — every boundary value for slug, prefix, scope, and routing.
- Independently test path escape and shell injection vectors.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All hard-reject checklist items are clear.
- All argument combinations parse and validate correctly.
- Dry-run prints the plan and writes nothing.
- No path escape or shell injection passes undetected.
- Build and tests pass independently.
- Help fragment registered correctly.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/LC-01-correction-01.md` with exact required fixes.
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
- `.local/agent-reports/wt-lane-lifecycle/reviews/LC-01-init-argument-resolution-and-preflight-plan-review.md`

Include: documents studied, independent proof reruns and outcomes, argument
combination matrix results, path escape and shell injection audit results,
structural verification, acceptance/rejection decision, final git status, and
if accepting, create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
LC-01: Init argument resolution and preflight plan accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified argument combinations and boundaries,
and any limitations noted. Confirm that LC-02 may now be reviewed in parallel
and that LC-03 is unblocked after both LC-01 and LC-02 are accepted.
