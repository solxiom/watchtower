# Agent Launch Prompt — Work Batch DB-01

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for technology selection, architectural feasibility, and storage subsystem proof`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, ADR template, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only
non-normative examples and may become unavailable or stale. Select a currently
available agent that can load the complete brief/spec/source context, inspect
and edit the repository with tools, reason across contract boundaries, run
feasibility proofs including native bindings and global install, and write an
architectural decision record without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for technology selection, architectural tradeoffs, failure-model
  analysis, semantic-root reproduction, global-install proof, and cross-platform
  storage behavior.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch DB-01** for the Watchtower v1
wt-read-model delivery lane.

This batch selects and proves a conforming SQLite driver, builds a typed
storage abstraction capsule, writes an architectural decision record, and proves
feasibility across all required proof categories. Failure to prove feasibility
blocks all derived-store implementation and requires a specification amendment.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/work-batches/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`
2. `docs/spec/implementation/wt-read-model/work-batches/README.md`
3. `docs/spec/implementation/wt-read-model/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md` (especially §12 runtime invocation contract, §15 packaging)
5. `docs/spec/v1-contracts.md` (especially §8A derived SQLite storage contract)
6. `docs/spec/architecture.md` (especially A-033, §11.1 unit contracts)
7. `docs/spec/v1-implementation-map.md` (especially §1.1, §4 DB-01 row, §10.2–10.3 dependency waves)
8. `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
9. `docs/spec/implementation/wt-read-model/implementation-tracker.md`
10. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
11. the canonical source owners you will actually change:
    - `src/foundation/storage/StorageAdapter.ts` (create)
    - `src/foundation/storage/SqliteConfig.ts` (create)
    - `src/foundation/storage/SqliteDriver.ts` (create)
    - `docs/spec/decisions/sqlite-driver-selection.md` (create)
    - `spec/storage/feasibility.spec.ts` (create)
    - `package.json` (update — add `better-sqlite3` dependency)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for technology selection, architectural feasibility, and storage subsystem proof`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, types, storage abstractions, config, ADR, tests, and status
   artifacts affected by this batch.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, failure precedence, concurrency
   or re-entrancy risks, compatibility constraints, and deliberately unsupported
   behavior before choosing or evaluating a design.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating the storage contract (e.g., leaking raw SQL,
   skipping FK enforcement, accepting a corrupt database), then ensure focused
   proof rejects it.
5. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
6. Treat predecessor reports as leads, not proof. Re-open the actual changed
   files and reproduce all acceptance-critical evidence from the current tree.

## Structural Design And Module-Size Gate

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- Front doors and public barrels target 160 lines or fewer. Files from 161
  through 220 lines require an explicit cohesion justification. A hand-maintained
  front door over 220 lines is rejectable without a narrow pre-existing
  constraint, and no front door may exceed 300 lines.
- Focused implementation modules target 220 lines or fewer. Files from 221
  through 300 lines require a responsibility inventory and independent reviewer
  scrutiny. Files from 301 through 350 lines are expected to split; acceptance
  requires a source-backed reason why splitting would reduce ownership clarity.
  New or materially rewritten implementation modules above 350 lines are rejected.
- Four hundred physical lines is the absolute ceiling for every hand-maintained
  JS/TS source or spec module touched by this lane. The ceiling does not make a
  mixed-responsibility file acceptable.
- Split a module below those thresholds when it owns three or more independently
  nameable concerns.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
  Use feature-local capsules with explicit owner names.
- Record physical line counts for every new or materially rewritten file. The
  reviewer must independently verify warning-band files and reject unjustified
  growth.

## Your Mission

Select and prove one conforming SQLite driver (`better-sqlite3` preferred per
Nirvana ecosystem conventions). Build a thin typed storage abstraction capsule
and prove it works end-to-end:

1. **Driver selection**: Evaluate `better-sqlite3` against the storage contract
   requirements in `v1-contracts.md §8A.2`. Verify it supports parameterized
   statements, transactions, foreign keys, integrity checks, busy handling,
   deterministic typed row access, and packaging without undeclared system
   dependencies. Document the selection rationale.
2. **Create `src/foundation/storage/StorageAdapter.ts`**: Define the typed
   storage abstraction interface. Include parameterized query methods, explicit
   transaction boundaries, prepared statement support, typed row iteration, and
   integrity utilities. Expose no raw SQL or driver internals to consumers.
3. **Create `src/foundation/storage/SqliteConfig.ts`**: Define a typed
   configuration capsule with shipping defaults from `v1-contracts.md §8A.4`:
   WAL mode, 5,000 ms busy timeout, foreign keys enabled, extension loading
   disabled, owner-only permissions. Provide a factory function that constructs
   a validated config from optional overrides.
