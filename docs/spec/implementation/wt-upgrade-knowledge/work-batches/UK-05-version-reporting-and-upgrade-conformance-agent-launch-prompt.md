# Agent Launch Prompt — Work Batch UK-05 — Version reporting and upgrade conformance

## Mandatory direct dependencies

- [Shared Upgrade and knowledge agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](UK-05-version-reporting-and-upgrade-conformance.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Version reporting and upgrade conformance
- **Dependencies:** `UK-03`, `UK-04`
- **Exclusive ownership/interface:** version command/help/integration
- **Implementer/reviewer floors:** R3 / R4
- **Mandatory proof:** CLI/runtime/knowledge/schema report; two-version fixtures; collision and failed migration
- **Implementation report:** `.local/agent-reports/wt-upgrade-knowledge/UK-05-version-reporting-and-upgrade-conformance.md`
- **Correction report pattern:** `.local/agent-reports/wt-upgrade-knowledge/reviews/corrections/UK-05-version-reporting-and-upgrade-conformance-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
