# Watchtower v1 — Product Specification

Status: **Draft**
Target release: `1.0.0`
CLI bin: `wt`
Ecosystem: Nirvana (`@nirvana/base`, `@nirvana/builder`, `nvb`)
Last updated: 2026-07-30

This document is normative for v1 behavior. The broader architecture and
post-v1 direction live in [architecture.md](architecture.md), and delivery
sequencing lives in [roadmap.md](roadmap.md).

## 1. Product statement

Watchtower is the local control plane for agent-assisted development lanes.
It turns the proven `implementation-lane-coordinator` template into a
discoverable, upgradeable, globally installed Nirvana CLI while retaining its
shell runtime and provider-neutral coordinator guidance.

The v1 release supports one lane kind: `implementation`.

Watchtower:

- installs and versions the lane runtime;
- initializes new lane workspaces;
- discovers lanes from any directory within a workspace;
- reports operator-facing lane health and progress;
- invokes watcher and runtime entrypoints safely;
- installs the coordinator knowledge pack for supported agent hosts; and
- upgrades managed assets without overwriting lane-owned state or prose.

Watchtower is not the coordinator agent. It does not interpret acceptance,
triage rejects, select the next batch, or create acceptance commits.

## 2. Problem

The current `implementation-lane-coordinator` workflow is effective, but its
installation model is not a product:

- roughly 30 scripts and briefs are copied into each target repository;
- there is no manifest distinguishing managed files from operator edits;
- template additions can be omitted from the copy list;
- fixes do not reach existing lanes through a controlled upgrade;
- runtime files, durable lane intent, generated logs, and committed
  implementation packs are mixed together;
- active-lane selection depends on remembering long paths;
- each live lane grows custom launch wrappers and recovery files; and
- shell state is observable only by reading several files and tmux panes.

The SQL backends lane also demonstrates that a lane can grow after bootstrap:
its original 22 batches became 30. Batch count and plan shape therefore cannot
be frozen into generated launch wrappers or install-time assumptions.

## 3. Goals and non-goals

### 3.1 v1 goals

1. Install `wt` once and operate many implementation lanes across many
   repositories and worktrees.
2. Keep the canonical runtime outside target projects in an immutable,
   versioned runtime store.
3. Materialize only a structured local execution overlay and managed runtime
   links in each lane.
4. Discover a lane deterministically without hidden interactive behavior.
5. Establish a clean managed-lane contract without importing copied-template
   lanes or their historical drift.
6. Preserve the current shell runtime and coordinator knowledge as the
   behavioral source of truth.
7. Expose stable human and JSON output for status and automation.
8. Make upgrades explicit, previewable, and non-destructive.
9. Support one repository participating in many lanes and one lane binding
   multiple repositories with exactly one control home.
10. Detect unsafe concurrent writable-worktree conflicts before dispatch.

### 3.2 v1 non-goals

- Acting as an autonomous coordinator or replacing Codex/Cursor coordination.
- Rewriting the coordinator state machine in TypeScript.
- Authoring implementation specs or deciding how work should be batched.
- A terminal dashboard, web service, cloud control plane, or team server.
- CI/headless execution without tmux.
- A general plugin system or user-defined lane kinds.
- Downloading models or large speech assets automatically.
- Treating tmux scrollback prose as an authoritative lifecycle protocol.

Post-v1 planning and daily-development capabilities are described in the
roadmap, but they must build on the v1 lane model rather than bypass it.

## 4. Product vocabulary

| Term | Definition |
|------|------------|
| Repository | Logical version-controlled project, independent of any one checkout path. |
| Workspace | One local checkout or Git worktree bound to a repository. |
| Initiative | Product effort relating one or more lanes, such as pack design followed by implementation. |
| Lane | A named, bounded workflow with one control home and one or more repository bindings. |
| Control home | Workspace containing the authoritative `.watchtower/lanes/<slug>/` execution directory. |
| Participating repository | Additional repository read or changed by a lane. |
| Lane kind | Workflow contract implemented by a runtime; v1 has only `implementation`. |
| Implementation pack | Committed briefs, tracker, roadmap, work/review batches, and structural metadata owned by a declared pack repository. |
| Lane directory | Local, uncommitted execution overlay under `.watchtower/lanes/<slug>/`. |
| Runtime | Versioned shell scripts invoked by Watchtower and the coordinator. |
| Knowledge pack | Bundled playbook, guides, state-machine reference, skill, and host adapters. |
| Worker | Implementer or reviewer agent running in a tmux session. |
| Operator | Human using `wt` and directing the coordinator. |
| Coordinator | Agent applying the bundled coordinator policy to the lane. |

