# Batch CA-03 — Runtime SQLite indexes and projections

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Index foundation
Depends on: RM-05, CA-02 accepted
Owned files: `src/foundation/JournalIndex.ts`, `src/foundation/JournalProjection.ts`, `src/foundation/JournalWal.ts`

**Required implementor reasoning class:** `R4`
**Class rationale:** SQLite-backed journal indexes with WAL-mode concurrency, checkpoint integrity, incremental append to derived indexes, corruption detection and staged rebuild from authoritative append-only journals, and partial-tail event handling. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Build SQLite-backed journal indexes that checkpoint worker events, coordinator
decisions, and effect records. Single writer (the effect executor or watcher)
with WAL-mode readers for concurrent projections. Incremental append to derived
indexes. Detect corruption and trigger staged rebuild from authoritative
append-only journals. Handle partial-tail events (journal line written but not
checkpointed).

## Required Work

1. **Read normative references.** Study the accepted RM-05 event parser contract
   — `DurableEvent` type, event vocabulary, sequence numbering, and partial-line
   handling. Study `v1-contracts.md §9` for event/queue/cursor/replay contract.
   Study `coordinator-automation.md §9.2` for runtime index structure and
   §18 for coordinator/effect event vocabulary. Study the accepted CA-02
   `IndexStore` and `IndexQuery` contracts for the typed query boundary.

2. **Implement `src/foundation/JournalWal.ts`:**
   - `JournalWAL` class managing WAL-mode SQLite access for journal indexes.
     Single writer (effect executor or watcher) with concurrent WAL-mode readers
     for projection queries.
   - `openJournalStore(dbPath: string): JournalStore` — opens the SQLite
     journal index database, enables WAL mode (`PRAGMA journal_mode=WAL`),
     sets busy timeout for concurrent-reader scenarios, and runs `PRAGMA
     foreign_keys = ON`.
   - `checkpointWAL(): void` — triggers a WAL checkpoint to merge the WAL file
     into the main database (called after significant append batches or on close).
   - `closeJournalStore(store: JournalStore): void` — checkpoints WAL (normal
     mode), waits for readers, and closes.
   - Connections/transactions go through DB-01 focused SQLite ports.
     Runtime-index statement definitions remain inside focused store owners; no
     selected-driver import or raw primitive reaches consumers.

