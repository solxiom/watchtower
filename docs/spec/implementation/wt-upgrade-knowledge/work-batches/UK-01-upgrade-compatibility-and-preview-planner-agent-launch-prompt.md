# Agent Launch Prompt — Work Batch UK-01

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
    - `src/foundation/upgrade-planner.ts` (create)
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

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- `UpgradeCommand` (command front door): target 160 lines, scrutinize at 220,
  hard reject above 300
- `upgrade-planner.ts` (foundation): target 220 lines, justify at 300,
  expected split at 350, hard reject above 400
- `src/contracts/upgrade.ts` (types): target 160 lines, hard reject above 220
- Test module: target 300 lines; split by classification family if larger
- No `helpers/`, `utils/`, `common/`, or `misc/` overflow modules

## Your Mission

Create the upgrade compatibility foundation:

1. Define `UpgradePlan`, `AssetClassification`, `CompatibilityMatrix`, and
   `SchemaCompatibility` contract types in `src/contracts/upgrade.ts`
2. Implement `src/foundation/upgrade-planner.ts` with the five-outcome
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
the `upgrade-planner.ts` classification function signature, the exit-code
convention for preview commands, and the no-mutation invariant proof method.
Make explicit that UK-02 consumes the `AssetClassification` type family and
the upgrade plan format. Note any edge cases discovered and the exact
command to run tests.
