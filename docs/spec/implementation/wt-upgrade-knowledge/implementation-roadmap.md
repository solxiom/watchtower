# Upgrade and knowledge Roadmap

Status: **Synchronized remediation candidate**

| Wave | Batch | Capability | Depends on | Ownership |
|---:|---|---|---|---|
| 9 | UK-01 | Upgrade compatibility and preview planner | `LC-03`, `RT-02` | upgrade foundation/command — ✅ Accepted |
| 10 | UK-02 | Migration framework and preservation harness | `UK-01`, `LC-05` | migration registry/staging contracts |
| 11 | UK-03 | Atomic upgrade apply, recovery, and downgrade guard | `UK-02`, `RT-04`, `RT-06` | install pointer/store — ⏳ Awaiting review |
| 4 | UK-04 | Codex, Cursor, and Claude knowledge installers | `RT-01`, `RT-02` | host adapters and skill command |
| 12 | UK-05 | Version reporting and upgrade conformance | `UK-03`, `UK-04` | version command/help/integration |

Only the implementation-map DAG controls readiness. ACCEPT_PACKS activates these contracts atomically; it does not accept product code.
