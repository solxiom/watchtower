# Upgrade and knowledge — Work Batch Index

Status: **74-batch remediation synchronization candidate**

| Batch | Work brief | Launch prompt | Depends on | Wave |
|---|---|---|---|---:|
| UK-01 | [brief](UK-01-upgrade-compatibility-and-preview-planner.md) | [prompt](UK-01-upgrade-compatibility-and-preview-planner-agent-launch-prompt.md) | `LC-03`, `RT-02` | 9 |
| UK-02 | [brief](UK-02-lane-session-index-migration-registry.md) | [prompt](UK-02-lane-session-index-migration-registry-agent-launch-prompt.md) | `UK-01`, `LC-05` | 10 |
| UK-03 | [brief](UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard.md) | [prompt](UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard-agent-launch-prompt.md) | `UK-02`, `RT-04`, `RT-06` | 11 |
| UK-04 | [brief](UK-04-codex-cursor-and-claude-knowledge-installers.md) | [prompt](UK-04-codex-cursor-and-claude-knowledge-installers-agent-launch-prompt.md) | `RT-01`, `RT-02` | 4 |
| UK-05 | [brief](UK-05-version-reporting-and-upgrade-conformance.md) | [prompt](UK-05-version-reporting-and-upgrade-conformance-agent-launch-prompt.md) | `UK-03`, `UK-04` | 12 |

The explicit implementation-map DAG is the sole dispatch authority. A batch
requires accepted predecessors, a complete synchronized quartet, a current
seal, eligible resources, and no applicable hold.
