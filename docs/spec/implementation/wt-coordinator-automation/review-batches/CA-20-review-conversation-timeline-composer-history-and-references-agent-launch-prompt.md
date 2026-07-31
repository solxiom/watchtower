# Agent Launch Prompt — Review Batch CA-20 — Conversation timeline, composer, history, and references

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](CA-20-review-conversation-timeline-composer-history-and-references.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Conversation timeline, composer, history, and references
- **Dependencies:** `CA-16`, `CA-19`
- **Exclusive ownership/interface:** conversation/composer components
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Virtualized paging; multiline input; bounded draft recovery; paste; completion; index-bounded timeline search/reference pickers; scroll anchoring
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-20-conversation-timeline-composer-history-and-references-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-20-conversation-timeline-composer-history-and-references-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
