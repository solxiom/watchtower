# Agent Launch Prompt — Review Batch RM-08

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for repository bindings and conflict detection review`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: agent must retain complete context
- final-authority constraint: only this reviewer issues acceptance judgment

You are assigned **review batch RM-08**.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/review-batches/RM-08-review-repository-bindings-and-conflict-inspection.md`
2. `docs/spec/implementation/wt-read-model/review-batches/README.md`
3. `docs/spec/implementation/wt-read-model/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-read-model/work-batches/RM-08-repository-bindings-and-conflict-inspection.md` (paired work brief)
5. `.local/agent-reports/wt-read-model/RM-08-repository-bindings-and-conflict-inspection.md` (implementation report)
6. `docs/spec/v1.md` (especially §7.1, §7.4, §9, §14)
7. `docs/spec/v1-contracts.md`
8. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
9. The actual changed source files:
   - `src/foundation/bindings.ts`
   - `src/foundation/conflicts.ts`

## Your Review Mission

Independently verify canonical binding computation and writable conflict
detection:

1. **Binding computation**: Create temp fixtures with `repositories.local.json`
   containing valid bindings. Verify each binding computes branch from git HEAD,
   worktree mode (dedicated/shared), and access (read/write) correctly. Test with
   matching branch, mismatched branch, and detached HEAD.
2. **Worktree defaults**: Verify dedicated worktree is the default. Confirm
   shared-write requires an explicit unsafe override and is surfaced as a
   warning condition.
3. **Conflict — shared-write**: Set up two active lanes claiming write access on
   the same worktree without shared-write override. Verify the conflict is
   detected and the diagnostic identifies both conflicting lanes.
4. **Conflict — path-conflict**: Set up two lanes with exclusive-write claims on
   overlapping paths. Verify the conflict is detected and the overlapping path
   is identified.
5. **Conflict — branch-conflict**: Set up two lanes on the same repository but
   different branches sharing a writable worktree. Verify the conflict is
   detected.
6. **Missing repository**: Set up a binding pointing to a nonexistent path.
   Verify a clear error diagnostic is produced, not a null or silent skip.
7. **No false positives**: Set up lanes with different worktrees, read-only
   access, and non-overlapping paths. Verify zero conflict reports.
8. **Hard-reject checklist**. **Build and test** independently.

## Acceptance Gate

- All three conflict classes detected with correct diagnostics.
- Dedicated worktree is the default; shared-write requires explicit override.
- Missing repositories produce errors, not null bindings.
- No false positive conflicts.
- Build and tests pass independently.

## Rejection Correction Brief Rule

If rejected, create `review-batches/corrections/RM-08-correction-01.md` with
exact required fixes.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`

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
- `.local/agent-reports/wt-read-model/reviews/RM-08-repository-bindings-and-conflict-inspection-review.md`

Include: documents studied, independent proof reruns and outcomes, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
RM-08: Repository bindings and writable conflict inspection accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified conflict classes, and any limitations
noted. Confirm that RM-10 may now consume bindings and conflicts for status
display.
