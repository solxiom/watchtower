# Watchtower v1 Read Model Implementation Lane

Status: ⏳ Awaiting implementation (M1 — Read-only discovery, inspection, and stable output)
Date: 2026-07-30
Owner areas: `src/contracts/`, `src/foundation/`, `src/commands/`, `help/commands/`

## Purpose

This implementation directory is the execution owner for the Watchtower v1 read
model delivery pack — the first of six independently accepted implementation
packs. It establishes all pure/read-only contracts before any workspace mutation
begins.

It exists to keep the read-model effort disciplined across:

- versioned domain types, error taxonomy, and exit-code mappings
- SQLite driver selection, storage abstraction capsule, and derived-store feasibility proof
- public JSON envelopes and schema validation
- canonical path, workspace, and XDG data-home resolution
- strict env and lane-state parsers with shell-safety guarantees
- durable worker-event JSONL parsing with malformation handling
- home-lane discovery, deterministic selection, and complete ambiguity matrices
- membership-index and secondary-repository discovery
- repository bindings and writable conflict inspection
- tmux, watcher, heartbeat, and worker observations
- read-only commands (`list`, `config show`, `status`) with human/JSON parity

## Start Here

Read in this order:

1. `AGENTS.md`
2. `docs/spec/v1.md`
3. `docs/spec/v1-contracts.md`
4. `docs/spec/architecture.md`
5. `docs/spec/v1-implementation-map.md` (sections 3, 4, 10-14)
6. `implementation-roadmap.md`
7. `implementation-tracker.md`
8. `implementation-quality-and-agent-rules.md`
9. `work-batches/00-work-batch-index.md`
10. `review-batches/00-review-batch-index.md`

Then read the specific paired work/review batch brief, the agent launch prompt,
and the real source owners you will inspect or change.

## Prompt-Pack Maturity Guarantees

The 11 implementation batches and 11 paired review batches have a common
execution floor. Every durable brief and launch prompt must preserve, in
addition to its batch-specific scope:

- the declared reasoning class and capability-based agent selection rule
- source-first dependency and ownership mapping before edits or acceptance
- explicit negative-path, compatibility, concurrency, and unsupported-state
  reasoning appropriate to the batch
- clean-code and module-size gates that reject ball-of-mud growth, god objects,
  giant coordinators, generic helper bags, and unjustified oversized modules
- exact focused, regression, architecture, real-engine, and failure-injection
  evidence required by the governing acceptance cases
- protected user/ownership instructions in operator launch prompts
- tracker, roadmap, local-report, correction, handoff, and commit authority
  instructions sufficient for an agent receiving the prompt without prior chat
  context

The common rules are additive. Batch-specific details remain mandatory even
when a shared rule covers the same topic. Prompt maintainers may expand these
artifacts, but must not shorten a safety section into a link or summary. Wrong
claims and broken paths must be replaced with equally detailed or more detailed
correct instructions.

The authoritative reasoning-class matrix, source-size bands, absolute 400-line
ceiling, responsibility gates, and prompt-integrity policy live in
`implementation-quality-and-agent-rules.md`. A batch prompt that conflicts with
that file must be corrected before the batch starts.

## Batch Artifact Authority

The normative product specification in `docs/spec/v1.md` and the contract
closure in `docs/spec/v1-contracts.md` remain the authoritative scope documents.
The work and review briefs in this directory are the executable contracts for
implementation and acceptance agents.

