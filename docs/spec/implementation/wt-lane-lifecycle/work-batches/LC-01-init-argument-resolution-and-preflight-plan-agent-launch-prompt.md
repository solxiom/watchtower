# Agent Launch Prompt — Work Batch LC-01

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
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for arg validation, schema matching, and combinatorial plan enumeration`
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

You are assigned **implementation work batch LC-01** for the Watchtower v1
wt-lane-lifecycle delivery lane.

This batch parses init CLI arguments, validates every field against the
specification patterns and schemas, resolves workspace/repository/runtime,
and constructs a complete preflight plan without creating any lane directory.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-01-init-argument-resolution-and-preflight-plan.md`
3. `docs/spec/implementation/wt-lane-lifecycle/work-batches/README.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`
5. `docs/spec/v1.md` — especially §7 (filesystem contract), §10.1 (global options), §10.3 (init command), §11.1 (init behavior), §14 (safety)
6. `docs/spec/v1-contracts.md` — especially §2 (init syntax), §3 (pack consumer), §4 (routing policy)
7. `docs/spec/v1-implementation-map.md` — especially §6 (this pack), §10-14
8. `docs/spec/architecture.md` — especially §4.2-4.4 (commands, foundation, contracts)
9. `docs/spec/schemas/v1.schema.json`
10. `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
11. `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
12. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
13. `docs/spec/implementation/wt-lane-lifecycle/batch-reasoning-difficulty-ranking.md`
14. the canonical source owners you will create or change:
    - `src/foundation/InitPlanner.ts` (new)
    - `src/commands/InitCommand.ts` (new)
    - `help/commands/init.hlp.json` (new)
    - `help/help.json` (edit to register init)
