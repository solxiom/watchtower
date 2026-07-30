# Agent Launch Prompt — Review Batch CA-13

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5` — strongest required for verifying cursor-advance-without-fsync safety, crash-recovery state-machine completeness, priority-ordering determinism, and uncertain-outcome escalation correctness
- agent suitability: `high for durable queue/cursor review and crash-recovery state-machine audit`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration — insufficient for crash-recovery state-machine audit
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying priority-ordering determinism, cursor-advance
fsync safety, crash-recovery completeness at every lifecycle phase, duplicate
suppression, uncertain-outcome escalation, and M0 bypass without trusting the
implementation report.

You are assigned **review batch CA-13** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-13-review-coordinator-queue-cursor-replay-and-watcher-integration.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-13-coordinator-queue-cursor-replay-and-watcher-integration.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-13-coordinator-queue-cursor-replay-and-watcher-integration.md` (implementation report)
6. `docs/spec/coordinator-automation.md` §14 — watcher and queue model
7. `docs/spec/coordinator-automation.md` §20 — failure semantics
8. `docs/spec/v1-contracts.md` §11 — cycle lifecycle, cursor contract
9. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
10. the actual changed source files:
    - `src/foundation/coordinator-queue.ts`
    - `src/foundation/coordinator-replay.ts`
    - all new spec files under `spec/`

## Your Review Mission

Independently verify that the coordinator queue, cursor, and replay system is
safe, complete, and correct:

1. **Priority-ordering audit:** Independently construct queue states mixing
   safety, operator, and routine events in every permutation. Prove deterministic
   dequeue order: safety always first, then operator, then routine. Within a
   class, prove FIFO. Prove stable tie-break by sequence number for identical
   timestamps.
2. **Cursor-advance audit:** Independently step through a complete cycle.
   Prove the cursor file updates ONLY after the effect outcome event is
   confirmed durably written. Artificially delay the fsync to prove the cursor
   does not advance ahead of the journal. Simulate a crash between effect
   verification and journal fsync; on restart, prove the cursor did not
   advance.
3. **Crash-recovery audit:** For every lifecycle phase (requested, routed,
   proposal-received, effect-prepared, effect-attempted, effect-verified),
   independently simulate a crash. On restart, prove the replay manager takes
   the correct recovery action. Prove no phase is skipped and no action results
   in a lost or double-applied effect.
4. **Uncertain-outcome audit:** Independently create a cycle whose effect
   outcome is `uncertain`. Restart. Prove the replay manager creates an
   escalation cycle referencing the uncertain one and does NOT advance the
   cursor past the uncertain event.
5. **Duplicate-suppression audit:** Independently enqueue an event with
   correlation ID X, process it completely, then enqueue another event with
   the same correlation ID. Prove the second is suppressed and the prior cycle
   ID is returned.
6. **M0 bypass audit:** Independently feed M0-classified events. Prove they
   are routed directly through CA-05 and never appear in the queue.
7. **Watcher-integration audit:** Independently generate watcher events,
   poll through the integration, and verify correct classification and
   deduplication.
8. **Model-free verification:** grep the queue and replay source for any
   model or provider invocation. Prove none exist.
9. **Layer integrity:** Verify imports only from accepted foundation modules
   and contracts. No CLI, session, or attachment imports.
10. **Hard-reject checklist:** Verify every hard-reject condition. Reject
    immediately if any item flags.
11. **Build and test:** Run `nvb build` and `nvb test` independently. Record
    exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without independently simulating a crash at every lifecycle
  phase.
- Do not accept without proving the cursor never advances before fsync.
- Do not accept if M0 events are enqueued.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently verify priority ordering for all class combinations.
- Independently simulate crashes at every lifecycle phase and verify recovery.
- Independently verify cursor advance is gated by fsynced outcome event.
- Independently verify uncertain outcome creates escalation without cursor
  advance.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- Priority ordering is deterministic and matches spec.
- Cursor advances ONLY after confirmed effect journal fsync.
- Crash recovery is correct at every lifecycle phase.
- Duplicate events are suppressed by correlation ID.
- Uncertain outcomes escalate without advancing the cursor.
- M0 events bypass the queue.
- Build and tests pass independently.
- Zero model invocations in queue/cursor/replay logic.
- Layer dependencies are correct.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-13-correction-01.md` with exact required fixes.
The correction brief must include: rejection reasons with source locations,
expected corrected state, required additional proof, exact files to change,
and reference to this review.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- the reviewer is the acceptance authority; independent proof is mandatory
- accept only when all criteria are satisfied
- if rejecting, create a correction brief with exact required fixes
- do not add `.local` artifacts to git
- the reviewer owns the acceptance commit; the implementation agent never commits
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one review report to:
- `.local/agent-reports/coordinator-automation/reviews/CA-13-coordinator-queue-cursor-replay-and-watcher-integration-review.md`

Include: documents studied, independent proof reruns and outcomes, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
CA-13: Coordinator queue, cursor, replay, and watcher integration accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified priority-ordering contract, complete
crash-recovery phase coverage, cursor-fsync-gate evidence, uncertain-outcome
escalation path, and M0 bypass verification. Confirm that CA-14 may now build
commands on this foundation and that the critical path to CA-18 is unblocked.
