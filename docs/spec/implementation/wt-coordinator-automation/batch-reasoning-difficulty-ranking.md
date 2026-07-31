# wt-coordinator-automation Batch Reasoning-Difficulty Ranking

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

Status: **agent-assignment and supervision guide**
Date: 2026-07-31
Scope: reasoning difficulty across the 24 CA work batches in Pack 5

## Purpose

This document ranks the 24 Pack 5 batches from hardest to easiest in terms of
agent reasoning requirements. It is an agent-assignment and supervision guide.
It does not replace:

- The required implementation order.
- Dependency gates.
- Work briefs.
- Paired review briefs.
- Proof requirements.
- The batch-specific `R3`, `R4`, or `R5` reasoning requirement.

"Easiest" in this ranking means easiest relative to the other Pack 5 batches.
Even the easiest CA batch is substantially more reasoning-intensive than most
read-model or lifecycle batches.

## Reasoning-Level Scale Used By This Pack

| Level | Meaning in this pack |
|-------|----------------------|
| `R3` | Bounded repository reasoning: focused compatibility or documentation work with explicit owners, limited state interaction, and focused proof. No CA batch falls at R3. |
| `R4` | Deep code reasoning: cross-file contracts, public compatibility, ownership-boundary decisions, negative-path design, and independent source verification. |
| `R5` | Highest available reasoning: interacting state machines, concurrency, graph or planner algorithms, hash-chain/index integrity, destructive mutation safety, multi-owner integration, or final evidence/closure authority. |

The level is a minimum assignment requirement. The numbered ranking then
distinguishes batches inside the same broad level.

## Important Distinction: Reasoning Difficulty Versus Workload

Reasoning difficulty and workload are not the same.

- CA-10 is difficult because it is the sole effect executor — one authority with
  lock/revalidation/idempotency and all-or-nothing projections.
- CA-24 has the largest workload because it integrates all prior services and
  independently proves 30–10k pack scale and long-session behavior.
- CA-18 crosses experimental FFI/native packaging boundaries but is a bounded
  feasibility gate, not product integration or M6 acceptance.
- CA-01 is difficult because deterministic identical-semantic-byte compilation
  leaves no room for implementation variance or accidental difference.
- CA-14 has a large command surface but its reasoning is thin orchestration over
  already-accepted service contracts.

An agent should therefore not be selected only by expected file count or batch
duration.

## Ranking Criteria

The ranking weighs the following factors.

| Criterion | What increases difficulty |
|-----------|---------------------------|
| Ownership complexity | More layers or independent construction paths must agree |
| State-machine depth | Behavior depends on non-trivial lifecycle state transitions |
| Concurrency/recovery | Interrupted, duplicate, uncertain state requires correct replay |
| Index/semantic-root integrity | Identical logical rows/root across rebuilds; stale/corrupt-store refusal |
| Compatibility sensitivity | Changes can alter how automated cycles, proposals, or effects execute |
| Failure-boundary complexity | Must distinguish when failure occurs and what state may still be claimed |
| Cross-pack contract load | Batch consumes several earlier handoffs and must not reinterpret them |
| Algorithm novelty | Batch introduces a new owner/algorithm rather than forwarding prepared state |
| Scale proof | Requires independent evidence over large synthetic inputs |

## Hardest-To-Easiest Table

