# Agent Launch Prompt — Review Batch RM-01 — Contract kernel, error taxonomy, and source architecture gates

## Mandatory direct dependencies

- [Shared Read model agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](RM-01-review-contract-kernel-and-error-taxonomy.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Contract kernel, error taxonomy, and source architecture gates
- **Dependencies:** —
- **Exclusive ownership/interface:** `src/contracts/`, contract and architecture test helpers
- **Implementer/reviewer floors:** R4 / R4
- **Mandatory proof:** Versioned IDs/types; exit-code mapping; exhaustive error fixtures; automated engineering-standard hard rejects
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-01-contract-kernel-and-error-taxonomy-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-01-contract-kernel-and-error-taxonomy-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
