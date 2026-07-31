# Batch CA-09 — Typed proposals and current-state validator

## Synchronized batch execution matrix

- **Accepted-map title:** Typed proposals and current-state validator
- **Dependencies:** `CA-05`, `CA-07`, `CA-08`
- **Exclusive ownership/interface:** proposal contracts/validator
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** All 14 proposal types; specification-resolution authority/seal/independence checks; stale/illegal/invalid cases
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-09-typed-proposals-and-current-state-validator.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-09-typed-proposals-and-current-state-validator-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-09-typed-proposals-and-current-state-validator-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Routing and decision foundation
Depends on: CA-05, CA-07, CA-08 accepted
Owned files: `src/contracts/proposals.ts`, `src/foundation/ProposalValidator.ts`

**Required implementor reasoning class:** `R5`
**Class rationale:** all 14 proposal types with validation matrices covering permitted origin/class/effect. Stale, illegal, invalid, and duplicate proposal handling. The class is a floor; escalate when source inspection exposes additional risk.

## Objective

Implement the complete v1 typed-proposal type system and the current-state
validator. Every proposal type must be validated against its permitted origin,
decision class, mapped effect, current state, and idempotency identity before
any effect can proceed.

## Required Work

1. **Read the normative proposal registry.** Study `v1-contracts.md §5` for the
   complete proposal-and-effect registry — 14 proposal types, permitted
   origin/class, legal mapped effects, idempotency-key construction, and the
   confirmation requirement table. Study `v1-contracts.md §3.4` for RFC 8785
   canonicalization used in idempotency key computation.

2. **Implement `src/contracts/proposals.ts`:**
   - `DecisionProposal` type matching the JSON Schema `$defs.decisionProposal`:
     ```typescript
     {
       schemaVersion: 1;
       cycleId: string;
       proposalId: string;
       type: ProposalType;
       snapshotDigest: string;
       expiresAt: string;
       evidenceRefs: string[];
       body: ProposalBody;
       requestedEffects: RequestedEffect[];
     }
     ```
   - `ProposalType` enum with all 11 types: `select-ready-batch`, `classify-reject`,
     `open-correction`, `select-correction-route`, `request-reroute`,
     `propose-reconciliation`, `request-pack-amendment`, `grant-session-budget`,
     `place-hold`, `release-hold`, `escalate`.
   - `ProposalBody` discriminated union — each proposal type has its own body shape
     with the required fields for that type.
   - `RequestedEffect` type: `{effect: EffectType, ...}` where `EffectType` is
     `dispatch-batch`, `open-correction`, `route-correction`, `reroute-endpoint`,
     `reconcile-projection`, `create-amendment-request`, `grant-session-budget`,
     `place-hold`, `release-hold`, `open-escalation`.
   - `ProposalOrigin` type: `'operator' | 'coordinator-D1' | 'coordinator-D2' |
     'coordinator-D3' | 'M0-safety'`.
   - `ProposalValidationResult` type: `{valid: boolean, errors: ValidationError[],
     warnings: ValidationWarning[]}`.
   - Complete type definitions for every proposal body variant.

3. **Implement `src/foundation/ProposalValidator.ts`:**
   - `ProposalValidator` class — the sole validation authority.
   - `validateProposal(proposal: DecisionProposal, currentState: ValidationContext): ProposalValidationResult` —
     validates a proposal against current state and policy.
   - `ValidationContext` type: `{laneState, packIndex, journalState, routingPolicy,
     operatorSession?, activeClaims, activeHolds, budgetState, endpointState}`.
   - **Validation checks (in order):**
     1. **Schema validation:** proposal matches `decisionProposal` JSON Schema.
     2. **Stale snapshot:** `snapshotDigest` matches current state digest.
        If not, the proposal is stale and rejected.
     3. **Expiry:** `expiresAt` has not passed.
     4. **Origin/class match:** the proposal type is permitted for its origin
        and decision class (per the proposal registry table).
     5. **Effect legality:** every `requestedEffect` is a legal mapped effect
        for the proposal type.
     6. **Idempotency:** recompute the idempotency key and check it has not
        already been applied (completed in the effect journal).
     7. **State precondition:** the lane state satisfies the proposal type's
        specific preconditions (e.g., batch must be pending for dispatch,
        hold must exist for release).
     8. **Claim/conflict:** proposed effect would not conflict with active
        claims or holds.
     9. **Budget availability:** for budget-grant proposals, the grant is
        within lane-wide limits and protected reserves.
     10. **Confirmation status:** proposals requiring operator confirmation
         have a valid confirmation record. Proposals requiring spec-authority
         role have that role recorded in local policy.
   - `computeIdempotencyKey(laneId: string, proposalId: string, effectType: EffectType,
     targetIds: string[], snapshotDigest: string, policyVersion: string): string` —
     SHA-256 semantic digest of the canonical form of `{laneId, proposalId,
     effectType, targetIds, snapshotDigest, policyVersion}` using RFC 8785.
   - `isProposalDuplicate(idempotencyKey: string): boolean` — checks if an
     idempotency key has already been recorded as completed.
   - `getPermittedOrigins(proposalType: ProposalType): ProposalOrigin[]` — returns
     the permitted origin set for a proposal type.
   - `getLegalEffects(proposalType: ProposalType): EffectType[]` — returns the
     legally mapped effects for a proposal type.

