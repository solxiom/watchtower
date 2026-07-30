# Agent Launch Prompt — Work Batch LC-04

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for lock-ordering correctness, atomic file replacement, and idempotent index registration`
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
and edit the repository with tools, reason across package boundaries, and run
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

You are assigned **implementation work batch LC-04** for the Watchtower v1
wt-lane-lifecycle delivery lane.

This batch writes repository bindings, manages `.gitignore` with atomic
replace and conditional rollback, and registers lane membership in the
local index with idempotent retry. Lock ordering is critical.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-04-bindings-gitignore-and-membership-registration.md`
3. `docs/spec/implementation/wt-lane-lifecycle/work-batches/README.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`
5. `docs/spec/v1.md` — especially §7.1 (membership index), §7.2 (`.watchtower/` gitignored), §7.4 (bindings), §9.2 (secondary discovery), §14 (locking, gitignore)
6. `docs/spec/v1-contracts.md` — especially §11 (locking, transactions, recovery): lock ordering, membership-index changes, `.gitignore` atomic replace and digest preservation
7. `docs/spec/architecture.md` — §4.3 (foundation services: RepositoryBindingStore, LaneIndex), §9.1 (trust zones)
8. `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
9. `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
10. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
11. `docs/spec/implementation/wt-lane-lifecycle/batch-reasoning-difficulty-ranking.md`
12. the canonical source owners you will create:
    - `src/foundation/binding-mutator.ts` (new)
    - `src/foundation/membership-registrar.ts` (new)
