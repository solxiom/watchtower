# DB-01 Correction 01 — Restore Nirvana, Storage, And Publication Boundaries

Status: re-reviewed and rejected — superseded by `DB-01-correction-02.md`
Rejected batch: `DB-01`
Rejected review: `../DB-01-review-sqlite-driver-packaging-and-derived-store-feasibility.md`
Rejection date: 2026-07-31
Reviewer session: `wt-review-DB-01-kavan`
Review report: `.local/agent-reports/wt-read-model/reviews/DB-01-sqlite-driver-packaging-and-derived-store-feasibility-review.md`

## Rejection Reasons

1. The Nirvana audit is factually incomplete. The ADR at
   `docs/spec/decisions/sqlite-driver-selection.md:32-48` says no pinned Nirvana
   package exposes SQLite, but the current pinned `@nirvana/commons` public
   surface exports `foundation/db.sqlite`, including `SqliteService`,
   `SqliteWorkerPool`, transactions, path/config normalization, migration
   admission, typed errors, diagnostics, and a worker-owned `better-sqlite3`
   boundary. `@nirvana/commons/package.json` declares `better-sqlite3@13.0.1`.
   The audit command missed symlinked package contents because it did not follow
   symlinks. This leaves no proven `NIRVANA_API_GAP` and hard-rejects the local
   replacement under the mandatory Nirvana-first standard.
2. `package.json:10-12` and the ADR at lines 100-103, 123-138 lower the Node
   floor to `>=24.0.0`, contradicting `v1-contracts.md §1.1`, which requires the
   package engines, runtime validation, distribution metadata, and global
   install fixtures to agree on official Node `>=26.4.0`. `package-lock.json`
   was also not synchronized with the package metadata.
3. The supposed focused port leaks exactly the forbidden capabilities.
   `sqlitePorts.ts:44-50,85-99` exports arbitrary `prepare(sql)`/`exec(sql)` and
   `databasePath`; `index.ts:17-35` exports `SqliteDriver`,
   `openSqliteConnection`, and those raw ports. `SqliteDriver.ts:66` exposes the
   selected driver's `DatabaseSync` type through a public constructor. This is
   not the typed `PackIndexStore`/`RuntimeProjectionStore`/`SessionIndexStore`
   boundary required by `v1-contracts.md §8A.2`.
4. Rebuild publication is not safe. `SqliteRebuilder.ts:31-41,73-86,119-130`
   creates an ad hoc `openSync('wx')` lock only after staging, does not require
   or prove the existing lane/projection lock order, removes live `-wal`/`-shm`
   sidecars before rename, and fsyncs the database only after publication. An
   independent fixture held an old writer transaction, published a rebuild,
   then observed the old writer's `COMMIT` succeed while its inserted row was
   absent from the active database. This is silent committed-write loss and
   violates `v1-contracts.md §8A.4-§8A.5 and §11`.
5. Deterministic typed row access is incomplete. `SqliteDriver.ts:49-56,122-127`
   never enables the Node statement safe-integer mode. An independent database
   round trip of SQLite integer `9007199254740993` threw `ERR_OUT_OF_RANGE`,
   even though `sqlitePorts.ts` and the semantic-root tests claim `bigint`
   support. The semantic-root unit test proves a manually constructed value,
   not a driver-exported row.
6. Required proof is absent or weaker than claimed. `feasibility.spec.ts:99-105`
   checks WAL/timeout values but not a reader during an open writer transaction;
   lines 107-116 omit shared-memory permissions; lines 133-157 detect corruption
   but do not prove partial results cannot be served; and lines 159-190 exercise
   writer contention rather than the required busy-reader behavior.
   `rebuild.spec.ts:101-113` checks file residue, not concurrent old/new reader
   visibility, and has no lane-lock or concurrent-writer rejection fixture.
   The source architecture suite was not extended to prevent driver imports or
   raw SQL/path surface leakage.
7. The structural report missed hard-limit functions. The Jasmine `describe`
   callback in `spec/storage/feasibility.spec.ts:55-213` is 159 physical lines,
   and the callback in `spec/storage/rebuild.spec.ts:61-149` is 89 lines. Both
   exceed the project-wide function hard reject above 80 lines, without a
   pre-approved exception. The implementation report's claim that the longest
   function is approximately 13 lines is therefore incorrect.
8. The ADR overstates acceptance and supported evidence. It marks itself
   `Accepted` before independent review, asserts Node 24 and macOS/Windows
   support without the governing runtime floor or corresponding target proof,
   and calls packaging risk eliminated without evaluating the pinned commons
   SQLite dependency already present in Watchtower's dependency graph.

