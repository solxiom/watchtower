# Agent Launch Prompt — Work Batch CA-25 — Cycle, escalation, and specification-resolution commands

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](CA-25-cycle-escalation-and-specification-resolution-commands.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Cycle, escalation, and specification-resolution commands
- **Dependencies:** `CA-13`, `CA-14`, `CA-17`, `CA-26`–`CA-29`
- **Exclusive ownership/interface:** mutating command/help integration over accepted services
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Cycle/escalate/resolution dry-run purity; normal validator/executor only; no command-local authority
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-25-cycle-escalation-and-specification-resolution-commands.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-25-cycle-escalation-and-specification-resolution-commands-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
