# Agent Launch Prompt — Review Batch CA-05

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for routing policy review with first-match determinism and capability-floor verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`, `Claude Sonnet 4.6`
- good alternatives: `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying routing rule order, first-match determinism,
and capability-floor enforcement against `v1-contracts.md §4`.

You are assigned **review batch CA-05** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-05-review-ordered-routing-policy-and-capability-floors.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-05-ordered-routing-policy-and-capability-floors.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-05-ordered-routing-policy-and-capability-floors.md` (implementation report)
6. `docs/spec/v1-contracts.md` — especially §4 (complete routing rule table)
7. `docs/spec/coordinator-automation.md` — especially §6, §7
8. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
9. the actual changed source files:
    - `src/foundation/capability-floors.ts`
    - `src/foundation/routing-policy.ts`
    - `spec/basic/routing-policy-spec.ts`

## Your Review Mission

Independently verify the routing policy implements all 15 rules in correct order:
1. Enumerate all routing rules. Compare against `v1-contracts.md §4`. Verify exact order.
2. Test every guard condition with positive and negative fixtures.
3. Prove first-match determinism.
4. Verify capability floors: D1→C2, D2→C3, D3→C5.
5. Verify M0 routes never invoke a model.
6. Verify classification-only (no mutation).
7. Verify escalation never downgrades below minimum.
8. Run `nvb build` and `nvb test` independently.
9. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject items clear.
- All 15 rules in correct order.
- First-match determinism.
- Capability floors enforced.
- Classification-only.
- Build and tests pass.
- Implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create `review-batches/corrections/CA-05-correction-01.md`.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update tracker and roadmap.

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
- `.local/agent-reports/coordinator-automation/reviews/CA-05-ordered-routing-policy-and-capability-floors-review.md`

## If accepted, create the acceptance commit

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer
