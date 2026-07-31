# Runtime distribution — Work Batch Index

Status: **74-batch remediation synchronization candidate**

| Batch | Work brief | Launch prompt | Depends on | Wave |
|---|---|---|---|---:|
| RT-01 | [brief](RT-01-runtime-and-knowledge-asset-audit-import.md) | [prompt](RT-01-runtime-and-knowledge-asset-audit-import-agent-launch-prompt.md) | `RM-01` | 2 |
| RT-02 | [brief](RT-02-runtime-and-knowledge-manifests.md) | [prompt](RT-02-runtime-and-knowledge-manifests-agent-launch-prompt.md) | `RT-01`, `RM-11` | 3 |
| RT-03 | [brief](RT-03-nvb-distribution-staging.md) | [prompt](RT-03-nvb-distribution-staging-agent-launch-prompt.md) | `RT-02`, `RT-08`–`RT-10`, `DB-01` | 5 |
| RT-04 | [brief](RT-04-immutable-data-root-catalog-and-staging.md) | [prompt](RT-04-immutable-data-root-catalog-and-staging-agent-launch-prompt.md) | `RT-02`, `RM-03` | 4 |
| RT-05 | [brief](RT-05-central-runtime-invocation-adapter.md) | [prompt](RT-05-central-runtime-invocation-adapter-agent-launch-prompt.md) | `RT-03`, `RT-04`, `RT-09` | 6 |
| RT-06 | [brief](RT-06-managed-lane-links-and-compatibility-names.md) | [prompt](RT-06-managed-lane-links-and-compatibility-names-agent-launch-prompt.md) | `RT-04`, `RT-05` | 7 |
| RT-07 | [brief](RT-07-packaged-watcher-and-runtime-smoke-proof.md) | [prompt](RT-07-packaged-watcher-and-runtime-smoke-proof-agent-launch-prompt.md) | `RT-03`, `RT-05`, `RT-06` | 8 |
| RT-08 | [brief](RT-08-nirvana-dependency-closure-and-isolated-install-harness.md) | [prompt](RT-08-nirvana-dependency-closure-and-isolated-install-harness-agent-launch-prompt.md) | `RM-01` | 2 |
| RT-09 | [brief](RT-09-task-catalog-lane-profile-and-aggregate-contracts.md) | [prompt](RT-09-task-catalog-lane-profile-and-aggregate-contracts-agent-launch-prompt.md) | `RT-01`, `RM-11` | 3 |
| RT-10 | [brief](RT-10-baseline-packaged-taskhandlers.md) | [prompt](RT-10-baseline-packaged-taskhandlers-agent-launch-prompt.md) | `RT-09` | 4 |

The explicit implementation-map DAG is the sole dispatch authority. A batch
requires accepted predecessors, a complete synchronized quartet, a current
seal, eligible resources, and no applicable hold.
