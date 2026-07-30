# Batch CA-08 — Context Broker and Cycle Budgets

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Routing and decision foundation
Depends on: CA-02, CA-06, CA-07 accepted
Owned files: `src/foundation/context-broker.ts`, `src/foundation/cycle-budget.ts`

**Required implementor reasoning class:** `R5`
**Class rationale:** context broker with allowlisted queries, provenance tracking, redaction, and soft/hard limits. Cycle budgets spanning input/output/broker/wall-clock dimensions. Usage quality tracking. The class is a floor; escalate when source inspection exposes additional risk.

## Objective

Implement the context broker — the only path through which coordinator decision
agents may access additional context beyond the initial envelope. All queries are
allowlisted, metered, provenance-tracked, and bounded. Implement per-class cycle
budgets with soft/hard limits and usage-quality tracking.

## Required Work

1. **Read normative budget defaults.** Study `v1-contracts.md §7` for the
   shipping policy baseline — per-class input/output/broker/wall-clock limits.
   Study `coordinator-automation.md §10` for the context-broker contract and
   §12 for cycle budgets.

2. **Implement `src/foundation/cycle-budget.ts`:**
   - `CycleBudget` type — the budget allocated to one coordinator cycle:
     ```typescript
     {
       decisionClass: DecisionClass;
       inputTokens: {soft: number, hard: number};
       outputTokens: {hard: number};
       brokerRequests: {hard: number};
       wallClockSeconds: {hard: number};
     }
     ```
   - `createBudget(decisionClass: DecisionClass): CycleBudget` — creates a
     budget with the shipping default values for each decision class
     (see `v1-contracts.md §7`).
   - `BudgetTracker` class — tracks usage against a `CycleBudget`:
     - `trackInputTokens(count: number): BudgetStatus` — increment input token usage.
     - `trackOutputTokens(count: number): BudgetStatus` — increment output token usage.
     - `trackBrokerRequest(): BudgetStatus` — increment broker request count.
     - `trackWallClock(startTime: number): BudgetStatus` — check elapsed wall clock.
     - `getBudgetStatus(): BudgetStatus` — returns current usage versus soft/hard limits.
   - `BudgetStatus` type: `{withinSoftLimits: boolean, withinHardLimits: boolean,
     exceeded: BudgetExceeded[]}`.
   - `BudgetExceeded` type: `{dimension: 'input' | 'output' | 'broker' | 'wallClock',
     kind: 'soft' | 'hard', current, limit}`.
   - Soft-limit exceedance produces a warning but does not stop the cycle.
   - Hard-limit exceedance stops the cycle immediately — the proposal is rejected
     with budget-exhaustion as the cause.

3. **Implement `src/foundation/context-broker.ts`:**
   - `ContextBroker` class — the sole context-access path for decision agents.
   - `requestContext(request: BrokerRequest, budget: BudgetTracker): BrokerResponse` —
     processes a context request if it is allowlisted, within budget, and
     provenance-tracked.
   - `BrokerRequest` type: `{queryType: BrokerQueryType, params: BrokerParams,
     provenance: RequestProvenance}`.
   - `BrokerQueryType` enum with the complete allowlist:
     - `BATCH_DEPENDENCY_GRAPH` — dependency resolution for a batch.
     - `BATCH_READY_STATUS` — ready-set and blocking reasons.
     - `REQUIREMENT_TRACEABILITY` — requirement-to-batch mapping.
     - `EVENT_RECENT` — recent events (bounded by limit).
     - `EVENT_BY_ID` — single event lookup.
     - `CYCLE_PROPOSAL_HISTORY` — prior proposals for this cycle.
     - `LANE_SUMMARY` — bounded lane event summary.
     - `ENDPOINT_AVAILABILITY` — current endpoint route status.
     - `CLAIM_STATUS` — active resource claims.
     - `BUDGET_USAGE` — current cycle budget usage.
   - Every query type has a fixed parameter schema — arbitrary queries are not
     allowed. Unknown query types are rejected.
   - `BrokerResponse` type: `{allowed: boolean, data?: any, reason?: string,
     provenanceDigest?: string}`.
   - Each response includes a `provenanceDigest` linking the response to the
     specific index/query revision and parameter set.
   - `trackUsage(cycleId: string): UsageRecord` — returns the accumulated usage
     for a cycle.
   - `UsageRecord` type with input/output/broker/wall-clock dimensions plus
     `provenanceChain` — the complete provenance of every broker response.
   - The broker never loads full pack content, full journal content, or raw
     lane state. Every response is derived from bounded index queries.

