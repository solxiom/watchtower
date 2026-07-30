# Agent Launch Prompt — Review Batch CA-04

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for DAG scheduling review and resource-claim conflict verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying ready-set calculation, resource-claim
conflict detection, and deterministic projection from pack index and events.

You are assigned **review batch CA-04** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-04-review-ready-set-and-resource-claim-projection.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-04-ready-set-and-resource-claim-projection.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-04-ready-set-and-resource-claim-projection.md` (implementation report)
6. `docs/spec/v1.md`
7. `docs/spec/v1-contracts.md` — especially §4, §5
8. `docs/spec/coordinator-automation.md` — especially §5.3
9. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
10. the actual changed source files:
    - `src/foundation/resource-claims.ts`
    - `src/foundation/ready-set.ts`
    - `spec/basic/ready-set-spec.ts`
11. Accepted CA-01, CA-03, RM-08 outputs

## Your Review Mission

Independently verify that the ready-set calculation is correct, deterministic,
and never selects an arbitrary winner:

1. **Ready-set audit**: Compute ready set from a 30-batch fixture. Verify correct
   candidates. Verify all blockers correctly identified.
2. **Claim conflict audit**: Test every conflict kind: worktree, branch, path,
   capacity. Verify each produces the correct blocker classification.
3. **Determinism proof**: Run `computeReadySet` twice with identical inputs.
   Verify identical output.
4. **No arbitrary winner**: Create a scenario with multiple valid ready
   candidates. Verify all are reported individually.
5. **Model-free proof**: Verify no model/AI imports.
6. **Hard-reject checklist**: Run the 16-item checklist.
7. **Build and test**: Run `nvb build` and `nvb test` independently.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept if an arbitrary winner is selected from multiple ready candidates.
- Do not accept if output is non-deterministic.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently compute ready set and verify correctness.
- Independently verify all claim conflict kinds.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All hard-reject checklist items are clear.
- Ready set correctly computed.
- No arbitrary winner selection.
- Deterministic output.
- All blocker kinds detected.
- Model-free verified.
- Build and tests pass independently.
- Tracker and roadmap updated.
- Implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-04-correction-01.md`.

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
- `.local/agent-reports/coordinator-automation/reviews/CA-04-ready-set-and-resource-claim-projection-review.md`

## If accepted, create the acceptance commit

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer
