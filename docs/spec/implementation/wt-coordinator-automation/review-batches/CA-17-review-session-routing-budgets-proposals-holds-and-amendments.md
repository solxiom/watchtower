# Review Batch CA-17 — Session Routing, Budgets, Proposals, Holds, and Amendments

> Mandatory v1 gate: [`../specification-resolution-batch-amendment.md`](../specification-resolution-batch-amendment.md), CA-17 ownership and fixture obligations.

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Status: ❌ Not started
Paired work batch: CA-17
Reviewer owns the acceptance commit.

## Scope Verification

1. **File ownership:** Verify `src/foundation/SessionRouting.ts`,
   `src/foundation/SessionBudgets.ts`, `src/foundation/SessionHolds.ts`,
   and `src/foundation/SessionProposals.ts` are the only new files (or a
   documented alternative split). No other module gained routing, budget,
   hold, or proposal capability.
2. **Dependency direction:** Verify these modules depend on CA-05, CA-06,
   CA-08, CA-09, CA-10, CA-15, and CA-16, not the reverse. No predecessor
   module internals were modified.
3. **Spec compliance:** M0/D1–D3 classification matches
   `operator-session.md §10`. Budget model matches `operator-session.md §13`.
   Proposal pipeline matches `operator-session.md §15`. Holds match
   `operator-session.md §16`. Amendment requests match
   `operator-session.md §15.3`.
4. **Layer integrity:** No model invocation in M0 classification, budget
   management, hold management, or amendment-request creation. The proposal
   pipeline invokes models only through CA-06 adapter routing (for D1–D3
   turns), not directly.
5. **No mutation bypass:** Session advice has no direct effect authority.
   Every proposed effect flows through confirm → revalidate → CA-10 execute.
   No alternative mutation path exists.

## Required Independent Proof

- **M0 classification:** Independently submit every M0 query form (status,
  ready, budget, holds, events, queue, sessions, proposals). Prove each is
  classified as M0 and returns a deterministic response without any model or
  endpoint invocation.
- **D2 default:** Independently submit ambiguous natural-language text with no
  clear M0 match. Prove classification is D2. Prove no model is invoked during
  classification.
- **D3 guard override:** Independently submit a scenario with D3 guard triggers
  (state contradiction, unauthorized effect evidence). Prove classification is
  D3 regardless of any lower `--class` flag.
- **Escalate-only:** Independently: `--class=D3` on D2 question yields D3.
  `--class=D1` on D3-guarded question still yields D3. Route never downgrades.
- **Route loss:** Independently remove all D2 endpoints. Attempt a D2 turn.
  Prove `OPERATOR_SESSION_ROUTE_UNAVAILABLE` is returned and the session
  remains in its current state.
- **Budget soft limit:** Independently reach 80% of a soft limit. Prove a
  warning is present but the turn proceeds.
- **Budget hard block:** Independently exceed 100%. Prove the turn is
  rejected.
- **Budget grant:** Independently grant 5 additional turns within lane limits.
  Prove the session's limit increases. Prove the grant is journaled.
- **Grant reserve protection:** Independently attempt a grant that would
  consume protected escalation reserves. Prove the grant is limited or
  rejected.
- **Hold scope:** Independently place a `batch:B14` hold. Prove dispatch for
  B14 is blocked but B15 is not. Prove non-declared effect types are not
  blocked.
- **Hold expiry:** Independently place a hold with a short expiry. Wait. Prove
  it is no longer active and the expiry event is journaled.
- **Hold release:** Independently release a hold. Prove idempotent release
  (releasing again is no-op).
- **Proposal success:** Independently walk: propose → confirm → revalidate
  (passes) → apply (CA-10 executes). Prove the effect journal has the
  expected outcome event.
- **Proposal stale:** Independently: propose, change lane state, confirm,
  revalidate. Prove `OPERATOR_SESSION_PROPOSAL_STALE`. Prove no effect is
  applied.
- **Proposal illegal:** Independently propose an effect exceeding operator
  authority. Confirm, revalidate. Prove
  `OPERATOR_SESSION_PROPOSAL_ILLEGAL`.
- **Proposal expired:** Independently let a proposal expire. Prove it cannot
  be confirmed.
- **Amendment request:** Independently create an amendment request. Verify:
  durable record exists, no pack edit occurred, no hold was created, the
  session was not suspended/closed.
- **Build and test:** Run `nvb build` and `nvb test` independently. Verify
  zero failures.
- **Model-free audit:** grep all new source files for model/provider
  invocation in M0 classification, budget, hold, or amendment logic. Prove
  none exist.

## Required Reasoning Posture

The reviewer must independently reason through every classification path
(M0 query registry, D1/D2/D3 rules, guard triggers), every budget boundary
(soft/hard limits, reserve protection, grant rules), every proposal state
transition (PROPOSED through EFFECT_VERIFIED and all rejection paths), and
every hold scope/expiry combination.

## Structural And Module-Size Acceptance

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

# Agent Launch Prompt — Work Batch RT-05

## Required Review Packet

1. Independent M0/D1–D3 classification test matrix (every M0 form, every
   guard trigger, every escalate-only scenario).
2. Independent budget dimension checks (soft warnings, hard blocks, grant
   limits, reserve protection).
3. Full proposal pipeline walkthrough (every outcome state).
4. Hold lifecycle and blocking-scope evidence.
5. Amendment-request non-intrusiveness proof.
6. `nvb build` and `nvb test` output.
7. Model-free audit results.

## Acceptance Gate

The batch is accepted only when:
- M0 query forms are answered deterministically without model invocation.
- D2 is the default for unknown natural language.
- D3 guards override any lower classification.
- Route loss preserves session and never silently downgrades.
- Budget soft limits warn, hard limits block.
- Budget grants never consume protected reserves.
- Holds block only declared scopes and expire without silent extension.
- Proposal pipeline: confirm → revalidate → CA-10 execute works correctly.
- Stale and illegal proposals are rejected without effect application.
- Amendment requests create durable records without implicit side effects.
- `nvb build` and `nvb test` pass independently.
- Zero model invocations in classification, budget, hold, or amendment logic.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Reject Conditions

Reject immediately if:
- An M0 query invokes a model.
- A D3-guarded scenario is classified below D3.
- Route loss silently downgrades capability or closes the session.
- A budget grant consumes protected reserves.
- A hold blocks un-declared effects or silently extends.
- A proposal is applied without revalidation.
- An amendment request creates a pack edit, hold, or session suspension.
- Build or tests fail.
- `.local/` artifacts are staged.
- The implementation agent committed.
- Any file exceeds the structural ceiling without documented reviewer
  acceptance.
