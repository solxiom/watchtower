# Agent Launch Prompt — Review Batch CA-08

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for context broker review with allowlist verification and budget enforcement`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying the context broker allowlist, budget tracking,
and that no unauthorized context is served.

You are assigned **review batch CA-08** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-08-review-context-broker-and-cycle-budgets.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-08-context-broker-and-cycle-budgets.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-08-context-broker-and-cycle-budgets.md` (implementation report)
6. `docs/spec/v1-contracts.md` — especially §7 (shipping policy baseline)
7. `docs/spec/coordinator-automation.md` — especially §10
8. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
9. the actual changed source files:
    - `src/foundation/cycle-budget.ts`
    - `src/foundation/context-broker.ts`
    - `spec/basic/context-broker-spec.ts`

## Your Review Mission

Independently verify the context broker:
1. Test each of the 8 allowlisted context types. Verify correct resolution.
2. Test unauthorized context type → denied with recorded event.
3. Test budget tracking: soft limit → warning + context served. Hard limit → blocked.
4. Test broker request counting: after N requests hit hard limit → blocked.
5. Test wall-clock tracking: exceed time budget → blocked.
6. Test budget per-cycle isolation: two cycles have independent budgets.
7. Test provenance and redaction on all responses.
8. Verify broker does not kill processes at hard limit.
9. Run `nvb build` and `nvb test` independently.
10. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject items clear.
- All allowlisted types resolve. Unauthorized types denied.
- Soft/hard limits enforced.
- Budget isolation.
- Provenance and redaction applied.
- Build and tests pass.
- Implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create `review-batches/corrections/CA-08-correction-01.md`.

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
- `.local/agent-reports/coordinator-automation/reviews/CA-08-context-broker-and-cycle-budgets-review.md`

## If accepted, create the acceptance commit

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer
