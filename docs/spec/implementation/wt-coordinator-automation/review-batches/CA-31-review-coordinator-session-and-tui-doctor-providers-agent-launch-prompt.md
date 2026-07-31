# Agent Launch Prompt — Review Batch CA-31 — Coordinator, session, and TUI doctor providers

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](CA-31-review-coordinator-session-and-tui-doctor-providers.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Coordinator, session, and TUI doctor providers
- **Dependencies:** `LC-07`, `CA-13`, `CA-16`, `CA-19`–`CA-23`
- **Exclusive ownership/interface:** immutable injected diagnostic providers
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Coordinator/session/TUI checks; exact pass/warn/fail/skip; read-only; release only qualifies behavior
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-31-coordinator-session-and-tui-doctor-providers-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-31-coordinator-session-and-tui-doctor-providers-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
