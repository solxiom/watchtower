# Three Runtime Lessons (Mandatory)

**Source:** sql-backends lane (SQL ORM v1), 2026-07-19.
These three failures blocked hands-off coordination until fixed. Every new lane
must implement all three before calling the coordinator “automatic.”

Full detail: [voice-vs-wake-and-piper.md](voice-vs-wake-and-piper.md).

---

## Lesson 1 — Voice ≠ coordinator auto-wake

### Symptom

Operator hears **Amy (Piper)** or a bell, but the **Cursor coordinator chat**
does nothing until the operator types.

### Cause

Three **separate** systems:

| System | Wakes Cursor chat? |
|--------|-------------------|
| `coordinator-voice-monitor.sh` | **No** — operator ears only |
| `coordinator-step.sh` (Amy + bell) | **No** |
| `coordinator-watch.sh` → `AGENT_LOOP_WAKE_lane` | **Only with** Cursor `notify_on_output` |

### Fix

1. Start watcher as **background shell** with:
   - `notify_on_output.pattern = AGENT_LOOP_WAKE_lane`
   - `notify_on_output.reason = Coordinator lane wake`
2. Upgrade `coordinator-watch.sh` to emit **URGENT** wakes on REJECT / ACCEPT /
   acceptance-ready (not only “idle after Worked for”).
3. On **every** wake (or operator message): read tmux → run pipeline **same cycle**.
   Never ask “should I react?”
4. Optional backup: `/loop 10m` with coordinator wake prompt in the same chat
   (watcher event wakes are primary; do not use a short `/loop` that undoes savings).

### Coordinator rule

**Hearing voice never counts as a wake.** Only `AGENT_LOOP_WAKE_lane` in a
**monitored** background shell (or `/loop`) invokes you.

---

## Lesson 2 — Voice must not lie (scrollback false reject)

### Symptom

Amy says *“Implementer rejects the batch…”* when the latest turn is
**acceptance-ready** or correction-complete.

### Cause

`coordinator-voice-monitor.sh` scanned the **full tmux scrollback**. Old text
(e.g. `Batch 01 is rejected pending correction`) matched before the current turn.

### Fix

In `coordinator-voice-monitor.sh`:

1. **`turn_slice`** — classify only lines **above the latest** `Worked for`.
2. **`pick_event` order** — check `acceptance_ready` **before** `rejected`.
3. Use **tight reject patterns** (`batch NN is rejected`, `formal REJECT`) — not
   bare `\breject` on the whole pane.

Log should say e.g. `Implementer reports acceptance ready…`, not reject.

---

## Lesson 3 — Always kill completed batch tmux on ACCEPT

### Symptom

Stale `sb-batch01-*` and `sb-review01-*` sessions pile up; voice monitor and
watcher watch dead panes; operator attaches to wrong batch.

### Cause

Post-accept cleanup was documented but **not wired** into `coordinator-step.sh`.

### Fix

1. Ship `coordinator-close-batch-sessions.sh` (kills `{prefix}-batchNN-*` and
   `{prefix}-reviewNN-*` for the accepted batch only).
2. Wire into `coordinator-step.sh` on every `batchNN-accepted` **after push**:

   ```bash
   coordinator-push-acceptance.sh "$PUSH_BATCH"
   coordinator-close-batch-sessions.sh "$PUSH_BATCH"
   ```

3. Restart `start-voice-monitor.sh` (no args — reads `coordinator-lane-state.txt`).
4. **Never** kill tmux during review/correction — only **after ACCEPT**.

---

## Bootstrap gate (coordinator must verify)

Before telling the operator “everything is automatic”:

| # | Check |
|---|--------|
| 1 | Watcher running + notify on `AGENT_LOOP_WAKE_lane` only (not every heartbeat) |
| 2 | `coordinator-test-voice.sh quick` → `[coordinator-speak:amy]` |
| 3 | Voice monitor uses `turn_slice` (template version ≥ 2026-07-19) |
| 4 | `coordinator-step.sh` calls `coordinator-close-batch-sessions.sh` on accept |
| 5 | Only **active** batch tmux sessions exist (`tmux ls \| grep {prefix}-`) |

