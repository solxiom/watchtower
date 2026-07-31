# Agent Launch Prompt — Work Batch CA-22 — Turn streaming, notifications, concurrency, and observer UI

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](CA-22-turn-streaming-notifications-concurrency-and-observer-ui.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Turn streaming, notifications, concurrency, and observer UI
- **Dependencies:** `CA-17`, `CA-20`, `CA-21`, `CA-26`, `CA-27`
- **Exclusive ownership/interface:** turn/event reducers and attachment controller
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Provisional validation; live edge; stale confirmation invalidation; cross-attachment contention/wait; observer restrictions; priority-preserving coalesced refresh
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-22-turn-streaming-notifications-concurrency-and-observer-ui.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-22-turn-streaming-notifications-concurrency-and-observer-ui-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
