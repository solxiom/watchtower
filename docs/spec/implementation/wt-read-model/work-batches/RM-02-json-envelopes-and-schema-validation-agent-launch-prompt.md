# Agent Launch Prompt — Work Batch RM-02

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
    - `src/foundation/serializer.ts` (create)
    - `src/foundation/result-renderer.ts` (create)
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

- Front doors and public barrels target 160 lines or fewer. 161-220 requires
  cohesion justification. Over 220 is rejectable; 300 is the absolute ceiling.
- Focused implementation modules target 220 lines or fewer. 221-300 requires
  a responsibility inventory. 301-350 requires source-backed split rationale.
  Above 350 is rejected.
- Four hundred physical lines is the absolute ceiling for any hand-maintained
  JS/TS source or spec module.
- Do not create generic `helpers`, `utils`, `common`, or `misc` bags.
- Record physical line counts for every new or materially rewritten file.

## Your Mission

Implement the JSON serializer and result renderer:

1. Create `src/foundation/serializer.ts`:
   - `buildCommandResult(command: string, data: object): CommandResult` — constructs a valid success envelope with `schemaVersion: 1`, `command`, `ok: true`, and `data`.
   - `buildCommandError(command: string, code: string, message: string, exitCode: ExitCode, details?: object): CommandError` — constructs a valid error envelope with `schemaVersion: 1`, `command`, `ok: false`, and `error` containing `code`, `message`, `exitCode`, and optional `details`.
   - `validateEnvelope(envelope: object): void` — validates the envelope shape against the v1.schema.json definitions and panics on mismatch.
2. Create `src/foundation/result-renderer.ts`:
   - `renderResult(result: CommandResult, opts: { json: boolean; noColor: boolean }): string` — returns the JSON string when `json` is true, or a human-readable string when false.
   - `renderError(error: CommandError, opts: { json: boolean; noColor: boolean }): string` — returns the JSON string to stderr when `json` is true, or a human-readable string when false.
   - When `--json` is true, stdout must contain exactly one JSON value with no ANSI codes, emojis, progress indicators, or decorative text.
3. Write focused Jasmine specs:
   - Round-trip serialization: construct every variant, serialize, parse, verify shape.
   - Schema validation: valid envelopes pass, invalid shapes (missing required field, wrong type, extra forbidden field) panic.
   - Additive compatibility: an envelope with an extra optional field validates.
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
- Additive-field compatibility: extra optional field validates
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
