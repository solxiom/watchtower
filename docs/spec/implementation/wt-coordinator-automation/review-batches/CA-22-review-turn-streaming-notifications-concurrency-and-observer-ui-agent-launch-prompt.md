# Agent Launch Prompt — Review Batch CA-22 — Turn streaming, notifications, concurrency, and observer UI

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](CA-22-review-turn-streaming-notifications-concurrency-and-observer-ui.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Turn streaming, notifications, concurrency, and observer UI
- **Dependencies:** `CA-17`, `CA-20`, `CA-21`, `CA-26`, `CA-27`
- **Exclusive ownership/interface:** turn/event reducers and attachment controller
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Provisional validation; live edge; stale confirmation invalidation; cross-attachment contention/wait; observer restrictions; priority-preserving coalesced refresh
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-22-turn-streaming-notifications-concurrency-and-observer-ui-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-22-turn-streaming-notifications-concurrency-and-observer-ui-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
