# Bootstrap Checklist

Use when starting a **new implementation lane** in any repo.

## 1. Implementation pack (committed)

- [ ] Create `docs/spec/.../implementation/` (or your repo's equivalent)
- [ ] `implementation-tracker.md` — batch table with status column owned by reviewer
- [ ] `implementation-roadmap.md` — ordered batches + gates
- [ ] `work-batches/00-work-batch-index.md` + per-batch briefs + agent launch prompts
- [ ] `review-batches/00-review-batch-index.md` + per-batch briefs + agent launch prompts
- [ ] Parent spec linked from impl pack README

## 2. Coordinator install

```bash
cd ~/Projects/implementation-lane-coordinator
./bin/init-lane.sh /path/to/repo <lane-slug> <tmux-prefix>
```

Example:

```bash
./bin/init-lane.sh ~/Projects/awrUX html-tree-updater ht
```

## 3. Configure generated coordinator

Edit `.local/agent-reports/<lane-slug>/coordinator/`:

- [ ] `lane.config.env` — workspace, git remote, impl pack path, accounts
- [ ] `model-plan.md` — batch → model → account matrix
- [ ] `coordinator-agent-brief.md` — lane-specific paths and batch count
- [ ] `coordinator-step.sh` — per-batch accept messages (or use generic handler)
- [ ] `coordinator-lane-state.txt` — batch 01 tmux names, starting state

## 4. Cursor coordinator session

- [ ] Open workspace repo in Cursor (primary account)
- [ ] Paste `AGENTS.md` + generated `coordinator-agent-brief.md` into coordinator chat
- [ ] Start background shell: `start-coordinator-loop.sh` (or `coordinator-watch.sh`)
- [ ] Configure monitor pattern: `AGENT_LOOP_WAKE_lane` only — not `HEARTBEAT` (see cursor-loop-setup.md)
- [ ] Optional: `/loop` as long-interval backup only (watcher is primary)

## 5. tmux + accounts

- [ ] SSH/login secondary accounts (kavan2, kavan3, …) if using multi-account plan
- [ ] Verify `tmux` available on each account
- [ ] Verify nvm CLIs on **each account** used in `model-plan.md`:
  ```bash
  ./resolve-account-cli.sh kavan3 codex
  ./resolve-account-cli.sh kavan2 claude   # Opus accounts only
  ```
- [ ] Test `codex-tmux-send.sh` on a dummy session

## 6. Voice (optional)

- [ ] Install Piper under `coordinator/piper/` OR rely on espeak fallback
- [ ] Test: `./coordinator-speak.sh "Coordinator bootstrap complete."`
- [ ] Start: `./start-voice-monitor.sh <implementer-session> <reviewer-session>`
- [ ] Optional Codex CLI host: start `./start-codex-coordinator.sh` and verify `tmux attach -t <coordinator-session>`
- [ ] Optional Codex CLI host: verify `tail -n 10 codex-coordinator-heartbeats.log` and confirm health checks remain ten-minute spaced

## 7. Launch batch 01

```bash
./launch-implementer.sh 01 <account>
```

- [ ] Implementer reads work-batch 01 launch prompt
- [ ] Coordinator nudges until acceptance-ready
- [ ] `./launch-reviewer.sh 01 <reviewer-account>`
- [ ] On ACCEPT: `./coordinator-step.sh batch01-accepted`

## 8. Ongoing

- [ ] Never commit `.local/agent-reports/`
- [ ] Push after every accept (`coordinator-push-acceptance.sh`)
- [ ] Record SKIP gates with source-backed rationale in tracker
- [ ] Stop watcher only when operator ends lane
