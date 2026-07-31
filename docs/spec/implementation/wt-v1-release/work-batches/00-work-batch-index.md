# V1 release — Work Batch Index

Status: **74-batch remediation synchronization candidate**

| Batch | Work brief | Launch prompt | Depends on | Wave |
|---|---|---|---|---:|
| REL-01 | [brief](REL-01-fresh-lane-implementer-reviewer-accept-trial.md) | [prompt](REL-01-fresh-lane-implementer-reviewer-accept-trial-agent-launch-prompt.md) | `LC-08`, `UK-05`, `CA-24` | 30 |
| REL-02 | [brief](REL-02-concurrent-and-multi-repository-recovery-trials.md) | [prompt](REL-02-concurrent-and-multi-repository-recovery-trials-agent-launch-prompt.md) | `REL-01` | 31 |
| REL-03 | [brief](REL-03-security-ownership-performance-and-package-qualification.md) | [prompt](REL-03-security-ownership-performance-and-package-qualification-agent-launch-prompt.md) | `REL-01`, `REL-02` | 32 |
| REL-04 | [brief](REL-04-documentation-consistency-and-release-gate.md) | [prompt](REL-04-documentation-consistency-and-release-gate-agent-launch-prompt.md) | `REL-01`–`REL-03` | 33 |

The explicit implementation-map DAG is the sole dispatch authority. A batch
requires accepted predecessors, a complete synchronized quartet, a current
seal, eligible resources, and no applicable hold.
