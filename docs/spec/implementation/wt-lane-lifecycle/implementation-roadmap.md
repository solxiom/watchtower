# Lane lifecycle Roadmap

Status: **Synchronized remediation candidate**

| Wave | Batch | Capability | Depends on | Ownership |
|---:|---|---|---|---|
| 6 | LC-01 | Init argument resolution and preflight plan | `RM-03`, `RM-08`, `RT-04` | init planning foundation/command |
| 6 | LC-02 | Pack acceptance, seal, and drift validation | `RM-01`, `RM-08` | pack consumer foundation |
| 8 | LC-03 | Transactional lane layout and manifests | `LC-01`, `LC-02`, `RT-06` | lane store foundation |
| 9 | LC-04 | Bindings, Git-ignore, and membership registration | `LC-03`, `RM-07` | repository/index mutation foundation |
| 9 | LC-05 | Coordinator and session policy baselines | `LC-02`, `LC-03`, `RT-02` | verified policy materialization and empty durable roots |
| 11 | LC-06 | Foreground `watch` command | `LC-09`, `RT-07` | watch command/runtime adapter |
| 10 | LC-07 | Doctor kernel and lane-local checks | `LC-04`, `LC-05`, `RM-09` | immutable check composition, command/help, lane checks |
| 13 | LC-08 | Lifecycle integration and scaffold removal | `LC-10`, `RM-10`, `RM-12` | end-to-end specs, help registry |
| 10 | LC-09 | Initial sealed pack-index activation | `CA-01`, `LC-05` | initialization adapter over accepted pack-index compiler |
| 12 | LC-10 | Runtime, account, watcher, and index doctor providers | `LC-06`, `LC-07`, `LC-09`, `RT-07` | injected diagnostic providers and integration |

Only the implementation-map DAG controls readiness. ACCEPT_PACKS activates these contracts atomically; it does not accept product code.
