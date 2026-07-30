# Agent Launch Prompt — Review Batch CA-03

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for SQLite-based journal indexing review and WAL concurrency verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`, `Claude Sonnet 4.6`
- good alternatives: `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying WAL-mode journal indexing, checkpoint
integrity, corruption detection, staged rebuild from authoritative JSONL, and
authoritative journal immutability.

You are assigned **review batch CA-03** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority for the runtime SQLite indexes and projections.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-03-review-runtime-sqlite-indexes-and-projections.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-03-runtime-sqlite-indexes-and-projections.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-03-runtime-sqlite-indexes-and-projections.md` (implementation report)
6. `docs/spec/v1.md`
7. `docs/spec/v1-contracts.md` — especially §8A (WAL), §9 (event/queue/cursor/replay)
8. `docs/spec/architecture.md` — especially A-033
9. `docs/spec/coordinator-automation.md` — especially §18 (durable coordinator events)
10. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
11. the actual changed source files:
    - `src/foundation/journal-wal.ts`
    - `src/foundation/journal-index.ts`
    - `src/foundation/journal-projection.ts`
    - `spec/basic/journal-index-spec.ts`
    - `spec/basic/journal-projection-spec.ts`
12. Accepted RM-05 event parser and CA-02 index query contracts

## Your Review Mission

Independently verify that the journal index correctly derives SQLite state from
authoritative JSONL journals and never modifies them:

1. **WAL concurrency audit**: Open a writer appending events. Open a concurrent
   reader querying projections. Verify no SQLITE_BUSY errors. Verify WAL mode
   enabled.
2. **Checkpoint integrity**: Append events, checkpoint, then independently
   re-read the authoritative JSONL journal and verify checkpoint matches.
3. **Partial-tail handling**: Create a journal with a truncated final line.
   Verify corruption detection, mutation blocking, and staged rebuild that
   removes only the incomplete tail.
4. **Sequence gap detection**: Create events with sequences 0, 1, 2, 4.
   Verify `JOURNAL_SEQUENCE_GAP` and append blocking.
5. **Corruption and staged rebuild**: Corrupt the SQLite database. Verify
   `JOURNAL_INDEX_CORRUPT` detection. Trigger rebuild. Verify the rebuilt
   index is identical to a clean build from the same JSONL.
6. **Rebuild idempotency**: Interrupt a rebuild mid-way. Retry. Verify final
   state matches a clean rebuild.
7. **Authoritative JSONL immutability**: Run `sha256sum` on JSONL journals
   before and after all index, projection, and rebuild operations. Prove the
   hash never changes.
8. **Projection determinism**: Run projections twice from identical state.
   Verify identical output.
9. **No raw SQL outside capsule**: Grep for `.exec(`, `.run(`, `.prepare(`,
   `.all(`, `.get(` — prove they appear ONLY in `journal-wal.ts`.
10. **Hard-reject checklist**: Run the 16-item checklist.
11. **Build and test**: Run `nvb build` and `nvb test` independently.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept if the authoritative JSONL journal is modified by any operation.
- Do not accept if projections read raw JSONL or raw SQL directly.
- Do not accept if rebuild is not idempotent.
- Do not accept if corruption is silently served.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently verify WAL concurrency.
- Independently verify checkpoint integrity.
- Independently verify staged rebuild correctness and idempotency.
- Independently verify authoritative JSONL immutability (SHA-256 before/after).
- Independently grep for raw SQL.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All hard-reject checklist items are clear.
- WAL concurrent reads work.
- Partial tail handled correctly.
- Sequence gaps detected.
- Staged rebuild is correct and idempotent.
- Authoritative JSONL never modified.
- Projections deterministic and read through `JournalIndex` only.
- No raw SQL outside `journal-wal.ts`.
- Build and tests pass independently.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.
- Implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-03-correction-01.md` with exact required fixes.

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
- `.local/agent-reports/coordinator-automation/reviews/CA-03-runtime-sqlite-indexes-and-projections-review.md`

Include: documents studied, independent proof reruns and outcomes, SQLite-specific
verification (WAL concurrency, checkpoint integrity, staged rebuild, JSONL
immutability SHA-256 proof, raw-SQL grep), projection determinism proof,
structural verification, acceptance/rejection decision, final git status, and
if accepting, create the acceptance commit.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
CA-03: Runtime SQLite indexes and projections accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified WAL concurrency, staged rebuild
correctness, JSONL immutability proof, projection determinism, grep evidence,
and any limitations noted. Confirm that CA-04 may now be reviewed.
