# Agent Launch Prompt — Review Batch CA-17

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5` — strongest required for verifying classification determinism, reserve-protection enforcement, revalidation pipeline integrity, and hold-scope blocking correctness
- agent suitability: `high for classification audit, budget/reserve verification, proposal-pipeline integration audit, and hold/amendment boundary audit`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration — insufficient for classification-boundary and pipeline-integrity audit
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying the M0/D1–D3 classification boundary,
budget/reserve enforcement, proposal revalidation pipeline, hold-scope blocking,
and amendment-request non-intrusiveness without trusting the implementation
report.

You are assigned **review batch CA-17** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-17-review-session-routing-budgets-proposals-holds-and-amendments.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-17-session-routing-budgets-proposals-holds-and-amendments.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-17-session-routing-budgets-proposals-holds-and-amendments.md` (implementation report)
6. `docs/spec/operator-session.md` §10 — classification
7. `docs/spec/operator-session.md` §13 — budget model
8. `docs/spec/operator-session.md` §15 — proposals and confirmation
9. `docs/spec/operator-session.md` §16 — scoped holds
10. `docs/spec/v1-contracts.md` §4–§5 — routing and proposal contracts
11. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
12. the actual changed source files:
    - `src/foundation/session-routing.ts`
    - `src/foundation/session-budgets.ts`
    - `src/foundation/session-holds.ts`
    - `src/foundation/session-proposals.ts`
    - all new spec files under `spec/`

## Your Review Mission

Independently verify that session routing, budgets, proposals, holds, and
amendments are correct, safe, and properly integrated with predecessor modules:

1. **M0 classification audit:** Independently submit every exact M0 query form
   (status, ready, budget, holds, events, queue, sessions). Prove each is
   classified as M0 and returns deterministic output. Verify no model or
   endpoint is invoked for any M0 query.
2. **D2/D3 classification audit:** Independently submit ambiguous natural
   language. Prove D2 default. Independently submit D3 guard-triggering
   scenarios (state contradiction, unauthorized effect evidence, scope drift).
   Prove D3 classification regardless of `--class` flag.
3. **Escalate-only audit:** Independently verify: `--class=D3` on D2 question
   yields D3, `--class=D1` on D3-guarded question still yields D3. Route never
   downgrades.
4. **Route-loss audit:** Remove D2 endpoints. Attempt D2 turn. Verify
   `OPERATOR_SESSION_ROUTE_UNAVAILABLE` and session preservation.
5. **Budget dimensions audit:** Independently test every dimension: per-turn
   input/output/broker limits, per-session cumulative, lane-wide, reserves.
   Verify soft limits warn, hard limits block.
6. **Grant audit:** Independently grant bounded allowance. Verify session limit
   increases by the exact granted amount. Verify grant is journaled. Attempt
   grant consuming protected reserves — prove rejection or reduction.
7. **Hold lifecycle audit:** Independently: place batch-scope hold, verify
   dispatch for that batch is blocked and for another batch is not, release the
   hold (idempotent), verify unblocked. Place hold with expiry — independently
   verify it ceases to be active after expiry and the expiry event is journaled.
8. **Proposal pipeline audit:** Independently walk the full path: PROPOSED →
   OPERATOR_CONFIRMED → REVALIDATED (passes) → EFFECT_PREPARED → EFFECT_VERIFIED.
   Verify CA-09 revalidation is invoked and CA-10 executes the effect.
9. **Stale/illegal proposal audit:** Independently: propose, change state,
   confirm, revalidate → PROPOSAL_STALE. Propose illegal effect, confirm,
   revalidate → PROPOSAL_ILLEGAL. In both cases, verify zero effects applied.
10. **Amendment-request audit:** Independently create an amendment request.
    Verify: durable record exists with correct fields, no pack edit occurred,
    no hold was automatically created, session was not suspended/closed, and
    the `amendment-requested` event appears in the journal.
11. **Model-free audit:** grep all new source files for model/provider
    invocation in M0 classification, budget checks, hold management, and
    amendment creation. Prove none exist.
12. **Hard-reject checklist:** Verify every hard-reject condition. Reject
    immediately if any item flags.
13. **Build and test:** Run `nvb build` and `nvb test` independently. Record
    exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without independently classifying every M0 query form.
- Do not accept without proving D3 guards override any lower classification.
- Do not accept if a budget grant consumes protected reserves.
- Do not accept if a proposal is applied without revalidation.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently classify every M0 query form and verify model-free output.
- Independently verify D3 guard override for every guard trigger.
- Independently verify budget reserve protection.
- Independently walk the full proposal pipeline (success, stale, illegal).
- Independently verify hold scope and expiry.
- Independently verify amendment-request non-intrusiveness.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- M0 queries invoke no model and return deterministic output.
- D2 is the default for unknown natural language.
- D3 guards override any lower classification.
- Route loss preserves session and never silently downgrades.
- Budget grants never consume protected reserves.
- Holds block only declared scopes and expire correctly.
- Proposal pipeline: confirm → revalidate → CA-10 execute works.
- Stale/illegal proposals are rejected without effect application.
- Amendment requests create durable records without implicit side effects.
- Build and tests pass independently.
- Zero model invocations in classification, budget, hold, or amendment logic.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-17-correction-01.md` with exact required fixes.
The correction brief must include: rejection reasons with source locations,
expected corrected state, required additional proof, exact files to change,
and reference to this review.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`

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
- `.local/agent-reports/coordinator-automation/reviews/CA-17-session-routing-budgets-proposals-holds-and-amendments-review.md`

Include: documents studied, independent proof reruns and outcomes, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
CA-17: Session routing, budgets, proposals, holds, and amendments accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified M0 query registry, D3 guard-override
evidence, budget reserve-protection proof, proposal pipeline integration audit,
hold scope/expiry verification, and amendment-request non-intrusiveness results.
Confirm that CA-18 may now build session CLI/PTY commands on this foundation.
