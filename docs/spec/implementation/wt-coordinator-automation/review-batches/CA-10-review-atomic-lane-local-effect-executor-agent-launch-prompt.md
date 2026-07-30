# Agent Launch Prompt — Review Batch CA-10

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for sole effect authority review with lock/revalidation/idempotency and crash recovery verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying lock enforcement, revalidation, idempotency,
all-or-nothing execution, and crash recovery from journals.

You are assigned **review batch CA-10** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-10-review-atomic-lane-local-effect-executor.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-10-atomic-lane-local-effect-executor.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-10-atomic-lane-local-effect-executor.md` (implementation report)
6. `docs/spec/v1-contracts.md` — especially §5 (effect registry), §11 (locking, transactions, recovery)
7. `docs/spec/coordinator-automation.md` — especially §12, §13
8. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
9. the actual changed source files:
    - `src/foundation/effect-plan.ts`
    - `src/foundation/effect-executor.ts`
    - `spec/basic/effect-executor-spec.ts`

## Your Review Mission

Independently verify the effect executor:
1. Test lock acquisition: two concurrent attempts → second blocked.
2. Test lock release: after completion or rollback, lock released.
3. Test current-state revalidation: state changed → effect rejected.
4. Test idempotency key: retry with same key → rejected.
5. Test all-or-nothing: fail mid-plan → all lane-local effects rolled back.
6. Test lane-local atomic commit: all effects succeed → projections/journals updated.
7. Test external-effect journal: prepare/attempt/verify states. Recovery reads journal.
8. Test crash recovery: simulate crash during execution → restart → recovery from journal.
9. Test `previewEffectPlan` produces correct output without mutation.
10. Verify no raw mutation commands in public CLI.
11. Run `nvb build` and `nvb test` independently.
12. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject items clear.
- One effect authority (lock enforced).
- Revalidation blocks stale effects.
- Idempotency keys enforced.
- All-or-nothing with rollback.
- External effects have prepare/attempt/verify journals.
- Crash recovery reads journal.
- No raw mutation CLI commands.
- Build and tests pass.
- Implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create `review-batches/corrections/CA-10-correction-01.md`.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Update tracker and roadmap.

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- the reviewer is the acceptance authority; independent proof is mandatory
- accept only when all criteria are satisfied
- the reviewer owns the acceptance commit; the implementation agent never commits
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one review report to:
- `.local/agent-reports/coordinator-automation/reviews/CA-10-atomic-lane-local-effect-executor-review.md`

## If accepted, create the acceptance commit

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer
