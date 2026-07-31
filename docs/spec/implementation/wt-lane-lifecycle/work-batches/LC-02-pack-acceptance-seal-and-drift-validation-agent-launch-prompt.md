# Agent Launch Prompt — Work Batch LC-02 — Pack acceptance, seal, and drift validation

## Mandatory direct dependencies

- [Shared Lane lifecycle agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](LC-02-pack-acceptance-seal-and-drift-validation.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Pack acceptance, seal, and drift validation
- **Dependencies:** `RM-01`, `RM-08`
- **Exclusive ownership/interface:** pack consumer foundation
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** JSON Schema; RFC 8785 seal reproduction; Git/file-set/drift reason matrix
- **Implementation report:** `.local/agent-reports/wt-lane-lifecycle/LC-02-pack-acceptance-seal-and-drift-validation.md`
- **Correction report pattern:** `.local/agent-reports/wt-lane-lifecycle/reviews/corrections/LC-02-pack-acceptance-seal-and-drift-validation-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
