# Agent Launch Prompt — Work Batch RT-03

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

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for bounded build configuration with focused proof`
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

You are assigned **implementation work batch RT-03** for the Watchtower
`wt-runtime-distribution` pack.

This batch implements the packaged Watchtower NVB task runtime and produces a
validated `dist/` tree including runtime, knowledge, generated task catalog,
focused public-API TaskHandlers, and the DB-01-selected SQLite driver. The build
pipeline compares manifests/catalogs against actual files and rejects missing,
extra, stale-aggregate, mode, or checksum mismatches. This closes both the
legacy copy-list omission and the risk of shipping a task catalog that does not
match its handlers.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-03-nvb-distribution-staging.md`
2. `docs/spec/implementation/wt-runtime-distribution/work-batches/README.md`
3. `docs/spec/implementation/wt-runtime-distribution/work-batches/00-work-batch-index.md`
4. `docs/spec/implementation/wt-runtime-distribution/README.md`
5. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`
6. `docs/spec/v1.md` — especially §15 (packaging)
7. `docs/spec/v1-contracts.md`
8. The RT-02 manifest types — `src/contracts/manifests.ts`
9. The RT-01 asset inventory — `src/foundation/RuntimeAssets.ts`
10. The DB-01 SQLite driver selection and feasibility report — selected package,
    actual artifact/ABI/platform map, loader API, and checksums
11. `docs/spec/nirvana-integration-architecture.md`, especially sections 2–4.6
12. Current `runtime-nvb/`, `nvb.json`, and repository NVB handlers; inspect
    `nira.json` only as ecosystem metadata

## Reasoning / Agent Class

- brief-declared reasoning level: `R3`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for bounded build configuration with focused proof`
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

1. Build a dependency and ownership map from capability fragments through
   generated task/config aggregates, handlers, repository build/dist tasks,
   packaged layout, and validation points.
2. Inspect the current source and accepted predecessor-batch output. Do not infer
   behavior from filenames, the implementation report, or the launch prompt.
3. Reconcile the packaging layout in `v1.md` with the fuller packaged task
   runtime contract in `nirvana-integration-architecture.md`; include explicit
   config/module/catalog/handler assets and record any unresolved normative
   conflict rather than silently omitting them.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path `nvb dist` while silently omitting a runtime script or skipping
   checksum validation.
5. When a spec and current source disagree, stop that line of implementation.
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

Implement the packaged task runtime and distribution staging:

1. Extend `runtime-nvb/catalog/` and `runtime-nvb/handlers/` with focused
   capability fragments and handlers that extend the pinned public Nirvana
   `TaskHandler` API.
2. Compile `runtime-nvb/runtimeNvb.ts` and deterministically generate/validate
   `runtime-nvb.json` plus `task-catalog.json`; reject duplicate or stale task,
   group, action, handler, input-schema, or result-schema entries.
3. Extend the repository's actual `nvb.json`/handler build surface with
   `wt:pack:runtime` and `wt:runtime:validate`. Do not invent `dist.nvb` and do
   not treat `nira.json` as a task registry without pinned build-system proof.
4. Stage runtime, knowledge, complete packaged NVB config/module/catalog/
   handlers, and the DB-01-selected driver artifacts into `dist/`.
5. Package driver artifacts according to the accepted ADR and supported-target
   evidence. Do not assume a universal `dist/driver/` layout or claim four-host
   proof from one machine.
6. Validate every manifest/catalog/file/checksum/mode/handler relationship and
   preserve declared executable bits.
7. Prove two clean `nvb dist` runs produce identical managed file lists,
   checksums, modes, and generated aggregate content.

## What You Must Not Do

- Do not add npm convenience scripts — use NVB tasks only.
- Do not copy `node_modules` into `dist/`.
- Do not modify runtime script content.
- Do not introduce `LaneTaskRunner` or managed-link logic; the packaged catalog
  and TaskHandlers are required scope for this batch.
- Do not commit.

## Required Proof

- `nvb dist` produces correct `dist/` layout
- Generated task/config aggregates exactly match reviewed fragments
- Every handler uses the pinned public `TaskHandler` API and structured
  event/result contracts
- Complete packaged config/module/catalog/handler tree is present and loadable
- Selected driver resolves after clean global install on the current target;
  CI/artifact evidence covers each additional supported target
- Dist manifest includes selected driver version, artifacts, checksums, loader,
  ABI, and supported-target mapping from DB-01
- `wt:runtime:validate` passes on correct dist
- `wt:runtime:validate` fails on missing, extra, checksum-mismatched, and
  mode-mismatched assets
- Executable bits preserved on runtime scripts
- Two consecutive builds produce identical `dist/` trees
- `nvb build` still compiles TypeScript source
- Architecture checks pass
- Exact commands and outcomes recorded

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-runtime-distribution/RT-03-nvb-distribution-staging.md`

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact catalog actions/tasks/groups/handlers, explicit packaged config
and module targets, dist layout, driver artifacts, validation failure classes,
structured result contracts, and reproducible-build proof. Make explicit that
RT-05 consumes this pinned runtime and RT-07 depends on its relocated smoke
proof.
