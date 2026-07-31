# Agent Launch Prompt — Work Batch CA-06 — Provider-neutral endpoint eligibility and isolation core

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](CA-06-endpoint-adapter-eligibility-and-isolation.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Provider-neutral endpoint eligibility and isolation core
- **Dependencies:** `RT-05`, `CA-05`
- **Exclusive ownership/interface:** provider-neutral contracts, eligibility, fingerprints, pools
- **Implementer/reviewer floors:** R4 / R4
- **Mandatory proof:** Unattended/advisory/skill-only classification; hard eligibility; drift invalidation/shared pools; no concrete CLI adapter
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-06-endpoint-adapter-eligibility-and-isolation.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-06-endpoint-adapter-eligibility-and-isolation-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
