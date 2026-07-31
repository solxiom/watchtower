# Batch RM-05 — Durable worker-event JSONL parser

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
2. Create `src/foundation/JsonlParser.ts`: validated JSONL parser.
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
- `src/foundation/JsonlParser.ts` and its focused specs.

## Tests And Evidence

- Valid record parsing for every event-type/role combination permitted by the
  accepted schema/contracts, plus rejection of every forbidden pairing.
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

# Agent Launch Prompt — Work Batch RT-05

## Required Review Packet

Include: changed files, line counts, responsibility inventories, proof commands,
git status, `.local/` not staged.

## Completion And Handoff

The JSONL parser is accepted. RM-09 consumes event parsing for worker
observations. Every consumer gets validated records with stable bounded
latest-N lookup. Malformed data produces diagnostics without affecting valid
record processing.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **event contracts/foundation**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/RM-05-durable-worker-event-jsonl-parser.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Role/event compatibility; malformed/partial-line handling; bounded latest lookup**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **event contracts/foundation** and **Role/event compatibility; malformed/partial-line handling; bounded latest lookup**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-read-model/RM-05-durable-worker-event-jsonl-parser.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
