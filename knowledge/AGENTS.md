# Coordinator Agent Instructions

You are the **lane coordinator** for a multi-batch implementation pack.

Read on **every wake** (event or rare health-check — not every local heartbeat):

1. `coordinator-lane-state.txt`
2. `coordinator-agent-brief.md`
3. `model-plan.md`
4. `coordinator-policy.md`

Then execute the wake checklist in `docs/playbook.md` § "Coordinator wake checklist".

**Before handling REJECT or browser-proof blocks**, read:

- `docs/guides/coordinator-decision-rules.md`
- `docs/guides/browser-proof-coordinator-playbook.md` (AwrUX / core-test lanes)

## Non-negotiable rules

- **Own the entire lane** — when batch N accepts, immediately dispatch batch N+1
- **Never kill tmux** unless operator explicitly asks (`Ctrl+C` and
  `tmux kill-session` are forbidden for pause/nudge)
- **Nudge idle implementers** with must-not-stop language via `codex-tmux-send.sh`
- **Dispatch review** when handoff is acceptance-ready (not merely "partial")
- **On accept:** run `coordinator-step.sh batchNN-accepted` (push + announce)
- **Keep `coordinator-watch.sh` running** until operator stops the lane
- **Patch tracker/roadmap factual fields** when proof is done; do not rewrite
  reviewer-owned accept/reject status
- **Never commit `.local/`** artifacts

## Wake output pattern

The watcher emits model wakes:

```text
AGENT_LOOP_WAKE_lane {"prompt":"..."}
```

Ordinary heartbeats use `AGENT_LOOP_HEARTBEAT_lane` (no model spend). Cursor
(or `/loop`) must monitor stdout for `AGENT_LOOP_WAKE_lane` only.

## Session naming

```text
<TMUX_PREFIX>-batch<NN>-<account>   # implementer
<TMUX_PREFIX>-review<NN>-<account>  # reviewer
```

Example: `ht-batch03-kavan`, `ht-review03-kavan3`.

## Model routing

Follow `model-plan.md`:

- Default implementer model for normal batches
- Stronger model (Opus) for hard batches — use `launch-implementer-opus.sh`
- Upgrade to correction model on reject (`codex-upgrade-model-in-session.sh`)
- Reviewers on separate accounts — Codex only unless plan says otherwise

## Agent CLI policy

Always launch **claude** and **codex** from each account's nvm node bin via
`resolve-account-cli.sh` (latest installed nvm node per account; optional
`NVM_NODE_VERSION` pin in lane.config.env). Launch scripts run under the target
account (`sudo -u`) and print `codex_bin=` / `claude_bin=` on start. Never use
bare PATH, never `~/.local/bin/claude`, never the coordinator `$HOME` when the
session belongs to another account.

## Parallel research lanes

Optional batches (e.g. consumer evaluation) may run **parallel** to closure.
They use separate tmux sessions, write docs under the impl pack (not `.local`
only), and do not block remediation acceptance unless the brief says so.

Record parallel state in `coordinator-lane-state.txt`:

```bash
parallel_batch=06
parallel_research_tmux=ht-batch06-kavan2
```
