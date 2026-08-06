# Agent Launch Prompt — Review Batch RT-08 — Nirvana dependency closure and isolated install harness

## Mandatory direct dependencies

- [Shared Runtime distribution agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](RT-08-review-nirvana-dependency-closure-and-isolated-install-harness.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Nirvana dependency closure and isolated install harness
- **Dependencies:** `RM-01`
- **Exclusive ownership/interface:** exact dependency manifest, packed-artifact fixture, install verifier
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Complete transitive closure; fresh-prefix install; no wildcard, E404, local path, or source/ecosystem symlink

Before issuing a closure verdict, run canonical `nvb dist` under `sudo -u kavan -i` with the pinned Node/npm. A passing dist proves the selected Nirvana closure works. A rebuild of the same pinned ecosystem version may change source or packed-artifact bytes; do not reject or block an unrelated batch on the old `DIGEST_MISMATCH` alone. Compare package identity and dependency graph, and treat the generated manifest digests as authoritative for that build.
- **Review report:** `.local/agent-reports/wt-runtime-distribution/reviews/RT-08-nirvana-dependency-closure-and-isolated-install-harness-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-08-nirvana-dependency-closure-and-isolated-install-harness-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
