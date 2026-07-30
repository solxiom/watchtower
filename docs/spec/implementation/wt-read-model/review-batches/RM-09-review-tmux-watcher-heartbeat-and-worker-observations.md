# Review Batch RM-09 — Tmux, Watcher, Heartbeat, And Worker Observations

Status: ⏳ Awaiting review
Reasoning: `R3`
Paired work brief: `work-batches/RM-09-tmux-watcher-heartbeat-and-worker-observations.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-09-tmux-watcher-heartbeat-and-worker-observations.md`

## Scope Verification

- [ ] `src/foundation/observations.ts` with tmux, watcher, and worker qualified-name reading
- [ ] `src/foundation/heartbeat.ts` with heartbeat staleness detection

## Required Independent Proof

1. **Tmux session reading**: Verify qualified tmux session names are read correctly using `tmux list-sessions -F '#{session_name}'`. Test with mock tmux binary returning known session names. Verify parsing handles zero sessions, one session, and multiple sessions.
2. **Heartbeat — fresh**: Create a heartbeat file with a timestamp within the configured threshold. Verify classification is `fresh`.
3. **Heartbeat — stale**: Create a heartbeat file with a timestamp exceeding the configured threshold. Verify classification is `stale` and the staleness reason includes the last heartbeat time.
4. **Heartbeat — absent**: Verify that when no heartbeat file exists, classification is `absent`.
5. **Heartbeat — configurable threshold**: Verify the staleness threshold is configurable. Test with a short threshold (e.g., 5 seconds) and a long threshold (e.g., 300 seconds) and confirm classification changes accordingly.
6. **Worker-event reading**: From a parsed JSONL stream (consuming the RM-05 parser), verify the latest valid worker event per role (implementer, reviewer) is surfaced correctly.
7. **No-mutation proof**: After running every observation function, verify that no state files are written, no event cursors are advanced, and no heartbeat files are created or modified. Compute a directory hash before and after all observations.
8. **Presence not authority**: Verify that no observation function infers lifecycle status, worker health, or automation decisions from presence data. Observations expose raw facts only.
9. Run `nvb build` and `nvb test` independently.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. Inspect every observation function
independently. Verify the tmux binary dependency is mockable for tests. Confirm
no state mutation occurs during any observation. Verify heartbeat classification
is based solely on timestamps and the configured threshold.

## Structural And Module-Size Acceptance

- Verify `observations.ts` and `heartbeat.ts` are within the appropriate size bands.
- Confirm no `helpers`, `utils`, `common`, or `misc` modules.
- Verify clear separation between tmux observations, watcher observations, and
  worker-event reading.

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
structural verification results, line-count verification, no-mutation proof
(before/after directory hash), tracker/roadmap sync status, and the acceptance
or rejection decision.

## Acceptance Gate

- Tmux session reading returns correct qualified session names.
- Heartbeat classification correctly handles fresh, stale, and absent states.
- Heartbeat staleness threshold is configurable.
- Worker-event reading consumes the RM-05 parser correctly.
- No state files written, cursors advanced, or heartbeat files modified during
  any observation.
- No observation function implies lifecycle authority.
- Build and tests pass independently.

## Reject Conditions

- Any observation function writes state or advances cursors.
- Heartbeat classification is hardcoded rather than configurable.
- Observation function infers lifecycle status from presence data.
- Tmux binary dependency is not mockable for tests.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
