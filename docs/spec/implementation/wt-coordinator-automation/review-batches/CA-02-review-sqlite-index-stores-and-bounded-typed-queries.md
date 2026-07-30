# Review Batch CA-02 — SQLite Index Stores and Bounded Typed Queries

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/CA-02-sqlite-index-stores-and-bounded-typed-queries.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-02-sqlite-index-stores-and-bounded-typed-queries.md`

## Scope Verification

- [ ] `src/foundation/index-store.ts` created — the ONLY module importing `better-sqlite3`
- [ ] `src/foundation/index-query.ts` created — typed query facade
- [ ] All typed query methods implemented: `getArtifact`, `getBatch`, `getBatches`, `getBatchesByIds`, `getDependencies`, `getDependents`, `getRequirements`, `getRepositories`, `getProofs`, `getArtifactsByBatch`, `assembleBatchContext`
- [ ] Cursor/pagination with hard limits (max 200 per page, max depth 10, max 64 KiB content)
- [ ] Stale/missing/corrupt index blocks refuse queries
- [ ] No raw SQL exposed to consumers
- [ ] No full-pack/JSON-shard fallback exists

## SQLite-Specific Verification

- [ ] **No raw SQL exposed to consumers**: Grep for `.exec(`, `.run(`, `.prepare(`, `.all(`, `.get(` — prove they appear ONLY in `src/foundation/index-store.ts`, never in `index-query.ts` or any consumer module.
- [ ] **SQLite bytes never treated as semantic authority**: Verify `assembleBatchContext` and all query methods return typed objects from logical rows; no method returns raw SQLite bytes, database handles, or SQL strings to consumers.
- [ ] **Index is provably rebuildable (semantic root)**: The index was compiled by CA-01 which already proved semantic-root rebuildability. Verify the query layer passes through the CA-01 semantic root from `index_meta` without altering or reinterpreting it.
- [ ] **Corruption is detected, not silently served**: Corrupt the SQLite database bytes. Prove EVERY query method returns `INDEX_CORRUPT` and the index is invalidated. No query returns partial or incorrect data.
- [ ] **No full-pack/JSON-shard fallback exists**: Grep for pack-manifest reading, JSONL scanning, or full-file loading outside `pack-index-compiler.ts` — prove none exist in `index-store.ts` or `index-query.ts`.

## Required Independent Proof

1. Open a compiled 30-batch index. Verify every typed query method returns correct results.
2. Corrupt the SQLite database (flip bytes, truncate file). Prove `INDEX_CORRUPT` from every query and that the index is invalidated.
3. Tamper with `index_meta` pack seal. Prove `INDEX_STALE` on open.
4. Request 201 records. Prove `INDEX_LIMIT_EXCEEDED`.
5. Test cursor mismatch (different query, different revision). Prove `INDEX_CURSOR_INVALID`.
6. Test dependency resolution with 5-deep chain. Verify correct results and depth-limit 10 enforcement.
7. Run `nvb build` and `nvb test`. Record output.
8. Grep for `.exec(`, `.run(`, `.prepare(`, `.all(`, `.get(` across ALL source. Prove they appear ONLY in `index-store.ts`.
9. Grep for pack manifest/JSONL/full-file reads in `index-store.ts` and `index-query.ts`. Prove none exist.
10. Verify `git log` shows the implementation agent did not commit.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. The grep evidence for no-raw-SQL and
no-fallback is the most critical acceptance criterion. Reject immediately if
any raw SQL primitive appears outside `index-store.ts`.

## Structural And Module-Size Acceptance

- `src/foundation/index-store.ts` target ≤220 lines.
- `src/foundation/index-query.ts` target ≤300 lines. Verify responsibility inventory if over 220.
- No `helpers`, `utils`, `common`, or `misc` modules.
- No `better-sqlite3` import outside `index-store.ts`.

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
SQLite-specific verification (raw-SQL grep output, no-fallback grep output,
corruption detection proof), structural verification, line-count verification,
tracker/roadmap sync status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- No raw SQL exposed outside `index-store.ts`.
- Corruption detected and all queries blocked, no partial data served.
- No full-pack/JSON-shard fallback exists.
- All typed query methods return correct results.
- Cursor/revision semantics correct.
- Page/depth limits enforced.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.

## Reject Conditions

- Raw SQL primitive (`.exec`, `.run`, `.prepare`, `.all`, `.get`) found outside `index-store.ts`.
- Query returns partial or incorrect data when index is corrupt.
- Full-pack or JSON-shard fallback path exists.
- Database handle or SQL string exposed to consumers.
- SQLite bytes treated as semantic authority.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