| Batch | Phase | Work brief | Review brief | Current status |
|-------|-------|------------|-------------|----------------|
| RM-01 | Contract foundation | [work](work-batches/RM-01-contract-kernel-and-error-taxonomy.md) | [review](review-batches/RM-01-review-contract-kernel-and-error-taxonomy.md) | ⏳ Awaiting implementation |
| DB-01 | Storage feasibility | [work](work-batches/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md) | [review](review-batches/DB-01-review-sqlite-driver-packaging-and-derived-store-feasibility.md) | ⏳ Awaiting implementation |
| RM-02 | Contract foundation | [work](work-batches/RM-02-json-envelopes-and-schema-validation.md) | [review](review-batches/RM-02-review-json-envelopes-and-schema-validation.md) | ⏳ Awaiting implementation |
| RM-03 | Path resolution | [work](work-batches/RM-03-canonical-paths-and-workspace-resolution.md) | [review](review-batches/RM-03-review-canonical-paths-and-workspace-resolution.md) | ⏳ Awaiting implementation |
| RM-04 | Parser foundation | [work](work-batches/RM-04-strict-env-and-lane-state-parsers.md) | [review](review-batches/RM-04-review-strict-env-and-lane-state-parsers.md) | ⏳ Awaiting implementation |
| RM-05 | Event contracts | [work](work-batches/RM-05-durable-worker-event-jsonl-parser.md) | [review](review-batches/RM-05-review-durable-worker-event-jsonl-parser.md) | ⏳ Awaiting implementation |
| RM-06 | Discovery | [work](work-batches/RM-06-home-lane-discovery-and-selection.md) | [review](review-batches/RM-06-review-home-lane-discovery-and-selection.md) | ⏳ Awaiting implementation |
| RM-07 | Membership | [work](work-batches/RM-07-membership-index-and-secondary-discovery.md) | [review](review-batches/RM-07-review-membership-index-and-secondary-discovery.md) | ⏳ Awaiting implementation |
| RM-08 | Bindings | [work](work-batches/RM-08-repository-bindings-and-conflict-inspection.md) | [review](review-batches/RM-08-review-repository-bindings-and-conflict-inspection.md) | ⏳ Awaiting implementation |
| RM-09 | Observations | [work](work-batches/RM-09-tmux-watcher-heartbeat-and-worker-observations.md) | [review](review-batches/RM-09-review-tmux-watcher-heartbeat-and-worker-observations.md) | ⏳ Awaiting implementation |
| RM-10 | Commands | [work](work-batches/RM-10-list-config-show-and-status-commands.md) | [review](review-batches/RM-10-review-list-config-show-and-status-commands.md) | ⏳ Awaiting implementation |

The executable implementation contract for each batch is the complete set of:

1. the canonical work brief;
2. its paired implementation agent launch prompt;
3. the governing specifications;
4. the lane quality rules; and
5. accepted outcomes and handoffs from prerequisite batches.

The executable review contract for each batch is the complete set of:

1. the canonical review brief;
2. its paired review agent launch prompt;
3. the paired work contract above;
4. the implementation report and real changed source; and
5. the governing specifications and quality rules.

## Mission

From any relevant repository location, the CLI can identify, select, and
describe managed lanes without changing any byte. A conforming embedded SQLite
driver is selected, proven, and wrapped in a typed storage abstraction capsule
with rebuild guarantees. All contracts, parsers, discovery, and observation
infrastructure must be in place and accepted before any mutating command may be
implemented.

The accepted delivery must guarantee:

- versioned domain types with exhaustive error fixtures and exit-code mappings
  consumed by every later batch
- a proven SQLite driver (`better-sqlite3`) with typed storage abstraction,
  parameterized queries, FK enforcement, WAL mode, busy-timeout, rebuild
  semantics, semantic-root reproduction, and global install proof; an ADR
  documenting the selection, failure model, and no-JSON-shard-fallback rule
- success/error JSON envelopes with additive compatibility and no decorative
  JSON output
- resolution precedence and symlink/case/path-escape safety for
  `WATCHTOWER_DATA_HOME`, control homes, and lane directories
- strict non-executing env and lane-state parsers that reject malicious shell
  input while preserving unknown keys
- durable worker-event JSONL validation with role/event compatibility checks,
  malformed/partial-line handling, and bounded latest-N lookup
- deterministic lane discovery from control-home descendants, lane directories,
  and registered participating repositories with a complete ambiguity matrix
- advisory user-local membership-index validation with stale-entry detection and
  no implicit repair
- canonical repository bindings with branch/worktree/access verification and
  writable claim-overlap detection
- qualified-name tmux reading, stale heartbeat detection, and presence
  observation that never implies lifecycle authority
- three read-only commands (`list`, `config show`, `status`) with human/JSON
  parity, redaction, stable status schema, and full read-only hash proof

## Canonical Lane Rules

- `src/contracts/` owns the versioned domain type vocabulary, error taxonomy,
  event contracts, and shared schemas; no runtime or filesystem logic lives here
- `src/foundation/` owns paths, discovery, parsers, serializers, memberships,
  bindings, conflicts, and observations; commands delegate to foundation services
  rather than reimplementing them
- `src/commands/` owns argument validation, user-facing orchestration, and
  rendering for each command; it contains no duplicate discovery, config parsing,
  or shell spawning logic
- `src/cli.ts` and `src/run.ts` remain thin hosts with no product behavior or
  lane mutation
- `help/commands/` owns the static help fragments; every command must keep help
  and code consistent
- `.local/` reports are required working artifacts but never committed
- `implementation-quality-and-agent-rules.md` is a hard acceptance gate, not
  advisory background

## Lane Owner Map

This lane should be read with an explicit owner map in mind.

### Contract owners

- `src/contracts/types.ts` — domain types, lane references, repository bindings,
  workspace context, status shapes
- `src/contracts/errors.ts` — error taxonomy with exit-code mappings and
  exhaustive fixtures
