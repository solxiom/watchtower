# Agent Launch Prompt — Work Batch CA-03

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
15. Accepted DB-01 storage adapter — SQLite driver and typed storage boundary
16. the canonical source owners you will actually change:
    - `src/foundation/journal-wal.ts` (create)
    - `src/foundation/journal-index.ts` (create)
    - `src/foundation/journal-projection.ts` (create)
    - `spec/basic/journal-index-spec.ts` (create)
    - `spec/basic/journal-projection-spec.ts` (create)

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

Build SQLite-backed journal indexes with WAL-mode projections:

1. Create `src/foundation/journal-wal.ts` — owns WAL-mode SQLite access for
   journal indexes. Single writer / concurrent reader contract. WAL checkpoint
   and close semantics. Uses DB-01 storage adapter. No raw SQLite primitives
   exposed to consumers.

2. Create `src/foundation/journal-index.ts` — owns the derived SQLite journal
   index. Implements: `journal_event` and `journal_checkpoint` tables,
   `appendEvents` (incremental from authoritative JSONL), `readEvent`,
   `readEvents`, `readLatestEvent`, `latestSequence`, `getCheckpoint`,
   `verifyCheckpoint`, `rebuildIndex` (staged: temp DB → verify → atomic
   rename), and `detectCorruption`. Validates sequence continuity before insert.
   Handles partial-tail: excludes from index, blocks mutations, rebuild from
   authoritative JSONL.

3. Create `src/foundation/journal-projection.ts` — owns all deterministic
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
- Partial tail detected, mutations blocked, rebuild removes only incomplete tail
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
