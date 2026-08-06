# Agent Launch Prompt — Work Batch RT-08 — Nirvana dependency closure and isolated install harness

## Mandatory direct dependencies

- [Shared Runtime distribution agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](RT-08-nirvana-dependency-closure-and-isolated-install-harness.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Nirvana dependency closure and isolated install harness
- **Dependencies:** `RM-01`
- **Exclusive ownership/interface:** exact dependency manifest, packed-artifact fixture, install verifier
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Complete transitive closure; fresh-prefix install; no wildcard, E404, local path, or source/ecosystem symlink
- **Implementation report:** `.local/agent-reports/wt-runtime-distribution/RT-08-nirvana-dependency-closure-and-isolated-install-harness.md`
- **Correction report pattern:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-08-nirvana-dependency-closure-and-isolated-install-harness-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.

### Rebuild classification rule

Run canonical `nvb dist` under `sudo -u kavan -i` with the pinned Node/npm before classifying a closure failure. A passing dist proves the selected Nirvana package closure works. Rebuilding the same pinned ecosystem version may change source or packed-artifact bytes; compare the generated closure to the accepted manifest by ecosystem/package identity and dependency graph, then use the generated manifest digests. Do not block an unrelated batch or blame Nirvana solely for the old `DIGEST_MISMATCH`.
