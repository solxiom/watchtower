# Agent Launch Prompt — Review Batch CA-09

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for typed proposal validation review and state-machine enforcement verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying all 11 proposal types, the complete validation
precondition checklist, and that no failed proposal is partially applied.

You are assigned **review batch CA-09** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-09-review-typed-proposals-and-current-state-validator.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-09-typed-proposals-and-current-state-validator.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-09-typed-proposals-and-current-state-validator.md` (implementation report)
6. `docs/spec/v1-contracts.md` — especially §5 (complete proposal-and-effect registry)
7. `docs/spec/coordinator-automation.md` — especially §11, §12
8. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
9. the actual changed source files:
    - `src/contracts/proposals.ts`
    - `src/foundation/proposal-validator.ts`
    - `spec/basic/proposal-validator-spec.ts`

## Your Review Mission

Independently verify the typed proposal system:
1. Enumerate all 11 proposal types. Verify each has valid, invalid, stale, illegal-transition, and idempotency-conflict fixtures.
2. Test permitted origin/class/effect enforcement for each proposal type.
3. Test stale state invalidation: validate, change state, re-validate → rejected.
4. Test idempotency key: submit equivalent proposal twice → second rejected.
5. Test illegal transition: effect not in permitted set → rejected.
6. Test reviewer independence: proposal weakening reviewer role → rejected.
7. Verify all 12 validation preconditions independently rejectable.
8. Verify failed proposals are recorded with reason codes, never partially applied.
9. Run `nvb build` and `nvb test` independently.
10. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject items clear.
- All 11 proposal types verified.
- Permitted origin/class/effect enforced.
- Stale state invalidates.
- Idempotency keys enforced.
- Failed proposals recorded, never partially applied.
- Build and tests pass.
- Implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create `review-batches/corrections/CA-09-correction-01.md`.

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
- `.local/agent-reports/coordinator-automation/reviews/CA-09-typed-proposals-and-current-state-validator-review.md`

## If accepted, create the acceptance commit

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer
