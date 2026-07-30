# Agent Launch Prompt — Work Batch CA-03

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
- agent suitability: `high for SQLite-backed journal indexing, WAL concurrency, and staged rebuild from authoritative JSONL`
- primary: `GPT-5.4`, `Claude Opus 4.1`, `Claude Sonnet 4.6`
- good alternatives: `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
that can load the complete brief/spec/source context, inspect and edit the
repository with tools, reason across contract boundaries, and run the required
proof without replacing evidence with narrative confidence.

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

You are assigned **implementation work batch CA-03** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch builds SQLite-backed journal indexes that checkpoint worker events,
coordinator decisions, and effect records — single writer with WAL-mode readers,
incremental append, corruption detection, and staged rebuild from authoritative
append-only journals.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-03-runtime-sqlite-indexes-and-projections.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md`
5. `docs/spec/v1-contracts.md` — especially §8A (derived SQLite storage, WAL), §9 (event/queue/cursor/replay)
6. `docs/spec/architecture.md` — especially §4.8 (coordinator decision plane services)
7. `docs/spec/coordinator-automation.md` — especially §9 (pack index, runtime indexes), §18 (durable coordinator events)
8. `docs/spec/schemas/v1.schema.json` — `durableEvent` definition
9. `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`
10. `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
11. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
12. `docs/spec/v1-implementation-map.md` — section 8 (CA-03)
13. Accepted RM-05 event parser — `DurableEvent` type, event vocabulary, sequence numbering, partial-line handling
14. Accepted CA-02 `IndexStore` and `IndexQuery` contracts — typed query boundary
15. Accepted DB-01 focused SQLite ports and driver capsule — including the
    recorded driver decision, lifecycle, concurrency, and typed failures
16. the canonical source owners you will actually change:
    - `src/foundation/JournalWal.ts` (create)
    - `src/foundation/JournalIndex.ts` (create)
    - `src/foundation/JournalProjection.ts` (create)
    - `spec/basic/journalIndex.spec.ts` (create)
    - `spec/basic/journalProjection.spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for SQLite-backed journal indexing and WAL concurrency`
- primary: `GPT-5.4`, `Claude Opus 4.1`, `Claude Sonnet 4.6`
- good alternatives: `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   journal SQLite schema, WAL-mode contract, checkpoint mechanics, projection
   methods, and rebuild stages.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, failure precedence, concurrency
   or re-entrancy risks, compatibility constraints, and deliberately unsupported
   behavior before choosing or evaluating a design. Pay special attention to:
   single writer with WAL-mode concurrent readers; authoritative JSONL is
   never modified by rebuild; corruption triggers staged rebuild.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating ownership, safety, or public result
   semantics, then ensure focused proof rejects it.
5. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
6. Treat predecessor reports as leads, not proof. Re-open the actual changed
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

Build SQLite-backed journal indexes with WAL-mode projections:

1. Create `src/foundation/JournalWal.ts` — owns WAL-mode SQLite access for
   journal indexes. Single writer / concurrent reader contract. WAL checkpoint
   and close semantics. Uses DB-01's focused journal-index SQLite port. No
   selected-driver primitive or driver-specific SQL is exposed to consumers.

2. Create `src/foundation/JournalIndex.ts` — owns the derived SQLite journal
   index. Implements: `journal_event` and `journal_checkpoint` tables,
   `appendEvents` (incremental from authoritative JSONL), `readEvent`,
   `readEvents`, `readLatestEvent`, `latestSequence`, `getCheckpoint`,
   `verifyCheckpoint`, `rebuildIndex` (staged: temp DB → verify → atomic
   rename), and `detectCorruption`. Validates sequence continuity before insert.
   Handles partial-tail: excludes it from the derived index, blocks mutations,
   and rebuilds only from the complete prefix without modifying authoritative
   JSONL.

3. Create `src/foundation/JournalProjection.ts` — owns all deterministic
   projections from journal-index state. Implements: `projectCycleStatus`,
   `projectBatchStatus`, `projectLaneSummary`, `projectReadySet`. All read
   through `JournalIndex` typed methods. Uses WAL-mode concurrent reads.

4. Implement the complete error taxonomy: `JOURNAL_NOT_FOUND`,
   `JOURNAL_CORRUPT_TAIL`, `JOURNAL_SEQUENCE_GAP`,
   `JOURNAL_CHECKPOINT_MISMATCH`, `JOURNAL_INVALID_RECORD`,
   `JOURNAL_ENTRY_NOT_FOUND`, `JOURNAL_REBUILD_REQUIRED`,
   `JOURNAL_INDEX_CORRUPT`, `JOURNAL_STORE_UNAVAILABLE`.

5. Write focused Jasmine specs covering: incremental append, checkpoint
   verification, WAL concurrent reads, partial tail detection and rebuild,
   sequence gap detection, invalid record rejection, corruption detection and
   staged rebuild, rebuild idempotency, all projections with fixture data,
   deterministic projections, bounded reads, and authoritative JSONL never
   modified by rebuild.

## What You Must Not Do

- Do not read raw journal files from projection code.
- Do not write to the authoritative JSONL journal from the index or projection
  modules (journal writing is owned by the effect executor, CA-10).
- Do not expose raw SQLite primitives to consumers of journal-index or
  journal-projection.
- Do not conflate index state with projection output.
- Do not modify RM-05 event parser types or `DurableEvent` schema.
- Do not invoke any model, LLM, or AI.
- Do not modify `src/cli.ts` or any command file.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- `nvb build` passes
- `nvb test` passes
- Incremental append advances checkpoint correctly after each event
- Checkpoint verification: re-read authoritative JSONL → `verifyCheckpoint()` passes
- WAL concurrent reads: writer appending, reader querying → no SQLITE_BUSY
- Partial tail detected, complete prefix indexed, mutations blocked, and
  authoritative JSONL remains byte-for-byte unchanged during rebuild
- Sequence gap detected and append blocked
- Invalid record rejected
- Corruption detected → `JOURNAL_INDEX_CORRUPT` → queries blocked
- Staged rebuild restores correct state from authoritative JSONL
- Rebuild idempotent: interrupted and retried → final state is correct
- All projections produce correct output from fixture data
- Deterministic projections: identical input → identical output
- Bounded reads: projections use `JournalIndex` typed reads, no raw SQL scans
- Authoritative JSONL never modified by index or rebuild operations
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

- Projections read only through `JournalIndex` typed methods; never raw JSONL
  and never raw SQL.
- Journal index and WAL module never write to the authoritative JSONL journal.
- Checkpoint integrity verified at every restore point and on open.
- Partial-tail detection blocks mutations until rebuild.
- Corruption triggers staged rebuild from authoritative JSONL — the JSONL is
  never modified.
- Single writer with WAL-mode concurrent readers.
- Model-free — no model invocation through any code path.
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-03-runtime-sqlite-indexes-and-projections.md`

The report must include:

- documents studied
- exact files changed
- exact owners introduced or modified
- physical line counts for every new source/spec file
- responsibility inventories for warning-band files
- proof commands and outcomes
- negative-path and failure-injection evidence
- any unresolved limitations stated honestly
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

State: which files were created/changed, the journal SQLite schema (all tables),
the WAL-mode contract (single writer, concurrent readers), the staged rebuild
algorithm (temp DB → verify → atomic rename), which proofs passed, confirmation
that authoritative JSONL is never modified, and what the CA-04 (ready set and
resource-claim projection) agent needs to know about the journal index interface
and the `JournalProjection` methods.
