# Agent Launch Prompt — Review Batch CA-02 — SQLite index stores and bounded typed queries

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](CA-02-review-sqlite-index-stores-and-bounded-typed-queries.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** SQLite index stores and bounded typed queries
- **Dependencies:** `CA-01`
- **Exclusive ownership/interface:** index store/query foundation
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Indexed bounded reads; limits/cursors/truncation; no direct SQL; stale/missing/corrupt block
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-02-sqlite-index-stores-and-bounded-typed-queries-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-02-sqlite-index-stores-and-bounded-typed-queries-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
