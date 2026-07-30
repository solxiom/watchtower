# Agent Launch Prompt — Work Batch UK-03

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
    - `src/foundation/upgrade-apply.ts` (create)
    - `src/foundation/upgrade-recovery.ts` (create)
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

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- `upgrade-apply.ts` (staging + apply): target 220 lines; justify at 300;
  expected split at 350 into `upgrade-stage.ts` + `upgrade-apply.ts`
- `upgrade-recovery.ts` (recovery + downgrade guard): target 220 lines;
  justify at 300; expected split at 350
- `UpgradeCommand.ts` extension: must not push the command above the 220-line
  scrutinize limit; if it would, extract orchestration into a dedicated
  foundation orchestrator module
- Test modules: target 300 lines per scenario family (apply-success,
  crash-recovery, downgrade); hard reject above 400
- No monolithic upgrade-do-everything module

## Your Mission

Create the atomic apply, recovery, and downgrade guard:

1. Implement `src/foundation/upgrade-apply.ts` with the 11-step manifest-last
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
2. Implement `src/foundation/upgrade-recovery.ts` with crash detection
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
