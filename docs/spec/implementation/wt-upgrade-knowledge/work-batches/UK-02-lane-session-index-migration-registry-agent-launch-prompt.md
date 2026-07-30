# Agent Launch Prompt — Work Batch UK-02

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
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with highest-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for multi-artifact preservation proofs, session-index rebuild from source journals, policy-baseline transformation, and dependency-graph step ordering`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with highest-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, all twelve artifact classes with their distinct preservation rules, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying value-preservation across twelve distinct
artifact classes, rebuilding session indexes from source journals, and
transforming policy baselines without corrupting operator-set values.

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

You are assigned **implementation work batch UK-02** for the Watchtower v1
wt-upgrade-knowledge delivery lane.

This batch implements the pure version-steps migration registry that transforms
lane schema, session indexes, and policy baselines across version boundaries
while preserving every lane-owned value and historical artifact. A bug in your
code permanently corrupts operator data.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-upgrade-knowledge/README.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/batch-reasoning-difficulty-ranking.md`
6. `docs/spec/implementation/wt-upgrade-knowledge/work-batches/UK-02-lane-session-index-migration-registry.md`
7. `docs/spec/v1.md` — §11.5 (migration requirements in upgrade), §6 (ownership classes), §7.3 (lane marker), §7.4 (bindings), §7.2 (per-workspace layout), §13 (state and event compatibility)
8. `docs/spec/v1-contracts.md` — §9 (event journal), §11 (locking and recovery)
9. `docs/spec/schemas/v1.schema.json`
10. `docs/spec/architecture.md` — §4.3 (foundation services)
11. UK-01 accepted report: `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md`
12. the canonical source owners you will actually change:
    - `src/foundation/MigrationRegistry.ts` (create)
    - `src/foundation/MigrationSteps.ts` (create)
    - `spec/basic/migration-registry.spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for twelve artifact classes with distinct preservation rules, session-index rebuild from source journals, policy-baseline transformation, dependency-graph step ordering, and byte-exact/truth-equivalent comparison proofs`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with highest-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain all twelve artifact classes and their preservation rules across the session; if it cannot do so, escalate the agent
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before writing any implementation code:

1. **Dependency map**: enumerate all artifact classes in the lane directory
   that migration steps may touch. For each, determine the canonical file
   path pattern, the file format (JSON/ENV/text), and the current v1 schema
   version they carry.
2. **Inspect source**: read `lane.json` schema (fields: schemaVersion, laneId,
   kind, slug, etc.), `install.json` schema, `lane.config.env` format,
   session journal locations, policy baseline locations. Do not assume field
   names.
3. **Invariants**: state before coding: (a) every lane-owned byte outside
   the schema version field is preserved; (b) session-index rebuild produces
   truth-equivalent output to a fresh index from source journals;
   (c) migration steps are pure functions of on-disk state — no runtime
   invocation, no session closure, no content pruning, no lifecycle change.
4. **Counterexamples**: for each artifact class, design the counterexample
   test: what happens if the source file is missing? Malformed? Has extra
   unknown fields? Already at the target version?
5. **Spec disagreements**: if v1.md §11.5 migration requirements conflict
   with v1-contracts.md §11 transaction rules, the contract-closure document
   wins.
6. **Predecessor reports**: UK-01 report may note limitations in manifest
   parsing. LC-05 report may note the current baseline schema version.
   Adjust step starting versions accordingly.

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

Create the migration registry and version-step implementations:

1. Implement `src/foundation/MigrationRegistry.ts` with version-pair
   registration (`{sourceSchemaVersion, targetSchemaVersion} → step function`)
   and chain resolution (`resolveMigrationChain(fromVersion, toVersion)`)
2. Implement `src/foundation/MigrationSteps.ts` with all v1→v1.* steps that
   are defined (at minimum, a v1→v1 no-op step proving the registry works;
   additional steps as needed for v1 schema evolution)
3. Each step function must: read source artifacts from `laneDir`, validate
   expected source schema, transform to target schema, write transformed
   artifacts to staging paths adjacent to originals, atomically rename staged
   versions into place
4. Staged rebuild: session indexes rebuilt from durable source journals, never
   from prior index files; policy baselines transformed to new schema while
   preserving all operator-set values
5. Write comprehensive Jasmine specs covering every migration step, chain
   composition, value preservation for all twelve artifact classes, and all
   negative paths
6. Verify `nvb build` passes
7. Write the implementation report

## What You Must Not Do

- Execute runtime actions, close sessions, or prune session content
- Change lane lifecycle states or modify committed implementation packs
- Implement atomic staging or crash recovery (owned by UK-03)
- Implement `--apply` orchestration or upgrade command integration
- Modify the UK-01 `UpgradeCommand` or `UpgradePlanner.ts`
- Add product logic to `src/cli.ts`
- Commit any code

## Required Proof

- Each migration step tested independently with synthetic fixture lanes
- Chain composition: multi-step migration preserving all twelve artifact classes
- Byte-exact preservation for: `lane.config.env`, `repositories.local.json`
- Field-level preservation for: `lane.json` (schemaVersion may change),
  `install.json` (versions may change)
- Session integrity: all IDs, turns, pins, lifecycle states survive
- Index rebuild: rebuilt index content matches fresh index from source
- Policy migration: operator-set limits, reserves, profiles, retention unchanged
- Missing intermediate step produces deterministic `MigrationPathNotFound`
- No runtime execution: verify zero subprocess spawns during any step
- No session closure: verify zero lifecycle state changes
- No content pruning: verify all session bytes survive in journal
- All Jasmine specs pass via `nvb test`
- `nvb build` passes
- Final `git status --short`
- Proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md` — mark UK-02 as ⏳ awaiting review
- `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md` — mark UK-02 phase status as ⏳

Do NOT mark as ✅ — only the reviewer does that.

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- Never commit `dist/`, `build/`, `node_modules/`, `.nira/local/`, `.watchtower/`
- Migration steps are pure functions of on-disk state
- Session content is preserved byte-for-byte
- No runtime invocation, no session lifecycle change, no content pruning
- Keep commands thin; algorithms live in foundation modules
- Match Nirvana CLI patterns — `@nirvana/base/cli`, NVB for build/dist
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-upgrade-knowledge/UK-02-lane-session-index-migration-registry.md`

The report must include:

- documents studied
- exact files created and modified with before/after line counts
- exact test commands run and their output (pass/fail counts)
- per-artifact-class preservation verification summary
- any open questions or intentional limitations
- a handoff summary for the UK-03 agent and the reviewer
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the migration registry API: the `registerStep` function signature,
`resolveMigrationChain` behavior, the registered version pairs and their
associated step functions, the twelve artifact classes proven preserved,
any edge cases discovered with specific artifact types, and the exact
command to run tests.
