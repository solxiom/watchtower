# Agent Launch Prompt — Work Batch RM-05

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for event parsing and malformation handling`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent that
can load the complete brief/spec/source context, reason across event validation
matrices, and run the required proof.

You are assigned **implementation work batch RM-05** for the Watchtower v1
wt-read-model delivery lane.

This batch implements validated durable worker-event JSONL parsing with
malformation handling, role/event compatibility checks, and bounded latest-N
lookup.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/work-batches/RM-05-durable-worker-event-jsonl-parser.md`
2. `docs/spec/implementation/wt-read-model/work-batches/README.md`
3. `docs/spec/implementation/wt-read-model/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md` (especially §13 — State and event compatibility)
5. `docs/spec/v1-contracts.md` (especially §9 — Event, queue, cursor, and replay contract)
6. `docs/spec/schemas/v1.schema.json` (especially `$defs.durableEvent`)
7. `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
8. `docs/spec/implementation/wt-read-model/implementation-tracker.md`
9. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
10. the canonical source owners:
    - `src/contracts/events.ts` (create)
    - `src/foundation/jsonl-parser.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for event parsing and malformation handling`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

1. Build a dependency map from the specs to event types, validation rules,
   parser modules, and tests.
2. Inspect the current source and accepted RM-01 output.
3. Enumerate every event type, every role, every compatibility rule, and every
   malformation class.
4. Use counterexamples: a valid event followed by a malformed line — the valid
   event must still appear. A partial final line must not crash the parser.
   A missing required field must produce a diagnostic.
5. Build adversarial malformation fixtures: invalid JSON, truncated JSON,
   missing required fields, wrong types, unknown event types.

## Structural Design And Module-Size Gate

Per quality rules: 160/220/300/350/400-line bands. No `helpers`/`utils` bags.

## Your Mission

Implement durable worker-event JSONL parsing:

1. Create `src/contracts/events.ts`:
   - `WorkerEventRole` — `'implementer' | 'reviewer'`
   - `WorkerEventType` — `'handoff' | 'blocked' | 'accept' | 'reject'`
   - `WorkerEventRecord` — interface with `id: string`, `at: string` (ISO datetime), `event: WorkerEventType`, `role: WorkerEventRole`, `batch: string`, `session: string`, `commits?: Record<string, string>`
   - `roleEventCompatibility: Record<WorkerEventRole, WorkerEventType[]>` — implementer can emit `handoff`, `blocked`; reviewer can emit `accept`, `reject`, `blocked`
   - `validateEventCompatibility(record: WorkerEventRecord): string[]` — returns warnings for incompatible role/event combinations
2. Create `src/foundation/jsonl-parser.ts`:
   - `parseJsonlStream(content: string): JsonlParseResult` — parse a complete JSONL file. Returns `{ records: WorkerEventRecord[], warnings: JsonlWarning[] }` where warnings have line numbers and reasons.
   - Handle malformed JSON (parse failure) → skip record, add line-number warning.
   - Handle partial final line (no trailing newline, incomplete JSON) → skip, add corruption warning.
   - Handle unknown event type → preserve record, add warning.
   - Validate each record against the durable event schema (required fields, types).
   - `latest(records: WorkerEventRecord[], role: WorkerEventRole, n: number): WorkerEventRecord[]` — return the N most recent valid records for a role, in stable reverse-chronological order.
3. Write focused Jasmine specs:
   - Valid records: all four event types, both roles, with and without `commits`.
   - Role/event compatibility: implementer `accept` → warning; reviewer `handoff` → warning. Records still included.
   - Malformed JSON: `not json`, `{broken`, single-quoted values → skipped with line-number warning.
   - Partial final line: empty final line OK; incomplete JSON (no closing brace) → skipped with corruption warning.
   - Unknown event type: `{... "event": "unknown-event" ...}` → preserved with warning.
   - Bounded latest-N: latest(10) returns 10 records max; latest(100) returns 100 records max; correct ordering.
   - Empty file → empty records, no warnings (except possibly final-partial warning for zero-length file handled gracefully).
   - Malformed-only file → zero records, warnings for each malformed line.

## What You Must Not Do

- Do not silently drop valid records alongside malformed ones.
- Do not advance the watcher cursor or write any event state.
- Do not import command classes.
- Do not commit.

## Required Proof

- Valid record parsing: all event types, both roles.
- Malformed JSON: skipped with line-number diagnostic.
- Partial final line: skipped with corruption warning.
- Unknown event type: preserved with warning.
- Bounded latest-10 and latest-100: correct count and ordering.
- Empty and malformed-only file handling.
- `nvb build` and `nvb test` pass.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep `implementation-tracker.md` and `implementation-roadmap.md` updated.

## Local Artifact Git Rule

Write `.local/...` reports on disk only; never stage or commit.

## Non-Negotiable Rules

- every malformation class must produce a line-numbered diagnostic
- valid records must never be dropped alongside malformed ones
- bounded latest-N must be stable and correctly ordered
- do not write event state or advance cursors
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write to: `.local/agent-reports/wt-read-model/RM-05-durable-worker-event-jsonl-parser.md`

Include: documents studied, exact files changed, line counts, proof commands
and outcomes, final `git status --short`, proposed commit message.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the event type vocabulary, role/event compatibility matrix, JSONL parser
API (`parseJsonlStream`, `latest`), and malformation handling behavior. RM-09
consumes the JSONL parser for worker observations. The parser is read-only and
never advances watcher cursors.
