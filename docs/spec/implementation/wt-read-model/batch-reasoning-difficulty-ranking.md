# Watchtower v1 Read Model Batch Reasoning-Difficulty Ranking

Status: implementation-planning aid
Date: 2026-07-30
Scope: reasoning difficulty across the ten wt-read-model work batches

## Purpose

This document ranks the eleven wt-read-model batches from hardest to easiest in
terms of agent reasoning requirements.

It is an agent-assignment and supervision guide. It does not replace:

- the required implementation order
- dependency gates
- work briefs
- paired review briefs
- proof requirements
- the batch-specific `R3`, `R4`, or `R5` reasoning requirement

"Easiest" in this ranking means easiest relative to the other wt-read-model
batches. The observation batch (RM-09) is `R3` because presence reading has no
lifecycle authority, but it still requires cross-module integration reasoning.

## Reasoning-Level Scale Used By This Pack

This pack follows the reasoning vocabulary already used elsewhere in the
repository:

| Level | Meaning in this lane |
|-------|----------------------|
| `R3` | Bounded module reasoning with explicit owners, limited state interaction, and focused proof. Used where the algorithm is straightforward but correctness across module boundaries matters. |
| `R4` | Deep repository reasoning: cross-file contracts, public compatibility, ownership-boundary decisions, negative-path design, and independent source verification. Used for type systems, JSON contracts, parsers with security boundaries, and conflict detection. |
| `R5` | Highest available reasoning: interacting state machines, complete ambiguity matrices, selection precedence across multiple resolution paths, multi-command integration, and final evidence/closure authority. Used where a wrong implementation silently produces incorrect selections or output. |

The level is a minimum assignment requirement. The numbered ranking then
distinguishes batches inside the same broad level.

## Important Distinction: Reasoning Difficulty Versus Workload

Reasoning difficulty and workload are not the same.

- `RM-10` is difficult because it integrates all nine foundation services into
  three commands with full human/JSON parity, redaction, a stable schema, and
  seven fixture-class proof matrices.
- `RM-06` is difficult because the ambiguity matrix must be exhaustive: zero
  lanes, single lane, multiple lanes with valid UUID, multiple lanes with
  ambiguous cwd, invalid lane.json, missing schemaVersion. Any missing case is
  a silent selection or crash.
- `RM-04` has a moderate workload but requires reasoning across a 30+ fixture
  malicious-shell corpus where one false acceptance means arbitrary execution.
- `RM-09` has a straightforward algorithm but must avoid implying lifecycle
  authority or triggering state mutations.

An agent should therefore not be selected only by expected file count or batch
duration.

## Ranking Criteria

The ranking weighs the following factors.

| Criterion | What increases difficulty |
|-----------|---------------------------|
| Ownership complexity | More foundation modules or independent construction paths must agree |
| Compatibility sensitivity | Small changes can alter downstream command behavior or public JSON shape |
| State and selection | Behavior depends on directory walking order, UUID/slug precedence, cwd context |
| Security-boundary complexity | The batch processes untrusted input (env files, JSONL, paths) where failure must be closed |
| Matrix completeness | Every cell in an ambiguity or compatibility matrix must be proven |
| Identity requirements | Lane IDs, slugs, repository IDs, and canonical paths must survive normalization |
| Ordering requirements | Resolution precedence, selection order, and event ordering are observable |
| Provenance requirements | Errors must identify the exact rejected key, field, line number, or path |
| Proof complexity | Acceptance requires multiple fixture classes, adversarial corpora, and cross-command integration |
| Cross-batch contract load | The batch consumes several earlier handoffs and must not reinterpret them |
| Algorithm novelty | The batch introduces a new owner/algorithm rather than forwarding or documenting prepared state |

## Hardest-To-Easiest Table

