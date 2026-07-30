# Agent Launch Prompt — Work Batch UK-01

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

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for cross-manifest comparison, asset classification, and schema compatibility checking`
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

You are assigned **implementation work batch UK-01** for the Watchtower v1
wt-upgrade-knowledge delivery lane.

This batch establishes the upgrade compatibility foundation: a pure read-only
matrix that classifies every managed asset into one of five outcomes and a
preview command that never mutates lane state. Every later upgrade batch
depends on this classification logic.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-upgrade-knowledge/README.md` — pack overview
2. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md` — delivery phases
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md` — batch status
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md` — hard acceptance rules
5. `docs/spec/implementation/wt-upgrade-knowledge/batch-reasoning-difficulty-ranking.md` — difficulty context
6. `docs/spec/implementation/wt-upgrade-knowledge/work-batches/UK-01-upgrade-compatibility-and-preview-planner.md` — work brief
7. `docs/spec/v1.md` — §11.5 (`wt upgrade`), §7.5 (install manifest schema), §6 (ownership model), §10.2 (exit codes)
8. `docs/spec/v1-contracts.md` — §3 (implementation-pack consumer contract), §11 (locking and recovery)
9. `docs/spec/schemas/v1.schema.json` — `upgradePlan`, `mutationResult` schemas
10. `docs/spec/architecture.md` — §4.3 (foundation services), §11.2 (filesystem integration testing)
11. the canonical source owners you will actually change:
    - `src/contracts/upgrade.ts` (create)
    - `src/foundation/UpgradePlanner.ts` (create)
    - `src/commands/UpgradeCommand.ts` (create)
    - `spec/basic/upgrade-preview.spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for cross-manifest structured comparison, five-outcome classification matrix, schema compatibility range matching, and no-mutation invariant proof through test doubles`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain manifest schema knowledge, the complete classification matrix algorithm, all five outcomes, and the no-mutation invariant across the session; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before writing any implementation code:

1. **Dependency map**: enumerate every module in `src/foundation/` and
   `src/contracts/` your code will import. Verify each dependency exists and
   its public API matches your planned usage.
2. **Inspect source**: read the existing `lane.json` parser, `install.json`
   parser, and `RuntimeCatalog` to understand file formats and resolution
   patterns. Do not guess manifest structure.
3. **Invariants**: state the three critical invariants for this batch before
   coding: (a) preview never mutates lane state, links, or manifests;
   (b) every managed asset receives exactly one classification;
   (c) schema compatibility failures block the plan.
4. **Counterexamples**: for each classification outcome, write down the
   counterexample test case before implementing. For the conflict case,
   explicitly decide: what happens when a managed path has an unrecognized
   regular file vs. a directory vs. does not exist?
5. **Spec disagreements**: if the v1.md spec, v1-contracts.md, and schema
   bundle disagree on any field, stop and report. The precedence chain in
   v1-contracts.md §1 governs.
6. **Predecessor reports**: LC-03 and RT-02 accepted reports are in
   `.local/agent-reports/`. Review them for any known limitations that
   affect manifest parsing or path resolution.

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

Create the upgrade compatibility foundation:

1. Define `UpgradePlan`, `AssetClassification`, `CompatibilityMatrix`, and
   `SchemaCompatibility` contract types in `src/contracts/upgrade.ts`
2. Implement `src/foundation/UpgradePlanner.ts` with the five-outcome
   classification matrix and read-only preview
3. Implement `src/commands/UpgradeCommand.ts` with preview-only behavior:
   parse `--lane=<slug-or-uuid>`, `--to=<version>`, `--apply` (parsed but
   deferred to UK-03 with "not implemented" message), `--json`, `--dry-run`
4. Render human output: table of changed/preserved/added/removed/conflicted
   paths with old and new checksums, schema compatibility assessment
5. Render JSON output via `--json`: `upgradePlan` object validated against schema
6. Exit 0 for clean preview; exit 5 on unmanaged conflicts; exit 4 on missing
   target runtime; exit 3 on lane not found
7. Write comprehensive Jasmine specs covering every classification outcome,
   error path, and no-mutation invariant
8. Verify `nvb build` passes
9. Write the implementation report

## What You Must Not Do

- Write to the filesystem during preview (no link updates, no manifest writes,
  no runtime staging)
- Implement `--apply` behavior (parsed but exits with "not implemented")
- Implement migration steps or migration registry (owned by UK-02)
- Implement atomic staging or crash recovery (owned by UK-03)
- Implement host adapters or skill install (owned by UK-04)
- Implement `wt version` command (owned by UK-05)
- Modify `lane.json`, `install.json`, or any lane state
- Add product logic to `src/cli.ts`
- Commit any code

## Required Proof

- Every classification outcome has a focused spec with synthetic manifest
  fixtures
- Schema compatibility matrix coverage: compatible, incompatible (too old,
  too new), missing declaration
- Missing target runtime produces error code 4
- At least one unmanaged conflict produces exit code 5
- `--json` output validates against `$defs.upgradePlan` in the schema bundle
- Write-tracking filesystem double proves zero writes during any preview call
- Integration smoke: `node build/src/cli.js upgrade --lane=<slug>` renders
  preview without error
- All Jasmine specs pass via `nvb test` (or equivalent project test command)
- `nvb build` passes
- Exact proof commands used and output recorded
- Final `git status --short`
- Proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md` — mark UK-01 as ⏳ awaiting review
- `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md` — mark UK-01 phase status as ⏳

Do NOT mark as ✅ — only the reviewer does that.

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- every managed asset receives exactly one classification
- preview is default; no mutation without `--apply`
- no shell evaluation of lane config or state in TypeScript
- match Nirvana CLI patterns — `@nirvana/base/cli`, NVB for build/dist
- delegate to foundation modules; commands stay thin
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md`

The report must include:

- documents studied
- exact files created and modified with before/after line counts
- exact test commands run and their output (pass/fail counts)
- every open question or intentional limitation
- any spec discrepancies discovered during implementation
- a handoff summary for the UK-02 agent and the reviewer
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record which foundation APIs are now stable: the `UpgradePlan` type shape,
the `UpgradePlanner.ts` classification function signature, the exit-code
convention for preview commands, and the no-mutation invariant proof method.
Make explicit that UK-02 consumes the `AssetClassification` type family and
the upgrade plan format. Note any edge cases discovered and the exact
command to run tests.
