# Agent Launch Prompt — Review Batch UK-03

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with highest-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for independent crash simulation at every staging write point, manifest-last rule verification, lock-release tracing on all exit paths, and real filesystem integration testing`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with highest-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, the 11-step staging order, every crash point, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of performing real filesystem integration testing, simulating process
crashes at specific write points, and verifying lock release on every exit
path. Mocked crash tests miss real OS behavior.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, or cross-module
  integration closure evidence.
- The reviewer must match or exceed the implementor's reasoning class (R5).
  R1, R2, R3, R4 are prohibited for final review of this batch.

You are assigned **review batch UK-03** for the Watchtower v1 wt-upgrade-knowledge
delivery lane. You are the independent acceptance authority.

You must independently simulate crashes and verify recovery. A missed crash
point or a leaked lock that passes your review becomes an unrecoverable lane
state for the operator. You are the gate.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-upgrade-knowledge/review-batches/UK-03-review-atomic-upgrade-apply-recovery-and-downgrade-guard.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/review-batches/README.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md` — especially the 16-item reviewer hard-reject checklist
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
6. `docs/spec/implementation/wt-upgrade-knowledge/work-batches/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard.md` (paired work brief)
7. `.local/agent-reports/wt-upgrade-knowledge/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard.md` (implementation report)
8. `docs/spec/v1.md` — §11.5 (apply order), §14 (safety, locking, atomic writes)
9. `docs/spec/v1-contracts.md` — §11 (locking, staging adjacent, atomic rename, manifest-last, external effects never during upgrade)
10. `docs/spec/schemas/v1.schema.json`
11. Accepted UK-01 and UK-02 reports in `.local/agent-reports/wt-upgrade-knowledge/`
12. the actual changed source files:
    - `src/foundation/upgrade-apply.ts`
    - `src/foundation/upgrade-recovery.ts`
    - `src/commands/UpgradeCommand.ts`
    - `spec/basic/upgrade-apply.spec.ts`
    - `spec/basic/upgrade-recovery.spec.ts`
13. Existing `src/foundation/FileLock.ts` — locking implementation

## Reasoning / Reviewer Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for independent crash simulation at every staging write point using real filesystem operations, manifest-last atomicity verification, lock-release tracing on all exit paths, and old-runtime usability proof after recovery`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with highest-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the reviewer must match or exceed R5; R1, R2, R3, R4 are prohibited
- final-authority constraint: the reviewer owns the acceptance decision and the commit; no other agent may accept this batch

## Mandatory Reasoning Protocol

Before evaluating the implementation:

1. **Dependency map**: enumerate every write point in the staging sequence.
   For each, identify the exact code line where the write occurs and design
   a crash-injection method to stop execution at that point.
2. **Inspect source**: read the actual staging order implementation line by
   line. Trace every exit path (success, early return, exception) to verify
   lock release. Verify no external-effect call (tmux, Git, subprocess)
   between lock acquisition and release.
3. **Invariants**: explicitly check: (a) is `install.json` written ONLY after
   all assets are staged, fsynced, and checksum-verified? (b) does any code
   path remove an old runtime link before the new manifest is committed?
   (c) is the lock released on every exit path including exceptions and
   crash recovery?
4. **Counterexamples**: what if the process is killed by SIGKILL during the
   atomic rename loop? What if the temp file write succeeds but fsync
   reports an error? What if a lock file from a previous crashed process
   still exists?
5. **Spec disagreements**: v1-contracts.md §11 locking and atomicity rules
   govern. If the implementation deviates from the staging order in
   v1.md §11.5, the contract-closure document wins.
6. **Predecessor reports**: UK-02 may note migration-step behavior that
   interacts with staging. Verify the staging code correctly invokes
   UK-02's migration registry before asset staging.

## Structural Design And Module-Size Gate

- Verify `upgrade-apply.ts` line count. Flag if over 350 (expected split).
- Verify `upgrade-recovery.ts` line count. Flag if over 350 (expected split).
- Verify `UpgradeCommand.ts` did not exceed 220 lines after extension.
- Verify test modules are split by scenario family (apply, crash, downgrade).
- Verify no monolithic upgrade-do-everything module.

## Your Review Mission

Independently verify manifest-last atomicity, crash recovery, and downgrade guard:

1. Run the 16-item hard-reject checklist first. Stop on any "yes."
2. Independently run all integration specs in a real temporary filesystem.
   Record exact output.
