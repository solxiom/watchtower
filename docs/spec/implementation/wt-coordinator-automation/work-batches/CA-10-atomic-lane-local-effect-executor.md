# Batch CA-10 — Atomic Lane-Local Effect Executor

> Mandatory v1 scope: [`../specification-resolution-batch-amendment.md`](../specification-resolution-batch-amendment.md), CA-10 ownership and fixture obligations.

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
Phase: Effect foundation
Depends on: LC-03, CA-09 accepted
Owned files: `src/foundation/EffectExecutor.ts`, `src/foundation/EffectPlan.ts`

**Required implementor reasoning class:** `R5`
**Class rationale:** sole effect authority with lock/revalidation/idempotency, all-or-nothing projections and journals, and crash recovery. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Implement the atomic lane-local effect executor — the ONE authority for all lane
state mutations, journal writes, and projection updates. Every effect passes
through lock acquisition, current-state revalidation, idempotency verification,
all-or-nothing execution, and fsynced journal append.

## Packaged Task Boundary And Invocation Envelopes

CA-10 also owns the authority-preserving boundary between the effect executor
and packaged mutating TaskHandlers:

- the executor creates a typed, single-use invocation envelope only after lock
  acquisition, current-state revalidation, proposal/effect authorization, and
  idempotency checks;
- the envelope identifies one catalog action/task, one effect/attempt ID,
  bounded typed parameters, pre-snapshot digest, expiry, nonce, and integrity
  digest; it contains no arbitrary task/config/module/path/command/environment;
- `LaneTaskRunner` accepts that envelope by reference and the TaskHandler
  validates identity, digest, expiry, unused state, effect/action match, and
  current attempt before performing mechanics;
- consumption is durably recorded so replay cannot reuse the envelope; crash
  recovery follows the effect attempt journal rather than minting authority;
- a TaskHandler never acquires semantic authority from NVB, its caller, or task
  arguments and cannot bypass the sole executor;
- structured NVB events/results become attempt evidence, not authoritative
  mutation or acceptance state.

Prove forged, expired, reused, wrong-action, wrong-effect, stale-snapshot,
tampered, and concurrent-double-consumption envelopes fail before mechanics.
Direct calls to mutating handlers, raw NVB task selection, and a second effect
executor are hard rejects.

## Required Work

1. **Read the normative effect contract.** Study `v1-contracts.md §5` for the
   effect registry, idempotency keys, and the complete proposal-to-effect mapping.
   Study `v1-contracts.md §11` for locking, transactions, and recovery rules.
   Study `coordinator-automation.md §12` for effect execution.

2. **Implement `src/foundation/EffectPlan.ts`:**
   - `EffectPlanner` — converts a validated proposal into a bounded effect plan.
   - `createEffectPlan(proposal: DecisionProposal, validation: ProposalValidationResult): EffectPlan` —
     derives the exact bounded effects from a valid proposal.
   - `EffectPlan` type: `{planId, cycleId, proposalId, effects: BoundedEffect[],
     idempotencyKey, preSnapshotDigest, createdAt}`.
   - `BoundedEffect` type — a single effect within a plan:
     ```typescript
     {
       effectIndex: number;
       effectType: EffectType;
       targetIds: string[];
       params: EffectParams; // type-specific parameters
       preconditions: Precondition[]; // must be true before execution
       postconditions: Postcondition[]; // verified after execution
     }
     ```
   - Each effect type has a specific `EffectParams` shape — the planner fills
     in the required parameters from the proposal body.
   - `Precondition` type: `{check: string, expected: any}` — a verifiable
     condition that must hold before the effect executes.
   - `Postcondition` type: `{check: string, expected: any}` — a verifiable
     condition verified after the effect executes.
   - `previewEffectPlan(plan: EffectPlan): EffectPreview` — human-readable preview
     of the planned effects without executing them.
   - The planner is deterministic — same proposal + state → same plan.

