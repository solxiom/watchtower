# Agent Launch Prompt — Review Batch LC-02 — Pack acceptance, seal, and drift validation

## Mandatory direct dependencies

- [Shared Lane lifecycle agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](LC-02-review-pack-acceptance-seal-and-drift-validation.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Pack acceptance, seal, and drift validation
- **Dependencies:** `RM-01`, `RM-08`
- **Exclusive ownership/interface:** pack consumer foundation
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** JSON Schema; RFC 8785 seal reproduction; Git/file-set/drift reason matrix
- **Review report:** `.local/agent-reports/wt-lane-lifecycle/reviews/LC-02-pack-acceptance-seal-and-drift-validation-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-lane-lifecycle/reviews/corrections/LC-02-pack-acceptance-seal-and-drift-validation-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
