# wt-coordinator-automation Implementation Tracker

Status: **active tracking document**
Date: 2026-07-30
Pack: 5 of 6 — `wt-coordinator-automation`
Batches: 18 work + 18 review

## Batch Status Matrix

| Batch | Phase | Work brief | Review brief | Current status |
|-------|-------|------------|--------------|----------------|
| CA-01 | Index foundation | [work](work-batches/CA-01-deterministic-sealed-pack-index-compiler.md) | [review](review-batches/REV-CA-01-deterministic-sealed-pack-index-compiler.md) | ❌ Not started |
| CA-02 | Index foundation | [work](work-batches/CA-02-sharded-index-publication-and-bounded-queries.md) | [review](review-batches/REV-CA-02-sharded-index-publication-and-bounded-queries.md) | ❌ Not started |
| CA-03 | Index foundation | [work](work-batches/CA-03-runtime-journal-indexes-and-projections.md) | [review](review-batches/REV-CA-03-runtime-journal-indexes-and-projections.md) | ❌ Not started |
| CA-04 | Index foundation | [work](work-batches/CA-04-ready-set-and-resource-claim-projection.md) | [review](review-batches/REV-CA-04-ready-set-and-resource-claim-projection.md) | ❌ Not started |
| CA-05 | Routing/decision | [work](work-batches/CA-05-ordered-routing-policy-and-capability-floors.md) | [review](review-batches/REV-CA-05-ordered-routing-policy-and-capability-floors.md) | ❌ Not started |
| CA-06 | Routing/decision | [work](work-batches/CA-06-endpoint-adapter-eligibility-and-isolation.md) | [review](review-batches/REV-CA-06-endpoint-adapter-eligibility-and-isolation.md) | ❌ Not started |
| CA-07 | Routing/decision | [work](work-batches/CA-07-immutable-decision-envelopes.md) | [review](review-batches/REV-CA-07-immutable-decision-envelopes.md) | ❌ Not started |
| CA-08 | Routing/decision | [work](work-batches/CA-08-context-broker-and-cycle-budgets.md) | [review](review-batches/REV-CA-08-context-broker-and-cycle-budgets.md) | ❌ Not started |
| CA-09 | Routing/decision | [work](work-batches/CA-09-typed-proposals-and-current-state-validator.md) | [review](review-batches/REV-CA-09-typed-proposals-and-current-state-validator.md) | ❌ Not started |
| CA-10 | Effect foundation | [work](work-batches/CA-10-atomic-lane-local-effect-executor.md) | [review](review-batches/REV-CA-10-atomic-lane-local-effect-executor.md) | ❌ Not started |
| CA-11 | Effect foundation | [work](work-batches/CA-11-tmux-prepare-attempt-verify-effect-adapter.md) | [review](review-batches/REV-CA-11-tmux-prepare-attempt-verify-effect-adapter.md) | ❌ Not started |
| CA-12 | Effect foundation | [work](work-batches/CA-12-acceptance-and-git-publication-adapter.md) | [review](review-batches/REV-CA-12-acceptance-and-git-publication-adapter.md) | ❌ Not started |
| CA-13 | Effect foundation | [work](work-batches/CA-13-coordinator-queue-cursor-replay-and-watcher-integration.md) | [review](review-batches/REV-CA-13-coordinator-queue-cursor-replay-and-watcher-integration.md) | ❌ Not started |
| CA-14 | Commands/sessions | [work](work-batches/CA-14-coordinator-event-and-ready-set-commands.md) | [review](review-batches/REV-CA-14-coordinator-event-and-ready-set-commands.md) | ❌ Not started |
| CA-15 | Commands/sessions | [work](work-batches/CA-15-operator-session-persistence-and-lifecycle.md) | [review](review-batches/REV-CA-15-operator-session-persistence-and-lifecycle.md) | ❌ Not started |
| CA-16 | Commands/sessions | [work](work-batches/CA-16-session-indexes-references-pins-and-compaction.md) | [review](review-batches/REV-CA-16-session-indexes-references-pins-and-compaction.md) | ❌ Not started |
| CA-17 | Commands/sessions | [work](work-batches/CA-17-session-routing-budgets-proposals-holds-and-amendments.md) | [review](review-batches/REV-CA-17-session-routing-budgets-proposals-holds-and-amendments.md) | ❌ Not started |
| CA-18 | Commands/sessions | [work](work-batches/CA-18-session-cli-pty-attachment-and-m6-acceptance.md) | [review](review-batches/REV-CA-18-session-cli-pty-attachment-and-m6-acceptance.md) | ❌ Not started |

## Batch Dependencies

