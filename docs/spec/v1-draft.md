# Watchtower v1 — Product Spec (Draft)

Status: **Draft**  
CLI bin: `wt`  
Ecosystem: Nirvana (`@nirvana/base`, `@nirvana/builder`, `nvb`)

## 1. Problem

Today, [implementation-lane-coordinator](https://github.com/kavan/implementation-lane-coordinator)
requires a **full copy** of ~30 shell scripts and briefs into each target project:

```text
.local/agent-reports/<lane-slug>/coordinator/
```

Pain points:

- No global install — bootstrap requires cloning the template repo
- No upgrade path — re-init overwrites scripts without merge/diff
- Template drift — new scripts (assistant, refresh-tracker) miss the copy manifest
- Split docs — normative guides live in the template repo, runtime in the project

## 2. Solution

**Watchtower** is a globally installed CLI that:

1. **Bundles** the canonical coordinator runtime (scripts, default briefs, skill installer)
2. **Materializes** only lane-specific files in the target project (config, state, tracker)
3. **Discovers** the active lane from the current working directory
4. **Upgrades** bundled assets without touching lane state or operator edits

```text
~/.local/share/watchtower/     # or npm global package root
  bin/wt
  runtime/coordinator/*.sh
  docs/
  agents/

<project>/
  .local/agent-reports/<lane>/coordinator/
    lane.config.env              # lane-specific
    coordinator-lane-state.txt
    coordinator-agent-brief.md
    model-plan.md
    worker-events.jsonl
    logs/, watcher-state/
```

## 3. Non-goals (v1)

- Replacing the **coordinator agent** (Codex/Cursor) — watchtower is operator tooling
- Rewriting all shell scripts in TypeScript — delegate first, port selectively
- Hermes/DeepSeek as primary coordinator — voice/assistant stays complementary
- CI/headless lane mode without tmux

## 4. Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  wt CLI (TypeScript, @nirvana/base)                   │
│  init | watch | status | upgrade | skill | …           │
└──────────────────────────┬──────────────────────────────┘
                           │ invokes
┌──────────────────────────▼──────────────────────────────┐
│  Bundled lane runtime (shell)                          │
│  coordinator-watch.sh, launch-*.sh, coordinator-step   │
└──────────────────────────┬──────────────────────────────┘
                           │ tmux
┌──────────────────────────▼──────────────────────────────┐
│  Agents: implementer, reviewer, Codex coordinator        │
└─────────────────────────────────────────────────────────┘
```

### Discovery

Walk up from `process.cwd()` until a lane marker is found:

1. `lane.config.env` under `.local/agent-reports/*/coordinator/`, or
2. Future: `watchtower.json` at project root listing lanes

Return: `workspace`, `laneSlug`, `coordinatorDir`, `implPackRel`.

Same upward-walk pattern as nvb `resolveEnv` and nira `envResolver`.

### Install modes

| Mode | v1 | Notes |
|------|----|-------|
| npm global (`npm install -g ./dist`) | ✅ target | Primary operator path |
| Symlink runtime scripts | ⏳ | Avoid copy drift |
| Full copy (legacy init-lane) | ❌ | Compatibility shim only if needed |

## 5. Commands (planned)

| Command | Status | Description |
|---------|--------|-------------|
| `wt hello` | ✅ scaffold | Sanity check (remove or keep as health) |
| `wt help` | ✅ scaffold | Static help via `@nirvana/base/cli/help` |
| `wt init <lane-slug> <tmux-prefix> [--impl-pack=PATH]` | ❌ | Materialize lane in cwd project |
| `wt watch [--lane=SLUG]` | ❌ | Start `coordinator-watch.sh` for discovered lane |
| `wt status [--lane=SLUG]` | ❌ | Print lane state, tmux sessions, active batch |
| `wt upgrade [--lane=SLUG]` | ❌ | Refresh bundled scripts; preserve config/state |
| `wt skill install <host>` | ❌ | Install coordinator skill (cursor/claude/codex) |
| `wt config show` | ❌ | Print resolved lane paths and config |
| `wt doctor` | ❌ | Preflight: tmux, accounts, nvm CLIs, workspace |

Command groups in help:

- **lane** — init, watch, status, upgrade
- **skill** — agent host skill installation
- **util** — doctor, config, version

## 6. `wt init` contract

**Inputs:**

- `lane-slug` — e.g. `sql-backends`, `route-groups-v2`
- `tmux-prefix` — e.g. `sb`, `rg`
- `--impl-pack` — relative path to committed impl pack (default derived from slug)
- `--workspace` — override; default `git rev-parse --show-toplevel` or cwd

**Creates (never overwrite if exists, unless `--force`):**

| File | Source |
|------|--------|
| `lane.config.env` | template + substitution |
| `coordinator-lane-state.txt` | template |
| `coordinator-agent-brief.md` | template + substitution |
| `model-plan.md` | template |
| `implementer-agent-brief.md` | template |
| `coordinator-tracker.md` | template (single canonical path) |

**Links or copies from bundle:**

- All `*.sh` runtime scripts → symlink preferred
- `steps.local.conf.example` → copy once

**Does not create:**

- Worker reports under `.local/agent-reports/<lane>/` (runtime)
- Committed impl pack under `docs/spec/...` (project-owned)

## 7. Lane config schema (`lane.config.env`)

Required keys (unchanged from implementation-lane-coordinator):

```bash
WORKSPACE="/absolute/path/to/repo"
LANE_SLUG="my-lane"
TMUX_PREFIX="ml"
IMPL_PACK_REL="docs/spec/.../implementation"
```

Watchtower adds (optional):

```bash
WATCHTOWER_VERSION="0.1.0"
WATCHTOWER_RUNTIME="global"   # global | symlink | copy
COORDINATOR_REPO=""           # docs reference; set by wt init
```

## 8. Bundled runtime

Migrate from `implementation-lane-coordinator/template/coordinator/`:

| Category | Scripts |
|----------|---------|
| Watcher | `coordinator-watch.sh`, `start-coordinator-loop.sh` |
| Steps | `coordinator-step.sh`, `coordinator-push-acceptance.sh` |
| Launch | `launch-implementer.sh`, `launch-reviewer.sh`, `launch-implementer-opus.sh` |
| Codex coord | `start-codex-coordinator.sh`, `restart-codex-coordinator.sh` |
| Workers | `coordinator-worker-event.sh`, `coordinator-worker-prompt.sh` |
| Nudge | `codex-tmux-send.sh`, `coordinator-nudge-message.sh` |
| Voice | `coordinator-voice-monitor.sh`, `coordinator-speak.sh`, … |
| Assistant | `coordinator-assistant.sh`, `coordinator-voice-agent-summary.sh` |
| Sync | `coordinator-sync-tracker.sh`, `coordinator-sync-session.sh` |
| Accounts | `resolve-account-cli.sh`, `account-run-as.sh` |

Ship under `runtime/coordinator/` inside the watchtower package.

## 9. Upgrade semantics

`wt upgrade`:

1. Read `.install.json` (bundled version, install mode, manifest checksum)
2. Replace symlink targets or refresh copied scripts from new bundle
3. **Never** overwrite: `lane.config.env`, lane state, tracker prose, customized briefs
4. Print diff summary of script changes

## 10. runtime-nvb tasks

NVB tasks shipped in `dist/runtime-nvb/` for automation that does not need a full CLI command:

| Task | Purpose |
|------|---------|
| `wt:runtime:validate` | Verify bundled coordinator scripts present |
| `wt:lane:sync-tracker` | Invoke sync script for active lane |
| `wt:pack:coordinator` | Build-time: stage runtime into dist |

Colon namespace matches Nirvana NVB conventions.

## 11. Tracker path (fix legacy bug)

Single canonical ops tracker path:

```text
.local/agent-reports/<lane-slug>/coordinator-tracker.md
```

Not `<lane-slug>-coordinator-tracker.md` at parent level. Watchtower init and sync
must agree.

## 12. Implementation phases

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Nira CLI scaffold, `wt hello`, nvb dist, global install | ✅ |
| 1 | README, AGENTS.md, this spec | ✅ |
| 2 | `src/foundation/` — cwd discovery, lane paths | ❌ |
| 3 | `wt init` — materialize lane, symlink scripts | ❌ |
| 4 | `wt watch`, `wt status` | ❌ |
| 5 | Bundle migration from implementation-lane-coordinator | ❌ |
| 6 | `wt upgrade`, `wt skill install` | ❌ |
| 7 | `wt doctor` | ❌ |

## 13. Acceptance (v1 done)

- [ ] `npm install -g` from dist; `wt` on PATH works
- [ ] `wt init` in a fresh repo creates lane runtime without full script copy (symlink mode)
- [ ] `wt watch` starts watcher for discovered lane
- [ ] `wt status` prints batch, tmux names, lane phase
- [ ] `wt upgrade` refreshes scripts without clobbering state
- [ ] Existing implementation-lane-coordinator lane can migrate with documented steps
- [ ] Spec and help updated for all shipped commands

## 14. Open questions

1. **Package name** — npm: `watchtower` vs `@nirvana/watchtower`?
2. **Config marker** — rely on `lane.config.env` only, or add root `watchtower.json`?
3. **Multi-lane projects** — `--lane` flag vs interactive picker?
4. **Piper assets** — bundle in watchtower or optional download?
5. **Account defaults** — remove hardcoded `kavan` from inherited scripts during migration?

---

*Last updated: 2026-07-30*