## 5. Product boundary

```text
operator
   │
   ▼
wt TypeScript CLI
   ├── discovery, validation, rendering, install and upgrade
   ├── invokes a named runtime action
   └── never chooses a coordinator transition
          │
          ▼
versioned shell runtime
   ├── watcher, launchers, event writer, tmux helpers
   └── reads/writes lane-local state and observations
          │
          ▼
coordinator + implementer/reviewer agents
   └── apply the bundled knowledge pack and committed implementation pack
```

The canonical coordinator decision rules remain the source of truth from
`implementation-lane-coordinator` until they are copied into Watchtower as one
versioned knowledge pack. Watchtower must bundle them verbatim or by an
auditable import process; it must not independently restate a divergent
coordinator policy in CLI code.

## 6. Ownership model

Every lane artifact has exactly one ownership class.

| Class | Examples | Upgrade behavior |
|-------|----------|------------------|
| Project-owned, committed | accepted implementation pack, work/review/correction briefs, traceability, roadmap, implementation tracker | Never created or changed by runtime upgrade |
| Lane-owned, durable | `lane.config.env`, `repositories.local.json`, `model-plan.md`, lane state, operator tracker | Create once; never overwrite |
| Watchtower-managed | `lane.json`, `install.json`, `bin/` runtime links, managed policy links | Validate and replace according to manifest |
| Runtime-generated | reports, prompts, logs, locks, watcher state, worker events, budgets, assistant responses | Preserve; may be pruned only by an explicit future command |

An upgrade must stop with a conflict if a Watchtower-managed path was replaced
by an unrecognized regular file. `--force` must not silently overwrite it.
Resolution is a manual operator action outside Watchtower.

## 7. Filesystem contract

### 7.1 Global runtime store

The npm package is a distribution source, not the active runtime location.
The Watchtower data root is `WATCHTOWER_DATA_HOME` when set, otherwise
`${XDG_DATA_HOME}/watchtower`, otherwise `~/.local/share/watchtower`. On first
use of a packaged runtime version, Watchtower stages it into:

```text
<watchtower-data-root>/
  runtimes/
    <runtime-version>/
      manifest.json
      coordinator/*.sh
  knowledge/
    <knowledge-version>/
      playbook.md
      guides/
      skill/
      adapters/
  index/
    repository-memberships.json
```

Runtime version directories are immutable. Installing a newer `wt` does not
change the runtime used by a lane until `wt upgrade` changes that lane's
install manifest and links. Old versions remain usable until a future explicit
prune command.

The store is writable only by its owning operator account. Staged directories
and documentation must be readable/traversable by configured worker accounts,
and runtime entrypoints must be readable and executable, but never writable,
by those accounts. `WATCHTOWER_DATA_HOME` supports a deliberately shared local
location when the operator's home directory is not traversable. `wt doctor`
must verify access as every configured account before a lane starts.

The repository-membership index is advisory local discovery metadata. It maps
canonical participating worktree paths to authoritative lane homes. A
`lane.json` plus matching local repository binding always wins; stale index
entries are ignored and reported.

### 7.2 Per-workspace layout

```text
<control-home>/
  docs/.../implementation/<pack-version>/     # pack-repository-owned, committed
    implementation-pack.json
    implementation-pack.lock.json
    requirements-traceability.md
    implementation-map.md
    implementation-tracker.md
    implementation-roadmap.md
    work-batches/
    review-batches/

  .watchtower/
    lanes/
      <lane-slug>/
        lane.json                             # authoritative lane marker
        install.json                          # managed runtime/knowledge record
        lane.config.env                       # shell compatibility config
        repositories.local.json               # logical repo → local worktree bindings
        model-plan.md                         # local account/model allocation
        operator-tracker.md                   # local operational view
        briefs/                               # lane-specific coordinator/worker briefs
        bin/                                  # managed runtime/policy links
        state/                                # lane state, events, locks, watcher state
        prompts/                              # generated thin runtime envelopes
        reports/                              # worker/reviewer reports
        budgets/                              # allocation plan and usage ledger
        logs/
```

