# Agent Launch Prompt — Work Batch UK-02

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
    - `src/foundation/migration-registry.ts` (create)
    - `src/foundation/migration-steps.ts` (create)
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

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- `migration-registry.ts` (registry): target 160 lines; hard reject above 220
- `migration-steps.ts` (steps): target 220 lines per version-pair file; split
  into `migration-steps/v1-to-v2.ts`, `migration-steps/v2-to-v3.ts`, etc. if
  multiple version pairs exist; each file hard reject above 300
- Test module: target 300 lines per artifact class; hard reject above 400
- No monolithic migration-steps module over 400 lines
- No `helpers/`, `utils/`, `common/`, or `misc/` overflow modules

## Your Mission

Create the migration registry and version-step implementations:

1. Implement `src/foundation/migration-registry.ts` with version-pair
   registration (`{sourceSchemaVersion, targetSchemaVersion} → step function`)
   and chain resolution (`resolveMigrationChain(fromVersion, toVersion)`)
2. Implement `src/foundation/migration-steps.ts` with all v1→v1.* steps that
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
- Modify the UK-01 `UpgradeCommand` or `upgrade-planner.ts`
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
