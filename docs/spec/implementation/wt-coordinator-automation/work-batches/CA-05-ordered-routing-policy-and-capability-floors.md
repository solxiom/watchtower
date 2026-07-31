# Batch CA-05 — Ordered Routing Policy and Capability Floors

> Mandatory v1 scope: [`../specification-resolution-batch-amendment.md`](../specification-resolution-batch-amendment.md), CA-05 ownership and fixture obligations.

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
Phase: Routing and decision foundation
Depends on: CA-04, RT-02 accepted
Owned files: `src/foundation/RoutingPolicy.ts`, `src/foundation/CapabilityFloors.ts`

**Required implementor reasoning class:** `R4`
**Class rationale:** ordered routing policy with first-match determinism. Classification only — no execution, no model invocation, no state mutation. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Implement the complete v1 routing policy: every rule/guard in the normative
decision-class table, first-match determinism, and D1/C2, D2/C3, D3/C5
minimum capability floors. Classify triggers into M0, D1, D2, or D3 — never
execute effects.

## Required Work

1. **Read the normative routing table.** Study `v1-contracts.md §4` for the
   complete routing rule table (16 rules from `safety-integrity-v1` through
   `no-work-v1`), routing rule order, first-match determinism, and the fixed
   capability scale (C2, C3, C5). Study `coordinator-automation.md §6` for
   decision classes and §7 for routing policy.

2. **Implement `src/foundation/CapabilityFloors.ts`:**
   - `CapabilityFloor` enum: `C2`, `C3`, `C5`.
   - `DecisionClass` enum: `M0`, `D1`, `D2`, `D3`.
   - `minimumCapabilityForClass(decisionClass: DecisionClass): CapabilityFloor` —
     maps D1→C2, D2→C3, D3→C5. M0 returns no floor (no model invoked).
   - `validateEndpointCapability(endpoint: EndpointDescriptor, minimum: CapabilityFloor): boolean` —
     verifies an endpoint meets or exceeds the minimum capability floor.
   - `classifyEndpointTier(endpoint: EndpointDescriptor): CapabilityFloor` —
     derives the capability tier an endpoint can serve.
   - `rankEligibleEndpoints(endpoints, constraints): EndpointDescriptor[]` —
     deterministically orders only endpoints that already satisfy capability,
     project-access, freshness, independence, bounds, and reserve constraints;
     within that set, prefer `free-entitlement`, then lower expected cost, then
     the stable endpoint ID. Never treat price or model name as capability.
   - These are pure functions — no I/O, no state.

3. **Implement `src/foundation/RoutingPolicy.ts`:**
   - `RoutingPolicy` class that evaluates the 16 routing rules in exact order.
   - `classifyTrigger(trigger: TriggerContext): RouteDecision` — evaluates the
     trigger facts against every rule in priority order. Returns the first
     matching rule's decision class and permitted results.
   - `TriggerContext` type: `{triggerType: TriggerType, readySetClassification,
     batchState, authState, driftState, operatorRequest?, priorRejectCount?,
     endpointAvailability}`.
   - `RouteDecision` type: `{decisionClass: DecisionClass, matchedRule: RuleId,
     permittedResults: string[], reason}`.
   - Each rule is implemented as a pure guard function:
     - `safetyIntegrityV1` — contradictory authoritative state, unauthorized
       effect evidence, or journal discontinuity → `D3 + system hold`.
     - `packSemanticDriftV1` — critical pack/source drift → `D3`.
     - `reviewRejectRepeatedV1` — reject for batch with ≥2 prior correction
       openings → `D3`.
     - `reviewRejectV1` — valid reviewer reject → `D2`.
     - `workerBlockedUniqueV1` — valid blocked with exactly one dependency
       owner and one legal route → `M0`.
     - `workerBlockedV1` — other valid blocked → `D2`.
     - `reviewAcceptV1` — complete valid reviewer commit set → `M0`.
     - `readyUniqueV1` — exactly one ready candidate or total-priority → `M0`.
     - `readyAmbiguousCriticalV1` — multiple candidates, any cross-repository
       or R4/R5 → `D2`.
     - `readyAmbiguousV1` — multiple equally valid candidates → `D1`.
     - `projectionQueryV1` — exact registered structured query → `M0`.
     - `operatorComplexV1` — cross-repository, redesign, integrity, drift,
       repeated failure, safety → `D3`.
     - `operatorBoundedV1` — exact single-subject non-semantic form → `D1`.
     - `operatorDefaultV1` — other natural language → `D2`.
     - `noWorkV1` — no unhandled trigger → `M0`.
   - The router classifies only. It does not invoke models, execute effects,
     mutate state, or select batches. It is entirely deterministic and
     synchronous.
   - First-match determinism: rules are evaluated in the documented order.
     The first rule whose guard passes determines the classification. No
     rule reordering or skip.