The entire `.watchtower/` tree is local execution state and must be ignored by
Git. `wt init` fails preflight unless `/.watchtower/` is ignored, unless the
operator explicitly requests `--update-gitignore`.

The accepted implementation pack remains committed. Runtime prompts reference
canonical briefs rather than copying their content. Model/account routing,
reports, events, budgets, and logs remain local. Watchtower does not provide
pack push/pull because Git is the durable synchronization mechanism.

The structured lane root is intentionally not flat: managed executables,
durable operator configuration, runtime state, prompts, reports, and logs have
separate ownership boundaries.

### 7.3 Lane marker schema

`lane.json` is JSON and owned by Watchtower:

```json
{
  "schemaVersion": 1,
  "laneId": "9d0ee3d2-8833-4fb7-b112-8438f04f57d2",
  "kind": "implementation",
  "slug": "sql-backends",
  "initiativeId": "sql-backends-v1",
  "controlHomeRepository": "nirvana",
  "laneDir": ".watchtower/lanes/sql-backends",
  "implementationPack": {
    "repository": "nirvana",
    "path": "docs/spec/model/sql-backends/implementation/v1"
  },
  "repositories": [
    {"id": "nirvana", "role": "primary", "access": "write"},
    {"id": "renatus", "role": "integration", "access": "read"}
  ],
  "relations": {
    "producedFrom": "1a14c207-03dd-4bc9-b0b1-66940360543e"
  },
  "claims": [
    {
      "repository": "nirvana",
      "paths": ["framework/**", "commons/**"],
      "mode": "exclusive-write"
    }
  ],
  "createdAt": "2026-07-30T12:00:00Z"
}
```

Rules:

- `schemaVersion`, UUID `laneId`, `kind`, `slug`, `initiativeId`,
  `controlHomeRepository`, and at least one repository are required.
- `laneId` is globally stable; a slug is unique only within one control home.
- `slug` must match `^[a-z0-9][a-z0-9-]{0,62}$`.
- repository IDs match `^[a-z0-9][a-z0-9-]{0,62}$` and are unique in the lane.
- exactly one repository ID matches `controlHomeRepository`.
- committed pack paths are repository-relative and cannot escape their binding.
- no absolute machine path is stored in `lane.json`.
- `relations` reference stable lane IDs, not slugs or filesystem paths.
- optional resource claims use logical repository IDs, normalized
  repository-relative globs, and `read`, `shared-write`, or `exclusive-write`.
- Unknown fields are preserved during schema-compatible updates.

### 7.4 Local repository bindings

`repositories.local.json` maps logical repository IDs to this machine:

```json
{
  "schemaVersion": 1,
  "repositories": [
    {
      "id": "nirvana",
      "path": "/home/user/Projects/nirvana-sql-lane",
      "branch": "feature/sql-backends",
      "worktreeMode": "dedicated",
      "role": "primary",
      "access": "write"
    },
    {
      "id": "renatus",
      "path": "/home/user/Projects/renatus",
      "branch": "main",
      "worktreeMode": "shared",
      "role": "integration",
      "access": "read"
    }
  ]
}
```

Paths are absolute, canonicalized, and local-only. A writable repository
binding defaults to `dedicated`; `shared` write access requires an explicit
unsafe override. Committed packs refer only to repository IDs.

### 7.5 Install manifest schema

`install.json` records:

```json
{
  "schemaVersion": 1,
  "cliVersion": "1.0.0",
  "runtimeVersion": "1.0.0",
  "knowledgeVersion": "1.0.0",
  "mode": "linked",
  "managedAssets": {
    "bin/coordinator-watch.sh": {
      "target": "/home/user/.local/share/watchtower/runtimes/1.0.0/coordinator/coordinator-watch.sh",
      "sha256": "..."
    }
  }
}
```

The manifest is the sole authority for which lane paths Watchtower may replace.
All managed assets must be represented in the packaged runtime manifest and the
lane install manifest.

## 8. Lane configuration contract

`lane.config.env` remains the v1 runtime configuration surface for compatibility
with the shell runtime:

