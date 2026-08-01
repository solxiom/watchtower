# Provider adapters

The coordinator **skill** (behavior + state machine) is host-agnostic. Each
provider supplies:

1. **Wake delivery** — how the coordinator agent gets periodic/event prompts
2. **Tool access** — shell, tmux read, file read/write
3. **Nudge delivery** — how messages reach implementer/reviewer sessions

The **runtime shell** (scripts in `template/coordinator/`) stays the same across hosts.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Agent host (Cursor / Claude Code / Codex / SDK / CI)   │
│  ┌───────────────────────────────────────────────────┐  │
│  │  SKILL.md or AGENTS.md  ← portable brain          │  │
│  │  + state-machine.md                               │  │
│  └───────────────────────────────────────────────────┘  │
│           │ reads/writes          │ invokes             │
│           ▼                       ▼                     │
│  coordinator-lane-state.txt   shell scripts (tmux)      │
│  loop-status.txt              codex-tmux-send.sh        │
└─────────────────────────────────────────────────────────┘
           ▲
           │ AGENT_LOOP_WAKE_lane (stdout) — host-specific monitor
┌──────────┴──────────┐
│ coordinator-watch.sh │
└─────────────────────┘
```

---

## Cursor

| Piece | Location |
|-------|----------|
| Skill | Install via `bin/install-coordinator-skill.sh cursor` → `~/.cursor/skills/` or `.cursor/skills/` |
| Wake | Background shell running `start-coordinator-loop.sh`; monitor `AGENT_LOOP_WAKE_lane` only (not `HEARTBEAT`) |
| Nudge | Agent runs `codex-tmux-send.sh` via Shell tool |
| Rules | Optional `.cursor/rules/coordinator-lane.mdc` pointing to skill |

**Trigger:** user starts coordinator chat with skill enabled; `/loop` optional for periodic user-side prompts.

---

## Claude Code

| Piece | Location |
|-------|----------|
| Instructions | Symlink `agents/coordinator/AGENTS.md` → project `CLAUDE.md` section, or `@import` |
| Wake | `while sleep 150; do claude -p "$(cat wake-prompt.txt)"; done` in tmux, or human-driven |
| Nudge | Claude Code runs `./codex-tmux-send.sh` in target repo |
| Hooks | `.claude/hooks/` on `PostToolUse` — optional; prefer explicit wake script |

Claude Code has no built-in `AGENT_LOOP_WAKE_lane`. Use a **sidecar shell loop** that
appends to a wake inbox file the coordinator reads each turn.

---

## Codex CLI

| Piece | Location |
|-------|----------|
| Instructions | `AGENTS.md` at repo root (Codex reads automatically) or `-c` system append |
| Wake | External cron/systemd + `codex exec "coordinator wake: read lane state…"` |
| Nudge | Same tmux scripts |

Codex implementers/reviewers already run in tmux; coordinator can be **another Codex
session** in its own tmux (`rg-coordinator-kavan`).

---

## Cursor SDK / custom API agents

| Piece | Approach |
|-------|----------|
| System prompt | Load `agents/coordinator/SKILL.md` body + `state-machine.md` |
| Wake | SDK scheduled job or webhook calls `Agent.prompt()` with wake template |
| Tools | `run_terminal_cmd`, read_file, write_file mapped to shell scripts |
| State | Read/write `coordinator-lane-state.txt` each turn |

Use **one long-lived agent thread** (`Agent.resume`) for coordinator continuity.

---

## CI / headless (no tmux UI)

Replace tmux nudges with:

- GitHub Checks comments on tracker PR
- Slack/webhook to operator
- Queue files: `.local/.../coordinator/inbox/implementer.nudge`

Not recommended for primary lane flow — tmux multi-account is the reference design.

---

## Minimal portable wake prompt

Store in `template/coordinator/wake-prompt.txt`:

```text
Coordinator wake. Read coordinator-lane-state.txt and coordinator-agent-brief.md.
Apply agents/coordinator state-machine.md. One action only. Brief operator summary.
```

Each adapter prepends host-specific context (heartbeat, idle session names).

---

## Install skill into a host

```bash
# From implementation-lane-coordinator repo root
./bin/install-coordinator-skill.sh cursor personal   # ~/.cursor/skills/
./bin/install-coordinator-skill.sh cursor project    # <workspace>/.cursor/skills/
./bin/install-coordinator-skill.sh claude <workspace>  # merge into CLAUDE.md pointer
./bin/install-coordinator-skill.sh generic <workspace> # copy AGENTS.md snippet
```

---

## What stays provider-specific

| Portable | Provider-specific |
|----------|-------------------|
| Decision rules, state machine, playbook | Wake monitoring mechanism |
| lane-state.txt schema | How agent invokes shell (tool names) |
| tmux session naming | Skill file format (YAML frontmatter vs plain md) |
| Script contracts | Voice/notify (optional) |

Do not duplicate decision rules per provider — **one SKILL.md**, thin adapters only.
