# Agent Launch Prompt — Work Batch LC-07

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
- agent suitability: `high for diagnostic registry design, composable check architecture, and comprehensive tool/state/policy inspection`
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
and edit the repository with tools, reason across diagnostic categories, and run
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

You are assigned **implementation work batch LC-07** for the Watchtower v1
wt-lane-lifecycle delivery lane.

This batch implements a comprehensive diagnostic check registry and the `wt doctor`
command. Each check returns `pass`, `warn`, `fail`, or `skip`. Categories include
tools, accounts, pack structure/policy/index, permissions, repository bindings,
concurrent conflicts, and Git-ignore coverage. Doctor is read-only in v1.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-07-comprehensive-doctor-registry.md`
3. `docs/spec/implementation/wt-lane-lifecycle/work-batches/README.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`
5. `docs/spec/v1.md` — §11.7 (doctor command), §7.1 (data-root permissions), §14 (doctor detects missing deps, broken links, unsafe config)
6. `docs/spec/v1.md` — §8 (config strict subset validation)
7. `docs/spec/v1-contracts.md` — §8 (doctor report schema: `doctorReport`)
8. `docs/spec/schemas/v1.schema.json` — `$defs.doctorReport`
9. `docs/spec/architecture.md` — §4.5 (lane task runtime and leaf adapter),
   §6.3 (runtime execution flow)
10. `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
11. `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
12. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
13. `docs/spec/implementation/wt-lane-lifecycle/batch-reasoning-difficulty-ranking.md`
14. the canonical source owners you will create:
    - `src/foundation/DoctorRegistry.ts` (new)
    - `src/commands/DoctorCommand.ts` (new)
    - `help/commands/doctor.hlp.json` (new)
    - `help/help.json` (edit to register doctor)
15. the dependency modules you must inspect:
    - RM-03: workspace resolution
    - RM-06: lane discovery/selection
    - RM-09: tmux, watcher, heartbeat observations
    - LC-04: `repositories.local.json` bindings, membership index
    - LC-05: coordinator policies, pack index, baselines
    - LC-06: watcher heartbeat/lock files
    - `src/contracts/` — for type conventions

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for diagnostic registry design, composable check architecture, and comprehensive tool/state/policy inspection`
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

Implement `wt doctor`. Build a composable diagnostic registry. Each check returns
pass/warn/fail/skip. Categories: control-home, tools, accounts, config, markers,
bindings, conflicts, pack, policy, index, permissions, gitignore, runtime, watcher,
speech. Doctor is read-only — no repair.

