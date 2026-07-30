# Watchtower — Agent Instructions

You are working on **watchtower** (`wt`), a Nirvana-ecosystem CLI that manages
implementation lanes (multi-batch agent workflows).

Read this file first, then the spec draft at `docs/spec/v1-draft.md`.

## Mission

Build a **global CLI** that:

1. Initializes lane runtime in target projects without copying the full template tree
2. Discovers active lanes from the current working directory
3. Bundles coordinator shell scripts, docs references, and upgrade paths
4. Exposes operator commands (`init`, `watch`, `status`, `upgrade`, …)

Watchtower is **not** the coordinator agent. It does not replace Codex/Cursor lane
coordination logic — it replaces the copy-paste install/bootstrap model from
`implementation-lane-coordinator`.

## Architecture (two layers)

```text
wt (TypeScript CLI)     operator commands, discovery, packaging, upgrades
        │
        ▼ invokes
lane runtime (shell)    coordinator-watch.sh, launch-*.sh, lane.config.env, state files
        │
        ▼ orchestrates
tmux agents             implementers, reviewers, Codex coordinator session
```

## Repo layout conventions

| Path | Purpose |
|------|---------|
| `src/commands/` | One `*Command.ts` per `wt` subcommand; extend `BaseCommand` |
| `src/foundation/` | Discovery, path resolution, lane config IO, script delegation |
| `src/contracts/` | Public types shared across commands |
| `help/commands/` | Help fragment per command |
| `runtime-nvb/` | NVB handlers/tasks shipped in `dist/` (heavy automation) |
| `docs/spec/` | Normative product spec (update when behavior changes) |

**Do not** put product logic in `src/cli.ts` — it stays a thin host. Command behavior
belongs in `src/commands/` and `src/foundation/`.

## Build and test

```sh
nvb build          # compile → build/
nvb test           # build + Jasmine
nvb dist           # package → dist/
```

Dev CLI invocation:

```sh
node build/src/cli.js <command>
```

Dist bin layout: `dist/bin/wt.js` imports `../src/cli.js` (TypeScript preserves `src/` in output).

Global install for manual testing:

```sh
nvb dist && npm install -g ./dist
```

## Adding a command

1. Create `src/commands/FooCommand.ts` — `export default class FooCommand extends BaseCommand`
2. Add `help/commands/foo.hlp.json` and register in `help/help.json`
3. Add spec under `spec/basic/` when behavior is non-trivial
4. Update `docs/spec/v1-draft.md` command table if the command is spec-defined

## Lane path conventions (target projects)

Default lane root (configurable later):

```text
<workspace>/.local/agent-reports/<lane-slug>/coordinator/
```

Key files: `lane.config.env`, `coordinator-lane-state.txt`, `worker-events.jsonl`.

Walk up from `cwd` to find an active lane — same pattern as nvb/nira env discovery.

## Non-negotiable rules

- **Never commit** `dist/`, `build/`, `node_modules/`, `.nira/local/`
- **Keep specs in sync** — update `docs/spec/v1-draft.md` when adding or changing commands
- **Prefer foundation modules** over duplicating path/discovery logic in commands
- **Delegate to shell scripts** for tmux/lane operations until TypeScript rewrites are justified
- **Match Nirvana CLI patterns** — `@nirvana/base/cli`, NVB for build/dist, colon tasks in runtime-nvb

## Source of truth for coordinator behavior

Lane coordination rules (wake checklist, reject triage, push on accept) live in
`implementation-lane-coordinator` docs/playbook and skill until watchtower ships
equivalent bundled docs. Do not re-specify coordinator agent behavior here — reference
and bundle, don't fork.

## Spec workflow

- `docs/spec/v1-draft.md` is the living product spec
- Mark sections ✅ / ⏳ / ❌ as features land
- Breaking path or command changes require a spec update in the same PR
