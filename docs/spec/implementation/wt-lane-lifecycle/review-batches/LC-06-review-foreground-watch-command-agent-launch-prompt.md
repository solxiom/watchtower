# Agent Launch Prompt — Review Batch LC-06 — Foreground `watch` command

## Mandatory direct dependencies

- [Shared Lane lifecycle agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete independent review method and is not optional.
- [Exact review brief](LC-06-review-foreground-watch-command.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Foreground `watch` command
- **Dependencies:** `LC-09`, `RT-07`
- **Exclusive ownership/interface:** watch command/runtime adapter
- **Implementer/reviewer floors:** R4 / R4
- **Mandatory proof:** Preflight; exec behavior; stdout and Ctrl-C compatibility; no daemonization
- **Review report:** `.local/agent-reports/wt-lane-lifecycle/reviews/LC-06-foreground-watch-command-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-lane-lifecycle/reviews/corrections/LC-06-foreground-watch-command-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before judging; preserve unrelated work and inspect source rather than trusting reports. Do not repair implementation. Reproduce all evidence, write the complete engineering matrix, and emit exactly one durable verdict. Only on full acceptance may the reviewer create the acceptance commit; publication remains separate.
