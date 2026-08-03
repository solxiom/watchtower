# Runtime distribution Tracker

Status: **Active — RT-05 accepted; RT-01–RT-04, RT-08–RT-10 accepted**

| Batch | Capability | State | Acceptance proof |
|---|---|---|---|
| RT-01 | Canonical runtime/knowledge audit and shell classification | ✅ Accepted | Source provenance; no omitted action/doc; every script classified as TaskHandler, leaf, temporary wrapper, or removal |
| RT-02 | Runtime and knowledge manifests | ✅ Accepted | Every asset/checksum/mode/action represented; missing/extra/checksum/mode rejection |
| RT-03 | Packaged runtime and distribution staging | ✅ Accepted | Required dist including SQLite closure; executable preservation; reproducible validation; no source-link fallback |
| RT-04 | Immutable data-root catalog and staging | ✅ Accepted | XDG precedence; ancestor-contained data root; exclusive crash-durable publication finalization; observable token-owned lock release; immutable version roots |
| RT-05 | `LaneTaskRunner` and leaf invocation adapter | ✅ Accepted | Explicit pinned NVB target; allowlisted action→task map; typed events/results; argv-only leaves; environment/cwd/account/access validation; signal/exit forwarding; NVB API gap proof |
| RT-06 | Managed lane links, task profiles, and compatibility names | ✅ Accepted | Manifest-only ownership; task catalog/profile pin; project `nvb.json` unchanged; link targets/checksums; collision/path-escape refusal |
| RT-07 | Packaged watcher and task-runtime smoke proof | ✅ Accepted | Relocated package works; catalog/profile escape rejected; structured task result; wake stdout/signal behavior; worker accounts read but cannot write |
| RT-08 | Nirvana dependency closure and isolated install harness | ✅ Accepted | Complete transitive closure; fresh-prefix install; no wildcard, E404, local path, or source/ecosystem symlink |
| RT-09 | Task catalog, lane profile, and aggregate contracts | ✅ Accepted | Duplicate/dangling/stale rejection; profile cannot add code/tasks; deterministic aggregate; Git-materialized executable source stages to sealed packaged leaf |
| RT-10 | Baseline packaged TaskHandlers | ✅ Accepted | Public TaskHandler API; schema-valid input/result/events; no product policy or future capability stubs |

RM-02 has no pending human dependency-source decision. It resumes in its preserved lineage only after ACCEPT_PACKS activation, accepted RM-13 and RT-08, and explicit worktree synchronization.

RT-06 Correction 02 raised two cross-batch scope questions (the `install.json.taskRuntime` writer boundary against `wt-lane-lifecycle` LC-03, and compatibility-name production-data scope) that an implementer proposal alone could not resolve. Both are now resolved by operator-authorized amendment: [`RT-06-specification-resolution-amendment.md`](RT-06-specification-resolution-amendment.md).
