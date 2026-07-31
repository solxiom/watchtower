# DB-01 Correction 02 — Enforce The Writer Lock And Complete The Store Contract

Status: re-reviewed and rejected — superseded by `DB-01-correction-03.md`
Rejected batch: `DB-01`
Rejected review: `../DB-01-review-sqlite-driver-packaging-and-derived-store-feasibility.md`
Rejection date: 2026-07-31
Reviewer session: `wt-review-DB-01-kavan`
Review report: `.local/agent-reports/wt-read-model/reviews/DB-01-sqlite-driver-packaging-and-derived-store-feasibility-review.md`

## Rejection Reasons

1. **Committed writes can still be lost during rebuild publication.**
   `src/foundation/storage/SqliteRebuilder.ts:85-97` acquires
   `acquireWriteLock`, but `src/foundation/storage/derivedSqliteStore.ts:146-160`
   writes without acquiring or validating that same lock. Independent proof
   started a 5,000-row `insertMany`, published a rebuild concurrently, and
   observed both operations return successfully. Reopening the active path
   returned only the rebuild's one row: all 5,000 committed writer rows had
   disappeared. This directly violates `v1-contracts.md §8A.4-§8A.5` and §11.
2. **Busy failures leak the foreign facade error.**
   `DerivedSqliteStore.inTransaction` starts the transaction at
   `derivedSqliteStore.ts:128-129`, before its `try` block. Under contention,
   `tx.start()` therefore throws raw `NirvanaDatabaseError` code `DB_BUSY`
   instead of the accepted RM-01 `ERR_LOCK_CONFLICT` promised by
   `sqliteErrorMapping.ts`. The submitted suite only reads the configured
   timeout value and never exercises this path.
3. **The mandatory foreign-key and busy proof matrix is incomplete.**
   `spec/storage/feasibility.spec.ts:42-53` proves only a dangling insert. It
   has no update or delete violation. `spec/storage/concurrency.spec.ts` proves
   WAL reader visibility and rebuild-vs-lock exclusion, but no bounded busy
   failure and no ordinary-writer-vs-publication exclusion. The public writer
   surface has no update/delete operation with which to satisfy the explicit
   DB-01 proof obligation or demonstrate that it is sufficient for downstream
   incremental projection stores.
4. **A path-bearing construction port remains public.**
   `sqlitePorts.ts:78-86` and the storage barrel export
   `DerivedStoreLocation { root: string; name: string }`, while
   `index.ts:10-17` exports construction, rebuild, and lock APIs that accept
   caller-selected paths. The architecture fixture merely searches export
   lines for the literal `databasePath`; it does not catch this path surface.
   This does not meet the review gate requiring store-facing domain ports to
   expose no database paths.
5. **Corruption refusal is demonstrated only accidentally for one damaged
   query.** The store does not establish a verified-integrity state at
   admission or remember a failed integrity check. A corruption that affects
   another table/page can therefore fail `integrity_check` while a query of an
   intact page still returns data. The contract requires corrupt stores to
   block dependent operations rather than serve partial results.
6. **The cross-process lock adapter is weaker than the governing lane-lock
   contract.** `sqliteWriteLock.ts` records only a PID, reclaims by unlinking
   after a racy liveness check, and releases by blindly removing the path. It
   neither consumes the existing lane/projection lock nor carries the required
   holder identity/start metadata. PID reuse and stale-reclaim/release races can
   invalidate another holder. Calling it the lane lock in comments does not
   provide the required authority or ordering.
7. **A zero-byte ownership marker is present in production source.**
   `src/foundation/storage/.own` is an untracked implementation artifact with
   no product or build purpose and must not remain in the candidate.

## Expected Corrected State

1. Route every mutable store operation and rebuild publication through one
   enforceable lane/projection mutation-lock capability. The typed store must
   not permit an ordinary write that bypasses the lock used by publication.
   Use the governing lock order (`lane/projection lock` outside SQLite
   transaction); do not represent an independent PID file as equivalent lane
   authority.
2. Make acquisition/release ownership safe against PID reuse, stale-reclaim
   races, and one holder deleting another holder's lock, or consume the accepted
   shared lane-lock adapter rather than maintaining a second protocol.
3. Translate failures from transaction creation, start, body, commit, and
   abort through the accepted Watchtower taxonomy while retaining the original
   failure if rollback also fails. A bounded busy collision must surface
   `ERR_LOCK_CONFLICT`, never `DB_BUSY` or another Nirvana error type.
4. Complete the typed mutation surface required by downstream derived stores
   and prove insert, update, and delete foreign-key violations. If a narrower
   mutation model is intended, obtain a governing specification amendment
   rather than silently omitting the mandatory proof.
5. Keep location/path selection inside an authorized composition/factory
   owner. Domain-facing storage barrels and ports expose typed store
   capabilities, not caller-supplied filesystem roots or lock paths. Strengthen
   the architecture test so the current `root`/`lockPath` surface would fail.
6. Admit reads only after the store's manifest/integrity state is verified, or
   otherwise enforce a state that blocks all dependent operations after
   corruption is detected. Prove corruption in an unqueried page/table cannot
   allow rows from an intact page/table to be returned.
7. Remove `src/foundation/storage/.own` and keep ownership metadata outside the
   product source tree.

## Required Additional Proof

- Re-run the 15-item DB-01 proof matrix and record every item independently.
- Add a deterministic regression reproducing the rejected race: an ordinary
  writer overlaps rebuild publication. The implementation must reject/defer
  one operation under the shared lock; it must be impossible for both to
  report success while a committed row disappears.
- Add cross-process lock tests for active-holder exclusion, stale ownership,
  PID reuse/identity, timeout, and release ownership. Prove lock ordering with
  SQLite transactions.
- Add a real bounded contention test and assert the public error is the
  registered `ERR_LOCK_CONFLICT` with no foreign facade error escaping.
- Add FK insert, update, and delete rejection fixtures through typed
  capabilities.
- Add a corruption fixture where `integrity_check` fails because of damage
  outside the queried data and prove every dependent read is blocked.
- Add architecture fixtures that fail on public filesystem-location/lock-path
  inputs as well as raw SQL, arbitrary statements, driver/facade imports, and
  extension controls.
- Re-run global install/native-binding runtime proof, `nvb build`, `nvb test`,
  `nvb dist`, `git diff --check`, ownership checks, and staged/committed
  `.local` checks.

## Exact Files To Change

- `src/foundation/storage/derivedSqliteStore.ts`
- `src/foundation/storage/SqliteRebuilder.ts`
- `src/foundation/storage/sqliteWriteLock.ts` or the accepted shared lane-lock
  owner that replaces it
- `src/foundation/storage/sqlitePorts.ts`
- `src/foundation/storage/index.ts`
- `src/foundation/storage/sqliteErrorMapping.ts`
- `spec/basic/sourceArchitectureCheck.spec.ts`
- `spec/storage/concurrency.spec.ts`
- `spec/storage/feasibility.spec.ts`
- `spec/storage/rebuild.spec.ts`
- `spec/storage/support/storeFixtures.ts`
- `docs/spec/decisions/sqlite-driver-selection.md`
- `.local/agent-reports/wt-read-model/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
- the paired DB-01 work/review brief status lines
- remove `src/foundation/storage/.own`

The correction must preserve the valid parts of correction 01: the pinned
`@nirvana/commons` SQLite facade, Node `>=26.4.0`, safe-integer row access,
parameterized private SQL, owner-only modes, semantic-root reproduction,
external crash recovery, the no-JSON-shard-fallback rule, and the proposed ADR
state pending independent acceptance.
