# Watchtower v1 — Implementation Map

Status: **Proposed — pack-authoring baseline**
Target release: `1.0.0`
Work batches: **59**
Required review batches: **59**
Last updated: 2026-07-31

This document maps the accepted Watchtower v1 specification into bounded
implementation work. It is the master construction plan from which six sealed
implementation packs are authored. It is not itself an implementation-pack
manifest, runtime tracker, or authority to change the product specification.

Normative behavior remains in:

- [v1.md](v1.md);
- [v1-contracts.md](v1-contracts.md);
- [schemas/v1.schema.json](schemas/v1.schema.json);
- [architecture.md](architecture.md);
- [nirvana-integration-architecture.md](nirvana-integration-architecture.md);
- [coordinator-automation.md](coordinator-automation.md);
- [operator-session.md](operator-session.md); and
- [cli-session.md](cli-session.md).

All implementation and review batches are also governed by the mandatory
[engineering and review standard](../development/engineering-and-review-standard.md).

If implementation exposes a missing product decision, the affected batch
stops and raises a specification amendment. A work batch may make bounded
implementation clarifications, but it may not silently invent public behavior.

## 1. Delivery shape

V1 is split into six independently accepted implementation packs:

| Order | Pack | Milestones | Work/review pairs | Exit product |
|------:|------|------------|------------------:|--------------|
| 1 | `wt-read-model` | M1 | 11 | Storage feasibility plus read-only discovery, inspection, and stable output |
| 2 | `wt-runtime-distribution` | M2 | 7 | Complete versioned runtime/knowledge distribution |
| 3 | `wt-lane-lifecycle` | M3–M4 | 8 | Transactional init, watch, and doctor |
| 4 | `wt-upgrade-knowledge` | M5 | 5 | Safe upgrades and host knowledge installation |
| 5 | `wt-coordinator-automation` | M6 | 24 | Bounded decisions, effects, sessions, and full-screen terminal UX |
| 6 | `wt-v1-release` | M7 | 4 | End-to-end qualification and release |
| | **Total** | | **59 work + 59 review** | |

Each work batch has exactly one matching review batch named
`REV-<work-batch-id>`. Corrections retain the same work/review identity and
append a correction number; they are not preallocated as additional batches.
Only the reviewer owns the acceptance commit.

### 1.1 Storage-amendment impact

Any implementation pack authored from the earlier 52-batch/hash-shard map is
superseded and must not initialize an implementation lane. Pack authors must:

1. add the `DB-01` work/review pair to `wt-read-model`;
2. add the SQLite driver packaging dependency and proof to `RT-03`;
3. rewrite `CA-01`, `CA-02`, `CA-03`, and `CA-16` for the derived SQLite
   contracts;
4. extend `REL-03` with driver/global-install, integrity, busy/WAL/permission,
   corruption, semantic-root, and rebuild qualification;
5. update indexes, roadmaps, trackers, difficulty rankings, traceability, and
   counts from 52 to 53; and
6. repeat independent pack review and seal after exact bytes are settled.

Mechanical filename or prose substitution is insufficient because the storage
failure model, proof, packaging, and semantic-identity rules changed.

### 1.2 Full-screen-TUI amendment impact

Any implementation pack that still defines one monolithic `CA-18` session
CLI/PTY batch is superseded and must not dispatch that batch. The full-screen
v1 TUI changes the delivery shape from a line-oriented attachment to a
component TUI with renderer/native packaging, responsive layout, conversation,
inspector, command, streaming, accessibility, and recovery responsibilities.

Pack authors must:

1. replace the old `CA-18` brief with `CA-18` through `CA-24` as mapped in §8;
2. add one independent review brief and evidence report per work batch;
3. update pack README, dependency graph, roadmap, tracker, work/review indexes,
   reasoning rankings, agent prompts, traceability, and counts;
4. perform the renderer/Nirvana integration gate before product components;
5. keep scale/replay and final M6 acceptance in `CA-24`, independent of feature
   implementation assertions; and
6. repeat pack review and sealing after the exact replacement briefs settle.

The former `CA-18` may remain as historical evidence only after being marked
superseded. It is not an authorized implementation brief.

The replacement CA-18 is now drafted as:

- `implementation/wt-coordinator-automation/work-batches/CA-18-nirvana-opentui-feasibility-and-packaging-gate.md`
- `implementation/wt-coordinator-automation/review-batches/CA-18-review-nirvana-opentui-feasibility-and-packaging-gate.md`

