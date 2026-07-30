# Agent Launch Prompt — Work Batch RM-08

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for binding computation and conflict detection`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent.

You are assigned **implementation work batch RM-08** for the Watchtower v1
wt-read-model delivery lane.

This batch computes canonical repository bindings and detects writable claim
overlap. Wrong classification allows unsafe concurrent writes.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/work-batches/RM-08-repository-bindings-and-conflict-inspection.md`
2. `docs/spec/implementation/wt-read-model/work-batches/README.md`
3. `docs/spec/implementation/wt-read-model/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md` (especially §7.4 — Local repository bindings, §14 — Safety and concurrency)
5. `docs/spec/v1-contracts.md`
6. `docs/spec/architecture.md`
7. `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
8. `docs/spec/implementation/wt-read-model/implementation-tracker.md`
9. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
10. the canonical source owners:
    - `src/foundation/bindings.ts` (create)
    - `src/foundation/conflicts.ts` (create)
    - `src/foundation/paths.ts` (from RM-03)
    - `src/foundation/membership.ts` (from RM-07)

## Reasoning / Agent Class — R4 with full forwarding profile as above.

## Mandatory Reasoning Protocol

1. Enumerate every claim-overlap class before writing code.
2. Inspect the accepted RM-03 and RM-07 output.
3. Prove that every conflict class is detected and produces a diagnostic.
4. Use counterexamples: two lanes with read-only bindings should not conflict;
   two lanes with read+write on the same worktree should conflict.

## Structural Design And Module-Size Gate

Per quality rules. No `helpers`/`utils` bags.

## Your Mission

1. Create `src/foundation/bindings.ts`:
   - `computeBindings(laneDir: string): RepositoryBinding[]` — read `repositories.local.json` from the lane directory, parse, validate schema version, canonicalize each path, verify the path exists and is a Git repository, resolve the current branch, classify worktree mode (`dedicated` or `shared`), validate access mode (`read` or `write`).
   - `validateBinding(binding: RepositoryBinding): BindingValidationResult` — validate a single binding: canonical path exists, Git repository detected, branch resolves, access mode valid.
2. Create `src/foundation/conflicts.ts`:
   - `detectConflicts(lanes: ResolvedLane[]): ConflictReport` — detect claim overlaps between active lanes. Classify each conflict:
     - `SHARED_WRITE`: two lanes claim write access on the same canonical worktree without explicit shared-write override.
     - `PATH_CONFLICT`: two lanes claim exclusive-write on overlapping repository-relative paths.
     - `BRANCH_CONFLICT`: two lanes on the same repository but different branches sharing a writable worktree.
   - Each conflict includes: conflicting lane IDs, repository ID, conflict class, and description.
3. Write focused Jasmine specs:
   - Canonical bindings: parse valid `repositories.local.json`, resolve paths, verify branch.
   - Branch verification: bindings match the current `git rev-parse --abbrev-ref HEAD`.
   - Worktree mode: dedicated (default), shared (explicit override).
   - Access mode: read and write validated.
   - Conflict — shared-write: two lanes write to same worktree without shared override → detected.
   - Conflict — path-conflict: two lanes claim exclusive-write on overlapping paths → detected.
   - Conflict — branch-conflict: same worktree, different branches → detected.
   - No false positive: two lanes with read-only access → no conflict.
   - Missing repository: path does not exist → error.
   - Unreadable repository: path exists but not a Git repo → error.

## What You Must Not Do

- Do not write to `repositories.local.json` or any binding file.
- Do not normalize or reorder bindings.
- Do not silently skip unreadable repositories.
- Do not commit.

## Required Proof

- Canonical binding computation.
- Branch/access/worktree validation.
- All three conflict classes detected.
- `nvb build` and `nvb test` pass.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep `implementation-tracker.md` and `implementation-roadmap.md` updated.

## Local Artifact Git Rule

Write `.local/...` reports on disk only; never stage or commit.

## Non-Negotiable Rules

- all bindings are read-only; do not write binding data
- every conflict class must be detected and reported
- dedicated worktree is the safe default
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write to: `.local/agent-reports/wt-read-model/RM-08-repository-bindings-and-conflict-inspection.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

Record the binding API (`computeBindings`, `validateBinding`) and conflict API
(`detectConflicts`). RM-10 consumes bindings for status display and conflict
warnings. No consumer writes binding data.
