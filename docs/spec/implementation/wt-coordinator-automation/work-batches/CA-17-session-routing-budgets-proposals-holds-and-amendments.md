# Batch CA-17 — Session Routing, Budgets, Proposals, Holds, and Amendments

> Mandatory v1 scope: [`../specification-resolution-batch-amendment.md`](../specification-resolution-batch-amendment.md), CA-17 ownership and fixture obligations.

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
Pack: wt-coordinator-automation (Pack 5)
Phase: Session services and effect integration
Depends on: CA-06, CA-08, CA-09, CA-10, CA-15, CA-16 accepted
Owned files: `src/foundation/SessionRouting.ts`, `src/foundation/SessionBudgets.ts`, `src/foundation/SessionHolds.ts`

**Required implementor reasoning class:** `R5`
**Class rationale:** M0/D1–D3 turn classification with conservative routing, finite budget grants and reserves within lane-wide limits, proposal confirmation flow with current-state revalidation and CA-10 execution, scoped time-bound holds with explicit blocking semantics, and amendment-request handoffs. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Implement session routing (classify each turn as M0, D1, D2, or D3), budget
grants and reserves per session within lane-wide limits, proposal confirmation
flow (operator confirms, system revalidates against current state, CA-10
executes), scoped holds (explicit time-bound blocks on specific effects), and
amendment-request handoffs (confirmed pack/spec change requests).

## Required Work

1. **Read the normative session-routing, budget, proposal, hold, and amendment
   contracts.** Study `operator-session.md` §10 for reference resolution and
   request classification. Study `operator-session.md` §13 for budget model.
   Study `operator-session.md` §15 for session proposals and confirmation.
   Study `operator-session.md` §15.3 for amendment-request handoff. Study
   `operator-session.md` §16 for scoped holds. Study `v1-contracts.md` §5 for
   the proposal and effect registry. Study accepted CA-05 for routing policy,
   CA-06 for endpoint adapter eligibility, CA-08 for context broker and budgets,
   CA-09 for typed proposals and validator, and CA-10 for effect executor.

2. **Implement `src/foundation/SessionRouting.ts`:**
   - `SessionRouter` class — classifies each operator turn and routes it to the
     appropriate endpoint.
   - `classifyTurn(turn: PendingTurn, session: OperatorSession): TurnClassification` —
     classifies the turn into M0, D1, D2, or D3.
   - **M0 classification:** The turn resolves exclusively to an exact
     policy-defined query form whose complete answer is mechanically available
     (current batch/lane status, ready candidates and blockers, recorded usage,
     tmux/session presence, latest reviewer events, active holds, queue status,
     session budget/turn metadata). M0 turns invoke no model and return
     deterministic projection data. The operator message is scanned only for
     exact M0 query patterns; no natural-language analysis is performed.
   - **D1 classification:** Bounded non-semantic clarification with one known
     subject. The turn references exactly one batch/event/requirement and asks
     a question answerable from deterministic projections + bounded broker
     context.
   - **D2 classification (default for unknown natural language):** Tactical
     explanation, comparison, reject/correction reasoning, or uncertain
     natural-language request. The conservative default when M0 is not provable
     and D1 guards do not apply.
   - **D3 classification:** Cross-batch/repository strategy, structural
     redesign, integrity conflict, repeated failure pattern, scope/pack drift,
     or safety escalation. Also applied when hard guards raise the minimum:
     state contradiction, unauthorized effect evidence, or policy-required
     D3 handling.
   - `routeTurn(classification: TurnClassification, allocation:
     EndpointAllocation): RouteResult` — selects the primary or fallback
     endpoint matching the required minimum capability. Fails with
     `OPERATOR_SESSION_ROUTE_UNAVAILABLE` if no eligible endpoint exists.
     Never silently downgrades capability.
   - `TurnClassification` type: `{class: 'M0' | 'D1' | 'D2' | 'D3',
     reasoningRuleId, escalationRequired?, minimumCapability}`.
   - `RouteResult` type: `{ok, endpointId, hostId, adapterId, capabilityClass,
     reason?}`.
   - **Hard guards:**
     - `--class` flag may escalate but cannot under-route.
     - D3 guards override any lower classification.
     - Natural language not proven M0 defaults to D2.
     - Route loss (no eligible endpoint) preserves the session and pauses the
       turn; it never silently downgrades.

