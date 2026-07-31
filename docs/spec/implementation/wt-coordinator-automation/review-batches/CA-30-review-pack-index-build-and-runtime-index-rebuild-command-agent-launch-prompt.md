# Agent Launch Prompt — Review Batch CA-30 — Pack-index build and runtime-index rebuild command

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](CA-30-review-pack-index-build-and-runtime-index-rebuild-command.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Pack-index build and runtime-index rebuild command
- **Dependencies:** `CA-01`, `CA-10`, `CA-13`, `CA-14`, `RT-05`, `RT-09`
- **Exclusive ownership/interface:** public command/help, proposal/effect integration, allowlisted NVB task
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** `index build [--runtime]`; dry-run purity; staged compile/rebuild; current-state validation; no command-local mutation
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-30-pack-index-build-and-runtime-index-rebuild-command-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-30-pack-index-build-and-runtime-index-rebuild-command-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
