# Watchtower v1 Implementation-Pack Planning Remediation

Status: **Proposed by specification authority — dispatch hold active pending independent acceptance and reseal**

Date: 2026-07-31

Revision: **Design correction 01 after independent `REJECT_DESIGN` of
`9317513`**

This amendment repairs implementation-pack defects exposed by repeated review
rejections in RM-01, DB-01, and RM-02 and by a complete pre-dispatch audit of
all 59 original work/review pairs. It changes planning and specification only;
it accepts no product implementation.

Until this amendment is independently reviewed and the affected packs are
resealed, no untouched batch may be dispatched. RM-01 and DB-01 remain accepted
under their preserved independent review outcomes. RM-02 remains impact-scoped
blocked. Unrelated observation, review, and specification work may continue.

## 1. Findings

The original bootstrap acceptance missed the following blocking defects:

1. The package proof assumed that unpublished `@nirvana/*` dependencies could
   be resolved from the public npm registry. Folder-global installs followed
   workspace symlinks and therefore did not prove relocation.
2. The 202-line repository `nvb.json` already exceeds the 180-line registry
   hard limit. RM-02 was forced to remediate unrelated build-registry debt when
   it added schema staging.
3. The 374-line aggregate v1 JSON Schema is within 26 lines of its 400-line
   contract-registry hard limit even though many later batches must add public
   definitions.
4. LC-05 implemented a temporary JSON pack index while CA-01 implemented the
   normative SQLite compiler and depended on LC-05. This duplicated ownership
   and inverted the dependency.
5. UK-02 required concrete v1-to-v2-to-v3 migrations for session and index
   formats that CA-15 and CA-16 had not yet implemented, while CA-15 depended
   on UK-02.
6. CA-14 declared dependencies only through CA-13 but required CA-15 session
   creation for `escalate`.
7. CA-05 authorized a hardcoded routing policy even though the installed,
   versioned knowledge pack is the normative machine-readable policy owner.
8. LC-07 prescribed a mutable module-load registry and `Record<string, any>`;
   LC-02, CA-08, and CA-10 also prescribed broad `any` at contract boundaries.
9. CA-18 was worded as a new feasibility decision after TUI-EXP-01 had already
   been accepted as sufficient feasibility evidence.
10. Several batches combined independently reviewable commands, adapters,
    policies, or state machines under one final verdict, causing corrections
    to expose unrelated mandatory gates serially.

Independent design review then found and this revision corrects six additional
planning blockers: CA-24's self-inclusive dependency range; missing ownership
for `coordinator index build`; coupled NVB/schema composition; contradictory
pack-versus-batch scheduling authority; missing coordinator/session/TUI doctor
provider ownership; and CA-05's missing dependency on LC-05 policy
materialization.

## 2. Mandatory design corrections

### 2.1 Nirvana dependency closure and relocation proof

Watchtower distribution has two distinct proof environments:

- During bootstrap development, an isolated dependency fixture is built from
  `npm pack` artifacts produced from the exact components selected by
  `nira.json`'s pinned ecosystem. A manifest records package name, package
  version, artifact digest, source component digest, and complete transitive
  `@nirvana/*` closure. Installation occurs in a fresh prefix with source
  worktree and ecosystem symlink resolution disabled.
- Release qualification uses the declared release channel for the same exact
  package versions. That channel may be a registry or a signed release bundle,
  but every dependency must be resolvable from it without workspace paths.

A folder-global install, source-tree `node_modules`, npm link, wildcard
dependency, undeclared system package, or registry E404 is not relocation
evidence. Dist metadata uses exact Nirvana versions. Packages that are not used
at runtime are removed rather than carried only because the development
ecosystem linked them.

### 2.2 Repository NVB composition

The Watchtower repository-development NVB configuration uses the pinned
Nirvana parent-config mechanism already used by Nira. The root `nvb.json` is a
thin child config. Capability-owned parent-chain fragments own coherent task
families. A deterministic architecture check loads the effective config,
rejects duplicate tasks/groups and circular parents, and proves the root and
each hand-maintained fragment remain within the applicable registry limit.

This applies only to Watchtower's development configuration. Watchtower still
never creates or modifies a participating repository's `nvb.json`.

### 2.3 JSON Schema composition

`docs/spec/schemas/v1.schema.json` becomes a generated aggregate assembled by
an NVB-owned deterministic schema-composition handler from capability-owned
fragments. The composer rejects duplicate `$defs`, unresolved `$ref` values,
conflicting root metadata, and stale aggregate bytes. It emits stable canonical
ordering and proves byte-for-byte regeneration. Generated aggregate size is
excluded from the hand-maintained module limit only after that proof; every
fragment and the generator remain subject to the normal limits.

### 2.4 Pack-index ownership