4. **Policy provenance:**
   - The routing policy itself must carry a `policyVersion` and `policyDigest`
     (SHA-256 of the canonical rule definitions) accessible from the installed
     knowledge pack. For v1 default implementation, the policy is hardcoded
     (matching the normative spec exactly) with a declared version `1.0.0`.
   - `getPolicyVersion(): string` — returns the active policy version.
   - `getPolicyDigest(): string` — returns the canonical policy digest.
   - The ability to load a versioned policy from the knowledge pack is deferred
     to a future batch (post-v1); v1 uses the hardcoded spec-aligned default.

5. **Error taxonomy:**
   - `ROUTING_NO_TRIGGER` — no trigger provided (empty trigger context).
   - `ROUTING_UNKNOWN_TRIGGER_TYPE` — unrecognized trigger type.
   - `ROUTING_INVALID_CLASS` — computed decision class does not match any known value.
   - `ROUTING_POLICY_STALE` — active policy version does not match the knowledge pack
     (deferred; v1 uses hardcoded policy with fixed version).

## Expected Ownership

- `src/foundation/CapabilityFloors.ts` — owns the capability scale (C2, C3, C5),
  decision-class to floor mapping, and endpoint-capability validation.
- `src/foundation/RoutingPolicy.ts` — owns the ordered rule evaluation,
  `classifyTrigger`, and the complete guard-function implementations. Pure classification.
- No other module duplicates routing rules, capability floors, or trigger classification.

## Tests And Evidence

- **Every routing rule:** For each of the 16 rules, construct a trigger context
  where that rule's guard is the first to pass. Prove the correct decision class
  and permitted results.
- **First-match determinism:** Construct a trigger that matches multiple rules.
  Prove the first (highest-priority) match wins — later rules are never evaluated
  for that guard.
- **Safety integrity wins:** Construct a trigger that matches both
  `safety-integrity-v1` and `ready-unique-v1`. Prove D3 + system hold wins.
- **M0 preauthorized:** Prove `reviewAcceptV1` and `readyUniqueV1` each return M0
  with the correct permitted result.
- **Capability floors:** Prove D1→C2, D2→C3, D3→C5. Prove M0 has no floor.
  Prove `validateEndpointCapability` correctly compares tiers.
- **Economics after eligibility:** Prove a free but under-capability, stale,
  inaccessible, reserve-violating, or non-independent endpoint never displaces
  an eligible route; prove a free-capable endpoint wins deterministically when
  all hard constraints are equal.
- **Classification-only proof:** Verify the router writes no files, invokes no
  subprocess, and invokes no model. Static or runtime proof.
- **No-arbitrary-winner integration:** When `classifyTrigger` receives an
  `ambiguous` ready-set classification, it must route to D1 or D2 (not M0).
- **Escalation guard:** Prove that `safety-integrity-v1`, `pack-semantic-drift-v1`,
  and `review-reject-repeated-v1` all produce D3 with escalation permitted.
- **Operator routing:** Prove `operator-bounded-v1` → D1, `operator-default-v1` → D2,
  `operator-complex-v1` → D3.

## What Must Not Change

- Do not implement effect execution or batch selection in the router.
- Do not reorder the 16 routing rules.
- Do not downgrade a required minimum capability class.
- Do not invoke any model, LLM, or AI.
- Do not write lane state.
- Do not modify the ready-set module (CA-04).

## Review Procedure Highlights

1. Independently construct trigger contexts for every routing rule and verify
   correct classification.
2. Verify first-match determinism with overlapping trigger conditions.
3. Verify capability floors are correct and enforced.
4. Verify the router is classification-only — no side effects.
5. Verify policy version and digest are stable.

---

