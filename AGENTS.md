# Watchtower — Agent Instructions

You are working on **watchtower** (`wt`), a Nirvana-ecosystem CLI that manages
implementation lanes (multi-batch agent workflows).

Read this file first, then the specification at `docs/spec/v1.md`.

## Mission

Build a **global CLI** that:

1. Initializes lane runtime in target projects without copying the full template tree
2. Discovers active lanes from the current working directory
3. Bundles coordinator shell scripts, docs references, and upgrade paths
4. Exposes operator commands (`init`, `watch`, `status`, `upgrade`, …)
5. Routes mechanical coordinator work without models and validates bounded
   decision-agent proposals before applying effects

Watchtower is **not** the coordinator agent. Semantic reject, scope, and
reconciliation judgment remains in Codex/Cursor-style decision agents.
Watchtower owns deterministic routing, bounded context, proposal validation,
seal-bound pack indexing, and one safe effect-execution boundary in addition
to replacing the copy-paste install/bootstrap model.

An operator session is a durable sequence of bounded advisory turns. A lane may
have many operator sessions; the foreground CLI attachment is not session
memory or model authority. No session grants an agent direct mutation authority
or holds the lane mutation lock during model generation. Apply session
proposals only through explicit confirmation, current-state validation, and the
normal effect executor.

## Architecture (two layers)

```text
wt (TypeScript CLI)     commands, discovery, decision routing/validation
        │
        ▼ invokes bounded actions
lane runtime (shell)    watcher, launchers, effect journals, state projections
        │
        ▼ invokes short-lived cycles
tmux/CLI agents         implementers, reviewers, coordinator decision agents
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

Project ecosystem: **`1.0.0-alpha`** (`nira.json` → `ecosystem.version`).

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
4. Update `docs/spec/v1.md` command table if the command is spec-defined

## Lane path conventions (target projects)

Watchtower-owned lane root:

```text
<control-home>/.watchtower/lanes/<lane-slug>/
```

Key files: `lane.json`, `install.json`, `lane.config.env`,
`repositories.local.json`, `state/coordinator-lane-state.txt`, and
`state/worker-events.jsonl`. Coordinator routing, bounded cycle artifacts,
decision/effect journals, and projections live under `coordinator/`.

One repository may participate in many lanes; one lane may bind many
repositories but has exactly one control home. Home discovery walks up from
`cwd`; secondary-repository discovery uses the validated user-local membership
index.

## Non-negotiable rules

- **Never commit** `dist/`, `build/`, `node_modules/`, `.nira/local/`,
  `.watchtower/`
- **Keep specs in sync** — update `docs/spec/v1.md` when adding or changing commands
- **Prefer foundation modules** over duplicating path/discovery logic in commands
- **Delegate to shell scripts** for tmux/lane operations until TypeScript rewrites are justified
- **Match Nirvana CLI patterns** — `@nirvana/base/cli`, NVB for build/dist, colon tasks in runtime-nvb

## Source of truth for coordinator behavior

Lane coordination rules (wake checklist, reject triage, push on accept) live in
`implementation-lane-coordinator` docs/playbook and skill until watchtower ships
equivalent bundled docs. Import them auditably into the versioned knowledge pack.
Do not encode semantic coordinator judgment in CLI code. Mechanical routing,
typed proposal validation, and bounded effects follow
`docs/spec/coordinator-automation.md`.
Operator-session semantics follow `docs/spec/operator-session.md`;
foreground UI attachments follow `docs/spec/cli-session.md`.

## Spec workflow

- `docs/spec/v1.md` is the living product spec
- Mark sections ✅ / ⏳ / ❌ as features land
- Breaking path or command changes require a spec update in the same PR