## Expected Corrected State

1. Repeat the Nirvana audit with symlink-following inspection of all pinned
   public database/storage exports and comparable Nira usage. Map the commons
   SQLite facade against every §8A.2-§8A.5 semantic. Use the suitable public
   Nirvana API where it fits; for each missing semantic, record the exact gap
   and choose a narrow Watchtower adapter or an upstream Nirvana improvement.
   Re-evaluate the driver decision from that evidence instead of preserving
   `node:sqlite` by assumption.
2. Restore the official Node `>=26.4.0` floor everywhere and synchronize
   `package-lock.json`, dist metadata, ADR language, and proof commands.
3. Replace the exported raw connection/executor surface with focused typed
   store-owned capabilities. Raw SQL, arbitrary statements, paths, extension
   controls, driver classes/types, and driver construction must remain private
   to the selected adapter/store/migration owner. Add an architecture gate that
   fails on forbidden imports and exports.
4. Make rebuild publication consume the accepted lane/projection lock boundary
   and ordering. Use unique adjacent staging, close/checkpoint, fsync the staged
   database before rename/publication, never unlink sidecars belonging to a live
   connection, and prove concurrent writers cannot overlap publication. Readers
   must see a complete old or complete new store.
5. Make every admitted SQLite scalar round-trip deterministically, including
   64-bit integers, or narrow the typed contract with governing justification.
   Semantic-root proof must use rows actually exported through the driver.
6. Land the complete negative/concurrency/recovery matrix: WAL reader during
   writer, busy-read behavior, database/WAL/SHM modes, corruption refusal with
   no partial results, concurrent reader atomic switch, concurrent writer
   exclusion, staged fsync/publication, true external kill crash recovery, and
   clean supported-target package/global-install driver resolution.
7. Split all callbacks/functions to the mandatory limits and report the actual
   AST/physical-line counts. Keep every module cohesive and below its category
   threshold without compressed or embedded-script evasion.
8. Mark the ADR as proposed/pending until re-review and limit platform claims to
   reproduced supported targets. Preserve the explicit no-JSON-shard-fallback
   and disposable-derived-substrate rules.

## Exact Files To Change

- `docs/spec/decisions/sqlite-driver-selection.md`
- `package.json`
- `package-lock.json`
- `src/foundation/storage/SqliteConfig.ts`
- `src/foundation/storage/SqliteDriver.ts`
- `src/foundation/storage/SqliteRebuilder.ts`
- `src/foundation/storage/index.ts`
- `src/foundation/storage/nodeSqlite.d.ts` if `node:sqlite` remains selected;
  otherwise remove it
- `src/foundation/storage/semanticRoot.ts`
- `src/foundation/storage/sqlitePorts.ts`
- `spec/basic/sourceArchitectureCheck.spec.ts`
- `spec/storage/feasibility.spec.ts`
- `spec/storage/rebuild.spec.ts`
- `spec/storage/semanticRoot.spec.ts`
- `spec/storage/sqliteConfig.spec.ts`
- `.local/agent-reports/wt-read-model/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
- this work brief and paired review brief status lines

## Required Additional Proof

- Record the corrected Nirvana audit with exact inspected package versions,
  public symbols, comparable Nira call sites, selected facade APIs, and any
  remaining semantic gaps.
- Run the full driver candidate matrix against Node `>=26.4.0`, including clean
  dist/global installation and actual runtime loading on every claimed target.
- Prove parameterization and typed 64-bit row round trips without exposing a raw
  SQL/path/driver surface; prove the automated architecture gate rejects those
  forbidden surfaces.
- Prove FK insert/update/delete rejection, WAL reader concurrency, bounded busy
  behavior, `0600` database/WAL/SHM modes, integrity, corruption refusal, staged
  logical/semantic reproduction, old/new reader atomicity, writer exclusion,
  and true `SIGKILL` crash recovery.
- Reproduce categorized module, function, callback, and constructor line counts.
- Run `./node_modules/.bin/nvb build`, `./node_modules/.bin/nvb test`,
  `./node_modules/.bin/nvb dist`, `npm install -g ./dist`, `git diff --check`,
  ownership checks, implementation-agent no-commit proof, and `.local/`
  staging proof.

All other DB-01 scope, acceptance criteria, dependency gates, and the explicit
no-JSON-shard-fallback rule remain unchanged.
