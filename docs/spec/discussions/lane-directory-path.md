# Decision: Lane Directory Path Convention

Status: **Resolved**
Decision date: 2026-07-30
Outcome: **`.watchtower/lanes/<slug>/` with a structured execution overlay**
Related:

- `docs/spec/v1-draft.md` §§ 4, 7–9, 12, 14
- `docs/spec/architecture.md` §§ 3, 5–6, 12
- `docs/spec/pack-design-draft.md` § 10

## Context

The inherited path:

```text
.local/agent-reports/<slug>/coordinator/
```

describes reports even though it contains configuration, state, scripts,
events, prompts, logs, and coordinator runtime. The `coordinator/` nesting also
prevents the same lane root from cleanly supporting other lane kinds.

Watchtower starts with new work only. It does not discover, import, relocate,
or upgrade copied-template lanes, so there is no compatibility reason to keep
the inherited path.

## Decision

Every Watchtower lane has one authoritative control home:

```text
<control-home>/.watchtower/lanes/<slug>/
```

The lane root is structured rather than flat:

```text
.watchtower/lanes/<slug>/
  lane.json                    # authoritative identity and logical scope
  install.json                 # runtime/knowledge binding and managed assets
  lane.config.env              # strict shell compatibility projection
  repositories.local.json      # logical repo IDs → machine worktree paths
  model-plan.md                # local account/model routing
  operator-tracker.md          # local operational notes
  briefs/                      # lane-specific coordinator/worker overlays
  bin/                         # managed runtime and policy links
  state/                       # lifecycle, events, locks, watcher observations
  prompts/                     # generated thin runtime envelopes
  reports/                     # local worker/reviewer/architect reports
  budgets/                     # allocation plan and usage ledger
  logs/
```

The namespace is fixed in the first release; no configurable lane root.

## Marker names

Inside an already Watchtower-owned namespace, repeated hidden names add no
clarity. Therefore:

- lane marker: `lane.json`;
- install manifest: `install.json`;
- discovery glob: `.watchtower/lanes/*/lane.json`;
- lane runtime root: `WT_LANE_DIR=.watchtower/lanes/<slug>`.

Slugs are unique only within one control home. `laneId` is a stable UUID and is
the cross-home/cross-repository identity.

## Git boundary

The entire `.watchtower/` tree is local and must be ignored:

```gitignore
/.watchtower/
```

`wt init` fails preflight unless the path is already ignored, unless the
operator explicitly requests `--update-gitignore`. Watchtower never stages or
commits lane-local files.

If `.watchtower/` already exists with an unrecognized layout or ownership
marker, init fails without taking it over.

## Multi-lane cardinality

A repository can participate in any number of active lanes:

```text
.watchtower/lanes/
  route-groups-pack-design/
  route-groups-v2-implementation/
  forms-maintenance/
```

Lane directories are independent. Lane selection uses stable ID, relevant
slug, current path, initiative, and active status. Ambiguity is an error rather
than an implicit picker.

## Multi-repository lanes

A lane may bind one or many repositories but has exactly one control home.
`lane.json` stores logical membership:

```json
{
  "laneId": "9d0ee3d2-8833-4fb7-b112-8438f04f57d2",
  "initiativeId": "route-groups-v2",
  "controlHomeRepository": "awrux",
  "repositories": [
    {"id": "awrux", "role": "primary", "access": "write"},
    {"id": "ux-dev-server", "role": "integration", "access": "write"},
    {"id": "public-ux", "role": "consumer-proof", "access": "read"}
  ]
}
```

`repositories.local.json` binds those IDs to canonical local paths, branches,
and worktree modes. Committed documents never contain those machine paths.

## Discovery from participating repositories

Home discovery uses the shallow lane glob. Secondary-repository discovery uses
the advisory user-local index:

```text
<watchtower-data-root>/index/repository-memberships.json
```

Index entries point to an authoritative lane home. They are accepted only when
the target `lane.json` exists and its local repository binding matches the
current canonical worktree path. Stale entries are reported and ignored.
Read-only commands do not silently repair the index.

This is not a committed workspace registry and does not advertise lanes to
teammates. It is local discovery acceleration.

## Runtime path contract

Bundled scripts receive:

```text
WT_LANE_ID
WT_INITIATIVE_ID
WT_LANE_SLUG
WT_LANE_DIR
WT_HOME_REPOSITORY_ID
WT_REPOSITORIES_FILE
WT_RUNTIME_ROOT
WT_KNOWLEDGE_ROOT
```

Scripts must not reconstruct lane paths or assume the control home is the only
repository. Managed script links live under `bin/`; product commands and
generated prompts prefer `wt` actions or `$WT_LANE_DIR/bin/...`.

## Concurrent write safety

Many lanes may reference the same logical repository, but concurrent writes to
one checkout can invalidate source and proof.

Repository bindings declare:

```text
access       = read | write
worktreeMode = shared | dedicated
branch       = <branch>
```

Rules:

- read-only lanes may share a worktree;
- writable bindings default to dedicated Git worktrees;
- shared-write mode requires explicit unsafe operator override;
- `wt status` and `wt doctor` report worktree, branch, path-claim,
  tmux-prefix, and proof-resource conflicts;
- a shared-write override never implies that paths are safely isolated.

## Tracker placement

There are two different trackers:

- committed `implementation-tracker.md` inside the accepted design pack;
- local `operator-tracker.md` inside the lane execution overlay.

They serve different authorities and must not be merged into one local or
committed file.

## Rejected alternatives

### `.local/agent-reports/<slug>/coordinator/`

Rejected for new Watchtower lanes. It is misleading, deeply nested, and tied
to the replaced bootstrap model.

### `.lanes/<slug>/`

Rejected. It is shorter but does not communicate ownership and may collide
with another workflow tool.

### Configurable lane root

Rejected for the initial release. It complicates deterministic discovery,
support, and safety without a second demonstrated need.

### Flat lane root

Rejected. Scripts, durable configuration, state, reports, prompts, budgets, and
logs have different ownership and lifecycle semantics.

## Consequences

Positive:

- clear Watchtower product namespace;
- one path convention for all new lane kinds;
- shallow deterministic discovery;
- many lanes per repository without state collision;
- multi-repository scope without duplicated lane state;
- clean separation of managed, durable, and generated artifacts;
- easier future selective runtime rewrites.

Costs:

- imported shell runtime must be audited for hardcoded legacy paths;
- generated coordinator/worker instructions must use new report/event paths;
- projects must ignore `/.watchtower/`;
- local membership index requires stale-entry validation.

These costs are paid before v1 and avoid permanent compatibility complexity.

## Final rule

Watchtower recognizes only valid:

```text
.watchtower/lanes/<slug>/lane.json
```

It never scans or mutates copied-template lane directories.
