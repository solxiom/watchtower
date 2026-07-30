# Agent Launch Prompt — Work Batch UK-04

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
    - `src/foundation/host-adapters.ts` (create)
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

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- `SkillInstallCommand` (command front door): target 160 lines; scrutinize
  at 220; hard reject above 300
- `host-adapters.ts` (factory + common interface): target 220 lines for the
  factory and common logic; split per-adapter implementations into focused
  internal modules if any adapter exceeds 100 lines of unique logic
- Test module: target 300 lines; split by adapter if larger
- No monolithic adapter-does-everything module

## Your Mission

Create the host adapters and skill install command:

1. Implement `src/foundation/host-adapters.ts` with the factory
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
