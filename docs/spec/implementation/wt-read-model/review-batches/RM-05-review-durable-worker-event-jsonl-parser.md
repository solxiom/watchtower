# Review Batch RM-05 — Durable Worker-Event JSONL Parser

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/RM-05-durable-worker-event-jsonl-parser.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-05-durable-worker-event-jsonl-parser.md`

## Scope Verification

- [ ] `src/contracts/events.ts` with worker event types and compatibility matrix
- [ ] `src/foundation/jsonl-parser.ts` with validated JSONL parser and bounded lookup

## Required Independent Proof

1. Verify all four event types parse correctly with both roles.
2. Verify role/event compatibility: implementer `accept` → warning, reviewer `handoff` → warning. Records still included.
3. Malformed JSON fixtures: parse failure → skipped with line-number warning.
4. Partial final line: incomplete JSON → skipped with corruption warning.
5. Unknown event types: preserved with warning.
6. Bounded latest-N: correct count and ordering for latest-10 and latest-100.
7. Empty file → empty records, graceful handling.
8. Malformed-only file → zero records, warnings per line.
9. Mixed file (valid + malformed) → valid records preserved, malformed skipped with warnings.
10. Run `nvb build` and `nvb test` independently.

## Acceptance Gate

- All event types and roles parse correctly.
- All malformation classes produce correct diagnostics.
- Bounded lookup is stable and correctly ordered.
- Valid records never dropped alongside malformed ones.
- Build and tests pass independently.
