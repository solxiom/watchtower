# Batch CA-06 — Endpoint Adapter Eligibility and Isolation

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
Depends on: RT-05, CA-05 accepted
Owned files: `src/foundation/EndpointAdapter.ts`, `src/foundation/EndpointEligibility.ts`

**Required implementor reasoning class:** `R4`
**Class rationale:** endpoint adapter eligibility classification and isolation proof. Provider-neutral adapter layer distinguishing unattended, advisory-confirmed, and skill-only modes. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Build the provider-neutral endpoint adapter layer and the concrete v1
`opencode-cli` and `hermes-cli` adapters. Classify every adapter as unattended,
advisory-confirmed, or skill-only and prove eligibility before invocation.
Isolate adapters so a misclassified adapter cannot reach the decision envelope
or effect executor.

## Required Work

1. **Read the normative adapter contract.** Study `v1-contracts.md §6` for the
   complete adapter contract — unattended vs advisory-confirmed vs skill-only
   classification, the 10 requirements for unattended eligibility, streaming
   fallback, and usage telemetry. Study `coordinator-automation.md §8` for
   endpoint invocation and §9 for adapter isolation.

2. **Implement `src/foundation/EndpointAdapter.ts`:**
   - `EndpointAdapter` interface — the provider-neutral contract every adapter
     must implement:
     - `adapterId: string` — unique adapter identity.
     - `hostBrand: string` — provider-neutral CLI family identifier.
     - `classification: AdapterClassification` — `unattended`, `advisory-confirmed`, `skill-only`.
     - `installKnowledge(targetPath: string): Promise<void>` — install knowledge pack.
     - `invokeAdvisory(envelope: DecisionEnvelope): Promise<DecisionProposal>` — advisory invocation.
     - `invokeUnattended(envelope: DecisionEnvelope): Promise<DecisionProposal>` — unattended invocation.
     - `isHealthy(): Promise<boolean>` — adapter health check.
     - `getTelemetry(): UsageTelemetry` — provider usage telemetry.
     - `validateEligibility(): EligibilityReport` — prove eligibility.
   - `AdapterClassification` type: `'unattended' | 'advisory-confirmed' | 'skill-only'`.
   - `UsageTelemetry` type: `{classification: 'reported' | 'estimated' | 'unknown', ...}`.
   - `EligibilityReport` type: `{eligible: boolean, unmetRequirements: string[]}`.

3. **Implement `src/foundation/EndpointEligibility.ts`:**
   - `EndpointEligibilityChecker` class that proves adapter eligibility before
     any unattended invocation.
   - `proveUnattendedEligibility(adapter: EndpointAdapter): EligibilityReport` —
     verifies ALL 10 requirements from `v1-contracts.md §6`:
     1. Pinned compatible executable/version.
     2. Argv-array invocation with no shell evaluation.
     3. Explicit cwd and environment allowlist.
     4. Stdin or file-descriptor delivery of the immutable envelope.
     5. Exactly one schema-valid JSON result channel.
     6. Write-denied repository/lane/runtime access during generation.
     7. Context access only through the bounded broker.
     8. Process-group interruption and exit-status reporting.
     9. Output byte and wall-clock enforcement.
     10. (Optional) streaming with validated buffered fallback.
   - Each requirement is checked through adapter introspection and, where
     applicable, sandbox execution of a test envelope.
   - `classifyAdapter(adapter: EndpointAdapter): AdapterClassification` —
     derives the adapter classification from its declared capability and
     eligibility proof.
   - `isEligibleForClass(adapter: EndpointAdapter, decisionClass: DecisionClass): boolean` —
     checks whether an adapter can handle a specific decision class:
     - Unattended: eligible for D1–D3 if eligibility proof passes.
     - Advisory-confirmed: eligible for D1–D3 with operator confirmation
       for each invocation.
     - Skill-only: may not be used for decision cycles; knowledge-install only.
   - `enforceInvocationBounds(adapter: EndpointAdapter, budget: CycleBudget): BoundedInvocation` —
     wraps an adapter invocation with output-byte and wall-clock enforcement.
   - `validateResultChannel(adapter: EndpointAdapter): boolean` — verifies the
     adapter's output channel returns exactly one schema-valid JSON value.

4. **Isolation contract:**
   - During eligibility proof, the adapter runs in a test environment with
     write-denied access to the repository, lane directory, and runtime store.
   - The eligibility checker never runs the adapter against real lane state.
   - An adapter classified as `skill-only` must be rejected if any code path
     attempts to use it for a decision cycle.
   - An adapter classified as `advisory-confirmed` requires an explicit
   operator confirmation token before each invocation.

