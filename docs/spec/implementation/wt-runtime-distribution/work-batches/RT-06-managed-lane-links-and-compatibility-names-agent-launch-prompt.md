# Agent Launch Prompt — Work Batch RT-06 — Managed lane links, task profiles, and compatibility names

## Mandatory direct dependencies

- [Shared Runtime distribution agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](RT-06-managed-lane-links-and-compatibility-names.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Managed lane links, task profiles, and compatibility names
- **Dependencies:** `RT-04`, `RT-05`
- **Exclusive ownership/interface:** managed-asset/task-profile foundation
- **Implementer/reviewer floors:** R4 / R4
- **Mandatory proof:** Manifest-only ownership; task catalog/profile pin; project `nvb.json` unchanged; link targets/checksums; collision/path-escape refusal
- **Implementation report:** `.local/agent-reports/wt-runtime-distribution/RT-06-managed-lane-links-and-compatibility-names.md`
- **Correction report pattern:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-06-managed-lane-links-and-compatibility-names-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
