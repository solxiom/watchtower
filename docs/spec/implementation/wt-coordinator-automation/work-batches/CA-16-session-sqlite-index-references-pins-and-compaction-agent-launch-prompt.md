# Agent Launch Prompt — Work Batch CA-16

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5` — strongest required for SQLite index design with derived-store contract enforcement, bounded-query typing, cross-session non-transitive capsule boundaries, compaction with journal-preservation guarantees, and the critical index-vs-authority separation
- agent suitability: `high for SQLite embedded store design, derived-index construction, typed query layer implementation, and data-separation enforcement`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto` — must be steered away from exposing raw SQL, storing full text in the index, or making the index authoritative
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration — insufficient for SQLite schema design and derived-store contract reasoning
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. CA-16 is R5 because the session index
is derived infrastructure that must never become authoritative — a raw SQL
escape hatch, full-text storage in the index instead of excerpts, a transitive
capsule expansion, or compaction that touches journals would violate the
fundamental authority separation. Select a currently available agent that can
reason about the SQLite schema, bounded query design, capsule boundaries, and
the derived-store contract.

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

You are assigned **implementation work batch CA-16** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch builds the SQLite-backed session index — bounded metadata and
excerpts, cross-session non-transitive reference capsules, and compaction
that preserves pinned/recent turns. The exact full text remains journal-owned.
The SQLite store is derived and disposable. No raw SQL from consumers.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-16-session-sqlite-index-references-pins-and-compaction.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/operator-session.md` §10.2 — cross-session turn references
5. `docs/spec/operator-session.md` §11.2 — session indexes
6. `docs/spec/operator-session.md` §12 — compaction
7. `docs/spec/operator-session.md` §20 — filesystem contract
8. `docs/spec/coordinator-automation.md` §9 — pack index and bounded memory
9. `docs/spec/coordinator-automation.md` §9.2–9.5 — index structure, query, scaling
10. `docs/spec/v1-contracts.md` §8A — derived SQLite storage contract
11. Accepted CA-02 SQLite index stores and bounded typed queries
12. Accepted CA-15 session store and journal format
13. the canonical source owners you will actually work with:
    - `src/foundation/session-indexes.ts` (create)
    - `src/foundation/session-compaction.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5` — strongest required for SQLite index design with derived-store contract enforcement, bounded-query typing, cross-session non-transitive capsule boundaries, compaction with journal-preservation guarantees, and the critical index-vs-authority separation
- agent suitability: `high for SQLite embedded store design, derived-index construction, typed query layer implementation, and data-separation enforcement`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, types, SQLite schema, queries, capsules, compaction, tests, and
   status artifacts affected by this batch.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. Define the complete SQLite schema. For every column, define why it belongs
   in the index vs. remaining journal-owned. Enumerate every query and prove
   it is bounded (limit, cursor, max bytes).
4. Define the cross-session capsule contract: exactly what is included, what is
   excluded, and what makes it non-transitive. Prove that no transitive
   expansion is possible.
5. Enumerate every scenario where the index could be confused for authority.
   Prove that a missing index blocks queries (no full-history fallback).
   Prove that deleting and rebuilding the index yields identical logical rows.
6. Use counterexamples: identify at least one plausible full-text-in-index bug
   and at least one transitive-capsule-expansion bug, then ensure focused proof
   rejects them.
7. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
8. Treat predecessor reports as leads, not proof. Re-open the actual changed
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

Build the SQLite session index, cross-session capsules, and compaction:

1. Create `src/foundation/session-indexes.ts` with: the complete SQLite schema
   (operator_sessions, session_pins, turns, turn_refs, turn_open_questions,
   session_proposals, turn_reference_capsules), deterministic index build from
   journals, incremental update, bounded typed queries (no raw SQL to
   consumers), cross-session non-transitive turn reference capsules, index
   manifest, and disposability contract.
2. Create `src/foundation/session-compaction.ts` with: index-only compaction
   (prune old turns, preserve pinned/recent/active-proposal turns), compaction
   preview (dry-run), and the no-full-history-fallback constraint (missing
   index blocks queries, never scans journals).
3. Write focused Jasmine specs covering: index build (row counts, excerpts at
   500 chars, semantic-root determinism), incremental update (only new data),
   every bounded query, excerpt truncation (500 char cap proof), cross-session
   capsule (bounded, non-transitive, no operator message), cross-lane denial,
   pruned content tombstone, compaction (only index affected, journals
   untouched), compaction preview, disposability (delete + rebuild = same
   rows), no full-history fallback, and model-free audit.
4. Produce implementation report, update tracker/roadmap, leave handoff.

## What You Must Not Do

- Do not store full turn text in the SQLite index — excerpts only (500 chars
  max).
- Do not expose raw SQL to consumers — all access is through typed queries.
- Do not modify session journals or turn files during compaction.
- Do not implement session routing, budgets, proposals, or holds — that is
  CA-17.
- Do not fall back to scanning journals when the index is missing.
- Do not invoke models.
- Do not add npm scripts or NVB tasks.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- index build produces correct row counts and excerpts capped at exactly 500
  chars (or full content if shorter)
- semantic root is deterministic: same journals → same logical rows
- incremental update adds only new turns, never rewrites existing rows
- every typed query returns correct results with bounded pagination
- cross-session capsule: includes turn identity, decision class, snapshot,
  open questions, proposal IDs, 500-char answer excerpt, complete answer digest
- capsule does NOT include: operator message, transitive turn references
- cross-lane capsule request fails with `OPERATOR_SESSION_REFERENCE_DENIED`
- pruned content capsule resolves to tombstone
- compaction removes index rows only; journal files are untouched
- compaction preview correctly lists turns to remove without removing them
- delete sessions.sqlite, rebuild from journals → identical logical rows
- missing index → typed query fails with clear error, does NOT scan journals
- `nvb build` passes
- `nvb test` passes
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

- exact full text remains journal-owned; index stores only bounded excerpts
- no raw SQL exposed to consumers — all access through typed queries
- index is derived and disposable; journals are authority
- missing index blocks queries; no full-history fallback
- cross-session capsules are non-transitive
- compaction touches only the SQLite index, never journals or turn files
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-16-session-sqlite-index-references-pins-and-compaction.md`

The report must include:

- documents studied
- exact files changed
- exact owners introduced or modified
- physical line counts for every new source/spec file
- proof commands and outcomes
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact SQLite schema (all tables, columns, and constraints), the
complete typed query interface signatures, the cross-session capsule format
(fields included, fields excluded, non-transitivity proof), the compaction
algorithm, and the disposability contract. Note that CA-17 will consume this
index for session routing, budgets, and proposals.