5. **Concrete v1 adapters:**
   - Implement `OpenCodeEndpointAdapter` with adapter ID `opencode-cli`.
     Detection, version compatibility, argv/env/cwd construction, immutable
     envelope delivery, one-result parsing, cancellation, bounds, redaction,
     route/model catalog observations, charging class, catalog digest, and
     capacity-pool identity must use the common adapter contract.
   - Implement `HermesEndpointAdapter` with adapter ID `hermes-cli`. Hermes is
     conditionally available: `not-installed` is a healthy discovery outcome,
     but an installed adapter may not be selected until the applicable
     conformance checks pass.
   - Neither adapter hardcodes provider model capability from names, pricing,
     or marketing tiers. A catalog/executable/adapter fingerprint change stales
     the endpoint's capability evidence and blocks selection until refreshed.
   - Routes exposed through different adapters but backed by the same declared
     entitlement use the same `capacityPoolId`.
   - Knowledge installation remains a separate contract; these endpoint
     adapters do not expand `wt skill install` targets.

6. **Error taxonomy:**
   - `ADAPTER_NOT_FOUND` — requested adapter ID not registered.
   - `ADAPTER_ELIGIBILITY_FAILED` — adapter failed one or more eligibility checks.
   - `ADAPTER_CLASSIFICATION_REQUIRED` — adapter not yet classified.
   - `ADAPTER_SKILL_ONLY` — attempted to use skill-only adapter for a decision cycle.
   - `ADAPTER_CONFIRMATION_REQUIRED` — advisory-confirmed adapter needs operator confirmation.
   - `ADAPTER_INVOCATION_FAILED` — adapter execution failed.
   - `ADAPTER_RESULT_INVALID` — adapter returned non-schema-valid output.
   - `ADAPTER_BOUNDS_EXCEEDED` — adapter exceeded output-byte or wall-clock limits.
   - `ADAPTER_UNSUPPORTED_CLASS` — adapter cannot handle the required decision class.

## Expected Ownership

- `src/foundation/EndpointAdapter.ts` — owns the `EndpointAdapter` interface,
  `AdapterClassification` type, and all adapter type definitions.
- `src/foundation/EndpointEligibility.ts` — owns eligibility proof, classification,
  invocation-bounds enforcement, and result-channel validation.
- Focused OpenCode and Hermes adapter modules own only their CLI-specific
  discovery, launch, parsing, and redaction mechanics.
- No other module duplicates adapter classification, eligibility checking, or
  invocation-bound enforcement.

## Tests And Evidence

- **All 10 eligibility checks:** For each requirement, prove the checker detects
  pass and failure (e.g., missing argv-only mode, lacking environment allowlist,
  missing output channel).
- **Skill-only rejection:** Register a skill-only adapter. Attempt to invoke it
  for a decision cycle. Prove `ADAPTER_SKILL_ONLY` error.
- **Advisory-confirmed requirement:** Attempt to invoke an advisory-confirmed
  adapter without a confirmation token. Prove `ADAPTER_CONFIRMATION_REQUIRED`.
- **Write-denied proof:** During eligibility check, the adapter's sandbox process
  attempts to write to the repository. Prove the write is denied and detected.
- **Output bounds:** Invoke an adapter with a 1 KiB output limit. Feed it input
  that produces >1 KiB. Prove `ADAPTER_BOUNDS_EXCEEDED`.
- **Wall-clock bounds:** Invoke an adapter with a 5-second limit. Make it take
  >5 seconds. Prove `ADAPTER_BOUNDS_EXCEEDED`.
- **Invalid result:** Adapter returns non-JSON or schema-invalid output. Prove
  `ADAPTER_RESULT_INVALID`.
- **Classification determinism:** Classify the same adapter twice. Prove identical
  classification.
- **Host-brand independence:** Classify a generic adapter vs a branded one. Prove
  classification depends on capability, not host brand.
- **OpenCode conformance:** Against a compatible installed fixture, prove safe
  discovery and bounded schema-valid invocation, plus negative version,
  malformed-output, timeout, cancellation, write, secret-redaction, and stale
  catalog cases.
- **Hermes conditional conformance:** Prove absence reports `not-installed`
  without blocking release; when a compatible fixture is present, rerun the
  applicable OpenCode-grade checks before eligibility.
- **Shared-pool and drift:** Prove aliases cannot duplicate capacity and a
  changed executable/catalog/model fingerprint invalidates prior eligibility.

## What Must Not Change

- Do not modify RT-05's `LaneTaskRunner`, TaskHandler, or leaf boundaries.
- Do not implement concrete Codex, Cursor, or Claude decision adapters in this
  batch. OpenCode and Hermes provider-specific mechanics stay in their focused
  adapters and must not leak into the common interface or eligibility checker.
- Do not execute any adapter against real lane state during eligibility checking.
- Do not encode host-brand-specific logic in the eligibility checker.
- Do not invoke any model, LLM, or AI for eligibility checking.

## Review Procedure Highlights

1. Independently verify every eligibility requirement is checked.
2. Prove skill-only and advisory-confirmed adapters are correctly restricted.
3. Verify write-denial and bounds-enforcement during sandbox testing.
4. Verify classification is capability-based, not host-brand-based.
5. Verify the adapter interface is provider-neutral — no provider-specific types
   or logic.

