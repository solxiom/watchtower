# Agent Launch Prompt — Work Batch RM-04

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
- agent suitability: `high for strict parser and shell-safety work`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent that
can load the complete brief/spec/source context, reason across security
boundaries, and run the required proof.

You are assigned **implementation work batch RM-04** for the Watchtower v1
wt-read-model delivery lane.

This batch implements strict non-executing env and lane-state parsers. The
malicious-shell corpus must never execute.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/work-batches/RM-04-strict-env-and-lane-state-parsers.md`
2. `docs/spec/implementation/wt-read-model/work-batches/README.md`
3. `docs/spec/implementation/wt-read-model/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md` (especially §8 — Lane configuration contract, §13 — State and event compatibility)
5. `docs/spec/v1-contracts.md`
6. `docs/spec/architecture.md` (especially §9.1 — Trust zones)
7. `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
8. `docs/spec/implementation/wt-read-model/implementation-tracker.md`
9. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
10. the canonical source owners:
    - `src/foundation/scalarLineParser.ts` (create)
    - `src/foundation/envParser.ts` (create)
    - `src/foundation/stateRecordParser.ts` (create)
    - `src/foundation/laneLifecycle.ts` (create)
    - `src/foundation/stateParser.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for strict parser and shell-safety work`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

1. Build a dependency map from the specs to the exact grammar rules, parser
   modules, tests, and status artifacts.
2. Inspect the current source and accepted RM-01 output.
3. Enumerate every accepted input form (blank, comment, KEY=value with three
   quoting styles) and every rejected construct (command substitution,
   variable expansion, shell operators, unclosed quotes, executable statements).
4. Use counterexamples: a double-quoted string containing `$(...)` should be
   rejected because it looks like a string but contains command substitution.
   A bare `KEY=value` with `$VAR` in the value should be rejected.
5. Build the malicious-shell corpus from known shell injection techniques.
6. Never execute, `eval`, or `source` any config text during parsing or testing.

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

Implement strict env and lane-state parsers:

1. Create `src/foundation/scalarLineParser.ts`:
   - `splitLines(content: string): string[]` — split content into lines preserving line numbers.
   - `isBlankLine(line: string): boolean` — detect whitespace-only or empty lines.
   - `isCommentLine(line: string): boolean` — detect `#`-prefixed comment lines (after trimming).
   - `classifyScalarValue(value: string): 'unquoted' | 'single-quoted' | 'double-quoted' | 'invalid'` — classify a value by quoting style; reject unclosed quotes.
   - `parseKeyValue(line: string): { key: string; value: string; quoting: 'unquoted' | 'single-quoted' | 'double-quoted' } | null` — parse `KEY=value`, return null for non-kv lines.
2. Create `src/foundation/envParser.ts`:
   - `parseEnvConfig(content: string): EnvConfigResult` — parse a complete env file. Return parsed keys as `Record<string, string>` and any warnings with line numbers.
   - The parser must reject: command substitution `$(...)` and backticks, variable expansion `${...}` and `$VAR`, shell operators (`&&`, `||`, `|`, `;`, `&`, `<`, `>`, `>>`), executable statements, unclosed quotes.
   - The parser must accept: blank lines, `#` comment lines, `KEY=value` with unquoted, single-quoted, or double-quoted scalar values.
   - `redactSensitiveKeys(config: Record<string, string>): { redacted: Record<string, string>; redactedKeys: string[] }` — redact values whose keys match `TOKEN`, `SECRET`, `PASSWORD`, `KEY`, or `CREDENTIAL`.
3. Create `src/foundation/stateRecordParser.ts`, `src/foundation/laneLifecycle.ts`, and `src/foundation/stateParser.ts`:
   - `parseLaneState(content: string): LaneStateResult` — parse a lane-state file as `KEY=value` records.
   - `normalizeLaneStatus(rawState: Record<string, string>): LaneLifecycle` — normalize known `lane_status` into `bootstrap` | `active` | `paused` | `complete` | `unknown`.
   - `detectContradictions(state: Record<string, string>, lifecycle: LaneLifecycle): string[]` — detect contradictory state (e.g., `complete` + active batch).
4. Write focused Jasmine specs:
   - 30+ fixture malicious-shell corpus: each fixture must be rejected with a line-number diagnostic.
   - Known-key parsing: every recognized key parses to exact value.
   - Unknown-key preservation: keys not in known set appear in diagnostics.
   - Quoting edge cases: single-quote inside double-quote OK, unclosed quote rejected.
   - Blank lines and comments silently skipped.
   - Contradictory state detection: each contradiction class produces a diagnostic.
   - Redaction: sensitive keys redacted, non-sensitive keys preserved.

## What You Must Not Do

- Do not execute, `source`, `eval`, or shell-invoke any config text.
- Do not import command classes.
- Do not silently repair contradictory state.
- Do not commit.

## Required Proof

- 30+ malicious-shell fixtures all rejected; zero executed.
- Known-key parsing with exact value reproduction.
- Unknown-key preservation.
- Contradictory state detection.
- `nvb build` and `nvb test` pass.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep `implementation-tracker.md` and `implementation-roadmap.md` updated.

## Local Artifact Git Rule

Write `.local/...` reports on disk only; never stage or commit.

## Non-Negotiable Rules

- no shell execution of config or state text
- every injection class must be rejected with line-number diagnostics
- unknown keys must be preserved, never silently dropped
- contradictory state must be diagnosed, never repaired
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write to: `.local/agent-reports/wt-read-model/RM-04-strict-env-and-lane-state-parsers.md`

Include: documents studied, exact files changed, line counts, proof commands
and outcomes, final `git status --short`, proposed commit message.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the env parser API (`parseEnvConfig`, `redactSensitiveKeys`), state
parser API (`parseLaneState`, `normalizeLaneStatus`, `detectContradictions`),
and the accepted grammar rules. RM-06 consumes state parsing for lane status.
RM-09 consumes env parsing for config display. No downstream batch may execute
or source config text.