The CA-18 through CA-24 briefs, prompts, indexes, and reasoning allocations are
now repacked. Dispatch remains blocked until an independent pack review accepts
their exact cross-references/counts and the resulting pack is sealed.

## 2. Current and target architecture

### 2.1 Current source baseline

The repository is a Nirvana CLI scaffold:

```text
src/cli.ts                 thin outer host
src/run.ts                 Nirvana command runner
src/commands/              command classes
src/foundation/            shared product services
src/contracts/             public/internal shared types
help/                      static command help
runtime-nvb/               distribution/build automation
spec/                      Jasmine specifications
docs/spec/                 normative product contracts
```

The scaffold `hello` command, help, test, and runtime task are temporary. They
remain available until the first real command path and build smoke test exist,
then are removed by `LC-08`.

### 2.2 Target ownership

| Concern | Target owner | Forbidden placement |
|---------|--------------|---------------------|
| CLI selection/bootstrap | `src/cli.ts`, `src/run.ts` | Product behavior or lane mutation |
| Command orchestration/rendering | `src/commands/` | Duplicated path, parser, or runtime logic |
| Paths/discovery/config/state | `src/foundation/` | Ad hoc command-local implementations |
| Shared schemas/types/errors | `src/contracts/` | Untyped command-specific shapes |
| Mechanical workflow execution | Immutable packaged NVB catalog invoked through `LaneTaskRunner` | Project-root tasks or arbitrary task selection |
| Shell/tmux/Git/agent effects | Cataloged leaf adapters invoked by focused TaskHandlers | Workflow-level shell or direct command/agent escape |
| Coordinator policy | Versioned knowledge pack | Semantic policy restated in TypeScript |
| Public help | `help/commands/`, `help/help.json` | Undocumented flags implemented only in code |
| Product acceptance | `spec/` plus end-to-end fixtures | Manual-only claims |

### 2.3 Stable construction path

```text
contracts and pure parsers
  → discovery/read projections
  → runtime distribution
  → transactional lane lifecycle
  → upgrade boundary
  → coordinator indexes/routing/effects
  → operator sessions/attachments
  → release qualification
```

No mutating command precedes accepted read-model and runtime-distribution
foundations. No model-backed coordinator work precedes deterministic indexes,
routing guards, proposal validation, and the effect executor.

## 3. Global batch contract

Every work brief generated from this map must state:

1. accepted specification references;
2. exact files/modules it owns;
3. dependencies and assumed accepted evidence;
4. required public/internal interfaces;
5. implementation steps and explicit exclusions;
6. unit, integration, adversarial, and compatibility proof;
7. documentation/help/schema changes;
8. expected report artifacts; and
9. independent review instructions.

Every matching review brief must independently verify:

- no behavior was invented beyond accepted specifications;
- layer ownership and dependency direction are preserved;
- the required Nirvana API usage audit proves Nirvana-first implementation;
- packaged NVB task/catalog/profile and facade boundaries match
  [nirvana-integration-architecture.md](nirvana-integration-architecture.md);
- module/function size evidence and architecture gates satisfy the mandatory
  engineering standard;
- public JSON and errors match the schema/version contract;
- reads have no hidden writes;
- path/config/untrusted-input boundaries fail closed;
- mutations use declared locks, atomic writes, and recovery rules;
- agent output cannot bypass proposal validation/effect authority;
- human help and normative documentation match;
- `nvb build` and the relevant Jasmine suites pass; and
- no generated, distribution, local-lane, or dependency artifact is committed.

The review report must include the engineering standard's acceptance matrix.
Any failed gate rejects the batch; known violations cannot be accepted with a
follow-up correction promise.

Global hard rejects include:

- product logic added to `src/cli.ts`;
- a god object, mixed-responsibility module, generic helper bag, or unapproved
  module/function size violation;
- bypassing a suitable Nirvana API without a proven `NIRVANA_API_GAP`;
- raw subprocess, terminal, filesystem, SQL, or shell behavior outside its
  declared adapter boundary;
- project-root/user-editable Watchtower tasks, arbitrary NVB task selection,
  direct NVB invocation outside `LaneTaskRunner`, or workflow-level shell;