4. **Create `src/foundation/storage/SqliteDriver.ts`**: Implement the
   `StorageAdapter` contract using `better-sqlite3`. Support parameterized
   statements, explicit transactions, integrity checks, busy-timeout handling,
   WAL mode activation, and staged rebuild semantics (create staging path, build
   from canonical sources, verify semantic root, atomically switch).
5. **Write ADR**: Create `docs/spec/decisions/sqlite-driver-selection.md`
   documenting the evaluated candidates, selection rationale, failure model,
   platform constraints, packaging requirements, no-JSON-shard-fallback rule,
   and shipping configuration defaults with justification.
6. **Write feasibility fixtures**: Create `spec/storage/feasibility.spec.ts`
   with comprehensive proof coverage (see Required Proof below).
7. **Update `package.json`**: Add `better-sqlite3` as a dependency. Add
   `@types/better-sqlite3` if the driver does not bundle its own types.

## What You Must Not Do

- Do not implement any derived indexes, pack compilers, projections, or session
  stores yet. This batch proves the storage substrate only.
- Do not expose raw SQL, driver internals, or database file paths to commands,
  foundation consumers, or agents.
- Do not create non-rebuildable stores. Every store must be rebuildable from
  canonical sources. The rebuild contract must produce identical logical rows.
- Do not fall back to JSON shards. If the driver cannot be proven, stop and
  raise a specification amendment through the correction process.
- Do not change existing scaffold commands or their help.
- Do not change the product specification or architecture without an ADR entry.
- Do not introduce extension loading paths, user-defined SQL hooks, or
  arbitrary database paths from project configuration.
- Do not commit.

## Required Proof

Before finishing, verify and report:

**Driver and packaging proof:**
- `nvb build` passes with `better-sqlite3` as a dependency
- `nvb test` passes including all storage feasibility specs
- `nvb dist` produces a package containing the SQLite driver native binding
- `npm install -g ./dist` succeeds from the dist output directory
- The globally installed `wt` resolves the SQLite driver at runtime

**Integrity and correctness proof:**
- Parameterized query execution with typed row access (select, insert, update)
- Foreign-key enforcement: insert/update/delete violations are rejected with
  clear error diagnostics
- WAL mode is activated and can be verified via `PRAGMA journal_mode`
- Busy-timeout: a concurrent reader observes the busy timeout rather than
  failing silently; the configured 5,000 ms timeout is respected
- Database file permissions are owner-only (0600 or platform equivalent) after
  creation
- `PRAGMA integrity_check` passes on a newly created populated store
- Corrupt database detection: manually mutate database bytes, then verify
  `integrity_check` fails with a diagnostic, not a crash

**Rebuild and semantic-root proof:**
- Open a store, populate typed rows from canonical sources
- Rebuild into a staging path from the identical canonical sources
- Verify logical rows are identical (same count, same content, same primary-key
  order)
- Verify the semantic root (computed per `v1-contracts.md §8A.3`) is identical
  between the original and the rebuild, even when SQLite file bytes differ
- Atomically switch the staging database to the active path under a lock

**Crash and recovery proof:**
- Simulate an interrupted write (kill process mid-transaction)
- Verify the store is recoverable (WAL recovery) or detectably corrupt without
  silent data loss
- Verify that a corrupt or unrecoverable store does not produce partial rows

**Additional evidence:**
- Exact proof commands used
- Final `git status --short`
- Proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- the selected driver must satisfy every requirement in `v1-contracts.md §8A.2`
- no raw SQL or driver internals leak through the `StorageAdapter` interface
- every store must be rebuildable from canonical sources with identical logical rows
- no JSON-shard fallback is permitted
- foreign-key enforcement is mandatory
- extension loading must be disabled
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-read-model/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`

The report must include:

- documents studied
- exact files changed
- exact owners introduced or modified
- physical line counts for every new source/spec file
- the ADR content summary and its compliance with Nirvana ecosystem conventions
- proof commands and outcomes for all required proof categories
- global install verification output
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the selected driver and version, the `StorageAdapter` contract surface,
the shipping `SqliteConfig` defaults, the ADR location and key decisions, and
the feasibility proof outcomes. Make explicit that CA-01 (deterministic
sealed-pack SQLite compiler) and RT-03 (NVB distribution staging including
SQLite driver) may now begin, and that all downstream SQLite-owning batches
must consume `StorageAdapter` rather than raw `better-sqlite3` calls. Note any
driver limitations discovered and whether they required spec clarifications.
