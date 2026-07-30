# Batch RM-09 — Tmux, Watcher, Heartbeat, And Worker Observations

Status: ❌ Pending
Phase: Observations
Depends on: RM-04, RM-05 accepted

**Required implementor reasoning class:** `R3`
**Class rationale:** observation mechanics with no lifecycle authority. Presence reading is straightforward; the primary risk is scope-creep into lifecycle decisions.

## Objective

Provide qualified name reading. Detect stale heartbeats. Presence observation
only; never treat as lifecycle authority.

## Required Work

1. Create `src/foundation/observations.ts`: qualified-name reading for tmux
   sessions (`tmux list-sessions -F '#{session_name}'`), watcher presence,
   and worker sessions.
2. Create `src/foundation/heartbeat.ts`: heartbeat detection. Read heartbeat
   files, compare timestamps against a configurable threshold, classify as
   fresh, stale, or absent.
3. Worker-event reading: surface the latest valid worker event per role from
   the parsed JSONL stream (consume RM-05 parser).
4. Write focused specs: tmux session reading (with mock tmux binary), heartbeat
   staleness classification, worker-event reading from parsed events, no-mutation
   proof (zero filesystem writes).

## Expected Ownership

- `src/foundation/observations.ts`, `src/foundation/heartbeat.ts`
- Respective focused specs.

## Tests And Evidence

- Tmux session reading (mockable binary dependency).
- Heartbeat: fresh, stale (exceeds threshold), absent (no file).
- Worker events: latest event per role from parsed stream.
- No-mutation proof: after observation, no state files written, no cursors
  advanced, no heartbeat files touched.
- `nvb build` and `nvb test` pass.

## Review Procedure Highlights

1. Verify heartbeat staleness threshold is configurable.
2. Confirm observations never write state or advance cursors.
3. Trace worker-event reading through the RM-05 parser.
4. Verify tmux reading is mockable for tests.

## Completion And Handoff

Observations are accepted. RM-10 consumes observations for status display.
No observer implies lifecycle authority.
