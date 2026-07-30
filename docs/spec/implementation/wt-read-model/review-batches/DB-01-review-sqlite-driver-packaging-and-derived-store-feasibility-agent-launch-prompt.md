# Agent Launch Prompt — Review Batch DB-01

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for architectural feasibility review, driver evaluation, storage contract audit, and global-install proof`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, ADR, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying driver selection, storage contracts, native
binding behavior, rebuild correctness, and crash safety without trusting the
implementation report. The reviewer must understand SQLite semantics (WAL mode,
busy handling, foreign keys, integrity checks, atomic rename) and Node native
module packaging.

You are assigned **review batch DB-01** for the Watchtower v1 wt-read-model
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/review-batches/DB-01-review-sqlite-driver-packaging-and-derived-store-feasibility.md`
2. `docs/spec/implementation/wt-read-model/review-batches/README.md`
3. `docs/spec/implementation/wt-read-model/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-read-model/work-batches/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md` (paired work brief)
5. `.local/agent-reports/wt-read-model/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md` (implementation report)
6. `docs/spec/v1.md` (especially §12, §15)
7. `docs/spec/v1-contracts.md` (especially §8A derived SQLite storage contract)
8. `docs/spec/architecture.md` (especially A-033, §11.1)
9. `docs/spec/v1-implementation-map.md` (especially §1.1, §4)
10. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
11. The actual changed source files:
    - `src/foundation/storage/StorageAdapter.ts`
    - `src/foundation/storage/SqliteConfig.ts`
    - `src/foundation/storage/SqliteDriver.ts`
    - `docs/spec/decisions/sqlite-driver-selection.md`
    - `spec/storage/feasibility.spec.ts`
    - `package.json`

## Your Review Mission

Independently verify that the implementation selects and proves a conforming
SQLite driver, builds a correct typed storage abstraction, and documents the
decision properly:

1. **ADR audit**: Read `docs/spec/decisions/sqlite-driver-selection.md`. Verify
   it documents the evaluated candidates, selection rationale, failure model,
   platform constraints, packaging requirements, and most critically, the
   explicit no-JSON-shard-fallback rule. Confirm the rationale matches Nirvana
   ecosystem conventions.
2. **Driver selection verification**: Confirm `better-sqlite3` was selected.
   Verify the driver satisfies every requirement in `v1-contracts.md §8A.2`:
   parameterized statements, no extension-loading path, transactions, foreign
   keys, integrity checks, busy handling, deterministic typed row access, and
   packaging without undeclared system database or compiler dependency.
3. **Storage adapter contract audit**: Inspect `StorageAdapter.ts`. Verify no
   raw SQL strings, driver internals, database file paths, or extension-loading
   capabilities are exposed in the public interface. Confirm the interface is
   sufficient for downstream SQLite-owning batches (CA-01 parameterized pack
   index compilation, CA-02 bounded typed queries, CA-03 runtime journal
   checkpoints and incremental append, CA-16 session metadata and excerpts).
4. **SqliteConfig audit**: Verify the shipping defaults match
   `v1-contracts.md §8A.4`: foreign keys enabled, extension loading disabled,
   5,000 ms busy timeout, WAL mode, owner-only permissions, bounded prepared
   statements only, no automatic unbounded checkpoint/vacuum on foreground
   reads. Confirm the config provides a factory function with validated optional
   overrides.
5. **Global install proof**: Independently run `nvb dist && npm install -g
   ./dist`. Verify the globally installed `wt` resolves the SQLite driver at
   runtime. Confirm the native binding is packaged correctly and no undeclared
   system dependency is required.
6. **Feasibility proof — FK enforcement**: Independently run the foreign-key
   fixture tests. Verify insert, update, and delete violations against related
   tables are rejected. Confirm the error diagnostics are clear.
7. **Feasibility proof — WAL mode**: Verify WAL mode is activated on database
   creation. Prove that a concurrent reader can access the store while a writer
   holds an open transaction.
8. **Feasibility proof — Busy timeout**: Verify the busy timeout is configured.
   Prove that a concurrent reader correctly observes the timeout rather than
   failing silently.