| Rank | Batch | Relative tier | Primary reasoning challenge | What makes it difficult | Main agent failure risk |
|------|-------|---------------|-----------------------------|-------------------------|-------------------------|
| 1 | RM-10 | `R5` | Integrating nine foundation services into three commands with full matrix proof | Must preserve human/JSON parity, redaction, stable schemas, and pass 7 fixture-class proofs (empty, single-lane, ambiguous, invalid, multi-repository, stale-index, busy-lock) across three commands; read-only hash proof requires zero bytes written | Writing command-local discovery logic, diverging human/JSON paths, skipping an ambiguity case, or adding a hidden write |
| 2 | DB-01 | `R5` | Technology selection and architectural feasibility gate with far-reaching implications | Must evaluate and select a conforming SQLite driver, build a typed storage abstraction, prove global install, FK enforcement, WAL mode, busy-timeout, permissions, integrity, corruption detection, staged rebuild, semantic-root reproduction, and crash safety; write an ADR documenting the decision and no-JSON-shard-fallback rule; failure blocks all derived-store batches and requires a spec amendment | Selecting a driver that fails global install, leaking raw SQL through the abstraction, skipping rebuild proof, or silently falling back to JSON shards |
| 3 | RM-06 | `R5` | Complete ambiguity matrix for deterministic lane discovery and selection | Walk-up discovery, UUID exact match, slug match among relevant lanes, cwd-descendant deduction, single-lane deduction, and exhaustive "no lanes / single lane / multiple lanes / invalid lane.json / missing schemaVersion" matrix; symlink and case safety during walk | Missing an ambiguity cell, silently selecting when ambiguous, or failing on valid single-lane cases |
| 4 | RM-04 | `R4` | Strict scalar grammar parsing with shell-safety proof across 30+ malicious fixtures | Must define and enforce the exact accepted grammar (blank lines, comments, KEY=value with quoted/unquoted scalars), reject every shell operator/command substitution/variable expansion/executable statement, provide line-number diagnostics, and preserve unknown keys | Accepting an injection through a quoting edge case, missing a grammar variant, or executing rather than scanning |
| 5 | RM-08 | `R4` | Canonical bindings with clause-overlap detection across multiple claim types | Must compute branch/worktree/access from `repositories.local.json` and filesystem state, detect shared-write/path-conflict/branch-conflict claims, classify dedicated vs shared worktrees, and handle missing/unreadable repositories | Reporting false conflicts, missing a claim-overlap class, misclassifying dedicated as shared worktrees |
| 6 | RM-05 | `R4` | Durable worker-event JSONL validation with failure handling across four malformation classes | Must validate role/event compatibility, handle malformed JSON, partial lines, unknown event types, and provide bounded latest-N lookup with stable ordering; JSONL fsync/append semantics must be respected | Silently dropping records on partial-line recovery, misclassifying unknown types as errors, or producing incorrect latest-N ordering |
| 7 | RM-02 | `R4` | JSON envelope serialization with schema validation and additive compatibility | Must produce `commandResult` and `commandError` envelopes that validate against v1.schema.json, guarantee no decorative text on stdout with `--json`, prove additive-field compatibility within schema version 1, and round-trip every variant | Emitting invalid JSON structures, leaking decorative text, or defining domain types in the serializer |
| 8 | RM-03 | `R4` | Path resolution with symlink/case/path-escape safety across four resolution paths | Must handle WATCHTOWER_DATA_HOME precedence, XDG fallback, explicit --workspace, git toplevel, and ancestor walk; reject `..`, symlink loops, null bytes, and control characters; treat missing explicit workspace as error | Forgetting one resolution path, accepting a path-escape through symlinks, or creating directories implicitly |
| 9 | RM-07 | `R4` | Advisory membership-index validation with staleness detection and no-repair proof | Must validate canonical paths, resolve to valid lane.json, detect stale entries (path removed, lane.json missing), report without repair, and handle missing/unreadable index files | Repairing stale entries implicitly, accepting invalid lane.json, or treating the index as authoritative |
| 10 | RM-01 | `R4` | Versioned domain types and error taxonomy with exhaustive fixture coverage | Must define every error code with exact exit-code mapping (1-5), produce exhaustive fixtures covering unknown/boundary/malformed cases, and establish types consumed by every later batch; wrong exit codes propagate to every command | Missing an error code, reusing an exit code, or leaving a boundary case unmapped |
| 11 | RM-09 | `R3` | Observation mechanics (tmux, heartbeat, worker) with no lifecycle authority | Must read qualified tmux names, detect stale heartbeats from configurable thresholds, surface worker events from parsed streams, and never write state files or advance cursors | Treating presence as lifecycle authority, writing state from observations, or inferring worker status from tmux prose |

