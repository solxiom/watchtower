# Agent Launch Prompt — Review Batch CA-06

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for endpoint adapter interface review and eligibility verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`, `Claude Sonnet 4.6`
- good alternatives: `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying the adapter interface, all 10 eligibility
requirements, and the skill-only default classification.

You are assigned **review batch CA-06** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-06-review-endpoint-adapter-eligibility-and-isolation.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-06-endpoint-adapter-eligibility-and-isolation.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-06-endpoint-adapter-eligibility-and-isolation.md` (implementation report)
6. `docs/spec/v1-contracts.md` — especially §6 (10 requirements for unattended eligibility)
7. `docs/spec/coordinator-automation.md` — especially §8, §9, §16
8. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
9. the actual changed source files:
    - `src/foundation/endpoint-adapter.ts`
    - `src/foundation/endpoint-eligibility.ts`
    - `spec/basic/endpoint-adapter-spec.ts`

## Your Review Mission

Independently verify the endpoint adapter layer:
1. Enumerate all 10 eligibility requirements. Verify each is independently testable.
2. Test eligibility pass (all 10 met) and fail (each individually).
3. Verify default classification is skill-only.
4. Verify eligibility checker is pure (no I/O, no process execution).
5. Verify no concrete provider logic (Codex, Cursor, Claude specifics) in interface.
6. Run `nvb build` and `nvb test` independently.
7. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject items clear.
- All 10 eligibility requirements verified.
- Default to skill-only.
- Pure classification.
- No concrete provider logic.
- Build and tests pass.
- Implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create `review-batches/corrections/CA-06-correction-01.md`.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Update tracker and roadmap after acceptance or rejection.

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
- `.local/agent-reports/coordinator-automation/reviews/CA-06-endpoint-adapter-eligibility-and-isolation-review.md`

## If accepted, create the acceptance commit

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer
