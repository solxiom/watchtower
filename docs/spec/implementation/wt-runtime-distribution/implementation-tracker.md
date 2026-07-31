# Runtime distribution Tracker

Status: **Synchronized remediation candidate**

| Batch | Capability | State | Acceptance proof |
|---|---|---|---|
| RT-01 | Canonical runtime/knowledge audit and shell classification | ❌ Pending | Source provenance; no omitted action/doc; every script classified as TaskHandler, leaf, temporary wrapper, or removal |
| RT-02 | Runtime and knowledge manifests | ❌ Pending | Every asset/checksum/mode/action represented; missing/extra/checksum/mode rejection |
| RT-03 | Packaged runtime and distribution staging | ❌ Pending | Required dist including SQLite closure; executable preservation; reproducible validation; no source-link fallback |
| RT-04 | Immutable data-root catalog and staging | ❌ Pending | XDG precedence; atomic first stage; two versions coexist; immutable version roots |
| RT-05 | `LaneTaskRunner` and leaf invocation adapter | ❌ Pending | Explicit pinned NVB target; allowlisted action→task map; typed events/results; argv-only leaves; environment/cwd/account/access validation; signal/exit forwarding; NVB API gap proof |
| RT-06 | Managed lane links, task profiles, and compatibility names | ❌ Pending | Manifest-only ownership; task catalog/profile pin; project `nvb.json` unchanged; link targets/checksums; collision/path-escape refusal |
| RT-07 | Packaged watcher and task-runtime smoke proof | ❌ Pending | Relocated package works; catalog/profile escape rejected; structured task result; wake stdout/signal behavior; worker accounts read but cannot write |
| RT-08 | Nirvana dependency closure and isolated install harness | ✅ Accepted | Complete transitive closure; fresh-prefix install; no wildcard, E404, local path, or source/ecosystem symlink |
| RT-09 | Task catalog, lane profile, and aggregate contracts | ❌ Pending | Duplicate/dangling/stale rejection; profile cannot add code/tasks; deterministic aggregate |
| RT-10 | Baseline packaged TaskHandlers | ❌ Pending | Public TaskHandler API; schema-valid input/result/events; no product policy or future capability stubs |

RM-02 has no pending human dependency-source decision. It resumes in its preserved lineage only after ACCEPT_PACKS activation, accepted RM-13 and RT-08, and explicit worktree synchronization.
