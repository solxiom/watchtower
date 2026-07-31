# Runtime distribution Roadmap

Status: **Synchronized remediation candidate**

| Wave | Batch | Capability | Depends on | Ownership |
|---:|---|---|---|---|
| 2 | RT-01 | Canonical runtime/knowledge audit and shell classification | `RM-01` | `runtime/`, `knowledge/`, import record |
| 3 | RT-02 | Runtime and knowledge manifests | `RT-01`, `RM-11` | runtime/knowledge manifest contracts and validators |
| 5 | RT-03 | Packaged runtime and distribution staging | `RT-02`, `RT-08`–`RT-10`, `DB-01` | dist configuration and packaged aggregate validation |
| 4 | RT-04 | Immutable data-root catalog and staging | `RT-02`, `RM-03` | runtime catalog foundation |
| 6 | RT-05 | `LaneTaskRunner` and leaf invocation adapter | `RT-03`, `RT-04`, `RT-09` | task/runtime adapters foundation |
| 7 | RT-06 | Managed lane links, task profiles, and compatibility names | `RT-04`, `RT-05` | managed-asset/task-profile foundation |
| 8 | RT-07 | Packaged watcher and task-runtime smoke proof | `RT-03`, `RT-05`, `RT-06` | integration fixtures |
| 2 | RT-08 | Nirvana dependency closure and isolated install harness (✅ accepted) | `RM-01` | exact dependency manifest, packed-artifact fixture, install verifier |
| 3 | RT-09 | Task catalog, lane profile, and aggregate contracts | `RT-01`, `RM-11` | capability fragments, aggregate generator, catalog/profile contracts |
| 4 | RT-10 | Baseline packaged TaskHandlers | `RT-09` | runtime validation/staging/smoke handlers only |

Only the implementation-map DAG controls readiness. ACCEPT_PACKS activates these contracts atomically; it does not accept product code.
