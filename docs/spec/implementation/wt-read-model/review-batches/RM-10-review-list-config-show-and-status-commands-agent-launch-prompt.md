# Agent Launch Prompt — Review Batch RM-10

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
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for command integration review, cross-foundation verification, and full read-model acceptance`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying three read-only commands against nine
foundation services, seven fixture classes, and a complete read-only hash proof.
The reviewer must understand the full status schema, redaction contract, and
human/JSON parity requirements.

You are assigned **review batch RM-10** for the Watchtower v1 wt-read-model
delivery lane. You are the independent acceptance authority. This batch gates
the entire wt-read-model pack exit.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/review-batches/RM-10-review-list-config-show-and-status-commands.md`
2. `docs/spec/implementation/wt-read-model/review-batches/README.md`
3. `docs/spec/implementation/wt-read-model/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-read-model/work-batches/RM-10-list-config-show-and-status-commands.md` (paired work brief)
5. `.local/agent-reports/wt-read-model/RM-10-list-config-show-and-status-commands.md` (implementation report)
6. `docs/spec/v1.md` (especially §10, §11.1–11.3)
7. `docs/spec/v1-contracts.md` (especially §8 public command and JSON contract)
8. `docs/spec/schemas/v1.schema.json`
9. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
10. The actual changed source files:
    - `src/commands/ListCommand.ts`
    - `src/commands/ConfigShowCommand.ts`
    - `src/commands/StatusCommand.ts`
    - `help/commands/list.hlp.json`
    - `help/commands/config-show.hlp.json`
    - `help/commands/status.hlp.json`
    - `help/help.json`

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

Independently verify the three read-only commands against all foundation
services, all fixture classes, and the complete read-only hash proof:

1. **Foundation delegation audit**: For each command class, trace every
   foundation service call. Verify ListCommand delegates to LaneDiscovery and
   LaneSelector (RM-06), membership (RM-07), bindings (RM-08), and observations
   (RM-09). Verify ConfigShowCommand delegates to path/workspace resolution
   (RM-03), env parser (RM-04), and serializer (RM-02). Verify StatusCommand
   delegates to all nine foundation services. Reject any command-local
   reimplementation.
2. **Human/JSON parity — list**: Run `wt list` and `wt list --json`. Diff the
   underlying data. Verify identical lane count, IDs, slugs, and properties.
   Verify JSON validates against `$defs.laneListPage`.
3. **Human/JSON parity — config show**: Run `wt config show` and
   `wt config show --json`. Verify identical resolution sources, paths, and
   bindings. Verify JSON validates against `$defs.resolvedConfig`.
4. **Human/JSON parity — status**: Run `wt status` and `wt status --json`.
   Verify identical lane identity, repository bindings, lifecycle, health,
   worker sessions, watcher status, coordinator state, and runtime info. Verify
   JSON validates against `$defs.laneStatus`. Verify health is one of `ok`,
   `attention`, `complete`, or `invalid`.
5. **Redaction audit**: Configure a lane with secrets in keys containing TOKEN,
   SECRET, PASSWORD, KEY, or CREDENTIAL. Verify redaction in both human and
   JSON output. Verify redacted keys are identified (not silently dropped).
6. **Empty fixture**: Create a workspace with no lanes. Run `wt list`. Verify
   empty array in JSON, "no lanes" message in human. Run `wt status` and
   `wt config show`. Verify exit code 3.
7. **Single-lane fixture**: Create exactly one valid lane. Verify all three
   commands succeed and produce correct output.
8. **Ambiguous fixture**: Create two lanes relevant to the same workspace.
   Without `--lane`, verify all three commands fail with exit code 3 and
   actionable candidate listing.
9. **Invalid fixture**: Create a lane with a malformed `lane.json`. Verify
   commands targeting it fail with exit code 2 and a clear diagnostic.
10. **Multi-repository fixture**: Create a lane with multiple repository
    bindings. Verify `status` displays all bindings and `config show` displays
    all resolution sources.
11. **Stale-index fixture**: Inject a stale membership-index entry. Verify
    `status` reports a warning. Verify the index file is not modified (check
    mtime/hash before and after).
12. **Busy-lock fixture**: Create a lock file in the lane directory. Verify
    `status` reports mutation active. Verify the lock file is not removed or
    modified.
13. **Read-only hash proof**: For each of the three commands, compute a SHA-256
    hash of the lane directory before execution, run the command, and recompute
    the hash. Verify the hashes are identical (zero bytes written).
14. **Help verification**: Run `wt help list`, `wt help config show`, and
    `wt help status`. Verify output matches command behavior. Confirm help
    fragments are registered in `help/help.json`.
15. **Serializer path audit**: Trace every JSON output path through the RM-02
    serializer. Verify no command produces JSON outside the serializer.
16. **Hard-reject checklist**. **Build and test** independently.
17. **Spec status update**: After acceptance, update the v1 command table in
    `docs/spec/v1.md` to mark `list`, `config show`, and `status` as ✅.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without independently reproducing every fixture class.
- Do not accept without independently computing the read-only hash proof.
- Do not accept if any command reimplements foundation logic.
- Do not accept if human and JSON output diverge.
- Do not accept if any command writes bytes to the lane directory.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently set up and run every fixture class.
- Independently compute SHA-256 hashes for the read-only proof.
- Independently validate JSON output against `v1.schema.json`.
- Independently verify redaction in both output modes.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All 7 fixture classes pass for all three commands.
- Human and JSON output derive from identical data for every command.
- Redaction works in both output modes for all sensitive key patterns.
- JSON output validates against `v1.schema.json`.
- The read-only hash proof confirms zero bytes written.
- Help fragments match command behavior and are registered.
- No command reimplements foundation logic.
- All 16 hard-reject checklist items are clear.
- Build and tests pass independently.
- Tracker and roadmap are updated.
- `docs/spec/v1.md` command status table is updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/RM-10-correction-01.md` with exact required fixes.
The correction brief must include: rejection reasons with source locations,
expected corrected state, required additional proof, exact files to change,
and reference to this review.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
- `docs/spec/v1.md` (command status table — mark list, config show, status ✅ if accepted)

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
- `.local/agent-reports/wt-read-model/reviews/RM-10-list-config-show-and-status-commands-review.md`

Include: documents studied, independent proof reruns and outcomes for all 17
review items, read-only hash proof (before/after hashes for each command),
human/JSON parity comparison, structural verification, acceptance/rejection
decision, final git status, and if accepting, create the acceptance commit
and update the `v1.md` command status table.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
RM-10: list, config show, and status commands accepted

[one-paragraph summary of what was verified and the key outcomes, confirming
the wt-read-model pack is complete: from any relevant repository location,
the CLI can identify, select, and describe managed lanes without changing any byte]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified fixture classes, read-only hash proof
results, and any limitations noted. Confirm the wt-read-model pack is complete.
Pack 2 (wt-runtime-distribution) may now begin.
