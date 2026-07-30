# Agent Launch Prompt — Work Batch RT-06

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
- agent suitability: `high — managed ownership, checksum validation, collision and escape safety`
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

You are assigned **implementation work batch RT-06** for the Watchtower
`wt-runtime-distribution` pack.

This batch implements managed lane links — the bridge between the immutable
runtime catalog and the lane's `bin/` directory. Every symlink must validate its
target checksums against the runtime manifest, refuse collisions with
non-managed files, and reject path-escape after resolution. Manifest-only
ownership means no managed path may exist without a manifest entry.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-06-managed-lane-links-and-compatibility-names.md`
2. `docs/spec/implementation/wt-runtime-distribution/work-batches/README.md`
3. `docs/spec/implementation/wt-runtime-distribution/work-batches/00-work-batch-index.md`
4. `docs/spec/implementation/wt-runtime-distribution/README.md`
5. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`
6. `docs/spec/v1.md` — especially §7 (install manifest schema, managed assets)
7. `docs/spec/v1-contracts.md` — especially §11 (locking)
8. RT-04 catalog, RT-05 adapter, RT-02 manifest types

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high — managed ownership, checksum validation, collision and escape safety`
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

1. Build a dependency and ownership map from the install manifest to managed
   links, the runtime catalog, and the lane directory.
2. Inspect the current source and accepted predecessor-batch output.
3. Enumerate safety invariants: checksum must match before link creation, no
   collision with non-managed files, symlink target must not escape runtime root
   after resolution, link source must not escape lane directory.
4. Use counterexamples: creating link without checksum check, overwriting
   operator-modified file, symlink following `..` outside lane, dead symlink
   treated as valid, compatibility name not in manifest.
5. When a spec and current source disagree, stop and resolve.
6. Treat predecessor reports as leads, not proof.

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

Implement manifest-only managed file ownership and lane task-profile pinning:

1. Implement `ManagedAssets` in `src/foundation/ManagedAssets.ts`:
   - `createLinks()` — validate target checksum, refuse escape/collision, create
     symlinks
   - `removeLinks()` — remove only manifest-owned symlinks with matching targets
   - `validateLinks()` — check every managed link exists, is a symlink, has
     valid target
2. Split planning, validation, mutation, compatibility mapping, and profile
   binding into focused collaborators; keep `ManagedAssets` a thin facade.
3. Implement `resolveCompatibilityName()` against canonical catalog actions
   allowed by the lane profile; unknown/disallowed names return `null`.
4. Implement task-profile installation/rebinding: verify catalog/profile/
   runtime IDs, versions, checksums, compatibility, and config/module target
   containment, then write the exact `install.json.taskRuntime` pin.
5. Prove participating-project root `nvb.json` is never created, edited,
   discovered, merged, or trusted.
6. Error codes: `LINK_TARGET_CHECKSUM_MISMATCH`, `LINK_TARGET_ESCAPE`,
   `LINK_SOURCE_COLLISION`, `LINK_SOURCE_ESCAPE`, `LINK_NOT_MANAGED`,
   `COMPATIBILITY_NAME_UNKNOWN`

## What You Must Not Do

- Do not manage files outside the lane `bin/` path.
- Do not resolve symlink targets without checksum validation against the catalog.
- Do not overwrite non-managed files.
- Do not allow link targets that escape the runtime root or lane directory.
- Do not let a task profile add code/tasks/handlers or override catalog pins.
- Do not create, edit, discover, or trust project `nvb.json`.
- Do not introduce adapter or smoke-proof logic.
- Do not commit.

## Required Proof

- Link creation with valid target and checksum
- Refusal: checksum mismatch, target escape (`..`), source collision, source
  escape
- Link removal only removes manifest-matching symlinks
- Link removal does not touch replaced regular files
- Link validation reports missing, broken, wrong-target, checksum-mismatched
- Compatibility name resolution: known → canonical, unknown → null
- Exact `install.json.taskRuntime` pin and target-containment proof
- Profile cannot add tasks/code or enable catalog-disallowed actions
- Malicious project `nvb.json` remains byte-identical and cannot affect target
- `createLinks` creates containing directories
- Architecture checks pass

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-runtime-distribution/RT-06-managed-lane-links-and-compatibility-names.md`

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact rejection paths (checksum, escape, collision), compatibility
name resolution map, and the manifest-only ownership rule. Make explicit that
RT-07 and LC-03 (Pack 3 lane layout) depend on managed links for `bin/`
construction.
