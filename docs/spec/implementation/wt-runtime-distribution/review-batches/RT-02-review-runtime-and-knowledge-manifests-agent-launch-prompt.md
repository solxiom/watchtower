# Agent Launch Prompt — Review Batch RT-02 — Runtime and knowledge manifests

## Mandatory direct dependencies

- [Shared Runtime distribution agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](RT-02-review-runtime-and-knowledge-manifests.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Runtime and knowledge manifests
- **Dependencies:** `RT-01`, `RM-11`
- **Exclusive ownership/interface:** runtime/knowledge manifest contracts and validators
- **Implementer/reviewer floors:** R4 / R4
- **Mandatory proof:** Every asset/checksum/mode/action represented; missing/extra/checksum/mode rejection
- **Review report:** `.local/agent-reports/wt-runtime-distribution/reviews/RT-02-runtime-and-knowledge-manifests-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-02-runtime-and-knowledge-manifests-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
