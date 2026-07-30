# Work Batch Index — wt-coordinator-automation

> **Superseded for repacking on 2026-07-31.** The old `CA-18` entry is not
> implementation authority; use the `CA-18`–`CA-24` map in
> `docs/spec/v1-implementation-map.md` when regenerating this index.
> The replacement
> [CA-18 feasibility brief](CA-18-nirvana-opentui-feasibility-and-packaging-gate.md)
> is a repack-staging draft only; this index remains superseded.

> **Draft pack-authoring artifact.** This document is not a seal, acceptance
> record, or authority to initialize a lane. Before pack acceptance, reconcile
> it with `docs/spec/v1-implementation-map.md`,
> `docs/development/engineering-and-review-standard.md`, and
> `docs/spec/nirvana-integration-architecture.md`. The normative precedence in
> `docs/spec/v1-contracts.md` governs every conflict.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: **active index**
Date: 2026-07-30

CA-01: ❌ Not started
CA-02: ❌ Not started
CA-03: ❌ Not started
CA-04: ❌ Not started
CA-05: ❌ Not started
CA-06: ❌ Not started
CA-07: ❌ Not started
CA-08: ❌ Not started
CA-09: ❌ Not started
CA-10: ❌ Not started
CA-11: ❌ Not started
CA-12: ❌ Not started
CA-13: ❌ Not started
CA-14: ❌ Not started
CA-15: ❌ Not started
CA-16: ❌ Not started
CA-17: ❌ Not started
CA-18: ❌ Not started

## Batch Order And Dependency Summary

Batches must be executed in dependency order. The pack-level dependency graph
in `../README.md` governs: CA-01 through CA-04 in order, CA-05 through CA-10
sequentially (CA-05 depends on CA-04 and RT-02; CA-06 on RT-05 and CA-05;
CA-07 on CA-02—CA-06; CA-08 on CA-02/CA-06/CA-07; CA-09 on CA-05/CA-07/CA-08;
CA-10 on LC-03 and CA-09). CA-11 and CA-12 in parallel after CA-10. CA-13 after
CA-03/CA-05/CA-10—CA-12. CA-14 after CA-01—CA-13. CA-15 after CA-03 and UK-02.
CA-16 after CA-02/CA-15. CA-17 after CA-06/CA-08—CA-10/CA-15/CA-16. CA-18 after
CA-14—CA-17.

| Batch | Depends on | Primary proof system |
|-------|------------|---------------------|
| CA-01 | LC-02, LC-05 accepted | Unit specs: identical-byte compilation, seal verification, cross-reference checks, linear build |
| CA-02 | CA-01 accepted | Unit + filesystem specs: bounded reads, limits/cursors, truncation, corrupt/missing/stale block handling |
| CA-03 | RM-05, CA-02 accepted | Unit + filesystem specs: checkpoints, prefix digests, incremental append, partial-tail/rebuild |
| CA-04 | RM-08, CA-01, CA-03 accepted | Unit + integration specs: DAG/dependency/claim/capacity blockers, ready-set correctness, no-arbitrary-winner |
| CA-05 | CA-04, RT-02 accepted | Unit specs: every v1 rule/guard, first-match determinism, D1/C2/D2/C3/D3/C5 floors, classification-only |
| CA-06 | RT-05, CA-05 accepted | Unit + integration specs: unattended/advisory/skill-only, argv/env/cwd/output/time bounds, eligibility proof |
| CA-07 | CA-02–CA-06 accepted | Unit specs: stable semantic digest, bounded default context, untrusted-content delimiting |
| CA-08 | CA-02, CA-06, CA-07 accepted | Unit + integration specs: allowlisted queries, provenance/redaction, soft/hard limits, usage quality |
| CA-09 | CA-05, CA-07, CA-08 accepted | Unit specs: all 11 proposal types, origin/class/effect matrices, stale/illegal/invalid/duplicate cases |
| CA-10 | LC-03, CA-09 accepted | Unit + filesystem + crash specs: lock/revalidation/idempotency, all-or-nothing projections/journals |
| CA-11 | RT-05, CA-10 accepted | Unit + runtime specs: unknown launch recovery, duplicate suppression, prepare/attempt/verify journals |
| CA-12 | RM-08, CA-10 accepted | Unit + filesystem specs: session ownership, commit-set validation, partial push recovery |
| CA-13 | CA-03, CA-05, CA-10–CA-12 accepted | Unit + replay specs: stable priority, fsynced cursor, interrupted/duplicate/uncertain replay |
| CA-14 | CA-01–CA-13 accepted fixtures | Integration + command specs: every command form, dry-run purity, human/JSON output, help fragments |
| CA-15 | CA-03, UK-02 accepted | Unit + filesystem specs: lifecycle state machine, crash-safe journals, immutable closed history |
| CA-16 | CA-02, CA-15 accepted | Unit specs: bounded working sets, same-lane capsules, compaction, non-transitive references |
| CA-17 | CA-06, CA-08–CA-10, CA-15, CA-16 accepted | Unit + integration specs: M0/D1–D3 routing, grants/reserves, confirmation/revalidation, hold interleaving |
| CA-18 | CA-14–CA-17 accepted | Integration + scale specs: create/attach/resume/observe, streaming/signals/accessibility, 30–10k scale, long-lane replay |

## Proof Expectations

| Batch range | Required proof posture |
|-------------|----------------------|
| CA-01–CA-04 | Entirely model-free. Unit specs for identical compilation, bounded reads, corruption handling, DAG projection. Filesystem integration for append/rebuild. No model invocation through any code path. |
| CA-05–CA-09 | Unit specs covering every v1 rule, guard, eligibility gate, envelope property, budget limit, and validation case. Classification-only proof for CA-05 (no effect side effects). Adapter eligibility proof for CA-06 (boundary enforcement). |
| CA-10–CA-13 | Unit + crash-replay specs for idempotency, lock contention, interrupted writes, and incomplete external effects. Real filesystem for journal append/fsync. External-effect prepare/attempt/verify journaling. |
| CA-14 | Integration + command specs for every form (human/JSON, success/error/empty, dry-run). Help fragment audit. No coordinator logic in command classes. |
| CA-15–CA-17 | Unit specs for lifecycle state machine, crash-safe journals, bounded working sets, budget accounting, hold interleaving. Integration specs for multi-session concurrency. |
| CA-18 | Integration specs for PTY attachment create/attach/resume/observe. Scale specs for 30/300/3,000/10,000-batch packs with fixed dependency neighborhoods. Long-lane replay with session count growth. Accessibility proof. Streaming/signal behavior. |

## Shared Proof Rule

Never use one engine's proof to satisfy another engine's acceptance requirement.
Every acceptance scenario ID requires independent evidence.
Implementation agents must name the exact spec files, test commands, and
expected outcomes for their batch. Reviewers must independently regenerate
evidence rather than trusting the implementation report.
