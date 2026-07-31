# Batch CA-13 — Coordinator queue, cursor, replay, and watcher task integration

## Synchronized batch execution matrix

- **Accepted-map title:** Coordinator queue, cursor, replay, and watcher task integration
- **Dependencies:** `CA-03`, `CA-05`, `CA-10`–`CA-12`
- **Exclusive ownership/interface:** watcher/coordinator TaskHandlers
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Stable priority; impact-scoped blocker with unrelated progress; activation invalidation; interrupted/duplicate/uncertain replay
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-13-coordinator-queue-cursor-replay-and-watcher-integration.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-13-coordinator-queue-cursor-replay-and-watcher-integration-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-13-coordinator-queue-cursor-replay-and-watcher-integration-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Coordinator runtime integration
Depends on: CA-03, CA-05, CA-10, CA-11, CA-12 accepted
Owned files: `src/foundation/CoordinatorQueue.ts`, `src/foundation/CoordinatorReplay.ts`

**Required implementor reasoning class:** `R5`
**Class rationale:** stable priority queue with fsynced cursor advance, interrupted-cycle recovery (half-applied effects), duplicate-event handling, uncertain-outcome replay from cursor, and watcher-to-coordinator integration. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Implement the coordinator event queue with stable priority ordering, fsynced
cursor advance (cursor moves only after effect journal write is confirmed),
interrupted-cycle and duplicate-event handling, uncertain-outcome replay from
cursor, and full watcher integration — the watcher emits triggers, the
coordinator dequeues and routes.

## Required NVB Integration Shape

Use focused packaged TaskHandlers for substantial deterministic watcher/
coordinator mechanics assigned to CA-13: bounded trigger ingestion, queue
maintenance, cursor/checkpoint persistence, and replay probes where the
catalog's typed inputs/results fit. Application services retain priority
policy, cycle state, effect authority, and journal truth and call tasks only
through `LaneTaskRunner`.

Task groups may express deterministic mechanical ordering, but no handler or
group chooses semantic routing, advances a cursor before authoritative terminal
evidence, or mutates outside a valid CA-10 invocation envelope. Retained shell
is limited to cataloged external-tool leaves. New workflow-level watcher/
coordinator shell and direct executable/NVB contributes through the explicit composition rootare hard rejects. Prove
interrupted, duplicate, and uncertain task results replay from authoritative
journals without reusing a consumed envelope or duplicating a completed effect.

## Required Work

1. **Read the normative queue and replay contracts.** Study
   `coordinator-automation.md §14` for the watcher and queue model. Study
   `v1-contracts.md §11` for the cycle lifecycle states and cursor contract.
   Study accepted CA-03 for runtime journal indexes, CA-05 for routing policy,
   CA-10 for effect execution, and CA-11/CA-12 for external-effect journals.

2. **Implement `src/foundation/CoordinatorQueue.ts`:**
   - `CoordinatorQueue` class — a stable priority queue for coordinator cycles.
   - `enqueue(trigger: CoordinatorTrigger): EnqueueResult` — adds a trigger to
     the queue with a deterministic priority calculated from: trigger class
     (safety/escalation > operator > routine), event age (FIFO within class),
     and queue insertion order as a stable tie-break. Returns the queue entry
     ID and position.
   - `dequeue(): DequeueResult` — removes and returns the highest-priority
     trigger. Returns `{ok: false, reason: 'queue-empty'}` when the queue is
     empty. The dequeued trigger atomically becomes the active cycle — no
     concurrent dequeues are permitted for the same lane.
   - `peek(): CoordinatorTrigger | null` — non-destructive read of the
     highest-priority trigger. Does not dequeue.
   - **Stable priority ordering:**
     - Priority class: safety/escalation (0) > operator-request (1) > routine
       event (2). Lower number is higher priority.
     - Within a class: FIFO by `enqueuedAt` timestamp.
     - Equal timestamps within a class: ordered by the monotonic
       `enqueuedAt` + `sequenceNumber` tie-break.
     - Priority is deterministic: the same queue state always yields the same
       dequeue order.
   - **Queue persistence:**
     - Queue state is written to `coordinator/queue.json` on every enqueue and
       dequeue. The file contains `[{triggerId, trigger, priority, enqueuedAt,
       sequenceNumber}]`.
     - On startup, the queue is reconstructed from this file. Events present in
       the queue that have already been processed (found in the effect journal
       with a matching correlation ID) are silently dropped during reconstruction.
   - `CoordinatorTrigger` type: `{triggerId, cycleId, eventId, eventType,
     triggerClass, batchId?, laneId, correlationId, enqueuedAt}`.
   - `EnqueueResult` type: `{ok, triggerId, position, queueLength}`.
   - `DequeueResult` type: `{ok, trigger?, reason?}`.

