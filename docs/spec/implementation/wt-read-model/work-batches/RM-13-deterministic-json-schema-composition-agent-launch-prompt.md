# Agent Launch Prompt — Work Batch RM-13 — Deterministic JSON Schema composition

## Mandatory direct dependencies

- [Shared Read model agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](RM-13-deterministic-json-schema-composition.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Deterministic JSON Schema composition
- **Dependencies:** `RM-01`
- **Exclusive ownership/interface:** schema fragments, composer, aggregate stale gate
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Duplicate `$defs`, unresolved `$ref`, root-conflict rejection; byte-identical regeneration
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-13-deterministic-json-schema-composition.md`
- **Correction report pattern:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-13-deterministic-json-schema-composition-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
