# Watchtower — Agent Instructions

You are working on **watchtower** (`wt`), a Nirvana-ecosystem CLI that manages
implementation lanes (multi-batch agent workflows).

Read this file first, then the specification at `docs/spec/v1.md` and the
mandatory engineering/review policy at
`docs/development/engineering-and-review-standard.md`. Runtime and facade
choices follow `docs/spec/nirvana-integration-architecture.md`.

## Mission

Build a **global CLI** that:

1. Initializes lane runtime in target projects without copying the full template tree
2. Discovers active lanes from the current working directory
3. Bundles the NVB task runtime, audited leaf executables, docs references, and upgrade paths
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

## Architecture

```text
wt CLI                   selection, policy, validation, planning, presentation
  │
  ▼ invokes allowlisted internal actions
lane task runtime        immutable packaged NVB catalog + focused TaskHandlers
  │
  ▼ invokes bounded capabilities
Nirvana/leaf adapters    storage, logger, cmd, durable stores, tmux/Git/agent leafs
  │
  ▼
tmux/CLI agents          implementers, reviewers, coordinator decision agents
```

The effective task profile is pinned per lane. Watchtower never modifies a
participating repository's root `nvb.json`; workflow-level shell scripts are
rejected in favor of NVB task composition.

## Repo layout conventions

| Path | Purpose |
|------|---------|
| `src/commands/` | One `*Command.ts` per `wt` subcommand; extend `BaseCommand` |
| `src/foundation/` | Discovery, path resolution, lane config IO, script delegation |
| `src/contracts/` | Public types shared across commands |
| `help/commands/` | Help fragment per command |
| `runtime-nvb/` | Immutable internal NVB task catalog and focused handlers shipped in `dist/` |
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
- **Use packaged NVB tasks** for substantial deterministic workflows; retain
  shell only as an audited leaf adapter where no conforming Nirvana API exists
- **Match Nirvana CLI patterns** — `@nirvana/base/cli`, NVB for build/dist, colon tasks in runtime-nvb
- **Never edit project NVB config** — lane task profiles select only from the
  checksum-verified Watchtower runtime catalog
- **Use Nirvana first** — inspect pinned Nirvana packages and comparable Nira
  usage before using bare Node APIs or implementing infrastructure locally
- **Reject structural debt** — working behavior does not excuse god objects,
  oversized modules, mixed responsibilities, layer violations, or generic
  helper bags
- **Apply the mandatory reviewer gates** in
  `docs/development/engineering-and-review-standard.md`; known failures cannot
  be accepted with a follow-up promise

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