9. **Feasibility proof — Permissions**: Verify database files have owner-only
   permissions. Confirm WAL and shared-memory files also have restricted
   permissions.
10. **Feasibility proof — Integrity and corruption**: Run integrity_check on a
    newly created populated store. Manually corrupt database bytes and verify
    integrity_check fails with a diagnostic. Confirm the corrupted store does
    not silently return partial results.
11. **Feasibility proof — Staged rebuild**: Populate a store from canonical
    sources. Rebuild from the identical sources into a staging path. Verify
    logical rows are identical (same count, same content, same primary-key
    order). Compute the semantic root per `v1-contracts.md §8A.3` for both
    stores. Verify identical semantic roots even when SQLite file bytes differ.
12. **Feasibility proof — Atomic switch**: Verify the staging database is
    atomically switched to the active path under a lock. Confirm readers see
    either the complete old store or the complete new store.
13. **Feasibility proof — Crash safety**: Simulate an interrupted write. Verify
    the store is recoverable via WAL recovery or detectably corrupt without
    silent data loss. Confirm no partial rows are served.
14. **Scope boundary audit**: Verify no derived indexes, pack compilers,
    projections, or session stores have been implemented. Confirm the batch
    proves the storage substrate only.
15. **Hard-reject checklist**: Run the 16-item checklist from
    `implementation-quality-and-agent-rules.md`. Reject immediately if any item
    flags.
16. **Build and test**: Run `nvb build` and `nvb test` independently. Record
    exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without independently reproducing the global install proof.
- Do not accept without independently verifying semantic-root reproduction.
- Do not accept if raw SQL or driver internals leak through any public interface.
- Do not accept if any derived index, pack compiler, projection, or session
  store has been implemented.
- Do not accept if a JSON-shard fallback exists in any source file.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently run `nvb dist && npm install -g ./dist`. Verify runtime
  resolution of the SQLite driver.
- Independently run every feasibility fixture category.
- Independently compute the semantic root for both the original and the
  rebuilt store.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- The driver proves all feasibility criteria (global install, parameterized
  queries, FK enforcement, WAL mode, busy-timeout, permissions, integrity,
  corruption detection, staged rebuild, semantic-root reproduction, crash safety).
- The ADR documents the driver choice, its failure model, and the no-JSON-shard-fallback rule.
- The `StorageAdapter` contract provides a sufficient typed abstraction without
  exposing raw SQL or driver internals.
- The `SqliteConfig` shipping defaults match `v1-contracts.md §8A.4`.
- No derived indexes, pack compilers, projections, or session stores have been
  implemented.
- No raw SQL or driver internals leak to consumers.
- No JSON-shard fallback exists.
- All 16 hard-reject checklist items are clear.
- Build and tests pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/DB-01-correction-01.md` with exact required fixes.
The correction brief must include: rejection reasons with source locations,
expected corrected state, required additional proof, exact files to change,
and reference to this review. Correction retains the same DB-01 identity.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- the reviewer is the acceptance authority; independent proof is mandatory
- accept only when all feasibility criteria are satisfied
- if rejecting, create a correction brief with exact required fixes
- do not add `.local` artifacts to git
- the reviewer owns the acceptance commit; the implementation agent never commits
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one review report to:
- `.local/agent-reports/wt-read-model/reviews/DB-01-sqlite-driver-packaging-and-derived-store-feasibility-review.md`

Include: documents studied, independent proof reruns and outcomes (all 15 proof
items), structural verification, ADR audit result, global install verification
output, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
DB-01: SQLite driver, packaging, and derived-store feasibility accepted

[one-paragraph summary of what was verified and the key outcomes, including
the selected driver, proof categories passed, and confirmation that the
no-JSON-shard-fallback rule is documented in the ADR]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified proof categories, the selected driver
and version, the `StorageAdapter` contract surface verified, and any limitations
noted. Confirm that CA-01 (deterministic sealed-pack SQLite compiler) and RT-03
(NVB distribution staging including SQLite driver) may now be reviewed, and that
all downstream SQLite-owning batches must consume `StorageAdapter` rather than
raw `better-sqlite3` calls.
