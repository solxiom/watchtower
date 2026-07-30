# Agent Launch Prompt — Work Batch CA-13

## Governing Contract And Precedence — Mandatory

This prompt is an execution aid, not product authority. Resolve conflicts in
this order and stop for a specification amendment rather than inventing
behavior:

1. `docs/spec/v1-contracts.md` and `docs/spec/schemas/v1.schema.json`
2. `docs/spec/v1.md`
3. `docs/spec/nirvana-integration-architecture.md`,
   `docs/spec/coordinator-automation.md`, `docs/spec/operator-session.md`, and
   `docs/spec/cli-session.md` within their scopes
4. `docs/spec/architecture.md`
5. `docs/development/engineering-and-review-standard.md`
6. `AGENTS.md`
7. the accepted implementation map, pack rules, and this batch brief

The implementation/review agent must read the mandatory engineering standard
and Nirvana integration architecture in full. A stale path, module suggestion,
or technical mechanism in this prompt must be corrected to the governing
contract while preserving the batch objective and proof obligations.

## Nirvana-First And NVB Execution Gate — Mandatory

- Complete and report the required Nirvana API usage audit before introducing
  infrastructure or bare Node behavior.
- Commands use Nirvana command, argument, pretty, and terminal-view APIs and
  remain thin.
- Public reason codes, exit mappings, event names, and schema identifiers remain
  owned by accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`. A
  batch-local symbolic name is not automatically public; reconcile it with the
  registry, and update the owning contract/schema in the same batch when a new
  public identifier is genuinely required.
- Use the Nirvana storage facade for ordinary managed-root operations only
  after CLI-safe root/bootstrap semantics are proved. Atomic durability,
  canonical path security, locking, append-only journals, ownership/modes, and
  SQLite stay behind focused adapters when the facade lacks required semantics.
- Use the Nirvana logger only through the Watchtower logging boundary for
  redacted diagnostics. Logs are never command output, lifecycle events,
  acceptance evidence, or authoritative journals.
- Substantial deterministic workflows use the immutable packaged Watchtower
  NVB catalog, focused TaskHandlers, and task groups.
- `LaneTaskRunner` is the only internal NVB invocation boundary. Task selection
  is an allowlisted Watchtower action mapping, never an arbitrary user/agent
  task name or parent-project discovery.
- Never create or modify a participating repository's root `nvb.json`.
- Shell is restricted to checksum-manifested leaf adapters for tmux, Git, or
  external tools when no conforming Nirvana API exists. Workflow-level shell is
  a hard reject.
- Mutating tasks do not gain authority from NVB. They require the normal
  Watchtower effect executor, current-state validation, locks, idempotency, and
  a valid single-use invocation envelope.

## Project-Wide Structural And Size Gate — Mandatory

Apply the exact limits in
`docs/development/engineering-and-review-standard.md`; pack-local numbers may
be stricter but may never relax them:

- CLI entry, command, or NVB task: preferred at most 120 lines, warning at
  121–160, hard reject over 180.
- Orchestrator, controller, or renderer shell: preferred at most 140 lines,
  warning at 141–180, hard reject over 200.
- Foundation service, planner, validator, adapter, or store: preferred at most
  200 lines, warning at 201–260, hard reject over 300.
- Contract/type/schema registry: preferred at most 240 lines, warning at
  241–320, hard reject over 400.
- Test/spec module: preferred at most 300 lines, warning at 301–420, hard reject
  over 500.
- Function: target at most 40 lines, justification at 41–60, reject over 80.
- Constructor: target at most 25 lines, warning at 26–40, reject over 50.

Passing a line limit never excuses mixed responsibilities, a god object,
generic helper bag, hidden cycle, foreign API laundering, or layer violation.
Use `PascalCase` for classes/class-owning files, `lowerCamelCase` for non-class
modules and directories, and never introduce dashed or underscored backend
source/spec names.

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
    - `src/foundation/CoordinatorQueue.ts` (create)
    - `src/foundation/CoordinatorReplay.ts` (create)

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

## Your Mission

Implement the coordinator queue, cursor, replay, and watcher integration:

0. Implement focused packaged TaskHandlers for bounded trigger ingestion,
   mechanical queue maintenance, checkpoint/cursor persistence, and replay
   probes where the accepted catalog contracts fit. Application services keep
   priority policy, cycle state, effect authority, and journal truth. Calls
   cross `LaneTaskRunner`; mutating mechanics require a CA-10 single-use
   envelope. No workflow-level shell or direct NVB/executable call is allowed.

1. Create `src/foundation/CoordinatorQueue.ts` with `CoordinatorQueue`, stable
   priority ordering (safety > operator > routine, FIFO within class,
   sequence-number tie-break), queue persistence to JSON, duplicate suppression
   by correlation ID, and enqueue/dequeue/peek operations.
2. Create `src/foundation/CoordinatorReplay.ts` with `CursorManager` (fsynced
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
- Do not add npm scripts, public/project-root tasks, or unrelated catalog
  tasks. This batch must implement the focused packaged coordinator/watcher
  TaskHandlers assigned by the implementation map; workflow-level shell is
  forbidden.
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
