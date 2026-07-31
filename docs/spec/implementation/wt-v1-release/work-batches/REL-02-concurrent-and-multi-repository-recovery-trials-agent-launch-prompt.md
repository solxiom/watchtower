# Agent Launch Prompt — Work Batch REL-02 — Concurrent and multi-repository recovery trials

## Mandatory direct dependencies

- [Shared V1 release agent launch contract](../agent-launch-contract.md) — read in full; it supplies the complete implementation method and is not optional.
- [Exact work brief](REL-02-concurrent-and-multi-repository-recovery-trials.md) — read in full.
- Accepted implementation map, normative specifications, pack quality rules, current source, accepted predecessor evidence, tracker, and exact checkout.

## Complete batch-specific scope

- **Title:** Concurrent and multi-repository recovery trials
- **Dependencies:** `REL-01`
- **Exclusive ownership/interface:** system acceptance fixtures
- **Implementer/reviewer floors:** R5 / R5
- **Mandatory proof:** Two isolated lanes; multi-repo commit set; shared-write refusal; partial push recovery
- **Implementation report:** `.local/agent-reports/watchtower-release/REL-02-concurrent-and-multi-repository-recovery-trials.md`
- **Correction report pattern:** `.local/agent-reports/watchtower-release/reviews/corrections/REL-02-concurrent-and-multi-repository-recovery-trials-correction-<NN>.md`
- **Tracker:** `docs/spec/implementation/wt-v1-release/implementation-tracker.md`
- **Host control:** use `sudo -u kavan -i` when needed; all edits end `kavan:kavan`; never stage forbidden local/generated paths.

## Batch-specific execution and handoff

Apply the shared method to the exact ownership and proof above. Enumerate concrete applicable failure cases and proof commands before editing; preserve unrelated work and inspect source rather than trusting reports. Synchronize owned public artifacts and write exact evidence, size/cohesion inventory, ownership and Git status. Do not commit or issue a verdict. Emit durable handoff only when every gate passes; otherwise route the exact blocker/correction without abandoning this lineage.