| Batch | Depends on (pack-internal) | Depends on (cross-pack) | Parallel candidate with |
|-------|---------------------------|-------------------------|------------------------|
| CA-01 | — | LC-02, LC-05 | — |
| CA-02 | CA-01 | — | — |
| CA-03 | CA-02 | RM-05 | — |
| CA-04 | CA-01, CA-03 | RM-08 | — |
| CA-05 | CA-04 | RT-02 | — |
| CA-06 | CA-05 | RT-05 | — |
| CA-07 | CA-02, CA-03, CA-04, CA-05, CA-06 | — | — |
| CA-08 | CA-02, CA-06, CA-07 | — | — |
| CA-09 | CA-05, CA-07, CA-08 | — | — |
| CA-10 | CA-09 | LC-03 | — |
| CA-11 | CA-10 | RT-05 | CA-12 (after CA-10 accepts) |
| CA-12 | CA-10 | RM-08 | CA-11 (after CA-10 accepts) |
| CA-13 | CA-03, CA-05, CA-10, CA-11, CA-12 | — | — |
| CA-14 | CA-01 through CA-13 (accepted fixtures) | — | CA-15, CA-16, CA-17 (service fixtures) |
| CA-15 | CA-03 | UK-02 | CA-04 through CA-14 |
| CA-16 | CA-02, CA-15 | — | CA-14 |
| CA-17 | CA-06, CA-08, CA-09, CA-10, CA-15, CA-16 | — | CA-14 |
| CA-18 | CA-14, CA-15, CA-16, CA-17 | — | — |

## Reasoning Class Assignment

| Batch | Implementor | Reviewer | Reason for floor |
|-------|------------|----------|------------------|
| CA-01 | R5 | R5 | Deterministic index with seal verification; hash-chain correctness |
| CA-02 | R5 | R5 | Sharded index with corruption handling; partial-block recovery |
| CA-03 | R4 | R4 | Journal indexes and projections with checkpoint integrity |
| CA-04 | R5 | R5 | DAG scheduling projection; dependency/claim/capacity blocker resolution |
| CA-05 | R4 | R4 | Routing policy classification with first-match determinism |
| CA-06 | R4 | R4 | Endpoint eligibility gates and adapter isolation |
| CA-07 | R4 | R4 | Decision envelope immutability and semantic digest stability |
| CA-08 | R5 | R5 | Context broker with usage budgets and provenance tracking |
| CA-09 | R5 | R5 | Typed proposal validation with stale/illegal/invalid handling |
| CA-10 | R5 | R5 | Atomic effect executor — sole authority; idempotency and crash safety |
| CA-11 | R4 | R4 | Tmux effect adapter — external process recovery |
| CA-12 | R4 | R4 | Git acceptance adapter — multi-repository publication and partial recovery |
| CA-13 | R5 | R5 | Coordinator queue with replay; concurrent cycle and cursor integrity |
| CA-14 | R4 | R4 | Command integration across all coordinator/session services |
| CA-15 | R4 | R4 | Operator-session persistence and lifecycle state machine |
| CA-16 | R5 | R5 | Session memory bounds — compaction, capsule, transitive reference proof |
| CA-17 | R5 | R5 | Session routing, budgets, holds — interleaving with automation safety |
| CA-18 | R5 | R5 | PTY attachment, replay, scale proof — end-to-end boundedness verification |

## Proof Classes Required Per Batch

| Proof class | Required by batches |
|-------------|---------------------|
| Unit/contract fixtures | All |
| Filesystem integration | CA-01–CA-04, CA-10–CA-13, CA-15 |
| Runtime packaging/smoke | CA-11, CA-13 |
| Transaction crash/replay | CA-03, CA-10–CA-13 |
| PTY/accessibility | CA-18 |
| Cost and scaling | CA-01, CA-02, CA-08, CA-18 |
| End-to-end acceptance | CA-18 |

## Mandatory Status-Doc Sync

Whenever a review accepts or rejects a batch, explicitly audit:

- `implementation-tracker.md` (this file)
- `implementation-roadmap.md`
- `README.md` batch status matrix

Also audit these if the batch outcome changes what they claim:

- `docs/spec/v1.md` — coordinator/session command status markers
- `docs/spec/v1-implementation-map.md` — pack exit criteria
- `docs/spec/coordinator-automation.md` — feature status
- `docs/spec/operator-session.md` — feature status
- `docs/spec/cli-session.md` — feature status

## Tracker Legend

| Symbol | Meaning |
|--------|---------|
| ❌ | Not started — no implementation begun |
| ⏳ | In progress — implementation or review active |
| ⚠️ | Review rejected — correction required |
| ✅ | Accepted — independent review pass |

## Implementation Agent Authority

Implementation agents produce code, tests, and an implementation report.
They do not commit. The paired reviewer owns acceptance and commits.
Every batch requires a durable implementation report under
`.local/agent-reports/coordinator-automation/` and a review report under
`.local/agent-reports/coordinator-automation/reviews/`.