- shell evaluation of lane config or state by TypeScript;
- full-pack/full-session fallback when an index is unavailable;
- model use for an M0 operation;
- direct agent mutation of authoritative state;
- status/doctor/discovery repairing data implicitly;
- unmanaged overwrite, path escape, or shared-write authorization by default;
- acceptance inferred from tmux prose;
- reviewer acceptance conflated with Git publication; or
- command/help/schema drift;
- missing Nirvana audit, size evidence, architecture-gate evidence, or reviewer
  acceptance matrix.

## 4. Pack 1 — `wt-read-model` (M1)

Purpose: prove the embedded derived-storage substrate and establish all
pure/read-only contracts before workspace mutation.

| ID | Work batch | Depends on | Primary ownership | Required proof |
|----|------------|------------|-------------------|----------------|
| `RM-01` | Contract kernel, error taxonomy, and source architecture gates | — | `src/contracts/`, contract and architecture test helpers | Versioned IDs/types; exit-code mapping; exhaustive error fixtures; automated engineering-standard hard rejects |
| `DB-01` | SQLite driver, packaging, and derived-store feasibility | `RM-01` | storage interfaces, feasibility fixtures, ADR | Node/NVB/dist/global install; parameterization; FK/integrity; busy/WAL/permissions; rebuild and semantic-root proof |
| `RM-02` | Public JSON envelopes and schema validation | `RM-01` | contracts, render/serialization foundation | Success/error envelopes; additive compatibility; no decorative JSON output |
| `RM-03` | Canonical paths and workspace resolution | `RM-01` | path/workspace foundation | Resolution precedence; symlink/case/path-escape fixtures; missing explicit workspace |
| `RM-04` | Strict env and lane-state parsers | `RM-01` | parser foundation | Accepted scalar grammar; malicious shell corpus never executes; unknown-key preservation |
| `RM-05` | Durable worker-event JSONL parser | `RM-01` | event contracts/foundation | Role/event compatibility; malformed/partial-line handling; bounded latest lookup |
| `RM-06` | Home-lane discovery and deterministic selection | `RM-03`, `RM-04` | discovery/selection foundation | Descendant/lane-dir discovery; UUID/slug precedence; complete ambiguity matrix |
| `RM-07` | Membership index and secondary-repository discovery | `RM-03`, `RM-06` | membership/discovery foundation | Advisory validation; stale entries ignored/reported; reads never repair |
| `RM-08` | Repository bindings and writable conflict inspection | `RM-03`, `RM-07` | repository/conflict foundation | Canonical bindings; branch/worktree/access checks; claim overlap matrix |
| `RM-09` | Tmux, watcher, heartbeat, and worker observations | `RM-04`, `RM-05` | observation foundation | Qualified names; stale heartbeat; presence never treated as lifecycle authority |
| `RM-10` | `list`, `config show`, and `status` | `RM-02`, `RM-06`–`RM-09` | commands, help, integration specs | Human/JSON parity; redaction; stable status schema; full read-only hash proof |

### RM implementation notes

- `RM-01` fixes domain types without depending on Nirvana rendering and
  establishes the source architecture suite required by the engineering
  standard. Every later batch extends that suite when it introduces a new
  repeatable architecture rule or closes a checker gap.
- `DB-01` selects and proves one conforming SQLite driver. Failure blocks
  derived-store implementation and requires a spec amendment; there is no
  silent JSON-shard fallback.
- `RM-02` supplies one serializer used by every later command.
- `RM-03`–`RM-05` may proceed in parallel after `RM-01`.
- `RM-06` is the authority for lane selection; commands may not reimplement it.
- `RM-10` is accepted only when empty, single-lane, ambiguous, invalid,
  multi-repository, stale-index, and busy-lock fixtures all pass.

Pack exit: one driver/storage boundary is proven for the supported distribution
targets and, from any relevant repository location, the CLI can identify,
select, and describe managed lanes without changing any byte.

## 5. Pack 2 — `wt-runtime-distribution` (M2)

Purpose: turn inherited coordinator behavior into a complete, immutable,
auditable NVB task runtime, cataloged leaf set, and knowledge distribution.

