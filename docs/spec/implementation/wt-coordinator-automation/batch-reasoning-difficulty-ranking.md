# wt-coordinator-automation Batch Reasoning-Difficulty Ranking

Status: **agent-assignment and supervision guide**
Date: 2026-07-30
Scope: reasoning difficulty across the 18 CA work batches in Pack 5

## Purpose

This document ranks the 18 Pack 5 batches from hardest to easiest in terms of
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
- CA-18 has the largest workload because it integrates all prior services and
  proves 30–10k pack scale, but its reasoning is integration/boundedness
  verification, not novel algorithm design.
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
| Index/hash-chain integrity | Identical bytes required across runs; partial-block handling |
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
| 3 | CA-18 | R5 | PTY attachment, full scale proof, M6 acceptance | Must integrate all prior 17 batch services, prove 30–10k pack boundedness, long-lane replay, streaming/signals/accessibility; must show unrelated pack/session growth does not increase model context; no other batch carries the pack-acceptance gate | Accepting without independent scale proof, skipping accessibility requirements, or conflating attachment state with session durability |
| 4 | CA-04 | R5 | Ready-set DAG and resource-claim projection | DAG/dependency/claim/capacity blockers must be computed deterministically from pack index + events + claims; no arbitrary winner; multiple-equally-valid-candidate detection must not silently resolve ties | Using filesystem order as implicit tie-break, incorrect dependency resolution, or conflating optimistic-read claims with exclusive-write blockers |
| 5 | CA-09 | R5 | All 11 proposal types with full validation | Every proposal type, origin, class, and effect must be validated against current state and policy; stale/illegal/invalid/duplicate/uncertain cases must each fail deterministically; idempotency keys must correctly reference snapshot digest | Missing a stale-state revalidation path, allowing an agent-origin mismatch, or silent acceptance of an unknown proposal type |
| 6 | CA-17 | R5 | Session routing, budgets, proposals, holds interleaving | M0/D1–D3 routing for session turns; finite grants within lane-wide ceilings and protected reserves; scoped holds that block specific future effects without blocking unrelated automation; confirmation/revalidation before effect execution | Holding the lane lock during model response, allowing budget overrun, or letting holds block unrelated automation |
| 7 | CA-08 | R5 | Context broker with usage budgets and provenance | Allowlisted queries must be metered, provenance-tracked, redacted; soft/hard limits on input/output/broker/wall-clock per decision class; usage quality must be tracked without becoming a second budget authority | Skipping provenance on a query path, conflating soft and hard limit behavior, or leaking untrusted agent content through broker queries |
| 8 | CA-16 | R5 | Session memory bounds — compaction, capsules, transitive reference proof | Bounded working sets must not grow with session turn count; same-lane turn capsules must be non-transitive; compaction must produce source-turn-referencing summaries without inventing content; no full-history fallback | Creating transitive reference chains through capsules, compacting without source references, or loading full session text into any working set |
| 9 | CA-02 | R5 | Sharded index with corruption-safe bounded queries | Direct bounded reads with limits/cursors/truncation; stale/missing/corrupt block detection and handling; must not silently serve partial data; shard selection must be deterministic | Serving truncated data as complete, silently skipping a corrupt block, or using block index as implicit ordering |
| 10 | CA-01 | R5 | Deterministic sealed-pack index compiler | Identical semantic bytes from identical sealed input; path/digest/cross-reference checks; linear build with intermediate verification; any implementation variance breaks the seal-verification model | Introducing non-deterministic ordering, omitting cross-reference validation, or computing digest from non-canonical input |
| 11 | CA-17 | Upper R4 (review half: R5) | Session routing/budgets/holds at the integration boundary | See Rank 6 — this batch additionally verifies that session budgets, routing, proposals, and holds interact correctly under concurrent automated cycles and operator turns | — |
| 12 | CA-14 | R4 | Command integration across 13 prior service batches | Index/status/context/explain/cycle/escalate/events/ready commands; must render human/JSON output; dry-run purity; every error/empty/invalid path; help fragments | Putting coordinator logic in command classes, reimplementing routing, or missing a required command flag/output format |
| 13 | CA-07 | R4 | Immutable decision envelopes | Stable semantic digest; bounded default context; untrusted-content delimiting; must survive cycle replay and produce identical bytes | Digest instability across inputs, leaking raw untrusted content without delimiting, or embedding mutable references |
| 14 | CA-06 | R4 | Endpoint adapter eligibility and isolation | Unattended/advisory/skill-only classification; argv/env/cwd/output/time bounds must be proven before ANY unattended invocation; adapter capability (not host brand) determines eligibility | Classifying an adapter as unattended without boundary proof, or allowing skill-only adapters into decision cycles |
| 15 | CA-05 | R4 | Ordered routing policy and capability floors | Every v1 rule/guard; first-match determinism; D1/C2, D2/C3, D3/C5 floor enforcement; classifies but does NOT execute; must not silently downgrade a required decision class | Encoding judgment in the router, reordering rules, or allowing a lower-capability endpoint for a higher-class decision |
| 16 | CA-15 | R4 | Operator-session persistence and lifecycle | Many sessions per lane; one active turn each; immutable closed history; crash-safe journals; state machine with open/suspended/closed transitions | Losing journal durability on crash, allowing concurrent turns in one session, or reopening a closed session |
| 17 | CA-11 | R4 | Tmux effect adapter | Unknown launch recovery; duplicate suppression; prepare/attempt/verify journaling; no arbitrary kill/shell | Killing tmux sessions outside the adapter contract, suppressing duplicate detection, or using shell evaluation |
| 18 | CA-12 | R4 | Git acceptance adapter | Reviewer-session ownership verification; commit-set validation; partial push recovery; must not conflate semantic acceptance with publication success | Pushing without session-ownership verification, treating push failure as acceptance revocation, or silently substituting commit hashes |
| 19 | CA-18 | R5 (review: R5) | PTY attachment and M6 acceptance re-reviewed | See Rank 3 — the review additionally requires independent scale-proof reproduction of all 30–10k and long-lane boundedness claims | — |
| 20 | CA-03 | R4 | Journal indexes and projections | Checkpoints/prefix digests; incremental append; partial-tail/rebuild behavior; must handle truncated journals | Computing incorrect prefix digest after partial append, or failing to detect a truncated tail |

