# Agent Launch Prompt — Review Batch CA-26 — Session proposals, confirmation, revalidation, and apply

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](CA-26-review-session-proposals-confirmation-revalidation-and-apply.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Session proposals, confirmation, revalidation, and apply
- **Dependencies:** `CA-09`, `CA-10`, `CA-15`–`CA-17`
- **Exclusive ownership/interface:** proposal lifecycle/effect bridge
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Explicit confirmation; current-state validation; stale/illegal refusal; sole executor handoff
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-26-session-proposals-confirmation-revalidation-and-apply-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-26-session-proposals-confirmation-revalidation-and-apply-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
