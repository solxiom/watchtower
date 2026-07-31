# Agent Launch Prompt — Review Batch RT-07 — Packaged watcher and task-runtime smoke proof

## Mandatory direct dependencies

- [Shared Runtime distribution agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](RT-07-review-packaged-watcher-and-runtime-smoke-proof.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Packaged watcher and task-runtime smoke proof
- **Dependencies:** `RT-03`, `RT-05`, `RT-06`
- **Exclusive ownership/interface:** integration fixtures
- **Implementer/reviewer floors:** R3 / R3
- **Mandatory proof:** Relocated package works; catalog/profile escape rejected; structured task result; wake stdout/signal behavior; worker accounts read but cannot write
- **Review report:** `.local/agent-reports/wt-runtime-distribution/reviews/RT-07-packaged-watcher-and-runtime-smoke-proof-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-07-packaged-watcher-and-runtime-smoke-proof-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
