# Watchtower operator quick start

This guide covers **new-lane** operation with the globally installed `wt` CLI.
Copied-template implementation-lane-coordinator lanes are **not** discovered,
imported, or upgraded. Start a fresh lane for each new implementation effort.

## Prerequisites

- Node.js `>=26.4.0` (see `package.json` engines)
- Nirvana ecosystem `1.0.0-alpha` for building from source
- A Git repository that will host the lane control home
- A committed, accepted, sealed implementation pack in that repository

## Install Watchtower

From a built checkout:

```sh
nvb dist
npm install -g ./dist
wt version --json
```

Confirm `cliVersion`, `runtimeVersion`, and `knowledgeVersion` are present.
Use the reported `runtimeVersion` (currently `0.1.0` for the packaged tree) in
the `--runtime=` flag below — it must match `dist/runtime/manifest.json` after
`nvb dist`.

## Prepare the control home

1. Clone or open the repository that owns the implementation pack.
2. Ensure `/.watchtower/` is listed in `.gitignore` (or pass `--update-gitignore` on init).
3. Prepare `scope.json` and `routing.json` paths referenced by init (see your pack's bootstrap docs).

## Create a lane

```sh
wt init <lane-slug> \
  --tmux-prefix=<prefix> \
  --impl-pack=<path-to-pack> \
  --coordinator-routing=<path-to-routing.json> \
  --scope=<path-to-scope.json> \
  --runtime=0.1.0
```

The `--runtime` value must equal the `runtimeVersion` field from `wt version
--json` and from `dist/runtime/manifest.json` in the package you installed.

Use `--dry-run` first to preview files, bindings, and index entries without writing.

Init refuses unaccepted, unsealed, uncommitted, or critically drifted packs.

## Operate the lane

| Task | Command |
|------|---------|
| List lanes for this repo | `wt list` |
| Health and conflicts | `wt status --lane=<slug>` |
| Resolved paths and config | `wt config show --lane=<slug>` |
| Validate without repair | `wt doctor --lane=<slug>` |
| Foreground watcher | `wt watch --lane=<slug>` |
| Preview runtime upgrade | `wt upgrade --lane=<slug>` |
| Install coordinator skill | `wt skill install cursor` |

Run `wt help` or `wt help <command>` for usage details.

## Coordinator workflow

1. Start tmux implementer/reviewer sessions using your pack's dispatch conventions.
2. Use `wt coordinator session --topic="…"` to open a bounded operator session when needed.
3. Inspect ready work with `wt batch ready` and durable events with `wt events tail`.
4. Apply confirmed proposals only through `wt coordinator session apply …` after explicit confirmation.

Semantic accept/reject judgment remains with reviewer agents. Watchtower routes
mechanical work, validates proposals, and executes effects through one bounded
executor.

## Multi-repository lanes

Pass `--scope` with logical repository IDs and local paths. Writable conflicts
require dedicated worktrees unless an explicit unsafe override is documented in
your pack. See [v1.md §7](spec/v1.md) for binding rules.

## Unsupported legacy lanes

Directories created by copying `implementation-lane-coordinator` templates into
`.local/.../coordinator/` are outside Watchtower discovery. Do not attempt to
import them; create a new `wt init` lane instead.

## Next reading

- [v1 product specification](spec/v1.md)
- [v1.0.0 release notes](release-notes/v1.0.0.md)
- [coordinator automation spec](spec/coordinator-automation.md)
- [operator session spec](spec/operator-session.md)
