# Lane lifecycle Tracker

Status: **Synchronized remediation candidate**

| Batch | Capability | State | Acceptance proof |
|---|---|---|---|
| LC-01 | Init argument resolution and preflight plan | ✅ Accepted | Exact syntax; no destination creation in preview; prefix/scope/routing validation |
| LC-02 | Pack acceptance, seal, and drift validation | ✅ Accepted | JSON Schema; RFC 8785 seal reproduction; Git/file-set/drift reason matrix |
| LC-03 | Transactional lane layout and manifests | ✅ Accepted | Adjacent staging; atomic commit point; failure at every write/fsync/rename stage |
| LC-04 | Bindings, Git-ignore, and membership registration | ✅ Accepted | Lock order; conditional Git-ignore rollback; post-commit idempotent registration |
| LC-05 | Coordinator and session policy baselines | ✅ Accepted | Finite policies; installed-knowledge provenance; no Markdown restatement or model |
| LC-06 | Foreground `watch` command | ❌ Pending | Preflight; exec behavior; stdout and Ctrl-C compatibility; no daemonization |
| LC-07 | Doctor kernel and lane-local checks | ❌ Pending | Pass/warn/fail/skip; marker/config/binding/permission/Git-ignore checks; read-only |
| LC-08 | Lifecycle integration and scaffold removal | ❌ Pending | Init→status→watch/doctor fixture; rollback proof; remove all hello artifacts safely |
| LC-09 | Initial sealed pack-index activation | ❌ Pending | Seal-bound compile/verify/atomic activation; no duplicate compiler or JSON authority |
| LC-10 | Runtime, account, watcher, and index doctor providers | ❌ Pending | Tool/account/runtime/index checks; exact pass/fail/skip; no global registry or repair |

RM-02 has no pending human dependency-source decision. It resumes in its preserved lineage only after ACCEPT_PACKS activation, accepted RM-13 and RT-08, and explicit worktree synchronization.
