# Agent Launch Prompt — Review Batch LC-02

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
- agent suitability: `high for JSON Schema validation, RFC 8785 canonicalization verification, seal reproduction, and drift matrix classification`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying JSON Schema validation, RFC 8785
canonicalization, seal reproduction, and the drift classification matrix.
The reviewer must be able to produce or verify canonical JSON output against
known-good test vectors.

You are assigned **review batch LC-02** for the Watchtower v1 wt-lane-lifecycle
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-lane-lifecycle/review-batches/LC-02-review-pack-acceptance-seal-and-drift-validation.md`
2. `docs/spec/implementation/wt-lane-lifecycle/review-batches/README.md`
3. `docs/spec/implementation/wt-lane-lifecycle/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-02-pack-acceptance-seal-and-drift-validation.md` (paired work brief)
5. `.local/agent-reports/wt-lane-lifecycle/LC-02-pack-acceptance-seal-and-drift-validation.md` (implementation report)
6. `docs/spec/v1-contracts.md` — §3 (implementation-pack consumer contract, seal, drift)
7. `docs/spec/schemas/v1.schema.json` — `$defs.implementationPack`, `$defs.implementationPackLock`, `$defs.packAcceptance`, `$defs.sealedFile`
8. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
9. the actual changed source files:
    - `src/foundation/PackConsumer.ts`
    - `src/foundation/PackSeal.ts`
    - `spec/foundation/pack-consumer.spec.ts`
    - `spec/foundation/pack-seal.spec.ts`

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

Independently verify that pack validation, seal reproduction, and drift
classification are correct and purely mechanical:

1. **JSON Schema validation audit**: independently validate valid and invalid fixtures for all three document types (`implementation-pack.json`, `implementation-pack.lock.json`, `pack-acceptance.json`). For each invalid fixture, verify the exact error message and error code.
2. **RFC 8785 canonicalization verification**: produce canonical JSON from known-good test inputs. Compare against known-good test vectors or an independent RFC 8785 implementation. Verify key sorting is by code-point order. Verify numbers are serialized without exponential notation. Verify insignificant whitespace is stripped.
3. **Seal reproduction**: build a seal from a known-good fixture. Compare against the locked seal in the fixture. Must match exactly.
4. **Seal mismatch detection**: modify a sealed file in the fixture. Verify the seal computation no longer matches. Modify the lock file (tampered digest). Verify lock verification detects the tampering.
5. **Drift code matrix**: for each of the six drift codes, verify the implementation produces the correct code for the correct condition:
   - `PACK_BYTES_CHANGED` — when a sealed file's content changes
   - `PACK_FILESET_CHANGED` — when a file is added or removed from the pack
   - `ACCEPTED_INPUT_CHANGED` — when acceptance input digests change
   - `SOURCE_BASELINE_CRITICAL` — when a tracked file intersecting writable claims changes
   - `SOURCE_BASELINE_UNRELATED` — when a tracked file outside writable claims changes
   - `SOURCE_BASELINE_UNAVAILABLE` — when a required source is not accessible
   For each code, also verify a counterexample where the code should NOT be produced.
6. **File-set validation**: verify symlinks, device nodes, sockets, untracked files, and ignored files are all rejected. Verify paths outside pack root are rejected. Verify non-UTF-8 paths are rejected.
7. **Model-free audit**: search all source code in `PackConsumer.ts` and `PackSeal.ts`. Verify zero model imports or invocations. Drift classification must be purely mechanical.
8. **Hard-reject checklist**: run the quality-and-agent-rules reviewer hard-reject checklist. Reject immediately if any item flags.
9. **Build and test**: run `nvb build` and `nvb test` independently. Record exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without exhaustively verifying all six drift codes.
- Do not accept if any model invocation exists.
- Do not accept if seal reproduction produces incorrect results for any test vector.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently produce canonical JSON and verify against known-good vectors.
- Independently test every drift code with representative fixtures.
- Independently verify file-set rejection for every invalid path class.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All hard-reject checklist items are clear.
- JSON Schema validation correct for all three document types.
- RFC 8785 canonicalization verified against known-good vectors.
- Seal reproduction matches on known-good fixtures.
- All six drift codes tested and verified.
- File-set validation rejects all invalid path classes.
- No model invocation anywhere.
- Build and tests pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/LC-02-correction-01.md` with exact required fixes.
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
- `.local/agent-reports/wt-lane-lifecycle/reviews/LC-02-pack-acceptance-seal-and-drift-validation-review.md`

Include: documents studied, independent proof reruns and outcomes, RFC 8785
verification details, drift code matrix results (all six codes with fixtures),
structural verification, acceptance/rejection decision, final git status, and
if accepting, create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
LC-02: Pack acceptance, seal, and drift validation accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified drift code matrix, RFC 8785
compatibility confirmation, and any limitations noted. Confirm that LC-02 is
accepted and that LC-03 may begin after both LC-01 and LC-02 are accepted.
