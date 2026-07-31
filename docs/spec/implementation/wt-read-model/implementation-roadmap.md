# Watchtower v1 Read Model Implementation Roadmap

> **Accepted bootstrap implementation artifact.** Dispatch is authorized only under the
> accepted dependency DAG and paired independent batch-review gates. Product-created
> lanes remain subject to the structured pack acceptance and seal contract in
> `docs/spec/v1-contracts.md`.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: ⏳ Awaiting implementation (M1 — Read-only discovery, inspection, and stable output)
Date: 2026-07-30
Owner areas: `src/contracts/`, `src/foundation/`, `src/commands/`, `help/commands/`

Parent documents:

- `docs/spec/v1.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/implementation/wt-read-model/README.md`

## Mission

Establish all pure/read-only contracts, storage feasibility, parsers, discovery
infrastructure, and observation services before any workspace mutation begins.
From any relevant repository location, the CLI can identify, select, and
describe managed lanes without changing any byte. A conforming embedded SQLite
driver is selected, proven, and wrapped in a typed storage abstraction capsule
with rebuild guarantees.

The delivery must guarantee:

- versioned domain types with exhaustive error fixtures and exit-code mappings
- a proven SQLite driver with typed storage abstraction, parameterized queries,
  FK enforcement, WAL mode, busy-timeout, rebuild semantics, semantic-root
  reproduction, and global install proof; an ADR documenting the decision
- success/error JSON envelopes with additive compatibility and schema validation
- resolution precedence and symlink/case/path-escape safety for all path operations
- strict non-executing env and lane-state parsers that reject malicious input
- durable worker-event JSONL validation with malformation handling
- deterministic lane discovery with complete ambiguity matrices
- advisory membership-index validation with stale-entry detection
- canonical repository bindings with writable conflict inspection
- tmux, watcher, heartbeat, and worker presence observations
- three read-only commands with human/JSON parity, redaction, and stable status schema

## Non-Negotiable Delivery Rules

- Keep product logic out of `src/cli.ts` and `src/run.ts`.
- Commands delegate to foundation services; no duplicated discovery, parsing, or
  path logic in command classes.
- Foundation modules own one concern each; no god objects or generic helper bags.
- Read-only commands perform zero hidden writes or repairs.
- Only `src/contracts/` owns shared types; foundation modules define private
  types only where strictly internal.
- Path/config/untrusted-input boundaries fail closed.
- No shell evaluation of lane config or state by TypeScript.
- Do not commit `.local/` artifacts.
- Keep the JSON schema bundle synchronized with the public envelope contract.
- Help fragments match command behavior exactly; no undocumented flags.

## Implementation-Phase Decision Clarifications

The main specs leave some details intentionally open.

For this implementation lane, use the following clarifications so batch work
and review remain aligned:

- exit codes are stable versioned constants (1-5) with uppercase error codes;
  no dynamic or range-based exit codes
- JSON output is machine-parseable first: exactly one value on stdout, no
  decorations; `commandResult.data` uses the schema-specific type
- serializers type-check against contracts but do not define structural shapes
- path resolution uses `realpath` eagerly; missing explicit workspace is an
  error; no implicit directory creation during reads
- env parsers accept blank lines, comments, and `KEY=value` with quoted/unquoted
  scalar values; no shell operators or command substitution
- state parsers normalize known keys, preserve unknown keys, and never repair
  contradictory state
- JSONL parsers validate each record; unknown types are warnings; partial
  lines are skipped with diagnostics; bounded latest-N lookup returns only the
  N most recent valid records
- lane discovery uses the exhaustive v1.md §9.3 precedence; ambiguity fails with
  candidate listing; no interactive picker
- membership-index reads are advisory; stale entries are ignored and reported;
  reads never repair
- bindings compute canonical shapes without mutation; claim overlap is detected
  and reported; reads never reorder or normalize bindings

## Delivery Phases

### Phase 1: Contract, Storage Feasibility, and Parse Foundations

Goal:

- establish all versioned types, errors, proven storage substrate, and
  serialization before any filesystem or runtime discovery begins

Batches:

- RM-01 — Contract kernel and error taxonomy (✅ accepted)
- DB-01 — SQLite driver, packaging, and derived-store feasibility (✅ accepted after correction 04; strict lock/sentinel validation and all preserved storage proofs independently passed)
- RM-02 — Public JSON envelopes and schema validation
- RM-03 — Canonical paths and workspace resolution
- RM-04 — Strict env and lane-state parsers
- RM-05 — Durable worker-event JSONL parser

Status: ⏳

Acceptance snapshot (target):

- every error code maps to exit codes 1-5 through verifiable fixtures
- one conforming SQLite driver selected, proven in global install context, and
  wrapped in `src/foundation/storage/` with typed abstraction; ADR documents
  the choice and no-JSON-shard-fallback rule; feasibility fixtures prove FK
  enforcement, WAL mode, busy-timeout, permissions, integrity, corruption
  detection, staged rebuild, semantic-root reproduction, and crash safety
