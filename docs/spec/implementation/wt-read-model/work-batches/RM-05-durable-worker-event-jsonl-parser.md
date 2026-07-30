# Batch RM-05 — Durable Worker-Event JSONL Parser

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
