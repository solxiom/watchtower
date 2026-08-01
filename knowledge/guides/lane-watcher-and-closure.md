# Lane watcher and closure

How to run the coordinator loop, interpret wakes, and **shut down cleanly**
when the lane completes.

---

## Starting the loop

Prefer Cursor background shell with pattern monitoring:

```bash
./start-coordinator-loop.sh
# Monitor stdout: AGENT_LOOP_WAKE_lane
```

**Required:** configure Cursor background shell `notify_on_output.pattern =
AGENT_LOOP_WAKE_lane`. Without it, voice (Piper) may speak but the coordinator
chat will not auto-wake. See [voice-vs-wake-and-piper.md](voice-vs-wake-and-piper.md).

Do **not** rely on `nohup` alone — Cursor cannot wake on hidden logs.

`auto_nudge=disabled` is intentional: the watcher reports status; the
**coordinator** nudges via `codex-tmux-send.sh`.

---

## Reading loop status

```bash
cat .local/agent-reports/<lane-slug>/coordinator/loop-status.txt
```

Fields that matter:

| Field | Meaning |
|-------|---------|
| `lane_phase` | `implement`, `review`, `complete` |
| `active_batch` | Current spec batch slug or `none` |
| `implementer_status` / `reviewer_status` | `working`, `idle`, `missing`, `closed` |
| `last_wake_detail` | Why the last wake fired |

---

## False URGENT after lane complete (RouteGroup v2 bug)

When `active_batch=none` but `implementer_tmux` is empty, some watcher builds
**fall back to a default session name** (e.g. first batch from bootstrap). The
watcher then reports `implementer missing` and emits:

```text
URGENT: implementer tmux <stale-session> missing — launch active batch implementer
```

This is a **false alarm** after lane completion.

**Coordinator action when lane is complete:**

1. Set in `coordinator-lane-state.txt`:
   - `lane_status=complete`
   - `active_batch=none`
   - `implementer_tmux=` (empty)
   - `reviewer_tmux=` (empty)
   - `coordinator_watch=stopped`
2. Kill watcher pid from `loop-state.txt` or `loop-status.txt`
3. Rewrite `loop-status.txt` with `lane_phase=complete`, `implementer_status=closed`

**Do not** launch a new implementer in response to stale missing-session wakes.

**Template fix (future):** watcher should skip missing-session checks when
`lane_status=complete` or `active_batch=none` without an active implementer.

---

## Mandatory shutdown on lane complete

After final batch ACCEPT + push + `coordinator-step.sh lane-complete`:

```bash
# Stop watcher (SIGTERM → exit 143 is expected)
kill <watch_pid>
pkill -f 'coordinator-watch.sh' || true
```

Update `loop-status.txt`:

```text
lane_phase=complete
watch_pid=none
implementer_status=closed
reviewer_status=closed
last_wake_detail=lane complete — watcher stopped
```

Cursor may show background task **exit 143** — normal, not a failure.

---

## Heartbeat vs event wakes

| Signal | stdout marker | Model spend? |
|--------|---------------|--------------|
| Local heartbeat (~150s) | `AGENT_LOOP_HEARTBEAT_lane` | **No** — log only |
| Health-check (default 600s) | `AGENT_LOOP_WAKE_lane` … `heartbeat health-check` | Yes (rare) |
| ACCEPT / REJECT / acceptance-ready / idle / attention / missing | `AGENT_LOOP_WAKE_lane` | Yes |

Cursor `notify_on_output` must match **`AGENT_LOOP_WAKE_lane` only**.

On health-check with no state change: brief status only; no spurious launches.

---

## While lane is active

Keep watcher running until:

- All batches accepted **and** operator confirms closure, or
- Operator explicitly pauses the lane

After **penultimate** batch accept, coordinator still launches final batch — do
not stop watcher early.

---

## Voice and alerts

`coordinator-step.sh` triggers voice/alerts on review/accept/reject/lane-complete.
Optional `start-voice-monitor.sh` for per-turn summaries — not required for correctness.

---

## Closure checklist

```text
[ ] Final batch ACCEPT commit pushed (origin + any remotes in push script)
[ ] coordinator-step.sh lane-complete announced
[ ] Batch tmux sessions closed (coordinator-close-batch-sessions.sh)
[ ] lane_state: lane_status=complete, active_batch=none
[ ] Spec tracker / roadmap show all batches Done (reviewer-owned status)
[ ] Watcher stopped; loop-status lane_phase=complete
[ ] Personal ops tracker refreshed
```
