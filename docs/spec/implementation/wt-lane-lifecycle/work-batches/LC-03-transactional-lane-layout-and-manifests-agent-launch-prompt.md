# Agent Launch Prompt — Work Batch LC-03 — Transactional lane layout and manifests

## Mandatory direct dependencies

- [Shared Lane lifecycle agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](LC-03-transactional-lane-layout-and-manifests.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Transactional lane layout and manifests
- **Dependencies:** `LC-01`, `LC-02`, `RT-06`
- **Exclusive ownership/interface:** lane store foundation
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Adjacent staging; atomic commit point; failure at every write/fsync/rename stage
- **Implementation report:** `.local/agent-reports/wt-lane-lifecycle/LC-03-transactional-lane-layout-and-manifests.md`
- **Correction report pattern:** `.local/agent-reports/wt-lane-lifecycle/reviews/corrections/LC-03-transactional-lane-layout-and-manifests-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
