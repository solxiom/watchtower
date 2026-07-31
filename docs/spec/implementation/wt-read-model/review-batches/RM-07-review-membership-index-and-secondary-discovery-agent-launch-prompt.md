# Agent Launch Prompt — Review Batch RM-07 — Membership index and secondary-repository discovery

## Mandatory direct dependencies

- [Shared Read model agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](RM-07-review-membership-index-and-secondary-discovery.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Membership index and secondary-repository discovery
- **Dependencies:** `RM-03`, `RM-06`
- **Exclusive ownership/interface:** membership/discovery foundation
- **Implementer/reviewer floors:** R4 / R4
- **Mandatory proof:** Advisory validation; stale entries ignored/reported; reads never repair
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-07-membership-index-and-secondary-discovery-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-07-membership-index-and-secondary-discovery-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
