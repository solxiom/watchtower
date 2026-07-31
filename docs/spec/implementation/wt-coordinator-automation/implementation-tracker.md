# wt-coordinator-automation Implementation Tracker

> **Accepted repack (2026-07-31).** The 24-batch matrix includes the full-screen
> TUI decomposition accepted and bootstrap-sealed by
> `../pack-acceptance-review.md`.

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

Status: **Accepted and bootstrap-sealed — implementation dispatch authorized**
Date: 2026-07-31
Pack: 5 of 6 — `wt-coordinator-automation`
Batches: 24 work + 24 review

## Batch Status Matrix

| Batch | Phase | Work brief | Review brief | Current status |
|-------|-------|------------|--------------|----------------|
| CA-01 | Index foundation | [work](work-batches/CA-01-deterministic-sealed-pack-sqlite-compiler.md) | [review](review-batches/CA-01-review-deterministic-sealed-pack-sqlite-compiler.md) | ❌ Not started |
| CA-02 | Index foundation | [work](work-batches/CA-02-sqlite-index-stores-and-bounded-typed-queries.md) | [review](review-batches/CA-02-review-sqlite-index-stores-and-bounded-typed-queries.md) | ❌ Not started |
| CA-03 | Index foundation | [work](work-batches/CA-03-runtime-sqlite-indexes-and-projections.md) | [review](review-batches/CA-03-review-runtime-sqlite-indexes-and-projections.md) | ❌ Not started |
| CA-04 | Index foundation | [work](work-batches/CA-04-ready-set-and-resource-claim-projection.md) | [review](review-batches/CA-04-review-ready-set-and-resource-claim-projection.md) | ❌ Not started |
| CA-05 | Routing/decision | [work](work-batches/CA-05-ordered-routing-policy-and-capability-floors.md) | [review](review-batches/CA-05-review-ordered-routing-policy-and-capability-floors.md) | ❌ Not started |
| CA-06 | Routing/decision | [work](work-batches/CA-06-endpoint-adapter-eligibility-and-isolation.md) | [review](review-batches/CA-06-review-endpoint-adapter-eligibility-and-isolation.md) | ❌ Not started |
| CA-07 | Routing/decision | [work](work-batches/CA-07-immutable-decision-envelopes.md) | [review](review-batches/CA-07-review-immutable-decision-envelopes.md) | ❌ Not started |
| CA-08 | Routing/decision | [work](work-batches/CA-08-context-broker-and-cycle-budgets.md) | [review](review-batches/CA-08-review-context-broker-and-cycle-budgets.md) | ❌ Not started |
| CA-09 | Routing/decision | [work](work-batches/CA-09-typed-proposals-and-current-state-validator.md) | [review](review-batches/CA-09-review-typed-proposals-and-current-state-validator.md) | ❌ Not started |
| CA-10 | Effect foundation | [work](work-batches/CA-10-atomic-lane-local-effect-executor.md) | [review](review-batches/CA-10-review-atomic-lane-local-effect-executor.md) | ❌ Not started |
| CA-11 | Effect foundation | [work](work-batches/CA-11-tmux-prepare-attempt-verify-effect-adapter.md) | [review](review-batches/CA-11-review-tmux-prepare-attempt-verify-effect-adapter.md) | ❌ Not started |
| CA-12 | Effect foundation | [work](work-batches/CA-12-acceptance-and-git-publication-adapter.md) | [review](review-batches/CA-12-review-acceptance-and-git-publication-adapter.md) | ❌ Not started |
| CA-13 | Effect foundation | [work](work-batches/CA-13-coordinator-queue-cursor-replay-and-watcher-integration.md) | [review](review-batches/CA-13-review-coordinator-queue-cursor-replay-and-watcher-integration.md) | ❌ Not started |
| CA-14 | Commands/sessions | [work](work-batches/CA-14-coordinator-event-and-ready-set-commands.md) | [review](review-batches/CA-14-review-coordinator-event-and-ready-set-commands.md) | ❌ Not started |
| CA-15 | Commands/sessions | [work](work-batches/CA-15-operator-session-persistence-and-lifecycle.md) | [review](review-batches/CA-15-review-operator-session-persistence-and-lifecycle.md) | ❌ Not started |
| CA-16 | Commands/sessions | [work](work-batches/CA-16-session-sqlite-index-references-pins-and-compaction.md) | [review](review-batches/CA-16-review-session-sqlite-index-references-pins-and-compaction.md) | ❌ Not started |
| CA-17 | Commands/sessions | [work](work-batches/CA-17-session-routing-budgets-proposals-holds-and-amendments.md) | [review](review-batches/CA-17-review-session-routing-budgets-proposals-holds-and-amendments.md) | ❌ Not started |
| CA-18 | TUI qualification | [work](work-batches/CA-18-nirvana-opentui-feasibility-and-packaging-gate.md) | [review](review-batches/CA-18-review-nirvana-opentui-feasibility-and-packaging-gate.md) | ❌ Not started |
| CA-19 | TUI presentation | [work](work-batches/CA-19-tui-shell-responsive-layout-themes-and-focus.md) | [review](review-batches/CA-19-review-tui-shell-responsive-layout-themes-and-focus.md) | ❌ Not started |
| CA-20 | TUI presentation | [work](work-batches/CA-20-conversation-timeline-composer-history-and-references.md) | [review](review-batches/CA-20-review-conversation-timeline-composer-history-and-references.md) | ❌ Not started |
| CA-21 | TUI presentation | [work](work-batches/CA-21-inspector-command-palette-and-overlays.md) | [review](review-batches/CA-21-review-inspector-command-palette-and-overlays.md) | ❌ Not started |
| CA-22 | TUI integration | [work](work-batches/CA-22-turn-streaming-notifications-concurrency-and-observer-ui.md) | [review](review-batches/CA-22-review-turn-streaming-notifications-concurrency-and-observer-ui.md) | ❌ Not started |
| CA-23 | TUI qualification | [work](work-batches/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix.md) | [review](review-batches/CA-23-review-accessibility-terminal-lifecycle-recovery-and-pty-matrix.md) | ❌ Not started |
| CA-24 | Commands/M6 | [work](work-batches/CA-24-session-command-integration-scale-replay-and-m6-acceptance.md) | [review](review-batches/CA-24-review-session-command-integration-scale-replay-and-m6-acceptance.md) | ❌ Not started |

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
| CA-18 | CA-14, CA-15, CA-16, CA-17 | RT-03, RT-05 | — |
| CA-19 | CA-18 | — | — |
| CA-20 | CA-16, CA-19 | — | CA-21 |
| CA-21 | CA-14, CA-17, CA-19 | — | CA-20 |
| CA-22 | CA-17, CA-20, CA-21 | — | — |
| CA-23 | CA-18 through CA-22 | — | — |
| CA-24 | CA-14 through CA-23 | — | — |