```bash
LANE_ID="9d0ee3d2-8833-4fb7-b112-8438f04f57d2"
LANE_SLUG="my-lane"
INITIATIVE_ID="my-feature"
HOME_REPOSITORY_ID="main-repo"
WORKSPACE="/absolute/path/to/control-home-worktree"
TMUX_PREFIX="ml"
IMPL_PACK_REL="docs/spec/domain/my-lane/implementation"
```

Optional runtime settings include watcher intervals, model defaults, account
selection, coordinator host settings, and speech paths. Additional repositories
come from `repositories.local.json`; ad hoc `EXTRA_PUSH_REPOS` is not part of
the Watchtower lane contract.

The TypeScript CLI must parse a strict env-file subset; it must never execute or
`source` configuration:

- blank lines and comments;
- `KEY=value`, with unquoted, single-quoted, or double-quoted scalar values;
- no command substitution, variable expansion, shell operators, or executable
  statements.

The shell runtime may continue sourcing the file in v1. `wt doctor` must reject
config outside the strict subset so a CLI-valid lane and runtime-valid lane
cannot disagree.

`model-plan.md` remains human/agent-authored in v1. The CLI does not parse it or
generate per-batch launch wrappers. Generic launch scripts accept batch,
account, model, and effort at invocation time. Its post-v1 structured
replacement is the implementation-lane phase defined in
[allocation-planning-draft.md](allocation-planning-draft.md).

## 9. Discovery and lane selection

### 9.1 Repository/worktree resolution

Resolution order:

1. `--workspace=<path>`;
2. `git rev-parse --show-toplevel` from the current directory;
3. nearest ancestor containing `.watchtower/lanes`;
4. current directory.

Paths are canonicalized before comparison. A missing explicit workspace is an
error; Watchtower must not create it. `--workspace` identifies a control-home
candidate, not the only repository a lane may use.

### 9.2 Lane discovery

Home-lane discovery inspects only:

```text
.watchtower/lanes/*/lane.json
```

Directories without `lane.json` are not Watchtower lanes. Watchtower does not
scan, inspect, import, or upgrade them.

To discover a lane from a participating secondary repository, Watchtower reads
the advisory user-local index:

```text
<watchtower-data-root>/index/repository-memberships.json
```

The index maps canonical worktree paths to `{laneId, laneHome}` references and
is updated by explicit lane init/binding mutations. It is not authority: every
candidate must resolve to a valid `lane.json` whose repository binding matches
the current canonical path. Stale entries are ignored and reported; read-only
commands never repair the index.

### 9.3 Selection precedence

For a command requiring one lane:

1. explicit `--lane=<lane-id>` exact match;
2. explicit `--lane=<slug>` among lanes relevant to the resolved repository;
3. the lane directory containing the current working directory;
4. the only active relevant lane;
5. the only relevant lane;
6. otherwise fail with an ambiguity error and print lane IDs, slugs,
   initiatives, kinds, and control homes.

There is no implicit interactive picker in v1. This makes shell automation and
agent invocation deterministic. Commands may add an explicit interactive
picker after v1.

## 10. Command-line contract

### 10.1 Global options

| Option | Meaning |
|--------|---------|
| `--workspace=<path>` | Override control-home/repository resolution |
| `--lane=<slug-or-uuid>` | Select a lane by relevant slug or stable ID |
| `--initiative=<id>` | Filter lane listing/selection to one initiative |
| `--json` | Emit one documented JSON value and no decorative text |
| `--no-color` | Disable ANSI color |
| `--verbose` | Include diagnostic details |
| `--help` | Command help |
| `--version` | CLI version |

Errors go to stderr. Normal human or JSON output goes to stdout.

### 10.2 Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Runtime or unexpected operational failure |
| `2` | Invalid command, option, config, or lane schema |
| `3` | Workspace/lane not found or lane selection ambiguous |
| `4` | Missing dependency or failed preflight |
| `5` | Managed-file conflict or unsafe requested mutation |

### 10.3 v1 commands

