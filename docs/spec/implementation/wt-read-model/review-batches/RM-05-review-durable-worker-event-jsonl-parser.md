# Review Batch RM-05 — Durable worker-event JSONL parser

## Synchronized batch execution matrix

- **Accepted-map title:** Durable worker-event JSONL parser
- **Dependencies:** `RM-01`
- **Exclusive ownership/interface:** event contracts/foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Role/event compatibility; malformed/partial-line handling; bounded latest lookup
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-05-durable-worker-event-jsonl-parser.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-05-durable-worker-event-jsonl-parser-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-05-durable-worker-event-jsonl-parser-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **event contracts/foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/reviews/RM-05-durable-worker-event-jsonl-parser-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Role/event compatibility; malformed/partial-line handling; bounded latest lookup**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **event contracts/foundation** and **Role/event compatibility; malformed/partial-line handling; bounded latest lookup**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-read-model/reviews/corrections/RM-05-durable-worker-event-jsonl-parser-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-read-model/reviews/RM-05-durable-worker-event-jsonl-parser-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
