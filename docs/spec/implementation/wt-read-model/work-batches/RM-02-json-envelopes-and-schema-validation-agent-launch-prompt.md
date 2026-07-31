# Agent Launch Prompt — Work Batch RM-02

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
- agent suitability: `high for JSON contract and serialization work`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent that
can load the complete brief/spec/source context, inspect and edit the repository
with tools, reason across contract boundaries, and run the required proof
without replacing evidence with narrative confidence.

You are assigned **implementation work batch RM-02** for the Watchtower v1
wt-read-model delivery lane.

This is correction 02 under the accepted planning remediation. Do not resume
unless RM-13 and RT-08 are independently accepted and the coordinator has
synchronized this preserved worktree to the activated pack revision. Consume
RM-13's generated-schema boundary and RT-08's exact packed-artifact fixture.
The former npm public-registry E404 is not a dependency-source decision and
must not be routed to the human. Close the unchecked schema trust boundary,
remove RM-02 changes to root `nvb.json`, document the filesystem API gap, and
replace the stale implementation report with exact current evidence.

This batch defines success/error JSON envelopes, implements schema validation,
and ensures additive compatibility and no decorative JSON output — the
serializer used by every later command.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/work-batches/RM-02-json-envelopes-and-schema-validation.md`
2. `docs/spec/implementation/wt-read-model/work-batches/README.md`
3. `docs/spec/implementation/wt-read-model/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md`
5. `docs/spec/v1-contracts.md` (especially §8 — Public command and JSON contract)
6. `docs/spec/schemas/v1.schema.json` (especially `$defs.commandResult`, `$defs.commandError`)
7. `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
8. `docs/spec/implementation/wt-read-model/implementation-tracker.md`
9. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
10. the canonical source owners you will actually change:
    - `src/foundation/commandEnvelopeSerializer.ts` (create)
    - `src/foundation/ResultRenderer.ts` (create)
    - `src/contracts/types.ts` (may need `CommandResult`, `CommandError` types if not in RM-01)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for JSON contract and serialization work`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, serializer, renderer, tests, and status artifacts affected.
2. Inspect the current source and the accepted RM-01 output. Do not infer
   behavior from filenames or reports.
3. Enumerate public invariants: every JSON output path goes through the
   serializer, `--json` guarantees exactly one value on stdout, errors go to
   stderr, no decorative text leaks.
4. Use counterexamples: identify a plausible shortcut (e.g., emitting raw JSON
   from a command, adding ANSI codes to JSON output, changing schema field types
   between versions) and ensure focused proof rejects it.
5. When a spec and current source disagree, stop and record the contradiction.
6. Treat predecessor reports as leads, not proof.

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

Implement the JSON serializer and result renderer:

1. Create `src/foundation/commandEnvelopeSerializer.ts`:
   - `buildCommandResult(command: string, data: object): CommandResult` — constructs a valid success envelope with `schemaVersion: 1`, `command`, `ok: true`, and `data`.
   - `buildCommandError(command: string, code: string, message: string, exitCode: ExitCode, details?: object): CommandError` — constructs a valid error envelope with `schemaVersion: 1`, `command`, `ok: false`, and `error` containing `code`, `message`, `exitCode`, and optional `details`.
   - `validateEnvelope(envelope: unknown): EnvelopeValidationResult` — validates
     against the accepted schema and returns a typed success/failure with stable
     error mapping; malformed external input must not panic the process.
2. Create `src/foundation/ResultRenderer.ts`:
   - `renderResult(result: CommandResult, opts: { json: boolean; noColor: boolean }): string` — returns the JSON string when `json` is true, or a human-readable string when false.
   - `renderError(error: CommandError, opts: { json: boolean; noColor: boolean }): string` — returns the JSON string to stderr when `json` is true, or a human-readable string when false.
   - When `--json` is true, stdout must contain exactly one JSON value with no ANSI codes, emojis, progress indicators, or decorative text.
3. Write focused Jasmine specs:
   - Round-trip serialization: construct every variant, serialize, parse, verify shape.
   - Schema validation: valid envelopes pass; invalid shapes (missing required
     field, wrong type, extra forbidden field) return the stable typed contract
     failure without panicking the process.
   - Additive compatibility: optional nested fields validate inside an
     extensible object carried by `data` and inside `error.details`; unknown
     properties on the closed top-level envelopes or nested `error` fail.
   - `--json` purity: output contains no ANSI codes, no decorative text, exactly one JSON value.
   - `--no-color` removes ANSI codes from human output.

## What You Must Not Do

- Do not define domain types or error codes in the serializer.
- Do not add decorative text, ANSI, emojis, or progress indicators to any output.
- Do not change the schema bundle or introduce new required fields in envelopes.
- Do not bypass the serializer from any code path.
- Do not commit.

## Required Proof

- Round-trip tests for `commandResult` and `commandError`
- Schema validation tests: valid passes, invalid panics
- `--json` purity: no ANSI, no decoration, one JSON value
- Additive compatibility follows the schema: nested extension locations pass,
  closed envelope/error objects reject unknown fields
- `nvb build` and `nvb test` pass
- final `git status --short`

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep updated:
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- every JSON output path must go through the serializer; no raw JSON from commands
- `--json` output must be exactly one JSON value on stdout with no decorative text
- the serializer must not define domain types or error codes
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:
- `.local/agent-reports/wt-read-model/RM-02-json-envelopes-and-schema-validation.md`

Include: documents studied, exact files changed, exact owners introduced or
modified, line counts, proof commands and outcomes, final `git status --short`,
one proposed commit message.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact serializer API (`buildCommandResult`, `buildCommandError`,
`validateEnvelope`), the renderer API (`renderResult`, `renderError`), and the
output guarantees (one JSON value, no ANSI, no decoration). RM-10 consumes
this serializer for all three read-only commands. Note any schema validation
details that command authors need to observe.