4. **Redaction rules:**
   - Broker responses never include raw file content, config secrets, or full
     prompt text.
   - Credential-bearing fields (matching `TOKEN`, `SECRET`, `PASSWORD`, `KEY`,
     `CREDENTIAL`) are redacted from any context that passes through the broker.
   - The redaction is deterministic — the same field name always produces the
     same `<REDACTED>` placeholder.

5. **Error taxonomy:**
   - `BROKER_UNKNOWN_QUERY` — query type not in the allowlist.
   - `BROKER_BUDGET_EXCEEDED` — hard budget limit reached.
   - `BROKER_INDEX_UNAVAILABLE` — required index unavailable.
   - `BROKER_INVALID_PARAMS` — query parameters fail validation.
   - `BROKER_PROVENANCE_REQUIRED` — request missing required provenance.
   - `BROKER_RATE_LIMITED` — too many requests in one cycle.

## Expected Ownership

- `src/foundation/cycle-budget.ts` — owns budget creation, tracking, and
  soft/hard limit enforcement. No context-access logic.
- `src/foundation/context-broker.ts` — owns the allowlisted query handler,
  provenance tracking, redaction, and bounded response delivery.
- No other module duplicates budget tracking, broker queries, or provenance chains.

## Tests And Evidence

- **Budget defaults:** Verify shipping defaults are correct for each decision class
  (D1, D2, D3).
- **Soft limit warning:** Exceed a soft input-token limit. Verify warning is returned
  but cycle continues.
- **Hard limit stop:** Exceed a hard output-token limit. Verify cycle is stopped
  with budget-exhaustion error.
- **Wall-clock enforcement:** Start a budget, delay past the wall-clock limit.
  Verify detection.
- **Broker request count:** Exhaust broker requests. Verify `BROKER_BUDGET_EXCEEDED`.
- **Every query type:** For each `BrokerQueryType`, verify the request is allowed
  and returns correctly bounded data.
- **Unknown query:** Attempt an unregistered query type. Prove `BROKER_UNKNOWN_QUERY`.
- **Invalid params:** Pass invalid parameters to a known query. Prove
  `BROKER_INVALID_PARAMS`.
- **Redaction:** Create context containing a key named `PASSWORD`. Prove the value
  is `<REDACTED>`.
- **Provenance chain:** Make multiple broker requests. Verify the provenance chain
  correctly links each response to its query revision.
- **Boundedness:** Prove that no broker query loads full pack or journal content.
- **Index unavailable:** When the pack index is stale, prove broker fails with
  `BROKER_INDEX_UNAVAILABLE`.

## What Must Not Change

- Do not modify the CA-02 index-query contract.
- Do not add arbitrary (non-allowlisted) query types.
- Do not return raw config, secrets, or full prompt text from any broker response.
- Do not invoke models.

## Review Procedure Highlights

1. Independently verify budget defaults match the shipping policy.
2. Verify soft-limit warning and hard-limit stop behavior.
3. Exercise every allowlisted query type and prove correct bounded responses.
4. Verify redaction of credential-bearing keys.
5. Verify provenance chain integrity.
6. Verify no full-pack or full-journal loads through any broker path.

---

# CA-08 Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** `R5` — highest available reasoning required.
**Suitability:** context broker with allowlisted-queries architecture, multi-dimensional budget tracking (input/output/broker/wall-clock), provenance-chain integrity, redaction semantics, and soft/hard limit behavior. The agent must reason about secure context gating and quota enforcement.
**Primary agents:** GPT-5.4, Claude Opus 4.1.
**Good alternatives:** Claude Sonnet 4.6, GPT-5.2.
**Acceptable-only-with-steering:** Composer 2.5, Cursor Auto — may handle query routing and budget tracking but must be steered away from adding arbitrary query types or skipping provenance tracking.
**Unsuitable options:** Claude Haiku — insufficient for allowlist-architecture design and multi-dimensional quota enforcement reasoning.

### Complete forwarding profile — mandatory

