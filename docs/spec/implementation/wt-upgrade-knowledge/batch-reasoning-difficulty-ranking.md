# wt-upgrade-knowledge Batch Reasoning Difficulty Ranking

Status: proposed pack-authoring baseline
Date: 2026-07-30

This document ranks the five work batches in this pack by reasoning difficulty
to guide agent dispatch, capacity planning, and reviewer assignment.

## Ranking methodology

Batches are ranked on:

1. **State interaction complexity** — how many state machines, journals, or
   concurrent artifacts the batch must modify or preserve
2. **Failure surface** — how many write points can fail and require recovery
3. **Dependency breadth** — how many cross-module contracts and predecessor
   batches the batch depends on
4. **Negative-path depth** — how many invariant violations, edge cases, and
   compatibility boundaries require explicit handling
5. **Proof burden** — how many independent proof scenarios, crash points, or
   integration fixtures the batch must demonstrate

## Ranking table (most difficult first)

| Rank | Batch | R-Class | Difficulty drivers |
|:----:|-------|:-------:|--------------------|
| 1 | UK-03 — Atomic upgrade apply, recovery, and downgrade guard | R5 | Crash recovery at every staging write point; manifest-last atomicity; old-runtime usability after failure; downgrade guard with schema-compatibility check; lock acquisition and release ordering; fsync/checksum verification at every stage; real filesystem integration tests |
| 2 | UK-02 — Lane/session/index migration registry | R5 | Pure version-steps with value-preservation across session journals, pins, holds, amendments, budgets, and state; staged rebuild of session indexes and policy baselines; dependency-graph ordering of steps; no runtime-execution leakage; data-preservation proof for every artifact class |
| 3 | UK-01 — Upgrade compatibility and preview planner | R4 | Three-way manifest comparison; asset classification matrix with five outcomes; cross-manifest schema compatibility checking; conflict detection for lane-owned paths; preview-only purity (no mutation); `upgradePlan` JSON schema compliance |
| 4 | UK-05 — Version reporting and upgrade conformance | R3 | Integration of all four version components; two-version coexistence fixtures; collision detection proof; failed-migration recovery proof; help-fragment creation and registration; end-to-end build and test gate |
| 5 | UK-04 — Codex, Cursor, and Claude knowledge installers | R3 | Three bounded host adapters with preview/replace/scope; filesystem destination resolution; version recording per host; non-interactive `--replace` requirement; no-false-claim rule; isolated from upgrade foundation |

## Difficulty justification

### UK-03 (highest difficulty)

UK-03 owns the most destructive surface in the pack. The manifest-last rule
means every write point is a potential crash point, and the implementation must
prove recovery at each. The downgrade guard adds a second state machine (schema
compatibility check before pointer switch). Lock ordering (§11 of v1-contracts)
adds cross-module coordination. The integration tests must use real filesystem
operations and cannot rely on mocked atomicity. The old-runtime usability
requirement means the test must actually invoke the old runtime after a
simulated crash, not just check that files exist.

### UK-02

UK-02's difficulty comes from the breadth of lane-owned artifacts that must be
preserved. Each migration step touches multiple artifact classes (session
journals, pins, holds, amendments, budgets, state, policy baselines), and the
preservation proof must cover every class. The dependency-graph ordering of
steps requires correct topological sort. Staged rebuild of session indexes and
policy baselines from source data requires the implementation to know the
canonical source of truth for each index, not just copy a prior index forward.
The ban on runtime execution, session closure, and content pruning requires
vigilant boundaries.

### UK-01

UK-01 requires careful cross-manifest comparison logic but has no mutation
surface (preview-only). The classification matrix must handle five outcomes
with overlapping edge cases. Schema compatibility checking requires parsing
the manifests' declared compatible version ranges. The main risk is incorrect
classification that causes a later apply to overwrite or skip an asset. The
JSON output must match `upgradePlan` schema.

### UK-05

UK-05 is an integration batch with moderate difficulty. The version report
must derive four components from different manifest sources. The two-version
coexistence fixture is a system-level test scenario. Collision and failed-
migration proof test the UK-03 apply/recovery pipeline end-to-end. Help
fragments must match implemented behavior exactly.

### UK-04

UK-04 is the most bounded batch. Each host adapter follows the same
preview/replace/scope pattern. The filesystem operations are isolated to
copying from a known source to known per-host destinations. The main risks
are: embedding lane-specific state in skill paths (ruled out by the spec)
and claiming host notification is active (explicitly forbidden). Version
recording is a simple metadata write.

## Reasoning class assignment rationale

| Batch | R-Class | Why not lower | Why not higher |
|-------|:-------:|---------------|----------------|
| UK-01 | R4 | Cross-manifest comparison with five classification outcomes requires cross-file contract reasoning and negative-path design | No mutation, no crash recovery, no concurrent state |
| UK-02 | R5 | Interacting state machines (session indexes, policy baselines) with value-preservation proofs across multiple artifact classes | No real-time crash recovery; steps are deterministic pure functions |
| UK-03 | R5 | Atomic staging with crash recovery at every write point; two state machines (apply + downgrade guard); destructive filesystem operations | Single-lane scope; no cross-repository or multi-package integration |
| UK-04 | R3 | Three bounded hosts with similar patterns; explicit preview/replace contract; isolated from upgrade pipeline | No state machines, no concurrency, no crash recovery |
| UK-05 | R3 | Integration wire-up of already-proven components; version derivation from manifests; help fragment creation | Reviewer at R4 because independent verifier must re-prove end-to-end fixtures, not trust UK-03/UK-04 reports |

## Recommended dispatch order

1. **UK-01 first** — establishes the upgrade foundation all later batches depend on
2. **UK-04 in parallel with UK-01/UK-02** — isolated from upgrade pipeline;
   blocked only by RT-01, RT-02 acceptance
3. **UK-02 after UK-01** — depends on the compatibility matrix
4. **UK-03 after UK-02** — depends on migration registry + RT-04, RT-06
5. **UK-05 after UK-03 and UK-04** — integration gate

## Capacity notes

- UK-03 requires the most reviewer attention due to crash-recovery proof at
  every staging write point. The reviewer must independently simulate every
  crash point, not trust the implementation report.
- UK-02 requires careful data-preservation verification across multiple artifact
  classes. The reviewer should use byte-comparison against known fixture data.
- UK-01 benefits from a reviewer with schema/manifest parsing experience.
- UK-04 and UK-05 are suitable for lower-capability agents but still require
  complete independent verification.
