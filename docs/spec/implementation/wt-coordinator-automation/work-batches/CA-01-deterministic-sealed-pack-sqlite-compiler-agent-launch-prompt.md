# Agent Launch Prompt — Work Batch CA-01

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for deterministic SQLite compilation, FK integrity, seal verification, and semantic-root proof`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only
non-normative examples and may become unavailable or stale. Select a currently
available agent that can load the complete brief/spec/source context, inspect
and edit the repository with tools, reason across contract boundaries, and run
the required proof without replacing evidence with narrative confidence.

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

You are assigned **implementation work batch CA-01** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch builds the deterministic sealed-pack SQLite compiler — the model-free
foundation that compiles accepted sealed pack manifests into a derived SQLite
index with FK integrity, semantic-root identity, and staged immutable publication.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-01-deterministic-sealed-pack-sqlite-compiler.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md`
5. `docs/spec/v1-contracts.md` — especially §3 (pack consumer contract), §8A (derived SQLite storage contract)
6. `docs/spec/architecture.md` — especially §3.1 (domain model), §4.8 (coordinator decision plane), A-033 (SQLite)
7. `docs/spec/coordinator-automation.md` — especially §9 (pack index and bounded memory)
8. `docs/spec/schemas/v1.schema.json`
9. `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`
10. `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
11. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
12. `docs/spec/v1-implementation-map.md` — section 8 (CA-01)
13. Accepted DB-01 storage adapter — the SQLite driver and typed storage boundary
14. Accepted LC-02 pack acceptance/seal output — the pack consumer contract
15. Accepted LC-05 coordinator baselines and initial pack index bootstrap
16. the canonical source owners you will actually change:
    - `src/foundation/pack-index.ts` (create)
    - `src/foundation/pack-index-compiler.ts` (create)
    - `spec/basic/pack-index-spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for deterministic SQLite compilation and FK integrity verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   SQLite tables, FK constraints, compilation stages, error codes, and test
   fixtures affected by this batch.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, failure precedence, concurrency
   or re-entrancy risks, compatibility constraints, and deliberately unsupported
   behavior before choosing or evaluating a design. Pay special attention to:
   semantic root computed from logical rows never raw SQLite bytes; FK integrity
   across all tables; staged write-then-rename crash safety.
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

Establish the deterministic sealed-pack SQLite compiler:

1. Create `src/foundation/pack-index.ts` with all domain types required for
   the pack index: `PackIndex`, `PackIndexBatch`, `PackIndexRequirement`,
   `PackIndexRepository`, `PackIndexArtifact`, `PackIndexDependency`,
   `PackIndexProof`. All types are plain objects with explicit TypeScript
   annotations. No `any` types on public interfaces.

2. Create `src/foundation/pack-index-compiler.ts` with:
   - `compilePackIndex(packRoot, lock, dbPath)` — reads `implementation-pack.json`,
     validates against the lock seal, extracts all logical rows, and writes
     into SQLite via the DB-01 storage adapter.
   - `verifyPackSeal(packRoot, lock)` — verifies every sealed file's bytes,
     recomputes the seal, checks path rules.
   - `computeSemanticRoot(dbPath)` — exports all logical rows in canonical
     order, RFC 8785 canonicalizes, produces `sha256:...` semantic root.
     Raw SQLite bytes are NEVER part of identity.
   - `publishIndex(tempDbPath, targetDir)` — writes to temp file, verifies FK
     integrity and semantic root, atomically renames active pointer.
   - Cross-reference validation before any SQLite insert.
   - Linear build: processes files once in deterministic order.
   - Staged publication: write to temp → verify → atomic rename.
   - Seal-drift detection: compare current vs new seal before publication.

3. Define the complete SQLite schema: `artifact`, `batch`, `batch_repository`,
   `dependency`, `requirement`, `batch_requirement`, `repository`, `proof`,
   `index_meta` tables with FK constraints (`ON DELETE CASCADE`).

