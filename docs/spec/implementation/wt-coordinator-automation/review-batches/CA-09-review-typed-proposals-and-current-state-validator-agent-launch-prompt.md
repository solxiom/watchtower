# Agent Launch Prompt — Review Batch CA-09 — Typed proposals and current-state validator

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](CA-09-review-typed-proposals-and-current-state-validator.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Typed proposals and current-state validator
- **Dependencies:** `CA-05`, `CA-07`, `CA-08`
- **Exclusive ownership/interface:** proposal contracts/validator
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** All 14 proposal types; specification-resolution authority/seal/independence checks; stale/illegal/invalid cases
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-09-typed-proposals-and-current-state-validator-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-09-typed-proposals-and-current-state-validator-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
