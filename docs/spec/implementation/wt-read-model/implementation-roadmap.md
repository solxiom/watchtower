# Read model Roadmap

Status: **Synchronized remediation candidate**

| Wave | Batch | Capability | Depends on | Ownership |
|---:|---|---|---|---|
| 1 | RM-01 | Contract kernel, error taxonomy, and source architecture gates | — | `src/contracts/`, contract and architecture test helpers |
| 2 | DB-01 | SQLite driver, packaging, and derived-store feasibility | `RM-01` | storage interfaces, feasibility fixtures, ADR |
| 3 | RM-02 | Public JSON envelopes and schema validation | `RM-01`, `RM-13`, `RT-08` | contracts, render/serialization foundation |
| 2 | RM-03 | Canonical paths and workspace resolution | `RM-01` | path/workspace foundation |
| 2 | RM-04 | Strict env and lane-state parsers | `RM-01` | parser foundation |
| 2 | RM-05 | Durable worker-event JSONL parser | `RM-01` | event contracts/foundation |
| 3 | RM-06 | Home-lane discovery and deterministic selection | `RM-03`, `RM-04` | discovery/selection foundation |
| 4 | RM-07 | Membership index and secondary-repository discovery | `RM-03`, `RM-06` | membership/discovery foundation |
| 5 | RM-08 | Repository bindings and writable conflict inspection | `RM-03`, `RM-07` | repository/conflict foundation |
| 4 | RM-09 | Tmux, watcher, heartbeat, and worker observations | `RM-04`, `RM-05` | observation foundation |
| 6 | RM-10 | `list` and `config show` | `RM-02`, `RM-06`–`RM-08` | commands, help, identity/config integration specs |
| 2 | RM-11 | Repository NVB parent-chain composition | `RM-01` | development NVB parent chain and architecture gates |
| 7 | RM-12 | `status` command and read-only integration | `RM-02`, `RM-06`–`RM-11` | status projection, command/help, integration specs |
| 2 | RM-13 | Deterministic JSON Schema composition | `RM-01` | schema fragments, composer, aggregate stale gate |

Only the implementation-map DAG controls readiness. ACCEPT_PACKS activates these contracts atomically; it does not accept product code.