| Command | Status | Purpose |
|---------|--------|---------|
| `wt init <slug> --tmux-prefix=<prefix> --impl-pack=<path> [--scope=<bindings.json>] [--dry-run]` | ❌ | Create a new implementation lane |
| `wt list` | ❌ | List lanes relevant to the resolved repository |
| `wt status [--lane=<slug-or-uuid>]` | ❌ | Report lane, repositories, conflicts, batch, watcher, tmux, event, and runtime status |
| `wt watch [--lane=<slug-or-uuid>]` | ❌ | Run the lane watcher in the foreground |
| `wt upgrade [--lane=<slug-or-uuid>] [--to=<version>] [--apply]` | ❌ | Preview and apply lane schema/runtime upgrade |
| `wt config show [--lane=<slug-or-uuid>]` | ❌ | Print resolved identity, repositories, paths, and config |
| `wt doctor [--lane=<slug-or-uuid>]` | ❌ | Validate bindings, conflicts, runtime, tools, accounts, and pack |
| `wt skill install <codex\|cursor\|claude> [--scope=<scope>]` | ❌ | Install the bundled coordinator knowledge pack adapter |
| `wt help [command]` | ✅ scaffold | Render static help |
| `wt version` | ❌ | Print CLI, runtime, knowledge, and schema versions |

`hello` is scaffold-only and must be removed before the first public release.

## 11. Command behavior

### 11.1 `wt init`

Required input:

- lane slug;
- `--tmux-prefix`, matching `^[a-z0-9][a-z0-9-]{0,15}$`;
- `--impl-pack`, a path to a committed pack. It may be absolute or
  control-home-relative during invocation; Watchtower persists only the
  manifest's logical repository ID and repository-relative path.

Optional input:

- `--workspace`;
- `--scope=<bindings.json>` for multi-repository local bindings;
- `--runtime=<version>` for an installed compatible runtime;
- `--update-gitignore`;
- `--dry-run`.

Preflight:

1. resolve and validate the control-home repository/worktree;
2. validate slug and prefix;
3. ensure the destination lane does not exist;
4. require `/.watchtower/` to be Git-ignored or explicitly update `.gitignore`;
5. require accepted pack status, reviewer acceptance, valid seal, committed
   pack bytes, initiative, repository IDs, and pack-relative paths;
6. resolve every repository ID through `--scope` or the control-home default;
7. verify canonical paths, branches, access, and worktree modes;
8. classify accepted-input and per-repository source-baseline drift;
9. detect active-lane writable worktree/branch/path conflicts;
10. stage the selected runtime and knowledge versions;
11. show the files, links, local bindings, and index entries to create.

Init never scaffolds or relocates the committed implementation pack. Pack
creation belongs to the pack-design process or project authors.

Creates once:

- stable UUID lane identity, `lane.json`, and `install.json`;
- `repositories.local.json`;
- lane config;
- lane state;
- coordinator/implementer briefs and model-plan template;
- local operator tracker;
- structured state, prompt, report, budget, and log directories;
- `bin/` links for every managed runtime action and policy;
- advisory membership-index entries for all repository bindings.

It must be transactional at the lane-directory level: on failure before the
manifest is committed, remove only paths created by that invocation. It must
not modify a pre-existing destination. There is no v1 `--force` overwrite.

### 11.2 `wt list`

Human output includes lane ID, slug, initiative, kind, control home, repository
count, lane status, active batch, runtime version, and conflict state. `--json`
returns an array, including an empty array when no relevant lanes exist.

`list` is read-only and must not stage runtimes or repair markers.

### 11.3 `wt status`

Status is an observation, not a coordinator transition.

It reports:

- lane ID, slug, initiative, kind, and control home;
- all logical repository bindings, local paths, branches, access, and worktree
  modes;
- lane status and active batch from lane state;
- implementation and review tmux session names and existence;
- watcher status and last heartbeat when available;
- latest valid durable worker event;
- accepted/total batch count when derivable;
- configured, installed, and available runtime versions;
- related pack-design/implementation lanes;
- writable worktree, branch, path, tmux-prefix, and proof-resource conflicts;
- warnings for stale, inconsistent, or incomplete state.

The CLI may derive a health label:

| Health | Meaning |
|--------|---------|
| `ok` | Required files valid; observed runtime matches declared state |
| `attention` | Recoverable mismatch, stale watcher, missing expected tmux, or pending event |
| `complete` | Lane declares completion and no active batch |
| `invalid` | Marker, config, or state cannot be parsed consistently |

Health is not a lifecycle decision and must not mutate state.
An active lane whose committed pack is missing, unsealed, or digest-mismatched
is `invalid`; Watchtower does not continue from a tracker-only summary.

JSON output has a versioned top-level shape:

