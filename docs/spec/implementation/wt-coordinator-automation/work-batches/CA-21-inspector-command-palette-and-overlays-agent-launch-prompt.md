# Agent Launch Prompt — Work Batch CA-21 — Inspector views, command palette, and overlays

## Mandatory direct dependencies

- [Shared Coordinator automation agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](CA-21-inspector-command-palette-and-overlays.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Inspector views, command palette, and overlays
- **Dependencies:** `CA-14`, `CA-17`, `CA-19`, `CA-26`, `CA-27`
- **Exclusive ownership/interface:** inspector/action/overlay components
- **Implementer/reviewer floors:** R4 / R4
- **Mandatory proof:** All bounded inspector states; projection-only agent/allocation view; bounded search/attention; canonical action parity; confirmation, diagnostics, and details overlays
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-21-inspector-command-palette-and-overlays.md`
- **Correction report pattern:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-21-inspector-command-palette-and-overlays-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