4. **Complete origin/class/effect matrix:**
   - `select-ready-batch`: D1 (automated) or D1 (operator with confirmation) →
     `dispatch-batch`.
   - `classify-reject`: D2 → journal classification only; no direct worker launch.
   - `open-correction`: D2 → `open-correction`.
   - `select-correction-route`: D2 → `route-correction`.
   - `request-reroute`: D1 → `reroute-endpoint` within active routing policy.
   - `propose-reconciliation`: D3 + operator confirmation → `reconcile-projection`.
   - `request-pack-amendment`: D2 + operator confirmation → `create-amendment-request`.
   - `grant-session-budget`: operator confirmation → `grant-session-budget`.
   - `place-hold`: operator confirmation or M0 safety → `place-hold`.
   - `release-hold`: operator confirmation or M0 expiry → `release-hold`.
   - `escalate`: D1–D3 → `open-escalation`.

5. **Error taxonomy:**
   - `PROPOSAL_SCHEMA_INVALID` — proposal fails JSON Schema validation.
   - `PROPOSAL_STALE_SNAPSHOT` — snapshot digest does not match current state.
   - `PROPOSAL_EXPIRED` — `expiresAt` has passed.
   - `PROPOSAL_ORIGIN_MISMATCH` — proposal origin not permitted for type.
   - `PROPOSAL_CLASS_INSUFFICIENT` — decision class too low for proposal type.
   - `PROPOSAL_EFFECT_ILLEGAL` — requested effect not legal for proposal type.
   - `PROPOSAL_DUPLICATE` — idempotency key already completed.
   - `PROPOSAL_PRECONDITION_FAILED` — lane state precondition not met.
   - `PROPOSAL_CLAIM_CONFLICT` — proposed effect conflicts with active claim/hold.
   - `PROPOSAL_BUDGET_OVER_LIMIT` — budget grant exceeds lane-wide limit or reserve.
   - `PROPOSAL_CONFIRMATION_REQUIRED` — operator or spec-authority confirmation missing.
   - `PROPOSAL_REROUTE_INVALID` — reroute target outside active routing policy.

## Expected Ownership

- `src/contracts/proposals.ts` — owns all proposal types, proposal bodies,
  effect types, origin types, and validation result types.
- `src/foundation/ProposalValidator.ts` — owns validation logic, idempotency-key
  computation, and the complete origin/class/effect matrix.
- No other module duplicates proposal validation or idempotency computation.

## Tests And Evidence

- **All 14 types schema-valid:** For each proposal type, construct a minimum valid
  proposal. Prove it passes schema validation.
- **Stale snapshot:** Submit a valid proposal with an outdated `snapshotDigest`.
  Prove `PROPOSAL_STALE_SNAPSHOT`.
- **Expired proposal:** Submit a proposal with `expiresAt` in the past. Prove
  `PROPOSAL_EXPIRED`.
- **Every origin/class mismatch:** For each proposal type, construct a proposal
  from a lower-than-permitted decision class. Prove rejection.
- **Every effect mismatch:** For each proposal type, request an effect not in its
  legal set. Prove `PROPOSAL_EFFECT_ILLEGAL`.
- **Duplicate detection:** Submit a proposal, record its idempotency key as
  completed. Submit the same proposal again. Prove `PROPOSAL_DUPLICATE`.
- **Idempotency-key stability:** Compute the key twice from identical inputs.
  Prove identical output.
- **Every precondition:** For batch-dispatch, verify batch must be pending. For
  hold-release, verify hold must exist. For each proposal type, prove the
  preconditions are checked.
- **Budget over limit:** Submit a budget grant exceeding the lane-wide limit.
  Prove `PROPOSAL_BUDGET_OVER_LIMIT`.
- **Confirmation required:** Submit a proposal requiring operator confirmation
  without a confirmation record. Prove `PROPOSAL_CONFIRMATION_REQUIRED`.
- **Reroute invalid:** Request reroute to an endpoint outside the active routing
  policy. Prove `PROPOSAL_REROUTE_INVALID`.
- **Model-free proof:** Architecture check for no model/AI imports.

## What Must Not Change

- Do not add, remove, or rename proposal types.
- Do not change the origin/class/effect matrix.
- Do not invoke models for validation.
- Do not bypass any validation check.
- Do not write validation results as lane state.

## Review Procedure Highlights

1. Independently construct every valid and invalid proposal type and verify
   validation outcome.
2. Verify the complete origin/class/effect matrix is enforced correctly.
3. Verify idempotency-key stability and duplicate detection.
4. Verify every precondition is checked for its proposal type.
5. Verify no model is invoked during validation.

---