Reasoning level `R5`. Primary: GPT-5.4, Claude Opus 4.1. Good alternatives: Claude Sonnet 4.6, GPT-5.2. Steering-only: Composer 2.5, Cursor Auto. Unsuitable: Claude Haiku.

## Capability-Based Agent Selection Rule

- R3: reliable bounded repository reasoning.
- R4: deep code reasoning, compatibility, negative-path design, ownership boundaries.
- R5: strongest reasoning — state machines, concurrency, graph/planner logic, index integrity.

CA-08 is R5 because the context broker is the sole gate between decision agents and any additional lane context beyond the initial envelope. An unbounded query, missing redaction, or incorrect budget enforcement leaks information or allows unbounded context consumption through model cycles.

## Read In This Order

1. `AGENTS.md` prerequisite
2. Pack README, roadmap, tracker, quality rules
3. `docs/spec/v1-contracts.md` §7 — shipping policy baseline (complete budget tables)
4. `docs/spec/v1-contracts.md` §3.2 — paths and file set (redaction context)
5. `docs/spec/coordinator-automation.md` §10 — context broker specification
6. `docs/spec/coordinator-automation.md` §12 — cycle budgets and usage
7. Accepted CA-02 index-query contract
8. Accepted CA-03 journal-projection contract
9. Accepted CA-05 routing-policy and `DecisionClass` types
10. Accepted CA-06 adapter eligibility (for endpoint availability query)
11. Accepted CA-07 `DecisionEnvelope` type (for context augmentation)

## Reasoning / Agent Class

- Reasoning level: `R5`.
- Primary: GPT-5.4, Claude Opus 4.1.
- Good alternatives: Claude Sonnet 4.6, GPT-5.2.
- Steering-only: Composer 2.5, Cursor Auto.
- Unsuitable: Claude Haiku.

## Mandatory Reasoning Protocol

1. Map every allowlisted query type to its bounded data source and response contract.
2. Design the multi-dimensional budget tracking state machine.
3. Enumerate every budget-exhaustion scenario across input/output/broker/wall-clock.
4. Design redaction rules and structural proof that credential keys are never leaked.
5. Design provenance-chain integrity — how a response links back to its exact source.
6. Inspect CA-02, CA-03, CA-05, CA-06, CA-07 output for type compatibility.

## Structural Design And Module-Size Gate

- `src/foundation/cycle-budget.ts` target ≤150 lines — budget creation, tracking, status.
- `src/foundation/context-broker.ts` target ≤300 lines. 10 query handlers + tracking + redaction. Responsibility inventory at 221–300. Warning band at 301–350.
- Test modules ≤300 lines; split by budget, query-types, redaction, and provenance families.

## Your Mission

1. Read all reference documents and inspect predecessor outputs.
2. Implement `src/foundation/cycle-budget.ts` with budget creation and `BudgetTracker`.
3. Implement `src/foundation/context-broker.ts` with the `ContextBroker` class, all 10 allowlisted query handlers, provenance tracking, and redaction.
4. Create focused specs for: budget defaults, soft/hard limits, every query type, unknown queries, invalid params, redaction, provenance chains, boundedness, and index unavailability.
5. Produce implementation report, update tracker, leave handoff.

## What You Must Not Do

1. Do not add arbitrary query types beyond the allowlist.
2. Do not return raw config, secrets, or full prompt text.
3. Do not load full pack or journal content.
4. Do not bypass budget enforcement for any query.
5. Do not invoke models.
6. Do not commit.

## Required Proof

- [ ] `nvb build` and `nvb test` pass.
- [ ] Budget defaults match shipping policy.
- [ ] Soft-limit warning, hard-limit stop proven.
- [ ] Every allowlisted query type returns correct bounded response.
- [ ] Redaction of credential keys proven.
- [ ] Provenance chain integrity proven.
- [ ] Boundedness — no full-pack or full-journal loads.
- [ ] Implementation report written.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

- `implementation-tracker.md`, `implementation-roadmap.md`

## Local Artifact Git Rule

`.local/` never staged, never committed.

## Non-Negotiable Rules

- Only allowlisted query types may be served.
- Every query is metered against the cycle budget.
- Hard-limit exceedance stops the cycle.
- Provenance tracked for every response.
- Credential-bearing keys redacted.
- Model-free — no model invocation in the broker.

## Required Disk Report

`.local/agent-reports/coordinator-automation/CA-08-context-broker-and-cycle-budgets.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent
