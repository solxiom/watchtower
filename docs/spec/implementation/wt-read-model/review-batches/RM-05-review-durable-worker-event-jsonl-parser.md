# Review Batch RM-05 — Durable Worker-Event JSONL Parser

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/RM-05-durable-worker-event-jsonl-parser.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-05-durable-worker-event-jsonl-parser.md`

## Scope Verification

- [ ] `src/contracts/events.ts` with worker event types and compatibility matrix
- [ ] `src/foundation/JsonlParser.ts` with validated JSONL parser and bounded lookup

## Required Independent Proof

1. Derive the complete event-type/role compatibility matrix from the accepted
   schema/contracts and verify every permitted combination plus every forbidden
   role/type pairing.
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
