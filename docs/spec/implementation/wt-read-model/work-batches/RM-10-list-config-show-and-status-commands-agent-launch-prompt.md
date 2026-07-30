# Agent Launch Prompt — Work Batch RM-10

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
    - `src/foundation/serializer.ts` (RM-02 — JSON envelopes)
    - `src/foundation/result-renderer.ts` (RM-02 — human/JSON rendering)
    - `src/foundation/paths.ts` (RM-03 — path resolution)
    - `src/foundation/workspace.ts` (RM-03 — workspace resolution)
    - `src/foundation/parsers.ts` (RM-04 — parser utilities)
    - `src/foundation/env-parser.ts` (RM-04 — config parsing, redaction)
    - `src/foundation/state-parser.ts` (RM-04 — state parsing, status)
    - `src/foundation/jsonl-parser.ts` (RM-05 — event parsing)
    - `src/foundation/discovery.ts` (RM-06 — lane discovery)
    - `src/foundation/lane-selector.ts` (RM-06 — lane selection)
    - `src/foundation/membership.ts` (RM-07 — membership validation)
    - `src/foundation/secondary-discovery.ts` (RM-07 — secondary discovery)
    - `src/foundation/bindings.ts` (RM-08 — repository bindings)
    - `src/foundation/conflicts.ts` (RM-08 — conflict detection)
    - `src/foundation/observations.ts` (RM-09 — tmux/worker observations)
    - `src/foundation/heartbeat.ts` (RM-09 — heartbeat detection)

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

Per quality rules. Each command should be a thin delegate — argument validation,
foundation-service calls, serializer invocation. No command should exceed the
front-door limits.

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
