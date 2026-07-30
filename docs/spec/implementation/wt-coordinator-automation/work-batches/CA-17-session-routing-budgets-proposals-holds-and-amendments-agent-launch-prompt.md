# Agent Launch Prompt — Work Batch CA-17

## Governing Contract And Precedence — Mandatory

This prompt is an execution aid, not product authority. Resolve conflicts in
this order and stop for a specification amendment rather than inventing
behavior:

1. `docs/spec/v1-contracts.md` and `docs/spec/schemas/v1.schema.json`
2. `docs/spec/v1.md`
3. `docs/spec/nirvana-integration-architecture.md`,
   `docs/spec/coordinator-automation.md`, `docs/spec/operator-session.md`, and
   `docs/spec/cli-session.md` within their scopes
4. `docs/spec/architecture.md`
5. `docs/development/engineering-and-review-standard.md`
6. `AGENTS.md`
7. the accepted implementation map, pack rules, and this batch brief

The implementation/review agent must read the mandatory engineering standard
and Nirvana integration architecture in full. A stale path, module suggestion,
or technical mechanism in this prompt must be corrected to the governing
contract while preserving the batch objective and proof obligations.

## Nirvana-First And NVB Execution Gate — Mandatory

- Complete and report the required Nirvana API usage audit before introducing
  infrastructure or bare Node behavior.
- Commands use Nirvana command, argument, pretty, and terminal-view APIs and
  remain thin.
- Public reason codes, exit mappings, event names, and schema identifiers remain
  owned by accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`. A
  batch-local symbolic name is not automatically public; reconcile it with the
  registry, and update the owning contract/schema in the same batch when a new
  public identifier is genuinely required.
- Use the Nirvana storage facade for ordinary managed-root operations only
  after CLI-safe root/bootstrap semantics are proved. Atomic durability,
  canonical path security, locking, append-only journals, ownership/modes, and
  SQLite stay behind focused adapters when the facade lacks required semantics.
- Use the Nirvana logger only through the Watchtower logging boundary for
  redacted diagnostics. Logs are never command output, lifecycle events,
  acceptance evidence, or authoritative journals.
- Substantial deterministic workflows use the immutable packaged Watchtower
  NVB catalog, focused TaskHandlers, and task groups.
- `LaneTaskRunner` is the only internal NVB invocation boundary. Task selection
  is an allowlisted Watchtower action mapping, never an arbitrary user/agent
  task name or parent-project discovery.
- Never create or modify a participating repository's root `nvb.json`.
- Shell is restricted to checksum-manifested leaf adapters for tmux, Git, or
  external tools when no conforming Nirvana API exists. Workflow-level shell is
  a hard reject.
- Mutating tasks do not gain authority from NVB. They require the normal
  Watchtower effect executor, current-state validation, locks, idempotency, and
  a valid single-use invocation envelope.

## Project-Wide Structural And Size Gate — Mandatory

Apply the exact limits in
`docs/development/engineering-and-review-standard.md`; pack-local numbers may
be stricter but may never relax them:

- CLI entry, command, or NVB task: preferred at most 120 lines, warning at
  121–160, hard reject over 180.
- Orchestrator, controller, or renderer shell: preferred at most 140 lines,
  warning at 141–180, hard reject over 200.
- Foundation service, planner, validator, adapter, or store: preferred at most
  200 lines, warning at 201–260, hard reject over 300.
- Contract/type/schema registry: preferred at most 240 lines, warning at
  241–320, hard reject over 400.
- Test/spec module: preferred at most 300 lines, warning at 301–420, hard reject
  over 500.
- Function: target at most 40 lines, justification at 41–60, reject over 80.
- Constructor: target at most 25 lines, warning at 26–40, reject over 50.

Passing a line limit never excuses mixed responsibilities, a god object,
generic helper bag, hidden cycle, foreign API laundering, or layer violation.
Use `PascalCase` for classes/class-owning files, `lowerCamelCase` for non-class
modules and directories, and never introduce dashed or underscored backend
source/spec names.

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
    - `src/foundation/SessionRouting.ts` (create)
    - `src/foundation/SessionBudgets.ts` (create)
    - `src/foundation/SessionHolds.ts` (create)
    - `src/foundation/SessionProposals.ts` (create)

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

Line count is a design alarm, never permission to accumulate unrelated work.
Count physical lines, including comments and blanks, in new and materially
rewritten hand-maintained files. Generated artifacts are excluded only when
their generator ownership is explicit and they contain no hand-maintained
behavior.

Use the exact project-wide matrix:

| Category | Preferred maximum | Warning band | Hard reject |
| --- | ---: | ---: | ---: |
| CLI command, NVB TaskHandler/front door, registry, renderer, public barrel | 120 | 121–160 | over 180 |
| Orchestrator, controller, coordinator, presenter | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contract/type-only module | 240 | 241–320 | over 400 |
| Test/spec module | 300 | 301–420 | over 500 |

Functions target 40 lines, warn at 41–60, and reject above 80. Constructors
target 25 lines, warn at 26–40, and reject above 50. Warning-band owners require
a responsibility inventory and explicit reviewer judgment.

Every module has one primary responsibility and one cohesive reason to change.
Commands and TaskHandlers validate, normalize, delegate, and map results.
Orchestrators sequence collaborators without absorbing their algorithms.
Storage, validation, rendering, subprocess/leaf I/O, and state-machine policy do
not accumulate in one owner. Three independently nameable responsibilities
require a split even below a preferred maximum.

Class-owning TypeScript modules use PascalCase filenames; function/value modules
use lowerCamelCase. New source filenames do not use dashes or underscores.
Generic `helpers`, `utils`, `common`, and `misc` overflow bags are rejected.

Any size exception must be approved before implementation and name the exact
file, proposed maximum, cohesion reason, reviewer, and expiry/follow-up batch.
Existing oversized files are not precedent: when touched they become smaller,
split, or remain line-count neutral under an approved extraction plan.

The implementation report records categorized line counts for every new or
materially rewritten file plus warning-band functions/constructors. The
reviewer reproduces those counts and independently judges cohesion. Passing a
line-count check never overrides the responsibility gate.

## Your Mission

Implement session routing, budgets, proposals, holds, and amendments:

1. Create `src/foundation/SessionRouting.ts` with `SessionRouter`: M0 query
   registry, D1/D2/D3 classification rules, conservative D2 default for unknown
   natural language, D3 hard-guard enforcement, escalate-only for `--class`,
   route-to-endpoint selection with non-downgrade enforcement.
2. Create `src/foundation/SessionBudgets.ts` with `SessionBudgetManager`: all
   budget dimensions (per-turn, per-session, lane-wide, reserves), soft/hard
   limit enforcement, finite budget grants that cannot consume protected
   reserves, session vs coordinator budget separation.
3. Create `src/foundation/SessionHolds.ts` with `SessionHoldManager`: place,
   release (idempotent), list active, and block-check for scoped holds;
   expiry journaling; system-hold creation for safety escalations.
4. Create `src/foundation/SessionProposals.ts` with `SessionProposalHandler`
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
- Do not add npm scripts or unrelated/public/project-root NVB tasks. Reuse the
  accepted effect task boundary; do not create a second execution surface.
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