3. **Implement `src/foundation/EffectExecutor.ts`:**
   - `EffectExecutor` class — the sole effect-execution authority.
   - `executePlan(plan: EffectPlan, journal: JournalIndex): EffectOutcome` —
     executes a complete effect plan atomically.
   - **Execution sequence:**
     1. **Acquire lane lock:** Obtain the lane-level `flock` lock. Fail with
        `EFFECT_LOCK_CONTENTION` if already held.
     2. **Revalidate current state:** Verify the lane state has not changed since
        the proposal's snapshot was taken. Fail with `EFFECT_STALE_STATE` if stale.
     3. **Verify idempotency:** Check the effect journal for a completed effect
        with the same idempotency key. If found, return the recorded outcome
        without re-executing.
     4. **Check preconditions:** Verify every precondition in the plan. Fail
        with `EFFECT_PRECONDITION_FAILED` if any check fails.
     5. **Execute effects in order:** Apply each bounded effect in `effectIndex`
        order. Effects within a plan are all-or-nothing — if any effect fails,
        the entire plan is rolled back.
     6. **Verify postconditions:** After each effect, verify its postconditions.
        Fail with `EFFECT_POSTCONDITION_FAILED` if any fails.
     7. **Append effect events:** Write a complete effect-outcome event to the
        effect journal with `fsync` before releasing the lock.
     8. **Update projections:** Refresh relevant projections (lane state,
        batch status, coordinator state) based on the applied effects.
     9. **Release lane lock.**
   - `EffectOutcome` type: `{success: boolean, appliedEffects: AppliedEffect[],
     idempotencyKey, outcomeEventId, completedAt}`.
   - `AppliedEffect` type: `{effectIndex, effectType, success, result?, error?}`.
   - **Crash recovery:** If the process crashes mid-execution:
     - The lane lock is released by the OS on process termination.
     - On next execution, the idempotency key check reveals the prior attempt.
     - If the prior attempt's outcome event was fsynced, the recorded outcome
       is returned (idempotent replay).
     - If no outcome event exists, the effect is retried (preconditions
       rechecked against current state).
   - **All-or-nothing semantics:** If effect index 2 of 4 fails, effects 0 and 1
     are rolled back (if possible — state-mutation effects are rolled back;
     external effects that already completed are journaled as `uncertain` and
     require manual recovery through a reconciliation proposal).
   - **External-effect handling:** Effects involving tmux or Git are delegated
     to the respective adapters (CA-11, CA-12) through a prepare/attempt/verify
     sequence. The executor records each phase in the effect journal.

4. **Lock contract:**
   - Lock path: `<lane-dir>/state/lane.lock`.
   - Lock file contains: owner PID, process start identity, command, acquisition
     timestamp.
   - Stale-lock detection: PID alone is insufficient. The detector must verify
     the PID no longer exists AND its process start time (if available) or
     startup identity does not match.
   - Lock acquisition timeout: 30 seconds. After timeout, return
     `EFFECT_LOCK_TIMEOUT`.
   - Locks are acquired in canonical order: data-root → lane → session → projection.

5. **Effect type implementations:**
   - `dispatch-batch`: updates lane state (`activeBatch`), writes worker-launch
     preparation event.
   - `open-correction`: creates correction brief, updates batch state.
   - `route-correction`: updates correction routing.
   - `reroute-endpoint`: updates active routing within policy bounds.
   - `reconcile-projection`: bounded projection reconciliation (never rewrites history).
   - `create-amendment-request`: creates amendment request record.
   - `grant-session-budget`: updates session budget ledger.
   - `place-hold`: creates scoped expiring hold.
   - `release-hold`: closes active hold.
   - `open-escalation`: creates/updates attention session.

6. **Error taxonomy:**
   - `EFFECT_LOCK_CONTENTION` — lane lock already held.
   - `EFFECT_LOCK_TIMEOUT` — lock acquisition timed out.
   - `EFFECT_STALE_STATE` — current state differs from proposal snapshot.
   - `EFFECT_IDEMPOTENT_REPLAY` — returning previously recorded outcome.
   - `EFFECT_PRECONDITION_FAILED` — a precondition check failed.
   - `EFFECT_POSTCONDITION_FAILED` — a postcondition check failed.
   - `EFFECT_EXECUTION_FAILED` — an effect failed to apply.
   - `EFFECT_ROLLBACK_INCOMPLETE` — partial rollback; some effects remain uncertain.
   - `EFFECT_JOURNAL_WRITE_FAILED` — unable to fsync the effect outcome event.

## Expected Ownership

- `src/foundation/EffectPlan.ts` — owns plan derivation from proposals, preview
  generation, and bounded effect definition.
- `src/foundation/EffectExecutor.ts` — owns the complete execution pipeline
  (lock → revalidate → idempotency → precondition → execute → postcondition →
  journal → projection → release). The ONE authority.
- No other module may write lane state, append to the effect journal, or update
  projections that derive from effects.

## Tests And Evidence

- **Lock contention:** Hold the lock. Attempt a second execution. Prove
  `EFFECT_LOCK_CONTENTION` (or timeout).
- **Lock timeout:** Simulate a long-held lock. Prove timeout detection.
- **Stale state:** Create an effect plan with snapshot A. Change lane state to B.
  Attempt execution. Prove `EFFECT_STALE_STATE`.
- **Idempotent replay:** Execute a plan successfully. Execute the same plan again.
  Prove `EFFECT_IDEMPOTENT_REPLAY` and the same outcome.
- **Precondition failure:** Craft a plan with a false precondition. Prove
  `EFFECT_PRECONDITION_FAILED`.
- **All-or-nothing:** Create a plan with 3 effects where effect #2 fails. Prove
  effect #1 is rolled back and effect #3 is never attempted.
- **External-effect uncertainty:** Simulate a tmux effect that partially completes.
  Prove the effect journal records the `uncertain` state.
- **Journal fsync:** Verify the effect outcome event is durably written before
  the lock is released and before the cursor advances.
- **Projection update:** After a dispatch effect, verify the lane state projection
  is updated correctly.
