# Agent Launch Prompt — Review Batch REL-03 — Security, ownership, performance, package, and endpoint qualification

## Mandatory direct dependencies

- [Shared V1 release agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](REL-03-review-security-ownership-performance-and-package-qualification.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Security, ownership, performance, package, and endpoint qualification
- **Dependencies:** `REL-01`, `REL-02`
- **Exclusive ownership/interface:** release/security/performance evidence
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Traversal/config/permission suite; bounded discovery/status; manifest/global install proof; real OpenCode and conditional Hermes adapter matrix
- **Review report:** `.local/agent-reports/watchtower-release/reviews/REL-03-security-ownership-performance-and-package-qualification-review.md`
- **Correction report pattern:** `.local/agent-reports/watchtower-release/reviews/corrections/REL-03-security-ownership-performance-and-package-qualification-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-v1-release/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