# CA-09 Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** `R5` — highest available reasoning.
**Suitability:** complete 14-type proposal registry, multi-dimensional validation (schema/staleness/expiry/origin/class/effect/idempotency/precondition/claim/budget/confirmation), RFC 8785 idempotency-key computation, and the definitive origin/class/effect permission matrix. The agent must hold the complete validation pipeline with all its cross-referencing rules simultaneously.
**Primary agents:** GPT-5.4, Claude Opus 4.1.
**Good alternatives:** Claude Sonnet 4.6, GPT-5.2.
**Acceptable-only-with-steering:** Composer 2.5, Cursor Auto — must be steered away from missing validation dimensions or conflating proposal types.
**Unsuitable options:** Claude Haiku — insufficient for 11-type validation-matrix reasoning.

### Complete forwarding profile — mandatory

Reasoning level `R5`. Primary: GPT-5.4, Claude Opus 4.1. Good alternatives: Claude Sonnet 4.6, GPT-5.2. Steering-only: Composer 2.5, Cursor Auto. Unsuitable: Claude Haiku.

## Capability-Based Agent Selection Rule

- R3: reliable bounded repository reasoning.
- R4: deep code reasoning, compatibility, negative-path design.
- R5: strongest reasoning — state machines, validation matrices, hash-chain logic.

CA-09 is R5 because the proposal validator is the last gate before the effect executor. A missed validation dimension — stale state, illegal effect, duplicate idempotency key, missing confirmation — silently authorizes a mutation that violates the coordinator safety contract.

## Read In This Order

1. `AGENTS.md` prerequisite
2. Pack README, roadmap, tracker, quality rules
3. `docs/spec/v1-contracts.md` §5 — complete proposal and effect registry
4. `docs/spec/v1-contracts.md` §3.4 — RFC 8785 canonicalization for idempotency keys
5. `docs/spec/v1-contracts.md` §4 — routing policy (origin/class relationship)
6. `docs/spec/schemas/v1.schema.json` — `decisionProposal` definition
7. `docs/spec/coordinator-automation.md` §11 — proposal validation specification
8. Accepted CA-05 routing policy types (`DecisionClass`, `ProposalOrigin`)
9. Accepted CA-07 envelope types (`snapshotDigest`)
10. Accepted CA-08 context-broker types (`BudgetStatus`)

## Reasoning / Agent Class

- Reasoning level: `R5`.
- Primary: GPT-5.4, Claude Opus 4.1. Good alternatives: Claude Sonnet 4.6, GPT-5.2. Steering-only: Composer 2.5, Cursor Auto. Unsuitable: Claude Haiku.

## Mandatory Reasoning Protocol

1. Map the complete origin/class/effect matrix for all 14 proposal types.
2. Enumerate every validation dimension and its cross-referencing dependencies.
3. Design idempotency-key computation per RFC 8785 with all required fields.
4. Design negative tests spanning every validation dimension for every proposal type.
5. Verify no validation path can be bypassed — structural proof.
6. Inspect CA-05, CA-07, CA-08 output for type compatibility.

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

1. Read all reference documents, inspect predecessor outputs.
2. Implement `src/contracts/proposals.ts` with all 14 proposal types, discriminated proposal bodies, effect types, origin types, and validation result types.
3. Implement `src/foundation/ProposalValidator.ts` with complete validation pipeline, idempotency-key computation, and the origin/class/effect matrix.
4. Create focused specs for every validation dimension and every proposal type.
5. Produce implementation report, update tracker, leave handoff.

## What You Must Not Do

1. Do not add, remove, or rename proposal types.
2. Do not change the origin/class/effect matrix.
3. Do not skip any validation dimension.
4. Do not invoke models.
5. Do not write lane state or effect journals.
6. Do not commit.

## Required Proof

- [ ] `nvb build` and `nvb test` pass.
- [ ] Every proposal type schema-valid minimum proven.
- [ ] Every stale/expired/origin/class/effect/idempotency/precondition/claim/budget/confirmation failure proven.
- [ ] Idempotency-key stability proven.
- [ ] Complete matrix coverage: 11 types × all validation dimensions.
- [ ] Model-free architecture check.
- [ ] Implementation report written.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

- `implementation-tracker.md`, `implementation-roadmap.md`

## Local Artifact Git Rule

`.local/` never staged, never committed.

## Non-Negotiable Rules

- All 14 proposal types must be validatable.
- Every validation dimension checked for every proposal.
- Idempotency key is RFC 8785 canonicalization of spec-defined fields.
- No validation bypass through any code path.
- Model-free.

## Required Disk Report

`.local/agent-reports/coordinator-automation/CA-09-typed-proposals-and-current-state-validator.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **proposal contracts/validator**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/CA-09-typed-proposals-and-current-state-validator.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-05`, `CA-07`, `CA-08`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **All 14 proposal types; specification-resolution authority/seal/independence checks; stale/illegal/invalid cases**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **proposal contracts/validator** and **All 14 proposal types; specification-resolution authority/seal/independence checks; stale/illegal/invalid cases**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-coordinator-automation/CA-09-typed-proposals-and-current-state-validator.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
