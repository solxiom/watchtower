# Agent Launch Prompt — Work Batch LC-04

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
    - `src/foundation/BindingMutator.ts` (new)
    - `src/foundation/MembershipRegistrar.ts` (new)
13. the dependency modules you must inspect:
    - LC-03: `src/foundation/LaneStore.ts`, `src/foundation/TransactionalWriter.ts` (lane layout)
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

Write repository bindings. Manage `.gitignore` with atomic replace and
conditional rollback. Register lane membership with idempotent retry.
Respect lock order.

1. Create `src/foundation/BindingMutator.ts`:
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

2. Create `src/foundation/MembershipRegistrar.ts`:
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