3. **Implement `src/foundation/CoordinatorReplay.ts`:**
   - `CursorManager` class — manages the watcher event cursor with fsynced
     advance.
   - `advanceCursor(currentCursor: string, newEventId: string, effectOutcome:
     EffectOutcome): CursorAdvanceResult` — moves the cursor from `currentCursor`
     to `newEventId` ONLY after the effect outcome event has been fsynced to
     the effect journal. Before advancing, verifies that the effect outcome
     event ID is present and durably written in the journal. Fails with
     `CURSOR_ADVANCE_BLOCKED` if the outcome event is not yet fsynced.
   - `CursorAdvanceResult` type: `{ok, previousCursor, newCursor,
     confirmedEffectEventId, advancedAt}`.
   - **Cursor file:** Stored at `coordinator/cursor.json`:
     `{lastProcessedEventId, lastCursorAdvanceAt, laneId}`.
   - **Interrupted-cycle handling:** On startup, the replay manager loads all
     active cycles from the coordinator journal. For each cycle in an incomplete
     state:
     - `COORDINATOR_CYCLE_REQUESTED`: cycle was created but not routed.
       Safe to reroute.
     - `COORDINATOR_ROUTED`: cycle was routed but no proposal received.
       Safe to re-invoke if within budget.
     - `COORDINATOR_PROPOSAL_RECEIVED`: proposal received but not validated.
       Re-validate against current state.
     - `COORDINATOR_EFFECT_PREPARED`: effect plan created but not attempted.
       Re-attempt with idempotency check.
     - `COORDINATOR_EFFECT_ATTEMPTED`: effect started but not verified.
       Run verify phase. If uncertain, escalate.
     - `COORDINATOR_EFFECT_VERIFIED`: effect verified but cycle not marked
       complete. Mark complete.
   - **Duplicate-event handling:** Before enqueuing a trigger, check the
     effect journal for a prior completed cycle with the same `correlationId`.
     If found, do not enqueue — return `{ok: false, reason: 'duplicate-event',
     priorCycleId}`.
   - **Uncertain-outcome replay:** If a prior cycle's outcome is
     `COORDINATOR_EFFECT_UNCERTAIN`, do not advance the cursor past the
     trigger event. The replay manager creates a new cycle with a reference
     to the prior uncertain cycle and routes it to D2 escalation. The
     original uncertain outcome remains in the journal unchanged.

4. **Watcher integration:**
   - The watcher (from the lane runtime) emits triggers as structured events
     with event ID, type, and correlation ID.
   - `WatcherPoller` — polls the watcher's output (via accepted CA-03 runtime
     indexes) for new durable events, transforms them into
     `CoordinatorTrigger` objects, deduplicates by correlation ID, and
     enqueues them into the coordinator queue.
   - M0 triggers (no-model preauthorized effects) are handled immediately
     by the routing layer (CA-05), not enqueued for a decision cycle.
   - D1–D3 triggers are enqueued with their routing class and await dequeue
     by the coordinator.
   - The watcher is not modified — the integration reads its output through
     typed indexes and events.

5. **Error taxonomy:**
   - `QUEUE_FULL` — queue has reached its configured maximum size.
   - `QUEUE_CYCLE_ACTIVE` — another cycle is active; dequeue is not permitted.
   - `QUEUE_DUPLICATE_EVENT` — correlation ID already processed.
   - `CURSOR_ADVANCE_BLOCKED` — effect outcome event not yet fsynced.
   - `CURSOR_STALE` — cursor file references an event not found in the journal.
   - `REPLAY_UNCERTAIN_OUTCOME` — prior cycle outcome is uncertain; escalation
     required.
   - `REPLAY_CYCLE_ORPHANED` — active cycle has no corresponding trigger.
   - `WATCHER_NO_EVENTS` — poll found no new durable events since cursor.

