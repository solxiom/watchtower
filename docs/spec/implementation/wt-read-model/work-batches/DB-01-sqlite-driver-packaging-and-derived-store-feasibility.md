# Batch DB-01 — SQLite Driver, Packaging, And Derived-Store Feasibility

Status: ❌ Pending
Phase: Storage feasibility
Depends on: RM-01 accepted

**Required implementor reasoning class:** `R5`
**Class rationale:** technology selection and architectural feasibility gate with far-reaching implications. The chosen driver and storage abstraction shape every derived index, projection, and session store. A wrong or unproven selection silently introduces packaging, integrity, concurrency, or recoverability failures that propagate to all SQLite-owning batches (CA-01–CA-03, CA-16) and the release qualification (REL-03). There is no JSON-shard fallback; failure requires a specification amendment.

## Objective

Select and prove one conforming SQLite driver (`better-sqlite3` preferred per Nirvana ecosystem conventions). Build a thin `src/foundation/storage/` capsule with `StorageAdapter`, typed `SqliteConfig`, parameterized query interface, foreign-key enforcement, WAL mode, busy-timeout, and staged rebuild semantics. Prove the driver works in global npm install context. Prove semantic-root reproduction (rebuild produces identical logical rows). Write an ADR documenting the driver choice, its failure model, and the no-JSON-shard-fallback rule.

This batch is a gating feasibility gate. Failure to identify a conforming driver blocks all derived-store implementation (CA-01, CA-02, CA-03, CA-16) and requires a specification amendment. It does not authorize a silent JSON-shard fallback.

## Required Work

1. Select and verify a conforming SQLite driver (`better-sqlite3` preferred). The driver must:
   - support the repository's pinned Node/NVB build and global-install targets;
   - use parameterized statements and expose no extension-loading path;
   - provide transactions, foreign keys, integrity checks, busy handling, and deterministic typed row access;
   - package without an undeclared system database or compiler dependency; and
   - pass distribution, ownership, crash, and supported-platform fixtures.
2. Create `src/foundation/storage/StorageAdapter.ts`: a typed abstraction over the SQLite driver. Provide parameterized queries, explicit transactions, foreign-key enforcement, prepared statements, and typed row iteration. Expose no raw SQL or driver internals to consumers.
3. Create `src/foundation/storage/SqliteConfig.ts`: a typed configuration capsule with shipping defaults (WAL mode, 5,000 ms busy timeout, foreign keys enabled, extension loading disabled, owner-only permissions).
4. Create `src/foundation/storage/SqliteDriver.ts`: the concrete `better-sqlite3` wrapper implementing the `StorageAdapter` contract. Support parameterized statements, explicit transactions, integrity checks, busy-timeout handling, WAL mode, and staged rebuild semantics.
5. Write `docs/spec/decisions/sqlite-driver-selection.md`: an architectural decision record (ADR) documenting:
   - the evaluated candidates and selection rationale;
   - the driver's failure model, platform constraints, and packaging requirements;
   - the no-JSON-shard-fallback rule and its rationale;
   - the driver's role as a disposable implementation substrate, not a new authority;
   - the shipping configuration defaults and their justification.
6. Write feasibility fixtures in `spec/storage/feasibility.spec.ts` proving:
   - Node/NVB build and test pass with the driver as a dependency;
   - global npm install (`nvb dist && npm install -g ./dist`) succeeds and the driver resolves correctly;
   - parameterized query execution with typed row access;
   - foreign-key enforcement (insert/update/delete violations rejected);
   - WAL mode activation and verification;
   - busy-timeout handling (concurrent reader observed, not rejected silently);
   - database file permissions are owner-only after creation;
   - integrity check (`PRAGMA integrity_check`) passes on a newly created store;
   - corrupt database detection (manual byte mutation → integrity check fails);
   - staged rebuild semantics: open a store, populate typed rows, rebuild from canonical sources into a staging path, verify logical rows are identical (semantic-root reproduction), then atomically switch;
   - crash safety: simulate an interrupted write, verify the store is recoverable or detectably corrupt without silent data loss.

## Expected Ownership

- `src/foundation/storage/StorageAdapter.ts` — typed storage abstraction interface.
- `src/foundation/storage/SqliteConfig.ts` — typed configuration capsule with shipping defaults.
- `src/foundation/storage/SqliteDriver.ts` — concrete `better-sqlite3` wrapper.
- `docs/spec/decisions/sqlite-driver-selection.md` — architectural decision record.
- `spec/storage/feasibility.spec.ts` — feasibility and proof fixtures.
- `package.json` — add `better-sqlite3` dependency (and `@types/better-sqlite3` if needed).

## Tests And Evidence

