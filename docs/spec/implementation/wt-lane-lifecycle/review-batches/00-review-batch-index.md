# Lane lifecycle — Review Batch Index

Status: **74-batch remediation synchronization candidate**

| Batch | Review brief | Launch prompt | Paired work | Required proof |
|---|---|---|---|---|
| LC-01 | [review](LC-01-review-init-argument-resolution-and-preflight-plan.md) | [prompt](LC-01-review-init-argument-resolution-and-preflight-plan-agent-launch-prompt.md) | [work](../work-batches/LC-01-init-argument-resolution-and-preflight-plan.md) | Exact syntax; no destination creation in preview; prefix/scope/routing validation |
| LC-02 | [review](LC-02-review-pack-acceptance-seal-and-drift-validation.md) | [prompt](LC-02-review-pack-acceptance-seal-and-drift-validation-agent-launch-prompt.md) | [work](../work-batches/LC-02-pack-acceptance-seal-and-drift-validation.md) | JSON Schema; RFC 8785 seal reproduction; Git/file-set/drift reason matrix |
| LC-03 | [review](LC-03-review-transactional-lane-layout-and-manifests.md) | [prompt](LC-03-review-transactional-lane-layout-and-manifests-agent-launch-prompt.md) | [work](../work-batches/LC-03-transactional-lane-layout-and-manifests.md) | Adjacent staging; atomic commit point; failure at every write/fsync/rename stage |
| LC-04 | [review](LC-04-review-bindings-gitignore-and-membership-registration.md) | [prompt](LC-04-review-bindings-gitignore-and-membership-registration-agent-launch-prompt.md) | [work](../work-batches/LC-04-bindings-gitignore-and-membership-registration.md) | Lock order; conditional Git-ignore rollback; post-commit idempotent registration |
| LC-05 | [review](LC-05-review-coordinator-session-baselines-and-pack-index.md) | [prompt](LC-05-review-coordinator-session-baselines-and-pack-index-agent-launch-prompt.md) | [work](../work-batches/LC-05-coordinator-session-baselines-and-pack-index.md) | Finite policies; installed-knowledge provenance; no Markdown restatement or model |
| LC-06 | [review](LC-06-review-foreground-watch-command.md) | [prompt](LC-06-review-foreground-watch-command-agent-launch-prompt.md) | [work](../work-batches/LC-06-foreground-watch-command.md) | Preflight; exec behavior; stdout and Ctrl-C compatibility; no daemonization |
| LC-07 | [review](LC-07-review-comprehensive-doctor-registry.md) | [prompt](LC-07-review-comprehensive-doctor-registry-agent-launch-prompt.md) | [work](../work-batches/LC-07-comprehensive-doctor-registry.md) | Pass/warn/fail/skip; marker/config/binding/permission/Git-ignore checks; read-only |
| LC-08 | [review](LC-08-review-lifecycle-integration-and-scaffold-removal.md) | [prompt](LC-08-review-lifecycle-integration-and-scaffold-removal-agent-launch-prompt.md) | [work](../work-batches/LC-08-lifecycle-integration-and-scaffold-removal.md) | Init→status→watch/doctor fixture; rollback proof; remove all hello artifacts safely |
| LC-09 | [review](LC-09-review-initial-sealed-pack-index-activation.md) | [prompt](LC-09-review-initial-sealed-pack-index-activation-agent-launch-prompt.md) | [work](../work-batches/LC-09-initial-sealed-pack-index-activation.md) | Seal-bound compile/verify/atomic activation; no duplicate compiler or JSON authority |
| LC-10 | [review](LC-10-review-runtime-account-watcher-and-index-doctor-providers.md) | [prompt](LC-10-review-runtime-account-watcher-and-index-doctor-providers-agent-launch-prompt.md) | [work](../work-batches/LC-10-runtime-account-watcher-and-index-doctor-providers.md) | Tool/account/runtime/index checks; exact pass/fail/skip; no global registry or repair |
| LC-11 | [review](LC-11-review-init-effect-composition-and-command-wiring.md) | [prompt](LC-11-review-init-effect-composition-and-command-wiring-agent-launch-prompt.md) | [work](../work-batches/LC-11-init-effect-composition-and-command-wiring.md) | Real init apply path; Phase 4 refusal matrix; transactional rollback/recovery; installed init→status→watch/doctor |

Each reviewer is independent, reproduces the mandatory engineering matrix, and
alone emits the durable verdict and acceptance commit. Publication is separate.
