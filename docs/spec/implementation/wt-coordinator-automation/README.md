# wt-coordinator-automation — Implementation Pack 5

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

Status: **Draft — correction audit complete; awaiting independent pack review**
Target release: `1.0.0`
Pack ID: `CA-01` through `CA-18`
Work batches: **18** | Review batches: **18**
Last updated: 2026-07-30

## Purpose

This is implementation pack 5 of 6 for the Watchtower v1 CLI. It implements
zero-token mechanical routing, bounded decision cycles, one effect authority,
and durable bounded operator sessions.

Pack 5 is the largest implementation pack and the definitive automation surface
for the Watchtower coordinator plane. Every coordinator cycle, decision, effect,
and operator-session turn passes through the foundations, contracts, commands,
and adapters defined here. No model is invoked unless explicitly routed through a
validated bounded decision cycle; no effect occurs except through the sole
effect executor; no operator session holds the lane mutation lock.

## Mission

Deliver the complete coordinator-automation surface defined in
[coordinator-automation.md](../../coordinator-automation.md),
[operator-session.md](../../operator-session.md), and
[cli-session.md](../../cli-session.md), implementing:

1. Deterministic seal-bound pack indexes that keep routine coordinator context
   bounded independently of unrelated implementation-pack growth.
2. Derived SQLite index stores with typed bounded reads, limits, cursors,
   truncation, and stale/missing/corrupt-store refusal.
3. Runtime SQLite indexes and projections with journal checkpoints, prefix
   digests, one-writer/WAL-reader discipline, incremental append, and
   partial-tail/staged-rebuild behavior.
4. Ready-set and resource-claim projection — DAG/dependency/claim/capacity
   blockers without arbitrary winner selection.
5. Ordered routing policy and capability floors — every v1 rule/guard,
   first-match determinism, D1/C2, D2/C3, D3/C5 floors.
6. Endpoint adapter eligibility and isolation — unattended/advisory/skill-only
   classification with argv/env/cwd/output/time bounds.
7. Immutable decision envelopes with stable semantic digests, bounded default
   context, and untrusted-content delimiting.
8. Context broker and cycle budgets — allowlisted queries, provenance/redaction,
   soft/hard limits, usage quality.
9. Typed proposals (all 11 types) and current-state validator — every proposal
   type with permitted origin/class/effect and stale/illegal/invalid handling.
10. Atomic lane-local effect executor with single-use invocation envelopes —
    one authority, lock/revalidation/idempotency, and all-or-nothing
    projections/journals.
11. Tmux prepare/attempt/verify TaskHandler plus cataloged tmux leaf, with
    unknown-launch recovery, duplicate suppression, and no arbitrary
    task/kill/shell.
12. Acceptance and Git publication TaskHandler plus bounded Git leaf/API
    adapter — reviewer-session ownership, commit-set validation, Nirvana Git API
    audit, and partial-push recovery.
13. Coordinator queue, cursor, replay, and watcher TaskHandler integration —
    stable priority, fsynced cursor advance, interrupted/duplicate/uncertain
    replay, and no workflow-level shell.
14. Coordinator, event, and ready-set commands with index/status/context/
    explain/cycle/escalate/events/ready and dry-run purity.
15. Operator-session persistence and lifecycle — many sessions per lane, one
    active turn each, immutable closed history, crash-safe journals.
16. Session indexes, references, pins, and compaction — bounded working sets,
    same-lane capsules, no transitive/full-history fallback.
17. Session routing, budgets, proposals, holds, and amendments — M0/D1–D3
    routing, grants/reserves, confirmation/revalidation, scoped hold interleaving.
18. Session CLI/PTY attachment and M6 acceptance — create/attach/resume/observe,
    streaming/signals/accessibility, 30–10k pack scale and long-lane replay
    proof.

## Pack Scope

| Batch ID | Name | Reasoning | Primary ownership |
|----------|------|-----------|-------------------|
| CA-01 | Deterministic sealed-pack SQLite compiler | R5 | focused `PackIndexCompiler` and SQLite publication capsule |
| CA-02 | SQLite index stores and bounded typed queries | R5 | focused typed store/query ports |
| CA-03 | Runtime SQLite indexes and projections | R4 | journal checkpoint and projection stores |
| CA-04 | Ready set and resource-claim projection | R5 | `src/foundation/ReadySet.ts`, `src/foundation/ResourceClaims.ts` |
| CA-05 | Ordered routing policy and capability floors | R4 | `src/foundation/RoutingPolicy.ts`, `src/foundation/CapabilityFloors.ts` |
| CA-06 | Endpoint adapter eligibility and isolation | R4 | `src/foundation/EndpointAdapter.ts`, `src/foundation/EndpointEligibility.ts` |
| CA-07 | Immutable decision envelopes | R4 | `src/foundation/DecisionEnvelope.ts`, `src/contracts/decision.ts` |
| CA-08 | Context broker and cycle budgets | R5 | `src/foundation/ContextBroker.ts`, `src/foundation/CycleBudget.ts` |
| CA-09 | Typed proposals and current-state validator | R5 | `src/contracts/proposals.ts`, `src/foundation/ProposalValidator.ts` |
| CA-10 | Atomic effect executor and invocation envelopes | R5 | effect executor, envelope validator, packaged task boundary |
| CA-11 | Tmux effect TaskHandler and leaf | R4 | focused handler plus cataloged tmux leaf |
| CA-12 | Acceptance and Git publication handler | R4 | focused handler plus audited Git API/leaf |
| CA-13 | Queue, replay, and watcher task integration | R5 | queue/replay services and focused TaskHandlers |
| CA-14 | Coordinator, event, and ready-set commands | R4 | one command class and help fragment per subcommand |
| CA-15 | Operator-session persistence and lifecycle | R4 | `src/foundation/SessionStore.ts`, `src/foundation/SessionLifecycle.ts` |
| CA-16 | Session indexes, references, pins, and compaction | R5 | `src/foundation/SessionIndexes.ts`, `src/foundation/SessionCompaction.ts` |
| CA-17 | Session routing, budgets, proposals, holds, and amendments | R5 | `src/foundation/SessionRouting.ts`, `src/foundation/SessionBudgets.ts`, `src/foundation/SessionHolds.ts` |
| CA-18 | Session CLI/PTY attachment and M6 acceptance | R5 | one command class per subcommand, focused terminal renderer/attachment services, help |

