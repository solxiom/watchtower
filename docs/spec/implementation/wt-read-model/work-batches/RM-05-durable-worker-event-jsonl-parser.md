# Batch RM-05 — Durable Worker-Event JSONL Parser

Status: ❌ Pending
Phase: Event contracts
Depends on: RM-01 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** event parsing with malformation handling and role/event compatibility matrices; wrong parser silently drops or misinterprets lifecycle events.

## Objective

Parse worker-event JSONL. Validate role/event compatibility. Handle malformed/
partial lines. Provide bounded latest-N lookup.

## Required Work

1. Create `src/contracts/events.ts`: durable worker-event types —
   `WorkerEventRecord` with `id`, `at`, `event`, `role`, `batch`, `session`,
   and optional `commits` map. Define `WorkerEventRole` (`implementer`,
   `reviewer`) and `WorkerEventType` (`handoff`, `blocked`, `accept`, `reject`).
   Define role/event compatibility matrix.
2. Create `src/foundation/jsonl-parser.ts`: validated JSONL parser.
   Parse each line as a JSON record. Validate against the durable event schema.
   Handle malformed JSON (parse failure → skip with line-number warning).
   Handle partial final line (no trailing newline, incomplete JSON → skip with
   corruption warning). Handle unknown event types (preserve, warn). Provide
   `latest(role: WorkerEventRole, n: number): WorkerEventRecord[]` for bounded
   lookup.
3. Write focused specs: valid record parsing, role/event compatibility,
   malformed JSON fixtures, partial-line fixtures, unknown event type warnings,
   bounded latest-10 and latest-100 lookup with stable ordering.

## Expected Ownership

- `src/contracts/events.ts` and its focused specs.
- `src/foundation/jsonl-parser.ts` and its focused specs.

## Tests And Evidence

- Valid record parsing for all four event types and both roles.
- Role/event compatibility: implementer cannot emit `accept`, reviewer cannot
  emit `handoff` (warn but do not reject).
- Malformed JSON: parse failure → skip with line-number warning.
- Partial final line: incomplete JSON → skip with corruption warning.
- Unknown event type: preserved in output with warning.
- Bounded latest-10 and latest-100: correct count, stable ordering.
- Empty file, malformed-only file, very large file handling.
- `nvb build` and `nvb test` pass.

## What Must Not Change

- Do not silently drop malformed records without diagnostics.
- Do not modify the event stream; read only.
- Do not advance the watcher cursor or write event state.

## Review Procedure Highlights

1. Verify every malformation class produces the correct diagnostic.
2. Confirm role/event compatibility warnings do not reject valid records.
3. Trace bounded latest-N ordering for correctness.
4. Confirm partial final line is handled per spec (ignored for reads, reported
   as corruption, blocks mutation until explicit rebuild).

## Required Reasoning Posture

Per the quality rules. Enumerate every event type, role, malformation class.
Prove that happy-path parsing does not hide a dropped record or misordered
latest-N result. Build adversarial malformation fixtures.

## Structural And Module-Size Acceptance

Per quality rules: 160/220/300/350/400-line bands. No `helpers`/`utils` bags.

## Required Review Packet

Include: changed files, line counts, responsibility inventories, proof commands,
git status, `.local/` not staged.

## Completion And Handoff

The JSONL parser is accepted. RM-09 consumes event parsing for worker
observations. Every consumer gets validated records with stable bounded
latest-N lookup. Malformed data produces diagnostics without affecting valid
record processing.