## Recommended Agent Allocation

| Ranking band | Batches | Recommended posture |
|--------------|---------|---------------------|
| Rank 1 / `R5` | RM-10 | Use the strongest available integration/reasoning agent. Require a detailed pre-edit model of all foundation service contracts, the complete fixture matrix, and human/JSON parity guarantees. The reviewer should also meet the `R5` bar. |
| Rank 2 / `R5` | DB-01 | Use the strongest available architecture/reasoning agent. Require SQLite and Node native-binding expertise, ADR authorship, and end-to-end feasibility proof across driver selection, global install, integrity, rebuild, and crash safety. The reviewer should also meet the `R5` bar. This is a gating batch; failure to prove feasibility blocks all derived-store implementation. |
| Rank 3 / `R5` | RM-06 | Use a very strong discovery/safety agent and equivalent independent reviewer. Require a complete ambiguity matrix drawn from the spec before any code is written. |
| Ranks 4–10 / `R4` | RM-04, RM-08, RM-05, RM-02, RM-03, RM-07, RM-01 | Use a strong repo-aware foundation agent with demonstrated ownership, boundary, compatibility, and adversarial-input reasoning. Do not forward these as routine plumbing tasks. Security-boundary batches (RM-03, RM-04) require special caution. |
| Rank 11 / `R3` | RM-09 | Use a strong bounded-reasoning agent with tmux/process observation experience. The work introduces no new lifecycle authority but requires disciplined read-only proof. |

## Why The Levels Are Not One-To-One With Rank

The repository reasoning scale is intentionally coarse.

- Only RM-10, DB-01, and RM-06 reach `R5` because they require exhaustive matrix
  reasoning across multiple foundation services (RM-10), technology selection
  with architectural implications (DB-01), or multiple selection states (RM-06).
  A single missing cell or unproven criterion creates silent incorrect behavior
  or a broken architectural foundation.
- RM-04 through RM-08 and RM-01 through RM-03 remain `R4` because they each
  have one focused algorithm domain (parsing, binding, event validation,
  serialization, path resolution, membership, types) with a bounded output
  contract. Their difficulty is in the adversarial and boundary coverage, not
  in multi-service integration.
- RM-09 is correctly `R3`: it is presence observation with configurable
  thresholds and no lifecycle authority. The algorithm is straightforward;
  the primary risk is scope-creep into lifecycle decisions.

## Detailed Ranking Explanations

### 1. RM-10 — `list`, `config show`, and `status` Commands

RM-10 is the hardest batch because it is the integration point where every
foundation service meets the CLI boundary. It consumes:

- error taxonomy and exit codes from RM-01
- JSON serialization and schema validation from RM-02
- path/workspace resolution from RM-03
- env and state parsers from RM-04
- event parsing from RM-05
- lane discovery and selection from RM-06
- membership discovery from RM-07
- bindings and conflicts from RM-08
- observations and heartbeat from RM-09

The agent must preserve three command contracts, each with human and JSON output
parity, while passing a seven-class fixture matrix:

- empty (no lanes)
- single-lane (exactly one relevant lane)
- ambiguous (multiple lanes with no disambiguation)
- invalid (bad lane.json, missing schemaVersion)
- multi-repository (primary + secondary bindings)
- stale-index (stale membership entries)
- busy-lock (lock file present during read)

Any command-local reimplementation of foundation logic is a hard reject. The
read-only hash proof must demonstrate that zero bytes are written to any lane
directory during any of these commands.

### 2. DB-01 — SQLite Driver, Packaging, and Derived-Store Feasibility

DB-01 is ranked second because it is an architectural feasibility gate with
far-reaching implications. The chosen driver and storage abstraction shape
every derived index, projection, and session store across packs 5 and 6. A
wrong or unproven selection silently introduces packaging, integrity,
concurrency, or recoverability failures that propagate to CA-01, CA-02, CA-03,
CA-16, and REL-03.

The batch must:

- evaluate and select a conforming SQLite driver (`better-sqlite3` preferred
  per Nirvana ecosystem conventions)