15. the dependency modules you must inspect:
    - RM-03: workspace/path resolution modules (foundation)
    - RM-08: conflict inspector modules (foundation)
    - RT-04: runtime catalog modules (foundation)
    - `src/contracts/` — for public type conventions
    - `src/commands/HelloCommand.ts` — for command class pattern
    - `src/cli.ts` — thin host; do not modify

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for arg validation, schema matching, and combinatorial plan enumeration`
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
   contracts, factories, lower-layer capsules, front doors, tests, and status
   artifacts affected by this batch.
2. Inspect the current source and accepted predecessor-batch output. Do not infer
   behavior from filenames, the implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, failure precedence, concurrency
   or re-entrancy risks, compatibility constraints, and deliberately unsupported
   behavior before choosing or evaluating a design.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating ownership, safety, boundedness, or public
   result semantics, then ensure focused proof rejects it.
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

Parse and validate init CLI arguments. Build a complete preflight plan without
any filesystem mutation. Create the init planner foundation and the InitCommand
front door.

1. Create `src/foundation/InitPlanner.ts`:
   - Define `InitArgs`, `InitPlan`, and all intermediate types in `src/contracts/`
     or inline in the planner if they serve only planning
   - Implement `validateInitArgs(args: Partial<InitArgs>): InitArgs`:
     - Parse and validate slug: required, must match `^[a-z0-9][a-z0-9-]{0,62}$`
     - Parse and validate tmux-prefix: required, must match `^[a-z0-9][a-z0-9-]{0,15}$`
     - Validate impl-pack path: required, resolve absolute or control-home-relative
     - Validate coordinator-routing: required, parse JSON and validate structure
     - Validate scope: optional, parse JSON, validate repository bindings schema
     - Validate runtime-version: optional, resolve through RT-04 catalog
     - Validate workspace: optional, canonicalize via RM-03
     - Validate update-gitignore: boolean, default false
     - Validate dry-run: boolean, default false
     - Check that destination lane does not already exist
     - Check that `/.watchtower/` is Git-ignored or `--update-gitignore` is set
   - Implement `buildInitPlan(args: InitArgs): Promise<InitPlan>`:
     - Generate stable UUID via `crypto.randomUUID()`
     - Resolve control-home workspace through RM-03
     - Build repository binding list (from scope or control-home default)
     - Detect writable worktree/branch/path conflicts via RM-08
     - Generate `lane.json` preview with all required fields
     - Generate `install.json` preview with managed asset references
     - Generate `repositories.local.json` preview
     - Generate `lane.config.env` preview
     - Enumerate all directories to create (lane root, coordinator/, state/,
       prompts/, reports/, budgets/, logs/, bin/, coordinator/ subdirectories)
     - Enumerate all managed runtime links to create under bin/
     - Enumerate coordinator/session baseline entries (values from v1-contracts.md §7)
     - Enumerate pack index entries
     - Emit warnings for detected conflicts and issues
   - In dry-run mode: `buildInitPlan` returns the complete plan; the caller
     decides whether to apply

2. Create `src/commands/InitCommand.ts`:
   - Extend BaseCommand; name `"init"`; group `"lane"`
   - Parse args: positional `<slug>`, flags `--tmux-prefix`, `--impl-pack`,
     `--coordinator-routing`, `--scope`, `--runtime`, `--workspace`,
     `--update-gitignore`, `--dry-run`
   - Call `validateInitArgs` to produce validated args; render validation errors
     with exit code 2
   - Call `buildInitPlan` to produce the plan
   - If dry-run: render the complete plan to stdout with:
     - Lane identity (ID, slug, kind, initiative)
     - Control home path
     - Repository bindings
     - Directories to create (count and list)
     - Managed links to create (count and list)
     - Manifest previews
     - Config entries
     - Coordinator/session baseline summary
     - Pack index summary
     - Warnings (if any)
     - Applicable confirmation: `applied: false`
   - On error: render specific error with appropriate exit code

3. Create `help/commands/init.hlp.json`:
   - Command name, description, usage, flags, examples
   - Describe required input: slug, tmux-prefix, impl-pack, coordinator-routing
   - Describe optional input: scope, runtime, workspace, update-gitignore
   - Describe dry-run behavior
   - Describe preflight steps

4. Register init in `help/help.json`:
   - Add init entry to the help registry

5. Write focused specs:
   - `spec/foundation/init-planner.spec.ts`:
     - Valid arg combinations produce correct plan shape
     - Invalid slug rejected (too long, invalid chars, leading hyphen)
     - Invalid tmux-prefix rejected
     - Missing required args rejected
     - Scope JSON schema validation: valid passes, invalid rejects
     - Impl-pack path resolution: absolute, control-home-relative
     - Workspace resolution delegates to RM-03
     - Dry-run: plan identical to non-dry-run, no I/O occurred
     - Plan contains correct manifest previews
     - Plan enumerates all required directories and links per v1.md §7.2
     - Conflict detection delegates to RM-08
   - `spec/commands/InitCommand.spec.ts`:
     - CLI arg parsing for all flags
     - Dry-run rendering output shape
     - Error rendering for each validation failure

## What You Must Not Do

- Do not create any lane directory, manifest file, config file, or runtime link
- Do not write to any filesystem path outside of the repository
- Do not modify `src/cli.ts` to contain any product logic
- Do not implement pack seal validation or drift detection
- Do not execute shell config or state parsing
- Do not commit
- Do not add `.local` artifacts to git
- Do not modify dependency modules from RM-03, RM-08, or RT-04
- Do not duplicate workspace resolution or canonicalization logic already in
  those modules

## Required Proof

Before finishing, verify and report:

- All arg combinations produce correct plan shape (valid args → plan, invalid → error)
- Invalid slug, prefix, missing required args each produce exit code 2
- Scope JSON validation: valid passes, invalid rejects with specific error
- Runtime version resolution through RT-04 catalog
- Dry-run produces complete, deterministic plan; no filesystem writes occurred
- Plan contains correct directory list matching v1.md §7.2 layout
- Plan contains correct manifest previews
- Plan contains correct managed link list
- `nvb build` passes from tracked-only checkout
- Architecture: `src/cli.ts` has no product logic; InitCommand delegates to init-planner
- Final `git status --short`
- Proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
- `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- no destination creation in any mode (dry-run or not)
- slug and prefix must match exact spec patterns
- init-planner is the single owner of preflight logic; InitCommand delegates
- no product logic in `src/cli.ts`
- `nvb build` must pass
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-lane-lifecycle/LC-01-init-argument-resolution-and-preflight-plan.md`

The report must include:

- documents studied
- exact files created and changed
- exact owners introduced or modified
- init planner public API shape (types and functions)
- InitCommand public API shape
- validation matrix: every arg, every invalid case, every error code
- dry-run plan output example
- proof commands and outcomes
- `nvb build` result
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the final `InitArgs` and `InitPlan` type shapes, the exact validation
rules for slug/prefix/path resolution, the dry-run plan shape, and the
InitCommand rendering contract. Make explicit that LC-03 must consume
`InitPlan` without re-validating arguments, and LC-02 must independently
validate the pack that init references.