3. **Implement `src/foundation/SessionBudgets.ts`:**
   - `SessionBudgetManager` class — manages per-session and lane-wide budget
     accounting.
   - **Budget dimensions (per `operator-session.md §13`):**
     - Per-turn: input tokens, output tokens, broker-context bytes.
     - Per-session: cumulative tokens, money/quota, turns, context requests,
       latency, stored full-text bytes.
     - Lane-wide: operator-session usage, escalation reserves, recovery reserves.
     - Configuration: max open sessions, max concurrent active turns, idle/
       suspension/retention intervals, compaction and escalation reserves.
   - `checkBudget(turn: PendingTurn, session: OperatorSession): BudgetCheck` —
     checks all budget dimensions before authorizing a turn:
     - Soft limits: warn and show remaining reserve.
     - Hard limits: reject the turn.
     - Returns `{ok, warnings?, errors?, dimensions: BudgetDimension[]}`.
   - `grantBudget(sessionId: string, grant: BudgetGrant): GrantResult` —
     applies a finite budget grant to a session. The grant is an audited,
     finite allowance for one turn, N explicit turns, a bounded usage dimension,
     or an expiry window. Grants never permanently rewrite the session profile,
     increase the lane-wide hard limit, replenish allocation capacity, or consume
     protected reserves.
   - `BudgetGrant` type: `{grantId, operatorSessionId, dimension, amount,
     reason, expiresAt?, requestedByOperator, sourceTurnId?}`.
   - `BudgetCheck` type: `{ok, hardBlocked: boolean, warnings: string[],
     dimensions: {name: string, current: number, limit: number, quality:
     'reported' | 'estimated' | 'unknown'}[]}`.
   - `GrantResult` type: `{ok, grantId, grantedAmount, newLimit, consumed?}`.
   - **Reserves:** Protected escalation and recovery reserves cannot be consumed
     by session budgets. Budget grants cannot draw from protected reserves.
   - **Lane-wide accounting:** Session budgets are tracked separately from
     automated coordinator-cycle budgets. Session consumption cannot deplete
     automated reject/recovery capacity.

4. **Implement `src/foundation/SessionHolds.ts`:**
   - `SessionHoldManager` class — manages explicit scoped holds.
   - **Hold lifecycle:**
     - `placeHold(params: PlaceHoldParams): Hold` — creates a scoped, expiring
       hold. Validates scope, duration, and blocking rules. Produces a
       `hold-placed` journal event.
     - `releaseHold(holdId: string, reason: string): ReleaseResult` — releases
       a hold. Idempotent — releasing an already-released hold is a no-op.
       Produces a `hold-released` journal event.
     - `listActiveHolds(laneId: string, scope?: HoldScope): Hold[]` — lists
       active (non-expired, non-released) holds, optionally filtered by scope.
     - `checkBlocked(effect: EffectType, scope: HoldScope, laneId: string):
       BlockedCheck` — checks whether a proposed effect is blocked by any
       active hold. Returns `{blocked: boolean, blockingHolds: Hold[]}`.
   - **Hold schema (per `operator-session.md §16`):**
     - `Hold` type: `{holdId, laneId, scope: {kind: 'batch'|'repository'|
       'effect-type'|'lane', id?}, blocks: string[] ('new-dispatch',
       'new-correction', ...), reason, operatorSessionId, createdAt,
       expiresAt, releasedAt?, releasedReason?}`.
   - **Scope rules:**
     - A `lane`-scope hold blocks all declared future effects.
     - A `batch`-scope hold blocks only effects targeting that batch.
     - Holds block only declared future effects; active workers are not
       terminated.
     - Expiry is journaled and reported; holds are not silently extended.
     - Read-only commands never renew holds.
     - Session creation never implicitly creates a hold.
     - Safety policy may create a system hold without a model, but must
       notify the operator via journal event.

