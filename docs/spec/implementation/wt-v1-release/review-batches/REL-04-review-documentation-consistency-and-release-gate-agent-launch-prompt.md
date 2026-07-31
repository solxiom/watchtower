# Agent Launch Prompt — Review Batch REL-04 — Documentation consistency and release gate

## Mandatory direct dependencies

- [Shared V1 release agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](REL-04-review-documentation-consistency-and-release-gate.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Documentation consistency and release gate
- **Dependencies:** `REL-01`–`REL-03`
- **Exclusive ownership/interface:** help/docs/release notes
- **Implementer/reviewer floors:** R3 / R4
- **Mandatory proof:** Every v1 acceptance item traced; no scaffold/generated artifacts; final package version/readme
- **Review report:** `.local/agent-reports/watchtower-release/reviews/REL-04-documentation-consistency-and-release-gate-review.md`
- **Correction report pattern:** `.local/agent-reports/watchtower-release/reviews/corrections/REL-04-documentation-consistency-and-release-gate-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-v1-release/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
