# Watchtower Product Architecture

Status: **Draft architecture baseline**
Applies to: v1 foundation and post-v1 evolution
Last updated: 2026-07-30

## 1. Architectural intent

Watchtower should become the common local control plane for agile,
agent-assisted development without becoming an agent framework or hiding
project truth in a proprietary database.

The architecture is built around seven separations:

1. **Project intent vs local execution** — specs and implementation packs are
   committed; tmux state and reports stay local.
2. **Control plane vs coordinator policy** — TypeScript resolves and invokes;
   the knowledge pack and runtime coordinate.
3. **Durable lane data vs managed software** — upgrades may replace only
   manifest-owned assets.
4. **Authoritative events vs observations** — durable worker events advance
   attention; tmux scrollback is diagnostic.
5. **Workflow model vs provider adapter** — lane semantics do not depend on
   Codex, Cursor, Claude, or a specific notification mechanism.
6. **Portable capability vs local allocation** — committed packs state the
   capability a role needs; machine-local plans select current endpoints,
   accounts, users, and capacity.
7. **Agent judgment vs effect authority** — coordinator agents propose typed
   decisions; Watchtower validates and applies bounded effects.

## 2. Context

```text
┌──────────────────────── workspace ─────────────────────────┐
│ committed specs + implementation packs                     │
│ local execution overlays under .watchtower/lanes           │
└───────────────────────────┬─────────────────────────────────┘
                            │ discover/read
┌───────────────────────────▼─────────────────────────────────┐
│ Watchtower control plane                                   │
│ CLI commands · foundation services · contracts · renderers │
└──────────────┬──────────────────────────────┬───────────────┘
               │ invoke                       │ install/reference
┌──────────────▼──────────────┐   ┌───────────▼───────────────┐
│ Versioned runtime          │   │ Versioned knowledge pack  │
│ shell + tmux + event tools │   │ policy + guides + skill   │
└──────────────┬──────────────┘   └───────────┬───────────────┘
               │                              │ interpreted by
┌──────────────▼──────────────────────────────▼───────────────┐
│ coordinator, implementer and reviewer agents               │
│ host adapters: Codex · Cursor · Claude                     │
└─────────────────────────────────────────────────────────────┘
```

## 3. Domain model

### 3.1 Stable concepts

```text
Initiative
  └── Lane [1..n]
        ├── LaneManifest
        ├── LaneConfiguration
        ├── LaneState
        ├── RepositoryBinding [1..n]
        ├── Plan / ImplementationPack
        │     └── Batch [ordered, conditional, or parallel]
        ├── AllocationPlan [implementation lanes, 0..n revisions]
        ├── RuntimeBinding
        ├── CoordinatorCycle [0..n, append-only journal]
        ├── WorkerSession [0..n]
        └── WorkerEvent [append-only]

Repository [1..n] ← many-to-many → Lane [0..n]
```

An initiative is the overall product effort. Its `pack-design`,
`implementation`, research, or maintenance lanes are separate workflows with
separate state and explicit relationships.

A lane has exactly one **control home**: the repository/worktree containing
`.watchtower/lanes/<slug>/`. It may bind any number of additional
participating repositories for source, integration, proof, documentation, or
consumer work. A repository may participate in any number of active lanes.
Slugs are unique only within one control home; `laneId` is the stable global
identity.

Workspace means one local checkout/worktree binding. Repository means the
logical version-controlled project, independent of its machine path. Project
or initiative must not be used as a synonym for either.

### 3.2 Lane kinds

A lane kind defines:

- expected committed plan structure;
- runtime actions;
- state and event vocabulary;
- health checks;
- knowledge-pack policy; and
- status projections.

v1 hardcodes one kind, `implementation`. The first concrete next kind is
`pack-design`, specified in
[pack-design-draft.md](pack-design-draft.md): a multi-architect process that
converts accepted specifications into an independently reviewed implementation
pack. Internal contracts carry `kind` so this addition does not require a
filesystem break.

