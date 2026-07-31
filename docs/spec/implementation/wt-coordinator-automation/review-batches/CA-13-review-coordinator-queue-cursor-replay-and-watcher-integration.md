# Review Batch CA-13 — Coordinator queue, cursor, replay, and watcher task integration

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
Paired work batch: CA-13
Reviewer owns the acceptance commit.

## Scope Verification

1. **File ownership:** Verify `src/foundation/CoordinatorQueue.ts` and
   `src/foundation/CoordinatorReplay.ts` are the only new files. No other
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

## Mandatory Task Integration Proof

Trace each packaged coordinator/watcher TaskHandler through `LaneTaskRunner`
and, for mutations, a valid CA-10 single-use envelope. Verify handlers own only
bounded mechanics and structured results while application services retain
priority, cycle state, effect authority, and journal truth. Prove interrupted,
duplicate, and uncertain task results replay from authoritative journals
without envelope reuse or duplicated completed effects. Reject workflow-level
shell and direct NVB/executable calls.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **watcher/coordinator TaskHandlers**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-13-coordinator-queue-cursor-replay-and-watcher-integration-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-03`, `CA-05`, `CA-10`–`CA-12`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Stable priority; impact-scoped blocker with unrelated progress; activation invalidation; interrupted/duplicate/uncertain replay**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **watcher/coordinator TaskHandlers** and **Stable priority; impact-scoped blocker with unrelated progress; activation invalidation; interrupted/duplicate/uncertain replay**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-13-coordinator-queue-cursor-replay-and-watcher-integration-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-13-coordinator-queue-cursor-replay-and-watcher-integration-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
