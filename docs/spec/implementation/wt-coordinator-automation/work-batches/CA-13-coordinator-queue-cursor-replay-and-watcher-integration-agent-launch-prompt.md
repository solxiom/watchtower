# Agent Launch Prompt — Work Batch CA-13

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5` — strongest required for queue priority ordering, fsynced cursor semantics, interrupted-cycle recovery state machine, uncertain-outcome escalation, and watcher-to-coordinator integration
- agent suitability: `high for durable queue/cursor implementation and crash-recovery state machine work`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto` — must be steered away from cursor-advance-before-fsync errors and missing recovery phases
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration — insufficient for crash-recovery state-machine reasoning
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. CA-13 is R5 because the queue and
cursor are the lane's durable progress boundary — cursor-advance-before-fsync,
incorrect crash recovery, or priority-ordering regression creates unrecoverable
lane corruption or lost effects. Select a currently available agent that can
load the complete brief/spec/source context, reason about concurrent-lane
safety and crash semantics, and run the required proof without replacing
evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, or cross-module
  integration closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch CA-13** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch implements the coordinator event queue with stable priority ordering,
fsynced cursor advance, interrupted-cycle and duplicate-event handling,
uncertain-outcome replay, and watcher integration. This is the durable progress
boundary for the entire coordinator.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-13-coordinator-queue-cursor-replay-and-watcher-integration.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/coordinator-automation.md` §14 — watcher and queue model
5. `docs/spec/coordinator-automation.md` §20 — failure semantics
6. `docs/spec/coordinator-automation.md` §9.7 — freshness and rebuild
7. `docs/spec/v1-contracts.md` §11 — cycle lifecycle, locking, cursor contract
8. Accepted CA-03 runtime journal indexes (for polling watcher output)
9. Accepted CA-05 ordered routing policy
10. Accepted CA-10 atomic effect executor (for effect journal reads)
11. Accepted CA-11 tmux adapter and CA-12 Git adapter (for external-effect journals)
12. the canonical source owners you will actually work with:
    - `src/foundation/coordinator-queue.ts` (create)
    - `src/foundation/coordinator-replay.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5` — strongest required for queue priority ordering, fsynced cursor semantics, interrupted-cycle recovery state machine, uncertain-outcome escalation, and watcher-to-coordinator integration
- agent suitability: `high for durable queue/cursor implementation and crash-recovery state machine work`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, types, errors, tests, and status artifacts affected by this batch.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. Map the complete cycle lifecycle state machine (requested → routed → invoked →
   proposed → validated → effect-prepared → effect-attempted → effect-verified →
   complete). For every phase, define the recovery action after a crash.
4. Define the exact cursor-advance precondition: the effect outcome event must
   be confirmed durably written (fsynced) in the journal. Prove that the cursor
   never advances without this condition.
5. Enumerate every concurrent-access scenario: what happens if two processes
   attempt to dequeue simultaneously? What if the watcher writes while the
   coordinator dequeues?
6. Use counterexamples: identify at least one plausible cursor-before-fsync bug
   and at least one missing recovery-phase bug, then ensure focused proof rejects
   them.
7. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
8. Treat predecessor reports as leads, not proof. Re-open the actual changed
   files and reproduce all acceptance-critical evidence from the current tree.

## Structural Design And Module-Size Gate

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- Front doors and public barrels target 160 lines or fewer. Files from 161
  through 220 lines require an explicit cohesion justification. A hand-maintained
  front door over 220 lines is rejectable without a narrow pre-existing
  constraint, and no front door may exceed 300 lines.
- Focused implementation modules target 220 lines or fewer. Files from 221
  through 300 lines require a responsibility inventory and independent reviewer
  scrutiny. Files from 301 through 350 lines are expected to split; acceptance
  requires a source-backed reason why splitting would reduce ownership clarity.
  New or materially rewritten implementation modules above 350 lines are rejected.
- Four hundred physical lines is the absolute ceiling for every hand-maintained
  JS/TS source or spec module touched by this lane. The ceiling does not make a
  mixed-responsibility file acceptable.
- Split a module below those thresholds when it owns three or more independently
  nameable concerns.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
  Use feature-local capsules with explicit owner names.
- Record physical line counts for every new or materially rewritten file. The
  reviewer must independently verify warning-band files and reject unjustified
  growth.

## Your Mission

Implement the coordinator queue, cursor, replay, and watcher integration:

1. Create `src/foundation/coordinator-queue.ts` with `CoordinatorQueue`, stable
   priority ordering (safety > operator > routine, FIFO within class,
   sequence-number tie-break), queue persistence to JSON, duplicate suppression
   by correlation ID, and enqueue/dequeue/peek operations.
2. Create `src/foundation/coordinator-replay.ts` with `CursorManager` (fsynced
   cursor advance — only after confirmed effect journal write), interrupted-cycle
   recovery for every cycle lifecycle phase, uncertain-outcome escalation
   (do not advance cursor), and `WatcherPoller` for typed watcher integration
   through CA-03 runtime indexes.
3. M0 triggers flow directly to routing (CA-05) — never enqueued for a decision
   cycle. D1–D3 triggers are enqueued.
4. Write focused Jasmine specs covering: stable priority ordering (all class
   combinations, FIFO within class, tie-break), duplicate suppression, cursor
   fsync gating (advance blocked without confirmed write), crash at every cycle
   phase and correct recovery, uncertain-outcome replay escalation, watcher
   poll and deduplication, and M0 bypass proof.
5. Produce implementation report, update tracker/roadmap, leave handoff.

## What You Must Not Do

- Do not advance the cursor before the effect outcome event is fsynced.
- Do not skip a recovery phase in the interrupted-cycle state machine.
- Do not modify the watcher runtime, CA-05 routing, or CA-10 effect executor.
- Do not create a second cursor or queue authority.
- Do not invoke models.
- Do not add npm scripts or NVB tasks.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- stable priority: safety > operator > routine, FIFO within class, tie-break by
  sequence number
- duplicate suppression by correlation ID
- cursor advances only after confirmed effect journal write (fsync)
- cursor does NOT advance when outcome event is not fsynced
- crash recovery at every cycle phase: requested, routed, proposal-received,
  effect-prepared, effect-attempted, effect-verified
- uncertain outcome creates escalation cycle, does not advance cursor
- watcher poll deduplicates and classifies events correctly
- M0 events bypass queue through routing
- `nvb build` passes
- `nvb test` passes
- exact proof commands used
- final `git status --short`
- proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- cursor advances only after confirmed effect journal fsync
- interrupted-cycle recovery covers every lifecycle phase
- duplicate events suppressed by correlation ID
- priority ordering is deterministic for identical queue state
- M0 never enters the decision queue
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-13-coordinator-queue-cursor-replay-and-watcher-integration.md`

The report must include:

- documents studied
- exact files changed
- exact owners introduced or modified
- physical line counts for every new source/spec file
- proof commands and outcomes
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact priority-ordering algorithm, the complete cycle-recovery state
machine (action per phase), the cursor-advance precondition contract, and the
watcher integration interface. Note that CA-14 will build coordinator commands
on top of this foundation. Confirm that CA-11 and CA-12 effect adapters are
correctly consumed by the replay manager.
