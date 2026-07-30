# Review Batch CA-03 — Runtime SQLite Indexes and Projections

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/CA-03-runtime-sqlite-indexes-and-projections.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-03-runtime-sqlite-indexes-and-projections.md`

## Scope Verification

- [ ] `src/foundation/journal-wal.ts` created — WAL-mode SQLite access
- [ ] `src/foundation/journal-index.ts` created — derived SQLite journal index with `journal_event` and `journal_checkpoint` tables
- [ ] `src/foundation/journal-projection.ts` created — deterministic projections
- [ ] Incremental append from authoritative JSONL with sequence continuity validation
- [ ] Partial-tail detection and handling
- [ ] Corruption detection and staged rebuild from authoritative JSONL
- [ ] WAL-mode concurrent readers (single writer)
- [ ] All projections read through `JournalIndex` typed methods, never raw JSONL or raw SQL

## SQLite-Specific Verification

- [ ] **No raw SQL exposed to consumers**: Grep for `.exec(`, `.run(`, `.prepare(`, `.all(`, `.get(` — prove they appear ONLY in `src/foundation/journal-wal.ts`, never in `journal-index.ts`, `journal-projection.ts`, or any consumer.
- [ ] **SQLite bytes never treated as semantic authority**: The authoritative JSONL journals are the source of truth. The SQLite index is derived and disposable. Verify rebuild reads from JSONL, not from internal SQLite state.
- [ ] **Index is provably rebuildable**: Delete the SQLite database entirely. Trigger rebuild from authoritative JSONL. Prove the rebuilt index is identical to the original (same events, same checkpoints, same projections).
- [ ] **Corruption is detected, not silently served**: Corrupt the SQLite database bytes. Prove `JOURNAL_INDEX_CORRUPT` detection, queries blocked, and staged rebuild restores correct state.
- [ ] **No full-pack/JSON-shard fallback exists**: Verify projection code uses ONLY `JournalIndex` typed methods; no raw JSONL file reads, no full-journal scans.

## Required Independent Proof

1. Append events incrementally. Verify checkpoint advances correctly after each append.
2. Open a concurrent reader while writer appends. Verify WAL-mode allows concurrent access without SQLITE_BUSY.
3. Append a partial-tail event. Verify corruption detection and mutation blocking.
4. Trigger rebuild after partial tail. Verify only the incomplete tail is removed.
5. Introduce a sequence gap (skip sequence 3). Verify `JOURNAL_SEQUENCE_GAP` and append blocking.
6. Append a malformed JSONL line. Verify `JOURNAL_INVALID_RECORD` rejection.
7. Corrupt the SQLite database bytes. Verify `JOURNAL_INDEX_CORRUPT` → queries blocked → staged rebuild restores correct state.
8. Interrupt a rebuild mid-way, retry. Prove rebuild is idempotent and final state matches clean rebuild.
9. Run all projections from fixture journal data. Verify correct output.
10. Run the same projection twice. Verify deterministic (identical) output.
11. Verify the authoritative JSONL journal is never modified by any index or rebuild operation.
12. Run `nvb build` and `nvb test`. Record output.
13. Grep for raw SQL primitives — prove they appear ONLY in `journal-wal.ts`.
14. Verify `git log` shows the implementation agent did not commit.

## Required Reasoning Posture

The reviewer must verify that the authoritative JSONL journals remain immutable
through all index and rebuild operations. The SQLite index is disposable —
verify that complete deletion and rebuild from JSONL produces identical results.
Reject if any projection reads raw JSONL or raw SQL directly.

## Structural And Module-Size Acceptance

- `src/foundation/journal-wal.ts` target ≤160 lines.
- `src/foundation/journal-index.ts` target ≤300 lines. Verify responsibility inventory if over 220.
- `src/foundation/journal-projection.ts` target ≤220 lines.
- No `helpers`, `utils`, `common`, or `misc` modules.
- No raw SQLite primitives outside `journal-wal.ts`.

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
SQLite-specific verification (raw-SQL grep, rebuild-from-JSONL proof, corruption
detection, authoritative JSONL immutability proof), structural verification,
line-count verification, tracker/roadmap sync status, and the acceptance or
rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- WAL-mode concurrent reads work without blocking.
- Partial-tail detected and handled correctly.
- Sequence gaps detected and blocked.
- Corruption detected and staged rebuild restores correct state from JSONL.
- Rebuild is idempotent.
- All projections deterministic and correct.
- Authoritative JSONL never modified by any index/projection/rebuild operation.
- No raw SQL exposed outside `journal-wal.ts`.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.

## Reject Conditions

- Authoritative JSONL journal modified by index or rebuild operation.
- Projection reads raw JSONL or raw SQL instead of `JournalIndex` typed methods.
- Rebuild not idempotent (different result on retry).
- Corruption silently served instead of detected and blocked.
- Raw SQL primitives outside `journal-wal.ts`.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