```json
{
  "schemaVersion": 1,
  "lane": {
    "id": "9d0ee3d2-8833-4fb7-b112-8438f04f57d2",
    "slug": "sql-backends",
    "initiativeId": "sql-backends-v1",
    "kind": "implementation",
    "controlHome": "/path/to/nirvana"
  },
  "repositories": [
    {"id": "nirvana", "access": "write", "worktreeMode": "dedicated"}
  ],
  "lifecycle": {"status": "active", "activeBatch": "22"},
  "health": {"status": "attention", "warnings": []},
  "sessions": {"implementer": null, "reviewer": null},
  "watcher": {"running": false, "lastHeartbeatAt": null},
  "runtime": {"configured": "1.0.0", "available": true}
}
```

New optional fields may be added within schema version 1. Existing fields may
not be removed or change type.

### 11.4 `wt watch`

`watch` validates the lane, exports the runtime invocation context, and `exec`s
the bundled watcher in the foreground. It preserves watcher stdout exactly so
host adapters can match `AGENT_LOOP_WAKE_lane`.

It must not:

- daemonize;
- start a coordinator agent;
- launch workers;
- interpret wake events; or
- convert heartbeats into model wakes.

The managed `bin/start-coordinator-loop.sh` entrypoint remains available for
hosts that need it. Long-running process supervision is outside the TypeScript
CLI in v1.

### 11.5 `wt upgrade`

Default behavior is preview-only. Applying requires `--apply`.

Upgrade order:

1. parse lane and install manifests;
2. select a compatible runtime and knowledge version;
3. validate the new packaged manifest and checksums;
4. stage the immutable runtime if absent;
5. calculate marker schema changes and managed-link changes;
6. stop on unmanaged collisions;
7. atomically update links;
8. write manifests last;
9. print changed, unchanged, preserved, and conflicted paths.

Upgrade never overwrites lane-owned or runtime-generated artifacts.

`--to=<version>` selects an installed or package-provided compatible runtime.
Downgrade requires `--allow-downgrade` and must fail when the lane schema is not
backward compatible.

### 11.6 `wt config show`

Shows resolution sources, control home, initiative/lane identity, logical and
local repository bindings, lane paths, strict-parsed config, runtime location,
and knowledge location. It redacts values whose keys contain `TOKEN`, `SECRET`,
`PASSWORD`, `KEY`, or `CREDENTIAL`.

`--json` preserves redaction and identifies redacted keys.

### 11.7 `wt doctor`

Checks are grouped and each returns `pass`, `warn`, `fail`, or `skip`:

- control home and participating-repository access;
- marker/config/state schema;
- repository ID/path/branch/worktree consistency;
- concurrent active-lane write and tmux-prefix conflicts;
- implementation-pack structure;
- runtime manifest, links, executability, and checksums;
- `bash`, `git`, `tmux`, `jq`, `flock`, and `rg`;
- configured OS accounts and their resolved CLIs;
- active tmux naming consistency;
- Git ignore coverage for `/.watchtower/`;
- optional speech stack.

Core dependency or schema failures produce exit code 4. Optional speech checks
are warnings. Doctor is read-only in v1; repair must be an explicit init or
upgrade action.

### 11.8 `wt skill install`

Installs the bundled, version-matched knowledge pack using a host adapter.
Supported v1 hosts are Codex, Cursor, and Claude. The command:

- previews destination and files;
- requires explicit overwrite confirmation through `--replace` in
  non-interactive contexts;
- records the installed knowledge version where the host permits; and
- does not embed lane-specific state in a personal skill.

Provider-specific wake wiring remains documented in the adapter; Watchtower
does not claim a host notification is configured unless it verifies it.

## 12. Runtime invocation contract

Foundation code invokes runtime actions through one adapter and exports:

```text
WT_WORKSPACE
WT_LANE_ID
WT_INITIATIVE_ID
WT_LANE_SLUG
WT_LANE_DIR
WT_HOME_REPOSITORY_ID
WT_REPOSITORIES_FILE
WT_ACTIVE_REPOSITORY_ID
WT_RUNTIME_ROOT
WT_RUNTIME_VERSION
WT_KNOWLEDGE_ROOT
```