3. Independently simulate crash at each staging write point (at least 5):
   - Before any asset stage → recovery restores clean state, old manifest intact
   - After first asset staged → old manifest intact, old runtime works
   - Mid-way through assets → old manifest intact, old runtime works
   - After all assets staged but before manifest write → old manifest intact
   - After manifest write → verify manifest-last rule (manifest was last write)
4. At each crash point: independently verify:
   - Old `install.json` is readable and has the old version
   - Old managed links resolve to existing files
   - Old runtime manifest checksums match on-disk files
   - Attempt to invoke old runtime watcher entrypoint (verify existence and
     executable permission at minimum)
5. Independently verify lock released on every exit path:
   - Success path
   - Staging failure path
   - Exception path (force an error and verify lock not held)
   - Crash recovery path (run recovery and verify lock released after cleanup)
6. Independently verify downgrade guard:
   - Refused without `--allow-downgrade` (exit 5)
   - Refused on incompatible schema version (exit 5 with reason message)
   - Succeeds with compatible downgrade target using normal staging order
   - Downgrade uses identical manifest-last staging (no special path)
7. Independently verify checksum validation:
   - Staged asset checksum verified against target manifest before rename
   - Mismatch stops staging before any link rename; error reported
8. Verify `nvb build` passes independently.
9. Verify `nvb test` passes independently.
10. Update tracker and roadmap to ✅ if accepting, or create correction brief.

## What You Must Not Do

- Trust the implementation report's crash-matrix summary without independent
  crash simulation
- Accept a batch where the manifest is written before all assets are staged
- Accept a batch where the old runtime is uninvocable after crash recovery
- Accept a batch where the lock leaks on any exit path
- Accept a batch where downgrade succeeds without `--allow-downgrade`
- Accept a batch where external effects (tmux, Git) occur during upgrade

## Required Independent Proof

- Crash simulation at each staging write point (at least 5 distinct points)
  using real filesystem operations in temporary fixture workspaces
- Old-runtime usability at each crash point: manifest readable, links intact,
  entrypoint exists and is executable
- Lock acquisition and release verified on every exit path (success, staging
  failure, exception, recovery)
- Downgrade guard: all three scenarios independently verified (refused without
  flag, incompatible refusal, compatible success)
- Checksum mismatch: staging stops, no link renamed, error reported
- All Jasmine specs pass on independent run
- `nvb build` passes
- `nvb test` passes
- Verify `git log` shows the implementation agent did not commit

## Acceptance Gate

The batch is accepted only when ALL pass independently:
- [ ] Hard-reject checklist: zero "yes"
- [ ] All crash points independently simulated and recovered
- [ ] Manifest-last rule holds at every crash point
- [ ] Old runtime invocable after every crash point
- [ ] Lock released on every exit path
- [ ] Downgrade guard: all three scenarios correct
- [ ] Checksum mismatch stops staging, no link renamed
- [ ] All specs pass independently
- [ ] `nvb build` passes
- [ ] `nvb test` passes
- [ ] Tracker and roadmap updated to ✅
- [ ] Implementation report present and accurate
- [ ] No `.local/` or build artifacts staged
- [ ] Implementation agent did not commit

## Rejection Correction Brief Rule

If rejecting, create a numbered correction brief in
`review-batches/corrections/UK-03-correction-01.md` containing:

- Rejection date and reviewer identity
- Each rejection reason with exact source location or proof failure
- Expected corrected state for each reason
- Required additional proof after correction
- Exact files that must change
- Reference to this review report

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
- `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`

On acceptance: mark UK-03 as ✅. On rejection: leave as ⏳ and create correction brief.

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- the reviewer is the acceptance authority; independent proof is mandatory
- accept only when all criteria are satisfied
- if rejecting, create a correction brief with exact required fixes
- do not add `.local` artifacts to git
- the reviewer owns the acceptance commit; the implementation agent never commits
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one review report to:

- `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-03-review-atomic-upgrade-apply-recovery-and-downgrade-guard.md`

Include: documents studied, independent crash-simulation matrix (every crash
point, test name, pass/fail, old-runtime usability confirmation), lock-release
verification on every exit path, downgrade-guard verification results, checksum
validation results, hard-reject checklist outcome, and final verdict with
reasoning.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
UK-03: Atomic upgrade apply, recovery, and downgrade guard accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, the crash-point verification matrix (which
points verified, which recovery behaviors confirmed), lock-release guarantees
confirmed, downgrade-guard rules verified, any edge cases or limitations
discovered that the UK-05 reviewer should consider for end-to-end integration
fixtures, and the acceptance commit hash if accepted. Confirm UK-03's staging
and recovery APIs are stable for UK-05 integration testing.