5. **Proposal confirmation flow:**
   - `SessionProposalHandler` class — manages the proposal lifecycle within
     an operator session.
   - `propose(sessionId: string, proposal: AdvisoryProposal, turnId: string):
     ProposedEffect` — records a proposed effect from an advisory response.
     State: `PROPOSED`. Produces `operator-session-proposal-proposed` event
     (not a durable coordinator event — the proposal is not yet confirmed).
   - `confirm(proposalId: string, operatorSessionId: string): ConfirmResult` —
     operator confirmation step. Records `OPERATOR_CONFIRMED` state.
     Produces `operator-session-proposal-confirmed` journal event.
   - `revalidate(proposalId: string): RevalidationResult` — revalidates the
     confirmed proposal against current lane state, pack seal, routing policy,
     and claims. Uses CA-09's typed proposal validator. If state has changed
     since the proposal's snapshot, returns `OPERATOR_SESSION_PROPOSAL_STALE`.
     If the proposal exceeds operator/policy authority, returns
     `OPERATOR_SESSION_PROPOSAL_ILLEGAL`.
   - `apply(proposalId: string): ApplyResult` — invokes CA-10's effect executor
     with the revalidated proposal. Records the effect outcome. Produces the
     standard effect journal events through CA-10.
   - **Full flow:** PROPOSED → OPERATOR_CONFIRMED → REVALIDATED →
     EFFECT_PREPARED → EFFECT_VERIFIED (or REJECTED_STALE_OR_ILLEGAL, or
     OPERATOR_REJECTED, or EXPIRED).

6. **Amendment-request handoff:**
   - `AmendmentRequestHandler` class — manages amendment-request handoffs.
   - `createRequest(sessionId: string, turnId: string, proposalId: string,
     params: AmendmentRequestParams): AmendmentRequest` — creates a durable
     amendment request record per `operator-session.md §15.3`.
   - `AmendmentRequest` type: `{proposalId, operatorSessionId, sourceTurnId,
     rationale, affectedBatchIds, affectedFindingIds, evidenceRefs,
     snapshotRevision, requestedAt}`.
   - The request is evidence for a future authoritative pack/spec workflow;
     it is NOT a pack edit, accepted scope change, new batch, or approval.
   - Creating the request does not implicitly suspend/close the session,
     place a hold, or invoke an undefined pack command.
   - The effect executor (CA-10) records the `amendment-requested` durable
     event through the standard effect pipeline.

## Expected Ownership

- `src/foundation/SessionRouting.ts` — owns M0/D1–D3 classification, turn
  routing to endpoints, classification rules, and hard guards.
- `src/foundation/SessionBudgets.ts` — owns per-session and lane-wide budget
  accounting, grant management, soft/hard limit enforcement, and reserve
  protection.
- `src/foundation/SessionHolds.ts` — owns hold lifecycle (place, release, list,
  block check), scope enforcement, expiry, and system-hold notification.
- SessionProposalHandler and AmendmentRequestHandler are co-located with the
  holds module or in a separate `src/foundation/SessionProposals.ts` as
  implementation dictates.

## Tests And Evidence

- **M0 classification:** Submit exact M0 query forms (status, ready, budget,
  holds, events). Prove each is classified as M0 and returns deterministic
  output without model invocation.
- **D2 default:** Submit an ambiguous natural-language question. Prove it is
  classified as D2 (not M0, not D1).
- **D3 guard override:** Submit a question classified as D2 by the normal
  rules but with D3 guard conditions (e.g., state contradiction context).
  Prove D3 is the resulting classification.
