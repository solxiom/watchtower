# Agent Launch Prompt — Work Batch CA-01

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
13. Accepted DB-01 focused SQLite ports and driver capsule — including the
    recorded driver decision, ownership boundary, lifecycle, and typed failures
14. Accepted LC-02 pack acceptance/seal output — the pack consumer contract
15. Accepted LC-05 coordinator baselines and initial pack index bootstrap
16. the canonical source owners you will actually change:
    - `src/foundation/PackIndex.ts` (create)
    - `src/foundation/PackIndexWriter.ts` (create)
    - `src/foundation/PackIndexCompiler.ts` (create)
    - `spec/basic/packIndex.spec.ts` (create)

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

Establish the deterministic sealed-pack SQLite compiler:

1. Create `src/foundation/PackIndex.ts` with all domain types required for
   the pack index: `PackIndex`, `PackIndexBatch`, `PackIndexRequirement`,
   `PackIndexRepository`, `PackIndexArtifact`, `PackIndexDependency`,
   `PackIndexProof`. All types are plain objects with explicit TypeScript
   annotations. No `any` types on public interfaces.

2. Create `src/foundation/PackIndexCompiler.ts` with:
   - `compilePackIndex(packRoot, lock, dbPath)` — reads `implementation-pack.json`,
     validates against the lock seal, extracts all logical rows, and writes
     into SQLite via DB-01's focused pack-index SQLite port.
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
- Do not modify any file outside `src/foundation/PackIndex.ts`,
  `src/foundation/PackIndexCompiler.ts`, and the spec directory.
- Do not modify the pack consumer contract from LC-02.
- Do not modify `src/cli.ts` or any command file.
- Do not treat raw SQLite bytes as semantic identity.
- Keep pack-index SQL in `PackIndexWriter.ts`, use DB-01's focused SQLite
  ports, and never import the selected driver outside its DB-01 capsule.
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
