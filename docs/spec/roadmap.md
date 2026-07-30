# Watchtower Delivery Roadmap

Status: **Planning baseline**
Last updated: 2026-07-30

This roadmap sequences outcomes, not commits. Each milestone should land as a
small implementation pack with work batches, independent review batches, and
the corresponding updates to [v1-draft.md](v1-draft.md).

## 1. Release strategy

```text
M0 Contract
  → M1 Read model
    → M2 Runtime distribution
      → M3 Create
        → M4 Operate
          → M5 Upgrade and knowledge
            → M6 Release hardening
              → v1
```

The critical path establishes read-only discovery and schemas before any
workspace mutation. Runtime packaging is proven before init writes links.

## 2. v1 milestones

### M0 — Product contract freeze

Outcome: implementation can proceed without inventing ownership, paths, or
command semantics in command classes.

Deliverables:

- v1 product specification;
- architecture baseline;
- roadmap;
- new-lane contract fixtures and runtime/knowledge asset inventories;
- runtime and knowledge asset inventory;
- decisions for package name, `.watchtower/lanes` layout, stable identity,
  initiative/lane/repository cardinality, committed-pack boundary, selection,
  and runtime distribution.

Exit:

- all v1 commands have input, output, mutation, and exit-code contracts;
- source-of-truth boundaries are explicit;
- remaining questions are genuinely post-v1.

Status: ⏳ Drafted; review required.

### M1 — Read model and discovery

Outcome: `wt` can reliably answer “where am I, which lane, and what is its
state?” without changing the workspace.

Scope:

- contracts and error categories;
- workspace resolution;
- managed-lane discovery;
- stable lane IDs and initiative relationships;
- repository membership index and local binding resolution;
- many-lanes-per-repository and multi-repository lane selection;
- writable worktree/branch/path conflict inspection;
- deterministic selection;
- lane paths;
- strict env and state parsing;
- JSONL event parsing;
- tmux and heartbeat inspection;
- `wt list`, `wt config show`, and `wt status`;
- stable JSON schemas and help.

Key proof:

- malicious env/state content is never executed;
- multi-lane ambiguity matrix;
- secondary-repository discovery and stale-index handling;
- overlapping shared-write versus dedicated-worktree matrices;
- active, review, complete, and inconsistent managed-lane fixtures;
- all read commands leave filesystem hashes unchanged.

Dependencies: M0.

### M2 — Runtime and knowledge distribution

Outcome: the package contains complete, verifiable, versioned software and
documentation assets.

Scope:

- import the canonical coordinator runtime;
- close the current template copy-manifest omissions;
- runtime and knowledge manifests;
- checksum and executable-mode validation;
- `nvb dist` staging tasks;
- XDG runtime catalog and immutable staging;
- runtime invocation adapter and `WT_*` contract;
- managed `bin/` link strategy;
- removal of hardcoded `.local/agent-reports` assumptions;
- real watcher smoke fixture.

Key proof:

- adding an unmanifested packaged script fails distribution;
- staged runtime remains valid after package source relocation;
- two runtime versions can coexist;
- compatibility links preserve existing script names.

Dependencies: M1 contracts; can otherwise proceed independently of UI commands.

### M3 — Initialize new lanes

Outcome: operators can create new Watchtower-managed lanes without copying the
runtime tree.

Scope:

- lane marker and install-manifest stores;
- `.watchtower/lanes/<slug>/` structured execution overlay;
- `repositories.local.json` bindings and advisory index registration;
- mutation locking and atomic writes;
- `wt init` dry run, create, and rollback;
- neutral lane templates;
- implementation-pack structural validation;
- canonical tracker placement;
- ownership classification in human output.

Key proof:

- init failure leaves no partial managed lane;
- init never creates committed implementation docs;
- init refuses any pre-existing destination without modifying it;
- init requires `/.watchtower/` Git-ignore coverage;
- init accepts a committed multi-repository pack and binds every logical
  repository ID;
- concurrent writable lanes default to dedicated worktrees;
- copied-template lanes remain undiscovered and untouched.