- build a typed `src/foundation/storage/` capsule (`StorageAdapter`,
  `SqliteConfig`, `SqliteDriver`) with parameterized queries, FK enforcement,
  WAL mode, busy-timeout, and staged rebuild semantics
- write an ADR documenting the selection, failure model, platform constraints,
  and the no-JSON-shard-fallback rule
- prove feasibility across 10 proof categories: global install, FK enforcement,
  WAL mode, busy-timeout, permissions, integrity check, corruption detection,
  staged rebuild, semantic-root reproduction, and crash safety

The storage contract in `v1-contracts.md §8A` is detailed and non-negotiable.
The ADR must document explicit failure modes: what happens on corrupt database,
missing native binding, NFS/filesystem without proper locking, concurrent access
from a non-WAL store, and crash mid-write. Semantic-root reproduction requires
that two rebuilds from identical canonical sources produce identical logical
rows and semantic roots even when SQLite file bytes differ.

The primary failure risk is selecting a driver that fails global install,
leaking raw SQL through the abstraction, skipping rebuild proof, or silently
accepting a JSON-shard fallback. Any of these failures blocks all derived-store
implementation and requires a specification amendment.

### 3. RM-06 — Home-Lane Discovery And Deterministic Selection

RM-06 is the hardest single-foundation batch because its ambiguity matrix is
exhaustive. The selection precedence in v1.md §9.3 has no catch-all rule.
Every path through the matrix must be proven:

- explicit UUID match selects exactly one lane or fails with not-found
- explicit slug match selects among relevant lanes or fails with not-found
- cwd is inside a lane directory → that lane
- exactly one active relevant lane → that lane
- exactly one relevant lane → that lane
- zero lanes → not-found error
- multiple lanes with no deduction → ambiguity error with candidate listing
- invalid lane.json (missing required field, bad schemaVersion) → invalid error

The walk-up discovery must also handle symlinks correctly (resolving before
comparison) and ignore non-Watchtower directories. Directory entries without
`lane.json` are silently skipped.

### 4. RM-04 — Strict Env And Lane-State Parsers

RM-04 is the highest-security batch. The strict scalar grammar must be defined
precisely enough that a 30+ fixture malicious-shell corpus is rejected in every
case. The grammar accepts only:

- blank lines (whitespace-only or zero-length)
- comment lines starting with `#`
- `KEY=value` where value is unquoted (no special chars), single-quoted (no
  interpolation), or double-quoted (limited escape sequences)

Everything else must be rejected with a line-number diagnostic: command
substitution `$(...)` and backticks, variable expansion `${...}` and `$VAR`,
shell operators (`&&`, `||`, `|`, `;`, `&`, `<`, `>`, `>>`), unclosed quotes,
and non-scalar values.

The state parser additionally must normalize known keys into the status
projection while preserving unknown keys in a diagnostics map. Contradictory
state (e.g. `complete` + active batch) must produce `unknown`/`invalid` health.

### 5. RM-08 — Repository Bindings And Writable Conflict Inspection

RM-08 must compute canonical bindings from `repositories.local.json` and
current filesystem state. The claim-overlap matrix covers:

- shared-write: two active lanes claiming write access on the same worktree
  without explicit shared-write override
- path-conflict: two lanes claiming exclusive-write on overlapping paths
- branch-conflict: two lanes on the same repository but different branches
  sharing a writable worktree

Each conflict class must produce a diagnostic that identifies the conflicting
lanes, the repository, and the nature of the conflict. The batch must also
classify worktree modes (dedicated vs shared) and validate access modes
(read vs write) against lane claims.

### 6. RM-05 — Durable Worker-Event JSONL Parser

RM-05 must validate each JSONL record against the durable event schema
(`$defs.durableEvent`). Malformation handling covers:

- malformed JSON (parse failure) → skipped with line-number warning
- partial final line (no trailing newline, incomplete JSON) → skipped with
  corruption warning
- unknown event type → preserved in records with warning, does not affect
  projections
- role/event incompatibility → warning, does not affect other records

The bounded latest-N lookup must return only the N most recent valid records
in stable order. The parser must handle empty files, files with only
malformed records, and very large files efficiently.

### 7. RM-02 — Public JSON Envelopes And Schema Validation

