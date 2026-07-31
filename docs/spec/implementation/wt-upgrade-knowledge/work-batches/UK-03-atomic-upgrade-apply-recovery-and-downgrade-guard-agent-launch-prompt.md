# Agent Launch Prompt — Work Batch UK-03 — Atomic upgrade apply, recovery, and downgrade guard

## Mandatory direct dependencies

- [Shared Upgrade and knowledge agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Atomic upgrade apply, recovery, and downgrade guard
- **Dependencies:** `UK-02`, `RT-04`, `RT-06`
- **Exclusive ownership/interface:** install pointer/store
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Manifest-last switch; crash recovery; old runtime remains usable; guarded downgrade
- **Implementation report:** `.local/agent-reports/wt-upgrade-knowledge/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard.md`
- **Correction report pattern:** `.local/agent-reports/wt-upgrade-knowledge/reviews/corrections/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
