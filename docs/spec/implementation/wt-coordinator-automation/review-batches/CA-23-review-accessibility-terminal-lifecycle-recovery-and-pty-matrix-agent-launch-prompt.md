# Agent Launch Prompt — Review Batch CA-23 — Accessibility, terminal lifecycle, recovery, and PTY matrix

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](CA-23-review-accessibility-terminal-lifecycle-recovery-and-pty-matrix.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Accessibility, terminal lifecycle, recovery, and PTY matrix
- **Dependencies:** `CA-18`–`CA-22`
- **Exclusive ownership/interface:** accessibility/restoration/test adapters
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Exact promoted matrix; no-color/high-contrast/reduced motion; signals/suspend/crash restore; preference/cache migration; semantic visual catalog; emulator/Unicode/resize fixtures
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
