# Batch CA-02 — SQLite index stores and bounded typed queries

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Index foundation
Depends on: CA-01 accepted
Owned files: `src/foundation/index-query.ts`, `src/foundation/index-store.ts`

**Required implementor reasoning class:** `R5`
**Class rationale:** typed query facade over compiled SQLite index, corruption-safe bounded reads, stale-index detection, and storage capsule isolation. Direct bounded reads only — no unindexed scans, no transitive joins without a covering index, no table scans. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Implement a typed query facade over the compiled SQLite index. No consumer —
command, agent, policy, or shell script — ever issues raw SQL. All reads go
through bounded typed methods with explicit limits, cursors, and truncation.
Stale/missing/corrupt index blocks refuse queries; no full-pack-scan fallback.
Direct bounded reads only — no unindexed scans, no transitive joins, no table
scans without a covering index.

## Required Work

1. **Read the normative references.** Study the accepted CA-01 compiler contract
   — the `PackIndex` shape, the SQLite schema (artifact, batch, dependency,
   requirement, repository, proof, batch_repository, batch_requirement tables),
   and the `computeSemanticRoot` function. Study `v1-contracts.md §8A` for
   the typed query contract — no raw SQL beyond the storage capsule, bounded
   reads with limits/cursors/truncation, stale/missing/corrupt index refusal.
   Study `coordinator-automation.md §9.4` for query contract with record limits,
   graph depth, byte limits, token estimates, provenance, and truncation markers.

2. **Implement `src/foundation/index-store.ts`:**
   - `IndexStore` class encapsulating all SQLite access behind the DB-01 storage
     adapter. No module outside `index-store.ts` and `index-query.ts` imports
     or uses SQLite primitives (`better-sqlite3`, `Database`, `Statement`).
   - `openIndex(indexPath: string): IndexStore` — opens or creates the SQLite
     database at the given path, enables WAL mode, sets busy timeout, and runs
     `PRAGMA foreign_keys = ON`. Validates the schema version from `index_meta`.
   - `currentIndexDigest(): string | null` — returns the semantic root of the
     currently open index, or null if none open.
   - `verifyIndexIntegrity(): IntegrityReport` — runs `PRAGMA integrity_check`,
     verifies FK constraints across all tables, verifies the semantic root
     matches the stored value in `index_meta`, and reports any drift.
   - `invalidateIndex(reason: string): void` — marks the current index as
     invalid with a reason code, blocking automated cycles.
   - `close(): void` — safely closes the index, waiting for readers in WAL mode.
   - The store does NOT publish or compile — publication is CA-01's
     responsibility. The store opens and verifies previously published indexes.
   - Stale index detection: on open, verify the pack seal and manifest digest
     in `index_meta` match the expected values. Mismatch → refuse to open,
     return `INDEX_STALE`.

3. **Implement `src/foundation/index-query.ts`:**
   - `IndexQuery` class for bounded, typed lookups against the open `IndexStore`.
     No consumer of `IndexQuery` ever touches SQL or a database handle.
   - **Typed query methods:**
     - `getArtifact(artifactId: string): ArtifactIndexEntry | null`
     - `getBatch(batchId: string): BatchIndexEntry | null`
     - `getBatches(params: BatchQueryParams): BatchQueryPage` — paginated with
       limit (default 50, max 200), cursor, optional filters (repository,
       reasoning class, workload).
     - `getBatchesByIds(batchIds: string[]): BatchIndexEntry[]` — preserves
       request order; reports missing IDs.
     - `getDependencies(batchId: string): DependencyResult` — direct and
       bounded-transitive dependency resolution with depth limit (max 10).
     - `getDependents(batchId: string): BatchIndexEntry[]` — reverse edges
       (batches that depend on this batch).
     - `getRequirements(params: RequirementQueryParams): RequirementQueryPage`
     - `getRepositories(): RepositoryIndexEntry[]`
     - `getProofs(batchId: string): ProofIndexEntry[]`
     - `getArtifactsByBatch(batchId: string, limit: number): ArtifactIndexEntry[]`
   - **Cursor and pagination contract:**
     - Every list query accepts `limit` (max 200 enforced) and optional opaque
       `cursor`.
     - Cursor encodes query digest + last returned row PK + index revision.
     - Cursor mismatch or index revision change → `INDEX_CURSOR_INVALID`.
     - Every page response includes: `items`, `nextCursor | null`, `truncated`
       boolean, and `totalCount` (informational, not used for pagination logic).
   - **Hard limits enforced:**
     - Maximum page size: 200 records.
     - Maximum dependency depth: 10 levels.
     - Maximum returned bytes from artifact content sections: 64 KiB.
     - Requesting beyond limits → `INDEX_LIMIT_EXCEEDED`.
   - **Corruption and stale detection:**
     - Before any query: verify `PRAGMA integrity_check` passes (cached per
       open session, invalidated on any detected corruption).
     - `PRAGMA quick_check` on every `openIndex` call.
     - If integrity check fails → all queries return `INDEX_CORRUPT`, index
       is invalidated immediately.
     - If `index_meta` semantic root doesn't match computed logical-export
       digest → `INDEX_STALE`, all queries blocked.
     - No partial data ever returned. Corruption → no query completes.
   - **Bounded-context assembly for decision envelopes:**
     - `assembleBatchContext(batchId: string, options: ContextAssemblyOptions): BoundedContext` —
       assembles the bounded index context for a decision envelope: batch summary,
       dependency neighborhood (depth-limited), requirement references, proof
       references, and repository claims. This is the ONLY method that assembles
       multi-table context; consumers never compose raw queries.
   - **No direct SQL exposed:**
     - Grep for `.exec(`, `.run(`, `.prepare(`, `.all(`, `.get(` — these must
       appear ONLY inside `src/foundation/index-store.ts`, never in
       `index-query.ts` or any consumer module.
     - `IndexQuery` calls typed methods on `IndexStore`, which internally
       translates to parameterized SQL. The query layer composes typed calls,
       never SQL strings.

