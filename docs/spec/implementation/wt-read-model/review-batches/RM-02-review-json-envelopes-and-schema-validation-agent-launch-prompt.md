# Agent Launch Prompt — Review Batch RM-02

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
- agent suitability: `high for JSON envelope and serialization review`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying JSON envelope contracts.

You are assigned **review batch RM-02** for the Watchtower v1 wt-read-model
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/review-batches/RM-02-review-json-envelopes-and-schema-validation.md`
2. `docs/spec/implementation/wt-read-model/review-batches/README.md`
3. `docs/spec/implementation/wt-read-model/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-read-model/work-batches/RM-02-json-envelopes-and-schema-validation.md`
5. `.local/agent-reports/wt-read-model/RM-02-json-envelopes-and-schema-validation.md`
6. `docs/spec/v1.md`, `docs/spec/v1-contracts.md` (especially §8)
7. `docs/spec/schemas/v1.schema.json` (especially `$defs.commandResult`, `$defs.commandError`)
8. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
9. the actual changed source files: `src/foundation/commandEnvelopeSerializer.ts`, `src/foundation/ResultRenderer.ts`

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

Independently verify the JSON envelope serializer and result renderer:

1. **Schema validation audit**: Construct every envelope variant (`commandResult` with each data type, `commandError` with each exit code). Serialize, parse, validate against the schema. Verify all pass.
2. **Invalid envelope rejection**: Construct envelopes with missing required
   fields, wrong types, invalid exit codes, and additional properties only
   where the governing schema forbids them. Verify validation returns or throws
   the typed contract error; do not invent a panic API or reject additive fields
   where the schema explicitly permits them.
3. **`--json` purity**: Invoke `renderResult` with `{ json: true }`. Assert output is exactly one JSON string, no ANSI codes, no emojis, no progress indicators. Parse the output to confirm valid JSON.
4. **Human output**: Invoke with `{ json: false }`. Assert human-readable format, `--no-color` removes ANSI.
5. **Additive compatibility**: Add optional nested fields inside an extensible
   object carried by `commandResult.data` and inside `commandError.error.details`;
   verify they serialize and validate. Add unknown properties to the top-level
   envelopes and nested `error`; verify the closed objects reject them.
6. **Layer integrity**: Verify serializer does not define domain types; it type-checks against contracts.
7. **Hard-reject checklist**: Run the 16-item checklist.
8. **Build and test**: Rerun `nvb build` and `nvb test`.

## What You Must Not Do

- Do not trust the implementation report.
- Do not accept if any decorative text appears in JSON output.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`.
- Round-trip test every envelope variant with schema validation.
- `--json` purity test.
- Schema-permitted nested compatibility plus closed-envelope rejection tests.

## Acceptance Gate / Rejection Correction Brief Rule / User Rule / Trackers

The following complete sections instantiate this template requirement. Do not
accept by reference to RM-01 without producing RM-02-specific evidence.

## Acceptance Gate

Accept only when every success/error envelope validates against the current
schema, human and JSON modes derive from one typed result, JSON output is one
undecorated value, additive compatibility follows the schema, Nirvana
presentation APIs own rendering, and every engineering-standard matrix gate
passes.

## Rejection Correction Brief Rule

Write numbered corrections under `review-batches/corrections/` with the failed
schema path, expected/actual value, owning layer, and regression proof. Do not
implement the correction as reviewer.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Update tracker, roadmap, and indexes only after current independent evidence.
Acceptance and Git publication remain separate facts.

## Local Artifact Git Rule / Non-Negotiable Rules / Required Disk Report

Reports stay under `.local/` and must not be committed. Do not accept
command/help/schema drift, direct console/process output, local ANSI rendering,
broad `any`, or domain policy in the serializer.

## Required Disk Report

Write exactly one report to:

`.local/agent-reports/wt-read-model/reviews/RM-02-json-envelopes-and-schema-validation-review.md`

Include the reviewer matrix, Nirvana audit, schema cases, JSON purity proof,
line counts, commands, and verdict.

## If accepted, create the acceptance commit

```
RM-02: JSON envelopes and schema validation accepted
```

## Always plan and make task lists

Maintain an explicit review task list and close every proof item.

## Leave a helpful handoff message for the next reviewer

Record schema definitions exercised, envelope variants, additive compatibility,
presentation boundary, report path, and acceptance/correction identity.
