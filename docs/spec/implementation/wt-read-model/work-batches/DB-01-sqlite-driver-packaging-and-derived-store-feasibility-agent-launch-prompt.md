# Agent Launch Prompt — Work Batch DB-01 — SQLite driver, packaging, and derived-store feasibility

## Mandatory direct dependencies

- [Shared Read model agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** SQLite driver, packaging, and derived-store feasibility
- **Dependencies:** `RM-01`
- **Exclusive ownership/interface:** storage interfaces, feasibility fixtures, ADR
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Node/NVB/dist/global install; parameterization; FK/integrity; busy/WAL/permissions; rebuild and semantic-root proof
- **Implementation report:** `.local/agent-reports/wt-read-model/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`
- **Correction report pattern:** `.local/agent-reports/wt-read-model/reviews/corrections/DB-01-sqlite-driver-packaging-and-derived-store-feasibility-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
