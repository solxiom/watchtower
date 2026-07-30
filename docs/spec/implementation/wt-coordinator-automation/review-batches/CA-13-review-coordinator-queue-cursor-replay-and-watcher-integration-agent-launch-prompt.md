# Agent Launch Prompt — Review Batch CA-13

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
    - `src/foundation/CoordinatorQueue.ts`
    - `src/foundation/CoordinatorReplay.ts`
    - all new spec files under `spec/`

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

## Mandatory Task Integration Proof

Trace packaged coordinator/watcher TaskHandlers through `LaneTaskRunner` and a
valid CA-10 envelope for mutations. Verify mechanical-only ownership,
structured results, journal-based replay without envelope reuse/duplicate
effect, no workflow shell, and no direct NVB/executable call.

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
