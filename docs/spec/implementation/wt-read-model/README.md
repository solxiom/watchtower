# Read model Implementation Pack

Status: **Synchronized remediation candidate; dispatch requires ACCEPT_PACKS and activation**

This pack is one part of the accepted 74-batch/33-wave architecture. The explicit batch DAG is the sole scheduler; pack numbering adds no hidden dependency.

| Batch | Capability | Work | Review | State |
|---|---|---|---|---|
| RM-01 | Contract kernel, error taxonomy, and source architecture gates | [work](work-batches/RM-01-contract-kernel-and-error-taxonomy.md) | [review](review-batches/RM-01-review-contract-kernel-and-error-taxonomy.md) | ✅ Accepted |
| DB-01 | SQLite driver, packaging, and derived-store feasibility | [work](work-batches/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md) | [review](review-batches/DB-01-review-sqlite-driver-packaging-and-derived-store-feasibility.md) | ✅ Accepted |
| RM-02 | Public JSON envelopes and schema validation | [work](work-batches/RM-02-json-envelopes-and-schema-validation.md) | [review](review-batches/RM-02-review-json-envelopes-and-schema-validation.md) | 🚫 Preserved; prerequisites/pack activation |
| RM-03 | Canonical paths and workspace resolution | [work](work-batches/RM-03-canonical-paths-and-workspace-resolution.md) | [review](review-batches/RM-03-review-canonical-paths-and-workspace-resolution.md) | ⏳ Admitted line |
| RM-04 | Strict env and lane-state parsers | [work](work-batches/RM-04-strict-env-and-lane-state-parsers.md) | [review](review-batches/RM-04-review-strict-env-and-lane-state-parsers.md) | ⏳ Admitted line |
| RM-05 | Durable worker-event JSONL parser | [work](work-batches/RM-05-durable-worker-event-jsonl-parser.md) | [review](review-batches/RM-05-review-durable-worker-event-jsonl-parser.md) | ⏳ Admitted line |
| RM-06 | Home-lane discovery and deterministic selection | [work](work-batches/RM-06-home-lane-discovery-and-selection.md) | [review](review-batches/RM-06-review-home-lane-discovery-and-selection.md) | ❌ Pending |
| RM-07 | Membership index and secondary-repository discovery | [work](work-batches/RM-07-membership-index-and-secondary-discovery.md) | [review](review-batches/RM-07-review-membership-index-and-secondary-discovery.md) | ❌ Pending |
| RM-08 | Repository bindings and writable conflict inspection | [work](work-batches/RM-08-repository-bindings-and-conflict-inspection.md) | [review](review-batches/RM-08-review-repository-bindings-and-conflict-inspection.md) | ❌ Pending |
| RM-09 | Tmux, watcher, heartbeat, and worker observations | [work](work-batches/RM-09-tmux-watcher-heartbeat-and-worker-observations.md) | [review](review-batches/RM-09-review-tmux-watcher-heartbeat-and-worker-observations.md) | ❌ Pending |
| RM-10 | `list` and `config show` | [work](work-batches/RM-10-list-config-show-and-status-commands.md) | [review](review-batches/RM-10-review-list-config-show-and-status-commands.md) | ❌ Pending |
| RM-11 | Repository NVB parent-chain composition | [work](work-batches/RM-11-repository-nvb-parent-chain-composition.md) | [review](review-batches/RM-11-review-repository-nvb-parent-chain-composition.md) | ❌ Pending |
| RM-12 | `status` command and read-only integration | [work](work-batches/RM-12-status-command-and-read-only-integration.md) | [review](review-batches/RM-12-review-status-command-and-read-only-integration.md) | ❌ Pending |
| RM-13 | Deterministic JSON Schema composition | [work](work-batches/RM-13-deterministic-json-schema-composition.md) | [review](review-batches/RM-13-review-deterministic-json-schema-composition.md) | ✅ Accepted after correction 02 |

All batches follow [the mandatory engineering standard](../../../development/engineering-and-review-standard.md), [Nirvana integration architecture](../../nirvana-integration-architecture.md), and this pack's quality rules.
