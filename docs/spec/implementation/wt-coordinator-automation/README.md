# Coordinator automation Implementation Pack

Status: **Synchronized remediation candidate; dispatch requires ACCEPT_PACKS and activation**

This pack is one part of the accepted 74-batch/33-wave architecture. The explicit batch DAG is the sole scheduler; pack numbering adds no hidden dependency.

| Batch | Capability | Work | Review | State |
|---|---|---|---|---|
| CA-01 | Deterministic sealed-pack SQLite compiler | [work](work-batches/CA-01-deterministic-sealed-pack-sqlite-compiler.md) | [review](review-batches/CA-01-review-deterministic-sealed-pack-sqlite-compiler.md) | ❌ Pending |
| CA-02 | SQLite index stores and bounded typed queries | [work](work-batches/CA-02-sqlite-index-stores-and-bounded-typed-queries.md) | [review](review-batches/CA-02-review-sqlite-index-stores-and-bounded-typed-queries.md) | ❌ Pending |
| CA-03 | Runtime SQLite indexes and projections | [work](work-batches/CA-03-runtime-sqlite-indexes-and-projections.md) | [review](review-batches/CA-03-review-runtime-sqlite-indexes-and-projections.md) | ❌ Pending |
| CA-04 | Ready set and resource-claim projection | [work](work-batches/CA-04-ready-set-and-resource-claim-projection.md) | [review](review-batches/CA-04-review-ready-set-and-resource-claim-projection.md) | ❌ Pending |
| CA-05 | Ordered routing policy and capability floors | [work](work-batches/CA-05-ordered-routing-policy-and-capability-floors.md) | [review](review-batches/CA-05-review-ordered-routing-policy-and-capability-floors.md) | ❌ Pending |
| CA-06 | Provider-neutral endpoint eligibility and isolation core | [work](work-batches/CA-06-endpoint-adapter-eligibility-and-isolation.md) | [review](review-batches/CA-06-review-endpoint-adapter-eligibility-and-isolation.md) | ❌ Pending |
| CA-07 | Immutable decision envelopes | [work](work-batches/CA-07-immutable-decision-envelopes.md) | [review](review-batches/CA-07-review-immutable-decision-envelopes.md) | ✅ Accepted |
| CA-08 | Context broker and cycle budgets | [work](work-batches/CA-08-context-broker-and-cycle-budgets.md) | [review](review-batches/CA-08-review-context-broker-and-cycle-budgets.md) | ❌ Pending |
| CA-09 | Typed proposals and current-state validator | [work](work-batches/CA-09-typed-proposals-and-current-state-validator.md) | [review](review-batches/CA-09-review-typed-proposals-and-current-state-validator.md) | ❌ Pending |
| CA-10 | Atomic lane-local effect executor and invocation envelopes | [work](work-batches/CA-10-atomic-lane-local-effect-executor.md) | [review](review-batches/CA-10-review-atomic-lane-local-effect-executor.md) | ❌ Pending |
| CA-11 | Tmux prepare/attempt/verify effect handler | [work](work-batches/CA-11-tmux-prepare-attempt-verify-effect-adapter.md) | [review](review-batches/CA-11-review-tmux-prepare-attempt-verify-effect-adapter.md) | ❌ Pending |
| CA-12 | Acceptance and Git publication handler | [work](work-batches/CA-12-acceptance-and-git-publication-adapter.md) | [review](review-batches/CA-12-review-acceptance-and-git-publication-adapter.md) | ❌ Pending |
| CA-13 | Coordinator queue, cursor, replay, and watcher task integration | [work](work-batches/CA-13-coordinator-queue-cursor-replay-and-watcher-integration.md) | [review](review-batches/CA-13-review-coordinator-queue-cursor-replay-and-watcher-integration.md) | ❌ Pending |
| CA-14 | Read-only coordinator, index, event, and ready-set commands | [work](work-batches/CA-14-coordinator-event-and-ready-set-commands.md) | [review](review-batches/CA-14-review-coordinator-event-and-ready-set-commands.md) | ❌ Pending |
| CA-15 | Operator-session persistence and lifecycle | [work](work-batches/CA-15-operator-session-persistence-and-lifecycle.md) | [review](review-batches/CA-15-review-operator-session-persistence-and-lifecycle.md) | ❌ Pending |
| CA-16 | Session SQLite index, references, pins, and compaction | [work](work-batches/CA-16-session-sqlite-index-references-pins-and-compaction.md) | [review](review-batches/CA-16-review-session-sqlite-index-references-pins-and-compaction.md) | ❌ Pending |
| CA-17 | Session routing and budgets | [work](work-batches/CA-17-session-routing-budgets-proposals-holds-and-amendments.md) | [review](review-batches/CA-17-review-session-routing-budgets-proposals-holds-and-amendments.md) | ❌ Pending |
| CA-18 | Accepted OpenTUI evidence promotion and packaging gate | [work](work-batches/CA-18-nirvana-opentui-feasibility-and-packaging-gate.md) | [review](review-batches/CA-18-review-nirvana-opentui-feasibility-and-packaging-gate.md) | ❌ Pending |
| CA-19 | TUI shell, responsive layout, themes, and focus | [work](work-batches/CA-19-tui-shell-responsive-layout-themes-and-focus.md) | [review](review-batches/CA-19-review-tui-shell-responsive-layout-themes-and-focus.md) | ❌ Pending |
| CA-20 | Conversation timeline, composer, history, and references | [work](work-batches/CA-20-conversation-timeline-composer-history-and-references.md) | [review](review-batches/CA-20-review-conversation-timeline-composer-history-and-references.md) | ❌ Pending |
| CA-21 | Inspector views, command palette, and overlays | [work](work-batches/CA-21-inspector-command-palette-and-overlays.md) | [review](review-batches/CA-21-review-inspector-command-palette-and-overlays.md) | ❌ Pending |
| CA-22 | Turn streaming, notifications, concurrency, and observer UI | [work](work-batches/CA-22-turn-streaming-notifications-concurrency-and-observer-ui.md) | [review](review-batches/CA-22-review-turn-streaming-notifications-concurrency-and-observer-ui.md) | ❌ Pending |
| CA-23 | Accessibility, terminal lifecycle, recovery, and PTY matrix | [work](work-batches/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix.md) | [review](review-batches/CA-23-review-accessibility-terminal-lifecycle-recovery-and-pty-matrix.md) | ❌ Pending |
| CA-24 | Session command integration, specification-resolution proof, scale/replay, and M6 acceptance | [work](work-batches/CA-24-session-command-integration-scale-replay-and-m6-acceptance.md) | [review](review-batches/CA-24-review-session-command-integration-scale-replay-and-m6-acceptance.md) | ❌ Pending |
| CA-25 | Cycle, escalation, and specification-resolution commands | [work](work-batches/CA-25-cycle-escalation-and-specification-resolution-commands.md) | [review](review-batches/CA-25-review-cycle-escalation-and-specification-resolution-commands.md) | ❌ Pending |
| CA-26 | Session proposals, confirmation, revalidation, and apply | [work](work-batches/CA-26-session-proposals-confirmation-revalidation-and-apply.md) | [review](review-batches/CA-26-review-session-proposals-confirmation-revalidation-and-apply.md) | ❌ Pending |
| CA-27 | Scoped holds, amendment requests, and amendment admission | [work](work-batches/CA-27-scoped-holds-amendment-requests-and-amendment-admission.md) | [review](review-batches/CA-27-review-scoped-holds-amendment-requests-and-amendment-admission.md) | ❌ Pending |
| CA-28 | OpenCode decision-endpoint adapter | [work](work-batches/CA-28-opencode-decision-endpoint-adapter.md) | [review](review-batches/CA-28-review-opencode-decision-endpoint-adapter.md) | ❌ Pending |
| CA-29 | Hermes decision-endpoint adapter | [work](work-batches/CA-29-hermes-decision-endpoint-adapter.md) | [review](review-batches/CA-29-review-hermes-decision-endpoint-adapter.md) | ❌ Pending |
| CA-30 | Pack-index build and runtime-index rebuild command | [work](work-batches/CA-30-pack-index-build-and-runtime-index-rebuild-command.md) | [review](review-batches/CA-30-review-pack-index-build-and-runtime-index-rebuild-command.md) | ❌ Pending |
| CA-31 | Coordinator, session, and TUI doctor providers | [work](work-batches/CA-31-coordinator-session-and-tui-doctor-providers.md) | [review](review-batches/CA-31-review-coordinator-session-and-tui-doctor-providers.md) | ❌ Pending |

All batches follow [the mandatory engineering standard](../../../development/engineering-and-review-standard.md), [Nirvana integration architecture](../../nirvana-integration-architecture.md), and this pack's quality rules.