Dependencies: M1, M2.

### M4 — Operate and diagnose

Outcome: day-to-day lane observation and watcher startup no longer require
remembering coordinator paths.

Scope:

- `wt watch`;
- full `wt doctor` check registry;
- runtime subprocess exit/signal forwarding;
- dependency, account CLI, tmux, Git-ignore, runtime-link, and pack checks;
- initiative relations, repository bindings, and cross-lane conflict checks;
- actionable status/doctor human rendering;
- scaffold `hello` removal.

Key proof:

- wake stdout remains byte-compatible for host notification matching;
- Ctrl-C reaches the watcher and returns the correct status;
- doctor differentiates core failure from optional speech warning;
- status remains observation-only.

Dependencies: M1, M2; use lanes created by M3 for acceptance.

### M5 — Upgrade and knowledge installation

Outcome: runtime fixes and coordinator knowledge can move forward without
recopying or clobbering lanes.

Scope:

- upgrade planning and compatibility checks;
- schema upgrade registry;
- staged atomic link switch;
- downgrade guard;
- rollback guidance;
- `wt skill install` adapters for Codex, Cursor, and Claude;
- version reporting;
- new-lane quick start and an explicit unsupported-old-lane boundary.

Key proof:

- preview explains every changed and preserved path;
- failed switch retains the old runtime binding;
- lane-owned modifications survive upgrade;
- skill installation never claims notification wiring that was not verified.

Dependencies: M2, M3.

### M6 — v1 release hardening

Outcome: Watchtower is safe enough to replace template bootstrap for new daily
lane operation.

Scope:

- end-to-end fresh-lane trial;
- two concurrent lanes in one repository using distinct worktrees;
- one lane spanning multiple repositories with a reviewer-owned commit set and
  partial-push recovery proof;
- proof that copied-template lanes remain outside discovery and mutation;
- one implementer → reviewer → accept cycle;
- command/help/spec consistency audit;
- package/global-install proof;
- security/path/ownership regression suite;
- performance baseline for discovery/status;
- release notes and operator quick start.

Release gates:

- all acceptance items in the v1 spec pass;
- no known state-loss or silent-overwrite path;
- no hardcoded personal account or workspace paths;
- canonical coordinator docs have one auditable source;
- every deferred behavior is documented rather than half-implemented.

Dependencies: M1–M5.

## 3. Suggested implementation packs

Avoid one monolithic “build Watchtower” lane. Suggested packs:

| Pack | Primary milestones | Why bounded |
|------|--------------------|-------------|
| `wt-read-model` | M1 | Pure/read-only contracts first |
| `wt-runtime-distribution` | M2 | Packaging and shell compatibility have distinct proof |
| `wt-lane-lifecycle` | M3–M4 | Controlled workspace mutation plus operator commands |
| `wt-upgrade-knowledge` | M5 | Schema/versioning risk deserves independent review |
| `wt-v1-release` | M6 | Acceptance and documentation, not feature development |

Each pack should use small batches with one reviewer-owned acceptance commit.
The implementation coordinator's behavioral playbook remains referenced rather
than copied into each pack.

## 4. Post-v1 product horizons

### Horizon A — Daily operator ergonomics

Candidate release: v1.1.

- explicit `start`, `pause`, `resume`, and `stop` runtime actions;
- `wt event` and `wt logs` views;
- `wt open` for trackers, briefs, and tmux attach targets;
- explicit interactive lane picker;
- completion archive/cleanup plan with retention preview;
- multi-lane workspace summary.

These are operator actions. They must not make coordinator decisions.

### Horizon B — Pack architecture and spec-to-plan compilation

Candidate release: v1.2.

- implement the `pack-design` lane kind defined in
  [pack-design-draft.md](pack-design-draft.md);
- `wt pack init`, `status`, `validate`, `graph`, `budget`, `context`, `diff`,
  and `seal`;
- parallel bounded architect reconnaissance with one canonical pack integrator;
- independent pack review and reviewer-owned acceptance;
- machine-readable implementation-pack structure alongside normative Markdown;
- logical multi-repository scope, per-repository baselines, batch claims, and
  reviewer commit authority;
- requirement traceability, source baselines, drift detection, and consumability
  gates;
- cost-aware capability routing, token ledgers, and correction/review reserves;
- direct handoff from accepted sealed pack into an implementation lane.

Design constraint: Markdown remains the human source of requirement and
architecture truth. `implementation-pack.json` carries only structural
metadata, graph edges, trace references, allocation classes, and file roles.

### Horizon C — Implementation allocation planning

Candidate release: v1.3.

- implement the implementation-lane phase defined in
  [allocation-planning-draft.md](allocation-planning-draft.md);
- `wt allocation discover`, `inventory`, `catalog`, `check`, `snapshot`,
  `plan`, `validate`, `review`, `activate`, `status`, `explain`, and `replan`;
- versioned adapters for Hermes, OpenCode, Codex, Cursor, Claude, and future
  compatible CLI families;
- allowlisted, non-secret capability discovery across authorized hosts, Unix
  users, provider accounts, and plan routes;
- explicit inventory diffs and approval before discovered resources become
  allocation authority;
- dynamic model catalogs, shared capacity pools, capability evidence, charging
  classes, freshness, and lane-specific eligibility;
- point-in-time capacity snapshots with reported, operator-supplied, estimated,
  or unknown telemetry;
- quality-first deterministic routing from pack capability classes to local
  models, efforts, CLIs, accounts, and users;
- independent review, correction/re-review reserves, fallbacks, and
  preserve-session routes;
- atomic cross-lane capacity reservations and safe pending-work replanning; and
- usage ledgers that keep tokens, subscription quota, money, concurrency,
  reset windows, context, and operator time distinct.

An implementation lane created from a sealed pack starts
`allocation-required`. Infeasibility is an explicit result; Watchtower never
silently downgrades below a pack capability floor to make a plan fit.

### Horizon D — Agile workflow views

Candidate release: v1.x.

- portfolio registry explicitly opted into by the user;
- cross-workspace lane summary;
- lead time, reject/correction count, batch throughput, and stale-lane signals;
- retrospectives derived from durable events and accepted tracker facts;
- local TUI consuming the stable `status --json` interface.

Metrics must not rank individual agents or infer quality from token spend.

### Horizon E — Additional lane kinds

Candidate release: v2.

The `pack-design` draft supplies the second real workflow needed to extract a
narrow internal lane-kind contract. Prove at least one additional workflow
beyond `implementation` and `pack-design` before exposing a public lane engine:

- `spec-design` — research, proposal, critique, acceptance;
- `maintenance` — diagnosis, patch, regression review;
- `research` — parallel evidence work with a synthesis gate.

Only then consider a public lane-kind interface or plugin SDK.

### Horizon F — Structured runtime state

Candidate release: v2.

- canonical structured lane snapshot;
- append-only event journal with transition identifiers;
- shell compatibility projection;
- idempotent runtime actions;
- event replay/recovery;
- optional headless executor after tmux parity is proven.

This is a runtime migration, not merely a TypeScript refactor, and needs its own
compatibility spec.

## 5. Explicitly deferred

- remote SaaS control plane;
- team authentication/authorization;
- arbitrary project-defined executable hooks;
- automatic credential/account provisioning;
- automatic account rotation to evade provider limits;
- automatic speech-model downloads;
- autonomous acceptance or reject routing in the CLI;
- generic workflow DSL or public plugin SDK without a third proven workflow;
- database persistence for local lane state.

## 6. Planning rules

For every milestone:

1. update the normative v1 spec before behavior changes;
2. identify artifact ownership for every new file;
3. define read/write and failure semantics;
4. include human and JSON output together;
5. add a realistic evolved Watchtower-lane fixture when compatibility changes;
6. test interruption and retry for mutations;
7. keep `src/cli.ts` thin and shared logic in foundation modules;
8. delegate tmux/lane behavior to the runtime until a selective rewrite has a
   separate justification; and
9. do not commit generated build, dist, dependency, Nira-local, or
   `.watchtower/` lane artifacts.
