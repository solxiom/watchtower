# Agent Launch Prompt — Work Batch CA-02

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
- agent suitability: `high for typed query facade design, SQLite storage capsule isolation, and corruption-safe bounded reads`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
that can load the complete brief/spec/source context, inspect and edit the
repository with tools, reason across contract boundaries, and run the required
proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, or cross-module
  integration closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch CA-02** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch builds the typed query facade over the compiled SQLite index — no
consumer ever issues raw SQL, all reads go through bounded typed methods with
limits/cursors/truncation, and stale/missing/corrupt indexes are refused.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-02-sqlite-index-stores-and-bounded-typed-queries.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md`
5. `docs/spec/v1-contracts.md` — especially §8A (derived SQLite storage contract, typed query boundary)
6. `docs/spec/architecture.md` — especially §4.8 (coordinator decision plane services)
7. `docs/spec/coordinator-automation.md` — especially §9.4 (query contract), §9.5 (complexity requirements)
8. `docs/spec/schemas/v1.schema.json`
9. `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`
10. `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
11. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
12. `docs/spec/v1-implementation-map.md` — section 8 (CA-02)
13. Accepted CA-01 compiler output — the SQLite schema (all tables with FK constraints), `computeSemanticRoot`, and the published `current.json` pointer format
14. Accepted DB-01 focused SQLite ports and driver capsule, including the
    recorded driver decision and typed lifecycle/failure contracts
15. the canonical source owners you will actually change:
    - `src/foundation/IndexStore.ts` (create)
    - `src/foundation/IndexQuery.ts` (create)
    - `spec/basic/indexStore.spec.ts` (create)
    - `spec/basic/indexQuery.spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for typed query facade design and SQLite storage capsule isolation`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   typed query methods, storage capsule boundary, cursor/pagination contract,
   and corruption detection paths.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, failure precedence, concurrency
   or re-entrancy risks, compatibility constraints, and deliberately unsupported
   behavior before choosing or evaluating a design. Pay special attention to:
   no raw SQL exposed outside `IndexStore.ts`; no full-pack-scan fallback;
   corruption detected and refused, never silently served.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating ownership, safety, or public result
   semantics, then ensure focused proof rejects it.
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

Build the typed query facade over the compiled SQLite index:

1. Create `src/foundation/IndexStore.ts` — the domain pack-index store behind
   DB-01 focused SQLite ports. It does not import the selected driver package
   or expose arbitrary SQL/handles. Owns: `openIndex`, `close`,
   `verifyIndexIntegrity` (PRAGMA integrity_check + FK verification + semantic
   root check), `invalidateIndex`, `currentIndexDigest`, and all internal typed
   query methods that translate to parameterized SQL. No raw SQL strings are
   accepted from callers.

2. Create `src/foundation/IndexQuery.ts` — the typed query facade. Owns:
   - `getArtifact`, `getBatch`, `getBatches`, `getBatchesByIds`,
     `getDependencies`, `getDependents`, `getRequirements`, `getRepositories`,
     `getProofs`, `getArtifactsByBatch`
   - `assembleBatchContext` — the ONLY method that composes multi-table context
     for decision envelopes
   - Cursor/pagination with hard limits (max 200 per page, max depth 10 for
     dependency traversal, max 64 KiB for artifact content)
   - Stale/missing/corrupt index detection before every query
   - Never returns partial data; corruption → no query completes

3. Implement the complete error taxonomy: `INDEX_UNAVAILABLE`, `INDEX_STALE`,
   `INDEX_CORRUPT`, `INDEX_CURSOR_INVALID`, `INDEX_BATCH_NOT_FOUND`,
   `INDEX_ARTIFACT_NOT_FOUND`, `INDEX_REQUIREMENT_NOT_FOUND`,
   `INDEX_LIMIT_EXCEEDED`, `INDEX_SCHEMA_MISMATCH`.

4. Prove the no-fallback guarantee: grep the entire changed source for pack
   manifest reading, JSONL scanning, or full-file loading outside the compiler
   — prove none exist in query/store paths.

5. Write focused Jasmine specs covering: all typed query methods with valid
   results, bounded reads (no full table scan), stale detection, corruption
   detection, cursor/revision semantics, page limits, dependency resolution
   with depth enforcement, and model-free architecture check.

## What You Must Not Do

- Do not expose raw SQL, database handles, or SQLite primitives to any
  consumer of `IndexQuery`.
- Do not import the selected SQLite driver package outside the DB-01 driver
  capsule. Keep pack-index statements inside `IndexStore` typed methods.
- Do not fall back to reading pack JSON files when the index is unavailable.
- Do not serve partial or unverified data when the index is corrupt.
- Do not invoke any model, LLM, or AI.
- Do not modify the CA-01 compiler output schema or SQLite table definitions.
- Do not modify `src/cli.ts` or any command file.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- `nvb build` passes
- `nvb test` passes
- All typed query methods return correct results from a compiled 30-batch index
- Bounded reads: no single query performs a full table scan or unindexed scan
- Stale detection: tampering with pack seal in `index_meta` → `INDEX_STALE`
- Corruption detection: corrupt SQLite bytes → `INDEX_CORRUPT`, all queries blocked
- Truncated database detected and refused
- Cursor mismatch → `INDEX_CURSOR_INVALID`
- Revision change invalidates old cursors
- Page limit 201 → `INDEX_LIMIT_EXCEEDED`
- Dependency resolution correct for 5-deep chain; depth limit 10 enforced
- No raw SQL exposed: grep `.exec(`, `.run(`, `.prepare(`, `.all(`, `.get(` —
  prove they appear ONLY in `IndexStore.ts`
- No full-pack/JSON-shard fallback in query/store paths
- Model-free architecture check passes
- exact proof commands used
- final `git status --short`
- proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- Never expose raw SQL or database handles to consumers.
- Never load the complete index into memory for a single bounded query.
- Never serve data from a corrupt, missing, or stale index.
- Never fall back to full-pack scanning, JSON-shard reading, or model summarization.
- Atomic pointer switch — no window where queries see a partially published index.
- Model-free — no model invocation through any code path.
- No unindexed scans, no transitive joins without a covering index, no table scans.
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-02-sqlite-index-stores-and-bounded-typed-queries.md`

The report must include:

- documents studied
- exact files changed
- exact owners introduced or modified
- physical line counts for every new source/spec file
- responsibility inventories for warning-band files
- proof commands and outcomes
- grep results proving no raw SQL outside `IndexStore.ts`
- grep results proving no full-pack fallback
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

State: which files were created/changed, the complete typed query method
signatures, the storage capsule boundary (what lives in `IndexStore.ts` vs
`IndexQuery.ts`), which proofs passed, the grep evidence for no-raw-SQL and
no-full-pack-fallback, and what the CA-03 (runtime SQLite indexes and
projections) agent needs to know about the typed query contract and the
`IndexStore` interface.
