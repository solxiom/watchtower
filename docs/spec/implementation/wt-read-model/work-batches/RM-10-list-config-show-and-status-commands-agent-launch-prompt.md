# Agent Launch Prompt — Work Batch RM-10

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
- agent suitability: `highest available`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `highest available for multi-service command integration`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

For `R5`, use the strongest available reasoning configuration with sufficient
context for cross-service integration and exhaustive fixture-matrix reasoning.

You are assigned **implementation work batch RM-10** for the Watchtower v1
wt-read-model delivery lane.

This is the integration batch: three read-only commands consuming all nine
foundation services with full human/JSON parity, redaction, stable schemas,
and a 7-class fixture matrix proof. Any duplication of foundation logic or
hidden write is a hard reject.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/work-batches/RM-10-list-config-show-and-status-commands.md`
2. `docs/spec/implementation/wt-read-model/work-batches/README.md`
3. `docs/spec/implementation/wt-read-model/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md` (especially §11.1-11.3 — list, status, config show)
5. `docs/spec/v1-contracts.md` (especially §8 — Public command and JSON contract)
6. `docs/spec/schemas/v1.schema.json`
7. `docs/spec/architecture.md`
8. `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
9. `docs/spec/implementation/wt-read-model/implementation-tracker.md`
10. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
11. the accepted foundation services you will consume:
    - `src/contracts/` (RM-01 — types, errors, exit codes)
    - `src/foundation/commandEnvelopeSerializer.ts` (RM-02 — JSON envelopes)
    - `src/foundation/ResultRenderer.ts` (RM-02 — human/JSON rendering)
    - `src/foundation/canonicalPaths.ts` (RM-03 — path resolution)
    - `src/foundation/workspaceResolver.ts` (RM-03 — workspace resolution)
    - `src/foundation/scalarLineParser.ts` (RM-04 — parser utilities)
    - `src/foundation/envParser.ts` (RM-04 — config parsing, redaction)
    - `src/foundation/stateParser.ts` (RM-04 — state parsing, status)
    - `src/foundation/JsonlParser.ts` (RM-05 — event parsing)
    - `src/foundation/laneDiscovery.ts` (RM-06 — lane discovery)
    - `src/foundation/LaneSelector.ts` (RM-06 — lane selection)
    - `src/foundation/membershipIndex.ts` (RM-07 — membership validation)
    - `src/foundation/SecondaryDiscovery.ts` (RM-07 — secondary discovery)
    - `src/foundation/repositoryBindings.ts` (RM-08 — repository bindings)
    - `src/foundation/writableConflicts.ts` (RM-08 — conflict detection)
    - `src/foundation/runtimeObservations.ts` (RM-09 — tmux/worker observations)
    - `src/foundation/heartbeatObservation.ts` (RM-09 — heartbeat detection)

## Reasoning / Agent Class — R5 with full forwarding profile as above.

## Mandatory Reasoning Protocol

1. Map every command requirement to the exact foundation service that owns it.
   Before writing any command code, list every foundation function it will call.
2. Inspect every accepted foundation module; verify the API surface matches
   what the command needs.
3. Draw the complete fixture matrix: enumerate every lane state (empty, single,
   ambiguous, invalid, multi-repository, stale-index, busy-lock) for each
   command.
4. Use counterexamples: a command that locally calls `readdir` to find lanes
   instead of using `discoverHomeLanes`; a command that writes a log line during
   status display.
5. Every line of JSON output must pass through the accepted serializer.

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

Implement three read-only commands:

1. Create `src/commands/ListCommand.ts`:
   - Class `ListCommand` extending `BaseCommand`.
   - Resolve workspace via `resolveWorkspace()`, discover lanes via
     `discoverHomeLanes()`, apply `--initiative` filter if provided.
   - Human output: table with columns for lane ID (truncated), slug, initiative,
     kind, control home, repo count, status, active batch, runtime version,
     conflict state.
   - JSON output: `commandResult` with `data: { items: LaneSummary[] }` where
     each `LaneSummary` contains scalar fields only. Empty array when no lanes.
   - Apply `--json`, `--no-color`, `--workspace`, `--lane`, `--initiative` flags.
2. Create `src/commands/ConfigShowCommand.ts`:
   - Class `ConfigShowCommand` extending `BaseCommand`.
   - Resolve lane via `resolveLane()`.
   - Display resolution sources (env var, explicit, XDG fallback), control home,
     lane identity (ID, slug, initiative, kind), logical and local repository
     bindings, lane paths, strict-parsed config from `parseEnvConfig()`,
     runtime/knowledge root locations.
   - Redact values whose keys contain `TOKEN`, `SECRET`, `PASSWORD`, `KEY`,
     or `CREDENTIAL` via `redactSensitiveKeys()`.
   - Human output: structured display with redacted values shown as `[REDACTED]`.
   - JSON output: `commandResult` with `data` matching `resolvedConfig` schema,
     including `redactedKeys` array.
