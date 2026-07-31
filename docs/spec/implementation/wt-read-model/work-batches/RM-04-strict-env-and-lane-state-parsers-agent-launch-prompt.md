# Agent Launch Prompt — Work Batch RM-04 — Strict env and lane-state parsers

## Mandatory direct dependencies

- [Shared Read model agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](RM-04-strict-env-and-lane-state-parsers.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Strict env and lane-state parsers
- **Dependencies:** `RM-01`
- **Exclusive ownership/interface:** parser foundation
- **Implementer/reviewer floors:** R4 / R4
- **Mandatory proof:** Accepted scalar grammar; malicious shell corpus never executes; unknown-key preservation
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-04-strict-env-and-lane-state-parsers.md`
- **Correction report pattern:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-04-strict-env-and-lane-state-parsers-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