---

# CA-06 Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** `R4` — deep code reasoning required.
**Suitability:** provider-neutral adapter interface design, 10-requirement eligibility verification, sandbox invocation with write-denial and bounds enforcement, and clean classification boundaries. The agent must reason about isolation contracts and the capability-vs-brand distinction.
**Primary agents:** GPT-5.4, Claude Opus 4.1, Claude Sonnet 4.6.
**Good alternatives:** GPT-5.2.
**Acceptable-only-with-steering:** Composer 2.5, Cursor Auto — may handle sandbox execution and bounds checking but must be steered away from provider-specific logic or skipping eligibility requirements.
**Unsuitable options:** Claude Haiku — insufficient for 10-requirement eligibility proof and sandbox isolation reasoning.

### Complete forwarding profile — mandatory

Reasoning level `R4`. Primary: GPT-5.4, Claude Opus 4.1, Claude Sonnet 4.6. Good alternatives: GPT-5.2. Steering-only: Composer 2.5, Cursor Auto. Unsuitable: Claude Haiku.

## Capability-Based Agent Selection Rule

- R3: reliable bounded repository reasoning.
- R4: deep code reasoning, compatibility, negative-path design, ownership boundaries.
- R5: strongest reasoning — state machines, concurrency, graph/planner logic.

CA-06 is R4 because the adapter eligibility proof is the definitive guard between agent platforms and the coordinator decision plane. A missed eligibility check silently grants unattended invocation authority to an adapter that does not meet the safety contract.

## Read In This Order

1. `AGENTS.md` prerequisite
2. Pack README, roadmap, tracker, quality rules
3. `docs/spec/v1-contracts.md` §6 — adapter contract (all 10 requirements)
4. `docs/spec/v1-contracts.md` §7 — shipping policy baseline (adapter telemetry, budgets)
5. `docs/spec/coordinator-automation.md` §8 — endpoint invocation
6. `docs/spec/coordinator-automation.md` §9 — adapter isolation
7. `docs/spec/v1.md` §11.8 — skill install command (adapter context)
8. `docs/spec/architecture.md` §4.8 — coordinator decision plane services
9. Accepted RT-05 central runtime invocation adapter
10. Accepted CA-05 routing policy and `DecisionClass`, `CapabilityFloor` types

## Reasoning / Agent Class

- Reasoning level: `R4`, deep code reasoning.
- Primary: GPT-5.4, Claude Opus 4.1, Claude Sonnet 4.6.
- Good alternatives: GPT-5.2.
- Steering-only: Composer 2.5, Cursor Auto.
- Unsuitable: Claude Haiku.

## Mandatory Reasoning Protocol

1. Map every eligibility requirement to a testable condition.
2. Design the sandbox environment for write-denied adapter testing.
3. Enumerate every adapter classification path and its permissions.
4. Design negative tests for every eligibility failure mode.
5. Verify the adapter interface is genuinely provider-neutral.
6. Inspect RT-05 and CA-05 output for type compatibility.

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

1. Read all reference documents and inspect RT-05/CA-05 output.
2. Implement `src/foundation/EndpointAdapter.ts` with the complete `EndpointAdapter` interface and type definitions.
3. Implement `src/foundation/EndpointEligibility.ts` with eligibility proof, classification, and invocation-bound enforcement.
4. Create focused specs for: all 10 eligibility checks, skill-only rejection, advisory-confirmed requirement, write-denial proof, output/wall-clock bounds, invalid results, deterministic classification, and provider-neutrality.
5. Produce implementation report.
6. Update tracker.
7. Leave handoff message.

## What You Must Not Do

1. Do not implement concrete Codex, Cursor, or Claude adapters.
2. Do not encode host-brand-specific logic.
3. Do not test against real lane state.
4. Do not invoke models.
5. Do not commit.
6. Do not leave docs stale.

## Required Proof

- [ ] `nvb build` and `nvb test` pass.
- [ ] All 10 eligibility requirements independently verifiable.
- [ ] Skill-only adapters blocked from decision cycles.
- [ ] Advisory-confirmed requires confirmation token.
- [ ] Write-denial, output-byte, and wall-clock bounds enforced.
- [ ] Classification is capability-based, not brand-based.
- [ ] Implementation report written.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

- `implementation-tracker.md`, `implementation-roadmap.md`

## Local Artifact Git Rule

`.local/` never staged, never committed.

## Non-Negotiable Rules

- Provider-neutral adapter interface — no host-brand-specific types.
- All 10 eligibility requirements checked before unattended classification.
- Sandbox testing never touches real lane state.
- Skill-only adapters rejected for decision cycles.
- Model-free eligibility checking.

## Required Disk Report

`.local/agent-reports/coordinator-automation/CA-06-endpoint-adapter-eligibility-and-isolation.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent
