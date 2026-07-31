# Batch UK-04 — Codex, Cursor, and Claude knowledge installers

## Synchronized batch execution matrix

- **Accepted-map title:** Codex, Cursor, and Claude knowledge installers
- **Dependencies:** `RT-01`, `RT-02`
- **Exclusive ownership/interface:** host adapters and skill command
- **Implementer/reviewer floor:** R3 / R3
- **Mandatory batch proof:** Preview/replace/scope behavior; version record; no false notification claim
- **Implementation report:** `.local/agent-reports/wt-upgrade-knowledge/UK-04-codex-cursor-and-claude-knowledge-installers.md`
- **Review report:** `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-04-codex-cursor-and-claude-knowledge-installers-review.md`
- **Correction report:** `.local/agent-reports/wt-upgrade-knowledge/reviews/corrections/UK-04-codex-cursor-and-claude-knowledge-installers-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Batch ID: `UK-04`
Pack: `wt-upgrade-knowledge` (pack 4 of 6)
Reasoning class: R3 (bounded repository reasoning)
Depends on: RT-01 (runtime/knowledge asset audit) accepted, RT-02 (runtime/knowledge manifests) accepted

## Scope

Implement host adapters that preview and install the bundled knowledge pack
for Codex, Cursor, and Claude without embedding lane-specific state or
making false notification claims.

## Governing Specs

- `docs/spec/v1.md` — §11.8 (`wt skill install`), §11.10 (skill install command behavior)
- `docs/spec/v1-contracts.md` — §6 (adapter contract: skill-only, advisory-confirmed, unattended distinctions)
- `docs/spec/schemas/v1.schema.json` — `mutationResult`

## Files Owned By This Batch

- `src/foundation/HostAdapters.ts` — NEW: adapter factory, per-host knowledge installers
- `src/commands/SkillInstallCommand.ts` — NEW: user-facing skill install orchestration
- `spec/basic/skill-install.spec.ts` — NEW: unit and integration specs

## Host Adapter Requirements

### Common behavior for all three hosts

1. **Preview**: before writing anything, print the source knowledge location,
   destination path(s), scope of files to be installed, and any existing files
   that would be overwritten.
2. **Scope**: `--scope=<scope>` limits install to a subset. Supported scopes:
   - `skill-only`: install only the agent skill file (playbook reference)
   - `guides-only`: install only the guidance documents
   - `full` (default): install the complete knowledge pack
3. **Replace confirmation**: In non-interactive mode (no TTY, or `--json`),
   if the destination path already exists, the command must refuse with an
   error unless `--replace` is explicit. In interactive mode, prompt the
   operator.
4. **Version recording**: Record the installed knowledge version in a
   host-specific location (manifest, configuration file, or metadata).
5. **No lane state in skills**: The installed skill files must not contain
   the current lane's home path, lane ID, tmux prefix, repository bindings,
   or any other lane-specific information.
6. **No false notification claims**: Watchtower records that files were placed.
   It does not claim a host notification is configured, verified, or active.
7. **`--dry-run`**: Perform the full preview without writing any files.

### Codex adapter

- Destination: the Codex skill installation directory (configurable via
  Codex conventions; default to `~/.codex/skills/watchtower-coordinator/`)
- Files: copy the coordinator skill definition and knowledge pack references
- Version record: write a `.watchtower-version` JSON file in the skill
  directory containing `{knowledgeVersion, installedAt}`

### Cursor adapter

- Destination: the Cursor rules/configuration directory (project-local
  `.cursorrules` or equivalent)
- Files: copy the coordinator guidance as Cursor-compatible rule files
- Version record: append or update a version comment in the installed rule
  file header

### Claude adapter

- Destination: the Claude skill/configuration location (configurable;
  default to `~/.claude/skills/watchtower-coordinator/`)
- Files: copy the coordinator skill descriptor and playbook references
- Version record: write a `.watchtower-version` JSON file in the skill
  directory

## Implementation Steps

1. **Host adapter factory** (`src/foundation/HostAdapters.ts`):
   - `resolveHostAdapter(host: 'codex' | 'cursor' | 'claude'): HostAdapter`
   - `HostAdapter` interface: `preview(knowledgeRoot, scope, options)`, `install(knowledgeRoot, scope, options)`, `getInstalledVersion(destination)`
   - Each adapter implementation is a focused module or internal class
   - Knowledge root resolved from `WATCHTOWER_DATA_HOME/knowledge/<version>/`
   - Preview returns `PreviewResult` with: destination paths, source files, files to overwrite, scope applied
   - Install returns `InstallResult` with: files written, version recorded, host notification status (always `unverified`)

2. **Skill install command** (`src/commands/SkillInstallCommand.ts`):
   - Extend `BaseCommand`
   - Accept positional `<host>` argument: `codex`, `cursor`, or `claude`
   - Accept `--scope=<scope>`, `--replace`, `--dry-run`, `--json`
   - Resolve the host adapter via the factory
   - Default: run `preview()`, render to stdout, exit 0
   - With `--dry-run`: identical to default preview behavior
   - With `--replace`: run `install()`, render result, record version
   - Without `--replace` and non-interactive: exit 5 with error
   - With `--json`: output `mutationResult` with `applied: true/false`
   - Help text via `BaseCommand` help support; no separate help fragment yet (UK-05)
   - Exit 2 on unknown host; exit 4 on missing knowledge root; exit 5 on
     existing destination without `--replace`

3. **Proof** (`spec/basic/skill-install.spec.ts`):
   - Each host adapter: preview output contains expected paths
   - Each host adapter: `--replace` refusal in non-interactive mode (exit 5)
   - Each host adapter: successful install with `--replace`
   - Each host adapter: version recorded after install (read version back)
   - Scope filtering: `--scope=skill-only` installs only the skill file
   - Scope filtering: `--scope=guides-only` installs only guidance docs
   - Scope filtering: default `full` installs everything
   - Existing file detection: preview correctly identifies files that would be overwritten
   - Destination path validation: refuse destination outside known host paths
   - No lane state in skills: search installed skill files for lane home path,
     lane ID, tmux prefix patterns — all must be absent
   - `--dry-run`: zero files written
   - `--json` output validates against `mutationResult` schema
   - Unknown host produces exit 2

## Exclusions

- No unattended decision-agent operation (adapters are `skill-only` in v1;
  unattended `D1`-`D3` requires coordinator automation pack — CA-06)
- No upgrade planner integration (adapters are independent of UK-01/UK-02/UK-03)
- No host notification verification (explicitly forbidden by spec)
- No lane-specific configuration in installed skills
- No `doctor` integration in this batch
- No help fragment (UK-05 owns help registration)

## Required Proof

| Proof class | Evidence |
|-------------|----------|
| Unit tests | Each adapter: preview, install, version record, scope filter |
| Integration tests | `wt skill install codex --dry-run`, `--replace`, `--json` |
| Negative proof | Unknown host, missing knowledge root, existing dest without `--replace`, no-lane-state |
| No-write proof | `--dry-run` writes zero files; preview writes zero files |
| Build | `nvb build` passes |

## Acceptance Gate

- All Jasmine specs pass for all three host adapters
- No lane-specific state in any installed skill file
- No false notification claim (adapter result always `unverified`)
- `--replace` requirement enforced in non-interactive mode
- `--json` validates against `mutationResult` schema
- Command prefers at most 120 lines, warns at 121–160, and rejects over 180;
  each focused adapter prefers at most 200, warns at 201–260, and rejects over
  300. Passing a count never excuses a mixed host-adapter responsibility.
- No product logic in `src/cli.ts`

## Implementation Report

Write a durable report at `.local/agent-reports/wt-upgrade-knowledge/UK-04-codex-cursor-and-claude-knowledge-installers.md`

---
---

# UK-04: Codex, Cursor, And Claude Knowledge Installers — Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** R3 — bounded repository reasoning with explicit preview/
replace patterns and narrow filesystem operations.

**Primary suitability:** An agent capable of implementing three similar host
adapters following a consistent interface, with bounds checking, file copy,
and JSON metadata writing.

**Alternatives:** Any R3-capable agent comfortable with TypeScript filesystem
APIs and command-class patterns. The task is bounded; R4 is not necessary
unless the agent discovers undocumented host-specific behaviors.

**Steering-only tools:** Agents that cannot read the current codebase to
understand `BaseCommand` conventions or `RuntimeCatalog` knowledge-root
resolution are unsuitable.

**Prohibited final-pass classes:** R1, R2

**Context requirements:** The agent needs §11.8 of v1.md (skill install
command), §6 of v1-contracts.md (adapter contract), the schema bundle for
`mutationResult`, and the existing `BaseCommand` subclass patterns.

**Final-authority limits:** The implementation agent may not commit. The
reviewer owns acceptance.

### Complete forwarding profile — mandatory

- **Class:** R3 (bounded repository reasoning)
- **Primary models:** any coding agent meeting R3
- **Good alternatives:** any agent with TypeScript, filesystem, and command-pattern experience
- **Steering-only tools:** agents that cannot read existing command classes
  or resolve knowledge-root paths are unsuitable
- **Prohibited final-pass classes:** R1, R2
- **Context retention:** the agent must retain the three-host adapter
  interface and the five common constraints across the session
- **Final-authority limits:** implementation agent does not commit; reviewer
  owns acceptance decision

## Capability-Based Agent Selection Rule

This batch requires R3 reasoning because:

- Three structurally similar host adapters, each with bounded filesystem
  operations and explicit preview/replace/scope contracts
- No state machines, no concurrency, no crash recovery
- The common behavior (preview, replace confirmation, version recording,
  no lane state, no false claims) is well-specified
- The main risks are: incorrect destination paths, missing replace guard,
  leaking lane-specific data into skill files — all detectable by focused
  tests

## Context Assignment

You are agent UK-04 implementing the Codex, Cursor, and Claude knowledge
installers for Watchtower v1. Your adapters let operators install the
coordinator knowledge pack into their preferred agent host. You must not
embed lane details in personal skills or claim notification is active when
you only placed files. You work in the Watchtower repository at the current
working directory.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/README.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md`
6. `docs/spec/v1.md` — §11.8 (`wt skill install`)
7. `docs/spec/v1-contracts.md` — §6 (adapter contract: `skill-only` default, `advisory-confirmed`, `unattended` distinctions)
8. `docs/spec/schemas/v1.schema.json` — `mutationResult`
9. `docs/spec/architecture.md` — §4.6 (knowledge pack content), §5.2 (user data layout)
10. Existing `src/commands/` — any `BaseCommand` subclass for conventions
11. Existing `src/foundation/RuntimeCatalog.ts` — knowledge-root resolution

## Reasoning / Agent Class

- **Class:** R3
- **Primary suitability:** three bounded host adapters with identical
  preview/replace/scope contracts; narrow filesystem copy operations
- **Primary models:** any coding agent meeting R3
- **Good alternatives:** any agent with TypeScript filesystem and command
  experience
- **Steering-only tools:** agents that cannot read existing patterns are
  unsuitable
- **Prohibited final-pass classes:** R1, R2
- **Context requirements:** agent must retain the adapter interface and
  the five common constraints
- **Final-authority limits:** implementation agent does not commit; reviewer
  owns acceptance

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

# Agent Launch Prompt — Work Batch RT-05

## Your Mission

Create the host adapters and skill install command:

1. Implement `src/foundation/HostAdapters.ts` with the factory and three
   adapter implementations
2. Implement `src/commands/SkillInstallCommand.ts` with preview/replace/scope/
   dry-run behavior
3. Write comprehensive Jasmine specs for each adapter and the command
4. Verify `nvb build` passes
5. Write the implementation report

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

## Trackers and Status Docs

After implementation, update:
- `implementation-tracker.md` — mark UK-04 as ⏳ awaiting review
- `implementation-roadmap.md` — mark UK-04 phase status as ⏳

Do NOT mark as ✅ — only the reviewer does that.

