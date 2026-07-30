# Agent Launch Prompt — Review Batch CA-16

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

- brief-declared reasoning level: `R5` — strongest required for verifying derived-store vs authority separation, excerpt-capping enforcement, non-transitive capsule boundaries, compaction non-destructiveness, and disposability proof
- agent suitability: `high for SQLite index audit, derived-store contract verification, excerpt-cap enforcement, and capsule-boundedness audit`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration — insufficient for SQLite schema and derived-store contract audit
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying the SQLite schema correctness, excerpt-cap
enforcement, cross-session capsule boundedness and non-transitivity, compaction's
journal-preservation guarantee, and the index disposability contract without
trusting the implementation report.

You are assigned **review batch CA-16** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-16-review-session-sqlite-index-references-pins-and-compaction.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-16-session-sqlite-index-references-pins-and-compaction.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-16-session-sqlite-index-references-pins-and-compaction.md` (implementation report)
6. `docs/spec/operator-session.md` §10.2 — cross-session turn references
7. `docs/spec/operator-session.md` §11.2 — session indexes
8. `docs/spec/operator-session.md` §12 — compaction
9. `docs/spec/coordinator-automation.md` §9 — pack index and bounded memory
10. `docs/spec/v1-contracts.md` §8A — derived SQLite storage contract
11. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
12. the actual changed source files:
    - `src/foundation/SessionIndexes.ts`
    - `src/foundation/SessionCompaction.ts`
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

Independently verify that the SQLite session index is correct, safe, and
properly derived from authoritative journals:

1. **Schema audit:** Independently inspect the SQLite schema. Verify every
   table and column. Prove no column stores full text beyond the 500-char
   excerpt cap. Verify the schema matches the contracts in
   `coordinator-automation.md §9` and `operator-session.md §11.2`.
2. **Build audit:** Independently populate sessions and turns. Build the index.
   Verify correct row counts. Verify content/answer excerpts are at most 500
   chars. Verify semantic-root determinism: rebuild → same root.
3. **Incremental-update audit:** Add new turns and journal entries. Run
   incremental update. Independently verify only new data enters the index.
4. **Query audit:** Independently call every typed query. Verify results match
   journal data. Verify every query enforces a limit or cursor (no unbounded
   scans). Verify no query returns a raw SQL string or accepts SQL from the
   caller.
5. **Excerpt-cap audit:** Create a turn with 10,000-char message and answer.
   Independently verify both excerpts in SQLite are exactly 500 characters.
   Verify the complete digest is stored and accurate.
6. **Cross-session capsule audit:** Independently build a capsule. Verify the
   included fields (identity, decision class, snapshot, open questions,
   proposal IDs, 500-char excerpt, digest). Verify excluded fields (operator
   message, full answer, transitive references). Verify the capsule is
   explicitly labeled incomplete when excerpt is truncated.
7. **Non-transitivity audit:** Create a turn that references another turn.
   Build the capsule. Independently verify the referenced turn does not appear.
8. **Cross-lane denial audit:** Request a capsule for a turn in another lane.
   Independently verify `OPERATOR_SESSION_REFERENCE_DENIED`.
9. **Pruned-content audit:** Prune a turn. Build the capsule. Verify it
   resolves to tombstone with `OPERATOR_SESSION_CONTENT_PRUNED`.
10. **Compaction audit:** Index 100 turns. Compact. Independently verify:
    SQLite rows are removed, journal files are unchanged (byte-for-byte diff),
    turn files on disk are untouched, pinned and recent turns remain.
11. **Disposability audit:** Delete `sessions.sqlite`. Rebuild. Independently
    verify identical logical rows and `semanticRoot`.
12. **No-fallback audit:** Delete `sessions.sqlite`. Call a typed query.
    Verify it fails with a clear error, does not scan journals, and does not
    silently return partial results.
13. **Model-free verification:** grep both source files for any model or
    provider invocation. Prove none exist.
14. **Hard-reject checklist:** Verify every hard-reject condition. Reject
    immediately if any item flags.
15. **Build and test:** Run `nvb build` and `nvb test` independently. Record
    exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without independently verifying the 500-char excerpt cap.
- Do not accept without independently proving capsules are non-transitive.
- Do not accept if compaction touches journal files.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently build the index and verify row counts and excerpt caps.
- Independently verify cross-session capsules are bounded and non-transitive.
- Independently verify compaction does not touch journals (byte-for-byte diff).
- Independently verify disposability (delete + rebuild = same logical rows).
- Independently verify no full-history fallback.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- SQLite index is built deterministically from journals.
- Content excerpts are capped at 500 chars.
- Every typed query works with bounded pagination.
- Cross-session capsules are bounded, non-transitive, exclude operator messages.
- Compaction touches only the SQLite index.
- The index is disposable.
- Missing index blocks queries; no full-history fallback.
- Build and tests pass independently.
- Zero model invocations.
- No raw SQL exposed to consumers.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-16-correction-01.md` with exact required fixes.
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
- `.local/agent-reports/coordinator-automation/reviews/CA-16-session-sqlite-index-references-pins-and-compaction-review.md`

Include: documents studied, independent proof reruns and outcomes, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
CA-16: Session SQLite index, references, pins, and compaction accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified SQLite schema, excerpt-cap enforcement
results, capsule boundedness/non-transitivity proof, compaction journal-safety
evidence, disposability verification, and no-fallback proof. Confirm that CA-17
may now consume this index for session routing, budgets, and proposals.
