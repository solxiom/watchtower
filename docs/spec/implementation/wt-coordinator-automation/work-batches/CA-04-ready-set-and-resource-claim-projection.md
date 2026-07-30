# Batch CA-04 — Ready Set and Resource-Claim Projection

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Index foundation
Depends on: RM-08, CA-01, CA-03 accepted
Owned files: `src/foundation/ready-set.ts`, `src/foundation/resource-claims.ts`

**Required implementor reasoning class:** `R5`
**Class rationale:** DAG scheduling projection with dependency/claim/capacity blocker resolution. The ready set must be computed deterministically from pack index + events + claims + routing state. No arbitrary winner selection. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Calculate the ready set — pending batches whose dependencies and hard dispatch
constraints pass — and detect resource-claim conflicts that block dispatch.
Entirely model-free and deterministic.

## Required Work

1. **Read normative references.** Study `coordinator-automation.md §5.3` for the
   ready-set calculation formula. Study `v1-contracts.md §4` and `v1-contracts.md §5`
   for routing policy and the ready-set role in M0/D1 classification. Study
   `v1.md §7.4` for repository bindings and claim semantics.

2. **Implement `src/foundation/resource-claims.ts`:**
   - `ResourceClaimStore` for evaluating claim conflicts across active lanes.
   - `evaluateClaimConflict(batch: BatchIndexEntry, activeClaims: ResourceClaim[]): ClaimConflictReport` —
     for a candidate batch and the set of currently active claims across all
     relevant lanes, determine if the batch can proceed or is blocked.
   - `registerBatchClaims(batchId: string, repositories: BatchRepoEntry[]): ResourceClaim[]` —
     derive the resource claims a batch makes from its declared repositories
     and path claims.
   - `checkWorktreeConflict(candidateRepo: RepositoryBinding, activeBindings: RepositoryBinding[]): WorktreeConflict | null` —
     detect writable worktree/branch/path overlap with active bindings.
   - `checkWritableOverlap(candidateBindings: RepositoryBinding[], activeBindings: RepositoryBinding[]): WritableConflictReport` —
     comprehensive writable-worktree overlap detection.
   - `ResourceClaim` type: `{repositoryId, paths: string[], mode: 'read' | 'shared-write' | 'exclusive-write', ownerBatchId, ownerLaneId}`.
   - `ClaimConflictReport` type: `{proceed: boolean, blockers: ClaimBlocker[]}`.
   - `ClaimBlocker` type: `{kind: 'worktree' | 'branch' | 'path' | 'capacity', sourceBatch, sourceLane, detail}`.
   - All claim evaluation is synchronous and model-free.

3. **Implement `src/foundation/ready-set.ts`:**
   - `computeReadySet(params: ReadySetParams): ReadySetResult` — compute the ready set
     from pack index, accepted batches, active claims, and endpoint availability.
   - **Parameters:**
     - `batchIndex: BatchIndexEntry[]` — all batches from the pack index.
     - `acceptedBatchIds: Set<string>` — IDs of batches whose reviewer `accept`
       event has been journaled.
     - `activeClaims: ResourceClaim[]` — currently active resource claims from all
       relevant lanes.
     - `endpointRoutes: EndpointRouteStatus[]` — active endpoint route availability
       for each reasoning class required by candidate batches.
     - `capacityReserved: CapacityReservation[]` — current capacity reservations
       that might block dispatch.
   - **Algorithm:**
     1. Filter to pending batches (batches whose ID is NOT in `acceptedBatchIds`).
     2. For each pending batch, check every dependency is in `acceptedBatchIds`.
     3. For each dependency-satisfied batch, verify the pack baseline is still
        admissible (no critical source drift — delegated to drift inspector).
     4. For each surviving candidate, check repository/worktree claims do not
        conflict with `activeClaims`.
     5. For each surviving candidate, verify required endpoint route is active
        for the batch's `implementationReasoning` class.
     6. For each surviving candidate, verify required capacity is reserved.
     7. The result is the set of batches that pass all checks.
   - `classifyReadySet(readySet: BatchIndexEntry[]): ReadySetClassification` —
     classifies the ready set: `none` (no candidates), `unique` (exactly one),
     `priority-resolved` (committed pack priority rule selects one),
     `ambiguous-critical` (multiple candidates with at least one R4/R5 or
     cross-repository), `ambiguous` (multiple equally valid candidates).
   - `computeBlockingReasons(candidateId: string, ...): BlockingReason[]` —
     for a non-ready batch, compute the exact blocking reasons with codes:
     `DEPENDENCY_UNSATISFIED`, `BASELINE_DRIFT`, `CLAIM_CONFLICT`,
     `ENDPOINT_UNAVAILABLE`, `CAPACITY_EXHAUSTED`.
   - The ready set must NEVER pick an arbitrary winner from multiple candidates.
     If exactly one candidate passes, `classifyReadySet` returns `unique`.
     If the committed pack contains a total-priority rule that selects exactly one,
     `classifyReadySet` returns `priority-resolved`. Otherwise it returns
     `ambiguous` or `ambiguous-critical`, leaving selection to a coordinator
     decision (D1 or D2).
   - All computation is synchronous and entirely model-free.

