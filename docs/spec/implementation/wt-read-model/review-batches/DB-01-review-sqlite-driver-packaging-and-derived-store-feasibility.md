# Review Batch DB-01 — SQLite Driver, Packaging, And Derived-Store Feasibility

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`
Implementation report: `.local/agent-reports/wt-read-model/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`

## Scope Verification

- [ ] `src/foundation/storage/StorageAdapter.ts` created with typed storage abstraction interface
- [ ] `src/foundation/storage/SqliteConfig.ts` created with typed configuration capsule and shipping defaults
- [ ] `src/foundation/storage/SqliteDriver.ts` created as concrete `better-sqlite3` wrapper
- [ ] `docs/spec/decisions/sqlite-driver-selection.md` (ADR) created
- [ ] `spec/storage/feasibility.spec.ts` created with comprehensive feasibility fixtures
- [ ] `package.json` updated with `better-sqlite3` dependency
- [ ] No derived indexes, pack compilers, projections, or session stores implemented
- [ ] No raw SQL or driver internals exposed to consumers
- [ ] No JSON-shard fallback exists

## Required Independent Proof

1. **Driver selection audit**: Verify the ADR documents the evaluated candidates, selection rationale, and the no-JSON-shard-fallback rule. Confirm `better-sqlite3` was selected and the rationale matches Nirvana ecosystem conventions and the `v1-contracts.md §8A.2` requirements.
2. **Global install proof**: Independently run `nvb dist && npm install -g ./dist`. Verify the globally installed CLI resolves the SQLite driver at runtime without native-binding errors.
3. **Parameterized query proof**: Verify all query methods use parameterized statements. Confirm no string interpolation or raw SQL concatenation passes through the `StorageAdapter` interface.
4. **Foreign-key enforcement**: Independently run fixtures proving FK violations are rejected. Test insert, update, and delete violations across related tables.
5. **WAL mode verification**: Verify WAL mode is activated on database creation. Confirm that concurrent readers can access the store while a writer holds a transaction.
6. **Busy-timeout handling**: Verify the 5,000 ms busy timeout is configured. Prove that a concurrent reader observes the timeout rather than failing silently or returning stale data.
7. **Permissions verification**: Verify database files are created with owner-only permissions (0600 or platform equivalent).
8. **Integrity check**: Independently run `PRAGMA integrity_check` on a newly created populated store. Verify it passes.
9. **Corruption detection**: Manually corrupt database bytes. Verify `integrity_check` fails with a diagnostic. Confirm the corrupted store is not silently accepted.
10. **Staged rebuild proof**: Populate a store from canonical sources. Rebuild from the identical sources into a staging path. Verify logical rows are identical (same count, content, primary-key order).
11. **Semantic-root reproduction**: Compute the semantic root (per `v1-contracts.md §8A.3`) for both the original and the rebuild. Verify they are identical even when SQLite file bytes differ.
12. **Atomic switch proof**: Verify the staging database is atomically switched to the active path. Confirm readers see either the complete old store or the complete new store, never a partially rebuilt database.
13. **Crash safety proof**: Simulate an interrupted write (kill process mid-transaction). Verify the store is recoverable via WAL recovery or detectably corrupt without silent data loss.
14. **Contract API audit**: Verify the `StorageAdapter` interface does not expose raw SQL strings, driver internals, database file paths, or extension-loading capabilities.
15. Run `nvb build` and `nvb test` independently. Record exact output.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. This batch is an architectural
feasibility gate; the reviewer must independently prove every claim.

- Audit the ADR: verify the driver selection rationale, failure-model analysis,
  platform constraints, and the no-JSON-shard-fallback rule.
- Inspect every storage module independently. Verify the `StorageAdapter`
  contract is sufficient for downstream SQLite-owning batches (CA-01, CA-02,
  CA-03, CA-16) without exposing raw SQL.
- Reproduce every feasibility fixture independently. Do not trust implementation
  report claims.
- Verify the global install path works end-to-end: the native binding must
  resolve correctly from the globally installed package.
- Verify the rebuild contract: two builds from identical canonical sources must
  produce identical logical rows and semantic roots.

## Structural And Module-Size Acceptance

- Verify each storage module is within the appropriate size band.
- Confirm no `helpers`, `utils`, `common`, or `misc` modules.
- Verify the `StorageAdapter` interface file is a thin front door (target ≤160 lines).
- Verify `SqliteDriver.ts` does not exceed 350 lines without source-backed justification.

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes
for all 15 proof items, structural verification results, line-count verification,
ADR audit result, global install verification output, tracker/roadmap sync
status, and the acceptance or rejection decision.

## Acceptance Gate

The batch is accepted only when:

- The driver proves all feasibility criteria: global install, parameterized queries,
  FK enforcement, WAL mode, busy-timeout, permissions, integrity, corruption
  detection, staged rebuild, semantic-root reproduction, and crash safety.
- The ADR documents the driver choice, its failure model, platform constraints,
  and the explicit no-JSON-shard-fallback rule.
- The `StorageAdapter` contract provides a sufficient typed abstraction for
  downstream SQLite-owning batches without exposing raw SQL or driver internals.
- The `SqliteConfig` shipping defaults match `v1-contracts.md §8A.4`.
- No derived indexes, pack compilers, projections, or session stores have been
  implemented.
- No raw SQL or driver internals leak to consumers.
- No JSON-shard fallback exists in any source file.
- All hard-reject checklist items are clear.
- `nvb build` and `nvb test` pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Reject Conditions

- The driver fails any feasibility criterion.
- The ADR is missing, incomplete, or does not document the no-JSON-shard-fallback rule.
- Raw SQL or driver internals leak through the `StorageAdapter` interface.
- Any derived index, pack compiler, projection, or session store has been implemented.
- A JSON-shard fallback exists.
- Foreign-key enforcement is not enabled.
- WAL mode is not configured.
- Extension loading is not disabled.
- Busy-timeout is not configured to the shipping default.
- The driver does not resolve in global install context.
- Rebuild does not produce identical logical rows.
- A database file has world-readable permissions.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
