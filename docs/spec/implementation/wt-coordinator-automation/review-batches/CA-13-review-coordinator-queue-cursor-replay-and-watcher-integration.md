# Review Batch CA-13 — Coordinator Queue, Cursor, Replay, and Watcher Integration

Status: ❌ Not started
Paired work batch: CA-13
Reviewer owns the acceptance commit.

## Scope Verification

1. **File ownership:** Verify `src/foundation/coordinator-queue.ts` and
   `src/foundation/coordinator-replay.ts` are the only new files. No other
   module gained cursor-management or queue-authority capability.
2. **Dependency direction:** Verify the queue and replay modules depend on
   CA-03 runtime indexes, CA-05 routing, CA-10 effect journal, and CA-11/CA-12
   external-effect journals. No dependencies flow in reverse. No watcher
   internals were modified.
3. **Spec compliance:** Queue priority ordering matches
   `coordinator-automation.md §14` (safety > operator > routine, FIFO within
   class). Cursor advance requires confirmed effect journal write
   (`coordinator-automation.md §14` step 10). Interrupted-cycle recovery
   covers all lifecycle phases (`v1-contracts.md §11`). Duplicate suppression
   by correlation ID. M0 events bypass the queue.
4. **Layer integrity:** No coordinator policy, semantic judgment, or model
   invocation in queue/cursor/replay logic. No direct shell or Git access.
5. **No second authority:** Verify exactly one queue file and one cursor file.
   No alternative dequeue or cursor-advance path.

## Required Independent Proof

- **Priority ordering:** Independently construct queue states with every class
  combination. Prove safety always dequeues first, then operator, then routine.
- **FIFO within class:** Enqueue three routine events in order. Prove they
  dequeue in the same order.
- **Tie-break stability:** Enqueue two events with identical timestamp and
  class. Prove ordering is stable by sequence number.
- **Duplicate suppression:** Process event with correlation ID X. Enqueue
  another with same ID. Prove the second is suppressed.
- **Cursor fsync gate:** Complete a cycle through effect-verified. Advance
  cursor. Verify cursor file updates only after the effect outcome event is
  confirmed fsynced. Artificially delay the fsync. Prove cursor does not
  advance until fsync completes.
- **Crash at each phase:** For every cycle lifecycle phase (requested, routed,
  proposal-received, effect-prepared, effect-attempted, effect-verified),
  simulate a process kill at that phase. Restart through the replay manager.
  Prove correct recovery action at each phase:
  - Requested: re-routes.
  - Routed: re-invokes if within budget.
  - Proposal-received: re-validates against current state.
  - Effect-prepared: re-attempts with idempotency check.
  - Effect-attempted: runs verify phase; escalates if uncertain.
  - Effect-verified: marks cycle complete.
- **Uncertain-outcome replay:** Create a cycle whose effect outcome is
  `uncertain`. Kill the process. Restart. Prove the replay manager creates
  an escalation cycle and does NOT advance the cursor.
- **Watcher integration:** Generate structured watcher events. Poll through
  the integration. Prove events are deduplicated by correlation ID, classified
  by trigger class, and correctly enqueued (D1–D3) or routed directly (M0).
- **Build and test:** Run `nvb build` and `nvb test` independently. Verify
  zero failures.
- **Model-free audit:** grep queue and replay source for model invocation.
  Prove none exist.
- **Layer audit:** Verify no imports from CLI, session, or attachment modules.

## Required Reasoning Posture

The reviewer must independently reason through every crash point in the full
cycle lifecycle. The reviewer must prove that no sequence of enqueue/dequeue/
crash/restart operations can advance the cursor without a confirmed effect
journal write or create a lost effect. The reviewer must prove priority ordering
is deterministic and impenetrable to insertion-order accidents.

## Structural And Module-Size Acceptance

- `src/foundation/coordinator-queue.ts` ≤250 lines. Verify physical line count.
  At 201+, require a responsibility inventory.
- `src/foundation/coordinator-replay.ts` ≤300 lines (≤350 with warning-band
  justification). Verify physical line count and responsibility inventory.
  Verify the recovery state machine is clearly structured and auditable.
- Test modules ≤300 lines. Verify split by concern family.

## Required Review Packet

1. Independent priority-ordering verification for all class combinations.
2. Independent crash-recovery proof at every lifecycle phase.
3. Independent cursor-advance-without-fsync negative proof.
4. Duplicate-suppression verification.
5. M0 bypass proof.
6. `nvb build` and `nvb test` output.
7. Model-free and layer-integrity audit results.

## Acceptance Gate

The batch is accepted only when:
- Priority ordering is deterministic and matches spec (safety > operator > routine).
- Cursor advances ONLY after confirmed effect journal fsync.
- Cursor does NOT advance without fsynced outcome event.
- Crash recovery is correct at every lifecycle phase.
- Duplicate events are suppressed by correlation ID.
- Uncertain outcomes escalate without advancing the cursor.
- M0 events bypass the queue through routing.
- Watcher integration deduplicates and classifies correctly.
- `nvb build` and `nvb test` pass independently.
- Zero model invocations in queue/cursor/replay logic.
- Layer dependencies are correct.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Reject Conditions

Reject immediately if:
- The cursor advances without a confirmed effect journal write.
- Any crash-recovery phase is skipped or incorrect.
- Priority ordering is non-deterministic or diverges from spec.
- M0 events are enqueued for a decision cycle.
- A second cursor or queue authority exists.
- The queue/ replay invokes a model.
- Build or tests fail.
- `.local/` artifacts are staged.
- The implementation agent committed.
- Any file exceeds the structural ceiling without documented reviewer acceptance.