4. **Integration with the DAG model:**
   - The DAG is defined by batch dependencies in the pack index. The ready-set
     algorithm traverses the DAG to determine which leaf nodes (batches with all
     dependencies satisfied) are additionally unblocked by external constraints.
   - Cycle detection: dependency cycles in the pack are detected at index-compile
     time (CA-01). The ready-set module assumes a DAG-valid input.
   - Rejected/corrected batches: a batch that has been rejected by a reviewer
     (reject event journaled) is not `accepted` and remains pending with its
     dependencies unsatisfied.

5. **Error taxonomy:**
   - `READY_SET_EMPTY` — no pending batches (informational, not an error).
   - `READY_SET_BLOCKED_UNIVERSAL` — every pending batch has at least one blocker.
   - `READY_SET_AMBIGUOUS` — multiple ready candidates and no priority rule resolves.
   - `DEPENDENCY_UNSATISFIED` — one or more dependencies not yet accepted.
   - `CLAIM_CONFLICT_EXCLUSIVE` — exclusive-write path overlaps with active claim.
   - `CLAIM_CONFLICT_SHARED_WRITE` — shared-write path overlap without explicit permit.
   - `ENDPOINT_UNAVAILABLE` — required reasoning-class endpoint not active.
   - `CAPACITY_EXHAUSTED` — required capacity not reserved or available.

## Expected Ownership

- `src/foundation/resource-claims.ts` — owns claim evaluation, worktree/branch/path
  conflict detection, and claim registration. No scheduling logic.
- `src/foundation/ready-set.ts` — owns the ready-set algorithm, classification,
  and blocking-reason computation. Delegates claim checking to `resource-claims.ts`.
- No other module duplicates ready-set calculation or claim-conflict evaluation.

## Tests And Evidence

- **Empty set:** All batches accepted. Prove `computeReadySet` returns empty with
  `READY_SET_EMPTY`.
- **Unique candidate:** Only one batch has all dependencies satisfied and no conflicts.
  Prove `classifyReadySet` returns `unique`.
- **Priority resolution:** Multiple candidates but a total-priority rule in the
  fixture pack selects one. Prove `classifyReadySet` returns `priority-resolved`.
- **Ambiguous:** Multiple equally valid candidates without a priority rule.
  Prove `ambiguous` classification — no arbitrary winner.
- **Ambiguous critical:** Multiple candidates including an R4/R5 cross-repository batch.
  Prove `ambiguous-critical`.
- **Dependency unsatisfied:** Batch depends on an unaccepted batch. Prove it's excluded
  with `DEPENDENCY_UNSATISFIED`.
- **Claim conflict (exclusive-write):** Two batches claim overlapping exclusive-write
  paths. Prove the second candidate is blocked with `CLAIM_CONFLICT_EXCLUSIVE`.
- **Claim conflict (shared-write):** Shared-write path overlap without explicit permit.
  Prove blocking.
- **Worktree conflict:** Two batches share a writable worktree in dedicated mode.
  Prove `WorktreeConflict` detection.
- **Endpoint unavailable:** Required reasoning-class endpoint route is inactive.
  Prove `ENDPOINT_UNAVAILABLE`.
- **Capacity exhausted:** Required capacity not reserved. Prove `CAPACITY_EXHAUSTED`.
- **DAG correctness:** Deep dependency chain (10 batches). Prove only leaf nodes
  with all ancestors accepted are candidates.
- **Model-free proof:** Architecture check proving no model/AI imports.

## What Must Not Change

- Do not modify the pack index structure (CA-01).
- Do not modify journal projection output (CA-03).
- Do not implement batch selection — classification only.
- Do not invoke any model, LLM, or AI.
- Do not write any lane state.

## Review Procedure Highlights

1. Independently compute the ready set from a fixture pack with known accepted
   batches, claims, and endpoint status. Verify exact result.
2. Verify no arbitrary winner in the ambiguous case — the result must reflect
   classification only.
3. Verify every blocking reason code is correctly attributed.
4. Verify claim-conflict detection across exclusive-write, shared-write, worktree,
   and path dimensions.
5. Verify cycle handling (or the assumption that CA-01 DAG validation precludes cycles).

---

# CA-04 Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** `R5` — highest available reasoning required.
**Suitability:** DAG scheduling projection with dependency-graph traversal, resource-claim conflict detection across multiple dimensions (worktree/branch/path/capacity), and the critical classification boundary between uniquely provable dispatch and ambiguous selection. The agent must reason about graph algorithms, conflict matrices, and the determinism requirement.
**Primary agents:** GPT-5.4, Claude Opus 4.1.
**Good alternatives:** Claude Sonnet 4.6, GPT-5.2.
**Acceptable-only-with-steering:** Composer 2.5, Cursor Auto — may handle DAG traversal and claim comparison but must be steered away from arbitrary tie-breaking or conflating DAG traversal with priority policy.
**Unsuitable options:** Claude Haiku — insufficient for multi-dimensional claim-conflict reasoning and the normative ready-set classification boundary.