RM-02 defines the serializer used by every later command. The `commandResult`
and `commandError` envelopes must validate against the schema bundle. The
serializer must guarantee:

- exactly one JSON value on stdout with `--json`
- no decorative text, ANSI, emojis, or progress indicators
- additive-field compatibility within schema version 1 (new optional fields OK,
  removed or retyped fields not OK)
- round-trip serialization of every variant (success, error, page, mutation)

The serializer type-checks against contracts but does not define structural
shapes. Wrong-shaped output is a serializer panic.

### 8. RM-03 — Canonical Paths And Workspace Resolution

RM-03 must handle four resolution paths with consistent precedence:

1. `WATCHTOWER_DATA_HOME` environment variable (if set and valid)
2. XDG data home (`XDG_DATA_HOME` or `~/.local/share`)
3. control-home via `--workspace`, git toplevel, or ancestor walk
4. current directory as last-resort workspace

Path-escape rejection must cover symlink loops, `..` segments, null bytes,
and control characters. Every resolved path must pass through `realpath`
before comparison. Missing explicit workspace (`--workspace` pointing to
a nonexistent directory) is an error, not an implicit create.

### 9. RM-07 — Membership Index And Secondary-Repository Discovery

RM-07 validates the advisory user-local membership index at
`<watchtower-data-root>/index/repository-memberships.json`. Each entry maps
a canonical worktree path to `{laneId, laneHome}` references. Validation covers:

- the index file is present and parseable
- each entry path is canonicalized and exists
- each entry's referenced lane home resolves to a valid `lane.json`
- each lane.json contains a binding matching the canonical path

Stale entries (path removed, lane.json missing, binding mismatch) are detected
and reported as warnings. Reads never repair the index. A missing index file
is not an error; secondary discovery simply returns no lanes.

### 10. RM-01 — Contract Kernel And Error Taxonomy

RM-01 is the type foundation. It is ranked lower than the other R4 batches
because it has no filesystem interaction, no security boundary, and no
selection logic. However, it is foundational: every error code and exit-code
mapping defined here propagates to every later batch and command.

The error taxonomy must define stable uppercase codes (e.g., `ERR_LANE_NOT_FOUND`,
`ERR_AMBIGUOUS_SELECTION`, `ERR_INVALID_LANE_CONFIG`) each mapped to exactly
one exit code (1-5). Exhaustive fixtures prove every code with valid, boundary,
and malformed inputs.

### 11. RM-09 — Tmux, Watcher, Heartbeat, And Worker Observations

RM-09 is the easiest batch because it reads presence without claiming authority.
The algorithm is straightforward:

- read tmux session names via `tmux list-sessions -F '#{session_name}'`
- read heartbeat files and compare timestamps against a configurable threshold
- surface the latest valid worker event per role from the parsed event stream

Every observation function must be read-only. No heartbeat file is written, no
tmux session is created or killed, and no event cursor is advanced. The
primary risk is scope-creep: the agent must not infer lifecycle status, worker
health, or automation decisions from presence observations.

## Assignment Rules

### Do not use this ranking as an implementation order

Implementation remains:

```text
RM-01 → DB-01 / RM-02 / RM-03 / RM-04 / RM-05 (parallel) → RM-06
  → RM-07 → RM-08 → RM-09 → RM-10
```

The rank measures reasoning difficulty only.

### Match the reviewer to the declared level

Use:

- an `R5` reviewer for DB-01, RM-06, and RM-10
- an `R4` reviewer for every `R4` foundation batch
- an `R3` reviewer for RM-09

The `R3` classification for RM-09 reduces algorithm-design demand; it does not
permit skipped proof, stale status, or acceptance from implementation-report
prose alone.

### Escalate when a batch crosses its declared boundary

Stop and re-review if an implementation agent discovers that:

- a lower-ranked batch must change an earlier accepted contract
- a foundation module requires cross-module coordination beyond its brief scope
- an observation batch introduces lifecycle authority
- a command batch adds a hidden write
- an earlier handoff does not provide the promised input/output contract
- proof cannot observe the acceptance claim through the real filesystem or tmux

Those conditions change the reasoning problem and invalidate the original
ranking assumptions for that implementation.
