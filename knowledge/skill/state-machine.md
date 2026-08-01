# Coordinator state machine

Provider-neutral lane phases. Map host-specific events to transitions.

## Lane-level states

```text
BOOTSTRAP → ACTIVE → COMPLETE
                ↘ PAUSED (operator)
```

| State | Entry | Coordinator behavior |
|-------|-------|----------------------|
| `BOOTSTRAP` | `init-lane.sh` | Configure lane.config.env, model-plan; launch batch 1 |
| `ACTIVE` | First implementer running | Wake loop; per-batch substates below |
| `PAUSED` | Operator `/stop` | No launches; watcher may continue |
| `COMPLETE` | Final ACCEPT + push | Stop watcher; clear tmux fields; no launches |

Persist: `lane_status` in `coordinator-lane-state.txt`.

## Batch-level substates (while ACTIVE)

```text
IMPLEMENT → REVIEW → (ACCEPT → next batch IMPLEMENT)
                  ↘ REJECT → CORRECTION → IMPLEMENT
                  ↘ REJECT_ENV → REVIEW_RECOVERY → REVIEW
```

| Substate | Signals | Exit |
|----------|---------|------|
| `IMPLEMENT` | implementer working/idle | acceptance-ready handoff |
| `REVIEW` | reviewer working/idle | ACCEPT or REJECT verdict |
| `CORRECTION` | substantive REJECT | implementer acceptance-ready |
| `REVIEW_RECOVERY` | env-only REJECT | coordinator nudged reviewer with browser path |

**Important:** `REVIEW_RECOVERY` skips implementer correction. Do not enter
`CORRECTION` for reviewer browser launch failures when implementer proof exists.

## Events (abstract)

Hosts map their signals to these:

| Event | Typical source |
|-------|----------------|
| `WAKE_HEARTBEAT` | coordinator-watch.sh timer |
| `WAKE_POLL` | file/tmux status change |
| `IMPL_IDLE` | tmux pane at prompt, not acceptance-ready |
| `IMPL_READY` | handoff report says acceptance-ready |
| `IMPL_WORKING` | agent executing |
| `REV_IDLE` | reviewer at prompt, no verdict |
| `REV_WORKING` | reviewer executing |
| `VERDICT_ACCEPT` | reviewer message + commit |
| `VERDICT_REJECT_ENV` | reject cites browser/snap/path only |
| `VERDICT_REJECT_SUBSTANTIVE` | reject cites failed proof/docs/code |
| `OPERATOR_STOP` | human pause |

## Actions (abstract)

| Action | Shell implementation (when present) |
|--------|-------------------------------------|
| `NUDGE_IMPL` | `codex-tmux-send.sh` + must-not-stop |
| `NUDGE_REV` | `codex-tmux-send.sh` + must-not-stop review |
| `STOP_IMPL` | Escape + Coordinator STOP message |
| `LAUNCH_IMPL` | `launch-implementer.sh` / wrapper |
| `LAUNCH_REV` | `launch-reviewer.sh` / wrapper |
| `STEP_ACCEPT` | `coordinator-step.sh <BATCH>-accepted` |
| `STEP_REVIEW` | `coordinator-step.sh <BATCH>-review` |
| `STEP_COMPLETE` | `coordinator-step.sh lane-complete` |
| `REFRESH_TRACKER` | `coordinator-refresh-tracker.sh` |
| `STOP_WATCHER` | kill watch pid; loop-status complete |

## Transition table (simplified)

| Current | Event | Action | Next |
|---------|-------|--------|------|
| IMPLEMENT | IMPL_WORKING | — | IMPLEMENT |
| IMPLEMENT | IMPL_IDLE | NUDGE_IMPL | IMPLEMENT |
| IMPLEMENT | IMPL_READY | LAUNCH_REV, STEP_REVIEW | REVIEW |
| REVIEW | REV_WORKING | — | REVIEW |
| REVIEW | REV_IDLE | NUDGE_REV | REVIEW |
| REVIEW | FINAL_VERDICT_ACCEPT + commit + reviewer settled | STEP_ACCEPT, LAUNCH_IMPL* | IMPLEMENT or COMPLETE |
| REVIEW | VERDICT_REJECT_ENV | NUDGE_REV, STOP_IMPL | REVIEW_RECOVERY |
| REVIEW | VERDICT_REJECT_SUBSTANTIVE | NUDGE_IMPL (+ upgrade) | CORRECTION |
| REVIEW_RECOVERY | VERDICT_ACCEPT | STEP_ACCEPT, … | IMPLEMENT or COMPLETE |
| CORRECTION | IMPL_READY | LAUNCH_REV (same session) | REVIEW |

*LAUNCH_IMPL omitted on final batch accept → STEP_COMPLETE instead.