- `src/contracts/exit-codes.ts` — exit-code constants and mapping utilities
- `src/contracts/events.ts` — durable worker-event types, role/event vocabulary
- `src/contracts/index.ts` — public barrel exporting all stable types

### Storage owners

- `src/foundation/storage/StorageAdapter.ts` — typed storage abstraction interface
- `src/foundation/storage/SqliteConfig.ts` — typed configuration capsule with shipping defaults
- `src/foundation/storage/SqliteDriver.ts` — concrete `better-sqlite3` wrapper
- `docs/spec/decisions/sqlite-driver-selection.md` — architectural decision record
- `spec/storage/feasibility.spec.ts` — storage feasibility and proof fixtures

### Serialization and rendering owners

- `src/foundation/serializer.ts` — JSON envelope construction, schema validation,
  success/error rendering
- `src/foundation/result-renderer.ts` — human/JSON parity rendering, redaction,
  no decorative output

### Path and workspace owners

- `src/foundation/paths.ts` — canonical path resolution, symlink/case safety,
  path-escape rejection
- `src/foundation/workspace.ts` — workspace resolution, control-home discovery,
  repository/worktree identification
- `src/foundation/xdg.ts` — XDG data-home resolution, `WATCHTOWER_DATA_HOME`
  precedence

### Parser owners

- `src/foundation/parsers.ts` — shared parser utilities and validation primitives
- `src/foundation/env-parser.ts` — strict non-executing env-file parser,
  redaction hooks
- `src/foundation/state-parser.ts` — lane-state file parser, status projection,
  unknown-key preservation

### Event parsing owners

- `src/foundation/jsonl-parser.ts` — validated JSONL parsing, malformed/partial
  line handling, bounded latest-N lookup

### Discovery owners

- `src/foundation/discovery.ts` — home-lane discovery, directory walking,
  `lane.json` validation
- `src/foundation/lane-selector.ts` — deterministic lane selection by UUID, slug,
  or single deduction; complete ambiguity matrix

### Membership owners

- `src/foundation/membership.ts` — user-local membership-index validation,
  stale-entry detection/reporting
- `src/foundation/secondary-discovery.ts` — secondary-repository lane discovery
  through validated membership index

### Binding owners

- `src/foundation/bindings.ts` — canonical repository binding computation,
  branch/worktree/access verification
- `src/foundation/conflicts.ts` — writable claim-overlap detection, dedicated vs
  shared worktree classification

### Observation owners

- `src/foundation/observations.ts` — tmux, watcher, and worker qualified-name
  reading
- `src/foundation/heartbeat.ts` — heartbeat detection, staleness classification

### Command owners

- `src/commands/ListCommand.ts` — `wt list` with human/JSON array output
- `src/commands/ConfigShowCommand.ts` — `wt config show` with key-based redaction
- `src/commands/StatusCommand.ts` — `wt status` with stable schema and derived
  health
- `help/commands/list.hlp.json`, `help/commands/config-show.hlp.json`,
  `help/commands/status.hlp.json` — editable help source fragments

## Implementation-Phase Decision Clarifications

The specs intentionally leave some details open. For this implementation lane,
use the following clarifications so batch work and review remain aligned:

1. **Exit codes are stable versioned constants.** Every error code maps to
   exactly one exit code (1-5). Codes are uppercase with underscores. Unknown
   runtime failures map to exit code 1; syntax/config failures to 2; not-found/
   ambiguity to 3; preflight/integrity to 4; collision/unsafe mutation to 5.
2. **JSON output is machine-parseable first.** `--json` guarantees exactly one
   JSON value on stdout. Decorations, ANSI, emojis, and progress indicators must
   not appear. `commandResult.data` uses the schema-specific definition; error
   output uses `commandError`.
3. **Serializers do not own domain types.** The serializer type-checks against
   contracts but does not define structural shapes. Wrong-shaped output is a
   serializer panic, not a schema extension.
4. **Path resolution is eager and canonical.** All paths are resolved through
   `realpath` before comparison. Path-escape attempts (symlinks, `..`, control
   characters) fail closed. The missing explicit workspace is an error; the CLI
   never creates directories during read operations.
5. **Env parsers are strict non-executing scanners.** They accept blank lines,
   comments, and `KEY=value` with unquoted, single-quoted, or double-quoted
   scalar values. No command substitution, variable expansion, shell operators,
   or executable statements. Rejected input produces a diagnostic with line
   number and reason.
6. **State parsers preserve unknown keys.** Lane state is parsed as scalar
   `key=value` records. Known keys normalize status; unknown keys are preserved
   in a diagnostics map. Missing or contradictory state produces `unknown`/
   `invalid` health; the parser never repairs.
7. **JSONL parsers validate each record against the durable event schema.**
   Unknown event types do not affect projections but surface as warnings.
   Malformed or partial lines are skipped with line-number diagnostics. The
   bounded latest-N lookup returns only the N most recent valid records.