- `commandResult` and `commandError` envelopes validate against the schema bundle
- path resolution handles WATCHTOWER_DATA_HOME, XDG fallback, control-home,
  and lane-directory construction with symlink/case/path-escape safety
- env parser rejects a 30+ fixture malicious-shell corpus with line-number
  diagnostics while preserving unknown keys
- state parser normalizes known lifecycle fields, preserves unknown keys,
  and reports contradictory state as `unknown`/`invalid`
- JSONL parser validates every record against the durable event schema,
  handles malformed/partial lines, and provides bounded latest-N lookup
- bounded latest-10 and latest-100 lookup functions produce stable output

### Phase 2: Discovery and Membership

Goal:

- implement deterministic lane discovery and validated membership-index
  lookup before command integration

Batches:

- RM-06 — Home-lane discovery and deterministic selection
- RM-07 — Membership index and secondary-repository discovery
- RM-08 — Repository bindings and writable conflict inspection

Status: ⏳

Acceptance snapshot (target):

- home-lane discovery walks up from cwd through parent directories,
  inspects only `.watchtower/lanes/*/lane.json`, and ignores
  non-Watchtower directories
- lane selection by UUID exact match, slug match among relevant lanes,
  cwd-descendant deduction, single-lane deduction, and full ambiguity
  error with candidate listing
- complete ambiguity matrix: zero lanes, single lane, multiple lanes,
  invalid lane.json, missing schemaVersion
- membership index validates canonical paths, resolves to valid lane.json,
  reports stale entries without repair
- secondary discovery from participating repositories through the validated
  membership index
- canonical bindings compute branch, worktree mode, and access from
  `repositories.local.json` and filesystem state
- claim overlap matrix detects shared-write, path-conflict, and
  branch-conflict conditions
- dedicated worktrees are the default; shared-write is an explicit override

### Phase 3: Observations and Command Integration

Goal:

- surface lane state through qualified-name observations and three read-only
  commands with full human/JSON parity

Batches:

- RM-09 — Tmux, watcher, heartbeat, and worker observations
- RM-10 — `list`, `config show`, and `status` commands

Status: ⏳

Acceptance snapshot (target):

- tmux presence reading provides qualified session names and pane metadata
- heartbeat detection classifies fresh, stale, and absent watcher states
- worker observations surface the latest valid durable event per role
- no observation implies lifecycle authority or triggers state mutation
- `wt list` produces human and JSON array output including the empty-array case
- `wt config show` resolves all lane identity and path sources with key-based
  redaction (`TOKEN`, `SECRET`, `PASSWORD`, `KEY`, `CREDENTIAL`)
- `wt status` produces the stable `laneStatus` schema with derived health
  (`ok`, `attention`, `complete`, `invalid`)
- all three commands pass empty, single-lane, ambiguous, invalid,
  multi-repository, stale-index, and busy-lock fixture proofs
- full read-only hash proof: no byte written to any lane directory during
  any read-only command

## Sequencing Rule

- RM-01 must be accepted first; all other batches consume its types and errors.
- DB-01 depends on RM-01 accepted; it gates the derived-store path. Failure
  requires a spec amendment; there is no JSON-shard fallback.
- RM-02 depends on RM-01 accepted.
- RM-03, RM-04, and RM-05 may proceed in parallel after RM-01 accepted.
- RM-06 depends on RM-03 and RM-04 accepted.
- RM-07 depends on RM-03 and RM-06 accepted.
- RM-08 depends on RM-03 and RM-07 accepted.
- RM-09 depends on RM-04 and RM-05 accepted.
- RM-10 depends on RM-02 and RM-06 through RM-09 accepted.
- No command integration (RM-10) may begin before all foundation services
  are accepted.

## Recommended Honest Execution Order

1. establish the error taxonomy, exit-code mappings, and domain types (RM-01)
2. select and prove the SQLite driver, build storage abstraction capsule, write ADR (DB-01)
3. build the JSON envelope serializer and schema validator (RM-02)
4. implement canonical path resolution, workspace discovery, and XDG (RM-03)
5. implement strict non-executing env and state parsers (RM-04)
6. implement validated JSONL event parser with bounded lookup (RM-05)
7. implement home-lane discovery and deterministic selection (RM-06)
8. implement membership-index validation and secondary discovery (RM-07)
9. implement canonical bindings and writable conflict inspection (RM-08)
10. implement tmux, watcher, heartbeat, and worker observations (RM-09)
11. implement `list`, `config show`, and `status` commands (RM-10)

## Rejected Shortcut

This roadmap rejects:

- a "code first, docs later if we remember" posture
- implementing commands before the contracts, parsers, and discovery foundation
- implementing mutating commands before the read model is accepted
- combining multiple foundation concerns into one "utils" or "helpers" module
- deferring adversarial input testing to a later pack
- treating JSON output as a cosmetic wrapper over human output
- using shell evaluation (`source`, `sh -c`, `exec`) for config or state parsing
- allowing commands to bypass foundation services for path or discovery logic
- marking discovery as working without proving the complete ambiguity matrix
- shipping help fragments without matching command behavior