4. Implement the complete error taxonomy: `PACK_SEAL_MISMATCH`,
   `PACK_FILE_BYTES_MISMATCH`, `PACK_FILE_MISSING`, `PACK_FILE_UNTRACKED`,
   `PACK_FILE_SYMLINK`, `PACK_PATH_ESCAPE`, `CROSS_REFERENCE_INVALID`,
   `PACK_JSON_INVALID`, `PACK_JSON_MISSING`, `INDEX_FK_VIOLATION`,
   `INDEX_SEMANTIC_ROOT_MISMATCH`, `INDEX_STAGED_CORRUPT`, `SEAL_DRIFT_DETECTED`.

5. Write focused Jasmine specs covering: seal reproduction, semantic-root proof
   (two compilations identical logical rows, raw SQLite bytes may differ),
   FK integrity across all tables, staged write-then-rename with simulated
   crash at every stage, corrupt partial index detected and refused,
   cross-reference matrix, path escape, corrupt/missing/untracked file,
   seal-drift detection, invalid JSON, linear-build proof, model-free check.

## What You Must Not Do

- Do not import any model, LLM, or AI library.
- Do not perform any network I/O.
- Do not write any lane state, config, or manifest file.
- Do not introduce non-deterministic ordering — use explicit sorting for all
  object-key iteration and row export.
- Do not modify any file outside `src/foundation/pack-index.ts`,
  `src/foundation/pack-index-compiler.ts`, and the spec directory.
- Do not modify the pack consumer contract from LC-02.
- Do not modify `src/cli.ts` or any command file.
- Do not treat raw SQLite bytes as semantic identity.
- Do not bypass the DB-01 storage adapter for raw SQLite access.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- `nvb build` passes
- `nvb test` passes
- Seal reproduction: identical seal computed from fixture pack lock
- Semantic-root proof: two independent compilations produce identical logical
  rows and semantic-root digest (raw SQLite bytes may differ)
- Rebuild produces identical logical row set (semantic root proof)
- FK integrity across all index tables verified
- Staged write-then-rename with simulated crash at every stage — active pointer
  never points to corrupt or partial index
- Corrupt partial index detected and refused
- Every cross-reference failure detected with exact source location
- Every file/digest error detected with correct error code
- Path-escape fixtures all rejected
- 300-batch synthetic pack compiles correctly with linear-build proof
- Architecture check verifies no model/AI imports in compiler or index modules
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

- Entirely model-free. No model invocation through any code path.
- Identical logical rows from identical sealed input — semantic root is the
  canonical logical-export digest, not raw SQLite bytes.
- Linear build — process each file exactly once in deterministic order.
- All cross-references and FK constraints validated — no unresolved reference.
- Staged publication — write to temp, verify, atomic rename. No partial index
  ever becomes the active pointer.
- The index is reconstruction-only; raw SQLite bytes never define semantic
  identity.
- Seal-drift blocks automated cycles until recompilation.
- Read-only — the compiler writes the index to a temp directory; the pointer
  switch is the only mutation.
- No non-deterministic ordering — explicit sort for all key iteration.
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-01-deterministic-sealed-pack-sqlite-compiler.md`

The report must include:

- documents studied
- exact files changed
- exact owners introduced or modified
- physical line counts for every new source/spec file
- responsibility inventories for warning-band files
- proof commands and outcomes
- negative-path and failure-injection evidence
- any unresolved limitations stated honestly
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

Before writing code, enumerate: every type definition, every SQLite table,
every FK constraint, every compiler stage, every error code, every test
scenario, and every proof obligation. Verify the plan against the normative
spec sections listed above.

## Leave a helpful handoff message for the next agent

State: which files were created/changed, the final SQLite schema (all tables
with FKs), the semantic-root algorithm (logical-export → RFC 8785 canonicalize
→ sha256), which proofs passed, which limitations are acknowledged, and what
the CA-02 (SQLite index stores and bounded typed queries) agent needs to know
about your accepted compiler contract — especially the table definitions,
FK relationships, and the `computeSemanticRoot` function signature.