13. the dependency modules you must inspect:
    - LC-03: `src/foundation/lane-store.ts`, `src/foundation/transactional-writer.ts` (lane layout)
    - RM-07: membership index foundation modules (for read structure)
    - `src/contracts/` — for public type conventions

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for lock-ordering correctness, atomic file replacement, and idempotent index registration`
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

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- Front doors, factories, registries, directors, commands, renderers, and public
  barrels target 160 lines or fewer. Files from 161 through 220 lines require an
  explicit cohesion justification. A hand-maintained front door over 220 lines
  is rejectable without a narrow pre-existing constraint, and no front door may
  exceed 300 lines.
- Focused implementation modules target 220 lines or fewer. Files from 221
  through 300 lines require a responsibility inventory and independent reviewer
  scrutiny. Files from 301 through 350 lines are expected to split; acceptance
  requires a source-backed reason why splitting would reduce ownership clarity.
  New or materially rewritten implementation modules above 350 lines are
  rejected.
- Four hundred physical lines is the absolute ceiling for every hand-maintained
  JS/TS source or spec module touched by this lane. The ceiling does not make a
  mixed-responsibility file acceptable.
- Split a module below those thresholds when it owns three or more independently
  nameable concerns or combines state policy, I/O, normalization, planning,
  error translation, or rendering.
- Coordinators sequence focused collaborators; they do not absorb collaborator
  algorithms. Barrels expose a local capsule; they do not launder foreign APIs.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
  Use feature-local capsules with explicit owner names.
- Record physical line counts for every new or materially rewritten file. The
  reviewer must independently verify warning-band files and reject unjustified
  growth in an existing oversized module.

## Your Mission

Write repository bindings. Manage `.gitignore` with atomic replace and
conditional rollback. Register lane membership with idempotent retry.
Respect lock order.

1. Create `src/foundation/binding-mutator.ts`:
   - `acquireInitLocks(controlHome, slug)`:
     - Acquire mutex/file locks in the fixed order specified by v1-contracts.md §11:
       1. data-root catalog or membership-index lock
       2. lane lock: `.watchtower/lanes/{slug}/state/lane.lock` (via `flock` or
          cross-platform equivalent)
       3. operator-session lock
       4. projection/index publication lock
     - Each lock records: owner PID, process start identity, command name,
       acquisition timestamp
     - If a lock cannot be acquired: release held locks in reverse order, throw
   - `releaseInitLocks()`: release in reverse order (4, 3, 2, 1)
   - `shouldUpdateGitignore(controlHome)`:
     - Check if `.gitignore` exists at control home
     - If exists: check if it contains a line exactly matching `/.watchtower/`
     - Return true if update is needed (file absent or line missing)
   - `updateGitignore(controlHome)`:
     - Read current `.gitignore` (or use empty string if absent)
     - Compute SHA-256 digest of current content → `originalDigest`
     - Append `/.watchtower/` on a new line (preserve trailing newline)
     - Write new content to temp file in the same directory
     - fsync temp file
     - Atomic rename temp file over `.gitignore`
     - Compute SHA-256 digest of new content → `writtenDigest`
     - Return `{originalDigest, writtenDigest}`
   - `restoreGitignore(controlHome, originalDigest)`:
     - Read current `.gitignore` digest
     - If current digest matches `writtenDigest`:
       - Restore the original content
       - If original was empty (file didn't exist before): remove the file
       - Temp-file write → fsync → atomic rename over `.gitignore`
       - Return true
     - If current digest does NOT match `writtenDigest`:
       - Log warning: file was modified by another process
       - Return false (do not restore)
   - `writeBindings(laneDir, bindings)`:
     - Write `repositories.local.json` to `{laneDir}/repositories.local.json`
     - Temp-file → fsync → atomic rename (same pattern)

2. Create `src/foundation/membership-registrar.ts`:
   - `registerLane(laneDir)`:
     - Acquire membership-index lock (already available if called after
       binding-mutator locks are held)
     - Read `<watchtower-data-root>/index/repository-memberships.json`
     - Parse existing index (create empty if absent or corrupted)
     - Read `{laneDir}/repositories.local.json` and `{laneDir}/lane.json`
       to extract laneId, laneHome, and all repository binding paths
     - For each binding path: add or update entry `{laneId, laneHome}`
     - If entry already exists with same laneId: no-op (idempotent)
     - If entry exists with different laneId pointing to same path: fail
       (path collision)
     - Prune stale entries: for each existing entry, verify laneHome/lane.json
       still exists; if not, remove the entry
     - Write updated index to temp file, fsync, atomic rename
     - Release lock
     - Return `{registered: true, retryCount: 0}`
   - `registerLaneWithRetry(laneDir, maxRetries = 3)`:
     - Loop: call `registerLane`, on failure retry (with small backoff)
     - If all retries exhausted: return `{registered: false, retryCount: maxRetries,
       warning: "Lane is home-discoverable but secondary-repository discovery
       requires explicit wt upgrade --apply compatibility repair"}`
     - Never leave a half-lane; the lane was already committed by LC-03

3. Write focused specs:
   - `spec/foundation/binding-mutator.spec.ts`:
     - Lock acquisition in declared order
     - Lock release in reverse order
     - `.gitignore` exists but missing `/.watchtower/` → line appended
     - `.gitignore` already has `/.watchtower/` → shouldUpdateGitignore returns false
     - `.gitignore` absent → file created with `/.watchtower/` line
     - `.gitignore` update: originalDigest and writtenDigest recorded
     - `.gitignore` restore: digest matches → restored correctly
     - `.gitignore` restore: digest mismatch → conflict, no restore
     - Bindings written to correct path with correct content
   - `spec/foundation/membership-registrar.spec.ts`:
     - Empty index → registration: entry added
     - Existing index with other lanes → new entry added, existing preserved
     - Same laneId/path already registered → idempotent (no duplicate)
     - Different laneId at same path → rejected (collision)
     - Stale entry: lane.json removed → entry pruned
     - Retry: succeeds on second attempt
     - Retry exhausted → warning returned, no exception
     - Index JSON written with proper structure

## What You Must Not Do

- Do not invert lock acquisition order
- Do not silently overwrite `.gitignore` — use atomic replace
- Do not restore `.gitignore` when current digest differs from written digest
- Do not leave a half-lane — never remove committed lane files
- Do not add coordinator/session baselines — belongs to LC-05
- Do not add product logic to `src/cli.ts` or any command
- Do not commit
- Do not add `.local` artifacts to git

## Required Proof

Before finishing, verify and report:

- Lock order matches v1-contracts.md §11 exactly
- `.gitignore` update: atomic temp → rename, `/.watchtower/` appended
- `.gitignore` already correct: `shouldUpdateGitignore` returns false
- `.gitignore` absent: file created with `/.watchtower/`
- `.gitignore` conditional rollback: digest match → restored; mismatch → no restore
- Bindings written to `{laneDir}/repositories.local.json` with canonicalized paths
- Membership: empty index → entry added
- Membership: idempotent → no duplicate
- Membership: stale entry pruned
- Membership: path collision rejected
- Membership: retry exhausted → warning, lane still valid
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

- lock order: data-root, lane, session, projection/index
- `.gitignore` atomic replace with digest-aware rollback
- membership registration is post-commit and idempotent
- no half-lane: lane files never removed on registration failure
- no product logic in `src/cli.ts`
- `nvb build` must pass
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-lane-lifecycle/LC-04-bindings-gitignore-and-membership-registration.md`

The report must include:

- documents studied
- exact files created
- binding-mutator public API shape (types and functions)
- membership-registrar public API shape (types and functions)
- lock order verification (exact sequence)
- `.gitignore` update, restore, and conflict matrices
- membership registration: idempotency, collision, stale-pruning matrices
- proof commands and outcomes
- `nvb build` result
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the lock acquisition order, the `.gitignore` atomic replace and conditional
rollback mechanism, the digest comparison logic, and the membership registration
retry policy. Make explicit that LC-05 must NOT modify bindings or membership
index — it only reads the committed lane directory structure to seed baselines.
