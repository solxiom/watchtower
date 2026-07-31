# wt-lane-lifecycle Implementation Roadmap

> **Accepted bootstrap implementation artifact.** Dispatch is authorized only under the
> accepted dependency DAG and paired independent batch-review gates. Product-created
> lanes remain subject to the structured pack acceptance and seal contract in
> `docs/spec/v1-contracts.md`.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: ⏳ Pack authoring — awaiting first batch implementation
Date: 2026-07-30
Owner area: Watchtower v1 lane lifecycle

Parent documents:

- `docs/spec/v1.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/implementation/wt-lane-lifecycle/README.md`

## Mission

Create and operate new managed implementation lanes safely. Deliver
transactional init, foreground watch, and comprehensive doctor diagnostics
without copied runtime trees or partial lane state.

The delivery must guarantee:

- init argument resolution validates prefix, scope, and routing before
  any filesystem mutation
- pack acceptance, seal validation, and drift detection follow the JSON
  Schema, RFC 8785, and committed-drift contracts exactly
- lane layout is transactional: adjacent staging, atomic rename, rollback
  on any write/fsync/rename failure
- repository bindings, Git-ignore management, and membership registration
  respect lock order and idempotency
- coordinator/session baselines seed finite policies with correct
  provenance and sealed pack index
- foreground watcher execs with preflight, stdio, and Ctrl-C compatibility
- doctor checks are comprehensive, grouped, read-only, and produce
  pass/warn/fail/skip
- all scaffold/hello artifacts are removed safely after real commands exist
- end-to-end init→status→watch/doctor fixture passes with rollback proof

## Non-Negotiable Delivery Rules

- Product logic must never be added to `src/cli.ts`.
- Commands do not duplicate discovery or path construction.
- Read-only commands perform no hidden writes.
- Only manifest-owned paths are upgradeable (LC-01-LC-07 deliver init/write).
- Runtime invocation is centralized through one adapter.
- Shell config/state is never executed by TypeScript.
- No model use for M0 operations (preflight, pack validation, drift detection,
  lane layout, membership registration, pack index construction, doctor checks).
- Init never scaffolds or relocates the committed implementation pack.
- Doctor is read-only; no repair, rebuild, or migration.
- `.watchtower/` artifacts are never added to Git by Watchtower.
- Keep commands thin and delegate to foundation services.
- Apply the repo file-size, helper-capsule, naming, and module-size rules.
- Do not commit `.local/` artifacts.
- Non-Watchtower lane directories are ignored and never mutated.

## Implementation-Phase Decision Clarifications

The main specs leave some details intentionally open.

For this implementation lane, use the following clarifications so batch work
and review remain aligned:

- init preflight builds a plan, not a lane directory; destination creation
  is only in LC-03
- drift classification is mechanical; no model classifies drift
- staging is adjacent on the same filesystem; no temp directory outside the
  control home
- lock order is fixed: data-root, lane, session, projection/index
- membership registration is post-commit and idempotent
- baselines seed finite shipping-policy defaults from v1-contracts.md §7
- pack index is deterministic, model-free, and seal-bound
- watch is foreground-only with inherited stdio and signal forwarding
- doctor performs no repair; repair is an explicit init/index/upgrade action
- hello artifacts are removed only after the first real command path and
  build smoke test exist

## Delivery Phases

### Phase 1: Init Foundation and Pack Validation (Batches LC-01-LC-02)

Goal:

- parse and validate init arguments
- construct preflight plan without filesystem mutation
- validate pack JSON Schema, RFC 8785 seal, and drift

Batches:

- LC-01 — Init argument resolution and preflight plan
- LC-02 — Pack acceptance, seal, and drift validation

Status: ❌ Pending

Acceptance snapshot (target):

- init args parsed and validated: slug, prefix, scope, routing
- preflight plan enumerates all files/links/bindings to create
- no destination created in preview/dry-run mode
- pack JSON Schema validation passes/fails on conformance fixtures
- RFC 8785 seal reproduces deterministically
- drift reason matrix produces correct codes for every fixture case

### Phase 2: Transactional Init and Registration (Batches LC-03-LC-05)

Goal:

- create lane directories transactionally
- bind repositories, manage Git-ignore, register membership
- seed coordinator/session baselines and pack index

Batches:

- LC-03 — Transactional lane layout and manifests
- LC-04 — Bindings, Git-ignore, and membership registration
- LC-05 — Coordinator/session baselines and initial pack index

Status: ❌ Pending

Acceptance snapshot (target):

- staging is adjacent to final path
- atomic commit point via rename
- rollback on any write/fsync/rename failure
- failure at every stage independently verified
- lock ordering validated
- Git-ignore write and conditional rollback works with digest comparison
- membership registration is idempotent and post-commit
- finite policies seeded with correct provenance
- sealed pack index built deterministically
- no model or full-pack fallback