---

## Lesson 4 — Persistent Codex coordination needs a separate supervisor

Codex CLI does not provide Cursor's `notify_on_output` bridge. For Codex hosts,
use `template/coordinator/start-codex-coordinator.sh`: it keeps an attachable
Codex coordinator in its own tmux session and runs a private watcher without
changing the Cursor watcher.

Install the portable coordinator skill for Codex with:

```bash
./bin/install-coordinator-skill.sh codex personal
```

Defaults are intentionally split:

| Signal | Default | Purpose |
|---|---:|---|
| Private watcher heartbeat | 30s | Fast local observation |
| Private watcher poll | 15s | Detect pane changes promptly |
| Codex health-check wake | 600s | Catch silent stalls economically |

Urgent ACCEPT, REJECT, acceptance-ready, attention, and missing-session events
forward immediately. Ordinary heartbeats are logged but do not spend a Codex
turn. Idle-after-partial-work wakes the coordinator, which must nudge with the
lane's `codex-tmux-send.sh`; it must not stop an active implementer.

Handoff signals must be classified from the latest tmux turn slice only—the
text above the latest `Worked for` marker. Never dispatch review because an old
scrollback line says “report it acceptance-ready” while the current slice still
shows `Working`, a running shell command, or manual mode.

Persist the last processed `Worked for` marker per session as an additional
completion fence. A handoff is actionable only after a new completed turn, not
merely because an in-progress turn contains the words `acceptance-ready`.

The watcher also treats interactive security/model-choice prompts as urgent
attention events. If an agent asks whether to restart with a faster model or
continue with the assigned model, the coordinator must answer/resume the
assigned route and nudge the agent; leaving the prompt unanswered is a stall.

**Same economics for Cursor hosts:** `coordinator-watch.sh` does not emit
`AGENT_LOOP_WAKE_lane` on ordinary heartbeats. Cursor `notify_on_output` only
fires on events and the rare health-check. Do not match
`AGENT_LOOP_HEARTBEAT_lane`.

Tmux lessons from the Codex coordinator:

- Submit injected text with literal tmux input followed by `C-m`; tmux's
  `Enter` alias can leave text in the Codex input buffer.
- Reusing an existing coordinator session must reuse the session and restart
  only the private watcher.
- Detach with `Ctrl-b`, release, then `d`; from another shell,
  `tmux detach-client -s <session>` is reliable.
- Keep the last ten heartbeat entries in `codex-coordinator-heartbeats.log`
  (and `coordinator-heartbeats.log` from the shared watcher).

## Lesson 5 — API overload is a recoverable worker stall

An API-side `529 Overloaded` or concrete retry line is neither a completed turn
nor an operator decision. It must wake the coordinator once per worker turn,
even when no new `Worked for` marker is emitted. Claude's persistent `manual
mode on` UI is not overload evidence and must not wake the coordinator.

The coordinator must let an in-progress retry settle. If the worker is still at
the prompt afterwards, inject one continuation for the same task and preserve
the current model route. It must not dispatch review, accept, abandon the
correction, or wait silently for an operator message. The watcher deduplicates
this alert per completed-turn marker so retry output cannot spend a coordinator
turn on every poll.

Verdicts have the same strictness requirement: do not treat prose such as
`No acceptance commit` or a quoted report as ACCEPT. Only an explicit final
reviewer verdict is actionable, and REJECT takes precedence if both terms occur
in the current turn.

## Lesson 6 — Durable events, not provider UI labels

`Worked for`, `Cooked for`, and similar strings are decorative UI, not a Claude,
Codex, or cross-provider contract. The watcher advances coordination only from
the locked append-only `worker-events.jsonl` protocol. See
[durable-worker-events.md](durable-worker-events.md).

## Changelog

| Date | Change |
|------|--------|
| 2026-07-19 | Initial three lessons from sql-backends lane |
| 2026-07-19 | Added Codex persistent-session, cadence, tmux-submit, and idle-stall lessons |
| 2026-07-19 | Cursor-cheap wakes: heartbeat local-only; health-check + events wake models |
| 2026-07-20 | Added API-overload recovery and strict final-verdict detection |