| ID | Work batch | Depends on | Primary ownership | Required proof |
|----|------------|------------|-------------------|----------------|
| `RT-01` | Canonical runtime/knowledge audit and shell classification | `RM-01` | `runtime/`, `knowledge/`, import record | Source provenance; no omitted action/doc; every script classified as TaskHandler, leaf, temporary wrapper, or removal |
| `RT-02` | Runtime, knowledge, NVB task-catalog, and lane-profile manifests | `RT-01` | capability catalog fragments, deterministic aggregate task, manifests and validation contracts | Every asset/checksum/mode/action/task/input/result represented; duplicate/stale aggregate rejection; profile cannot add code/tasks; missing/extra rejection |
| `RT-03` | Packaged NVB task runtime and distribution staging | `RT-02`, `DB-01` | `runtime-nvb/`, TaskHandlers, dist configuration | Public pinned TaskHandler API; structured events/results; required dist including SQLite driver; executable preservation; checksum-pinned target manifest and reproducible validation; no target promotion without native/TUI proof |
| `RT-04` | Immutable data-root catalog and staging | `RT-02`, `RM-03` | runtime catalog foundation | XDG precedence; atomic first stage; two versions coexist; immutable version roots |
| `RT-05` | `LaneTaskRunner` and leaf invocation adapter | `RT-03`, `RT-04`, `RM-01` | task/runtime adapters foundation | Explicit pinned NVB target; allowlisted action→task map; typed events/results; argv-only leaves; environment/cwd/account/access validation; signal/exit forwarding; NVB API gap proof |
| `RT-06` | Managed lane links, task profiles, and compatibility names | `RT-04`, `RT-05` | managed-asset/task-profile foundation | Manifest-only ownership; task catalog/profile pin; project `nvb.json` unchanged; link targets/checksums; collision/path-escape refusal |
| `RT-07` | Packaged watcher and task-runtime smoke proof | `RT-03`, `RT-05`, `RT-06` | integration fixtures | Relocated package works; catalog/profile escape rejected; structured task result; wake stdout/signal behavior; worker accounts read but cannot write |

Pack exit: the npm distribution contains one provably complete runtime and
knowledge version that can be staged and invoked independently of package
source location.

## 6. Pack 3 — `wt-lane-lifecycle` (M3–M4)

Purpose: create and operate new managed lanes safely.

| ID | Work batch | Depends on | Primary ownership | Required proof |
|----|------------|------------|-------------------|----------------|
| `LC-01` | Init argument resolution and preflight plan | `RM-03`, `RM-08`, `RT-04` | init planning foundation/command | Exact syntax; no destination creation in preview; prefix/scope/routing validation |
| `LC-02` | Pack acceptance, seal, and drift validation | `RM-01`, `RM-08` | pack consumer foundation | JSON Schema; RFC 8785 seal reproduction; Git/file-set/drift reason matrix |
| `LC-03` | Transactional lane layout and manifests | `LC-01`, `LC-02`, `RT-06` | lane store foundation | Adjacent staging; atomic commit point; failure at every write/fsync/rename stage |
| `LC-04` | Bindings, Git-ignore, and membership registration | `LC-03`, `RM-07` | repository/index mutation foundation | Lock order; conditional Git-ignore rollback; post-commit idempotent registration |
| `LC-05` | Coordinator/session baselines and initial pack index | `LC-02`, `LC-03`, `RT-02` | initialization/index bootstrap | Finite policies; correct provenance; sealed index; no model or full-pack runtime fallback |
| `LC-06` | Foreground `watch` command | `LC-05`, `RT-07` | watch command/runtime adapter | Preflight; exec behavior; stdout and Ctrl-C compatibility; no daemonization |
| `LC-07` | Comprehensive `doctor` registry | `LC-04`–`LC-06`, `RM-09` | doctor foundation/command/help | Pass/warn/fail/skip; account/tool/pack/policy/index/permission checks; read-only |
| `LC-08` | Lifecycle integration and scaffold removal | `LC-07`, `RM-10` | end-to-end specs, help registry | Init→status→watch/doctor fixture; rollback proof; remove all hello artifacts safely |

Pack exit: an operator can preview and create a valid new lane, inspect it,
run its watcher, and diagnose it without copied runtime trees or partial state.

## 7. Pack 4 — `wt-upgrade-knowledge` (M5)

Purpose: update managed software and install host knowledge without changing
lane-owned values or history.

