# Coordinator Policy — {{LANE_SLUG}}

## Post-accept session cleanup (mandatory)

After every **ACCEPT + push**, close that batch's implementer and reviewer tmux:

```bash
coordinator-close-batch-sessions.sh <NN>   # wired in coordinator-step.sh
```

Then restart voice monitor from lane state (`./start-voice-monitor.sh` with no args).

**Never** kill tmux during review/correction. **Never** leave accepted batch
sessions running. See `docs/guides/three-runtime-lessons.md` lesson 3.

## Operator pause

- **Pause** = `/stop` or a queued coordinator message — never `Ctrl+C` on implementer tmux
- Never `tmux kill-session` except post-accept cleanup (above) or operator shutdown request

## Commit boundaries

| Role | May commit |
|------|------------|
| Implementer | Local WIP only if brief allows; **not** acceptance |
| Reviewer | **Acceptance commit** per review-batch brief |
| Coordinator | **Never** commit; may patch tracker factual fields via implementer/reviewer |

## Push policy

Run `coordinator-push-acceptance.sh` on every **ACCEPT** via `coordinator-step.sh`.

## Tracker ownership

- Reviewer owns `ACCEPT` / `REJECT` / `SKIP` status in tracker
- Coordinator may update: commit hashes, proof commands, gate measurements, ordering notes

## Shared-file ownership

The coordinator must operate as `kavan` because it edits shared lane state:

```text
If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.
```

Do not leave coordinator-edited files owned by `kavan2`, `kavan3`, or another
worker account.

## Review model policy

Default: Codex on secondary accounts for reviews. Do not use Claude for review
unless `model-plan.md` explicitly allows.

## Gate skips

When a batch gate fails (profiling, outcome branch), record **SKIP** with
source-backed rationale — do not force implementer work.

## Whole-lane ownership

When batch N accepts, immediately dispatch batch N+1. Do not wait for operator
unless lane is paused.

## Browser / proof ownership

If multi-account Chromium/snap issues appear, run browser proofs on the primary
account watcher per troubleshooting notes in the impl pack.

**Coordinator triage (required):** when a reviewer REJECTs because they could not
launch a browser but the implementer already recorded terminal bridge reports,
do **not** route correction to the implementer. Nudge the **reviewer** with
approved non-Snap `CHROMIUM_PATH` values per account. Full playbook:
`docs/guides/browser-proof-coordinator-playbook.md` in the coordinator template repo.

## Reviewer reject triage

Before sending correction to the implementer:

1. Read the reject rationale — env/browser launch vs substantive defect
2. Env-only → nudge reviewer (see `docs/guides/coordinator-decision-rules.md`)
3. Substantive → correction brief + implementer nudge (+ Codex model upgrade)
4. If reviewer is rerunning proof, **stop** implementer correction work (Coordinator STOP)

After any REJECT, preserve the reviewer tmux session and durable report for the
eventual independent re-review. Do not kill or clear the reviewer session merely
to release the review lock. Only final ACCEPT cleanup may close the batch
reviewer, unless the operator explicitly requests shutdown.

## Implementer blocker fence

An implementer blocker is not an acceptance handoff. When the implementer says
`blocked`, `blocker`, `cannot continue`, `stalled`, `stuck`, `needs help`, or
`waiting on operator`, inspect and recover the implementer first. Ask the
operator only when a genuine decision or missing authority is required. Never
dispatch the reviewer from that turn, even if it also mentions
`acceptance-ready` or `not acceptance-ready`.

## Review lock and final verdict fence

Review owns the implementation tree until a final reviewer verdict. When review
is dispatched, immediately STOP the implementer and keep it idle. Do not resume
implementation or correction work because the reviewer reports an intermediate
acceptance such as “Correction 01 accepted.”

The coordinator may run the accept pipeline only after verifying:

1. the latest reviewer turn contains a final ACCEPT;
2. the reviewer is settled—not Working, running proof, editing, or reporting a
   newly found defect; and
3. the reviewer-owned acceptance commit exists.

If any check is false, leave the implementer stopped and let the reviewer finish.

## Lane completion

When all batches are accepted:

1. Run `coordinator-step.sh lane-complete`
2. Stop `coordinator-watch.sh` (exit 143 is expected)
3. Set `lane_status=complete`, `active_batch=none`, empty tmux fields in lane state

See `docs/guides/lane-watcher-and-closure.md`.

## Tracker forgiveness

Coordinator patches tracker/roadmap factual fields when agents forget; do not
block the lane on tracker debt alone. Reviewer still owns ACCEPT/REJECT status lines.

## Agent CLI policy

Launch scripts **must** resolve `claude` and `codex` per account via the **latest
installed nvm node** (or `NVM_NODE_VERSION` when pinned):

```text
~/.nvm/versions/node/<latest>/bin/{claude,codex}
```

Never launch from `~/.local/bin/claude` or from the coordinator account PATH when
the tmux session runs under a different OS user. See `resolve-account-cli.sh`.