Implementation allocation planning, specified in
[allocation-planning-draft.md](allocation-planning-draft.md), is not a lane
kind. It is a required, repeatable phase inside an implementation lane after
pack handoff and before worker dispatch. Its plan is local because endpoint
availability, account limits, Unix users, and reservations are time-sensitive
machine facts.

This is not permission to build a plugin system in v1. `pack-design` is now the
second real workflow that justifies extracting a narrow internal lane-kind
contract after the v1 foundation is stable. A public/general plugin interface
remains deferred.

### 3.3 Authority

| Question | Authority |
|----------|-----------|
| What should be built? | Committed spec and plan |
| Which batch is active? | Coordinator lane state |
| Did a worker report lifecycle completion? | Durable worker event |
| Which repositories and commits constitute acceptance? | Reviewer event plus per-repository commit set |
| Is a tmux session present? | Live tmux observation |
| Which runtime may manage this lane? | Install manifest |
| What should the coordinator do next? | Coordinator knowledge pack |
| What may Watchtower overwrite? | Managed-assets manifest |
| What capability does an assignment require? | Accepted implementation pack |
| Which local endpoint performs pending work? | Active allocation-plan revision |
| What account capacity is already promised? | Global local reservation ledger |
| What semantic coordinator action is proposed? | Typed coordinator proposal |
| Is the proposal legal now? | Knowledge policy plus Watchtower validator |
| Who commits the bounded effect? | Single Watchtower effect executor |
| What coordinator lookup data is valid? | Derived pack index matching the accepted `packSealId` |

Watchtower can detect contradictions between authorities. It must not resolve a
coordinator-policy contradiction by silently editing lane state.

## 4. Logical components

### 4.1 CLI host

`src/cli.ts` remains a thin Nirvana host. It selects and invokes the runner and
contains no lane logic.

### 4.2 Commands

Each `src/commands/*Command.ts`:

- owns argument validation and user-facing orchestration for one command;
- calls foundation services;
- renders through Nirvana view/output facilities; and
- contains no duplicate discovery, config parsing, or shell spawning logic.

Command classes must not directly parse lane files or construct runtime script
paths.

### 4.3 Foundation services

Suggested v1 modules:

| Module | Responsibility |
|--------|----------------|
| `WorkspaceResolver` | Resolve and canonicalize workspace roots |
| `LaneDiscovery` | Find Watchtower-managed lanes |
| `LaneSelector` | Apply deterministic selection precedence |
| `LaneIndex` | Map participating repository paths to authoritative lane homes |
| `LanePaths` | Construct and validate lane, repository-relative, and runtime-store paths |
| `LaneManifestStore` | Parse, validate, schema-upgrade, and atomically write marker metadata |
| `RepositoryBindingStore` | Resolve logical repository IDs to local worktrees, branches, roles, and access |
| `LaneConflictInspector` | Detect active lanes sharing writable worktrees, branches, paths, or runtime resources |
| `LaneConfigReader` | Strict non-executing env parser and redaction |
| `LaneStateReader` | Strict state parser and status projection |
| `WorkerEventReader` | Validate JSONL records and select latest relevant event |
| `SessionInspector` | Read-only tmux presence/pane metadata |
| `RuntimeCatalog` | Validate package and XDG runtime manifests |
| `RuntimeInstaller` | Stage immutable runtime/knowledge versions |
| `RuntimeInvoker` | Map supported actions to subprocess invocation context |
| `LaneInitializer` | Transactional create-once lane materialization |
| `LaneUpgrader` | Preview/apply schema and managed-asset changes |
| `LaneDoctor` | Composable diagnostic checks |
| `FileLock` | Cross-command lane mutation lock |

Modules should depend on injected filesystem/process boundaries where practical,
so command specs do not require real tmux or global user-data mutation.

### 4.4 Contracts

`src/contracts/` contains public, serializable concepts:

- `WorkspaceContext`;
- `InitiativeRef`;
- `RepositoryRef` and `RepositoryBinding`;
- `LaneRef` and `ResolvedLane`;
- `LaneManifestV1`;
- `RuntimeManifestV1`;
- `LaneStatusV1`;
- `DoctorResultV1`;
- `WorkerEventV1`; and
- error categories matching CLI exit codes.