Bundled scripts use `WT_LANE_DIR` for the structured local overlay,
`WT_REPOSITORIES_FILE` for local repository bindings, and `WT_RUNTIME_ROOT` for
managed runtime assets. Scripts must not reconstruct `.watchtower` paths,
assume the control home is the only repository, or use hardcoded
`.local/agent-reports` paths.

Worker launch actions resolve the batch's `primaryRepository` through the
committed pack and local bindings, start the agent in that worktree, and export
it as `WT_ACTIVE_REPOSITORY_ID`. The prompt still exposes every declared
repository binding needed by the batch.

The package runtime manifest declares:

- runtime and minimum CLI versions;
- every managed asset and checksum;
- executable bit;
- supported actions;
- required external commands; and
- compatible lane schema versions.

Runtime subprocesses inherit stdin/stdout/stderr for interactive commands.
Watchtower must print the resolved command only with `--verbose`; it must not
log secrets or entire environment maps.

## 13. State and event compatibility

The v1 runtime continues to use:

- `state/coordinator-lane-state.txt` for coordinator-maintained lane state;
- `state/worker-events.jsonl` for authoritative worker lifecycle events;
- tmux only for presence and recovery observations; and
- heartbeat/watcher files for liveness.

The CLI strictly parses state as scalar `key=value` records and never sources
it. Unknown keys are preserved and surfaced under verbose/JSON diagnostics.

Status normalizes compatible raw state into:

```text
bootstrap | active | paused | complete | unknown
```

An explicit recognized `lane_status` is required. Missing or contradictory
state, such as `complete` plus an active batch, is reported as
`unknown`/`invalid`; Watchtower does not repair it.

The durable worker event vocabulary remains:

```text
handoff | blocked | accept | reject
```

Each record must include `id`, `at`, `event`, `role`, `batch`, and `session`.
Malformed or role-incompatible records are ignored for status derivation and
reported as warnings.

For a reviewer `accept` event, `commits` is a map from every writable
repository ID changed by the batch to its reviewer-owned acceptance commit:

```json
{
  "event": "accept",
  "batch": "FRAME-D",
  "commits": {
    "awrux": "abc123...",
    "ux-dev-server": "def456..."
  }
}
```

The acceptance pipeline verifies and pushes each commit independently and
records a per-repository push journal. Git repositories do not form an atomic
transaction: partial success is a recoverable state, not a reason to recreate
commits or claim the batch is fully published.

Coordinator transitions, reject triage, acceptance verification, push-on-
accept, and next-batch dispatch belong to the bundled coordinator knowledge
pack and shell runtime. They are deliberately not re-specified here.

## 14. Safety and concurrency

- Mutating lane commands acquire `.watchtower/lanes/<slug>/state/lane.lock`
  with `flock`.
- Manifest and state writes use temp-file-plus-atomic-rename in the same
  filesystem.
- Read-only commands tolerate a busy lock and report that a mutation is active.
- No command kills tmux unless a specifically documented runtime action is
  invoked by the operator or coordinator.
- `init` and `upgrade` reject paths escaping a declared repository binding,
  lane directory, or runtime store after symlink resolution.
- Runtime checksum validation occurs before executable assets are staged.
- `.watchtower/` artifacts are never added to Git by Watchtower.
- Concurrent active lanes cannot silently share a writable worktree. Dedicated
  worktrees are the default; a shared-write override is explicit, warned on
  every status/doctor run, and never implies path isolation.
- Commands that push Git state remain delegated runtime actions and are never
  triggered by `status`, `doctor`, `init`, or `upgrade`.

## 15. Packaging

`nvb dist` must produce a package containing:

```text
dist/
  bin/wt.js
  src/
  help/
  runtime/
    manifest.json
    coordinator/
  knowledge/
    manifest.json
    playbook.md
    guides/
    skill/
    adapters/
  runtime-nvb/
  package.json
```

Build validation must compare the packaged manifests with actual files and
fail on missing, extra, non-executable, or checksum-mismatched managed assets.
This closes the legacy failure where new scripts were omitted from an init copy
list.

NVB tasks:

| Task | Purpose |
|------|---------|
| `wt:runtime:validate` | Validate packaged runtime and knowledge manifests |
| `wt:pack:runtime` | Stage runtime and knowledge into `dist` |
| `wt:lane:inspect` | Emit read-only lane diagnostics for build tooling |