### Phase 3: Watch, Doctor, and Integration (Batches LC-06-LC-08)

Goal:

- foreground watcher command
- comprehensive doctor diagnostics
- end-to-end integration and scaffold removal

Batches:

- LC-06 — Foreground watch command
- LC-07 — Comprehensive doctor registry
- LC-08 — Lifecycle integration and scaffold removal

Status: ❌ Pending

Acceptance snapshot (target):

- watcher execs with preflight, inherited stdio, signal forwarding
- Ctrl-C terminates gracefully, no daemonization
- doctor checks cover tools, accounts, packs, policies, indexes, permissions
- all checks produce pass/warn/fail/skip results
- doctor is read-only; no implicit repair
- init→status→watch/doctor end-to-end passes
- rollback proof demonstrated
- all hello artifacts removed safely
- help fragments registered and tested
- `nvb build` passes

## Dependency Graph (Pack-Internal)

```text
LC-01 (init planner) ──────────────┐
LC-02 (pack validation) ───────────┤
                                   ├─ LC-03 (lane store)
                                   │       ├─ LC-04 (bindings)
                                   │       ├─ LC-05 (coordinator bootstrap)
                                   │       │       ├─ LC-06 (watch)
                                   │       │       ├─ LC-07 (doctor)
                                   │       │       │       └─ LC-08 (integration)
```

LC-01 and LC-02 are parallel-ready after their external dependencies accept.
LC-03 depends on both LC-01 and LC-02.
LC-04 and LC-05 depend on LC-03 and may proceed in parallel.
LC-06 depends on LC-05.
LC-07 depends on LC-04, LC-05, and LC-06.
LC-08 depends on LC-07.

## External Dependencies

| Batch | Depends on batches from packs 1-2 |
|-------|----------------------------------|
| LC-01 | RM-03 (paths), RM-08 (conflicts), RT-04 (catalog) |
| LC-02 | RM-01 (contracts), RM-08 (conflicts) |
| LC-03 | LC-01, LC-02, RT-06 (managed assets) |
| LC-04 | LC-03, RM-07 (membership) |
| LC-05 | LC-02, LC-03, RT-02 (manifests) |
| LC-06 | LC-05, RT-07 (watcher smoke) |
| LC-07 | LC-04, LC-05, LC-06, RM-09 (observations) |
| LC-08 | LC-07, RM-10 (list/status/config) |

## Compatibility Surfaces Touched

| Surface | Owning batches |
|---------|----------------|
| CLI command names, global options, exit codes | LC-01, LC-06, LC-07 |
| `lane.json`, `install.json`, bindings | LC-03, LC-04 |
| Membership index | LC-04 |
| Pack manifest/acceptance/lock/seal | LC-02 |
| Runtime/knowledge manifests | LC-05 |
| Managed runtime link names and behavior | LC-06 |
| Doctor report schema | LC-07 |
| Help fragments | LC-07, LC-08 |

## Critical Path

```text
LC-01 → LC-03 → LC-05 → LC-06 → LC-07 → LC-08
```

LC-02 and LC-04 are parallel and must complete before their downstream
consumers accept.

## Proof Ownership Summary

| Proof class | Owning batch | Reviewer verification |
|-------------|-------------|----------------------|
| Init argument validation | LC-01 | LC-01 review |
| Pack Schema/Seal/Drift | LC-02 | LC-02 review |
| Transactional layout | LC-03 | LC-03 review |
| Bindings/registration | LC-04 | LC-04 review |
| Baseline/index bootstrap | LC-05 | LC-05 review |
| Watcher foreground exec | LC-06 | LC-06 review |
| Doctor checks | LC-07 | LC-07 review |
| E2E lifecycle + scaffold removal | LC-08 | LC-08 review |

## Pack Exit Gate

This pack is accepted only when:

- [ ] init preflight constructs a complete, validated plan without destination
  creation
- [ ] pack JSON Schema, RFC 8785 seal, and drift matrix pass on conformance
  fixtures
- [ ] lane layout is transactional with proof of rollback at every failure
  stage
- [ ] bindings, Git-ignore, and membership registration respect lock order
  and idempotency
- [ ] coordinator/session baselines have correct provenance and sealed index
- [ ] foreground watcher execs with preflight, stdio, and Ctrl-C
- [ ] doctor checks are comprehensive, grouped, and read-only
- [ ] init→status→watch/doctor e2e passes with rollback proof
- [ ] all hello/scaffold artifacts removed safely
- [ ] `nvb build` and all Jasmine suites pass
- [ ] no `.local/`, `dist/`, `build/`, `node_modules/`, or `.watchtower/`
  artifacts committed