4. **Error taxonomy for the query layer:**
   - `INDEX_UNAVAILABLE` — no active index open or index is invalidated.
   - `INDEX_STALE` — pack seal / manifest digest doesn't match index metadata.
   - `INDEX_CORRUPT` — integrity check failed; index is damaged.
   - `INDEX_CURSOR_INVALID` — cursor is for a different query or index revision.
   - `INDEX_BATCH_NOT_FOUND` — batch ID not present (single lookup).
   - `INDEX_ARTIFACT_NOT_FOUND` — artifact ID not present.
   - `INDEX_REQUIREMENT_NOT_FOUND` — requirement ID not present.
   - `INDEX_LIMIT_EXCEEDED` — requested page size / depth exceeds maximum.
   - `INDEX_SCHEMA_MISMATCH` — database schema version != expected version.

5. **No-fallback proof:**
   - Verify that when the index is stale, corrupt, or missing, NO code path
     falls back to scanning the pack JSON files or loading full-shard data
     into memory.
   - Grep the entire codebase for pack-manifest reading, JSONL scanning, or
     full-file loading outside `pack-index-compiler.ts` — prove none exist
     in query/store paths.

## Expected Ownership

- `src/foundation/index-store.ts` — owns all SQLite access: opening, closing,
  integrity checking, invalidation, and the typed internal query methods that
  translate to parameterized SQL. No other module imports `better-sqlite3` or
  any SQLite primitive.
- `src/foundation/index-query.ts` — owns the typed query facade: all public
  query methods, cursor/pagination management, bounded-context assembly,
  corruption/stale detection dispatch, and the no-fallback guarantee. Calls
  `IndexStore` typed methods only; never constructs SQL strings.
- No other module duplicates index storage, query logic, or SQLite access.

## Tests And Evidence

- **Publication integrity:** Publish a 30-batch index via CA-01's compiler.
  Open with `IndexStore` and verify all typed queries return correct results.
- **Bounded reads:** Query a 300-batch index. Prove via coverage that no
  single query performs a full table scan, unindexed scan, or loads all rows.
- **Stale detection:** Tamper with `index_meta` pack seal. Prove open fails
  with `INDEX_STALE`.
- **Corruption detection:** Corrupt the SQLite database (flip bytes in a page).
  Prove open fails with `INDEX_CORRUPT` and the index is invalidated.
- **Truncated database:** Truncate the `.sqlite` file. Prove detection and
  refusal.
- **Cursor mismatch:** Use a cursor from a different query. Prove
  `INDEX_CURSOR_INVALID`.
- **Revision change:** Advance the cursor through pages. Close and reopen with
  a new index compilation. Prove the old cursor is rejected.
- **Page limits:** Request 201 records. Prove `INDEX_LIMIT_EXCEEDED`.
- **Dependency resolution:** Prove direct and transitive dependencies resolve
  correctly for a batch with a 5-deep chain. Prove the depth limit (10) is
  enforced and truncated results are marked.
- **Model-free proof:** Architecture check verifying no model/AI imports.
- **No raw SQL exposed:** Grep for `.exec(`, `.run(`, `.prepare(`, `.all(`,
  `.get(` — prove they appear ONLY in `index-store.ts`, never in `index-query.ts`
  or any consumer.
- **No full-pack/JSON-shard fallback:** Grep for pack manifest reading or JSONL
  scanning in `index-query.ts` and `index-store.ts` — prove none exist.

## What Must Not Change

- Do not modify the CA-01 compiler output schema or SQLite table definitions.
- Do not expose raw SQL or database handles to any consumer.
- Do not fall back to reading pack files when the index is unavailable.
- Do not invoke any model, LLM, or AI.
- Do not import `better-sqlite3` or similar outside `index-store.ts`.
- Do not modify the lane directory layout from `v1.md §7.2`.

## Review Procedure Highlights

1. Independently open a compiled index and verify every typed query method
   returns correct results.
2. Verify that `.exec(`, `.run(`, `.prepare(`, `.all(`, `.get(` appear ONLY in
   `index-store.ts` — never in `index-query.ts` or any consumer module.
3. Verify that when the SQLite database is corrupt, missing, or stale, NO query
   completes and NO partial data is returned.
4. Verify boundedness: no query performs a full table scan or unindexed scan.
5. Verify cursor/revision semantics across index updates.
6. Verify dependency resolution correctness and depth-limit enforcement.
7. Verify no full-pack/JSON-shard fallback path exists.
8. Architecture check: no model/AI imports.
