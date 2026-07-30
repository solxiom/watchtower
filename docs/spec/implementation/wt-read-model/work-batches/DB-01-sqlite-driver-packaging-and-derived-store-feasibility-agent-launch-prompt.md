# Agent Launch Prompt — Work Batch DB-01

## Governing Contract And Precedence — Mandatory

This prompt is an execution aid, not product authority. Resolve conflicts in
this order and stop for a specification amendment rather than inventing
behavior:

1. `docs/spec/v1-contracts.md` and `docs/spec/schemas/v1.schema.json`
2. `docs/spec/v1.md`
3. `docs/spec/nirvana-integration-architecture.md`,
   `docs/spec/coordinator-automation.md`, `docs/spec/operator-session.md`, and
   `docs/spec/cli-session.md` within their scopes
4. `docs/spec/architecture.md`
5. `docs/development/engineering-and-review-standard.md`
6. `AGENTS.md`
7. the accepted implementation map, pack rules, and this batch brief

The implementation/review agent must read the mandatory engineering standard
and Nirvana integration architecture in full. A stale path, module suggestion,
or technical mechanism in this prompt must be corrected to the governing
contract while preserving the batch objective and proof obligations.

## Nirvana-First And NVB Execution Gate — Mandatory

- Complete and report the required Nirvana API usage audit before introducing
  infrastructure or bare Node behavior.
- Commands use Nirvana command, argument, pretty, and terminal-view APIs and
  remain thin.