1. **Create `src/foundation/DoctorRegistry.ts`:**
   - Define `CheckStatus`: `"pass" | "warn" | "fail" | "skip"`
   - Define `DoctorCategory` union: `"control-home" | "tools" | "accounts" | "config" | "markers" | "bindings" | "conflicts" | "pack" | "policy" | "index" | "permissions" | "gitignore" | "runtime" | "watcher" | "speech"`
   - Define `DoctorCheck` interface: `{id: string; category: DoctorCategory; description: string; run(lane, context): Promise<CheckResult>}`
   - Define `CheckResult` interface: `{status: CheckStatus; message?: string; details?: Record<string, any>}`
   - Define `DoctorReport` interface: `{checks: Array<{id: string; category: DoctorCategory; description: string} & CheckResult>; summary: {pass: number; warn: number; fail: number; skip: number}; exitCode: number}`
   - Define `DoctorContext` interface: environment values, workspace path, resolved lane info
   - `registerCheck(check: DoctorCheck): void` — add to global registry
   - `getAllChecks(): DoctorCheck[]` — return all registered checks
   - `runAllChecks(lane: ResolvedLane, context: DoctorContext): Promise<DoctorReport>` — iterate all checks, catch errors (treat as fail), compute summary and exit code (0 on all pass/warn, 4 on any fail)
   - Checks must be registered at module load time
   - Each check is a focused, deterministic, read-only function
   - Checks never perform repair, rebuild, or migration
   - Checks never write to any filesystem path
   - Checks never use a model
   - **Implement every check category as follows:**

   **Control-home checks:**
   - `home-access`: verify control home path exists, is directory, is readable
   - `lane-dir-access`: verify `.watchtower/lanes/{slug}/` exists, is readable
   - `lane-marker`: verify `lane.json` exists, is valid JSON, matches schema

   **Tool checks:**
   - `bash-available`: `bash --version` → pass | fail
   - `git-available`: `git --version` → pass | fail
   - `tmux-available`: `tmux -V` → pass | fail
   - `jq-available`: `jq --version` → pass | warn (warn on absent, not fail)
   - `flock-available`: `flock --version` → pass | warn
   - `rg-available`: `rg --version` → pass | warn

   **Account checks:**
   - `operator-account`: verify current OS account matches configured operator
   - `worker-accounts`: verify configured worker accounts exist, can resolve CLIs, can access runtime store (traverse + execute, not write)

   **Config checks:**
   - `config-parse`: parse `lane.config.env` with strict parser, reject shell-injected content
   - `config-schema`: verify all required keys present
   - `config-redaction`: verify no secret keys exposed (if verbose, warn on tokens/secrets in config)

   **Marker checks:**
   - `marker-schema`: validate `lane.json` against JSON Schema
   - `install-schema`: validate `install.json` against JSON Schema
   - `bindings-schema`: validate `repositories.local.json` against schema

   **Binding checks:**
   - `binding-paths`: verify all local binding paths exist and are directories
   - `binding-branches`: verify declared branches exist in each repo
   - `binding-worktrees`: verify worktree mode consistency (dedicated vs shared)
   - `membership-index`: verify membership index has valid entries for all bindings; report stale entries

   **Conflict checks:**
   - `writable-conflicts`: detect active lanes sharing writable worktrees (fail on unsanctioned shared-write)
   - `tmux-prefix-conflicts`: detect overlapping tmux prefix usage between lanes
   - `path-claim-conflicts`: detect overlapping exclusive-write path claims

   **Pack checks:**
   - `pack-structure`: verify committed pack has required files (implementation-pack.json, lock, acceptance, traceability)
   - `pack-acceptance`: verify acceptance record is valid
   - `pack-seal`: verify lock seal matches current pack bytes (drift detection)

   **Policy checks:**
   - `routing-policy`: verify `coordinator/routing-policy.json` exists and passes schema validation; all 15 rules present
   - `session-policy`: verify `coordinator/session-policy.json` exists and passes schema validation; all defaults present
   - `policy-provenance`: verify provenance markers reference correct spec sections

   **Index checks:**
   - `pack-index-fresh`: verify `coordinator/pack-index.json` exists
   - `pack-index-integrity`: verify index seal matches active pack seal
   - `pack-index-schema`: verify index passes schema validation

   **Permission checks:**
   - `runtime-permissions`: verify runtime assets are readable/executable by configured worker accounts; writable only by operator
   - `lane-permissions`: verify lane files owned by operator; no world-writable
   - `session-permissions`: verify operator-session files only readable by operator; retention-coupled UI-cache permissions

   **Git-ignore checks:**
   - `gitignore-present`: verify `.gitignore` exists at control home
   - `gitignore-coverage`: verify `/.watchtower/` is gitignored

   **Runtime checks:**
   - `runtime-installed`: verify pinned runtime is staged in data-root
   - `runtime-manifest`: verify runtime manifest is valid
   - `runtime-checksums`: verify managed asset checksums match
   - `runtime-links`: verify `bin/` links point to valid runtime assets
   - `knowledge-installed`: verify knowledge pack is staged

   **Watcher checks:**
   - `watcher-heartbeat`: check watcher heartbeat/lock for liveness
   - `watcher-state`: check watcher state is valid JSON

   **Speech checks (optional, warn-only):**
   - `speech-stack`: check Piper or equivalent speech stack availability (skip if not configured, warn if configured but missing)

2. **Create `src/commands/DoctorCommand.ts`:**
   - Extend BaseCommand; class name `DoctorCommand`
   - `name: "doctor"`; `group: "lane"`
   - `description: "Run comprehensive lane diagnostics"`
   - `usage: "doctor [--lane=<slug-or-uuid>] [--workspace=<path>]"`
   - `async run()`:
     - Parse `--lane=<slug-or-uuid>` (optional) and `--workspace=<path>` (optional)
     - Call workspace resolver (RM-03) to get control home
     - Call lane discovery/selector (RM-06) to resolve the target lane
     - Build `DoctorContext` from resolved lane and environment
     - Call `runAllChecks(lane, context)` from doctor-registry
     - **Human output mode (no `--json`):**
       - Render results grouped by category header
       - Each check: status indicator (✅ pass, ⚠️ warn, ❌ fail, ○ skip) + id + message
       - Print summary line: `pass: N, warn: N, fail: N, skip: N`
       - Exit 0 on all pass/warn; exit 4 on any fail
     - **JSON output mode (`--json`):**
       - Output `doctorReport` schema: one JSON value with `checks` array
       - Each check: `{id, category, description, status, message?, details?}`
       - Include `summary` object and `exitCode`
       - No ANSI, no decorations
     - **Verbose mode (`--verbose`):**
       - Include `details` in human and JSON output
       - Print resolved lane info
   - Reject `--json` when `--verbose` would expose secrets (warn, don't fail)

3. **Create `help/commands/doctor.hlp.json`:**
   - Command name, description, usage
   - Flags: `--lane`, `--workspace`, `--json`, `--verbose`
   - Check categories: list all 15 categories with brief descriptions
   - Status semantics: pass (check passed), warn (non-critical issue), fail (critical issue), skip (not applicable)
   - Exit codes: 0 (all pass/warn), 4 (any fail)
   - Read-only guarantee: doctor never repairs, rebuilds, or migrates

4. **Register doctor in `help/help.json`:**
   - Add entry for `doctor` in the lane group
   - Verify no JSON documentation conflicts

5. **Write focused specs:**
   - `spec/foundation/doctor-registry.spec.ts`:
     - Every check category has at least one registered check
     - Each check produces correct status on known-good fixture (pass)
     - Each check produces correct status on known-bad fixture (fail)
     - Tool checks: tool present → pass, missing → fail/warn as appropriate
     - Account checks: correct account → pass, missing → fail, unconfigured → skip
     - Config checks: valid config → pass, shell-injected → fail
     - Marker checks: valid JSON → pass, invalid → fail, missing → fail
     - Binding checks: existing paths → pass, missing paths → fail
     - Conflict checks: no conflict → pass, detected → fail/warn
     - Pack checks: complete pack → pass, missing files → fail
     - Policy checks: complete policies → pass, missing → fail
     - Index checks: fresh matching → pass, stale → fail, corrupt → fail
     - Permission checks: correct → pass, world-writable → fail
     - Git-ignore checks: present → pass, missing → fail
     - Runtime checks: all present → pass, missing links → fail
     - Watcher checks: running → pass, not running → warn
     - Doctor is read-only: mock filesystem, verify no write calls
     - Summary computation correct for all-pass, all-warn, mix, any-fail
   - `spec/commands/DoctorCommand.spec.ts`:
     - Parse `--lane=<slug>` and `--workspace=<path>`
     - Lane resolution via workspace root
     - All checks executed, results grouped by category
     - Human output: summary line with correct counts
     - JSON output: matches `doctorReport` schema
     - Exit code 0 on all pass/warn
     - Exit code 4 on any fail
     - Verbose mode: details included in output

## What You Must Not Do

- Do not implement repair, rebuild, or migration — doctor is read-only
- Do not implicitly repair stale membership index
- Do not manage the watcher (restart, stop) — only observe liveness
- Do not use a model for diagnostic classification
- Do not write to any filesystem path during check execution
- Do not add product logic to `src/cli.ts`
- Do not commit
- Do not add `.local` artifacts to git

## Required Proof

Before finishing, verify and report:

- All 15 check categories have at least one registered check
- Each check returns correct status: pass, fail, warn, or skip as appropriate
- Tool checks detect presence/absence correctly
- Account checks verify configured accounts
- Config checks detect shell injection
- Marker checks validate JSON schemas
- Binding checks verify path/branch/worktree consistency
- Conflict checks detect writable/tmux/path conflicts
- Pack checks validate structure/acceptance/seal
- Policy checks verify presence and schema validity
- Index checks verify freshness/integrity/schema
- Permission checks detect world-writable and ownership issues
- Git-ignore checks verify presence and coverage
- Runtime checks verify staging and checksums
- Watcher checks observe liveness from heartbeat
- Read-only proof: zero filesystem writes during check execution
- DoctorCommand groups output by category
- DoctorCommand exit 0 on pass/warn, exit 4 on any fail
- JSON output matches `doctorReport` schema
- `nvb build` passes from tracked-only checkout
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

- doctor is read-only — no repair, rebuild, or migration in v1
- no model use for diagnostic classification
- no filesystem writes during check execution
- exit code 0 on all pass/warn; exit code 4 on any fail
- grouped output by category
- JSON output matches `doctorReport` schema
- `nvb build` must pass
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-lane-lifecycle/LC-07-comprehensive-doctor-registry.md`

The report must include:

- documents studied
- exact files created: DoctorRegistry.ts, DoctorCommand.ts, doctor.hlp.json, modified help.json
- DoctorRegistry public API shape (interfaces, functions)
- Complete check inventory: every check ID, category, description, and success/failure conditions
- DoctorCommand public API shape (flags, output modes, exit codes)
- Read-only proof: evidence that no check writes to filesystem
- Check registration mechanism
- Help fragment registered
- proof commands and outcomes (focused tests for each category, integration tests)
- `nvb build` result
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the DoctorRegistry interface, the complete check inventory with category
assignments, the DoctorCommand CLI surface, and the read-only guarantee. Make
explicit that LC-08 (integration) runs `wt doctor` in the end-to-end fixture
and that future batches from Pack 5 (CA-*) may extend the registry with
coordinator-specific checks.
