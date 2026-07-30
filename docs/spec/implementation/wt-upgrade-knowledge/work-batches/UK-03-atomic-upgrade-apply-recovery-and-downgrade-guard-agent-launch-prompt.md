# Agent Launch Prompt — Work Batch UK-03

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

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with highest-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for atomic filesystem operations, crash-recovery at every staging write point, manifest-last atomicity, lock ordering, and downgrade-guard state machine`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with highest-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, the 11-step staging order, every crash point, locking rules, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of implementing atomic filesystem operations, designing crash recovery
for every write point, enforcing lock ordering, and performing real filesystem
integration testing.

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

You are assigned **implementation work batch UK-03** for the Watchtower v1
wt-upgrade-knowledge delivery lane.

This batch implements the manifest-last atomic switch with crash recovery at
every write point, plus a guarded downgrade path. Your code is the only path
through which managed software changes lane bindings. A crash at the wrong
moment in your code, or a manifest written before assets are verified, corrupts
the lane permanently.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-upgrade-knowledge/README.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/batch-reasoning-difficulty-ranking.md`
6. `docs/spec/implementation/wt-upgrade-knowledge/work-batches/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard.md`
7. `docs/spec/v1.md` — §11.5 (apply order steps 1–11), §14 (safety, locking, atomic writes), §7.1 (runtime store), §7.5 (install manifest)
8. `docs/spec/v1-contracts.md` — §11 (locking order: lane lock, staging adjacent, atomic rename, manifest-last, external effects never during upgrade)
9. `docs/spec/schemas/v1.schema.json`
10. `docs/spec/architecture.md` — §6.2 (mutation flow), §6.3 (runtime execution)
11. UK-01 accepted report: `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md`
12. UK-02 accepted report: `.local/agent-reports/wt-upgrade-knowledge/UK-02-lane-session-index-migration-registry.md`
13. the canonical source owners you will actually change:
    - `src/foundation/UpgradeApply.ts` (create)
    - `src/foundation/UpgradeRecovery.ts` (create)
    - `src/commands/UpgradeCommand.ts` (extend — add `--apply` execution path)
    - `spec/basic/upgrade-apply.spec.ts` (create)
    - `spec/basic/upgrade-recovery.spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for eleven-step staging order with crash recovery at each write point; manifest-last atomicity; downgrade-guard state machine; real filesystem integration testing`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with highest-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the full 11-step staging order, every crash point, and the recovery protocol across the session; if it cannot do so, escalate the agent
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before writing any implementation code:

1. **Dependency map**: enumerate every write point in the staging order. For
   each, identify: what must be true before the write, what must be true after,
   and how to simulate a crash at that exact point in a test.
2. **Inspect source**: read the existing `FileLock` implementation, the
   `RuntimeCatalog` staging mechanism from RT-04, and the `LanePaths` module
   for path construction patterns. Understand how atomic rename works on the
   target OS (Linux — same filesystem).
3. **Invariants**: state before coding: (a) the manifest is written only after
   all managed assets are staged, fsynced, and checksum-verified; (b) the old
   manifest is authoritative until the new manifest's atomic rename succeeds;
   (c) the old runtime links are never removed — they are atomically replaced;
   (d) no external effect (tmux, Git) occurs during upgrade; (e) the lane lock
   is released on every exit path including exceptions.
4. **Counterexamples**: for each staging step, design the crash test: what
   happens if the process dies after staging asset 3 of 10? After renaming
   asset 3 but before staging asset 4? After all renames but before manifest
   write? After manifest write but before lock release?
5. **Spec disagreements**: v1-contracts.md §11 says "Upgrade stages all links,
   manifests, schemas, and migrations, fsyncs them, then switches one atomic
   install pointer." If this conflicts with v1.md §11.5's order, the
   contract-closure document wins.
6. **Predecessor reports**: UK-02 report may discuss migration step atomicity.
   RT-04 and RT-06 reports may describe runtime manifest validation and managed
   link patterns. Integrate with these APIs.

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

Create the atomic apply, recovery, and downgrade guard:

1. Implement `src/foundation/UpgradeApply.ts` with the 11-step manifest-last
   staging order:
   1. acquire lane lock (flock, with PID + process identity)
   2. validate lane and install manifests
   3. run UK-01 compatibility planner
   4. run UK-02 migration steps if schema version changes
   5. stage each managed asset (compute target path, validate checksum, write to
      temp path adjacent, fsync, validate current link matches current manifest)
   6. atomically rename each staged asset temp → target
   7. fsync all staged assets
   8. write new install.json to temp path
   9. fsync temp install.json
   10. atomically rename temp install.json → install.json (COMMIT POINT)
   11. release lane lock
2. Implement `src/foundation/UpgradeRecovery.ts` with crash detection
   (staging artifacts at temp paths with predictable naming), artifact cleanup,
   old-manifest validation, and downgrade guard (`--allow-downgrade` required,
   schema backward-compatibility pre-check)
3. Extend `src/commands/UpgradeCommand.ts` to invoke the full `--apply` chain
   (UK-01 planner → UK-02 migration → UK-03 apply) and handle
   `--allow-downgrade`
4. Write crash-simulation integration specs using temporary fixture workspaces
   with real filesystem operations
5. Verify `nvb build` passes
6. Write the implementation report

## What You Must Not Do

- Write `install.json` before all assets are staged, fsynced, and checksum-verified
- Remove old runtime links before the new manifest is committed
- Allow downgrade without `--allow-downgrade` or with incompatible schema
- Allow arbitrary external effects (tmux, Git) during upgrade
- Modify `lane.config.env`, `repositories.local.json`, or operator-session
  journals (migration steps under UK-02 handle these)
- Add product logic to `src/cli.ts`
- Commit any code

## Required Proof

- Successful upgrade end-to-end in temp fixture workspace
- Crash recovery at every staging write point: (a) before first asset,
  (b) after first asset staged, (c) mid-way through assets, (d) after all
  assets staged but before manifest, (e) after manifest write but before
  verification
- At each crash point: old manifest remains authoritative (read install.json,
  verify it has the old version); old runtime manifest checksums match
  on-disk files
- Downgrade refused without `--allow-downgrade` (exit 5)
- Incompatible downgrade refused (exit 5 with reason)
- Successful downgrade with compatible target
- Checksum mismatch during staging stops before any link rename
- Lock released after every exit path (success, staging failure, crash recovery)
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

- `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md` — mark UK-03 as ⏳ awaiting review
- `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md` — mark UK-03 phase status as ⏳

Do NOT mark as ✅ — only the reviewer does that.

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- Manifest-last rule is absolute
- Old runtime remains invocable after any failure before commit point
- Lane lock follows v1-contracts.md §11 ordering
- External effects never occur inside upgrade
- Keep commands thin; algorithms live in foundation modules
- Match Nirvana CLI patterns — `@nirvana/base/cli`, NVB for build/dist
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-upgrade-knowledge/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard.md`

The report must include:

- documents studied
- exact files created and modified with before/after line counts
- exact test commands run and their output
- crash-point recovery matrix: each write point, test name, pass/fail
- any open questions or intentional limitations
- a handoff summary for the UK-05 agent and the reviewer
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the staging API signature (`applyUpgrade(laneDir, plan, manifests)`),
the recovery API (`recoverUpgrade(laneDir)`, `guardDowngrade(...)`), the
known crash-point behaviors and which test covers each, the lock-release
guarantees, the downgrade-guard rules, and the exact test command.