## Expected Ownership

- `src/foundation/CoordinatorQueue.ts` — owns queue creation, enqueue/dequeue
  with stable priority, queue persistence, and duplicate suppression.
- `src/foundation/CoordinatorReplay.ts` — owns cursor management with fsynced
  advance, interrupted-cycle recovery, uncertain-outcome escalation, and
  watcher-to-coordinator integration.
- No other module may advance the cursor, enqueue coordinator triggers, or
  recover interrupted cycles.

## Tests And Evidence

- **Stable priority:** Enqueue a D2 routine event, a safety escalation, and a
  D1 operator request in that order. Prove dequeue returns: safety, operator,
  routine.
- **FIFO within class:** Enqueue two routine events. Prove they dequeue in
  insertion order.
- **Stable tie-break:** Enqueue two events with identical timestamp and class.
  Prove stable ordering by sequence number.
- **Duplicate suppression:** Enqueue an event with correlation ID X. Complete
  the cycle. Enqueue another event with correlation ID X. Prove the second is
  suppressed.
- **Cursor fsync:** Complete a cycle with a verified effect outcome. Advance
  the cursor. Verify the cursor file reflects the new event ID only after the
  outcome event is fsynced. Simulate a crash between effect verification and
  journal fsync. On restart, prove the cursor did not advance.
- **Interrupted at each phase:** Simulate a crash at every cycle phase
  (requested, routed, proposal-received, effect-prepared, effect-attempted,
  effect-verified). On restart, prove correct recovery at each phase.
- **Uncertain outcome replay:** Create a cycle whose effect outcome is
  `uncertain`. On restart, prove the replay manager creates an escalation
  cycle referencing the uncertain one and does not advance the cursor.
- **Watcher poll:** Generate new watcher events. Poll through the integration.
  Prove events are deduplicated, classified, and enqueued.
- **M0 bypass:** Generate an M0-classified event. Prove it is handled directly
  through routing (not enqueued for a decision cycle).
- **Model-free proof:** No model invocation in queue, cursor, or replay logic.

## What Must Not Change

- Do not modify the watcher runtime or the watcher's output format.
- Do not modify CA-05 routing policy or CA-10 effect executor.
- Do not create a second cursor or queue authority.
- Do not advance the cursor without confirmed effect journal write.

## Review Procedure Highlights

1. Independently verify stable priority ordering for all class combinations.
2. Prove cursor never advances before effect journal fsync.
3. Simulate crashes at every cycle phase and prove correct recovery.
4. Prove duplicate suppression by correlation ID.
5. Prove M0 triggers bypass the queue through routing.

---

## Required Reasoning Posture

The queue and cursor are the lane's durable progress boundary. A cursor advance
before confirmed journal write loses effects. Incorrect interrupted-cycle
recovery produces lost state or double effects. Priority-ordering regression
stalls safety escalations behind routine work. The implementor must reason
about every crash point, every concurrent-access scenario, and every ordering
edge case.

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
3. Targeted test results for every required proof above.
4. Crash-recovery evidence at every cycle phase.
5. Cursor fsync verification — cursor never advances before confirmed write.

## Completion And Handoff

- Implementation report, updated tracker/roadmap.
- CA-11 and CA-12 effect adapters confirmed compatible with the replay.
- CA-14 will build commands on top of this queue/cursor/replay foundation.
- Leave the exact queue priority algorithm, cycle recovery state machine,
  and cursor contract for the next agent.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **watcher/coordinator TaskHandlers**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/CA-13-coordinator-queue-cursor-replay-and-watcher-integration.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-03`, `CA-05`, `CA-10`–`CA-12`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Stable priority; impact-scoped blocker with unrelated progress; activation invalidation; interrupted/duplicate/uncertain replay**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **watcher/coordinator TaskHandlers** and **Stable priority; impact-scoped blocker with unrelated progress; activation invalidation; interrupted/duplicate/uncertain replay**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-coordinator-automation/CA-13-coordinator-queue-cursor-replay-and-watcher-integration.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