# CA-05 Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** `R4` — deep code reasoning required.
**Suitability:** 16-rule ordered routing policy with first-match determinism, capability-floor enforcement, and a strict classification-only boundary. The agent must reason about rule priority, overlapping guard conditions, and the classification-versus-execution contract boundary.
**Primary agents:** GPT-5.4, Claude Opus 4.1, Claude Sonnet 4.6.
**Good alternatives:** GPT-5.2.
**Acceptable-only-with-steering:** Composer 2.5, Cursor Auto — must be steered away from encoding judgment in rules or conflating classify with execute.
**Unsuitable options:** Claude Haiku — insufficient for 15-rule priority reasoning and overlapping guard-condition analysis.

### Complete forwarding profile — mandatory

Reasoning level `R4`. Primary: GPT-5.4, Claude Opus 4.1, Claude Sonnet 4.6. Good alternatives: GPT-5.2. Steering-only: Composer 2.5, Cursor Auto. Unsuitable: Claude Haiku.

## Capability-Based Agent Selection Rule

- R3: reliable bounded repository reasoning; fast low-reasoning model unsuitable.
- R4: deep code reasoning, compatibility, negative-path design, ownership boundaries.
- R5: strongest reasoning — state machines, concurrency, graph/planner logic.

CA-05 is R4 because the 15-rule ordered policy with first-match determinism requires careful guard-condition design, correct priority enforcement, and the clean classification-only separation that every downstream batch depends on.

## Read In This Order

1. `AGENTS.md` prerequisite
2. Pack README, roadmap, tracker, quality rules
3. `docs/spec/v1-contracts.md` §4 — routing policy and capability floors (complete rule table)
4. `docs/spec/v1-contracts.md` §5 — proposal and effect registry (routing → proposal mapping)
5. `docs/spec/v1-contracts.md` §7 — shipping policy baseline (decision class budgets)
6. `docs/spec/coordinator-automation.md` §6 — decision classes
7. `docs/spec/coordinator-automation.md` §7 — routing policy
8. `docs/spec/v1.md` §9.3 — selection precedence (deterministic ordering pattern)
9. Accepted CA-04 ready-set classification types
10. Accepted RT-02 runtime/knowledge manifests

## Reasoning / Agent Class

- Reasoning level: `R4`.
- Primary: GPT-5.4, Claude Opus 4.1, Claude Sonnet 4.6.
- Good alternatives: GPT-5.2.
- Steering-only: Composer 2.5, Cursor Auto.
- Unsuitable: Claude Haiku.

## Mandatory Reasoning Protocol

1. Map every routing rule to its guard condition, decision class, and permitted results.
2. Construct overlapping-guard scenarios to verify first-match correctness.
3. Enumerate every decision-class-to-capability-floor mapping.
4. Design a test matrix: 15 rules × (match + no-match) × (overlap with higher-priority rule).
5. Verify classification-only — no side effects through any code path.
6. Inspect CA-04 output for the `ReadySetClassification` type compatibility.

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

# Agent Launch Prompt — Work Batch RT-05

## Your Mission

1. Read all reference documents and inspect CA-04/RT-02 output.
2. Implement `src/foundation/CapabilityFloors.ts` with all pure functions.
3. Implement `src/foundation/RoutingPolicy.ts` with the `RoutingPolicy` class and all 15 guard functions.
4. Ensure the router is classification-only — no effects, no models, no state writes.
5. Create focused specs covering all 16 rules, first-match determinism, capability floors, classification-only verification, and operator routing.
6. Produce implementation report.
7. Update tracker.
8. Leave handoff message.

## What You Must Not Do

1. Do not implement effect execution or batch dispatch.
2. Do not reorder the 16 routing rules.
3. Do not downgrade a required capability class.
4. Do not invoke models.
5. Do not write lane state.
6. Do not commit.
7. Do not leave docs stale.

## Required Proof

- [ ] `nvb build` and `nvb test` pass.
- [ ] Every routing rule correctly classifies its intended trigger.
- [ ] First-match determinism proven with overlapping guards.
- [ ] Capability floors correct (D1→C2, D2→C3, D3→C5, M0→none).
- [ ] Classification-only: no side effects.
- [ ] Implementation report written.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

- `implementation-tracker.md`, `implementation-roadmap.md`

## Local Artifact Git Rule

`.local/` never staged, never committed.

## Non-Negotiable Rules

- Classification only — the router does not execute effects.
- First-match determinism — rule order is unchangeable.
- Capability floors enforced — no silent downgrade.
- Model-free — no model invocation in the router.
- Pure functions for guard evaluation — no I/O.

## Required Disk Report

`.local/agent-reports/coordinator-automation/CA-05-ordered-routing-policy-and-capability-floors.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent
