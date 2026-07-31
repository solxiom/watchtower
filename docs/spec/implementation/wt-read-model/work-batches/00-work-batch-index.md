# Read model — Work Batch Index

Status: **74-batch remediation synchronization candidate**

| Batch | Work brief | Launch prompt | Depends on | Wave |
|---|---|---|---|---:|
| RM-01 | [brief](RM-01-contract-kernel-and-error-taxonomy.md) | [prompt](RM-01-contract-kernel-and-error-taxonomy-agent-launch-prompt.md) | — | 1 |
| DB-01 | [brief](DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md) | [prompt](DB-01-sqlite-driver-packaging-and-derived-store-feasibility-agent-launch-prompt.md) | `RM-01` | 2 |
| RM-02 | [brief](RM-02-json-envelopes-and-schema-validation.md) | [prompt](RM-02-json-envelopes-and-schema-validation-agent-launch-prompt.md) | `RM-01`, `RM-13`, `RT-08` | 3 |
| RM-03 | [brief](RM-03-canonical-paths-and-workspace-resolution.md) | [prompt](RM-03-canonical-paths-and-workspace-resolution-agent-launch-prompt.md) | `RM-01` | 2 |
| RM-04 | [brief](RM-04-strict-env-and-lane-state-parsers.md) | [prompt](RM-04-strict-env-and-lane-state-parsers-agent-launch-prompt.md) | `RM-01` | 2 |
| RM-05 | [brief](RM-05-durable-worker-event-jsonl-parser.md) | [prompt](RM-05-durable-worker-event-jsonl-parser-agent-launch-prompt.md) | `RM-01` | 2 |
| RM-06 | [brief](RM-06-home-lane-discovery-and-selection.md) | [prompt](RM-06-home-lane-discovery-and-selection-agent-launch-prompt.md) | `RM-03`, `RM-04` | 3 |
| RM-07 | [brief](RM-07-membership-index-and-secondary-discovery.md) | [prompt](RM-07-membership-index-and-secondary-discovery-agent-launch-prompt.md) | `RM-03`, `RM-06` | 4 |
| RM-08 | [brief](RM-08-repository-bindings-and-conflict-inspection.md) | [prompt](RM-08-repository-bindings-and-conflict-inspection-agent-launch-prompt.md) | `RM-03`, `RM-07` | 5 |
| RM-09 | [brief](RM-09-tmux-watcher-heartbeat-and-worker-observations.md) | [prompt](RM-09-tmux-watcher-heartbeat-and-worker-observations-agent-launch-prompt.md) | `RM-04`, `RM-05` | 4 |
| RM-10 | [brief](RM-10-list-config-show-and-status-commands.md) | [prompt](RM-10-list-config-show-and-status-commands-agent-launch-prompt.md) | `RM-02`, `RM-06`–`RM-08` | 6 |
| RM-11 | [brief](RM-11-repository-nvb-parent-chain-composition.md) | [prompt](RM-11-repository-nvb-parent-chain-composition-agent-launch-prompt.md) | `RM-01` | 2 |
| RM-12 | [brief](RM-12-status-command-and-read-only-integration.md) | [prompt](RM-12-status-command-and-read-only-integration-agent-launch-prompt.md) | `RM-02`, `RM-06`–`RM-11` | 7 |
| RM-13 | [brief](RM-13-deterministic-json-schema-composition.md) | [prompt](RM-13-deterministic-json-schema-composition-agent-launch-prompt.md) | `RM-01` | 2 |

The explicit implementation-map DAG is the sole dispatch authority. A batch
requires accepted predecessors, a complete synchronized quartet, a current
seal, eligible resources, and no applicable hold.