- **Crash recovery:** Simulate a crash mid-execution (kill process between effects).
  On restart, prove the idempotency key yields the incomplete outcome, or the
  plan is safely re-executed.
- **Model-free proof:** No model invocation in the executor.

## What Must Not Change

- Do not create a second mutation path around the executor.
- Do not modify the proposal validator (CA-09).
- Do not invoke models.
- Do not modify lanes outside the effect journal's write authority.

## Review Procedure Highlights

1. Independently execute effect plans and verify lock, revalidation, and
   idempotency behavior.
2. Prove all-or-nothing rollback — verify partial-failure recovery.
3. Verify crash recovery — kill during execution, verify replay safety.
4. Verify journal fsync ordering — outcome before cursor advance.
5. Verify no second mutation path exists.

---

# CA-10 Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** `R5` — highest available reasoning.
**Suitability:** sole effect authority implementation with lock management, crash-recovery idempotency, all-or-nothing execution with partial rollback, fsynced journal append, and the definitive execution pipeline. The agent must reason about concurrent-lane safety, crash semantics, and the one-authority architectural constraint.
**Primary agents:** GPT-5.4, Claude Opus 4.1.
**Good alternatives:** Claude Sonnet 4.6, GPT-5.2.
**Acceptable-only-with-steering:** Composer 2.5, Cursor Auto — must be steered away from creating parallel mutation paths or skipping crash-recovery idempotency.
**Unsuitable options:** Claude Haiku — insufficient for crash-recovery semantics and all-or-nothing transaction reasoning.

### Complete forwarding profile — mandatory

Reasoning level `R5`. Primary: GPT-5.4, Claude Opus 4.1. Good alternatives: Claude Sonnet 4.6, GPT-5.2. Steering-only: Composer 2.5, Cursor Auto. Unsuitable: Claude Haiku.

## Capability-Based Agent Selection Rule

- R3: reliable bounded repository reasoning.
- R4: deep code reasoning, compatibility, negative-path design.
- R5: strongest reasoning — state machines, concurrency, idempotency, crash recovery.

CA-10 is R5 because the effect executor is the definitive mutation boundary. Every lane-state change, journal entry, and projection update passes through this single component. A lock-ordering violation, missing revalidation, or incorrect crash-recovery idempotency creates unrecoverable lane corruption.

## Read In This Order

1. `AGENTS.md` prerequisite
2. Pack README, roadmap, tracker, quality rules
3. `docs/spec/v1-contracts.md` §5 — effect registry and idempotency
4. `docs/spec/v1-contracts.md` §11 — locking, transactions, and recovery
5. `docs/spec/v1.md` §14 — safety and concurrency
6. `docs/spec/coordinator-automation.md` §12 — effect execution
7. `docs/spec/coordinator-automation.md` §13 — effect journals
8. Accepted LC-03 transactional lane layout (lock file location)
9. Accepted CA-09 proposal validator and proposal/effect types
10. Accepted CA-03 journal index (for effect journal writes)

## Reasoning / Agent Class

- Reasoning level: `R5`.
- Primary: GPT-5.4, Claude Opus 4.1. Good alternatives: Claude Sonnet 4.6, GPT-5.2. Steering-only: Composer 2.5, Cursor Auto. Unsuitable: Claude Haiku.

## Mandatory Reasoning Protocol

1. Map the complete execution pipeline: lock → revalidate → idempotency → preconditions → execute → postconditions → journal → projections → release.
2. Enumerate every failure point and its recovery action.
3. Design crash-recovery idempotency: what survives a crash, what is re-checked.
4. Design all-or-nothing rollback for every effect type.
5. Define lock-ordering rules and stale-lock detection.
6. Inspect LC-03, CA-09, CA-03 output for type compatibility.

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
2. Implement `src/foundation/EffectPlan.ts` with `EffectPlanner`, `EffectPlan`, `BoundedEffect`, and all effect-type params.
3. Implement `src/foundation/EffectExecutor.ts` with the complete execution pipeline, locking, all effect type implementations, and crash recovery.
4. Create focused specs for every execution dimension and every effect type.
5. Produce implementation report, update tracker, leave handoff.

## What You Must Not Do

1. Do not create a second mutation path.
2. Do not skip any execution-pipeline step.
3. Do not bypass idempotency checking.
4. Do not invoke models.
5. Do not commit.
6. Do not leave tracker/docs stale.

## Required Proof

- [ ] `nvb build` and `nvb test` pass.
- [ ] Lock contention, timeout, stale-lock detection proven.
- [ ] Stale-state revalidation proven.
- [ ] Idempotent replay returns recorded outcome.
- [ ] All-or-nothing rollback proven for every effect type.
- [ ] Crash recovery: idempotent safety after kill.
- [ ] Journal fsync before cursor advance.
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

- One effect executor — no alternative mutation path.
- Lock → revalidate → idempotency → execute → journal → release.
- All-or-nothing within a plan.
- Crash recovery through idempotency-key replay.
- Model-free.

## Required Disk Report

`.local/agent-reports/coordinator-automation/CA-10-atomic-lane-local-effect-executor.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent
