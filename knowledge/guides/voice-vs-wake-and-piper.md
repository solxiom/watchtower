# Voice vs wake vs Cursor notify

**Summary:** [three-runtime-lessons.md](three-runtime-lessons.md) (lessons 1–2).
**Lesson source:** sql-backends lane (SQL ORM v1), 2026-07-19.

For Codex CLI lanes, use `template/coordinator/start-codex-coordinator.sh` as a
separate persistent coordinator. It is not a replacement for the Cursor
watcher; it supplies the missing host-level wake bridge by forwarding watcher
events into an attachable Codex tmux session.

Operators heard **voice notifications** (Amy / Piper) when agents finished turns,
but the **Cursor coordinator chat did not react** until the operator sent a message.
This is expected when the three layers below are confused.

---

## Three separate layers

| Layer | Script | What it does | Wakes Cursor chat? |
|-------|--------|--------------|-------------------|
| **Voice monitor** | `coordinator-voice-monitor.sh` | Speaks once per agent turn (Piper Amy) | **No** |
| **Step announce** | `coordinator-step.sh` | Piper + bell on review/accept/reject steps | **No** |
| **Watcher wake** | `coordinator-watch.sh` | Prints `AGENT_LOOP_WAKE_lane` on **events + rare health-check** (not every heartbeat) | **Only with Cursor `notify_on_output`** |

**Rule:** Hearing Amy does **not** mean the coordinator agent ran. Voice is for
the **operator's ears**; the watcher is for **Cursor's eyes**.

---

## Required Cursor setup

When starting `./start-coordinator-loop.sh` as a **background shell**, configure:

| Setting | Value |
|---------|-------|
| `notify_on_output.pattern` | `AGENT_LOOP_WAKE_lane` |
| `notify_on_output.reason` | `Coordinator lane wake` |

Without this, wakes accumulate in the terminal log but **never inject** into the
coordinator chat. The watcher may be healthy while the coordinator appears asleep.

**Backup:** Cursor `/loop` skill (~5m) re-reads lane state if notify misses events.
Prefer **watcher + notify** as primary.

---

## Watcher must detect verdicts (not only idle)

A watcher that only emits *"idle after partial work"* when it sees `Worked for` is
**insufficient**. After ACCEPT, REJECT, or a genuine current-turn
acceptance-ready handoff, the coordinator must run pipelines immediately — not
wait for operator input.

`coordinator-watch.sh` must scan tmux panes for:

| Pattern (examples) | Wake detail |
|--------------------|-------------|
| `rejected`, `REJECT`, `rejected pending correction` | `URGENT … REJECT detected — reject pipeline` |
| explicit final reviewer `ACCEPT` | `URGENT … ACCEPT detected — accept pipeline` |
| current-turn `acceptance-ready`, `awaiting review` | `URGENT … acceptance-ready — dispatch reviewer` |
| `API Error: 529`, concrete overload retry | `URGENT … worker stall — recover same task` |
| `Worked for` + idle (no verdict yet) | Generic idle nudge hint |

On **URGENT** wakes the coordinator must **act in the same cycle** — not explain
why it cannot wake. If the operator messages manually, treat that as a wake too
and run the same checklist.

---

## Coordinator action on URGENT wakes

| Wake says | Coordinator does |
|-----------|-------------------|
| REJECT detected | `coordinator-step.sh batchNN-rejected`; terra implement → SOL upgrade; nudge correction brief; `correction_required` in lane state |
| ACCEPT detected | Verify acceptance commit; `coordinator-step.sh batchNN-accepted`; launch batch N+1 |
| acceptance-ready | `launch-reviewer.sh`; `coordinator-step.sh batchNN-review` |
| API overload/retry | Let retry settle; if still at prompt, inject one continuation for the same task and model; do not change lane phase |
| Generic idle | Nudge only if phase matches (implement vs review) |

Never assume voice already handled this.

---

## Piper Amy vs ugly espeak fallback

`coordinator-speak.sh` defaults to **Piper Amy** under `coordinator/piper/`.

If `piper/bin/piper` or the Amy model is **missing**, speech falls back to
`spd-say` / espeak — operators describe this as the "ugly" voice.

Log markers:

```text
[coordinator-speak:amy]     ← correct
[coordinator-speak:espeak-fallback]  ← broken piper install
```

**Fix:** symlink or copy `piper/` from a working lane (e.g. route-groups
v2-coordinator), set `COORDINATOR_PIPER_BIN` / `COORDINATOR_PIPER_MODEL` in
`lane.config.env`, run `./coordinator-test-voice.sh quick`.

Voice monitor and step scripts share `coordinator-speak.sh` — fixing piper fixes both.

### False "Implementer rejects the batch" on acceptance-ready

If voice or the watcher says **acceptance-ready** while the latest turn is still
working, the bug is **stale tmux scrollback**: old handoff text remained in the
pane and a detector scanned the full buffer.

Fix (template + lane): both `coordinator-voice-monitor.sh` and
`coordinator-watch.sh` must classify only **`turn_slice`** — lines above the
latest `Worked for` — and must refuse handoff while the current slice still
shows active work or a Codex safety-check stall.

---

## Codex CLI coordinator operations

```bash
./start-codex-coordinator.sh
tmux attach -t <coordinator-tmux-session>
tail -n 10 codex-coordinator-heartbeats.log
```

At the source, `coordinator-watch.sh` already keeps ordinary heartbeats local
(`AGENT_LOOP_HEARTBEAT_lane` + `coordinator-heartbeats.log`) and only emits
`AGENT_LOOP_WAKE_lane` for real events plus a rare health-check (default 600s).
The Codex supervisor still suppresses any leftover heartbeat wakes, forwards
urgent state events immediately, and keeps `codex-coordinator-heartbeats.log`.
The coordinator model is independent from implementer/reviewer routing: worker
launch scripts must still read `model-plan.md` and use the configured
implementer/reviewer launchers for Terra/Sol/Opus and account separation.

## Watcher exit 143

Exit code **143** (SIGTERM) when restarting the watcher is **normal** during
coordinator-watch upgrades or manual restarts. Restart with
`./start-coordinator-loop.sh` and confirm `AGENT_LOOP_HEARTBEAT_lane` on stdout
(and `AGENT_LOOP_WAKE_lane` only on events/health-check).

---

## Operator FAQ

**"I heard voice — why didn't the coordinator move the lane?"**
Voice fired. Check: (1) watcher running, (2) `AGENT_LOOP_WAKE_lane` in watcher
stdout, (3) Cursor background shell has notify pattern, (4) coordinator chat is
the monitored session.

**"Watcher log shows wakes but chat is silent"**
Missing `notify_on_output` — not a watcher bug.

**"Coordinator only reacts when I type"**
Same as above, or Multitask/auto-wake not enabled for background shell notifications.

---

## Bootstrap checklist (new lane)

1. `./start-coordinator-loop.sh` in background shell **with notify pattern**
2. `./start-voice-monitor.sh` (optional but recommended for operator ears)
3. Confirm `./coordinator-test-voice.sh quick` logs `[coordinator-speak:amy]`
4. Confirm watcher stdout shows `AGENT_LOOP_HEARTBEAT_lane` every ~150s and
   `AGENT_LOOP_WAKE_lane` only on events / ~600s health-check
5. Document piper path or symlink in `lane.config.env`

---

## Reference

- [three-runtime-lessons.md](three-runtime-lessons.md) — mandatory summary (all 3 lessons)
- [cursor-loop-setup.md](../cursor-loop-setup.md)
- [lane-watcher-and-closure.md](lane-watcher-and-closure.md)
- [playbook.md](../playbook.md) — Lessons (sql-backends lane)
