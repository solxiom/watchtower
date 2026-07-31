# Agent Launch Prompt — Review Batch CA-25 — Cycle, escalation, and specification-resolution commands

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](CA-25-review-cycle-escalation-and-specification-resolution-commands.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Cycle, escalation, and specification-resolution commands
- **Dependencies:** `CA-13`, `CA-14`, `CA-17`, `CA-26`–`CA-29`
- **Exclusive ownership/interface:** mutating command/help integration over accepted services
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Cycle/escalate/resolution dry-run purity; normal validator/executor only; no command-local authority
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-25-cycle-escalation-and-specification-resolution-commands-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-25-cycle-escalation-and-specification-resolution-commands-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
