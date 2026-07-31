# Agent Launch Prompt — Review Batch RT-05 — `LaneTaskRunner` and leaf invocation adapter

## Mandatory direct dependencies

- [Shared Runtime distribution agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](RT-05-review-central-runtime-invocation-adapter.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** `LaneTaskRunner` and leaf invocation adapter
- **Dependencies:** `RT-03`, `RT-04`, `RT-09`
- **Exclusive ownership/interface:** task/runtime adapters foundation
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Explicit pinned NVB target; allowlisted action→task map; typed events/results; argv-only leaves; environment/cwd/account/access validation; signal/exit forwarding; NVB API gap proof
- **Review report:** `.local/agent-reports/wt-runtime-distribution/reviews/RT-05-central-runtime-invocation-adapter-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-05-central-runtime-invocation-adapter-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
