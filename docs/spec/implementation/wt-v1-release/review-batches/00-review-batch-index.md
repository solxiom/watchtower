# V1 release — Review Batch Index

Status: **74-batch remediation synchronization candidate**

| Batch | Review brief | Launch prompt | Paired work | Required proof |
|---|---|---|---|---|
| REL-01 | [review](REL-01-review-fresh-lane-implementer-reviewer-accept-trial.md) | [prompt](REL-01-review-fresh-lane-implementer-reviewer-accept-trial-agent-launch-prompt.md) | [work](../work-batches/REL-01-fresh-lane-implementer-reviewer-accept-trial.md) | Global install; init; dispatch; handoff; independent accept; publication |
| REL-02 | [review](REL-02-review-concurrent-and-multi-repository-recovery-trials.md) | [prompt](REL-02-review-concurrent-and-multi-repository-recovery-trials-agent-launch-prompt.md) | [work](../work-batches/REL-02-concurrent-and-multi-repository-recovery-trials.md) | Two isolated lanes; multi-repo commit set; shared-write refusal; partial push recovery |
| REL-03 | [review](REL-03-review-security-ownership-performance-and-package-qualification.md) | [prompt](REL-03-review-security-ownership-performance-and-package-qualification-agent-launch-prompt.md) | [work](../work-batches/REL-03-security-ownership-performance-and-package-qualification.md) | Traversal/config/permission suite; bounded discovery/status; manifest/global install proof; real OpenCode and conditional Hermes adapter matrix |
| REL-04 | [review](REL-04-review-documentation-consistency-and-release-gate.md) | [prompt](REL-04-review-documentation-consistency-and-release-gate-agent-launch-prompt.md) | [work](../work-batches/REL-04-documentation-consistency-and-release-gate.md) | Every v1 acceptance item traced; no scaffold/generated artifacts; final package version/readme |

Each reviewer is independent, reproduces the mandatory engineering matrix, and
alone emits the durable verdict and acceptance commit. Publication is separate.
