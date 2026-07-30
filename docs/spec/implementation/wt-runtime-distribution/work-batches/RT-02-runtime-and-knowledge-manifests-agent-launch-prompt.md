# Agent Launch Prompt — Work Batch RT-02

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
- agent suitability: `high — closed type-system design consumed by all later batches`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing
  specs, current source, predecessor handoff, and proof output in context; if it
  cannot do so, escalate the agent rather than shortening or partitioning away
  safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help
  with bounded exploration, but it cannot issue the final implementation or
  acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only
non-normative examples and may become unavailable or stale. Select a currently
available agent that can load the complete brief/spec/source context, inspect
and edit the repository with tools, reason across package boundaries, and run
the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, driver behavior,
  destructive migration safety, or cross-package closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch RT-02** for the Watchtower
`wt-runtime-distribution` pack.

This batch defines closed, versioned manifest schemas with SHA-256 checksums,
mode bits, and action records. Every later foundation module and NVB task
consumes these types. Getting the contract wrong here forces corrections in
RT-03 through RT-07.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-02-runtime-and-knowledge-manifests.md`
2. `docs/spec/implementation/wt-runtime-distribution/work-batches/README.md`
3. `docs/spec/implementation/wt-runtime-distribution/work-batches/00-work-batch-index.md`
4. `docs/spec/implementation/wt-runtime-distribution/README.md`
5. `docs/spec/implementation/wt-runtime-distribution/implementation-roadmap.md`
6. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`
7. `docs/spec/v1.md` — especially §§7 (filesystem contract), 12 (runtime invocation), 15 (packaging)
8. `docs/spec/v1-contracts.md` — especially §1 (precedence)
9. `docs/spec/architecture.md` — especially §§4.5 (lane task runtime and leaf
   adapter), 5.1 (package)
10. `docs/spec/schemas/v1.schema.json` — JSON Schema bundle
11. The RT-01 audit output — `src/foundation/RuntimeAssets.ts` and
    `src/foundation/AssetAudit.ts`
12. The current source under `src/contracts/` — to place manifest types

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high — closed type-system design consumed by all later batches`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing
  specs, current source, predecessor handoff, and proof output in context; if it
  cannot do so, escalate the agent rather than shortening or partitioning away
  safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help
  with bounded exploration, but it cannot issue the final implementation or
  acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, foundation modules, tests, and status artifacts affected by this
   batch.
2. Inspect the current source and accepted predecessor-batch output. Do not infer
   behavior from filenames, the implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, and compatibility constraints
   before choosing or evaluating a design.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating type safety, completeness, or validation
   accuracy, then ensure focused proof rejects it.
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

Define and validate runtime, knowledge, packaged-NVB catalog, and lane-profile
contracts:

1. Define `RuntimeManifestV1`, `RuntimeAssetV1`, `KnowledgeManifestV1`, and
   `KnowledgeAssetV1` in `src/contracts/manifests.ts`. Include `schemaVersion`,
   `sha256`, `executable`, `actions`, `role`, `requiredCommands`, and
   `compatibleLaneSchemaVersions` / `compatibleRuntimeVersions`.
2. Define `ValidationResult`, `ValidationError`, and `ValidationWarning` types.
   Error codes: `MISSING_ASSET`, `EXTRA_ASSET`, `CHECKSUM_MISMATCH`,
   `MODE_MISMATCH`, `UNKNOWN_SCHEMA_VERSION`.
3. Implement `ManifestValidator` in `src/foundation/ManifestValidator.ts`:
   - `validateRuntimeManifest(manifest: RuntimeManifestV1, actualDir: string): ValidationResult`
   - `validateKnowledgeManifest(manifest: KnowledgeManifestV1, actualDir: string): ValidationResult`
4. Add `$defs.runtimeManifest` and `$defs.knowledgeManifest` to
   `docs/spec/schemas/v1.schema.json` if not already present.
5. Verify every RT-01 inventoried asset fits the manifest types.
6. Define closed `RuntimeNvbManifestV1`, `TaskCatalogV1`, and
   `LaneTaskProfileV1` contracts covering config/module, fragments, handlers,
   tasks/groups, leaves, action mapping, input/result schemas, mutability,
   compatibility, checksums/modes, and explicit immutable targets.
7. Define reviewable `runtime-nvb/catalog/` capability fragments and a
   deterministic aggregate-generation/validation task contract for
   `runtime-nvb.json` and `task-catalog.json`. Reject duplicate IDs, dangling
   references, incompatible schemas, undeclared files, and stale aggregates.
8. Prove a lane profile only narrows catalog actions and cannot add/override
   code, tasks, handlers, paths, targets, or checksums.
9. Map every RT-01 script classification to its TaskHandler/leaf/wrapper/removal
   catalog treatment.

## What You Must Not Do

- Do not create a second manifest type owner.
- Do not add runtime execution or subprocess spawning to the validator.
- Do not create actual `manifest.json` files in the source tree — only type
  definitions and schema templates.
- Do not implement TaskHandlers, package staging, `LaneTaskRunner`, or managed
  links. Catalog/profile contracts, fragments, and deterministic aggregate
  generation are required.
- Do not add npm scripts or unrelated/public/project-root task surfaces; place
  the aggregate task in the accepted repository NVB ownership surface.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- `RuntimeManifestV1` and `KnowledgeManifestV1` validate against JSON Schema bundle
- validator rejects missing file, extra file, checksum mismatch, mode mismatch,
  and unknown schema version
- closed records reject unknown executable/task/profile fields except explicit
  metadata extension points
- every RT-01 inventoried asset is representable in manifest types
- deterministic config/catalog aggregates match fragments
- duplicate/stale/dangling/schema-mismatched aggregates are rejected
- profiles cannot add code/tasks or escape immutable runtime targets
- exact proof commands used
- final `git status --short`
- proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

- `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- `docs/spec/implementation/wt-runtime-distribution/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- manifest types must be closed — no `any` or `unknown` fields for required data
- every rejection path must be independently testable
- unknown schema versions must fail closed
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-runtime-distribution/RT-02-runtime-and-knowledge-manifests.md`

The report must include: documents studied, exact files changed, line counts for
all new files, each rejection path verified, JSON Schema validation results, proof
commands and outcomes, final `git status --short`, one proposed commit message.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact manifest type shapes, all five validator rejection paths and
their error codes, the JSON Schema bundle location, and the validation result
for the synthetic valid manifest fixture. Make explicit that RT-03 must use these
types to validate the NVB dist layout, and RT-04 must use them to stage
immutable runtimes.
