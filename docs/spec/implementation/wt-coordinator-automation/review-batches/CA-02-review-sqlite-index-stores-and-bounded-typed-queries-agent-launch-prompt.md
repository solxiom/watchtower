# Agent Launch Prompt — Review Batch CA-02

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for typed query facade review, SQLite storage capsule audit, and corruption-detection verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying typed query correctness, storage capsule
isolation (no raw SQL outside `index-store.ts`), corruption detection, and the
no-full-pack-fallback guarantee.

You are assigned **review batch CA-02** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority for the SQLite index stores and bounded typed queries.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-02-review-sqlite-index-stores-and-bounded-typed-queries.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-02-sqlite-index-stores-and-bounded-typed-queries.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-02-sqlite-index-stores-and-bounded-typed-queries.md` (implementation report)
6. `docs/spec/v1.md`
7. `docs/spec/v1-contracts.md` — especially §8A (typed query boundary)
8. `docs/spec/architecture.md` — especially A-033
9. `docs/spec/coordinator-automation.md` — especially §9.4 (query contract), §9.5 (complexity requirements)
10. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
11. the actual changed source files:
    - `src/foundation/index-store.ts`
    - `src/foundation/index-query.ts`
    - `spec/basic/index-store-spec.ts`
    - `spec/basic/index-query-spec.ts`
12. Accepted CA-01 compiler — SQLite schema and `computeSemanticRoot`

## Your Review Mission

Independently verify that the typed query facade correctly encapsulates all
SQLite access and enforces bounded, corruption-safe reads:

1. **Storage capsule audit**: Grep for `.exec(`, `.run(`, `.prepare(`, `.all(`,
   `.get(`, `better-sqlite3` across ALL new/changed source files. Reject if ANY
   occurrence is found outside `src/foundation/index-store.ts`.
2. **Corruption detection**: Corrupt the SQLite database (flip bytes, truncate
   file, delete pages). Verify EVERY query method returns `INDEX_CORRUPT` and
   the index is invalidated. Verify no partial or incorrect data is returned.
3. **Stale detection**: Tamper with `index_meta` pack seal. Prove open fails
   with `INDEX_STALE`.
4. **No full-pack fallback**: Grep for pack-manifest reading, JSONL scanning,
   or full-file loading in `index-store.ts` and `index-query.ts`. Prove none exist.
5. **Query correctness**: Test every typed query method with a 30-batch compiled
   index. Verify correct results, correct pagination, correct dependency
   resolution.
6. **Limit enforcement**: Request 201 records → `INDEX_LIMIT_EXCEEDED`.
   Dependency depth > 10 → truncated result with `truncated: true`.
7. **Cursor/revision semantics**: Cursor mismatch → `INDEX_CURSOR_INVALID`.
   Index revision change invalidates old cursors.
8. **Hard-reject checklist**: Run the 16-item checklist.
9. **Build and test**: Run `nvb build` and `nvb test` independently.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept if raw SQL primitives appear outside `index-store.ts`.
- Do not accept if any query returns partial data from a corrupt index.
- Do not accept if a full-pack/JSON-shard fallback exists.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently verify every typed query method.
- Independently verify corruption detection and refusal.
- Independently grep for raw SQL and full-pack fallback — record exact output.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All hard-reject checklist items are clear.
- No raw SQL exposed outside `index-store.ts` (grep proof).
- Corruption detected and all queries blocked, no partial data.
- No full-pack/JSON-shard fallback exists (grep proof).
- All typed queries return correct results.
- Limits enforced.
- Build and tests pass independently.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.
- Implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-02-correction-01.md` with exact required fixes.

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
- `.local/agent-reports/coordinator-automation/reviews/CA-02-sqlite-index-stores-and-bounded-typed-queries-review.md`

Include: documents studied, independent proof reruns and outcomes, SQLite-specific
verification (raw-SQL grep output, no-fallback grep output, corruption detection
proof), structural verification, acceptance/rejection decision, final git status,
and if accepting, create the acceptance commit.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
CA-02: SQLite index stores and bounded typed queries accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, storage capsule boundary verification (prove
sole-SQLite-access in `index-store.ts`), typed query method inventory, grep
evidence, and any limitations noted. Confirm that CA-03 may now be reviewed.
