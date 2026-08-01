# Read model Tracker

Status: **Complete — 14/14 batches accepted**

| Batch | Capability | State | Acceptance proof |
|---|---|---|---|
| RM-01 | Contract kernel, error taxonomy, and source architecture gates | ✅ Accepted | Versioned IDs/types; exit-code mapping; exhaustive error fixtures; automated engineering-standard hard rejects |
| DB-01 | SQLite driver, packaging, and derived-store feasibility | ✅ Accepted | Node/NVB/dist/global install; parameterization; FK/integrity; busy/WAL/permissions; rebuild and semantic-root proof |
| RM-02 | Public JSON envelopes and schema validation | ✅ Accepted after correction 04 | Success/error envelopes; additive compatibility; no decorative JSON output; staged-schema and isolated-install proof |
| RM-03 | Canonical paths and workspace resolution | ✅ Accepted | Resolution precedence; symlink/case/path-escape fixtures; missing explicit workspace |
| RM-04 | Strict env and lane-state parsers | ✅ Accepted | Accepted scalar grammar; malicious shell corpus never executes; unknown-key preservation |
| RM-05 | Durable worker-event JSONL parser | ✅ Accepted after correction 02 | Role/event compatibility; malformed/partial-line handling; bounded latest lookup |
| RM-06 | Home-lane discovery and deterministic selection | ✅ Accepted after correction 01 | Descendant/lane-dir discovery; UUID/slug precedence; complete ambiguity matrix |
| RM-07 | Membership index and secondary-repository discovery | ✅ Accepted after correction 02 | Advisory validation; stale entries ignored/reported; reads never repair |
| RM-08 | Repository bindings and writable conflict inspection | ✅ Accepted after correction 03 | Canonical bindings; branch/worktree/access checks; claim overlap matrix |
| RM-09 | Tmux, watcher, heartbeat, and worker observations | ✅ Accepted | Qualified names; stale heartbeat; presence never treated as lifecycle authority |
| RM-10 | `list` and `config show` | ✅ Accepted after correction 01 | Human/JSON parity; ambiguity behavior; redaction; read-only proof |
| RM-11 | Repository NVB parent-chain composition | ✅ Accepted after correction 02 | Effective-task equivalence; duplicate/circular parent rejection; every hand-maintained registry within limit |
| RM-12 | `status` command and read-only integration | ✅ Accepted after correction 06 | Accepted-pack integrity, authoritative event filtering, closed status schema, real CLI and recursive read-only proof |
| RM-13 | Deterministic JSON Schema composition | ✅ Accepted after correction 02 | Duplicate `$defs`, unresolved `$ref`, root-conflict rejection; byte-identical regeneration |

RM-02 correction 04 was independently accepted by durable reviewer event
`20260801T025707Z-841894-7936` and integrated on `main` as `8aca263`.