- Unit tests for `SqliteConfig` construction and default validation.
- Unit tests for `StorageAdapter` contract conformance (every method exercised).
- Feasibility fixture suite proving all required proof categories (see Required Proof below).
- `nvb build` passes with the SQLite driver as a dependency.
- `nvb test` passes including all storage feasibility specs.
- Global install proof: `nvb dist && npm install -g ./dist && wt --version` succeeds.

## What Must Not Change

- Do not implement any derived indexes yet. This batch proves the storage substrate only.
- Do not expose raw SQL or driver internals to commands, foundation consumers, or agents.
- Do not create non-rebuildable stores. Every store must be rebuildable from canonical sources.
- Do not fall back to JSON shards. If the driver cannot be proven, stop and raise a spec amendment.
- Do not change existing scaffold commands or their help.
- Do not change the product specification or architecture without an ADR entry.

## Review Procedure Highlights

1. Independently verify the driver selection rationale against the ADR and Nirvana ecosystem conventions.
2. Independently rerun every feasibility fixture: global install, FK enforcement, WAL mode, busy-timeout, integrity, corruption detection, staged rebuild, semantic-root reproduction, and crash safety.
3. Verify the `StorageAdapter` contract does not leak raw SQL or driver internals.
4. Verify the `SqliteConfig` shipping defaults match `v1-contracts.md §8A.4`.
5. Confirm no derived index or projection has been implemented.
6. Verify the ADR documents the no-JSON-shard-fallback rule explicitly.
7. Run `nvb build` and `nvb test` independently. Verify the driver resolves in global install context.

## Required Reasoning Posture

The assigned agent must reason from the governing specifications, the v1-contracts §8A storage contract, the architecture A-033 decision (SQLite only for disposable derived indexes/projections), and the current source baseline. This is a technology selection decision with architectural implications.

- Map the driver selection to every contract requirement in `v1-contracts.md §8A.2` (parameterized statements, no extension loading, transactions, foreign keys, integrity checks, busy handling, deterministic typed row access, packaging without undeclared dependencies).
- Enumerate the failure modes of the selected driver: what happens on corrupt database, missing native binding, NFS/filesystem without proper locking, concurrent access from a non-WAL store, and crash mid-write.
- Prove the driver can be rebuilt identically: two builds from the same canonical sources must produce identical logical rows and semantic roots, even when SQLite file bytes differ.
- Prove the global install path: `nvb dist` packages the native binding correctly, and `npm install -g ./dist` from the package output resolves the driver at runtime.
- Escalate any contradiction between the driver's actual behavior and the storage contract's requirements through a correction brief. Never silently accept a driver limitation as an implementation clarification.

## Structural And Module-Size Acceptance

This batch must leave focused, named owners and must reject ball-of-mud growth, god objects, giant coordinators, and generic overflow modules.

- Front doors and public barrels target at most 160 physical lines. The 161-220 band requires explicit cohesion justification; over 220 is rejectable without a narrow pre-existing constraint, and 300 is the absolute front-door ceiling.
- Focused implementation modules target at most 220 physical lines. The 221-300 band requires a responsibility inventory; 301-350 requires a source-backed reason not to split; over 350 is rejected for new or materially rewritten hand-maintained implementation code.
- No hand-maintained JS/TS source or spec module touched by the lane may exceed 400 physical lines. This ceiling never excuses mixed responsibilities.
- Split below the numeric thresholds when one file combines three or more independently nameable concerns.
- Do not create `helpers`, `utils`, `common`, or `misc` bags.
- Record physical line counts for every new or materially rewritten file in the implementation report.

## Required Review Packet

The implementation report must make independent verification possible. It must include:

- exact changed files and the ownership role of each
- physical line counts for every new or materially rewritten source/spec file
- a responsibility inventory for every warning-band file
- exact commands and actual results for focused and regression proof
- the ADR content and its compliance with Nirvana ecosystem conventions
- proof that `better-sqlite3` is the selected driver and that all alternatives were documented
- global install verification output
- final tracker/roadmap state, final git status, and proof that local reports are not staged
- unresolved limitations or deferred questions stated honestly

## Completion And Handoff

The SQLite driver is selected, proven, and documented. The `src/foundation/storage/` capsule provides a typed, parameterized, rebuild-safe storage abstraction. The ADR records the decision and the no-JSON-shard-fallback rule. The feasibility fixtures prove global install, FK integrity, WAL mode, busy-timeout, permissions, corruption detection, staged rebuild, and semantic-root reproduction.

DB-01 gates the derived-store path. CA-01 (deterministic sealed-pack SQLite compiler) and RT-03 (NVB distribution staging including SQLite driver) may begin after DB-01 is accepted. Downstream batches must consume the `StorageAdapter` interface, never raw `better-sqlite3` calls. Failure to prove feasibility requires a specification amendment before any derived-store work proceeds.