| Rank | Batch | Relative tier | Primary reasoning challenge | What makes it difficult | Main agent failure risk |
|------|-------|---------------|-----------------------------|-------------------------|-------------------------|
| 1 | CA-10 | Highest R5 | Sole effect executor with idempotency, lock, crash recovery | Must be the ONLY authority for all lane-state mutations; lock/revalidation/idempotency must hold across concurrent cycles, interrupted writes, and incomplete external effects; all-or-nothing projections/journals | Creating a second mutation path, missing crash-recovery idempotency, or conflating external-effect prepare with internal commit |
| 2 | CA-13 | R5 | Coordinator queue with replay, cursor, and watcher integration | Fsynced cursor advance, stable priority ordering across safety/escalation/sequence/event-ID dimensions, interrupted/duplicate/uncertain replay from decision/effect journals; must not replay already-completed idempotent effects | Advancing cursor before effect terminal event is durably written, replaying completed effects, or losing queue ordering on crash |
| 3 | CA-24 | R5 | Final command integration and M6 closure | Independently proves 30–10k context invariance, long-session replay/soak, global install, and every authority invariant | Treating lower reports as proof or accepting unbounded growth |
| 4 | CA-23 | R5 | Terminal restoration, security, and accessibility matrix | Signals/suspend/crash across platforms plus hostile terminal content and accessible semantics | Leaving terminal damage or an injection path |
| 5 | CA-22 | R5 | Streaming and attachment concurrency | Ordered bounded provisional data, contention/wait, notifications, and observer denial | Duplicate turns, unbounded queues, or locks across model work |
| 6 | CA-04 | R5 | Ready-set DAG and claims | Deterministic blocker/claim/capacity projection without arbitrary winners | Hidden tie-break or incorrect blocker |
| 7 | CA-09 | R5 | Proposal validation | Complete type/origin/class/effect and stale/illegal/idempotency matrix | Missing a stale or illegal path |
| 8 | CA-17 | R5 | Session routing/budgets/holds | Interleaves finite budgets, holds, proposals, and automation safely | Reserve leak, under-routing, or effect bypass |
| 9 | CA-20 | R5 | Bounded timeline/input/reference security | Virtualization, retention coupling, revision races, and path authorization | Full-history growth or reference escape |
| 10 | CA-08 | R5 | Context broker budgets/provenance | Metered allowlisted context with hard limits and redaction | Unbounded or unprovenanced context |
| 11 | CA-16 | R5 | Session memory/compaction | Non-transitive capsules and bounded working sets | Transitive/full-history fallback |
| 12 | CA-02 | R5 | Corruption-safe typed SQLite reads | Bounded cursors and stale/corrupt refusal | Serving partial/stale data |
| 13 | CA-01 | R5 | Deterministic sealed-pack compiler | Stable logical rows/root and staged publication | Nondeterministic identity |
| 14 | CA-18 | R4 | FFI/native/Nirvana feasibility | Cross-platform bootstrap, packaging, security, and restoration evidence | Assuming a local pass or leaking FFI to ordinary commands |
| 15 | CA-14 | R4 | Coordinator command integration | Thin human/JSON/help surface over accepted services | Product logic in commands |
| 16 | CA-21 | R4 | Inspector/action/confirmation UI | Nine bounded model-free views and shared effect authority | Query scan or confirmation bypass |
| 17 | CA-19 | R4 | Responsive shell/focus/themes | Adapter-isolated layout, focus, keymap, preference behavior | UI god object or lost state on resize |
| 18 | CA-07 | R4 | Immutable envelopes | Stable digest and bounded untrusted content | Mutable or unstable envelope |
| 19 | CA-06 | R4 | Endpoint eligibility | Capability proof and invocation isolation | Ineligible unattended endpoint |
| 20 | CA-05 | R4 | Routing floors | Ordered deterministic classification without execution | Under-routing or semantic judgment |
| 21 | CA-15 | R4 | Session lifecycle | Crash-safe many-session state machine | Concurrent turn or reopened close |
| 22 | CA-11 | R4 | Tmux adapter | Prepare/attempt/verify and unknown recovery | Arbitrary kill/shell |
| 23 | CA-12 | R4 | Git publication adapter | Ownership/commit-set/partial-push separation | Acceptance/publication conflation |
| 24 | CA-03 | R4 | Journal projections | Incremental checkpoint/prefix integrity | Incorrect partial-tail recovery |

## Recommended Agent Allocation

| Ranking band | Batches | Recommended posture |
|--------------|---------|---------------------|
| Ranks 1–5 / highest `R5` | CA-10, CA-13, CA-24, CA-23, CA-22 | Strongest current endpoints with state-machine, concurrency, recovery, and closure evidence capability |
| Ranks 6–13 / `R5` | CA-04, CA-09, CA-17, CA-20, CA-08, CA-16, CA-02, CA-01 | Strong repository-aware endpoints matched to graph, validation, budget, security, or index reasoning |
| Ranks 14–24 / `R4` | CA-18, CA-14, CA-21, CA-19, CA-07, CA-06, CA-05, CA-15, CA-11, CA-12, CA-03 | Deep compatibility/ownership agents with independent negative-path proof |

## Why The Levels Are Not One-To-One With Rank

The repository reasoning scale is intentionally coarse.

- CA-10, CA-13, CA-22, CA-23, and CA-24 are the highest `R5` because they
  involve sole authority, concurrency/recovery, terminal safety, or closure.
- CA-01, CA-02, CA-04, CA-08, CA-09, CA-16, CA-17, and CA-20 are `R5` because they involve
  hash-chain/index integrity, DAG computation, validation matrix completeness,
  budget accounting, or compaction correctness. Calling them `R4` to create more
  label variety would understate their risk.
- Batches in the `R4` band still introduce new runtime truth (routing rules, adapter
  eligibility, FFI compatibility, presentation authority, envelope immutability,
  tmux recovery, Git partial push, or session lifecycle).
- No CA batch falls at `R3`. Every CA batch either introduces a new ownership
  algorithm with correctness risks (R4) or involves interacting state machines,
  graph/index integrity, or crash-recovery reasoning (R5).

## Assignment Rules

### Do not use this ranking as an implementation order

Implementation remains governed by the dependency graph in the README and roadmap:

```text
CA-01 → … → CA-14 ─┐
CA-15 → CA-17 ─────┴→ CA-18 → CA-19 ┬→ CA-20 ─┐
                                     └→ CA-21 ─┴→ CA-22 → CA-23 → CA-24
```

The rank measures reasoning difficulty only.

### Match the reviewer to the declared level

Use an `R5` reviewer for every `R5` batch. The reviewer must reason independently
from the patch and implementation report. Implementation report conclusions are
not accepted facts.

### Escalate when a batch crosses its declared boundary

Stop and re-review if an implementation agent discovers that:

- A routing-policy batch must encode coordinator judgment.
- An effect batch creates a second mutation path.
- An index batch introduces non-determinism.
- A session batch holds the lane mutation lock.
- A context-broker batch loads full-pack content.
- An earlier handoff does not provide the promised input/output contract.
- Proof cannot observe the acceptance claim through the real coordinator runtime.

Those conditions change the reasoning problem and invalidate the original
ranking assumptions for that implementation.
