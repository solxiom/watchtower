# Lane lifecycle — Work Batch Index

Status: **74-batch remediation synchronization candidate**

| Batch | Work brief | Launch prompt | Depends on | Wave |
|---|---|---|---|---:|
| LC-01 | [brief](LC-01-init-argument-resolution-and-preflight-plan.md) | [prompt](LC-01-init-argument-resolution-and-preflight-plan-agent-launch-prompt.md) | `RM-03`, `RM-08`, `RT-04` | 6 |
| LC-02 | [brief](LC-02-pack-acceptance-seal-and-drift-validation.md) | [prompt](LC-02-pack-acceptance-seal-and-drift-validation-agent-launch-prompt.md) | `RM-01`, `RM-08` | 6 |
| LC-03 | [brief](LC-03-transactional-lane-layout-and-manifests.md) | [prompt](LC-03-transactional-lane-layout-and-manifests-agent-launch-prompt.md) | `LC-01`, `LC-02`, `RT-06` | 8 |
| LC-04 | [brief](LC-04-bindings-gitignore-and-membership-registration.md) | [prompt](LC-04-bindings-gitignore-and-membership-registration-agent-launch-prompt.md) | `LC-03`, `RM-07` | 9 |
| LC-05 | [brief](LC-05-coordinator-session-baselines-and-pack-index.md) | [prompt](LC-05-coordinator-session-baselines-and-pack-index-agent-launch-prompt.md) | `LC-02`, `LC-03`, `RT-02` | 9 |
| LC-06 | [brief](LC-06-foreground-watch-command.md) | [prompt](LC-06-foreground-watch-command-agent-launch-prompt.md) | `LC-09`, `RT-07` | 11 |
| LC-07 | [brief](LC-07-comprehensive-doctor-registry.md) | [prompt](LC-07-comprehensive-doctor-registry-agent-launch-prompt.md) | `LC-04`, `LC-05`, `RM-09` | 10 |
| LC-08 | [brief](LC-08-lifecycle-integration-and-scaffold-removal.md) | [prompt](LC-08-lifecycle-integration-and-scaffold-removal-agent-launch-prompt.md) | `LC-10`, `RM-10`, `RM-12` | 13 |
| LC-09 | [brief](LC-09-initial-sealed-pack-index-activation.md) | [prompt](LC-09-initial-sealed-pack-index-activation-agent-launch-prompt.md) | `CA-01`, `LC-05` | 10 |
| LC-10 | [brief](LC-10-runtime-account-watcher-and-index-doctor-providers.md) | [prompt](LC-10-runtime-account-watcher-and-index-doctor-providers-agent-launch-prompt.md) | `LC-06`, `LC-07`, `LC-09`, `RT-07` | 12 |
| LC-11 | [brief](LC-11-init-effect-composition-and-command-wiring.md) | [prompt](LC-11-init-effect-composition-and-command-wiring-agent-launch-prompt.md) | `LC-01`, `LC-02`, `LC-03`, `LC-04`, `LC-05`, `LC-09` | 13 |

The explicit implementation-map DAG is the sole dispatch authority. A batch
requires accepted predecessors, a complete synchronized quartet, a current
seal, eligible resources, and no applicable hold.
