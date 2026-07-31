# Agent Launch Prompt — Review Batch CA-15 — Operator-session persistence and lifecycle

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](CA-15-review-operator-session-persistence-and-lifecycle.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Operator-session persistence and lifecycle
- **Dependencies:** `CA-03`, `UK-02`
- **Exclusive ownership/interface:** session store/contracts
- **Implementer/reviewer floors:** R4 / R4
- **Mandatory proof:** Many sessions; one active turn each; immutable closed history; crash-safe journals
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-15-operator-session-persistence-and-lifecycle-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-15-operator-session-persistence-and-lifecycle-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
