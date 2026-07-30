# Agent Launch Prompt — Review Batch CA-15

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

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for session-persistence audit, lifecycle state-machine verification, crash-safe journal validation, and concurrency-enforcement audit`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying the complete lifecycle state machine,
crash-safe journal appends, concurrency enforcement, multi-session isolation,
and immutable closed history without trusting the implementation report.

You are assigned **review batch CA-15** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-15-review-operator-session-persistence-and-lifecycle.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-15-operator-session-persistence-and-lifecycle.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-15-operator-session-persistence-and-lifecycle.md` (implementation report)
6. `docs/spec/operator-session.md` §6 — session lifecycle
7. `docs/spec/operator-session.md` §7 — session identity
8. `docs/spec/operator-session.md` §8 — turn processing
9. `docs/spec/operator-session.md` §20 — filesystem contract
10. `docs/spec/operator-session.md` §22 — durable events
11. `docs/spec/v1-contracts.md` §9 — operator-session types
12. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
13. the actual changed source files:
    - `src/foundation/SessionStore.ts`
    - `src/foundation/SessionLifecycle.ts`
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

Independently verify that operator-session persistence and lifecycle are correct,
safe, and complete:

1. **Session-creation audit:** Independently create a session. Verify
   `operator-session.json` matches the `operator-session.md §7` schema. Verify
   `journal.jsonl` contains the `operator-session-opened` event.
2. **Multi-session audit:** Independently create three sessions with different
   topics, origins, and policy profiles. Verify each has an independent
   directory, journal, and turn storage. Prove no cross-session leakage.
3. **Lifecycle state-machine audit:** Independently walk every valid
   transition path: open → active-turn → open → suspended → open → closed.
   Verify each transition writes the correct journal event. Independently
   test every illegal transition: closed → open, active-turn → closed
   (without turn completion), archived → open, pruned → anything. Verify
   every one is rejected.
4. **Concurrency audit:** Start a turn on session A. Independently attempt
   to start a second turn on session A from another process. Verify
   `OPERATOR_SESSION_TURN_ACTIVE` is returned.
5. **Immutable-closed-history audit:** Close a session. Independently attempt
   to modify an existing turn's `operator.md`, `response.json`, or
   `coordinator.md`. Verify every attempt is refused.
6. **Crash-safe journal audit:** Write multiple journal entries. Kill the
   process during a write. Independently restart and verify the journal is
   readable up to the last complete line. Verify the partial line is
   detectable. Verify subsequent appends work correctly.
7. **Fork audit:** Fork a closed session with explicit `--pins` and
   `--include-turn` inheritance. Verify the child has a distinct ID, the
   parent reference, and inherits only the explicitly requested items.
   Verify the parent is unchanged.
8. **Idempotent-transition audit:** Independently: suspend a suspended
   session (no-op), resume an open session (no-op), close a closed session
   (no-op). Verify no errors, no duplicate journal entries.
9. **Listing and pagination audit:** Independently create sessions in various
   states. Apply state, origin, and tag filters. Verify correct results.
   Test pagination with bounded limit and cursor.
10. **Model-free verification:** grep the store and lifecycle source for any
    model invocation. Prove none exist.
11. **Hard-reject checklist:** Verify every hard-reject condition. Reject
    immediately if any item flags.
12. **Build and test:** Run `nvb build` and `nvb test` independently. Record
    exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without independently walking the full lifecycle state machine.
- Do not accept without independently verifying crash-safe journal recovery.
- Do not accept if sessions are limited to one per lane.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently create multiple sessions and verify isolation.
- Independently walk every valid and invalid lifecycle transition.
- Independently simulate crash during journal write and verify recovery.
- Independently verify closed history is immutable.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- Multiple sessions per lane are independently addressable.
- Lifecycle state machine matches spec exactly.
- Every valid transition writes the correct journal event.
- Every illegal transition is rejected.
- One active turn per session is enforced.
- Closed history is immutable.
- Journal is crash-safe.
- Fork creates correct child with explicit inheritance.
- Idempotent transitions are no-ops.
- Build and tests pass independently.
- Zero model invocations.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-15-correction-01.md` with exact required fixes.
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
- `.local/agent-reports/coordinator-automation/reviews/CA-15-operator-session-persistence-and-lifecycle-review.md`

Include: documents studied, independent proof reruns and outcomes, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
CA-15: Operator-session persistence and lifecycle accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified lifecycle state-machine transitions,
multi-session isolation results, crash-safe journal evidence, and fork
correctness. Confirm that CA-16 may now build the SQLite session index on this
foundation and CA-17 may add routing/budgets/proposals/holds.
