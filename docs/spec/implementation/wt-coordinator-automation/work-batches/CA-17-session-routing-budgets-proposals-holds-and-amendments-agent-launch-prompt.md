# Agent Launch Prompt — Work Batch CA-17

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5` — strongest required for M0/D1–D3 probabilistic-to-deterministic classification boundary, finite budget/reserve accounting enforcement, proposal revalidation pipeline integration with CA-09/CA-10, scoped-hold blocking semantics, and amendment-request handoff durability
- agent suitability: `high for session orchestration logic, classification, budget accounting, proposal pipelines, and hold/amendment integration`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto` — must be steered away from confusing classification with model invocation, allowing budget grants to consume reserves, or bypassing proposal revalidation
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration — insufficient for classification-boundary reasoning and proposal-pipeline integration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. CA-17 is R5 because session routing
classifies every operator message into M0/D1–D3 with hard guards and
non-downgrade enforcement, session budgets protect lane-wide reserves from
operator consumption, and the proposal pipeline must correctly chain
confirmation → revalidation → CA-10 execution without bypass. A
misclassification, reserve leak, or revalidation skip would corrupt the
operator-session safety model.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, or cross-module
  integration closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch CA-17** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch implements session routing (M0/D1–D3 classification), budget grants
and reserves, proposal confirmation and revalidation pipeline connecting to
CA-10, scoped holds, and amendment-request handoffs. This is the bridge between
advisory operator discussion and the effect plane.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-17-session-routing-budgets-proposals-holds-and-amendments.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/operator-session.md` §10 — reference resolution and classification
5. `docs/spec/operator-session.md` §13 — budget model
6. `docs/spec/operator-session.md` §14 — endpoint routing
7. `docs/spec/operator-session.md` §15 — session proposals and confirmation
8. `docs/spec/operator-session.md` §15.3 — amendment-request handoff
9. `docs/spec/operator-session.md` §16 — scoped holds
10. `docs/spec/operator-session.md` §18 — escalation
11. `docs/spec/v1-contracts.md` §4 — routing policy and capability floors
12. `docs/spec/v1-contracts.md` §5 — proposal and effect registry
13. Accepted CA-05 ordered routing policy
14. Accepted CA-06 endpoint adapter eligibility
15. Accepted CA-08 context broker and cycle budgets
16. Accepted CA-09 typed proposals and current-state validator
17. Accepted CA-10 atomic lane-local effect executor
18. Accepted CA-15 session store and lifecycle
19. Accepted CA-16 session SQLite index
20. the canonical source owners you will actually work with:
    - `src/foundation/session-routing.ts` (create)
    - `src/foundation/session-budgets.ts` (create)
    - `src/foundation/session-holds.ts` (create)
    - `src/foundation/session-proposals.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5` — strongest required for M0/D1–D3 classification boundary, finite budget/reserve enforcement, proposal-revalidation pipeline, scoped-hold blocking semantics, and amendment handoff durability
- agent suitability: `high for session orchestration logic, classification, budget accounting, proposal pipelines, and hold/amendment integration`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, types, tests, and status artifacts affected by this batch.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. Enumerate the complete M0 query registry — every exact structured query form
   that must be answered without a model. Define the classification algorithm
   that maps operator messages to M0/D1/D2/D3. Enumerate every hard guard.
4. Map the complete budget dimension space: per-turn, per-session, lane-wide,
   and protected reserves. Define the grant rules that prevent reserve
   consumption.
5. Map the complete proposal state machine: PROPOSED → OPERATOR_CONFIRMED →
   REVALIDATED → EFFECT_PREPARED → EFFECT_VERIFIED (plus rejection and expiry
   paths). Define the revalidation rules and the CA-10 integration boundary.
6. Enumerate every hold scope and blocking rule. Define expiry semantics and
   system-hold creation.
7. Use counterexamples: identify at least one M0/misclassification bug, one
   reserve-leak bug, and one revalidation-skip bug, then ensure focused proof
   rejects them.
8. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
9. Treat predecessor reports as leads, not proof. Re-open the actual changed
   files and reproduce all acceptance-critical evidence from the current tree.

## Structural Design And Module-Size Gate

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- Front doors and public barrels target 160 lines or fewer. Files from 161
  through 220 lines require an explicit cohesion justification. A hand-maintained
  front door over 220 lines is rejectable without a narrow pre-existing
  constraint, and no front door may exceed 300 lines.
- Focused implementation modules target 220 lines or fewer. Files from 221
  through 300 lines require a responsibility inventory and independent reviewer
  scrutiny. Files from 301 through 350 lines are expected to split; acceptance
  requires a source-backed reason why splitting would reduce ownership clarity.
  New or materially rewritten implementation modules above 350 lines are rejected.
- Four hundred physical lines is the absolute ceiling for every hand-maintained
  JS/TS source or spec module touched by this lane. The ceiling does not make a
  mixed-responsibility file acceptable.
- Split a module below those thresholds when it owns three or more independently
  nameable concerns.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
  Use feature-local capsules with explicit owner names.
- Record physical line counts for every new or materially rewritten file. The
  reviewer must independently verify warning-band files and reject unjustified
  growth.

## Your Mission

Implement session routing, budgets, proposals, holds, and amendments:

1. Create `src/foundation/session-routing.ts` with `SessionRouter`: M0 query
   registry, D1/D2/D3 classification rules, conservative D2 default for unknown
   natural language, D3 hard-guard enforcement, escalate-only for `--class`,
   route-to-endpoint selection with non-downgrade enforcement.
2. Create `src/foundation/session-budgets.ts` with `SessionBudgetManager`: all
   budget dimensions (per-turn, per-session, lane-wide, reserves), soft/hard
   limit enforcement, finite budget grants that cannot consume protected
   reserves, session vs coordinator budget separation.
3. Create `src/foundation/session-holds.ts` with `SessionHoldManager`: place,
   release (idempotent), list active, and block-check for scoped holds;
   expiry journaling; system-hold creation for safety escalations.
4. Create `src/foundation/session-proposals.ts` with `SessionProposalHandler`
   and `AmendmentRequestHandler`: the complete PROPOSED → OPERATOR_CONFIRMED →
   REVALIDATED → EFFECT_PREPARED → EFFECT_VERIFIED pipeline, CA-09 revalidation
   integration, CA-10 effect execution, amendment-request handoff (durable
   record, not pack edit, no implicit hold/suspension).
5. Write focused Jasmine specs covering: every M0 query form classification,
   D2 default for ambiguous NL, D3 guard override, escalate-only, route-loss
   preservation, every budget dimension soft/hard limit, grant reserve
   protection, hold place/release/expiry/block-scope, full proposal pipeline
   (success, stale, illegal, expired), amendment-request creation, and
   model-free audit for all modules.
6. Produce implementation report, update tracker/roadmap, leave handoff.

## What You Must Not Do

- Do not invoke a model for M0 classification or budget/hold operations.
- Do not allow budget grants to consume protected reserves.
- Do not bypass revalidation in the proposal pipeline.
- Do not allow holds to implicitly extend or block un-declared effects.
- Do not modify CA-05, CA-09, CA-10, CA-15, or CA-16 internals.
- Do not add npm scripts or NVB tasks.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- every M0 query form is answered deterministically without model invocation
- ambiguous NL defaults to D2
- D3 guards override lower classification
- `--class=D1` on D3-guarded question still produces D3
- route loss preserves session, returns `OPERATOR_SESSION_ROUTE_UNAVAILABLE`
- soft limits warn but permit; hard limits block with BUDGET_EXCEEDED
- grant adds finite allowance; grant cannot consume protected reserves
- hold blocks only its declared scope; un-declared effects proceed
- expired hold is no longer active; expiry is journaled
- full proposal pipeline: confirm → revalidate → apply works
- stale proposal revalidation fails with PROPOSAL_STALE; no effect applied
- illegal proposal revalidation fails with PROPOSAL_ILLEGAL
- amendment request creates durable record, does not edit pack, create hold,
  or suspend session
- `nvb build` passes
- `nvb test` passes
- exact proof commands used
- final `git status --short`
- proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- M0 classification invokes no model
- D3 guards cannot be under-routed
- route loss preserves session and never silently downgrades capability
- budget grants never consume protected reserves
- proposal pipeline always confirms → revalidates → executes through CA-10
- holds block only declared scopes and expire without silent extension
- amendment requests are handoffs, not pack edits or implicit holds
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-17-session-routing-budgets-proposals-holds-and-amendments.md`

The report must include:

- documents studied
- exact files changed
- exact owners introduced or modified
- physical line counts for every new source/spec file
- proof commands and outcomes
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact M0 query registry, the classification decision tree, the
budget dimension list and reserve-protection rules, the proposal state machine
and CA-09/CA-10 integration contract, the hold scope types and blocking rules,
and the amendment-request format. Note that CA-18 will build session CLI/PTY
commands consuming all of these services.
