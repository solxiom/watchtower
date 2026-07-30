# Watchtower

**Watchtower** (`wt`) is a CLI for managing **implementation lanes** —
multi-batch agent workflows with tmux implementers, reviewers, coordinators, and lane state.

It replaces the copy-into-project bootstrap model used by
[implementation-lane-coordinator](https://github.com/kavan/implementation-lane-coordinator)
with a **global tool + per-lane execution overlay**:

- install `wt` once on your machine
- run `wt init` inside any implementation repo
- operate lanes with `wt watch`, `wt status`, `wt upgrade`, and related commands

Coordinator **agents** (Codex, Cursor, etc.) still own semantic judgment.
Watchtower is the deterministic control plane: init, discovery, packaging,
upgrades, zero-token event routing, bounded decision context, proposal
validation, bounded operator session, and safe effect execution.

## Status

Early development. The scaffold comes from `nira init:cli`; product commands and lane
integration are spec-driven work in progress.

**Ecosystem:** pinned to `1.0.0-alpha` in `nira.json` (Nirvana shared store).

Start with the [v1 product specification](docs/spec/v1-draft.md), then read the
[architecture baseline](docs/spec/architecture.md) and
[delivery roadmap](docs/spec/roadmap.md). The proposed multi-architect
accepted-spec to implementation-pack workflow is defined separately in the
[pack-design process draft](docs/spec/pack-design-draft.md). The subsequent
quality-first capability discovery, endpoint onboarding, and account-capacity
planning phase is defined in the
[allocation-planning draft](docs/spec/allocation-planning-draft.md). The v1
coordinator execution contract is defined in the
[coordinator-automation draft](docs/spec/coordinator-automation-draft.md), and
the v1 bounded multi-turn operator interface is defined in the
[operator-session draft](docs/spec/operator-session-draft.md), and its polished
foreground terminal contract is defined in the
[CLI session draft](docs/spec/cli-session-draft.md).

## Quick start (development)

```sh
git clone <repo-url> ~/Projects/watchtower
cd ~/Projects/watchtower
npm install
nvb build
nvb test
```

Run locally after build:

```sh
node build/src/cli.js hello
node build/src/cli.js help
```

Package and install globally:

```sh
nvb dist
npm install -g ./dist
wt help
```

## Project layout

```text
bin/wt.js              npm bin shim → dist/src/cli.js
src/
  cli.ts               thin outer host
  run.ts               CLI runtime (makeCLI)
  commands/            wt subcommands (BaseCommand)
  foundation/          shared internals (discovery, paths, lane IO)
  contracts/           public types
help/                  static help fragments
runtime-nvb/           NVB tasks shipped inside dist/
config/                default JSON5 config
docs/spec/             product specification
spec/                  Jasmine tests
nvb.json               build / test / dist pipeline
nira.json              Nira CLI project marker
```

## Build commands

| Command     | Description                          |
|-------------|--------------------------------------|
| `nvb build` | Compile TypeScript → `build/`        |
| `nvb test`  | Build specs and run Jasmine          |
| `nvb clean` | Remove `build/`                      |
| `nvb dist`  | Produce self-contained package in `dist/` |

Use **nvb** for this repo's own build loop. You do not need `nira build` when working
inside watchtower unless you explicitly want Nira lifecycle forwarding.

## Relationship to implementation-lane-coordinator

| implementation-lane-coordinator | watchtower |
|---------------------------------|------------|
| Template copied into `.local/.../coordinator/` | Global CLI + `.watchtower/lanes/<slug>/` local overlay |
| `./bin/init-lane.sh <workspace> ...` | `wt init <lane-slug> ...` (planned) |
| Scripts live in each project | Canonical scripts bundled with `wt` install |
| Docs/playbook in template repo | Shipped with watchtower; referenced by lane config |

Watchtower will absorb and evolve the coordinator shell runtime. The coordinator **skill**
and decision rules remain portable agent instructions; watchtower owns **installation,
paths, upgrades, and operator commands**.

Watchtower starts with new work. Existing copied-template coordinator lanes are
not discovered, imported, or upgraded; create a new `wt` lane for the next
implementation effort.

One repository may participate in many active lanes, and one lane may bind
multiple repositories while keeping exactly one authoritative control home.
Accepted implementation packs stay committed; model allocation, prompts,
reports, events, budgets, and logs stay inside the local lane overlay.

## Read first

1. [docs/spec/v1-draft.md](docs/spec/v1-draft.md) — normative v1 product contract
2. [docs/spec/architecture.md](docs/spec/architecture.md) — architecture and boundaries
3. [docs/spec/roadmap.md](docs/spec/roadmap.md) — phased delivery plan
4. [docs/spec/pack-design-draft.md](docs/spec/pack-design-draft.md) — spec-to-pack process
5. [docs/spec/allocation-planning-draft.md](docs/spec/allocation-planning-draft.md) — pack-to-endpoint allocation process
6. [docs/spec/coordinator-automation-draft.md](docs/spec/coordinator-automation-draft.md) — v1 decision routing and effect safety
7. [docs/spec/operator-session-draft.md](docs/spec/operator-session-draft.md) — v1 operator session and confirmed effects
8. [docs/spec/cli-session-draft.md](docs/spec/cli-session-draft.md) — v1 foreground session attachment and terminal UX
9. [AGENTS.md](AGENTS.md) — guidance for AI agents working in this repo

## License

See LICENSE.txt (when present).
