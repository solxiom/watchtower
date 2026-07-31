# Upgrade and knowledge — Review Batch Index

Status: **74-batch remediation synchronization candidate**

| Batch | Review brief | Launch prompt | Paired work | Required proof |
|---|---|---|---|---|
| UK-01 | [review](UK-01-review-upgrade-compatibility-and-preview-planner.md) | [prompt](UK-01-review-upgrade-compatibility-and-preview-planner-agent-launch-prompt.md) | [work](../work-batches/UK-01-upgrade-compatibility-and-preview-planner.md) | Runtime/knowledge/schema matrix; changed/preserved/conflict classification |
| UK-02 | [review](UK-02-review-lane-session-index-migration-registry.md) | [prompt](UK-02-review-lane-session-index-migration-registry-agent-launch-prompt.md) | [work](../work-batches/UK-02-lane-session-index-migration-registry.md) | Closed declared transitions only; no fictional versions; capability-owned rebuild adapters; value/history/pin/lifecycle preservation |
| UK-03 | [review](UK-03-review-atomic-upgrade-apply-recovery-and-downgrade-guard.md) | [prompt](UK-03-review-atomic-upgrade-apply-recovery-and-downgrade-guard-agent-launch-prompt.md) | [work](../work-batches/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard.md) | Manifest-last switch; crash recovery; old runtime remains usable; guarded downgrade |
| UK-04 | [review](UK-04-review-codex-cursor-and-claude-knowledge-installers.md) | [prompt](UK-04-review-codex-cursor-and-claude-knowledge-installers-agent-launch-prompt.md) | [work](../work-batches/UK-04-codex-cursor-and-claude-knowledge-installers.md) | Preview/replace/scope behavior; version record; no false notification claim |
| UK-05 | [review](UK-05-review-version-reporting-and-upgrade-conformance.md) | [prompt](UK-05-review-version-reporting-and-upgrade-conformance-agent-launch-prompt.md) | [work](../work-batches/UK-05-version-reporting-and-upgrade-conformance.md) | CLI/runtime/knowledge/schema report; two-version fixtures; collision and failed migration |

Each reviewer is independent, reproduces the mandatory engineering matrix, and
alone emits the durable verdict and acceptance commit. Publication is separate.