## Reasoning Class Assignment

| Batch | Implementor | Reviewer | Reason for floor |
|-------|------------|----------|------------------|
| CA-01 | R5 | R5 | Deterministic index with seal verification; hash-chain correctness |
| CA-02 | R5 | R5 | Typed SQLite stores, bounded indexed queries, stale/corrupt refusal |
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
| CA-18 | R4 | R4 | Experimental FFI/native packaging and Nirvana compatibility gate |
| CA-19 | R4 | R4 | Responsive shell/focus/theme ownership and adapter isolation |
| CA-20 | R5 | R5 | Virtualization, retention, reference/path security, bounded memory |
| CA-21 | R4 | R4 | Bounded query/action/confirmation presentation boundaries |
| CA-22 | R5 | R5 | Streaming ordering/backpressure and attachment concurrency |
| CA-23 | R5 | R5 | Terminal restoration/security/accessibility across PTY matrix |
| CA-24 | R5 | R5 | Full command integration, scale/replay/soak, M6 authority closure |

## Proof Classes Required Per Batch

| Proof class | Required by batches |
|-------------|---------------------|
| Unit/contract fixtures | All |
| Filesystem integration | CA-01–CA-04, CA-10–CA-13, CA-15 |
| Runtime packaging/smoke | CA-11, CA-13, CA-18, CA-23, CA-24 |
| Transaction crash/replay | CA-03, CA-10–CA-13 |
| PTY/accessibility | CA-18, CA-19, CA-23, CA-24 |
| Cost and scaling | CA-01, CA-02, CA-08, CA-20, CA-22, CA-24 |
| End-to-end acceptance | CA-24 |

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
