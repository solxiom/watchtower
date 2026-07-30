# Work Batch Index — wt-lane-lifecycle

Status: ⏳ Pack authoring
Date: 2026-07-30

## Batch Identity Scheme

All work batches in this pack follow the identity scheme `LC-0{N}` where N is
the 1-indexed batch number 1-8. Each batch has:

- a unique `id` matching `LC-0{N}`
- a descriptive title summarizing the primary ownership
- declared implementation reasoning class (R3-R5)
- declared review reasoning class (never lower than implementation)
- explicit dependencies on prior batches from pack 1, pack 2, and earlier
  batches in this pack
- primary file ownership listing every source file the batch creates or
  materially rewrites
- required proof classes: focused, regression, architecture, real-engine,
  adversarial

## Index

| ID | Title | Reasoning (I/R) | Depends on | Primary files | Workload |
|----|-------|-----------------|------------|---------------|----------|
| LC-01 | Init argument resolution and preflight plan | R4 / R5 | RM-03, RM-08, RT-04 | `src/foundation/init-planner.ts`, `src/commands/InitCommand.ts` | medium |
| LC-02 | Pack acceptance, seal, and drift validation | R5 / R5 | RM-01, RM-08 | `src/foundation/pack-consumer.ts`, `src/foundation/pack-seal.ts` | large |
| LC-03 | Transactional lane layout and manifests | R5 / R5 | LC-01, LC-02, RT-06 | `src/foundation/lane-store.ts`, `src/foundation/transactional-writer.ts` | very-large |
| LC-04 | Bindings, Git-ignore, and membership registration | R4 / R5 | LC-03, RM-07 | `src/foundation/binding-mutator.ts`, `src/foundation/membership-registrar.ts` | medium |
| LC-05 | Coordinator/session baselines and initial pack index | R5 / R5 | LC-02, LC-03, RT-02 | `src/foundation/coordinator-baseline.ts`, `src/foundation/pack-index-bootstrap.ts` | large |
| LC-06 | Foreground watch command | R4 / R4 | LC-05, RT-07 | `src/commands/WatchCommand.ts` | medium |
| LC-07 | Comprehensive doctor registry | R4 / R5 | LC-04, LC-05, LC-06, RM-09 | `src/foundation/doctor-registry.ts`, `src/commands/DoctorCommand.ts` | large |
| LC-08 | Lifecycle integration and scaffold removal | R3 / R4 | LC-07, RM-10 | `spec/e2e/lifecycle.spec.ts`, removal of hello artifacts | medium |

## Dependency Graph

```text
LC-01 ─┐
LC-02 ─┤
       ├── LC-03 ──┬── LC-04 ──┐
       │           │            │
       │           ├── LC-05 ──┬── LC-06 ──┐
       │           │           │            │
       │           │           │            ├── LC-07 ── LC-08
```

LC-01 and LC-02 are parallel-ready after their external dependencies from
pack 1 and pack 2 accept. LC-03 integrates both. LC-04 and LC-05 are
parallel-ready after LC-03. LC-06 depends on LC-05. LC-07 integrates
LC-04, LC-05, and LC-06. LC-08 is the final integration point.

## Proof Matrix

| ID | Focused | Regression | Architecture | Real-engine | Adversarial |
|----|---------|------------|-------------|-------------|-------------|
| LC-01 | Arg combination fixtures | — | `nvb build` | — | Path escape, malformed JSON |
| LC-02 | Schema/seal fixtures | — | `nvb build` | — | Tampered lock, extra files |
| LC-03 | Write/failure stages | — | `nvb build` | Temp-fixture lanes | Concurrent rename |
| LC-04 | Lock-order, ignore rollback | — | `nvb build` | Multi-repo fixture | Lock inversion |
| LC-05 | Baseline seed, index build | — | `nvb build` | Full bootstrap | Index tampering |
| LC-06 | Exec, stdio, Ctrl-C | — | `nvb build` | Foreground process | Missing binary, SIGTERM |
| LC-07 | Every check category | — | `nvb build` | Full doctor run | Corrupted state |
| LC-08 | E2E fixture, rollback | All Jasmine | `nvb build` | — | Missing hello audit |

## Workload Definitions

- **small**: single module, bounded change, few specs
- **medium**: 2-3 modules, moderate spec breadth, ~50-100 focused tests
- **large**: 2+ modules, deep validation, seal/index logic, ~100-200 focused tests
- **very-large**: transactional write system with failure-injection proof at
  every stage; multiple manifests; ~150-250 focused tests plus adversarial cases

## Batch Sequencing Rules

1. LC-01 must accept before LC-03 begins implementation, because LC-03
   depends on the init planner's argument resolution.
2. LC-02 must accept before LC-03 begins implementation, because LC-03
   depends on pack validation before materializing manifests that reference
   pack artifacts.
3. LC-03 must accept before LC-04 and LC-05 begin implementation, because
   both bind lanes into the directory layout created by LC-03.
4. LC-05 must accept before LC-06 begins implementation, because the
   watcher needs the coordinator baselines and pack index.
5. LC-04, LC-05, and LC-06 must all accept before LC-07 begins implementation,
   because doctor validates the complete state produced by all three.
6. LC-07 must accept before LC-08 begins implementation, because the
   end-to-end fixture validates the complete lifecycle including doctor.
7. No batch may begin implementation while a dependency is in correction.
8. Parallel batches (LC-01/LC-02, LC-04/LC-05) may proceed simultaneously
   if agent and worktree capacity permits.

## Expected Artifact Locations

| Batch | Implementation report |
|-------|----------------------|
| LC-01 | `.local/agent-reports/wt-lane-lifecycle/LC-01-init-argument-resolution-and-preflight-plan.md` |
| LC-02 | `.local/agent-reports/wt-lane-lifecycle/LC-02-pack-acceptance-seal-and-drift-validation.md` |
| LC-03 | `.local/agent-reports/wt-lane-lifecycle/LC-03-transactional-lane-layout-and-manifests.md` |
| LC-04 | `.local/agent-reports/wt-lane-lifecycle/LC-04-bindings-gitignore-and-membership-registration.md` |
| LC-05 | `.local/agent-reports/wt-lane-lifecycle/LC-05-coordinator-session-baselines-and-pack-index.md` |
| LC-06 | `.local/agent-reports/wt-lane-lifecycle/LC-06-foreground-watch-command.md` |
| LC-07 | `.local/agent-reports/wt-lane-lifecycle/LC-07-comprehensive-doctor-registry.md` |
| LC-08 | `.local/agent-reports/wt-lane-lifecycle/LC-08-lifecycle-integration-and-scaffold-removal.md` |
