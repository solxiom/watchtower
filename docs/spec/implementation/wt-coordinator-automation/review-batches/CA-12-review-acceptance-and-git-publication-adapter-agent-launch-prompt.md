# Agent Launch Prompt — Review Batch CA-12

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
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for Git-adapter review, ownership-audit, publication/recovery audit, and acceptance-durability verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying reviewer-ownership enforcement, commit-set
validation, push/partial recovery, acceptance-durability-through-failure, and
force-push prevention without trusting the implementation report.

You are assigned **review batch CA-12** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-12-review-acceptance-and-git-publication-adapter.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-12-acceptance-and-git-publication-adapter.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-12-acceptance-and-git-publication-adapter.md` (implementation report)
6. `docs/spec/coordinator-automation.md` §12.2–12.3 — external effects and journals
7. `docs/spec/coordinator-automation.md` §13 — acceptance and publication separation
8. `docs/spec/v1-contracts.md` §5 — effect registry (Git effects)
9. `docs/spec/v1-contracts.md` §11 — locking and recovery rules
10. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
11. the actual changed source files:
    - `src/foundation/GitAcceptance.ts`
    - all new spec files under `spec/`

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

Independently verify that the Git acceptance adapter correctly enforces reviewer
ownership, validates commit sets, recovers from partial push, and maintains the
acceptance/publication separation:

1. **Ownership audit:** Independently create acceptance proposals from distinct
   sessions. Prove `validateReviewerOwnership` passes for the owning session and
   fails with `GIT_OWNERSHIP_MISMATCH` for non-owning sessions. Prove the
   adapter reads session identity from durable worker events, not from Git
   author or committer fields.
2. **Commit-set validation audit:** Independently test every validation rule:
   SHA existence, tree contents against the accepted file set, ancestry against
   the expected base, and repository binding. Prove correct pass and correct
   rejection for each rule.
3. **Publication audit:** Independently push verified commits to a test remote.
   Verify the remote ref is correct and the publication result reports success.
4. **Partial-push recovery audit:** Set up a multi-repository scenario where
   one remote fails. Independently verify that already-pushed repositories are
   not re-pushed during recovery and that only failed repositories are retried.
5. **Acceptance-durability audit:** Record an acceptance through the adapter.
   Independently trigger a publication failure. Verify the acceptance event
   remains in the journal and the batch state reflects accepted status.
6. **Force-push audit:** Search the adapter source code for any construction of
   `--force`, `-f`, `--force-with-lease`, or equivalent force-push flags.
   Independently verify that no code path constructs or passes these flags.
7. **Idempotency audit:** Execute a publication, then execute the same
   publication with the same idempotency key. Verify no duplicate push occurs.
8. **Model-free verification:** grep the adapter for any model invocation.
   Prove none exist.
9. **Layer integrity:** Verify imports only from CA-10's typed interface, RM-08
   bindings, RT-05 task/leaf contracts, and standard contracts. No imports from CLI,
   session, watcher, or routing.
10. **Hard-reject checklist:** Verify every hard-reject condition. Reject
    immediately if any item flags.
11. **Build and test:** Run `nvb build` and `nvb test` independently. Record
    exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without exhaustively testing every commit-set validation rule.
- Do not accept if acceptance and publication are conflated.
- Do not accept if force push is permitted by any means.
- Do not accept if the implementation agent committed.

## Mandatory Nirvana/TaskHandler Proof

Reproduce the pinned Nirvana Git API audit. Trace a valid CA-10 envelope through
the focused TaskHandler. A Git leaf requires a named `NIRVANA_API_GAP`, catalog
declaration, `LeafRuntimeInvoker`, closed typed operations/argv, and rejection
of caller-controlled remote/refspec/config/path/executable/environment.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently test reviewer ownership across session boundaries.
- Independently test every commit-set validation rule.
- Independently test partial push with three-repository setup.
- Independently verify acceptance survives publication failure.
- Independently verify idempotent replay does not re-push.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- Acceptance and publication are distinct effect types and code paths.
- Reviewer ownership is enforced from durable worker events.
- Every commit-set validation rule correctly passes and rejects.
- Successful push updates the remote ref correctly.
- Partial push recovery retries only failed repositories.
- Acceptance survives publication failure.
- Force push is never permitted.
- Build and tests pass independently.
- Zero model invocations in adapter code.
- Layer dependencies point only to CA-10 and RM-08.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-12-correction-01.md` with exact required fixes.
The correction brief must include: rejection reasons with source locations,
expected corrected state, required additional proof, exact files to change,
and reference to this review.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`

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
- `.local/agent-reports/coordinator-automation/reviews/CA-12-acceptance-and-git-publication-adapter-review.md`

Include: documents studied, independent proof reruns and outcomes, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
CA-12: Acceptance and Git publication adapter accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified commit-set validation rules, partial-push
recovery coverage, acceptance-durability evidence, and force-push audit result.
Confirm that CA-10's typed interface correctly supports both effect types and
that CA-13 may now be reviewed.
