# Agent Launch Prompt — Review Batch CA-12 — Acceptance and Git publication handler

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](CA-12-review-acceptance-and-git-publication-adapter.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Acceptance and Git publication handler
- **Dependencies:** `RM-08`, `CA-10`
- **Exclusive ownership/interface:** focused TaskHandler and Git leaf/verification
- **Implementer/reviewer floors:** R4 / R4
- **Mandatory proof:** Reviewer-session ownership; commit-set validation; partial push recovery; Nirvana Git API audit
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-12-acceptance-and-git-publication-adapter-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-12-acceptance-and-git-publication-adapter-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
