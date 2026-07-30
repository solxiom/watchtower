# Agent Launch Prompt — Work Batch UK-04

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
- agent suitability: `high for bounded host-adapter implementations with explicit preview/replace/scope contracts and narrow filesystem operations`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, the three-host adapter interface, the five common constraints, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of implementing three structurally similar host adapters with bounded
filesystem operations, `--replace` enforcement, and lane-state-free skill
file generation.

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

You are assigned **implementation work batch UK-04** for the Watchtower v1
wt-upgrade-knowledge delivery lane.

This batch implements host adapters that preview and install the bundled
knowledge pack for Codex, Cursor, and Claude. You must not embed lane details
in personal skills or claim notification is active when you only placed files.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-upgrade-knowledge/README.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/work-batches/UK-04-codex-cursor-and-claude-knowledge-installers.md`
6. `docs/spec/v1.md` — §11.8 (`wt skill install`), §11.10 (skill install command behavior)
7. `docs/spec/v1-contracts.md` — §6 (adapter contract: `skill-only` default, `advisory-confirmed`, `unattended` distinctions)
8. `docs/spec/schemas/v1.schema.json` — `mutationResult`
9. `docs/spec/architecture.md` — §4.6 (knowledge pack content), §5.2 (user data layout)
10. the canonical source owners you will actually change:
    - `src/foundation/HostAdapters.ts` (create)
    - `src/commands/SkillInstallCommand.ts` (create)
    - `spec/basic/skill-install.spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R3`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for three bounded host adapters with identical preview/replace/scope/version-recording contracts and narrow filesystem copy operations`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the adapter interface, the five common constraints, and three host destination conventions across the session; if it cannot do so, escalate the agent
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before writing any implementation code:

1. **Dependency map**: identify the source of knowledge files (resolved via
   `RuntimeCatalog` or direct path from `WATCHTOWER_DATA_HOME`). Identify
   the host-specific destinations for Codex, Cursor, and Claude.
2. **Inspect source**: read how knowledge manifests are structured in RT-01/
   RT-02. Read how existing commands use `BaseCommand` for option parsing
   and output rendering.
3. **Invariants**: state before coding: (a) preview never writes files;
   (b) non-interactive mode with existing destination and no `--replace`
   fails closed; (c) installed skill files contain zero lane-specific state;
   (d) notification status is always `unverified`; (e) scope filtering
   never includes files outside the requested scope.
4. **Counterexamples**: what happens if the knowledge root doesn't exist?
   If the destination is outside the host's known path? If the destination
   contains files from a previous version? If `--scope=invalid`?
5. **Spec disagreements**: if the adapter contract in v1-contracts.md §6
   requires `advisory-confirmed` for Codex but v1.md §11.8 says skill install
   does not verify notification, the adapter classification is `skill-only`
   (v1-contracts.md §6: "Skill installation support and unattended decision
   support are separate capabilities").
6. **Predecessor reports**: RT-01 and RT-02 reports describe the knowledge
   pack layout and manifest format. Use those to resolve which files exist
   under `<knowledge-root>/`.

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

Create the host adapters and skill install command:

1. Implement `src/foundation/HostAdapters.ts` with the factory
   (`resolveHostAdapter(host: 'codex' | 'cursor' | 'claude'): HostAdapter`)
   and three adapter implementations
2. Each adapter must implement: `preview(knowledgeRoot, scope, options)`,
   `install(knowledgeRoot, scope, options)`, `getInstalledVersion(destination)`
3. Common behavior for all three: preview prints source/destination/scope/
   overwrites; `--replace` required in non-interactive mode when destination
   exists; version recorded in host-specific location; no lane state in
   skills; notification status always `unverified`; `--dry-run` zero writes
4. Codex destination: `~/.codex/skills/watchtower-coordinator/`; version at
   `.watchtower-version` JSON file
5. Cursor destination: project-local `.cursorrules` or equivalent; version
   in file header comment
6. Claude destination: `~/.claude/skills/watchtower-coordinator/`; version at
   `.watchtower-version` JSON file
7. Implement `src/commands/SkillInstallCommand.ts` with positional `<host>`
   argument, `--scope=<scope>`, `--replace`, `--dry-run`, `--json`
8. Exit 2 on unknown host; exit 4 on missing knowledge root; exit 5 on
   existing destination without `--replace`
9. Write comprehensive Jasmine specs for each adapter and the command
10. Verify `nvb build` passes
11. Write the implementation report

## What You Must Not Do

- Embed lane-specific state (home paths, lane IDs, tmux prefixes, repository
  bindings) in installed skill files
- Claim a host notification is configured, verified, or active
- Allow install without `--replace` in non-interactive mode when destination
  exists
- Implement unattended decision-agent operation (owned by CA-06 in pack 5)
- Modify upgrade planner, migration registry, or upgrade apply modules
- Add product logic to `src/cli.ts`
- Commit any code

## Required Proof

- Each adapter preview returns correct destination paths and source files
- Each adapter install copies files correctly and records version
- `--replace` refused in non-interactive mode with existing destination (exit 5)
- `--scope=skill-only` installs only skill file; `--scope=guides-only` only
  guidance docs; default `full` installs everything
- Existing file detection in preview output
- Destination path validation
- No lane-specific state in any installed skill file (search for patterns)
- `--dry-run` produces zero writes
- `--json` validates against `mutationResult` schema
- Unknown host exits 2; missing knowledge root exits 4
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

- `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md` — mark UK-04 as ⏳ awaiting review
- `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md` — mark UK-04 phase status as ⏳

Do NOT mark as ✅ — only the reviewer does that.

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- Preview is default; install requires explicit `--replace`
- No lane state in installed skill files
- No false notification claims
- Keep commands thin; host adapters own filesystem logic
- Match Nirvana CLI patterns — `@nirvana/base/cli`, NVB for build/dist
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-upgrade-knowledge/UK-04-codex-cursor-and-claude-knowledge-installers.md`

The report must include:

- documents studied
- exact files created and modified with before/after line counts
- exact test commands run and their output
- per-adapter installation evidence
- any open questions or intentional limitations
- a handoff summary for the UK-05 agent and the reviewer
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the `HostAdapter` interface (preview, install, getInstalledVersion),
the three host destination conventions (Codex, Cursor, Claude paths), the
version recording format (`.watchtower-version` JSON for Codex/Claude,
header comment for Cursor), the `--replace` enforcement rule, the scope
values (`skill-only`, `guides-only`, `full`), and the exact test command.