8. **Lane discovery is deterministic.** The selection precedence in
   v1.md §9.3 is exhaustive. Ambiguity produces an error with candidate listing,
   not an interactive picker. Non-Watchtower copied-template directories are
   ignored and never modified.
9. **Membership-index reads are advisory.** The index maps canonical worktree
   paths to `{laneId, laneHome}` references. Every candidate must resolve to a
   valid `lane.json`. Stale entries are ignored and reported; reads never repair.
10. **Bindings compute canonical shapes without mutation.** Branch, worktree
    mode, and access are validated against the current filesystem state. Claim
    overlap is detected and reported; reads never reorder or normalize bindings.

## Current Batch Stack

### Phase 1: Contract, storage feasibility, and parse foundations (RM-01–DB-01–RM-05)

1. RM-01 — Contract kernel and error taxonomy
2. DB-01 — SQLite driver, packaging, and derived-store feasibility
3. RM-02 — Public JSON envelopes and schema validation
4. RM-03 — Canonical paths and workspace resolution
5. RM-04 — Strict env and lane-state parsers
6. RM-05 — Durable worker-event JSONL parser

### Phase 2: Discovery and membership (RM-06–RM-08)

7. RM-06 — Home-lane discovery and deterministic selection
8. RM-07 — Membership index and secondary-repository discovery
9. RM-08 — Repository bindings and writable conflict inspection

### Phase 3: Observations and command integration (RM-09–RM-10)

10. RM-09 — Tmux, watcher, heartbeat, and worker observations
11. RM-10 — `list`, `config show`, and `status` commands

## Reviewer Operating Standard

The wt-read-model review briefs are acceptance instruments, not courtesy checks.

Every reviewer should be able to answer:

1. what exact owner now holds the behavior
2. whether the core exit-code contract remains stable
3. whether read-only paths perform zero hidden writes
4. whether path/config/untrusted-input boundaries fail closed
5. whether the implementation followed the authored layer posture rather than
   a convenient package-bypass rewrite
6. whether proof was rerun rather than narrated
7. whether the status docs still tell the truth after the accept/reject decision

Reviewers should use
`implementation-quality-and-agent-rules.md#reviewer-hard-reject-checklist`
as a stop/go gate before discussing polish, naming, or minor cleanup.

## Mandatory Status-Doc Sync

Whenever a review accepts or rejects a batch, explicitly audit:

- `implementation-tracker.md`
- `implementation-roadmap.md`
- `docs/spec/v1.md` (status markers on commands)

Also audit these if the batch outcome changes what they claim:

- `docs/spec/v1-contracts.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`

If the outcome exposes a stale claim, update the document as part of the same
review/closure pass rather than leaving it as cleanup debt.

## Durable Artifact Rules

- implementation reports go under `.local/agent-reports/wt-read-model/`
- review reports go under `.local/agent-reports/wt-read-model/reviews/`
- correction briefs go under `review-batches/corrections/`
- `.local/` artifacts are never staged or committed

## Completion Meaning

This lane is not complete when code merely exists.

Completion for wt-read-model means:

- the error taxonomy is accepted with versioned IDs, exhaustive fixtures, and
  exit-code mappings consumed unchanged by every later batch
- one conforming SQLite driver (`better-sqlite3`) is selected, proven in global
  install context, and wrapped in a typed storage abstraction with FK enforcement,
  WAL mode, busy-timeout, rebuild semantics, and semantic-root reproduction; an
  ADR documents the decision and the no-JSON-shard-fallback rule
- the JSON serializer validates against the schema bundle and produces
  success/error envelopes with additive compatibility and no decorative output
- path resolution precedence, symlink/case safety, and path-escape rejection
  are fixture-proven for every resolution path
- strict env and lane-state parsers reject a malicious-shell corpus, preserve
  unknown keys, and never execute input
- the JSONL parser validates worker events, handles malformed/partial lines,
  provides bounded latest-N lookup, and reports unknown event types as warnings
- home-lane discovery walks from cwd, selects by UUID/slug/single deduction,
  and fails with a complete ambiguity matrix when ambiguous
- the membership index is validated, stale entries are detected/reported, and
  reads never repair the index
- canonical bindings are computed with branch/worktree/access checks; claim
  overlap is detected and reported without mutation
- tmux, watcher, heartbeat, and worker presence observations provide qualified
  names and staleness detection without claiming lifecycle authority
- `wt list`, `wt config show`, and `wt status` produce identical logic for
  human and JSON output, redact sensitive keys, and pass a complete read-only
  hash proof from empty, single-lane, ambiguous, invalid, multi-repository,
  stale-index, and busy-lock fixtures