## Local Artifact Git Rule

Write your implementation report to `.local/agent-reports/wt-upgrade-knowledge/UK-04-codex-cursor-and-claude-knowledge-installers.md`.
Do not stage or commit `.local/` artifacts.

## Non-Negotiable Rules

- Preview is default; install requires explicit `--replace`
- No lane state in installed skill files
- No false notification claims
- Keep commands thin; host adapters own filesystem logic
- Match Nirvana CLI patterns — `@nirvana/base/cli`, NVB for build/dist

## Required Disk Report

Write a complete implementation report at `.local/agent-reports/wt-upgrade-knowledge/UK-04-codex-cursor-and-claude-knowledge-installers.md`
containing:

- Files created and modified with before/after line counts
- Exact test commands run and their output
- Per-adapter installation evidence
- Any open questions or intentional limitations
- A handoff summary for the UK-05 agent and the reviewer

## Always plan and make task lists

Before writing code, produce a task list covering: adapter factory, three
adapters, command implementation, spec writing, build verification, and
report writing.

## Leave a helpful handoff message for the next agent

After completing implementation, write a concise handoff message summarizing:
the adapter interface, the three host destination conventions, the version
recording format, and the exact test command.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **host adapters and skill command**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-upgrade-knowledge/UK-04-codex-cursor-and-claude-knowledge-installers.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RT-01`, `RT-02`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Preview/replace/scope behavior; version record; no false notification claim**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **host adapters and skill command** and **Preview/replace/scope behavior; version record; no false notification claim**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-upgrade-knowledge/UK-04-codex-cursor-and-claude-knowledge-installers.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