| ID | Work batch | Depends on | Primary ownership | Required proof |
|----|------------|------------|-------------------|----------------|
| `UK-01` | Upgrade compatibility and preview planner | `LC-03`, `RT-02` | upgrade foundation/command | Runtime/knowledge/schema matrix; changed/preserved/conflict classification |
| `UK-02` | Lane/session/index migration registry | `UK-01`, `LC-05` | migration foundation | Pure version steps; staged rebuild; value/history/pin/lifecycle preservation |
| `UK-03` | Atomic upgrade apply, recovery, and downgrade guard | `UK-02`, `RT-04`, `RT-06` | install pointer/store | Manifest-last switch; crash recovery; old runtime remains usable; guarded downgrade |
| `UK-04` | Codex, Cursor, and Claude knowledge installers | `RT-01`, `RT-02` | host adapters and skill command | Preview/replace/scope behavior; version record; no false notification claim |
| `UK-05` | Version reporting and upgrade conformance | `UK-03`, `UK-04` | version command/help/integration | CLI/runtime/knowledge/schema report; two-version fixtures; collision and failed migration |

Pack exit: operators can preview and apply a compatible managed upgrade and
install the matching knowledge adapter without overwriting lane-owned data.

## 8. Pack 5 — `wt-coordinator-automation` (M6)

Purpose: implement zero-token mechanical routing, bounded decision cycles, one
effect authority, and durable bounded operator sessions.

| ID | Work batch | Depends on | Primary ownership | Required proof |
|----|------------|------------|-------------------|----------------|
| `CA-01` | Deterministic sealed-pack SQLite compiler | `DB-01`, `LC-02`, `LC-05` | pack index foundation | Identical logical rows/semantic root; path/digest/FK checks; staged immutable publication; linear build |
| `CA-02` | SQLite index stores and bounded typed queries | `CA-01` | index store/query foundation | Indexed bounded reads; limits/cursors/truncation; no direct SQL; stale/missing/corrupt block |
| `CA-03` | Runtime SQLite indexes and projections | `RM-05`, `CA-02` | runtime index/projection foundation | Journal checkpoints; single writer/WAL readers; incremental append; corruption and staged rebuild |
| `CA-04` | Ready set and resource-claim projection | `RM-08`, `CA-01`, `CA-03` | scheduling projection | DAG/dependency/claim/capacity blockers; no arbitrary winner |
| `CA-05` | Ordered routing policy and capability floors | `CA-04`, `RT-02` | routing foundation/knowledge projection | Every v1 rule/guard; first-match determinism; D1/C2, D2/C3, D3/C5 floors |
| `CA-06` | Endpoint adapter eligibility and isolation | `RT-05`, `CA-05` | provider-neutral adapter layer | Unattended/advisory/skill-only classification; argv/env/cwd/output/time bounds |
| `CA-07` | Immutable decision envelopes | `CA-02`–`CA-06` | envelope foundation | Stable semantic digest; bounded default context; untrusted-content delimiting |
| `CA-08` | Context broker and cycle budgets | `CA-02`, `CA-06`, `CA-07` | broker/usage foundation | Allowlisted queries; provenance/redaction; soft/hard limits; usage quality |
| `CA-09` | Typed proposals and current-state validator | `CA-05`, `CA-07`, `CA-08` | proposal contracts/validator | Every proposal type; permitted origin/class/effect; stale/illegal/invalid cases |
| `CA-10` | Atomic lane-local effect executor and invocation envelopes | `LC-03`, `CA-09` | effect foundation/NVB task boundary | One authority; lock/revalidation/idempotency; single-use task envelope; all-or-nothing projections/journals |
| `CA-11` | Tmux prepare/attempt/verify effect handler | `RT-05`, `CA-10` | focused TaskHandler and tmux leaf | Unknown launch recovery; duplicate suppression; no arbitrary task/kill/shell |
| `CA-12` | Acceptance and Git publication handler | `RM-08`, `CA-10` | focused TaskHandler and Git leaf/verification | Reviewer-session ownership; commit-set validation; partial push recovery; Nirvana Git API audit |
| `CA-13` | Coordinator queue, cursor, replay, and watcher task integration | `CA-03`, `CA-05`, `CA-10`–`CA-12` | watcher/coordinator TaskHandlers | Stable priority; fsynced cursor advance; interrupted/duplicate/uncertain replay; no workflow-level shell |
| `CA-14` | Coordinator, event, and ready-set commands | `CA-01`–`CA-13` | commands/help/rendering | Index/status/context/explain/cycle/escalate/events/ready; dry-run purity |
| `CA-15` | Operator-session persistence and lifecycle | `CA-03`, `UK-02` | session store/contracts | Many sessions; one active turn each; immutable closed history; crash-safe journals |
| `CA-16` | Session SQLite index, references, pins, and compaction | `CA-02`, `CA-15` | session memory foundation | Bounded metadata/excerpts; exact text remains journal-owned; same-lane capsules; no full-history fallback |
| `CA-17` | Session routing, budgets, proposals, holds, and amendments | `CA-06`, `CA-08`–`CA-10`, `CA-15`, `CA-16` | session services/effect integration | M0/D1–D3; grants/reserves; confirmation/revalidation; scoped hold interleaving |
| `CA-18` | Nirvana/OpenTUI feasibility and packaging gate | `RT-03`, `RT-05`, `CA-14`–`CA-17` | generic TUI adapter/architecture fixtures | Exact Linux x86_64/glibc and Node `>=26.4.0` baseline; experimental-FFI bootstrap; imperative core/keymap only; Nirvana/NVB/dist/native artifacts; terminal restore/security; pass/fail evidence |
| `CA-19` | TUI shell, responsive layout, themes, and focus | `CA-18` | TUI application shell/components | Wide right inspector shell; model-free lane entry; P0–P5 attention; standard/narrow layouts; resize; focus/keymap; themes; transactional preferences; bounded animation |
| `CA-20` | Conversation timeline, composer, history, and references | `CA-16`, `CA-19` | conversation/composer components | Virtualized paging; multiline input; bounded draft recovery; paste; completion; index-bounded timeline search/reference pickers; scroll anchoring |
| `CA-21` | Inspector views, command palette, and overlays | `CA-14`, `CA-17`, `CA-19` | inspector/action/overlay components | All bounded inspector states; projection-only agent/allocation view; bounded search/attention; canonical action parity; confirmation, diagnostics, and details overlays |
| `CA-22` | Turn streaming, notifications, concurrency, and observer UI | `CA-17`, `CA-20`, `CA-21` | turn/event reducers and attachment controller | Provisional validation; live edge; stale confirmation invalidation; cross-attachment contention/wait; observer restrictions; priority-preserving coalesced refresh |
| `CA-23` | Accessibility, terminal lifecycle, recovery, and PTY matrix | `CA-18`–`CA-22` | accessibility/restoration/test adapters | Exact promoted matrix; no-color/high-contrast/reduced motion; signals/suspend/crash restore; preference/cache migration; semantic visual catalog; emulator/Unicode/resize fixtures |
| `CA-24` | Session command integration, scale/replay, and M6 acceptance | `CA-14`–`CA-23` | command/help integration and independent acceptance proof | `--lane` create/attach/resume/observe plus `ask`; `doctor --tui` and redacted report; zero/one/many-lane entry; 30–10k pack scale; long-session replay; complete M6 gate |

