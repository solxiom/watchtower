# Agent Launch Prompt — Review Batch LC-08 — Lifecycle integration and scaffold removal

## Mandatory direct dependencies

- [Shared Lane lifecycle agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](LC-08-review-lifecycle-integration-and-scaffold-removal.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Lifecycle integration and scaffold removal
- **Dependencies:** `LC-10`, `RM-10`, `RM-12`
- **Exclusive ownership/interface:** end-to-end specs, help registry
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Init→status→watch/doctor fixture; rollback proof; remove all hello artifacts safely
- **Review report:** `.local/agent-reports/wt-lane-lifecycle/reviews/LC-08-lifecycle-integration-and-scaffold-removal-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-lane-lifecycle/reviews/corrections/LC-08-lifecycle-integration-and-scaffold-removal-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
