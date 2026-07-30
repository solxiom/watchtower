# Agent Launch Prompt — Review Batch LC-03

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
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for transactional integrity verification, failure-injection testing, crash-recovery proof, and manifest correctness`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying transactional integrity, injecting failures
at every write stage, and proving that rollback leaves no partial state.
The reviewer must be capable of reasoning about crash-recovery, staging-to-commit
atomicity, and manifest-last guarantees.

You are assigned **review batch LC-03** for the Watchtower v1 wt-lane-lifecycle
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-lane-lifecycle/review-batches/LC-03-review-transactional-lane-layout-and-manifests.md`
2. `docs/spec/implementation/wt-lane-lifecycle/review-batches/README.md`
3. `docs/spec/implementation/wt-lane-lifecycle/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-03-transactional-lane-layout-and-manifests.md` (paired work brief)
5. `.local/agent-reports/wt-lane-lifecycle/LC-03-transactional-lane-layout-and-manifests.md` (implementation report)
6. `docs/spec/v1.md` — §7 (lane layout and manifests)
7. `docs/spec/v1-contracts.md` — §7 (lane.json, install.json schemas)
8. `docs/spec/schemas/v1.schema.json` — `$defs.lane`, `$defs.install`
9. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
10. the actual changed source files:
     - `src/foundation/LaneStore.ts`
     - `src/foundation/TransactionalWriter.ts`
     - `spec/foundation/lane-store.spec.ts`
     - `spec/foundation/transactional-writer.spec.ts`

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

## Your Review Mission

Independently verify that the transactional lane layout is atomic, crash-safe,
and correctly produces every required manifest and subdirectory:

1. **Adjacent staging verification**: verify the staging directory is created on the same filesystem as the target lane directory (not in /tmp or OS temp). Verify staging path format.
2. **Atomic commit proof**: verify that the lane directory transitions from nonexistent to fully-populated in one atomic operation. There must be no observable state where some files exist and others do not. Test by inspecting filesystem after staging writes complete but before the rename commit point.
3. **Failure injection — write failure**: simulate a write failure at each stage of the transaction (first file write, middle file write, last file before manifest). Verify rollback in every case. Verify staging directory is cleaned up. Verify no partial lane directory exists.
4. **Failure injection — fsync failure**: simulate fsync failure. Verify rollback and cleanup.
5. **Failure injection — rename failure**: simulate rename failure (e.g., target already exists). Verify rollback and cleanup. Verify error message identifies the pre-existing directory.
6. **Failure injection — partial manifest generation**: simulate failure during manifest (lane.json or install.json) generation. Verify rollback. Verify that a partial manifest is never observable.
7. **Manifest-last verification**: trace the transaction code path. Verify that manifests are written only after all other files and subdirectories are written and fsynced. The manifest must be the last write before the rename commit. Prove this by code inspection and by timing/logging during test execution.
8. **`lane.json` schema validation**: independently validate every required field. Test every pattern constraint (slug, UUID). Test rejection of: invalid slug pattern, invalid UUID format, duplicate repository IDs, mismatched control home.
9. **`install.json` schema validation**: independently validate every required field. Test valid and invalid fixtures.
10. **Duplicate lane rejection**: attempt to create a lane with an existing slug. Verify clear rejection.
11. **Pre-existing directory rejection**: attempt to create a lane where `.watchtower/lanes/{slug}/` already exists. Verify rejection.
12. **Complete layout verification**: list all subdirectories from v1.md §7.2. Verify each exists after successful init. Verify file permissions (operator-owned, no world-writable).
13. **Concurrent rename test**: attempt to simulate two concurrent inits to the same slug. Verify one succeeds and the other fails cleanly (no corruption).
14. **Hard-reject checklist**: run the quality-and-agent-rules reviewer hard-reject checklist. Reject immediately if any item flags.
15. **Build and test**: run `nvb build` and `nvb test` independently. Record exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept if any failure stage leaves partial state.
- Do not accept if the manifest is written before other files are committed.
- Do not accept if concurrent inits can corrupt lane state.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently inject failures at every write stage and verify rollback.
- Independently verify manifest-last ordering.
- Independently test concurrent init to the same slug.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All hard-reject checklist items are clear.
- Adjacent staging on same filesystem proven.
- Atomic commit: no partial state observable.
- Every failure stage rolls back with full cleanup.
- Manifest written last — code-inspected and test-proven.
- Schema validation correct for both manifests.
- Duplicate and pre-existing directory rejected.
- Complete layout: all v1.md §7.2 subdirectories present.
- Build and tests pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/LC-03-correction-01.md` with exact required fixes.
The correction brief must include: rejection reasons with source locations,
expected corrected state, required additional proof, exact files to change,
and reference to this review.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`

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
- `.local/agent-reports/wt-lane-lifecycle/reviews/LC-03-transactional-lane-layout-and-manifests-review.md`

Include: documents studied, independent proof reruns and outcomes,
failure-injection matrix results (every failure stage), manifest-last
verification details, concurrent init results, structural verification,
acceptance/rejection decision, final git status, and if accepting, create the
acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
LC-03: Transactional lane layout and manifests accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified failure-injection stages, manifest-last
confirmation, and any limitations noted. Confirm that LC-04 and LC-05 may now
be reviewed in parallel.
