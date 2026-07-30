# Agent Launch Prompt — Review Batch DB-01

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
    - focused SQLite ports under `src/foundation/storage/` (a generic
      `StorageAdapter` is not expected)
    - `src/foundation/storage/SqliteConfig.ts`
    - `src/foundation/storage/SqliteDriver.ts`
    - `docs/spec/decisions/sqlite-driver-selection.md`
    - `spec/storage/feasibility.spec.ts`
    - `package.json`

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

## Your Review Mission

Independently verify that the implementation selects and proves a conforming
SQLite driver, builds a correct typed storage abstraction, and documents the
decision properly:

1. **ADR audit**: Read `docs/spec/decisions/sqlite-driver-selection.md`. Verify
   it documents viable synchronous and asynchronous candidates, reproduced
   selection evidence, failure model, platform constraints, packaging
   requirements, and the no-JSON-shard-fallback rule. Reject an appeal to
   ecosystem convention as a substitute for evidence.
2. **Driver selection verification**: Independently reproduce the decisive
   evidence for whichever driver the ADR selected. Verify it satisfies every
   requirement in `v1-contracts.md §8A.2`:
   parameterized statements, no extension-loading path, transactions, foreign
   keys, integrity checks, busy handling, deterministic typed row access, and
   packaging without undeclared system database or compiler dependency.
3. **SQLite port audit**: Inspect the focused connection/transaction/store
   boundaries. Verify no raw SQL strings, arbitrary statements, driver
   internals, database paths, or extension-loading capabilities are exposed to
   domain consumers. Reject a generic universal `StorageAdapter` that conflates
   this capsule with Nirvana commons storage. Confirm the ports are sufficient
   for downstream SQLite-owning batches (CA-01 parameterized pack
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
- The focused SQLite/store ports provide sufficient typed boundaries without
  exposing raw SQL, arbitrary statements, paths, extensions, or driver internals.
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
and version, the focused SQLite port surfaces verified, and any limitations
noted. Confirm that CA-01 (deterministic sealed-pack SQLite compiler) and RT-03
(NVB distribution staging including SQLite driver) may now be reviewed, and that
all downstream SQLite-owning stores must consume focused typed ports rather than
the selected driver package directly.
