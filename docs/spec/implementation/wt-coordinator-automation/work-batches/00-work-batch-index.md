# Coordinator automation — Work Batch Index

Status: **74-batch remediation synchronization candidate**

| Batch | Work brief | Launch prompt | Depends on | Wave |
|---|---|---|---|---:|
| CA-01 | [brief](CA-01-deterministic-sealed-pack-sqlite-compiler.md) | [prompt](CA-01-deterministic-sealed-pack-sqlite-compiler-agent-launch-prompt.md) | `DB-01`, `LC-02`, `LC-03` | 9 |
| CA-02 | [brief](CA-02-sqlite-index-stores-and-bounded-typed-queries.md) | [prompt](CA-02-sqlite-index-stores-and-bounded-typed-queries-agent-launch-prompt.md) | `CA-01` | 10 |
| CA-03 | [brief](CA-03-runtime-sqlite-indexes-and-projections.md) | [prompt](CA-03-runtime-sqlite-indexes-and-projections-agent-launch-prompt.md) | `RM-05`, `CA-02` | 11 |
| CA-04 | [brief](CA-04-ready-set-and-resource-claim-projection.md) | [prompt](CA-04-ready-set-and-resource-claim-projection-agent-launch-prompt.md) | `RM-08`, `CA-01`, `CA-03` | 12 |
| CA-05 | [brief](CA-05-ordered-routing-policy-and-capability-floors.md) | [prompt](CA-05-ordered-routing-policy-and-capability-floors-agent-launch-prompt.md) | `CA-04`, `RT-02`, `LC-05` | 13 |
| CA-06 | [brief](CA-06-endpoint-adapter-eligibility-and-isolation.md) | [prompt](CA-06-endpoint-adapter-eligibility-and-isolation-agent-launch-prompt.md) | `RT-05`, `CA-05` | 14 |
| CA-07 | [brief](CA-07-immutable-decision-envelopes.md) | [prompt](CA-07-immutable-decision-envelopes-agent-launch-prompt.md) | `CA-02`–`CA-06` | 15 |
| CA-08 | [brief](CA-08-context-broker-and-cycle-budgets.md) | [prompt](CA-08-context-broker-and-cycle-budgets-agent-launch-prompt.md) | `CA-02`, `CA-06`, `CA-07` | 16 |
| CA-09 | [brief](CA-09-typed-proposals-and-current-state-validator.md) | [prompt](CA-09-typed-proposals-and-current-state-validator-agent-launch-prompt.md) | `CA-05`, `CA-07`, `CA-08` | 17 |
| CA-10 | [brief](CA-10-atomic-lane-local-effect-executor.md) | [prompt](CA-10-atomic-lane-local-effect-executor-agent-launch-prompt.md) | `LC-03`, `CA-09` | 18 |
| CA-11 | [brief](CA-11-tmux-prepare-attempt-verify-effect-adapter.md) | [prompt](CA-11-tmux-prepare-attempt-verify-effect-adapter-agent-launch-prompt.md) | `RT-05`, `CA-10` | 19 |
| CA-12 | [brief](CA-12-acceptance-and-git-publication-adapter.md) | [prompt](CA-12-acceptance-and-git-publication-adapter-agent-launch-prompt.md) | `RM-08`, `CA-10` | 19 |
| CA-13 | [brief](CA-13-coordinator-queue-cursor-replay-and-watcher-integration.md) | [prompt](CA-13-coordinator-queue-cursor-replay-and-watcher-integration-agent-launch-prompt.md) | `CA-03`, `CA-05`, `CA-10`–`CA-12` | 20 |
| CA-14 | [brief](CA-14-coordinator-event-and-ready-set-commands.md) | [prompt](CA-14-coordinator-event-and-ready-set-commands-agent-launch-prompt.md) | `CA-01`–`CA-13` | 21 |
| CA-15 | [brief](CA-15-operator-session-persistence-and-lifecycle.md) | [prompt](CA-15-operator-session-persistence-and-lifecycle-agent-launch-prompt.md) | `CA-03`, `UK-02` | 12 |
| CA-16 | [brief](CA-16-session-sqlite-index-references-pins-and-compaction.md) | [prompt](CA-16-session-sqlite-index-references-pins-and-compaction-agent-launch-prompt.md) | `CA-02`, `CA-15` | 13 |
| CA-17 | [brief](CA-17-session-routing-budgets-proposals-holds-and-amendments.md) | [prompt](CA-17-session-routing-budgets-proposals-holds-and-amendments-agent-launch-prompt.md) | `CA-06`, `CA-08`, `CA-15`, `CA-16R` | 17 |
| CA-18 | [brief](CA-18-nirvana-opentui-feasibility-and-packaging-gate.md) | [prompt](CA-18-nirvana-opentui-feasibility-and-packaging-gate-agent-launch-prompt.md) | `RT-03`, `RT-05`, `CA-14`, `CA-15`, `CA-16R`, `CA-17`, `CA-25`, `CA-28`, `CA-29` | 23 |
| CA-19 | [brief](CA-19-tui-shell-responsive-layout-themes-and-focus.md) | [prompt](CA-19-tui-shell-responsive-layout-themes-and-focus-agent-launch-prompt.md) | `CA-18` | 24 |
| CA-20 | [brief](CA-20-conversation-timeline-composer-history-and-references.md) | [prompt](CA-20-conversation-timeline-composer-history-and-references-agent-launch-prompt.md) | `CA-16R`, `CA-19` | 25 |
| CA-21 | [brief](CA-21-inspector-command-palette-and-overlays.md) | [prompt](CA-21-inspector-command-palette-and-overlays-agent-launch-prompt.md) | `CA-14`, `CA-17`, `CA-19`, `CA-26`, `CA-27` | 25 |
| CA-22 | [brief](CA-22-turn-streaming-notifications-concurrency-and-observer-ui.md) | [prompt](CA-22-turn-streaming-notifications-concurrency-and-observer-ui-agent-launch-prompt.md) | `CA-17`, `CA-20`, `CA-21`, `CA-26`, `CA-27` | 26 |
| CA-23 | [brief](CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix.md) | [prompt](CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix-agent-launch-prompt.md) | `CA-18`–`CA-22` | 27 |
| CA-24 | [brief](CA-24-session-command-integration-scale-replay-and-m6-acceptance.md) | [prompt](CA-24-session-command-integration-scale-replay-and-m6-acceptance-agent-launch-prompt.md) | `CA-14`–`CA-23`, `CA-25`–`CA-31` | 29 |
| CA-25 | [brief](CA-25-cycle-escalation-and-specification-resolution-commands.md) | [prompt](CA-25-cycle-escalation-and-specification-resolution-commands-agent-launch-prompt.md) | `CA-13`, `CA-14`, `CA-17`, `CA-26`–`CA-29` | 22 |
| CA-26 | [brief](CA-26-session-proposals-confirmation-revalidation-and-apply.md) | [prompt](CA-26-session-proposals-confirmation-revalidation-and-apply-agent-launch-prompt.md) | `CA-09`, `CA-10`, `CA-15`–`CA-17` | 19 |
| CA-27 | [brief](CA-27-scoped-holds-amendment-requests-and-amendment-admission.md) | [prompt](CA-27-scoped-holds-amendment-requests-and-amendment-admission-agent-launch-prompt.md) | `CA-09`, `CA-10`, `CA-15`–`CA-17` | 19 |
| CA-28 | [brief](CA-28-opencode-decision-endpoint-adapter.md) | [prompt](CA-28-opencode-decision-endpoint-adapter-agent-launch-prompt.md) | `CA-06`, `RT-05` | 15 |
| CA-29 | [brief](CA-29-hermes-decision-endpoint-adapter.md) | [prompt](CA-29-hermes-decision-endpoint-adapter-agent-launch-prompt.md) | `CA-06`, `RT-05` | 15 |
| CA-30 | [brief](CA-30-pack-index-build-and-runtime-index-rebuild-command.md) | [prompt](CA-30-pack-index-build-and-runtime-index-rebuild-command-agent-launch-prompt.md) | `CA-01`, `CA-10`, `CA-13`, `CA-14`, `RT-05`, `RT-09` | 22 |
| CA-31 | [brief](CA-31-coordinator-session-and-tui-doctor-providers.md) | [prompt](CA-31-coordinator-session-and-tui-doctor-providers-agent-launch-prompt.md) | `LC-07`, `CA-13`, `CA-16R`, `CA-19`–`CA-23` | 28 |

The explicit implementation-map DAG is the sole dispatch authority. A batch
requires accepted predecessors, a complete synchronized quartet, a current
seal, eligible resources, and no applicable hold.