3. Create `src/commands/StatusCommand.ts`:
   - Class `StatusCommand` extending `BaseCommand`.
   - Resolve lane via `resolveLane()`.
   - Collect: lane identity, repository bindings, lifecycle (from state parser),
     health (derived from status and contradictions), worker sessions (from
     observations), watcher (from heartbeat), coordinator fields, runtime info.
   - Derive health: `ok` (required files valid, runtime matches), `attention`
     (recoverable mismatch, stale watcher, missing tmux), `complete` (lane
     complete, no active batch), `invalid` (marker/config/state inconsistent).
   - Human output: structured sections for each status category.
   - JSON output: `commandResult` with `data` matching `laneStatus` schema
     (v1.md §11.3).
4. Create help fragments:
   - `help/commands/list.hlp.json`: describe `wt list` with all supported flags.
   - `help/commands/config-show.hlp.json`: describe `wt config show` with
     redaction note.
   - `help/commands/status.hlp.json`: describe `wt status` with health field
     documentation.
5. Write complete integration specs:
   - Human/JSON parity: for each fixture, assert human and JSON output contain
     the same logical data.
   - Redaction: assert `TOKEN`, `SECRET`, `PASSWORD`, `KEY`, `CREDENTIAL` values
     are redacted.
   - JSON schema validation: each command's JSON output validates against
     the schema.
   - Fixture matrix (7 classes for each command where applicable):
     1. **Empty**: no lanes found → appropriate response (empty list, not-found
        error).
     2. **Single-lane**: exactly one lane → correct selection and output.
     3. **Ambiguous**: multiple lanes, no deduction → `ERR_AMBIGUOUS_SELECTION`
        with candidate listing.
     4. **Invalid**: bad lane.json (missing required field, wrong schemaVersion)
        → `ERR_INVALID_LANE_CONFIG`.
     5. **Multi-repository**: lane with 2+ repository bindings → all bindings
        displayed, conflicts detected.
     6. **Stale-index**: stale membership entries → warnings in status,
        secondary discovery still works for valid entries.
     7. **Busy-lock**: lane lock file present → status reports mutation active,
        list still shows lane.
   - **Read-only hash proof**: for each fixture, compute SHA-256 hash of the
     fixture workspace's `.watchtower/` tree before and after each command.
     Assert the hashes are identical (zero bytes changed).

## What You Must Not Do

- Do not implement discovery, selection, parsing, binding computation, or
  observation logic locally in command classes.
- Do not emit JSON directly; always use the serializer.
- Do not add hidden writes, log files, or state repairs.
- Do not change the stable `laneStatus` schema shape.
- Do not add decorative text or ANSI codes to JSON output.
- Do not commit.

## Required Proof

- Human output matches expected format for all three commands.
- JSON output validates against v1.schema.json for all three commands.
- Parity: human and JSON output share identical underlying data.
- Redaction: sensitive keys redacted in both modes.
- Full 7-class fixture matrix passes for each applicable command.
- Read-only hash proof: zero bytes written in any fixture.
- `nvb build` and `nvb test` pass.
- final `git status --short`.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep `implementation-tracker.md` and `implementation-roadmap.md` updated.
Update `docs/spec/v1.md` command table status markers for `list`, `config show`,
and `status` to ✅ when accepted.

## Local Artifact Git Rule

Write `.local/...` reports on disk only; never stage or commit.

## Non-Negotiable Rules

- every command must delegate to foundation services; no local reimplementation
- all JSON output through the serializer; no raw JSON from commands
- zero hidden writes in any read-only command
- redaction must cover all five key patterns in both human and JSON modes
- the stable `laneStatus` schema must not change
- the read-only hash proof must pass for every fixture
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write to: `.local/agent-reports/wt-read-model/RM-10-list-config-show-and-status-commands.md`

Include: documents studied, exact files changed, foundation services consumed,
line counts, fixture matrix results, read-only hash proof, proof commands and
outcomes, final `git status --short`, proposed commit message.

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

The wt-read-model pack is complete. Three read-only commands (`list`, `config
show`, `status`) are accepted with full human/JSON parity, redaction, stable
status schema, and read-only hash proof across a 7-class fixture matrix.
Pack 2 (`wt-runtime-distribution`) may begin. The read model guarantees that
every later pack has a stable foundation for path resolution, discovery,
configuration display, and status observation.