Types that exist only to implement one foundation module remain private to that
module.

### 4.5 Runtime adapter

All script delegation crosses `RuntimeInvoker`. It:

1. verifies the action is declared by the runtime manifest;
2. resolves the selected lane and versioned runtime root;
3. supplies `WT_*` context;
4. chooses inherited or captured stdio based on the action;
5. forwards signals and exit status; and
6. never invokes a string through an interpolating shell when an argv form is
   possible.

This boundary lets scripts migrate selectively to TypeScript later without
changing command contracts.

### 4.6 Knowledge pack

The knowledge pack contains:

- coordinator playbook;
- decision and recovery guides;
- state-machine reference;
- portable coordinator skill;
- provider adapters; and
- a manifest/version.

Runtime and knowledge versions may advance independently, but a compatibility
matrix in their manifests must prevent unsupported combinations.

### 4.7 Post-v1 allocation services

Implementation allocation adds provider-neutral services behind the
`wt allocation` command group:

| Service | Responsibility |
|---------|----------------|
| `ToolAdapterCatalog` | Load compatible, integrity-checked CLI discovery adapters |
| `CapabilityDiscovery` | Probe allowlisted hosts/users without discovering credentials |
| `EndpointInventory` | Preserve CLI → route → capacity pool → model → endpoint relationships |
| `CapabilityCatalog` | Store versioned evidence, charging class, uncertainty, and expiry |
| `ProjectEligibility` | Check approved endpoints against lane repositories, worktrees, runtime, and tools |
| `CapacitySnapshotStore` | Capture immutable qualified availability observations |
| `AllocationPlanner` | Apply quality-first hard constraints and deterministic preferences |
| `ReservationLedger` | Atomically coordinate finite capacity across local lanes |

Hermes, OpenCode, Codex, Cursor, Claude, and future CLIs integrate through the
same tool-adapter contract. Their dynamic plans and model catalogs remain
adapter observations, not hardcoded core-planner knowledge.

### 4.8 v1 coordinator decision plane

The v1 decision plane is defined in
[coordinator-automation-draft.md](coordinator-automation-draft.md):

| Service | Responsibility |
|---------|----------------|
| `CoordinatorPackIndex` | Compile and verify deterministic seal-bound structural indexes |
| `CoordinatorIndexQuery` | Enforce bounded, paginated, provenance-bearing lookups |
| `CoordinatorRouter` | Match trigger and guard facts to M0 or D1–D3 policy |
| `DecisionEnvelopeBuilder` | Construct deterministic bounded cycle input |
| `CoordinatorContextBroker` | Serve allowlisted, metered, provenance-bearing context |
| `CoordinatorProposalValidator` | Validate typed output against current policy and state |
| `CoordinatorEffectPlanner` | Convert a valid proposal into bounded previewable effects |
| `CoordinatorEffectExecutor` | Apply one idempotent effect plan and journal external attempts |
| `CoordinatorProjection` | Derive ready set, lane, batch, and publication read models |

The router may derive a uniquely preauthorized M0 transition, but it does not
encode semantic reject, scope, or reconciliation judgment. Decision agents
cannot write authoritative state.

## 5. Physical deployment

### 5.1 Package

The npm package contains the CLI plus runtime and knowledge distributions. It
does not execute lane scripts directly from `node_modules` or an npm global
prefix because those locations are replaced during package upgrades.

### 5.2 User data

Immutable runtimes are staged under XDG data. A lane pins one staged version.
This gives Watchtower:

- explicit upgrades;
- rollback by rebinding links;
- continued operation if the npm package moves;
- reproducible diagnostics; and
- checksum-based integrity.

The store may be relocated with `WATCHTOWER_DATA_HOME`. Its permissions must
allow configured worker accounts to traverse and execute runtime assets while
retaining write ownership exclusively with the operator account. Multi-account
access is a release contract, not an environment-specific workaround.

User data also contains an advisory repository-membership index mapping
canonical participating worktree paths to authoritative lane homes. The index
enables discovery from a secondary repository in a multi-repository lane. It
is never lane authority: every result must resolve to a valid `lane.json`, and
stale entries are ignored rather than silently repaired by read-only commands.

Post-v1 allocation planning adds local capacity state under
`<watchtower-data-root>/capacity/`: non-secret endpoint declarations, immutable
discovery proposals and model catalogs, point-in-time snapshots, and an atomic
cross-lane reservation ledger. Discovery scans only operator-allowlisted
hosts, execution users, adapters, transports, and project roots. This data is
local scheduling evidence, not credential or provider quota authority.

### 5.3 Control home and participating repositories

The control home stores local execution state under:

```text
.watchtower/lanes/<slug>/
```

The complete runtime and canonical knowledge are not copied into each
repository. The accepted design pack remains committed in its owning
repository; generated prompts, model/account allocation, reports, events,
budgets, and logs remain in the control home's lane directory. Post-v1
allocation revisions live under `allocation/`; actual account and Unix-user
identities never enter the committed pack.

The v1 `coordinator/` subtree contains routing/context policy, bounded cycle
artifacts, deterministic pack indexes, append-only decision/effect journals,
and generated projections. Committed tracker prose remains project-owned;
mechanical coordination updates the local projection rather than arbitrary
Markdown.

Each participating repository has a local binding declaring canonical path,
role, read/write access, branch, and worktree mode. Concurrent writable lanes
should use dedicated Git worktrees. Sharing one writable checkout is an
explicit unsafe override, never an inferred default.

## 6. Read and write flows

### 6.1 Read-only status

```text
resolve current repository/worktree
  → discover home lanes and consult local membership index
  → select authoritative lane home
  → parse lane/repository bindings/config/state/events
  → inspect managed runtime links + tmux + heartbeat
  → inspect cross-lane repository/worktree conflicts
  → derive warnings and health
  → render human or JSON result
```

No repair or runtime staging occurs in this flow.

### 6.2 Mutation

```text
resolve target
  → validate paths and repository bindings
  → acquire lane/control-home lock
  → compute complete change plan
  → show plan (preview by default for schema/runtime upgrade)
  → stage new content
  → atomically switch managed paths
  → write manifest last
  → release lock
```

The manifest-last rule makes an interrupted operation detectable and keeps the
old binding authoritative until the new assets are ready.

### 6.3 Runtime execution

```text
resolve + validate lane
  → validate pinned runtime
  → construct argv and WT_* environment
  → exec/invoke with inherited stdio
  → preserve runtime exit and signal semantics
```

### 6.4 Coordinator cycle

```text
durable trigger
  → verify pack index matches active seal
  → derive guards and route M0 or D1–D3 through bounded index queries
  → construct bounded envelope
  → apply unique preauthorized M0 effect
     or invoke decision endpoint and receive typed proposal
  → validate against current state and policy
  → prepare/apply/verify bounded effects
  → append decision/effect events and refresh projections
```

Only the effect executor mutates authoritative lane state. External tmux/Git
effects use idempotent prepare/attempt/verify journals.

## 7. State evolution

### 7.1 v1 compatibility state

Worker lifecycle remains compatible with shell state and JSONL events. The v1
effect executor is the only writer of the shell-compatible coordinator-state
projection. Coordinator decision/effect journals and JSON projections supply
the auditable automation boundary; agents emit typed proposals only.

### 7.2 Future canonical state

A later runtime may introduce a structured state snapshot and retain an
append-only event journal. That change should happen only after:

- all current state fields are inventoried across multiple live lanes;
- write ownership and locking are explicit;
- coordinator behavior has contract fixtures;
- downgrade/export to the v1 shell view is defined; and
- recovery from a partial event is tested.

A database is not justified for a local single-operator lane merely to make
queries convenient.

## 8. Extensibility strategy

### 8.1 Deliberate extension points

- lane `kind` in markers and status;
- runtime action manifest;
- versioned knowledge adapters;
- stable JSON output;
- runtime invocation boundary;
- pack validators that can be added without owning project prose.

### 8.2 Deferred extension points

Do not implement these until demanded by a second working use case:

- third-party runtime plugins;
- arbitrary hook execution from project config;
- remote runtime download registries;
- server/database persistence;
- generalized workflow DSL; and
- provider-specific logic in core lane discovery.

## 9. Safety model

### 9.1 Trust zones

| Input | Trust handling |
|-------|----------------|
| CLI args | Validate format, canonicalize paths |
| Lane env/state files | Parse strict scalar subset; never execute |
| Runtime package | Verify packaged manifest and SHA-256 |
| Worker JSONL | Validate each record independently |
| Tmux text | Diagnostic only; never lifecycle authority |
| Agent-generated Markdown | Display/reference only; never execute |
| Host skill destination | Preview and explicit replacement policy |

### 9.2 Destructive boundaries

The only v1 operation that replaces existing lane paths is upgrade, and only
for manifest-recognized runtime assets. Unknown files and lane-owned content
are never deleted. Directories not carrying Watchtower manifests are outside
the product boundary and are never imported or modified.

### 9.3 Secret handling

- No secrets in marker or install manifests.
- Config output uses key-based redaction.
- Subprocess diagnostics do not print the full environment.
- Worker prompts must reference credentials through existing account/host
  mechanisms, never materialize them into runtime prompts.

## 10. Observability

Human output should answer, in order:

1. Which initiative, lane, control home, and repositories did Watchtower select?
2. What lifecycle and batch are declared?
3. What processes and sessions are actually present?
4. Is operator attention needed?
5. Which safe command should run next?

JSON output separates declared lifecycle from observed health. Logs emitted by
the runtime remain lane-local. Watchtower itself should use structured debug
records only when `--verbose` is enabled and should not add another permanent
log by default.

## 11. Testing architecture

### 11.1 Unit contracts

- repository/worktree and lane selection matrices;
- strict env/state parsers with malicious shell fixtures;
- marker/runtime schema validation;
- initiative/lane identity and repository-binding validation;
- many-lanes-per-repository selection matrices;
- cross-repository lane-home resolution;
- writable worktree/branch/path conflict detection;
- path traversal and symlink escape checks;
- event validation and status projection;
- deterministic pack-index compilation, sharding, bounded queries, and
  seal-drift invalidation;
- coordinator envelope-size invariance across unrelated pack growth;
- redaction;
- exit-code mapping.

### 11.2 Filesystem integration

Use temporary fixture workspaces for:

- clean init and rollback;
- multiple-lane ambiguity;
- multiple initiatives and related pack-design/implementation lanes;
- one lane bound to multiple repositories;
- several active lanes bound to one repository;
- dedicated and conflicting shared worktrees;
- refusal to initialize over an unmarked pre-existing lane directory;
- broken and repaired managed links;
- runtime upgrade and failed atomic switch;
- workspace relocation;
- staged pack-index build and atomic current-pointer switch;
- stale/corrupt index refusal without full-pack fallback.

### 11.3 Runtime integration

Use a fake runtime manifest/entrypoint for most command specs. Maintain a small
Linux acceptance suite with real `bash`, `tmux`, and the bundled watcher.

### 11.4 Golden compatibility fixtures

Keep sanitized fixtures representing:

- a newly initialized Watchtower lane;
- a large 30-batch Watchtower lane modeled on sanitized SQL-backends behavior;
- synthetic 300, 3,000, and 10,000-batch packs with a fixed affected
  dependency neighborhood;
- a non-Watchtower copied-template directory that discovery must ignore;
- an active implement phase;
- review, reject, correction, complete, and inconsistent states.

These fixtures matter more than mirroring individual shell implementation
details.

## 12. Architectural decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| A-001 | Keep TypeScript control plane and shell execution plane in v1 | Preserve proven runtime while creating product boundaries |
| A-002 | Pin immutable XDG runtimes per lane | Explicit upgrade, rollback, and package-location independence |
| A-003 | Use `.watchtower/lanes/<slug>/lane.json` as lane authority | Product-owned, shallow, unambiguous local namespace |
| A-004 | Keep strict env compatibility in v1 | Avoid simultaneous runtime and config migration |
| A-005 | Treat durable worker JSONL as lifecycle signal | Tmux UI text is provider-specific and historically unreliable |
| A-006 | Keep coordinator policy in versioned knowledge pack | Prevent CLI behavior from forking agent decision rules |
| A-007 | Default lane upgrade to preview | Managed lanes contain valuable custom and generated files |
| A-008 | Support one lane kind before extracting plugins | Avoid speculative abstraction |
| A-009 | Keep local operator tracker inside the structured lane root | Operational prose stays local while accepted design packs remain committed |
| A-010 | Stable JSON is a v1 public interface | Enables scripts, future dashboard, and Nirvana integrations |
| A-011 | Model Repository ↔ Lane as many-to-many with one control home per lane | Supports concurrent lanes and cross-repository initiatives without duplicating state |
| A-012 | Keep accepted design packs committed and execution overlays local | Preserves audit/reproducibility while removing runtime and prompt noise |
| A-013 | Use dedicated worktrees for concurrent writable lanes by default | Prevents lanes from invalidating one another's source and proof |
| A-014 | Model implementation allocation as an implementation-lane phase, not a lane kind | Allocation is time-sensitive execution planning for one existing lane |
| A-015 | Keep capability requirements committed and endpoint assignments local | Packs stay portable and credentials/machine identity stay outside Git |
| A-016 | Reserve finite endpoint capacity in one local cross-lane ledger | Prevents concurrent lanes from double-booking declared account capacity |
| A-017 | Discover execution capabilities through versioned provider-neutral tool adapters | Supports changing CLI ecosystems without provider logic in the planner |
| A-018 | Require explicit inventory approval and lane-specific eligibility | Discovery cannot silently authorize a model or grant project access |
| A-019 | Make bounded coordinator automation required in v1 | Routine coordinator cost and cumulative context are core product problems |
| A-020 | Give agents proposal authority and Watchtower sole effect authority | Validation after direct agent mutation is too late |
| A-021 | Separate reviewer acceptance from Git publication | Partial publication must not corrupt semantic acceptance |
| A-022 | Compile deterministic local indexes tied to the pack seal | Routine coordinator cost must not scale with unrelated pack prose |
| A-023 | Block on stale index instead of full-pack fallback | Predictable cost and correctness are safer than opportunistic context inflation |

## 13. Architecture fitness checks

Every implementation change should preserve these properties:

- no product logic enters `src/cli.ts`;
- commands do not duplicate discovery or path construction;
- read-only commands perform no hidden writes;
- only manifest-owned paths are upgradeable;
- runtime invocation is centralized;
- package upgrade does not implicitly upgrade a lane;
- no shell config/state is executed by TypeScript;
- semantic coordinator decisions remain outside CLI code;
- coordinator agents cannot directly mutate authoritative state;
- every mutating cycle has one effect authority, current-precondition
  validation, and an idempotency identity;
- mechanical coordination invokes no model when a unique preauthorized effect
  is provable;
- routine coordinator queries are bounded and do not scan or preload the full
  implementation pack;
- every pack index is derived, model-free, reproducible, and matched to the
  active seal;
- every lane has one authoritative control home and stable `laneId`;
- committed packs refer to logical repository IDs, never machine paths;
- concurrent writable lane bindings are conflict-checked;
- pack capability floors cannot be silently weakened by local allocation;
- machine-specific endpoint/account identities remain outside committed packs;
- active endpoint reservations cannot be double-booked across local lanes;
- capability discovery cannot exceed its explicit host/user/adapter/project
  allowlist;
- a dynamic model catalog cannot become allocation authority without provenance,
  freshness, capability evidence, and operator approval;
- human and JSON outputs derive from the same status contract; and
- non-Watchtower lane directories are ignored and never mutated.
