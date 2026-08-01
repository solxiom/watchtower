# Cursor `/loop` and Wake Setup

The coordinator depends on **event-driven wakes** so Cursor re-reads lane state
and nudges agents without burning a model turn on every heartbeat.

## Watcher

Run in a **background shell** (not one-shot):

```bash
.local/agent-reports/<lane-slug>/coordinator/start-coordinator-loop.sh
# or: .../coordinator/coordinator-watch.sh
```

### stdout contract

**Model wake** (Cursor `notify_on_output` must match this):

```text
AGENT_LOOP_WAKE_lane {"prompt":"Coordinator wake: ... <event detail>"}
```

Emitted on:

- ACCEPT / REJECT / acceptance-ready / attention / idle-after-partial
- missing implementer tmux
- rare **health-check** (default every `COORDINATOR_HEALTH_CHECK_SEC=600`)

**Local heartbeat** (no model spend — do **not** notify on this):

```text
AGENT_LOOP_HEARTBEAT_lane {"at":...,"interval":150}
```

Rolling log: `coordinator-heartbeats.log` (last ten lines).

**Critical:** Wake lines must go to **stdout**, not stderr. Cursor
`notify_on_output` watches stdout.

### Monitored files

Default (via `lane.config.env`):

- `coordinator-lane-state.txt`
- impl pack `implementation-tracker.md`
- impl pack `implementation-roadmap.md`

## Cursor background shell monitoring

When starting the watcher as a background task, set:

| Setting | Value |
|---------|-------|
| `notify_on_output.pattern` | `AGENT_LOOP_WAKE_lane` |
| `notify_on_output.reason` | `Coordinator lane wake` |

Do **not** match `AGENT_LOOP_HEARTBEAT_lane` — that would undo the cost saving.

On match, Cursor injects the wake prompt into the coordinator chat.

## `/loop` skill (optional reinforcement)

If using the Cursor `/loop` skill, configure a **long** interval (e.g. 10–15m)
only as backup; prefer watcher + notify as primary:

```text
Read .local/agent-reports/<lane-slug>/coordinator/coordinator-lane-state.txt
and coordinator-agent-brief.md. Execute coordinator wake checklist in
docs/playbook.md. Do not stop coordinator-watch.sh.
```

Prefer **watcher + notify** as primary; `/loop` as backup if notify misses events.

## Wake prompt content

Stored in `lane.config.env` as `COORDINATOR_WAKE_PROMPT`. Should instruct:

1. Read state files
2. Nudge idle tmux sessions
3. Dispatch review on acceptance-ready
4. Run accept pipeline on ACCEPT
5. Advance to next batch

## Stopping

Operator says stop → coordinator kills watcher PID from `loop-state.txt` (if used)
or stops background shell task — **not** implementer tmux sessions unless asked.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Coordinator never wakes | Confirm event/health-check `AGENT_LOOP_WAKE_lane` on stdout; check notify pattern |
| Wakes every ~150s (expensive) | Old watcher — upgrade `coordinator-watch.sh`; notify must not match `HEARTBEAT` |
| **Heard voice but coordinator idle** | Voice ≠ wake — see [voice-vs-wake-and-piper.md](guides/voice-vs-wake-and-piper.md); enable `notify_on_output` |
| Wake spam | Confirm health-check ≥ 600s; dedupe in coordinator chat |
| Missed ACCEPT/REJECT | Upgrade `coordinator-watch.sh` to URGENT verdict patterns |
| Ugly espeak voice | Install/symlink `coordinator/piper/`; run `coordinator-test-voice.sh` |
| Missed tracker update | Verify inotify paths in `lane.config.env` |
| Watcher exited 143 | Normal on restart — run `./start-coordinator-loop.sh` again |
| Watcher exited | Restart; check impl pack paths exist |
