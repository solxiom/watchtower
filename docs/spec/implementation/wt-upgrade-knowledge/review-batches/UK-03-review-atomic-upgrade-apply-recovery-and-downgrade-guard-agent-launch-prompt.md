# Agent Launch Prompt — Review Batch UK-03 — Atomic upgrade apply, recovery, and downgrade guard

## Mandatory direct dependencies

- [Shared Upgrade and knowledge agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](UK-03-review-atomic-upgrade-apply-recovery-and-downgrade-guard.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Atomic upgrade apply, recovery, and downgrade guard
- **Dependencies:** `UK-02`, `RT-04`, `RT-06`
- **Exclusive ownership/interface:** install pointer/store
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Manifest-last switch; crash recovery; old runtime remains usable; guarded downgrade
- **Review report:** `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-upgrade-knowledge/reviews/corrections/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