### CA implementation notes

- `CA-01`–`CA-04` are entirely model-free.
- `CA-05` classifies; it does not execute.
- `CA-06` proves adapter eligibility before any unattended invocation.
- `CA-09` and `CA-10` must be accepted before enabling `CA-11`–`CA-13`.
- `CA-15`–`CA-17` may be developed against accepted service fixtures while
  `CA-14` is built; all are required before the TUI product batches.
- `CA-18` is a Node/Nirvana/OpenTUI feasibility gate. It cannot land product
  behavior, silently change renderer, or bypass a failed compatibility result.
- `CA-19`–`CA-22` divide presentation by responsibility and may parallelize
  only along the declared dependencies and disjoint files.
- `CA-23` independently closes accessibility and terminal-restoration risk.
- `CA-24` must show that unrelated pack/session growth does not increase
  ordinary model context and that advisory turns never hold the lane lock.

Pack exit: routine coordination invokes no model; judgment is bounded and
capability-matched; all effects pass through one validated executor; operators
have durable bounded sessions without acquiring mutation authority.

## 9. Pack 6 — `wt-v1-release` (M7)

Purpose: qualify the assembled product rather than add features.

| ID | Work batch | Depends on | Primary ownership | Required proof |
|----|------------|------------|-------------------|----------------|
| `REL-01` | Fresh-lane implementer→reviewer→accept trial | `LC-08`, `UK-05`, `CA-24` | end-to-end fixture/release evidence | Global install; init; dispatch; handoff; independent accept; publication |
| `REL-02` | Concurrent and multi-repository recovery trials | `REL-01` | system acceptance fixtures | Two isolated lanes; multi-repo commit set; shared-write refusal; partial push recovery |
| `REL-03` | Security, ownership, performance, and package qualification | `REL-01`, `REL-02` | release/security/performance evidence | Traversal/config/permission suite; bounded discovery/status; task/catalog/profile escape and environment isolation; manifest/global install proof |
| `REL-04` | Documentation consistency and release gate | `REL-01`–`REL-03` | help/docs/release notes | Every v1 acceptance item traced; no scaffold/generated artifacts; final package version/readme |