(CA-17 and CA-18 each appear twice: once for implementation reasoning, once for review reasoning.)

## Recommended Agent Allocation

| Ranking band | Batches | Recommended posture |
|--------------|---------|---------------------|
| Ranks 1–3 / upper `R5` | CA-10, CA-13, CA-18 | Use the strongest available agent with demonstrated state-machine, concurrency, idempotency, and crash-recovery reasoning. Require a detailed pre-edit model of every state transition, failure path, and recovery rule. Reviewer must also meet the `R5` bar independently. |
| Ranks 4–10 / `R5` | CA-04, CA-09, CA-17, CA-08, CA-16, CA-02, CA-01 | Use a strong repository-aware agent with index/hash-chain, graph-algorithm, validation-matrix, or budget-accounting reasoning. Do not forward these as routine service work. |
| Ranks 12–18 / `R4` | CA-14, CA-07, CA-06, CA-05, CA-15, CA-11, CA-12 | Use a strong framework agent with demonstrated ownership, compatibility, and boundary-enforcement reasoning. Do not forward these as thin wrapper or documentation tasks. |
| Rank 20 / `R4` | CA-03 | Use a careful incremental-state agent with digest and append-semantics reasoning. |

## Why The Levels Are Not One-To-One With Rank

The repository reasoning scale is intentionally coarse.

- CA-10, CA-13, and CA-18 are the highest `R5` because they involve sole authority,
  crash recovery, concurrent cycle safety, or full-scale integration proof.
- CA-01, CA-02, CA-04, CA-08, CA-09, CA-16, and CA-17 are `R5` because they involve
  hash-chain/index integrity, DAG computation, validation matrix completeness,
  budget accounting, or compaction correctness. Calling them `R4` to create more
  label variety would understate their risk.
- Batches in the `R4` band still introduce new runtime truth (routing rules, adapter
  eligibility, envelope immutability, tmux recovery, Git partial push, session
  lifecycle). They are not safe to assign to a low-reasoning model.
- No CA batch falls at `R3`. Every CA batch either introduces a new ownership
  algorithm with correctness risks (R4) or involves interacting state machines,
  graph/index integrity, or crash-recovery reasoning (R5).

## Assignment Rules

### Do not use this ranking as an implementation order

Implementation remains governed by the dependency graph in the README and roadmap:

```
CA-01 → CA-02 → CA-03 → CA-04 → CA-05 → CA-06 → CA-07 → CA-08 → CA-09 → CA-10
                                                                          ├──► CA-11
                                                                          ├──► CA-12
                                                                          └──► CA-13 → CA-14
                                                                                     │
CA-15 → CA-16 → CA-17 ◄──────────────────────────────────────────────────────────────┘
                 │
                 ▼
               CA-18
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