## Dependency Graph (Within Pack)

```
CA-01 ──► CA-02 ──► CA-03 ──► CA-04 ──► CA-05 ──► CA-06 ──► CA-07 ──► CA-08 ──► CA-09 ──► CA-10
                                    │                                              │                   │
                                    │                                              │                   ├──► CA-11
                                    │                                              │                   ├──► CA-12
                                    │                                              │                   └──► CA-13
                                    │                                              │                         │
                                    │                                              │                         ▼
                                    │                                              └──► CA-14 ◄─────────────┘
                                    │                                                       │
                                    └──► CA-15 ──► CA-16 ──► CA-17 ◄────────────────────────┘
                                                                   │
                                                                   ▼
                                                                 CA-18
```

## Cross-Pack Dependencies

| Depends on | Batch | Required acceptance |
|------------|-------|---------------------|
| Pack 1 (wt-read-model) | RM-05, RM-08 | Worker-event JSONL parser, repository bindings |
| Pack 2 (wt-runtime-distribution) | RT-02, RT-05 | Runtime/knowledge manifests, central invocation adapter |
| Pack 3 (wt-lane-lifecycle) | LC-02, LC-03, LC-05 | Pack acceptance/seal, transactional lane layout, coordinator baselines |
| Pack 4 (wt-upgrade-knowledge) | UK-02 | Lane/session/index migration registry |

## Normative Authority

The following documents are normative for this pack. Conflicts are resolved
in the contract-closure precedence order established by
[v1-contracts.md §1](../../v1-contracts.md#1-normative-precedence-and-release-boundary):

1. [v1-contracts.md](../../v1-contracts.md) and [schemas/v1.schema.json](../../schemas/v1.schema.json)
2. [v1.md](../../v1.md)
3. [coordinator-automation.md](../../coordinator-automation.md), [operator-session.md](../../operator-session.md), [cli-session.md](../../cli-session.md)
4. [architecture.md](../../architecture.md)
5. Versioned runtime and knowledge manifests

## Start Here

Read in this order:

1. `AGENTS.md` (repository root)
2. `../../../v1.md` — product specification
3. `../../../v1-contracts.md` — contract closure
4. `../../../architecture.md` — architecture baseline
5. `../../../coordinator-automation.md` — normative coordinator spec
6. `../../../operator-session.md` — normative operator-session spec
7. `../../../cli-session.md` — normative terminal attachment spec
8. `../../../schemas/v1.schema.json` — JSON Schema bundle
9. `../../../v1-implementation-map.md` — master construction plan §8, §10–14
10. `implementation-roadmap.md` — pack roadmap
11. `implementation-tracker.md` — pack tracker
12. `implementation-quality-and-agent-rules.md` — quality rules and reviewer checklist
13. `batch-reasoning-difficulty-ranking.md` — reasoning difficulty ranking
14. `work-batches/00-work-batch-index.md` — work batch index
15. `review-batches/00-review-batch-index.md` — review batch index

Then read the specific paired work/review batch brief and the real source
owners you will inspect or change.

## Pack Exit

From the accepted Pack 5, routine coordination invokes no model when a
unique preauthorized effect is provable; judgment is bounded and
capability-matched; all effects pass through one validated executor;
operators have durable bounded sessions without acquiring mutation
authority; and the terminal attachment stays responsive, accessible, and
bounded independently of unrelated pack/session growth.

## Non-Negotiable Rules

- `CA-01`–`CA-04` are entirely model-free.
- `CA-05` classifies; it does not execute.
- `CA-06` proves adapter eligibility before any unattended invocation.
- `CA-09` and `CA-10` must be accepted before enabling `CA-11`–`CA-13`.
- `CA-15`–`CA-17` may be developed against accepted service fixtures while
  `CA-14` is built, but all converge at `CA-18`.
- `CA-18` must show that unrelated pack/session growth does not increase
  ordinary model context and that advisory turns never hold the lane lock.
- No model is invoked for M0 operations.
- Coordinator agents cannot directly mutate authoritative state.
- Every effect passes through exactly one validated executor.
- Operator sessions and attachments are not mutation authorities.
- Stale/missing/corrupt pack indexes block automated cycles; never fall back
  to full-pack scanning or model summarization.
- `.local/` artifacts are never staged or committed.
- Implementation agents do not commit; the paired reviewer owns acceptance
  and commit.
