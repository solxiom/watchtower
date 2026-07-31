# Agent Launch Prompt — Work Batch RT-03 — Packaged runtime and distribution staging

## Mandatory direct dependencies

- [Shared Runtime distribution agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](RT-03-nvb-distribution-staging.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Packaged runtime and distribution staging
- **Dependencies:** `RT-02`, `RT-08`–`RT-10`, `DB-01`
- **Exclusive ownership/interface:** dist configuration and packaged aggregate validation
- **Implementer/reviewer floors:** R3 / R3
- **Mandatory proof:** Required dist including SQLite closure; executable preservation; reproducible validation; no source-link fallback
- **Implementation report:** `.local/agent-reports/wt-runtime-distribution/RT-03-nvb-distribution-staging.md`
- **Correction report pattern:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-03-nvb-distribution-staging-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
