# UK-03: Atomic Upgrade Apply, Recovery, And Downgrade Guard — Work Brief

Batch ID: `UK-03`
Pack: `wt-upgrade-knowledge` (pack 4 of 6)
Reasoning class: R5 (highest available reasoning)
Depends on: UK-02 (migration registry) accepted, RT-04 (immutable data-root catalog) accepted, RT-06 (managed lane links) accepted

## Scope

Implement the manifest-last atomic switch with crash recovery at every write
point, plus a guarded downgrade path that requires explicit operator intent
and schema compatibility proof.

## Governing Specs

- `docs/spec/v1.md` — §11.5 (upgrade apply order), §14 (safety and concurrency), §7.1 (global runtime store), §7.5 (install manifest), §7.2 (filesystem contract)
- `docs/spec/v1-contracts.md` — §11 (locking, transactions, and recovery)
- `docs/spec/schemas/v1.schema.json`

## Files Owned By This Batch

- `src/foundation/upgrade-apply.ts` — NEW: manifest-last staging, atomic link switch, install pointer update
- `src/foundation/upgrade-recovery.ts` — NEW: crash recovery detection, old-manifest restoration, downgrade guard
- `src/commands/UpgradeCommand.ts` — EXTEND: add `--apply` execution path connecting to UK-01 planner + UK-02 migration + UK-03 apply
- `spec/basic/upgrade-apply.spec.ts` — NEW: integration specs with crash-simulation fixtures
- `spec/basic/upgrade-recovery.spec.ts` — NEW: recovery and downgrade specs

## Manifest-Last Staging Order

The apply operation must execute in this order, with the manifest written last:

```text
1. acquire lane lock (flock, with PID + process identity)
2. validate lane and install manifests
3. run UK-01 compatibility planner
4. run UK-02 migration steps if schema version changes
5. stage each managed asset:
   a. compute target path in lane `bin/` or managed directory
   b. validate checksum against target runtime manifest
   c. write to temp path adjacent to target (same filesystem for atomic rename)
   d. fsync the temp file
   e. if replacing existing link: validate current link matches current manifest (defense against manual modification)
6. for each staged asset, atomically rename temp → target
   a. if any rename fails: stop staging, begin recovery, do NOT write manifest
7. fsync all staged assets (directories + files)
8. write new install.json to temp path adjacent to final location
9. fsync temp install.json
10. atomically rename temp install.json → install.json  ← COMMIT POINT
11. release lane lock
```

If the process crashes or fails at any point before step 10 (the commit point),
the old manifest remains authoritative. The old runtime links are intact and
the old runtime is invocable.

## Implementation Steps

1. **Upgrade apply** (`src/foundation/upgrade-apply.ts`):
   - Accept: lane directory path, UK-01 upgrade plan, current install manifest,
     target runtime/knowledge manifests
   - Acquire lane lock via `FileLock` (PID + process identity, not PID alone)
   - Run migration steps from UK-02 if the plan indicates schema version change
   - Stage managed assets atomically as described above
   - Validate every staged asset against the target runtime manifest checksum
     before renaming
   - Write `install.json` last after all assets are fsynced
   - Release lock
   - Return `ApplyResult` with: success flag, staged count, any partial-staging
     paths that require recovery

2. **Upgrade recovery** (`src/foundation/upgrade-recovery.ts`):
   - Detect incomplete upgrade: staging artifacts present (temp paths with
     predictable naming pattern) but manifest not updated
   - Recovery operation: remove staged temp artifacts, keeping the old manifest
     authoritative; old runtime links remain intact
   - Post-crash validation: verify old `install.json` is readable and its
     managed assets have intact links; verify old runtime is invocable
     (at minimum, manifest checksums still match on-disk files)
   - Return `RecoveryResult` with: recovered flag, artifacts cleaned, old
     manifest status