CA-01 owns the only pack-index compiler and the SQLite index format. LC-05 owns
only routing/session policy baseline materialization and empty coordinator
stores. CA-01 depends on DB-01, LC-02, and LC-03. New LC-09 consumes the
accepted CA-01 compiler to create and verify the initial seal-bound index during
lane initialization. LC-06 and later init integration depend on LC-09.

### 2.5 Migration ownership

UK-02 implements the migration registry, ordering, staging interface, and
preservation harness only. V1 defines no fictional v2 or v3 lane schema and
therefore ships no fabricated transition. An actual transition is added only
by the batch that introduces an accepted new schema version, along with its
canonical-source rebuild adapter and preservation proof. CA-15 and CA-16 own
session journal/index format adapters and register them without depending on
speculative future shapes.

### 2.6 Policy provenance

RT-01/RT-02 import and manifest the versioned machine-readable coordinator
routing policy. LC-05 validates and materializes that installed policy without
restating rules from Markdown. CA-05 loads the verified policy, applies the
closed hard escalation guards, and reports manifest-bound version/digest
provenance. No hardcoded TypeScript copy is policy authority.

### 2.7 Typed registries and composition

External values enter as `unknown` and normalize into closed discriminated
unions or the accepted JSON value contract. `Record<string, any>`, `data?:
any`, and `expected: any` are removed from briefs. Registries are immutable
collections injected at composition boundaries; module-load self-registration
and mutable global maps are forbidden.

### 2.8 TUI evidence

CA-18 promotes and revalidates the accepted TUI-EXP-01 evidence against the
then-current packaged dependency graph and exact supported target. It does not
reopen renderer selection or repeat the disposable experiment. Failure of the
current integration evidence blocks promotion but does not erase the accepted
feasibility conclusion.

## 3. Corrected batch inventory

The amended lane has 74 work/review pairs:

| Pack | Previous | Amended | Added batches |
|---|---:|---:|---|
| `wt-read-model` | 11 | 14 | RM-11, RM-12, RM-13 |
| `wt-runtime-distribution` | 7 | 10 | RT-08, RT-09, RT-10 |
| `wt-lane-lifecycle` | 8 | 10 | LC-09, LC-10 |
| `wt-upgrade-knowledge` | 5 | 5 | none; UK-02 is corrected |
| `wt-coordinator-automation` | 24 | 31 | CA-25 through CA-31 |
| `wt-v1-release` | 4 | 4 | none |

### 3.1 New and narrowed Pack 1 batches

- **RM-11 — Repository NVB parent-chain composition.** Implements only the
  Nirvana parent-config development catalog and its architecture gates.
- **RM-13 — Deterministic JSON Schema composition.** Independently owns schema
  fragments, aggregate generation, and stale-aggregate rejection.
- **RM-10 — List and config-show commands.** Retains the two bounded identity
  and configuration views.
- **RM-12 — Status command and read-only integration.** Owns the broad status
  projection, stable JSON, warning matrix, and before/after hash proof.
- RM-02 depends on RM-13 and RT-08 before correction 02 may resume.

### 3.2 New and narrowed Pack 2 batches

- **RT-08 — Nirvana dependency closure and isolated install harness.** Owns
  exact dependency selection, packed-artifact manifesting, fresh-prefix
  installation, and source-symlink refusal.
- **RT-02 — Runtime and knowledge manifests.** No longer owns task catalog,
  lane profile, or aggregate generation.
- **RT-09 — Task catalog, lane profile, and aggregate contracts.** Owns the
  capability fragments, generated runtime/task aggregates, and their schema.
- **RT-10 — Baseline packaged TaskHandlers.** Implements only the handlers
  required for runtime validation, staging, and RT-07 smoke proof. Later
  capability handlers land with their owning product batches and extend the
  immutable catalog through RT-09's generation boundary.
- **RT-03 — Distribution staging.** Consumes RT-02, RT-08, RT-09, RT-10, and
  DB-01; it does not implement every future handler.

### 3.3 New and narrowed Pack 3 batches

- **LC-05 — Coordinator and session policy baselines.** Removes pack-index
  compilation and copies only verified installed policy material.
- **LC-09 — Initial sealed pack-index activation.** Uses CA-01 to compile,
  verify, and atomically activate the initial index.
- **LC-07 — Doctor kernel and lane-local checks.** Owns immutable injected
  check composition plus marker/config/binding/permission/Git-ignore checks.
- **LC-10 — Runtime, account, watcher, and index doctor providers.** Owns
  external-tool and packaged-runtime probes and their integration into the
  doctor kernel. Coordinator/session/TUI providers are implemented by CA-31
  after their capabilities exist; CA-24 integrates their command/TUI surfaces,
  and release qualification only reproduces their behavior.

### 3.4 Corrected Pack 4 batch

- **UK-02 — Migration framework and preservation harness.** Removes invented
  v1-to-v2-to-v3 steps and consumes capability-owned migration adapters only
  when an accepted schema transition exists.

### 3.5 New and narrowed Pack 5 batches

