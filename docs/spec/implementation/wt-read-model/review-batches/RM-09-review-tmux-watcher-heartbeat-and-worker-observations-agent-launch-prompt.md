# Agent Launch Prompt — Review Batch RM-09

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for observation mechanics and read-only proof review`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: agent must retain complete context
- final-authority constraint: only this reviewer issues acceptance judgment

You are assigned **review batch RM-09**.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/review-batches/RM-09-review-tmux-watcher-heartbeat-and-worker-observations.md`
2. `docs/spec/implementation/wt-read-model/review-batches/README.md`
3. `docs/spec/implementation/wt-read-model/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-read-model/work-batches/RM-09-tmux-watcher-heartbeat-and-worker-observations.md` (paired work brief)
5. `.local/agent-reports/wt-read-model/RM-09-tmux-watcher-heartbeat-and-worker-observations.md` (implementation report)
6. `docs/spec/v1.md` (especially §11.3, §11.4, §13)
7. `docs/spec/v1-contracts.md`
8. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
9. The actual changed source files:
   - `src/foundation/observations.ts`
   - `src/foundation/heartbeat.ts`

## Your Review Mission

Independently verify observation mechanics with no lifecycle authority:

1. **Tmux session reading**: Verify the tmux binary invocation uses
   `tmux list-sessions -F '#{session_name}'`. Confirm the dependency is
   injectable/mockable for tests. Test with zero sessions, one session, and
   multiple sessions.
2. **Heartbeat staleness**: Create heartbeat files with various timestamps.
   Verify classification as fresh (within threshold), stale (exceeds threshold
   with correct last-heartbeat time), and absent (no file exists). Verify the
   threshold is configurable, not hardcoded.
3. **Worker-event reading**: Verify the latest valid worker event per role is
   surfaced correctly from the parsed JSONL stream. Confirm the RM-05 parser
   is consumed through its public interface.
4. **No-mutation proof**: Before running any observation function, compute a
   hash of the state directory. After running every observation function
   (tmux reading, heartbeat detection, worker-event reading), recompute the
   hash. Verify the hashes are identical.
5. **No lifecycle authority**: Audit every observation function. Verify none
   infers lifecycle status, worker health, or automation decisions. Verify
   none writes to state files, heartbeat files, or event cursors.
6. **Hard-reject checklist**. **Build and test** independently.

## Acceptance Gate

- Tmux session reading returns correct qualified names.
- Heartbeat classification handles fresh, stale, and absent correctly with a
  configurable threshold.
- Worker-event reading consumes RM-05 parser correctly.
- No state files written by any observation function.
- No observation implies lifecycle authority.
- Build and tests pass independently.

## Rejection Correction Brief Rule

If rejected, create `review-batches/corrections/RM-09-correction-01.md` with
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
- `.local/agent-reports/wt-read-model/reviews/RM-09-tmux-watcher-heartbeat-and-worker-observations-review.md`

Include: documents studied, independent proof reruns and outcomes, no-mutation
proof (before/after directory hash), structural verification,
acceptance/rejection decision, final git status, and if accepting, create the
acceptance commit.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
RM-09: Tmux, watcher, heartbeat, and worker observations accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified observation categories, and any
limitations noted. Confirm that RM-10 may now consume observations for status
display.
