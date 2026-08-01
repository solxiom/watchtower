# Read model Tracker

Status: **Synchronized remediation candidate**

| Batch | Capability | State | Acceptance proof |
|---|---|---|---|
| RM-01 | Contract kernel, error taxonomy, and source architecture gates | ✅ Accepted | Versioned IDs/types; exit-code mapping; exhaustive error fixtures; automated engineering-standard hard rejects |
| DB-01 | SQLite driver, packaging, and derived-store feasibility | ✅ Accepted | Node/NVB/dist/global install; parameterization; FK/integrity; busy/WAL/permissions; rebuild and semantic-root proof |
| RM-02 | Public JSON envelopes and schema validation | ⏳ Correction 04 awaiting re-review | Success/error envelopes; additive compatibility; no decorative JSON output; staged-schema and isolated-install proof |
| RM-03 | Canonical paths and workspace resolution | ⏳ Admitted line | Resolution precedence; symlink/case/path-escape fixtures; missing explicit workspace |
| RM-04 | Strict env and lane-state parsers | ⏳ Admitted line | Accepted scalar grammar; malicious shell corpus never executes; unknown-key preservation |
| RM-05 | Durable worker-event JSONL parser | ⏳ Admitted line | Role/event compatibility; malformed/partial-line handling; bounded latest lookup |
| RM-06 | Home-lane discovery and deterministic selection | ⏳ Correction 01 handoff | Descendant/lane-dir discovery; UUID/slug precedence; complete ambiguity matrix |
| RM-07 | Membership index and secondary-repository discovery | ✅ Accepted after correction 02 | Advisory validation; stale entries ignored/reported; reads never repair |
| RM-08 | Repository bindings and writable conflict inspection | ✅ Accepted after correction 03 | Canonical bindings; branch/worktree/access checks; claim overlap matrix |
| RM-09 | Tmux, watcher, heartbeat, and worker observations | ⏳ Handoff ready | Qualified names; stale heartbeat; presence never treated as lifecycle authority |
| RM-10 | `list` and `config show` | ❌ Pending | Human/JSON parity; ambiguity behavior; redaction; read-only proof |
| RM-11 | Repository NVB parent-chain composition | ⏳ Correction 02 handoff ready | Effective-task equivalence; duplicate/circular parent rejection; every hand-maintained registry within limit |
| RM-12 | `status` command and read-only integration | ❌ Pending | Stable status schema; complete health/warning matrix; full read-only hash proof |
| RM-13 | Deterministic JSON Schema composition | ✅ Accepted after correction 02 | Duplicate `$defs`, unresolved `$ref`, root-conflict rejection; byte-identical regeneration |

RM-02 correction 04 preserves accepted RM-13/RT-08 staging and closure surfaces, rejects non-enumerable JSON object properties, and awaits independent re-review.