- Public reason codes, exit mappings, event names, and schema identifiers remain
  owned by accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`. A
  batch-local symbolic name is not automatically public; reconcile it with the
  registry, and update the owning contract/schema in the same batch when a new
  public identifier is genuinely required.
- Use the Nirvana storage facade for ordinary managed-root operations only
  after CLI-safe root/bootstrap semantics are proved. Atomic durability,
  canonical path security, locking, append-only journals, ownership/modes, and
  SQLite stay behind focused adapters when the facade lacks required semantics.
- Use the Nirvana logger only through the Watchtower logging boundary for
  redacted diagnostics. Logs are never command output, lifecycle events,
  acceptance evidence, or authoritative journals.
- Substantial deterministic workflows use the immutable packaged Watchtower
  NVB catalog, focused TaskHandlers, and task groups.
- `LaneTaskRunner` is the only internal NVB invocation boundary. Task selection
  is an allowlisted Watchtower action mapping, never an arbitrary user/agent
  task name or parent-project discovery.
- Never create or modify a participating repository's root `nvb.json`.
- Shell is restricted to checksum-manifested leaf adapters for tmux, Git, or
  external tools when no conforming Nirvana API exists. Workflow-level shell is
  a hard reject.
- Mutating tasks do not gain authority from NVB. They require the normal
  Watchtower effect executor, current-state validation, locks, idempotency, and
  a valid single-use invocation envelope.

## Project-Wide Structural And Size Gate — Mandatory

Apply the exact limits in
`docs/development/engineering-and-review-standard.md`; pack-local numbers may
be stricter but may never relax them:

- CLI entry, command, or NVB task: preferred at most 120 lines, warning at
  121–160, hard reject over 180.
- Orchestrator, controller, or renderer shell: preferred at most 140 lines,
  warning at 141–180, hard reject over 200.
- Foundation service, planner, validator, adapter, or store: preferred at most
  200 lines, warning at 201–260, hard reject over 300.
- Contract/type/schema registry: preferred at most 240 lines, warning at
  241–320, hard reject over 400.
- Test/spec module: preferred at most 300 lines, warning at 301–420, hard reject
  over 500.
- Function: target at most 40 lines, justification at 41–60, reject over 80.
- Constructor: target at most 25 lines, warning at 26–40, reject over 50.

Passing a line limit never excuses mixed responsibilities, a god object,
generic helper bag, hidden cycle, foreign API laundering, or layer violation.
Use `PascalCase` for classes/class-owning files, `lowerCamelCase` for non-class
modules and directories, and never introduce dashed or underscored backend
source/spec names.

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
    - focused SQLite port modules under `src/foundation/storage/` (create;
      do not create a generic `StorageAdapter`)
    - `src/foundation/storage/SqliteConfig.ts` (create)
    - `src/foundation/storage/SqliteDriver.ts` (create)
    - `docs/spec/decisions/sqlite-driver-selection.md` (create)
    - `spec/storage/feasibility.spec.ts` (create)
    - `package.json` and distribution configuration (update only after the ADR
      selects a conforming driver)

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

Line count is a design alarm, never permission to accumulate unrelated work.
Count physical lines, including comments and blanks, in new and materially
rewritten hand-maintained files. Generated artifacts are excluded only when
their generator ownership is explicit and they contain no hand-maintained
behavior.

Use the exact project-wide matrix:

| Category | Preferred maximum | Warning band | Hard reject |
| --- | ---: | ---: | ---: |
| CLI command, NVB TaskHandler/front door, registry, renderer, public barrel | 120 | 121–160 | over 180 |
| Orchestrator, controller, coordinator, presenter | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contract/type-only module | 240 | 241–320 | over 400 |
| Test/spec module | 300 | 301–420 | over 500 |

Functions target 40 lines, warn at 41–60, and reject above 80. Constructors
target 25 lines, warn at 26–40, and reject above 50. Warning-band owners require
a responsibility inventory and explicit reviewer judgment.

Every module has one primary responsibility and one cohesive reason to change.
Commands and TaskHandlers validate, normalize, delegate, and map results.
Orchestrators sequence collaborators without absorbing their algorithms.
Storage, validation, rendering, subprocess/leaf I/O, and state-machine policy do
not accumulate in one owner. Three independently nameable responsibilities
require a split even below a preferred maximum.

Class-owning TypeScript modules use PascalCase filenames; function/value modules
use lowerCamelCase. New source filenames do not use dashes or underscores.
Generic `helpers`, `utils`, `common`, and `misc` overflow bags are rejected.

Any size exception must be approved before implementation and name the exact
file, proposed maximum, cohesion reason, reviewer, and expiry/follow-up batch.
Existing oversized files are not precedent: when touched they become smaller,
split, or remain line-count neutral under an approved extraction plan.

The implementation report records categorized line counts for every new or
materially rewritten file plus warning-band functions/constructors. The
reviewer reproduces those counts and independently judges cohesion. Passing a
line-count check never overrides the responsibility gate.

## Your Mission

Evaluate, select, and prove one conforming SQLite driver without assuming the
winner. The normative contract makes the driver an implementation
clarification; familiarity or an alleged Nirvana convention is not evidence.
Build a thin capability-specific SQLite capsule and prove it end-to-end:

1. **Driver selection**: Evaluate viable synchronous and asynchronous Node
   SQLite candidates against every storage, packaging, lifecycle, and supported
   platform requirement. Verify parameterization, transactions, foreign keys,
   integrity, busy handling, deterministic typed row access, and packaging
   without undeclared system dependencies. Document reproduced evidence.
2. **Create focused SQLite ports**: Define minimal internal
   connection/transaction/integrity/rebuild boundaries plus store-owned typed
   operations. Do not create a universal `StorageAdapter`; that name conflates
   this capsule with the Nirvana commons storage facade. Expose no raw SQL,
   arbitrary statements, paths, extensions, or driver internals to domain
   consumers.
3. **Create `src/foundation/storage/SqliteConfig.ts`**: Define a typed
   configuration capsule with shipping defaults from `v1-contracts.md §8A.4`:
   WAL mode, 5,000 ms busy timeout, foreign keys enabled, extension loading
   disabled, owner-only permissions. Provide a factory function that constructs
   a validated config from optional overrides.
4. **Create `src/foundation/storage/SqliteDriver.ts`**: Adapt the driver selected
   by the ADR to the focused ports. Support parameterized statements, explicit
   transactions, integrity checks, busy-timeout handling, WAL mode activation,
   and staged rebuild semantics (create staging path, build from canonical
   sources, verify semantic root, atomically switch).
5. **Write ADR**: Create `docs/spec/decisions/sqlite-driver-selection.md`
   documenting the evaluated candidates, selection rationale, failure model,
   platform constraints, packaging requirements, no-JSON-shard-fallback rule,
   and shipping configuration defaults with justification.
6. **Write feasibility fixtures**: Create `spec/storage/feasibility.spec.ts`
   with comprehensive proof coverage (see Required Proof below).
7. **Update packaging**: Add only the selected driver and actually required
   metadata. Record native/prebuilt/bundled artifacts for every supported
   target rather than assuming a package layout.

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
- `nvb build` passes with the selected driver dependency
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
- no raw SQL, arbitrary statements, paths, extensions, or driver internals
  leak through store-facing typed ports
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
- the ADR evidence summary and its compliance with the normative storage,
  packaging, lifecycle, and supported-platform requirements
- proof commands and outcomes for all required proof categories
- global install verification output
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the selected driver and version, the focused SQLite port surfaces,
the shipping `SqliteConfig` defaults, the ADR location and key decisions, and
the feasibility proof outcomes. Make explicit that CA-01 (deterministic
sealed-pack SQLite compiler) and RT-03 (NVB distribution staging including
SQLite driver) may now begin, and that all downstream SQLite-owning batches
must consume the focused typed ports rather than importing the selected driver
package directly. Note any
driver limitations discovered and whether they required spec clarifications.