### Complete forwarding profile — mandatory

Reasoning level `R5`. Primary: GPT-5.4, Claude Opus 4.1. Good alternatives: Claude Sonnet 4.6, GPT-5.2. Steering-only: Composer 2.5, Cursor Auto. Unsuitable: Claude Haiku.

## Capability-Based Agent Selection Rule

- R3: reliable bounded repository reasoning; fast low-reasoning model unsuitable.
- R4: deep code reasoning, compatibility, negative-path design, ownership boundaries.
- R5: strongest available reasoning — state machines, concurrency, graph/planner logic.

CA-04 is R5 because the ready-set DAG computation is the mechanical heartbeat of automated coordination. An incorrect dependency chain, missed claim conflict, or arbitrary tie-break silently enables wrong-batch dispatch or blocks correct dispatch, and the error propagates through every downstream coordinator cycle.

## Read In This Order

1. `AGENTS.md` prerequisite
2. Pack README, roadmap, tracker, quality rules
3. `docs/spec/v1-contracts.md` §4 — routing policy and capability floors (ready-set role)
4. `docs/spec/v1-contracts.md` §5 — proposal/effect registry (select-ready-batch proposal)
5. `docs/spec/coordinator-automation.md` §5.3 — ready set versus next batch
6. `docs/spec/coordinator-automation.md` §11 — ready-set projection
7. `docs/spec/v1.md` §7.4 — local repository bindings and claim semantics
8. `docs/spec/v1.md` §14 — safety and concurrency (dedicated worktrees, shared-write)
9. Accepted CA-01 `PackIndex`, `PackIndexBatch` types
10. Accepted CA-03 `JournalProjection` output types
11. Accepted RM-08 repository bindings and conflict inspection foundation

## Reasoning / Agent Class

- Reasoning level: `R5`.
- Primary: GPT-5.4, Claude Opus 4.1.
- Good alternatives: Claude Sonnet 4.6, GPT-5.2.
- Steering-only: Composer 2.5, Cursor Auto.
- Unsuitable: Claude Haiku.

## Mandatory Reasoning Protocol

1. Map the complete DAG traversal — ancestors, descendants, leaf detection.
2. Enumerate every blocking dimension: dependency, baseline drift, claim (exclusive-write, shared-write, worktree, branch, path), endpoint route, capacity.
3. Define the exact classification boundary: unique, priority-resolved, ambiguous, ambiguous-critical, none.
4. Design negative tests for every cross-product of blocker types.
5. Verify no arbitrary winner in any ambiguous case.
6. Inspect CA-01, CA-03, and RM-08 outputs for type compatibility.

## Structural Design And Module-Size Gate

- `src/foundation/resource-claims.ts` target ≤220 lines. Multiple claim-check methods but one cohesive responsibility.
- `src/foundation/ready-set.ts` target ≤250 lines. DAG traversal, classification, and blocking-reason computation are cohesive scheduling functions.
- Test modules ≤300 lines; split by claim-conflict, DAG-traversal, and classification families.

## Your Mission

1. Read all reference documents.
2. Inspect accepted CA-01, CA-03, RM-08 output for type compatibility.
3. Implement `src/foundation/resource-claims.ts` with all claim-check and conflict-detection logic.
4. Implement `src/foundation/ready-set.ts` with `computeReadySet`, `classifyReadySet`, and `computeBlockingReasons`.
5. Implement the complete error taxonomy.
6. Create focused specs for: empty set, unique candidate, priority resolution, ambiguous (both kinds), every blocking reason, DAG correctness, claim-conflict matrices, and model-free proof.
7. Produce implementation report.
8. Update tracker.
9. Leave handoff message.

## What You Must Not Do

1. Do not pick an arbitrary winner from ambiguous candidates.
2. Do not implement batch selection (dispatch) — classification only.
3. Do not invoke models.
4. Do not write lane state.
5. Do not duplicate claim evaluation or DAG traversal logic.
6. Do not commit.
7. Do not leave tracker/status docs stale.

## Required Proof

- [ ] `nvb build` and `nvb test` pass.
- [ ] Ready-set computation matches fixture data deterministically.
- [ ] No arbitrary winner in ambiguous classification.
- [ ] Every blocking reason code correctly attributed.
- [ ] All claim-conflict dimensions tested.
- [ ] DAG correctness with deep chains.
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

- Entirely model-free. No model invocation through any code path.
- Deterministic — identical inputs produce identical ready set.
- Classification only — no batch selection or dispatch.
- No arbitrary winner from ambiguous candidates.
- Every claim, worktree, branch, path, endpoint, and capacity constraint evaluated.

## Required Disk Report

`.local/agent-reports/coordinator-automation/CA-04-ready-set-and-resource-claim-projection.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent
