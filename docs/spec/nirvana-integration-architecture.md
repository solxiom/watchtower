# Watchtower Nirvana Integration and NVB Execution Architecture

Status: **Normative v1 implementation architecture**
Last updated: 2026-07-31

This document defines where Watchtower uses Nirvana facades, where NVB owns
mechanical task orchestration, and where narrow platform adapters remain
necessary. It supplements [architecture.md](architecture.md) and the mandatory
[engineering and review standard](../development/engineering-and-review-standard.md).

## 1. Decision

Watchtower uses:

1. the `wt` CLI as its only operator-facing product surface;
2. focused TypeScript application services for product policy, validation,
   planning, and typed results;
3. an immutable, versioned Watchtower NVB task catalog for substantial
   mechanical workflows;
4. lane-pinned task profiles that select from that catalog;
5. Nirvana facades for task execution, storage, logging, command invocation,
   collections, guards, and terminal presentation where their proven semantics
   fit; and
6. shell only as a leaf compatibility/integration adapter for capabilities such
   as tmux, Git, and external agent CLIs that do not yet have a conforming
   Nirvana API.

Watchtower does **not** add or modify a participating repository's root
`nvb.json`. One repository may participate in several lanes, each pinned to a
different runtime version and policy. Project-root Watchtower tasks would
collide, become user-editable execution authority, and couple lane operation to
the target project's build configuration.

The effective task set is therefore **per lane**, while task code and task
configuration are **per immutable Watchtower runtime version**.

## 2. High-level structure

```text
operator
  │
  ▼
wt command                         Nirvana BaseCommand / makeCLI
  │  parse, select lane, render
  ▼
application capability             policy, validation, planning, typed result
  │
  ├── direct read/query port        cheap bounded reads and projections
  │
  └── LaneTaskRunner                only internal NVB invocation boundary
        │
        ▼
      pinned Watchtower NVB target  immutable catalog + lane task profile
        │
        ▼
      focused TaskHandler           one mechanical capability
        │
        ├── Nirvana storage/logger/cmd/collections
        ├── Watchtower durable-state and SQLite adapters
        └── audited leaf executable for tmux/Git/agent integration
```

NVB is an execution substrate, not product authority. It does not select a
lane, approve a proposal, decide a transition, acquire model authority, or
invent an effect. The Watchtower application layer completes those decisions
before selecting a task.

### 2.1 Target module ownership

The implementation should converge on capability-owned modules such as:

```text
src/foundation/
  taskRuntime/
    LaneTaskCatalog.ts
    LaneTaskRunner.ts
    NirvanaLaneTaskRunner.ts
    TaskInvocationEnvelopeStore.ts
  storage/
    ManagedAssetStorage.ts
    NirvanaManagedAssetStorage.ts
    DurableFileStore.ts
  observability/
    WatchtowerLogger.ts
    NirvanaWatchtowerLogger.ts
  runtime/
    LeafRuntimeInvoker.ts
```

Product capabilities such as lane lifecycle, coordinator routing, effects, and
sessions own their plans and validators in their own foundation capsules. They
depend on the ports above; they do not collect inside `taskRuntime`.

The complete target domain tree, three-tier barrel model, dependency layers,
and public export contract are normative in
[architecture/foundation-module-architecture.md](architecture/foundation-module-architecture.md).
Phased migration and `REF-01`/`REF-02` remediation batches are tracked in
[architecture/foundation-layout-remediation.md](architecture/foundation-layout-remediation.md).

The task source should be divided by capability:

```text
runtime-nvb/
  catalog/                         reviewable capability fragments
  handlers/
    runtime/
    lane/
    index/
    upgrade/
    coordinator/
    effect/
    session/
  nvb-manifest.json
  runtime-nvb.json                 validated/generated aggregate
  task-catalog.json                validated/generated aggregate
  runtime-nvb.ts
```

`runtime-nvb.json` and `task-catalog.json` must not become giant hand-maintained
registries. `RT-02` defines a deterministic NVB build task that composes
capability fragments, rejects duplicate task/action IDs, and proves that the
generated aggregates are current.

## 3. Three deployment surfaces

### 3.1 Repository-development NVB

The repository-root `nvb.json` owns development and release engineering:

- compile source and tests;
- run Jasmine suites and architecture checks;
- build and validate help/schema artifacts;
- stage and validate `dist/`;
- package the runtime task catalog and handlers; and
- run distribution/global-install proof.

These tasks operate on the Watchtower source repository. They are not shipped
as lane actions and are never called as a substitute for `wt` commands.

### 3.2 Packaged runtime NVB

`runtime-nvb/` owns the product's internal mechanical task runtime. The
distribution contains:

```text
runtime-nvb/
  nvb-manifest.json
  runtime-nvb.json
  runtime-nvb.js
  task-catalog.json
  handlers/
```

The runtime and task-catalog manifests cover every config, module, handler,
task, group, leaf executable, checksum, mode, input schema, result schema,
mutability class, and minimum runtime compatibility.

The complete directory is staged into the immutable XDG runtime version. A lane
never executes a task target from a replaceable npm/global-install directory.

### 3.3 Lane task profile

`install.json` pins the effective runtime task substrate:

```json
{
  "taskRuntime": {
    "catalogId": "watchtower-runtime-nvb/v1",
    "catalogSha256": "<sha256>",
    "profile": "implementation-v1",
    "configTarget": "<immutable-runtime-root>/runtime-nvb/runtime-nvb.json",
    "moduleTarget": "<immutable-runtime-root>/runtime-nvb/runtime-nvb.js"
  }
}
```

`RT-02` fixes the precise schema and validation rules. The targets must resolve
inside the checksum-verified runtime root. A profile is an allowlist of catalog
task IDs; it contains no executable code and cannot add or override a handler.

Upgrade creates a new immutable runtime/catalog and explicitly rebinds the lane.
It never edits a participating project's NVB configuration.

### 3.4 Package dependency closure

The repository's `nira.json` pins the development ecosystem, but those
component symlinks are not distributable package evidence. Watchtower records
an exact Nirvana dependency closure in its distribution manifest. Direct dist
dependencies use exact versions; unused ecosystem components are omitted.

Before the Nirvana release channel is populated, bootstrap qualification packs
the selected ecosystem components into immutable npm artifacts, records their
names, versions, source digests, artifact digests, and transitive Nirvana
edges, and installs them with the Watchtower tarball into a fresh prefix. The
fixture disables source-worktree and ecosystem-symlink fallback. Final release
qualification repeats the proof against the declared registry or signed
release bundle. An E404, unresolved local `file:` edge, wildcard dependency,
or successful install that links back to the source tree is a failed closure,
not a relocated install.

Repository-development NVB composition uses the pinned parent-config mechanism
demonstrated by Nira. The root `nvb.json` remains a thin child over
capability-owned parent-chain fragments. Product runtime tasks remain separate
under `runtime-nvb/`; this development composition does not authorize
Watchtower to inspect or modify a participating repository's NVB config.

The repository runs `nvb check:development-nvb` to load that parent chain and
fail closed on missing, escaping, circular, or duplicate task/group parents.
Every target is canonicalized before it is read; a missing or broken target is
reported before containment, while an existing target whose canonical location
escapes the repository is rejected. The gate accepts only the closed NVB
development-config shape, compares effective task/group identities with the
checked-in baseline, and rejects root or hand-maintained registry fragments,
including the effective-catalog registry, over the engineering-standard
physical-line limit. This is a development
architecture gate, not a shipped lane action.

## 4. Layer and facade map

### 4.1 CLI and presentation

Use `makeCLI`, `BaseCommand`, `CArgMap`, `argUtil`, `pretty.output.*`,
`pretty.view()`, and `TerminalView`.

Commands own:

- CLI input normalization;
- workspace/lane selection;
- one application capability invocation;
- human/JSON presentation selection; and
- outer exit-code translation.

Commands never invoke NVB, storage, logging, SQL, or subprocess APIs directly.

The full-screen operator-session TUI is a distinct presentation application,
not a large command renderer. Its command class performs selection and
bootstrap, then delegates attachment lifecycle to focused TUI application
services. The pinned `TerminalView` does not provide full-screen input, layout,
focus, viewport, animation, or terminal-restoration semantics, so the TUI must
use the accepted generic Nirvana adapter defined by
[cli-session.md §14.4](cli-session.md#144-nirvana-tui-capability-and-renderer-selection).
Watchtower must not fill that gap with feature-local ANSI, width, layout,
keymap, theme, or animation utilities.

The selected engine behind that adapter is imperative `@opentui/core` plus
`@opentui/keymap` under Node `>=26.4.0`. No command or foundation module uses
React, Solid, Ink, JSX/TSX, Babel, or an OpenTUI framework binding. Native
renderer import and FFI bootstrap remain absent from ordinary one-shot command
paths and require the accepted `CA-18` compatibility evidence.

### 4.2 Guards, values, and collections

Use `X` for reusable type/value guards and Nirvana `Collection`/cursor
abstractions for collection semantics, lazy traversal, and bounded result
sets. Public contracts remain plain serializable values; do not leak facade or
collection instances into JSON envelopes.

### 4.3 Storage facade

The preferred ordinary-filesystem path is a focused Watchtower storage port
backed by the Nirvana storage facade. Suitable uses include:

- reading and listing checksum-verified managed assets;
- bounded directory traversal and file lookup;
- copying non-authoritative packaged assets;
- existence/stat/read operations after canonical path authorization;
- storage-relative watchers where the facade's symlink semantics are proven;
  and
- non-authoritative temporary/report files.

The facade is not imported throughout foundation code. A composition-root
adapter creates a storage instance rooted at an already authorized Watchtower
root and exposes a narrower capability such as `ManagedAssetStorage`,
`ReportStorage`, or `RuntimeStorage`.

The following need dedicated Watchtower adapters unless the pinned facade is
proven to expose every required semantic:

- canonicalization and containment across symlinks;
- create-once lane commit points;
- file and directory `fsync`;
- atomic replace/rollback protocols;
- append-only journal durability;
- cross-process file locking;
- exact ownership/mode preservation; and
- SQLite database access.

Calling raw filesystem APIs inside those named adapters is a documented
Nirvana API gap, not permission to spread `node:fs` through the application.
`DB-01` and the owning lifecycle batches must record the semantic comparison.

The pinned commons storage facade depends on configured storage-root bootstrap.
`RM-03` must prove a CLI-safe, multi-workspace bootstrap before Watchtower uses
the global facade. If a global singleton cannot safely represent concurrent or
multiple roots, Watchtower uses injected root-scoped storage instances behind
the same narrow ports and records the gap.

### 4.4 Logger facade

Use the Nirvana logger behind an injected `WatchtowerLogger` port for
diagnostic application logs:

- command start/end and normalized failure diagnostics;
- runtime/task selection and duration;
- redacted adapter failures;
- recovery/doctor diagnostic context; and
- debug detail excluded from normal human/JSON output.

Configure logging once at the composition boundary:

- before lane selection, use the operator-owned Watchtower XDG log root;
- after lane selection, attach lane ID, command/run ID, task ID, and batch ID as
  structured context and use the lane log root where the logger supports it;
- never let a worker-controlled path select the log destination; and
- redact environment values, tokens, prompts, proposals, model content, and
  repository credentials before calling the logger.

Logger output is not:

- command presentation;
- an NVB task result;
- a worker/coordinator event;
- an effect journal;
- an acceptance record; or
- authoritative recovery evidence.

Those remain typed outputs or specification-owned append-only journals. A log
write failure must not make a completed authoritative mutation appear undone;
strict audit writes use their owning durable store rather than the logger.

### 4.5 NVB facade and task runner

Application services depend on a `LaneTaskRunner` port. Its preferred adapter
uses the `@nirvana/commons` `nvb` facade with an explicit target:

```text
nvb.target(immutableRuntimeRoot, {
  configFile: pinnedConfigTarget,
  jsFile: pinnedModuleTarget
})
```

It runs an explicit allowlisted task or series and consumes structured
`NvbRunEvent` and `NvbRunResult` values. It never discovers a parent/project
`nvb.json`, accepts an arbitrary task name, or relies on the caller's current
directory.

The runner:

1. resolves and verifies the lane's install manifest;
2. verifies catalog/profile/runtime checksums;
3. maps one typed Watchtower action ID to one catalog task ID;
4. sets the lane control home as the explicit task `cwd`;
5. supplies only typed arguments or an invocation-envelope reference;
6. captures structured events/results and maps failures to Watchtower reason
   codes;
7. forwards cancellation/signals when the action contract permits; and
8. never renders output or makes a policy decision.

The pinned `nvb.run` API currently provides target, task, cwd, args, log file,
events, and typed result semantics. It must be verified for explicit
environment allowlisting, stdin/PTY behavior, and signal forwarding.
`RT-05` must either:

1. land and use conforming Nirvana API support; or
2. document `NIRVANA_API_GAP` and use one narrow adapter built on Nirvana
   `cmd` to invoke the same pinned NVB target with explicit argv, environment,
   stdio, cancellation, and result parsing.

Insecure environment inheritance or broken signal behavior is not an
acceptable fallback.

### 4.6 Task handlers

Each handler extends the public Nirvana `TaskHandler` export and owns one
mechanical capability. A handler:

- validates its typed input or invocation envelope;
- delegates domain rules to shared application modules rather than duplicating
  them;
- uses `onResult`, execution events, and `doneSignal` according to the pinned
  TaskHandler contract;
- returns a schema-valid result;
- contains no terminal rendering;
- contains no model/semantic judgment; and
- contains no interpolated shell command.

Task groups express deterministic order through NVB `preTasks`, `postTasks`, or
series groups. Parallel groups are allowed only for operations proven
independent, read-only, or protected by disjoint resources. Lock acquisition
order is never delegated to incidental task graph ordering.

### 4.7 Command execution and leaf adapters

Use Nirvana `cmd` for external processes and inspect Nirvana Git APIs before
creating Git wrappers. Commands and handlers pass an executable plus argv and a
sanitized environment.

Concrete `opencode-cli` and `hermes-cli` decision adapters use this same named
process boundary; commands never invoke either CLI directly. Their focused
modules own only detection, version/fingerprint capture, argv/env/cwd assembly,
bounded envelope/result transport, cancellation, catalog parsing, and
redaction. Provider routes/models remain serializable endpoint facts consumed
by provider-neutral eligibility, routing, budgeting, and reservation services.
No workflow shell, arbitrary executable path, or adapter-supplied environment
map is accepted. Hermes not being installed is a normal conditional-capability
result; OpenCode release qualification remains mandatory.

Shell files are permitted only as cataloged leaf executables when:

- the external tool is naturally shell-oriented or compatibility requires an
  existing audited script;
- the runtime manifest declares the executable and checksum;
- inputs arrive through argv or a validated envelope, never string
  interpolation or sourced untrusted configuration;
- the script performs one bounded capability; and
- its structured exit/result contract is tested.

A shell script must not coordinate a workflow that an NVB task group and
focused TaskHandlers can express.

## 5. Task selection model

NVB is valuable for repeatable multi-step mechanics, but spawning a task runner
for every pure function would add complexity and latency. Use this ownership:

| Capability | Direct application service | Packaged NVB task | Leaf adapter |
|------------|----------------------------|-------------------|--------------|
| Parse args/config/contracts | Yes | No | No |
| Discover/select a lane | Yes | No | Git root probe through approved API only |
| Query typed SQLite projection | Yes, through store | No | SQLite store only |
| Render human/JSON output | Yes | No | No |
| Validate proposal/policy/preconditions | Yes | No | No |
| Build/rebuild derived indexes | Plan/validate | Yes | Store adapter |
| Validate/stage runtime assets | Plan/verify | Yes | Storage adapter |
| Transactional lane initialization | Plan/authorize/commit verification | Yes, bounded steps | Durable storage adapter |
| Upgrade/migrate managed assets | Plan/authorize/verify | Yes | Storage adapter |
| Doctor suites and recovery probes | Aggregate results | Yes for multi-step probes | Tool-specific probes |
| Mechanical coordinator cycle | Route/authorize | Yes | Agent/tmux/store adapters |
| Apply an approved effect | Sole effect executor | Yes, capability-gated | Git/tmux/agent/file leaf |
| Development build/test/dist | No product service | Repository NVB | Built-in handlers |
| Foreground watcher/session UI | Product lifecycle owner | Only after PTY/signal proof | tmux/agent leaf as required |

## 6. Task catalog shape

The exact v1 catalog contract is generated by `RT-09` and follows these namespaces:

| Namespace | Purpose | Mutation class |
|-----------|---------|----------------|
| `wt:runtime:*` | Validate, stage, and inspect runtime/knowledge assets | Read or managed-runtime write |
| `wt:lane:*` | Initialize bounded lane pieces, inspect, doctor, recover | Mixed; each task declares class |
| `wt:index:*` | Compile, verify, rebuild derived SQLite stores | Derived-only write |
| `wt:upgrade:*` | Stage and apply managed version upgrades | Managed-lane write |
| `wt:coordinator:*` | Poll, project, route, prepare bounded cycles | Read/derived until explicit effect |
| `wt:effect:*` | Execute one preauthorized effect action | Authoritative/external effect |
| `wt:session:*` | Project/index bounded session data and retention work | Derived or journaled mutation |
| `wt:check:*` | Runtime integrity and product proof | Read-only |

Task names are internal and may not be supplied by users or decision agents.
Public commands map to stable Watchtower action IDs, and the catalog maps those
actions to task IDs.

### 6.1 Capability fragments and generated aggregates

The authoritative hand-maintained inputs are closed JSON documents:

```text
runtime-nvb/catalog/capabilities/*.catalog.json  lane task/handler/group/action/leaf declarations
runtime-nvb/profiles/*.profile.json            catalog-bound task-ID allowlists only
runtime-nvb/schemas/*.schema.json              closed catalog/profile/task contracts
```

Each capability fragment has schema version 1, a stable fragment ID, explicit
fragment includes, and closed handler, task, group, action, and leaf maps. A
task or group separates its ordinary NVB runtime definition from catalog
metadata: execution scope, versioned input/result schema IDs, mutation class,
invocation-envelope requirement, and leaf IDs. Repository-development tasks
may occur in the immutable catalog but can never occur in a lane profile. The
catalog generator's development entry is owned by `nvb/runtimeCatalog.nvb.json`.

A lane profile contains exactly `schemaVersion`, `profileId`, `catalogId`, and
`taskIds`. It cannot declare tasks, handlers, groups, actions, leaves, modules,
code, or runtime options. Every allowlisted ID must already name a
`lane-runtime` task or group in the same generated catalog.

The deterministic composer produces:

```text
runtime-nvb/runtime-nvb.json          executable NVB projection
runtime-nvb/task-catalog.json         immutable catalog plus profiles and schema registry
```

The executable projection contains only `lane-runtime` tasks/groups and the
handlers they directly require. Repository-development declarations remain in
the immutable catalog for audit and composition but are not lane-executable.
Every declared input/result schema ID and each catalog/profile aggregate
contract resolves through the generated schema registry to an immutable staged
artifact and its source-byte SHA-256.

It rejects malformed or extra fields, duplicate JSON properties and identities,
missing/circular fragment includes, noncanonical identity ordering, and every
dangling handler/runnable/action/leaf/profile reference. Generated objects and
identity arrays have canonical ordering. Equal source bytes therefore produce
byte-identical aggregates and the same semantic catalog SHA-256. Check mode is
read-only and rejects either missing or stale aggregate. Write mode serializes
writers, stages and flushes both files, replaces and directory-flushes the pair,
then durably cleans backup/lock evidence. Pre-commit failure rolls back both
authoritative bytes; rollback or post-commit durability uncertainty is a typed
failure that preserves or reports detectable recovery evidence.

## 7. Mutation invocation protocol

Read-only tasks receive a typed request after lane selection and checksum
validation. A mutating task additionally requires a lane-local, single-use
invocation envelope prepared by the sole Watchtower effect boundary:

```text
actionId
laneId
runtime/catalog identity
task ID and input-schema version
normalized bounded parameters
current-state/precondition digest
idempotency key
lock identity
creation and expiry timestamps
result/journal destinations
```

The envelope path is passed as argv. It must be inside the selected lane,
operator-owned, mode-restricted, checksum-bound, unexpired, and consumed only
by the named handler. Project files and agent proposals cannot create a valid
envelope.

The effect executor:

1. validates policy/current state;
2. acquires locks in the specified order;
3. writes the prepare journal;
4. creates the invocation envelope;
5. invokes one catalog task through `LaneTaskRunner`;
6. records attempt evidence from structured NVB events/results;
7. independently verifies the external/state effect;
8. commits or records recovery state; and
9. removes/expires the envelope before releasing locks.

NVB coordinates the mechanics inside step 5. It is not a second effect
executor.

## 8. Events, results, logs, and journals

These channels must remain distinct:

| Channel | Purpose | Authority |
|---------|---------|-----------|
| `NvbRunEvent` | Task/process lifecycle telemetry | Diagnostic execution evidence |
| `NvbRunResult` | Typed completion/failure result | Input to Watchtower verification |
| Nirvana logger | Redacted operational diagnostics | Non-authoritative |
| worker/coordinator events | Lane lifecycle facts defined by spec | Authoritative where specified |
| effect journal | Prepare/attempt/verify and recovery | Authoritative |
| command result | Human/JSON product response | Projection of verified state |

NVB event logs may be retained under lane `logs/`, but they cannot replace an
effect journal or repair state by their presence alone.

## 9. Shell-to-NVB migration rule

`RT-01` inventories every inherited shell script and classifies it as:

1. **replace with TaskHandler** — workflow/orchestration, validation, copying,
   projection, indexing, or multi-step recovery;
2. **retain as leaf adapter** — bounded tmux/Git/agent/tool integration with no
   suitable Nirvana API;
3. **wrap temporarily** — v1 compatibility leaf with an explicit removal
   owner; or
4. **remove** — duplicate, unsafe, obsolete, or outside the accepted product.

New workflow-level shell scripts are a hard reject. A retained leaf is invoked
only by its owning TaskHandler or the central adapter, never directly by a
command or model.

The foreground watcher and full-screen TUI attachment remain direct
application lifecycles rather than long-running NVB tasks. The TUI uses the
accepted generic Nirvana interactive-renderer adapter for input, layout,
rendering, and restoration; it invokes packaged NVB tasks only for bounded
sub-operations where doing so preserves the foreground contract. Any proposal
to host the TUI lifecycle through NVB requires explicit stdin, raw-mode,
resize, signal, suspend/resume, alternate-screen, and restoration proof.

## 10. Implementation and review acceptance

An NVB-owning batch is accepted only when it proves:

- the task is in the immutable manifest/catalog and the lane profile;
- the handler uses the public pinned Nirvana API;
- direct raw invocation cannot select an undeclared task or create authority;
- task inputs/results/events validate against versioned schemas;
- cwd, paths, environment, stdio, and signals match the action contract;
- mutation tasks require a valid invocation envelope and normal effect
  authority;
- task groups preserve lock order, rollback, and idempotency;
- logger/event output is redacted and non-authoritative;
- project `nvb.json` and source trees are unchanged;
- relocated global install and two-version lane fixtures pass; and
- the exact Nirvana dependency closure resolves without source or ecosystem
  symlink fallback; and
- shell retained by the batch is a justified, cataloged leaf adapter.

Reviewers hard-reject:

- project-root or user-editable Watchtower task definitions;
- arbitrary task names from CLI, config, proposal, or agent output;
- direct `nvb` subprocess calls outside `LaneTaskRunner`;
- workflow orchestration in shell;
- a TaskHandler containing product policy or terminal rendering;
- logger or NVB event logs treated as authoritative state;
- ambient environment inheritance where an allowlist is required;
- mutation without the effect executor and invocation envelope;
- duplicated logic between commands, handlers, and shell; or
- a local task runner when the pinned NVB API already provides the semantics.