- **CA-06 — Provider-neutral endpoint eligibility core.** No concrete CLI
  adapter implementation.
- **CA-28 — OpenCode decision-endpoint adapter.** Mandatory conformance.
- **CA-29 — Hermes decision-endpoint adapter.** Same contract; absence is a
  healthy explicit skip.
- **CA-14 — Read-only coordinator/index/event/ready commands.** No cycle,
  escalation, or resolution mutation surface.
- **CA-25 — Cycle, escalation, and specification-resolution commands.** Depends
  on session/effect services and both endpoint-adapter outcomes.
- **CA-17 — Session routing and budgets.** No proposal, hold, or amendment
  persistence.
- **CA-26 — Session proposals, confirmation, revalidation, and apply.** Owns
  the CA-09/CA-10 effect bridge.
- **CA-27 — Scoped holds, amendment requests, and amendment admission.** Owns
  impact-scoped blocking and specification-resolution session handoff.
- **CA-30 — Pack-index build and runtime-index rebuild command.** Owns the
  public `wt coordinator index build [--runtime]` facade, help/schema/tests,
  validated proposal/effect path, and allowlisted packaged NVB task.
- **CA-31 — Coordinator, session, and TUI doctor providers.** Owns the remaining
  immutable injected providers after their capabilities exist. Release batches
  qualify them but implement no provider behavior.

## 4. Corrected dependency edges

The following edges are mandatory:

```text
RM-13 -> RM-02
RT-08 -> RM-02
RT-01 -> RT-02, RT-09
RT-09 -> RT-10
RT-02 + RT-08 + RT-09 + RT-10 + DB-01 -> RT-03
RT-03 + RT-04 + RT-09 -> RT-05
DB-01 + LC-02 + LC-03 -> CA-01
LC-02 + LC-03 + RT-02 -> LC-05
CA-01 + LC-05 -> LC-09
LC-09 + RT-07 -> LC-06
LC-07 + LC-09 + LC-06 + RT-07 -> LC-10
LC-10 + RM-10 + RM-12 -> LC-08
CA-04 + RT-02 + LC-05 -> CA-05
RT-05 + CA-05 -> CA-06
CA-06 + RT-05 -> CA-28, CA-29
CA-06 + CA-08 + CA-15 + CA-16 -> CA-17
CA-09 + CA-10 + CA-15 + CA-16 + CA-17 -> CA-26
CA-09 + CA-10 + CA-15 + CA-16 + CA-17 -> CA-27
CA-01..CA-13 -> CA-14
CA-13 + CA-14 + CA-17 + CA-26 + CA-27 + CA-28 + CA-29 -> CA-25
CA-01 + CA-10 + CA-13 + CA-14 + RT-05 + RT-09 -> CA-30
LC-07 + CA-13 + CA-16 + CA-19..CA-23 -> CA-31
CA-14..CA-23 + CA-25..CA-31 -> CA-24
```

Ranges mean every included batch and never include the dependent batch itself.
The explicit implementation-map batch DAG is the sole dispatch authority;
pack numbering and pack-exit verdicts add no undeclared scheduling edges.

## 5. Batch-admission gate

Before any untouched batch is dispatched, the coordinator records a bounded
admission check proving:

1. every named dependency is accepted and no required collaborator is owned by
   a later batch;
2. the batch does not prescribe a type, API, global, or authority mechanism
   forbidden by the governing engineering standard;
3. all touched shared registries/aggregates have an accepted composition plan
   and current regeneration proof;
4. distribution/native/browser/external-tool evidence has a declared fixture
   source and a truthful skip/fail contract;
5. the owned capability can receive one final verdict without bundling an
   independently correctable sibling capability; and
6. the work and review briefs, launch prompts, map, roadmap, tracker, indexes,
   and pack seal agree.

A failed admission check is a specification-planning blocker, not an
implementation REJECT. It routes to specification authority before an agent is
launched.

## 6. Activation and review

Remediation uses two independent gates:

1. **Design gate.** An independent reviewer applies
   `planning-remediation-review.md` to the amendment, normative changes,
   corrected inventory, dependency graph, and ownership boundaries. An
   `ACCEPT_DESIGN` verdict authorizes pack synchronization only. It does not
   authorize product-batch dispatch or activate new seals.
2. **Pack gate.** After design acceptance, every affected work brief, review
   brief, launch prompt, index, roadmap, tracker, ranking, traceability record,
   and release gate is synchronized. A different independent review pass then
   proves schema syntax, local Markdown links, exact batch/prompt pairing,
   acyclic dependencies, stale-reference absence, and candidate bootstrap
   seals. Only `ACCEPT_PACKS` publishes new seals and may lift the dispatch
   hold.

Coordinator activation occurs only after the accepted pack-gate commit is
present in every active worktree through explicit synchronization. The author
of this amendment cannot provide either independent acceptance verdict.
