# Agent Launch Prompt — Work Batch RM-12 — `status` command and read-only integration

## Mandatory direct dependencies

- [Shared Read model agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](RM-12-status-command-and-read-only-integration.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** `status` command and read-only integration
- **Dependencies:** `RM-02`, `RM-06`–`RM-11`
- **Exclusive ownership/interface:** status projection, command/help, integration specs
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Stable status schema; complete health/warning matrix; full read-only hash proof
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-12-status-command-and-read-only-integration.md`
- **Correction report pattern:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-12-status-command-and-read-only-integration-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
