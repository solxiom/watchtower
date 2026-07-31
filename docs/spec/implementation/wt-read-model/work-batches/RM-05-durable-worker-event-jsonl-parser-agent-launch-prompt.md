# Agent Launch Prompt — Work Batch RM-05 — Durable worker-event JSONL parser

## Mandatory direct dependencies

- [Shared Read model agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](RM-05-durable-worker-event-jsonl-parser.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Durable worker-event JSONL parser
- **Dependencies:** `RM-01`
- **Exclusive ownership/interface:** event contracts/foundation
- **Implementer/reviewer floors:** R4 / R4
- **Mandatory proof:** Role/event compatibility; malformed/partial-line handling; bounded latest lookup
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-05-durable-worker-event-jsonl-parser.md`
- **Correction report pattern:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-05-durable-worker-event-jsonl-parser-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