NVB tasks are packaging/automation entrypoints, not alternate product commands.

## 16. Compatibility and support boundary

### 16.1 Supported lanes

Watchtower manages only lanes initialized by `wt` and carrying a valid
`.watchtower/lanes/<slug>/lane.json` plus `install.json`. Copied-template lanes
created by `implementation-lane-coordinator` are outside the product boundary:

- they are not discovered by `wt list`;
- they are not inspected by `wt status` or `wt doctor`;
- they cannot be upgraded or imported; and
- their files are never modified by Watchtower.

Operators begin new work with a new `wt init` lane. Copied-template directories
elsewhere do not reserve Watchtower slugs. If `.watchtower/` has an
unrecognized layout or the requested Watchtower lane destination already
exists, init fails without changing it.

### 16.2 Script names

Existing coordinator script names remain available under the managed lane
`bin/` directory where the v1 shell runtime still uses them. Product commands
and generated prompts must prefer `wt` actions or `$WT_LANE_DIR/bin/...`.

## 17. Release acceptance

v1 is complete only when:

- [ ] `nvb dist` packages a globally installable `wt`;
- [ ] package manifests prove every bundled runtime and knowledge asset;
- [ ] `wt init` creates a usable lane without copying the runtime tree;
- [ ] `wt init` refuses an unaccepted, unsealed, uncommitted, or critically
      drifted implementation pack;
- [ ] lane discovery works from control-home descendants, lane directories,
      and registered participating repositories;
- [ ] one repository can participate in multiple active lanes without slug or
      state collision;
- [ ] one lane can bind multiple repositories and record per-repository
      acceptance commits;
- [ ] concurrent writable bindings are rejected or explicitly isolated with
      dedicated worktrees;
- [ ] ambiguous multi-lane selection fails with actionable candidates;
- [ ] `wt status --json` is stable and covered by contract tests;
- [ ] `wt watch` preserves wake/heartbeat stdout and signal exit behavior;
- [ ] `wt doctor` detects missing dependencies, broken links, unsafe config,
      and missing implementation-pack structure;
- [ ] `wt upgrade --apply` changes only manifest-owned paths and can retain the
      old runtime on failure;
- [ ] coordinator knowledge is bundled and installable for Codex, Cursor, and
      Claude;
- [ ] a fresh lane completes one implementer → reviewer → accept cycle using
      the bundled runtime;
- [ ] copied-template lanes are ignored and never modified;
- [ ] help and product docs match every shipped command; and
- [ ] no build, dist, node_modules, `.nira/local`, or target-project `.watchtower`
      artifact is committed.

## 18. Decisions fixed for v1

| Decision | Outcome |
|----------|---------|
| Package name | Use `@nirvana/watchtower` for publication; retain `wt` bin. The repository may keep its current private package name until publication work. |
| Lane marker | `.watchtower/lanes/<slug>/lane.json` with stable UUID identity. |
| Lane cardinality | Repository↔Lane is many-to-many; every lane has exactly one control home. |
| Multi-lane selection | Deterministic lane ID/slug/context rules; no implicit picker. |
| Multi-repo bindings | Logical IDs in lane/pack metadata; machine paths in `repositories.local.json`. |
| Writable concurrency | Dedicated worktrees by default; shared-write requires explicit unsafe override. |
| Runtime install | Immutable XDG runtime store with version-pinned lane links. |
| Default install mode | `linked`; copied runtimes and lane import are unsupported. |
| Pack ownership | Accepted design pack committed; execution overlay local under `.watchtower/`. |
| Ops tracker | `.watchtower/lanes/<slug>/operator-tracker.md`. |
| Piper assets | Operator-supplied optional dependency; never bundled or auto-downloaded in v1. |
| Account defaults | No hardcoded personal usernames; init uses neutral placeholders or explicit input. |
| Lane kinds | `implementation` only in v1; the first specified post-v1 kind is [`pack-design`](pack-design-draft.md). Allocation planning is a phase of an implementation lane, not another kind. |

## 19. Deferred questions

These do not block v1:

1. Should a future workspace registry declare lanes intended for teammates even
   though runtime state remains local?
2. When should JSON replace shell state as the runtime write model?
3. Should a future portfolio view discover lanes across workspaces through an
   explicit user registry?
4. When should the built-in lane-kind contract become a supported public plugin
   interface?