- **Escalate-only:** Use `--class=D3` on a D2 question. Prove D3 is used.
  Use `--class=D1` on a D3-guarded question. Prove D3 still applies (cannot
  under-route).
- **Route unavailable:** Remove all D2 endpoints from the allocation. Attempt
  a D2 turn. Prove `OPERATOR_SESSION_ROUTE_UNAVAILABLE` and the session is
  preserved.
- **Soft limit warning:** Exceed 80% of a per-session turn limit. Prove a
  warning is returned but the turn is still allowed.
- **Hard limit block:** Exceed 100% of a hard limit. Prove the turn is
  rejected and `OPERATOR_SESSION_BUDGET_EXCEEDED` is returned.
- **Budget grant:** Grant 5 additional turns within lane-wide limits. Prove
  the session's turn limit increases by 5 and the grant is journaled.
- **Grant respects reserves:** Attempt to grant turns consuming protected
  escalation reserves. Prove the grant is reduced or rejected.
- **Hold place and release:** Place a batch-scope hold on B14. Prove it blocks
  dispatch for B14 but not for B15. Release the hold. Prove dispatch is
  unblocked.
- **Hold expiry:** Place a hold with a 1-second expiry. Wait. Prove the hold
  is no longer active and the expiry is journaled.
- **Proposal confirm→revalidate→apply:** Propose an effect, confirm it,
  revalidate against current state (passes), apply through CA-10. Prove the
  effect is executed and journaled.
- **Proposal stale:** Propose an effect, change lane state, confirm,
  revalidate. Prove `OPERATOR_SESSION_PROPOSAL_STALE` and the effect is
  not applied.
- **Proposal illegal:** Propose an effect exceeding operator authority (e.g.,
  arbitrary skip). Confirm. Revalidate. Prove
  `OPERATOR_SESSION_PROPOSAL_ILLEGAL`.
- **Amendment request:** Create an amendment request. Prove the durable
  record is written, no pack edit occurs, no hold is created, and the session
  is not suspended.
- **Model-free proof:** No model invocation in session-routing (except
  classification which is deterministic, not model-backed), session-budgets,
  session-holds, or proposal handlers.

## What Must Not Change

- Do not modify CA-05 routing policy, CA-09 proposal validator, or CA-10
  effect executor.
- Do not modify CA-15 session store or lifecycle.
- Do not modify CA-16 session indexes.
- Do not make session advice directly mutative — proposals always require
  confirmation + revalidation + CA-10 execution.

## Review Procedure Highlights

1. Independently classify every M0/D1/D2/D3 test case.
2. Prove D3 guards cannot be overridden by a lower `--class`.
3. Prove route loss preserves the session and does not downgrade.
4. Verify budget grants cannot consume protected reserves.
5. Walk the proposal confirmation→revalidation→apply pipeline for every
   outcome (success, stale, illegal).
6. Prove holds block only declared effects and expire correctly.

---

## Required Reasoning Posture

Session routing, budgets, proposals, and holds form the bridge between advisory
operator discussion and the effect plane. A misclassification that invokes a
model for an M0 query, a budget grant that consumes protected reserves, or a
proposal that bypasses revalidation would corrupt the operator-session safety
model. The implementor must reason about every classification rule, every budget
boundary, and every proposal state transition.

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

1. Implementation report in `.local/agent-reports/coordinator-automation/`.
2. All `nvb build` and `nvb test` output.
3. Classification test matrix (every M0 form, D1/D2/D3 cases, guard overrides).
4. Budget grant and reserve-protection evidence.
5. Full proposal pipeline walkthrough (every outcome).
6. Hold lifecycle and blocking-scope evidence.

## Completion And Handoff

- Implementation report, updated tracker/roadmap.
- CA-18 may qualify the renderer after these services accept; CA-21/CA-22
  consume them in the TUI, and CA-24 owns session command integration.
- Leave the exact M0 query registry, classification rule set, budget dimension
  list, grant rules, hold scope types, proposal state machine, and amendment
  request format for the next agent.