3. **Downgrade guard** (`src/foundation/upgrade-recovery.ts`):
   - `--allow-downgrade` must be present; otherwise reject with exit 5 before
     any mutation
   - Pre-check: verify the lane's current schema version is declared
     backward-compatible by the target runtime manifest's
     `compatibleLaneSchemaVersions` field
   - If not backward-compatible: reject with exit 5 and a message naming the
     incompatible schema field
   - If compatible: proceed with the same manifest-last staging order as
     upgrade (using the target version's assets)
   - Downgrade is structurally identical to upgrade — the direction of version
     change does not alter the staging logic

4. **UpgradeCommand extension** (`src/commands/UpgradeCommand.ts`):
   - When `--apply` is present: invoke the full chain: UK-01 planner → UK-02
     migration (if needed) → UK-03 apply
   - When `--allow-downgrade` is present: pass through to downgrade guard
   - Render human output: changed/preserved/migrated/recovered paths
   - Render JSON: `mutationResult` with `applied: true` on success, error on failure
   - Handle atomic-switch failure: print which assets staged successfully,
     which failed, and recovery instructions
   - Exit 0 on success; exit 5 on managed collision, incompatible downgrade,
     checksum failure; exit 4 on missing target; exit 1 on unexpected I/O

5. **Proof**:
   - Filesystem integration tests using temporary fixture workspaces (real
     filesystem, real atomic rename, real fsync)
   - Crash simulation at every staging write point:
     - Before any asset staging → recovery restores clean state
     - After first asset staged → old manifest intact, old runtime works
     - After all assets staged but before manifest write → old manifest intact
     - After manifest write but before verification → manifest-last rule honored
   - Downgrade refused without `--allow-downgrade`
   - Incompatible downgrade refused
   - Successful downgrade with compatible target
   - Checksum mismatch during staging stops and reports
   - Lock acquisition and release verified at each crash point (no leaked locks)

## Exclusions

- No migration step implementation (owned by UK-02; UK-03 invokes UK-02's
  registry steps)
- No host adapter integration (owned by UK-04)
- No version command integration (owned by UK-05)
- No `doctor` or `status` integration in this batch
- No upgrade of committed implementation packs (packs are project-owned, not
  Watchtower-managed)

## Required Proof

| Proof class | Evidence |
|-------------|----------|
| Filesystem integration | Successful upgrade end-to-end in temp fixture workspace |
| Crash recovery | Simulated crash at every staging write point; old runtime still invocable at each |
| Manifest-last | Manifest not written when staging fails; old manifest remains authoritative |
| Locking | Lock acquired before mutation, released after (including crash recovery path) |
| Downgrade guard | Refused without flag; refused on incompatible schema; succeeded with compatible |
| Checksum validation | Mismatch stops staging before any link rename |
| Build | `nvb build` passes |

## Acceptance Gate

- All Jasmine specs pass (integration + recovery + downgrade)
- Every crash point in the staging sequence has a passing recovery test
- `nvb build` passes
- Old runtime invocable after recovery at every crash point
- `--apply` invokes the full UK-01 → UK-02 → UK-03 chain
- `--allow-downgrade` gated correctly
- No product logic in `src/cli.ts`
- Module sizes within bands

## Implementation Report

Write a durable report at `.local/agent-reports/wt-upgrade-knowledge/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard.md`

---
---

# UK-03: Atomic Upgrade Apply, Recovery, And Downgrade Guard — Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** R5 — highest available reasoning with crash recovery at
every write point, manifest-last atomicity, and downgrade-guard state machine.

**Primary suitability:** An agent experienced with atomic filesystem operations,
crash-recovery design patterns, lock ordering, and destructive-operation safety
boundaries.

**Alternatives:** An R4 agent may implement individual staging steps but is
unlikely to design recovery for every crash point correctly. R5 is required.

**Steering-only tools:** Agents that cannot perform real filesystem integration
testing or simulate process crashes mid-operation are unsuitable.

**Prohibited final-pass classes:** R1, R2, R3, R4 — insufficient for
multi-point crash recovery design and destructive-operation safety.

**Context requirements:** The agent needs the complete spec (§11.5, §14, §7),
the v1-contracts.md §11 locking/recovery rules, the UK-01 plan format, the
UK-02 migration registry API, and the existing `FileLock` foundation service.

**Final-authority limits:** The implementation agent may not commit. The
reviewer owns acceptance.

### Complete forwarding profile — mandatory

- **Class:** R5 (highest available reasoning)
- **Primary models:** any strongest coding agent meeting R5
- **Good alternatives:** any model with strong filesystem, atomic-operation,
  crash-recovery, and lock-ordering experience
- **Steering-only tools:** agents that cannot perform real filesystem
  integration tests are unsuitable
- **Prohibited final-pass classes:** R1, R2, R3, R4
- **Context retention:** agent must retain the 11-step staging order and
  every crash point across the session
- **Final-authority limits:** implementation agent does not commit; reviewer
  owns acceptance decision

## Capability-Based Agent Selection Rule

This batch requires R5 reasoning because:

- The 11-step staging order has multiple write points, each a potential crash
  point requiring independent recovery proof
- Manifest-last atomicity is a hard contract: a bug that writes the manifest
  before assets are staged creates an unrecoverable lane state
- Crash recovery must detect partial staging (temp artifacts), clean them,
  and prove the old runtime still works — not just check that old files exist
- Downgrade guard adds a second state machine (schema compatibility check
  before any mutation) with its own error paths
- Lock ordering must follow v1-contracts.md §11 (lane lock) and release on
  all error paths, including crash recovery
- Integration tests require real filesystem operations in temporary workspaces;
  mocking `fsync` or `rename` misses real OS behavior

## Context Assignment

You are agent UK-03 implementing the atomic upgrade apply, crash recovery, and
downgrade guard for Watchtower v1. Your code is the only path through which
managed software changes lane bindings. A crash at the wrong moment in your
code, or a manifest written before assets are verified, corrupts the lane
permanently. You work in the Watchtower repository at the current working
directory.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/README.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md`
6. `docs/spec/implementation/wt-upgrade-knowledge/batch-reasoning-difficulty-ranking.md`
7. `docs/spec/v1.md` — §11.5 (apply order steps 1–11), §14 (safety, locking, atomic writes), §7.1 (runtime store), §7.5 (install manifest)
8. `docs/spec/v1-contracts.md` — §11 (locking order: lane lock, staging adjacent, atomic rename, manifest-last, external effects never during upgrade)
9. `docs/spec/schemas/v1.schema.json`
10. `docs/spec/architecture.md` — §6.2 (mutation flow), §6.3 (runtime execution)
11. UK-01 accepted report: `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md`
12. UK-02 accepted report: `.local/agent-reports/wt-upgrade-knowledge/UK-02-lane-session-index-migration-registry.md`
13. Existing `src/foundation/FileLock.ts` — locking API
14. Existing `src/foundation/LanePaths.ts` — lane directory construction

## Reasoning / Agent Class

- **Class:** R5
- **Primary suitability:** eleven-step staging order with crash recovery at
  each write point; manifest-last atomicity; downgrade-guard state machine;
  real filesystem integration testing
- **Primary models:** any strongest coding agent meeting R5
- **Good alternatives:** any agent with atomic-filesystem, crash-recovery,
  and destructive-operation safety experience
- **Steering-only tools:** agents that cannot perform real filesystem tests
  are unsuitable
- **Prohibited final-pass classes:** R1, R2, R3, R4
- **Context requirements:** agent must retain the full staging order and
  recovery protocol
- **Final-authority limits:** implementation agent does not commit; reviewer
  owns acceptance

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
   staging order
2. Implement `src/foundation/upgrade-recovery.ts` with crash detection,
   artifact cleanup, old-manifest validation, and downgrade guard
3. Extend `src/commands/UpgradeCommand.ts` to invoke the full `--apply` chain
   (UK-01 planner → UK-02 migration → UK-03 apply)
4. Write crash-simulation integration specs using temporary fixture workspaces
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

## Trackers and Status Docs

After implementation, update:
- `implementation-tracker.md` — mark UK-03 as ⏳ awaiting review
- `implementation-roadmap.md` — mark UK-03 phase status as ⏳

Do NOT mark as ✅ — only the reviewer does that.

## Local Artifact Git Rule

Write your implementation report to `.local/agent-reports/wt-upgrade-knowledge/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard.md`.
Do not stage or commit `.local/` artifacts.

## Non-Negotiable Rules

- Manifest-last rule is absolute
- Old runtime remains invocable after any failure before commit point
- Lane lock follows v1-contracts.md §11 ordering
- External effects never occur inside upgrade
- Keep commands thin; algorithms live in foundation modules
- Match Nirvana CLI patterns — `@nirvana/base/cli`, NVB for build/dist

## Required Disk Report

Write a complete implementation report at `.local/agent-reports/wt-upgrade-knowledge/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard.md`
containing:

- Files created and modified with before/after line counts
- Exact test commands run and their output
- Crash-point recovery matrix: each write point, test name, pass/fail
- Any open questions or intentional limitations
- A handoff summary for the UK-05 agent and the reviewer

## Always plan and make task lists

Before writing code, produce a task list covering: staging implementation,
recovery implementation, downgrade guard, command extension, crash-simulation
specs, downgrade specs, build verification, and report writing.

## Leave a helpful handoff message for the next agent

After completing implementation, write a concise handoff message summarizing:
the staging API, recovery API, downgrade guard API, known crash-point
behaviors, and the exact test commands.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.