3. **Implement `src/foundation/JournalIndex.ts`:**
   - `JournalIndex` class managing the derived SQLite journal index tables.
   - Schema tables:
     - `journal_event` — `(sequence INTEGER PK, event_id TEXT UNIQUE NOT NULL, event_type TEXT NOT NULL, role TEXT, batch_id TEXT, cycle_id TEXT, correlation_id TEXT, payload_json TEXT NOT NULL, byte_offset INTEGER NOT NULL, byte_length INTEGER NOT NULL, created_at TEXT NOT NULL)`
     - `journal_checkpoint` — `(id INTEGER PK DEFAULT 1, last_sequence INTEGER, last_event_id TEXT, last_byte_offset INTEGER, journal_identity_hash TEXT, journal_byte_length INTEGER, projection_revision INTEGER, created_at TEXT)`
   - `appendEvents(events: DurableEvent[], offsets: number[]): void` — appends
     new events from the authoritative JSONL journal to the derived SQLite
     index. Called by the watcher/executor after validating and fsyncing the
     JSONL journal. Updates the checkpoint row.
   - `readEvent(sequence: number): DurableEvent | null` — single event lookup
     by sequence number.
   - `readEvents(fromSequence: number, limit: number): DurableEventPage` —
     paginated reads from a start sequence (inclusive).
   - `readLatestEvent(): {event: DurableEvent, offset: number} | null`
   - `latestSequence(): number`
   - `getCheckpoint(): JournalCheckpoint` — returns current checkpoint state.
   - `verifyCheckpoint(): boolean` — verifies the SQLite index state against
     the authoritative JSONL journal: reads the journal from byte 0 to the
     checkpointed offset, verifies sequence continuity, and confirms the
     checkpoint matches.
   - **Incremental append contract:**
     - Only appends events whose sequence > current `last_sequence`.
     - Validates sequence continuity (no gaps) before any insert.
     - All inserts in a single transaction.
     - After insert: update checkpoint row in the same transaction.
     - Sequence gap detection: if an incoming event's sequence > `last_sequence + 1`,
       reject the append with `JOURNAL_SEQUENCE_GAP` and block further appends
       until rebuild.
   - **Partial-tail handling:**
     - If the authoritative JSONL journal ends with a non-newline-terminated or
       truncated line (detected by RM-05's parser), `JournalIndex` excludes it
       from the index and reports `JOURNAL_CORRUPT_TAIL`.
     - Mutations are blocked while that partial tail remains. `rebuildIndex`
       may index the complete prefix but must leave authoritative JSONL
       byte-for-byte unchanged. Only the authoritative writer completing the
       record, or a separately authorized journal-repair workflow, may resolve
       the source condition.
   - `rebuildIndex(journalPath: string): void` — re-reads the complete
     prefix of the authoritative JSONL journal from byte 0, verifies every
     complete record's schema and sequence continuity, leaves any incomplete
     final record untouched, and builds a staged replacement index from
     scratch. It verifies and atomically publishes the staged database before
     updating the checkpoint; it never clears the active index in place.

4. **Implement `src/foundation/JournalProjection.ts`:**
   - `JournalProjection` class for deriving deterministic read-model projections
     from the journal index.
   - All projections read through `JournalIndex` typed methods, never raw SQL
     or raw JSONL.
   - `projectCycleStatus(cycleId: string): CycleProjection` — reads all events
     for one coordinator cycle and projects: cycle state, decision class,
     proposal digest (if any), validation result, effect outcome, and timing.
   - `projectBatchStatus(batchId: string): BatchProjection` — reads all events
     for one work batch and projects: current implementer/reviewer state,
     last event type, handoff/blocked/accept/reject records, commit references.
   - `projectLaneSummary(): LaneEventSummary` — bounded projection of the most
     recent N events (configurable, default 50) across all event types, plus
     aggregate counts.
   - `projectReadySet(acceptedBatchIds: string[], allBatchIds: string[]): ReadySetProjection` —
     identifies pending batches (all minus accepted) and marks which have all
     dependencies satisfied.
   - Projections are deterministic: given the same journal-index state,
     identical output every time.
   - Uses WAL-mode reads: concurrent readers can query projections while the
     single writer appends events.

5. **Corruption and staged rebuild:**
   - `detectCorruption(): CorruptionReport` — runs `PRAGMA integrity_check` on
     the journal SQLite database. If corruption detected, marks the index as
     unusable and blocks all queries.
   - `triggerStagedRebuild(journalPath: string): void` — called when corruption
     is detected or sequence continuity is broken. Steps:
     1. Create a temp SQLite database.
     2. Re-read the authoritative JSONL journal from byte 0.
     3. Populate the temp database with all valid records.
     4. Verify integrity and checkpoint on the temp database.
     5. Atomically rename the temp database over the corrupt one.
     6. Reopen with WAL mode.
   - Rebuild is idempotent and safe to retry if interrupted.
   - The authoritative JSONL journal is never modified by the rebuild process
     (only the derived SQLite index is rebuilt).

6. **Error taxonomy:**
   - `JOURNAL_NOT_FOUND` — authoritative JSONL journal file does not exist.
   - `JOURNAL_CORRUPT_TAIL` — partial final line detected in JSONL journal.
   - `JOURNAL_SEQUENCE_GAP` — missing sequence number(s) in journal.
   - `JOURNAL_CHECKPOINT_MISMATCH` — checkpoint verification fails (index out
     of sync with authoritative journal).
   - `JOURNAL_INVALID_RECORD` — a JSONL line fails `DurableEvent` schema validation.
   - `JOURNAL_ENTRY_NOT_FOUND` — requested sequence number not in index.
   - `JOURNAL_REBUILD_REQUIRED` — index state requires rebuild (corruption or
     continuity break).
   - `JOURNAL_INDEX_CORRUPT` — SQLite integrity check failed.
   - `JOURNAL_STORE_UNAVAILABLE` — cannot open or access the journal SQLite database.

## Expected Ownership

- `src/foundation/JournalWal.ts` — owns WAL-mode SQLite access for journal
  indexes. Single writer / concurrent reader contract. WAL checkpoint and close
  semantics. Uses DB-01 focused SQLite ports for connection/transaction access.
- `src/foundation/JournalIndex.ts` — owns the derived SQLite journal index
  schema, incremental append from authoritative JSONL, checkpoint management,
  sequence continuity validation, partial-tail handling, corruption detection,
  and staged rebuild. Uses `JournalWal.ts` for database access.
- `src/foundation/JournalProjection.ts` — owns all deterministic projections
  from journal-index state. Reads only through `JournalIndex` typed methods;
  never touches raw JSONL or raw SQL.
- No other module duplicates journal indexing, WAL management, checkpoint
  logic, or projection logic.

## Tests And Evidence

- **Incremental append:** Append events one at a time. Verify `latestSequence`,
  checkpoint, and SQLite row count advance correctly.
- **Checkpoint verification:** Append events, checkpoint, then independently
  re-read the authoritative JSONL journal and verify `verifyCheckpoint()` passes.
- **WAL concurrent reads:** Open a writer connection appending events. Open a
  reader connection querying projections. Verify concurrent access works
  without SQLITE_BUSY errors.
- **Partial tail:** Append a complete entry plus a truncated line to the
  authoritative JSONL. Verify corruption detection and mutation blocking.
  Verify rebuild indexes only the complete prefix and leaves the authoritative
  journal byte-for-byte unchanged.
- **Sequence gap:** Append events with sequences 0, 1, 2, then 4 (skipping 3).
  Verify `JOURNAL_SEQUENCE_GAP` detection and append blocking.
- **Invalid record:** Append a malformed JSONL line. Verify validation failure.
- **Corruption detection:** Corrupt the SQLite database bytes. Verify
  `JOURNAL_INDEX_CORRUPT` detection and that queries are blocked.
- **Staged rebuild:** After corruption, trigger rebuild. Verify the temp
  database is populated correctly, the atomic rename succeeds, and the
  reopened index passes integrity checks.
- **Rebuild idempotency:** Interrupt a rebuild mid-way. Retry. Verify the
  final state is correct and identical to a clean rebuild.
- **Projection correctness:** From a fixture journal with known worker and
  coordinator events, verify all projection methods return correct output.
- **Deterministic projections:** Run the same projection twice from identical
  journal state. Verify identical output.
- **Bounded reads:** Verify projections use `JournalIndex` typed reads
  (paginated, bounded), not full-SQLite-table scans or raw JSONL scans.
- **R5-proof:** Verify that authoritative JSONL journals remain untouched by
  rebuild — only the derived SQLite index is rebuilt.

## What Must Not Change

- Do not modify the RM-05 JSONL parser contract or `DurableEvent` schema.
- Do not read raw journal files from projection code.
- Do not write to the authoritative JSONL journal from the index or projection
  modules (journal writing is owned by the effect executor, CA-10).
- Do not expose raw SQLite primitives to consumers.
- Do not invoke any model, LLM, or AI.
- Do not import the selected driver package in CA-03; only the DB-01 driver
  capsule imports it. Keep runtime-index SQL inside focused store owners.
- Do not modify the lane directory layout.

## Review Procedure Highlights

1. Independently append events and verify checkpoint integrity and WAL-mode
   concurrent reader behavior.
2. Verify partial-tail detection, mutation blocking, and rebuild correctness.
3. Verify corruption detection and staged rebuild: corrupt the SQLite database,
   confirm rebuild restores correct state from authoritative JSONL.
4. Verify projection determinism — identical input produces identical output.
5. Verify bounded reads through structural inspection — no raw SQLite table
   scans in projection code.
6. Verify sequence-gap detection and handling.
7. Verify the authoritative JSONL journal is never modified by index or
   rebuild operations.