Pack exit: every release criterion in [v1.md §17](v1.md#17-release-acceptance)
has current reproducible evidence and the globally installed package completes
one real managed-lane cycle.

## 10. Dependency graph and parallel waves

### 10.1 Pack-level graph

```text
wt-read-model ───────────────┐
  ├─ wt-runtime-distribution ├─ wt-lane-lifecycle
  │                          │       ├─ wt-upgrade-knowledge
  │                          └───────┴─ wt-coordinator-automation
  └───────────────────────────────────────────────┐
                                                  ▼
                                            wt-v1-release
```

Pack acceptance is the default cross-pack dependency. A later pack may begin
fixture-only preparation against an accepted interface from an earlier batch,
but it cannot merge production integration before the owning pack is accepted.

### 10.2 Safe parallel waves

| Wave | Eligible work after dependencies accept |
|------|-----------------------------------------|
| 1 | `RM-01` |
| 2 | `DB-01`, `RM-02`, `RM-03`, `RM-04`, `RM-05`, `RT-01` |
| 3 | `RM-06`, `RM-09`, `RT-02` |
| 4 | `RM-07`, `RT-03`, `RT-04` |
| 5 | `RM-08`, `RT-05` |
| 6 | `RM-10`, `RT-06` |
| 7 | `RT-07`, `LC-01`, `LC-02` |
| 8 | `LC-03` |
| 9 | `LC-04`, `LC-05`, `UK-01` |
| 10 | `LC-06`, `UK-02`, `CA-01` |
| 11 | `LC-07`, `CA-02`, `UK-03`, `UK-04` |
| 12 | `LC-08`, `CA-03`, `UK-05` |
| 13 | `CA-04`, `CA-15` |
| 14 | `CA-05`, `CA-16` |
| 15 | `CA-06` |
| 16 | `CA-07` |
| 17 | `CA-08` |
| 18 | `CA-09` |
| 19 | `CA-10` |
| 20 | `CA-11`, `CA-12`, `CA-17` |
| 21 | `CA-13` |
| 22 | `CA-14` |
| 23 | `CA-18` |
| 24 | `CA-19` |
| 25 | `CA-20`, `CA-21` |
| 26 | `CA-22` |
| 27 | `CA-23` |
| 28 | `CA-24` |
| 29 | `REL-01` |
| 30 | `REL-02` |
| 31 | `REL-03` |
| 32 | `REL-04` |

This is an admissible schedule, not a requirement to fill every wave with
parallel agents. Repository ownership, reviewer availability, endpoint
capacity, and active worktree isolation still govern dispatch.

### 10.3 Critical path

The minimum product critical path is:

```text
RM-01 → RM-03 → RM-06 → RM-07 → RM-08 → RM-10
  → LC-01 → LC-03 → LC-05 → CA-01 → CA-02 → CA-03 → CA-04
  → CA-05 → CA-06 → CA-07 → CA-08 → CA-09 → CA-10
  → CA-13 → CA-14 → CA-18 → CA-19 → CA-20 → CA-22
  → CA-23 → CA-24 → REL-01 → REL-02 → REL-03 → REL-04
```

Runtime dependencies `RT-01`–`RT-07` join before lane operation, and upgrade
dependencies `UK-01`–`UK-05` join before release qualification.
`DB-01` joins before `RT-03` packages the driver and before `CA-01` implements
the first production SQLite store.

## 11. Compatibility surfaces

The following surfaces require explicit golden fixtures before their owning
pack is accepted:

| Surface | Owning batches |
|---------|----------------|
| CLI command names, global options, stdout/stderr, exit codes | `RM-01`, `RM-02`, each command batch |
| JSON schema version 1 | `RM-02`, `RM-10`, `CA-14`, `CA-24` |
| `lane.json`, `install.json`, bindings and strict env/state | `RM-04`, `LC-03`, `LC-04` |
| Membership index and secondary discovery | `RM-07`, `LC-04` |
| Runtime/knowledge manifests and `WT_*` invocation | `RT-02`, `RT-05` |
| Managed runtime script names and wake behavior | `RT-06`, `RT-07`, `LC-06` |
| Pack manifest/acceptance/lock/seal | `LC-02`, `CA-01` |
| Derived-store manifest, SQLite schema, semantic root, and rebuild | `DB-01`, `CA-01`–`CA-03`, `CA-16` |
| Worker/coordinator/effect/session JSONL | `RM-05`, `CA-03`, `CA-13`, `CA-15` |
| Routing/proposal/effect registries | `CA-05`, `CA-09`, `CA-10` |
| Session CLI, TUI layout/input/rendering, PTY signals, presentation events | `CA-18`–`CA-24` |
| Upgrade/migration compatibility | `UK-01`–`UK-03` |

Schema-compatible readers preserve unknown fields but never treat unknown
types, transitions, events, or effects as authority.

## 12. Proof and documentation ownership

| Proof class | Primary owner | Release consumer |
|-------------|---------------|------------------|
| Unit/contract fixtures | Owning work batch | Matching review batch |
| Filesystem and Git integration | `RM-03`–`RM-08`, `LC-02`–`LC-04` | `REL-03` |
| Runtime packaging/smoke | `RT-02`–`RT-07` | `REL-01`, `REL-03` |
| SQLite driver/storage feasibility | `DB-01`, `CA-01`–`CA-03`, `CA-16` | `REL-03` |
| Transaction crash/replay | `LC-03`, `UK-03`, `CA-03`, `CA-10`–`CA-13` | `REL-02`, `REL-03` |
| PTY/accessibility | `CA-18`, `CA-19`, `CA-23`, `CA-24` | `REL-01`, `REL-03` |
| Cost and scaling | `CA-01`, `CA-02`, `CA-08`, `CA-20`, `CA-22`, `CA-24` | `REL-03` |
| End-to-end acceptance | `REL-01`, `REL-02` | `REL-04` |

Every command-owning batch updates its help fragment and the relevant
specification status marker. Foundation-only batches update architecture or
contract documentation when an implementation clarification affects module
boundaries. `REL-04` audits; it does not retroactively invent missing help.

## 13. Rejected shortcuts

The following are explicitly outside this map:

- one monolithic “build Watchtower” implementation pack;
- implementing mutating commands before the read model and runtime boundary;
- copying the complete runtime into each lane;
- using the future pack-design or allocation-planning commands as v1
  dependencies;
- parsing or rewriting arbitrary Markdown as authoritative state;
- embedding provider/model names into committed implementation packs;
- allowing decision agents filesystem/effect authority;
- falling back to full-pack or full-session prompts;
- treating status health as a lifecycle transition;
- using Git author strings as reviewer-session ownership;
- combining semantic acceptance and multi-repository publication; and
- deferring help, schema, recovery, security, or end-to-end proof to an
  unspecified cleanup phase.

## 14. Pack-authoring sequence

For each of the six packs:

1. create the pack root and structural manifest;
2. map the relevant batches above into work/review brief pairs;
3. add requirement traceability to exact normative sections;
4. record repository/path claims and batch dependencies;
5. add shared quality, Git, report, and reviewer rules;
6. define deterministic commands/evidence for every proof obligation;
7. independently review the pack for completeness and consumability;
8. record acceptance and seal the exact committed bytes; and
9. initialize the implementation lane only after the prior required pack gate
   is accepted.

The first pack to author is `wt-read-model`. Later pack design may proceed far
enough to identify interface risks, but must not override or assume acceptance
of earlier pack outputs.

## 15. V1 map completion gate

The implementation map is fulfilled only when:

- all 59 work batches have matching independent review outcomes;
- all six implementation packs are accepted and sealed;
- every cross-pack compatibility surface has reproducible golden evidence;
- every v1 release criterion traces to an accepted batch and proof;
- no critical specification amendment remains unresolved;
- the committed package contains no scaffold-only command or generated/local
  artifact; and
- `REL-04` records the final release verdict.

Completion of a batch count alone is not v1 acceptance. The reviewer-owned
evidence and release gates remain authoritative.
