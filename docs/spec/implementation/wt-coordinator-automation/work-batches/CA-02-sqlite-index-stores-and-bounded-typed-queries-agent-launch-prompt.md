# Agent Launch Prompt — Work Batch CA-02

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
14. Accepted DB-01 storage adapter
15. the canonical source owners you will actually change:
    - `src/foundation/index-store.ts` (create)
    - `src/foundation/index-query.ts` (create)
    - `spec/basic/index-store-spec.ts` (create)
    - `spec/basic/index-query-spec.ts` (create)

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
   no raw SQL exposed outside `index-store.ts`; no full-pack-scan fallback;
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

Build the typed query facade over the compiled SQLite index:

1. Create `src/foundation/index-store.ts` — the ONLY module that imports
   `better-sqlite3` or any SQLite primitive. Owns: `openIndex`, `close`,
   `verifyIndexIntegrity` (PRAGMA integrity_check + FK verification + semantic
   root check), `invalidateIndex`, `currentIndexDigest`, and all internal typed
   query methods that translate to parameterized SQL. No raw SQL strings are
   accepted from callers.

2. Create `src/foundation/index-query.ts` — the typed query facade. Owns:
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
- Do not import `better-sqlite3` outside `index-store.ts`.
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
  prove they appear ONLY in `index-store.ts`
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
- grep results proving no raw SQL outside `index-store.ts`
- grep results proving no full-pack fallback
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

State: which files were created/changed, the complete typed query method
signatures, the storage capsule boundary (what lives in `index-store.ts` vs
`index-query.ts`), which proofs passed, the grep evidence for no-raw-SQL and
no-full-pack-fallback, and what the CA-03 (runtime SQLite indexes and
projections) agent needs to know about the typed query contract and the
`IndexStore` interface.
