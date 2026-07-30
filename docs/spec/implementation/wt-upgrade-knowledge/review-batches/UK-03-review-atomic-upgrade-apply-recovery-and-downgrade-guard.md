# UK-03 Review: Atomic Upgrade Apply, Recovery, And Downgrade Guard — Review Brief

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

Review batch ID: `UK-03-review`
Reviews work batch: `UK-03` — Atomic upgrade apply, recovery, and downgrade guard
Reviewer reasoning class: R5 (highest available reasoning)

## Review Scope

Independently verify manifest-last atomicity at every staging write point,
crash recovery that keeps the old runtime invocable, and downgrade guard
correctness.

## Governing Specs

- `docs/spec/v1.md` — §11.5 (upgrade apply order), §14 (safety, locking, atomic writes)
- `docs/spec/v1-contracts.md` — §11 (locking, staging adjacent, atomic rename, manifest-last)

## Review Items

### 1. Source ownership verification

- [ ] `UpgradeApply.ts` owns staging and atomic switch
- [ ] `UpgradeRecovery.ts` owns crash detection, cleanup, and downgrade guard
- [ ] `UpgradeCommand.ts` delegates, does not own staging or recovery algorithms
- [ ] No product logic in `src/cli.ts`

### 2. Manifest-last rule

- [ ] Independently verify at each write point that `install.json` is written ONLY after all assets are staged, fsynced, and checksum-verified
- [ ] Inject failure before manifest write: verify old manifest remains authoritative
- [ ] Inject failure during asset staging: verify zero partial renames

### 3. Crash recovery at every write point

- [ ] Before any asset stage → recovery restores clean state
- [ ] After first asset staged → old manifest intact, old runtime works
- [ ] After all assets staged, before manifest → old manifest intact
- [ ] After manifest write but before verification → assertion: manifest-last means manifest was last write; verify recovery handles this (should not happen if staging order is correct, but verify)

### 4. Old-runtime usability

- [ ] At each crash point, independently verify: (a) old `install.json` is readable, (b) old managed links resolve to existing files, (c) old runtime manifest checksums match on-disk files
- [ ] After recovery: attempt to invoke the old runtime (at minimum, verify the watcher entrypoint exists and is executable)

### 5. Lock correctness

- [ ] Lock acquired before any mutation
- [ ] Lock released on every exit path: success, staging failure, exception
- [ ] Lock released during recovery after cleanup
- [ ] Lock follows v1-contracts.md §11 ordering

### 6. Downgrade guard

- [ ] Independently verify: downgrade refused without `--allow-downgrade`
- [ ] Incompatible schema version produces refusal (exit 5)
- [ ] Compatible downgrade succeeds with normal staging order
- [ ] Downgrade uses identical manifest-last staging (no special downgrade path)

### 7. Checksum validation

- [ ] Staged asset checksum verified against target runtime manifest before rename
- [ ] Mismatch stops staging and reports; no link renamed

### 8. Proof independence

- [ ] Rerun all integration specs in a real temporary filesystem
- [ ] Independently simulate crash at each write point (kill process, check state)
- [ ] Independently verify old runtime is invocable after each crash point
- [ ] Verify lock released at each crash point (no leaked lock file)

## Acceptance Decision

Accept only when ALL independently verified. If rejected, create correction brief.

---
---

# UK-03 Review: Atomic Upgrade Apply, Recovery, And Downgrade Guard — Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** R5 — independent verification of crash recovery at every
staging write point, manifest-last atomicity, lock correctness, and downgrade-guard
state machine.

**Primary suitability:** A reviewer agent capable of performing real filesystem
integration testing, simulating process crashes at specific write points, and
verifying lock release on every exit path.

**Alternatives:** None. R5 is required. Crash-recovery verification with real
filesystem operations exceeds R4 capacity.

**Prohibited final-pass classes:** R1, R2, R3, R4

**Context requirements:** The reviewer needs the complete spec (§11.5, §14),
the v1-contracts.md §11 locking rules, the UK-03 work brief, the implementation
report, all changed source files, and the existing `FileLock` implementation.

**Final-authority limits:** The reviewer owns acceptance and commit.

### Complete forwarding profile — mandatory

- **Class:** R5 (review, matching R5 implementor)
- **Primary models:** any strongest coding agent meeting R5
- **Good alternatives:** any agent with real filesystem integration testing
  and crash-recovery verification experience
- **Steering-only tools:** agents that cannot perform real filesystem
  operations or simulate crashes are unsuitable
- **Prohibited final-pass classes:** R1, R2, R3, R4
- **Context retention:** reviewer must retain the 11-step staging order and
  every crash point
- **Final-authority limits:** reviewer owns acceptance and commit

## Capability-Based Agent Selection Rule

This review requires R5 reasoning because:

- Crash recovery must be independently simulated at every staging write point
  using real filesystem operations — mocked crash tests miss real OS behavior
- Manifest-last atomicity is a hard contract; verifying it requires injecting
  failures at specific points in the staging sequence
- Lock release must be verified on every exit path including exception handlers
  — a leaked lock blocks all future lane operations
- Old-runtime usability after recovery requires real invocation, not just file
  existence checks

## Context Assignment

You are the independent reviewer for batch UK-03 (Atomic upgrade apply,
recovery, and downgrade guard) in the wt-upgrade-knowledge pack. You must
independently simulate crashes and verify recovery. A missed crash point or
a leaked lock that passes your review becomes an unrecoverable lane state
for the operator. You are the gate.

## Read In This Order

1. `AGENTS.md`
2. Pack README, roadmap, tracker, quality rules
3. `docs/spec/v1.md` — §11.5, §14
4. `docs/spec/v1-contracts.md` — §11
5. UK-03 work brief and implementation report
6. All changed source and spec files
7. Existing `FileLock` implementation

## Your Review Mission

1. Run the 16-item hard-reject checklist first. Stop on any "yes."
2. Independently run all integration specs in real temp filesystem.
3. Independently simulate crash at each staging write point.
4. At each crash point: verify old manifest authoritative, old runtime invocable.
5. Independently verify lock released on every exit path.
6. Independently verify downgrade guard: refusal without flag, incompatible
   refusal, compatible success.
7. Independently verify checksum mismatch stops staging.
8. Verify `nvb build` passes.

## What You Must Not Do

- Trust the implementation report's crash-matrix summary without independent
  crash simulation
- Accept a batch where the manifest is written before all assets are staged
- Accept a batch where the old runtime is uninvocable after crash recovery
- Accept a batch where the lock leaks on any exit path
- Accept a batch where downgrade succeeds without `--allow-downgrade`

## Required Independent Proof

- Crash simulation at each staging write point (at least 5 distinct crash points)
- Old-runtime usability at each crash point (manifest readable, links intact, entrypoint executable)
- Lock acquisition and release verified on every exit path
- Downgrade guard: all three scenarios independently verified
- Checksum mismatch: staging stops, no link renamed
- All Jasmine specs pass on independent run
- `nvb build` passes

## Acceptance Gate

- [ ] Hard-reject checklist: zero "yes"
- [ ] All crash points independently simulated and recovered
- [ ] Manifest-last rule holds at every crash point
- [ ] Old runtime invocable after every crash point
- [ ] Lock released on every exit path
- [ ] Downgrade guard: all three scenarios correct
- [ ] All specs pass independently
- [ ] `nvb build` passes

## Required Disk Report

Write a complete independent review report at `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-03-review-atomic-upgrade-apply-recovery-and-downgrade-guard.md`
containing: every crash-point verification result, old-runtime usability proof,
lock-release verification, downgrade-guard verification, and final verdict.
