# Watchtower v1 — Contract Closure

Status: **Accepted — implementation-ready**
Target release: `1.0.0`
Schema bundle: [schemas/v1.schema.json](schemas/v1.schema.json)
Last updated: 2026-07-31

This document closes the executable contracts required to implement
[v1.md](v1.md). It is intentionally narrower than the product
specification: it fixes precedence, input formats, routing, authority,
defaults, persistence, recovery, adapters, and public output where the broader
documents previously left an implementer a product choice.

## 1. Normative precedence and release boundary

For Watchtower v1, conflicts are resolved in this order:

1. this contract-closure document and its schema bundle;
2. [v1.md](v1.md);
3. [nirvana-integration-architecture.md](nirvana-integration-architecture.md),
   [coordinator-automation.md](coordinator-automation.md),
   [operator-session.md](operator-session.md), and
   [cli-session.md](cli-session.md), and
   [tui-operational-experience.md](tui-operational-experience.md), within their
   stated scopes;
4. [architecture.md](architecture.md); and
5. the versioned runtime and knowledge manifests shipped by the same release.

The roadmap and `discussions/` are informative. `pack-design-draft.md` and
`allocation-planning-draft.md` specify future producers and planning
capabilities. They do not change the v1 implementation-lane CLI or lifecycle.
The v1 implementation-pack **consumer** contract is §3 of this document.

An implementation must not silently choose between contradictory normative
requirements. A discovered contradiction is a specification defect and blocks
the affected feature until this precedence chain is updated through the
[specification-resolution cycle](specification-resolution.md).

“Proposed — implementation-ready” means product choices are closed but
implementation and conformance tests may not yet exist. “Stable” remains
reserved for implemented, passing behavior.

### 1.1 Runtime and TUI engine baseline

Watchtower v1 requires official Node.js `>=26.4.0`. The package `engines`
contract, development/runtime validation, distribution metadata, doctor, and
global-install fixtures must agree with that floor.

The required full-screen release tuple is Linux x86_64 with glibc on the
runtime manifest's tested Node range, exercised through local PTY, tmux,
direct SSH PTY, and SSH inside tmux. Other OS/architecture/libc/Node tuples are
unsupported for the TUI until promoted through the exact evidence and manifest
rules in `tui-operational-experience.md §2`; ordinary non-TUI commands remain
available on otherwise supported runtime targets.

The full-screen operator-session engine is:

```text
@opentui/core       imperative native renderer
@opentui/keymap     framework-neutral action/key binding engine
```

Both are consumed only through an accepted generic Nirvana TUI adapter.
React, Solid, Ink, JSX/TSX, Babel, framework bindings, and a second frontend
build pipeline are not part of Watchtower v1.

OpenTUI native rendering under Node requires `--experimental-ffi`. Enabling the
Node permission model additionally requires an explicit, least-privilege
`--allow-ffi`; Watchtower must not enable or broaden the permission model
implicitly. FFI is presentation infrastructure only and grants no lane,
session, task, model, filesystem, subprocess, or effect authority.

TUI-EXP-01 settled proof-of-concept engine suitability. `CA-18` remains the
blocking production compatibility and packaging gate: it must prove that the
flag, OpenTUI imports, native artifact, bootstrap strategy, and renderer
lifecycle do not regress Nirvana commands, NVB tasks, tests, distribution, or
ordinary non-TUI execution. Failure stops the TUI implementation path and
requires an explicit specification decision; it does not silently select
another renderer or trigger another disposable-spike correction loop.

## 2. Fixed v1 lifecycle and initialization syntax

The only persisted implementation-lane lifecycle values are:

| State | Dispatch allowed | Meaning |
|-------|------------------|---------|
| `bootstrap` | No | Lane exists and preflight/index/routing activation is incomplete |
| `active` | Yes | Watcher may route and apply permitted effects |
| `paused` | No new dispatch | Explicit lane-wide operational pause; active external work is not killed |
| `complete` | No | Every required batch is accepted and no unresolved required publication/effect remains |

`unknown` is a read-model result, never a writable lifecycle value.
`allocation-required` and related allocation states are post-v1.

The v1 creation command is:

```text
wt init <slug>
  --tmux-prefix=<prefix>
  --impl-pack=<path>
  --coordinator-routing=<path>
  [--scope=<bindings.json>]
  [--runtime=<version>]
  [--workspace=<path>]
  [--update-gitignore]
  [--dry-run]
```

There is no v1 `--from-pack` alias. A future pack-design handoff invokes this
contract rather than adding a second initialization path.

Successful init commits the lane initially as `bootstrap`, verifies and
publishes its pack index and routing/session policies, then atomically projects
`active`. If activation fails, init rolls back the lane as specified in §11.
Init never launches a worker.

## 3. Implementation-pack consumer contract

### 3.1 Required files

A v1 pack root contains:

```text
implementation-pack.json
implementation-pack.lock.json
pack-acceptance.json
requirements-traceability.md
implementation-map.md
implementation-quality-and-agent-rules.md
implementation-roadmap.md
implementation-tracker.md
work-batches/
review-batches/
```

The three JSON files validate against `$defs.implementationPack`,
`$defs.implementationPackLock`, and `$defs.packAcceptance` in the schema
bundle. Markdown is authoritative prose but all coordinator-critical identity,
dependency, repository, requirement, claim, proof-class, and artifact
relationships must also occur structurally in `implementation-pack.json`.

Stable requirement IDs are mandatory in v1. Every requirement has at least one
work batch and one review batch. Heading/path-only requirement identity is not
conforming.

### 3.2 Paths and file set

All stored pack paths:

- are UTF-8, repository-relative or pack-relative as declared;
- use `/` separators;
- contain no empty, `.` or `..` segment;
- are not absolute;
- resolve beneath the declared repository and pack root after symlink
  resolution; and
- match the exact case of the Git tree entry.

The sealed file set is the sorted union of every regular file below the pack
root except `implementation-pack.lock.json`. Symlinks, devices, sockets,
untracked files, and ignored files below the pack root make the pack invalid.

### 3.3 Acceptance

`pack-acceptance.json` identifies the independent reviewer, review session,
verdict, accepted manifest digest, finding disposition, and reviewed candidate
commit.
The verdict must be `accept`; all critical findings must be closed or
explicitly superseded by a referenced accepted review.

The `reviewedCommit` must be reachable from `HEAD` and contain the exact
candidate manifest and prose bytes reviewed by the independent reviewer. The
reviewed candidate file set is the sealed file set excluding the not-yet-issued
`pack-acceptance.json`; the lock is already excluded by §3.2. The later commit
containing `pack-acceptance.json` and the matching lock is the acceptance
publication commit; it must descend from `reviewedCommit`.
Requiring an acceptance record to contain the hash of the same commit that
contains that record would be self-referential and is forbidden. The reviewer
must differ from the recorded pack-author session identity. OS username or Git
author text alone is not independence proof; identity comes from the durable
role/session event referenced by `reviewSessionId`.

### 3.4 Seal and canonicalization

Digests are lowercase `sha256:<64 hex>`. File digests cover raw bytes.
Structured semantic digests use RFC 8785 JSON Canonicalization Scheme encoded
as UTF-8.

The lock contains a sorted `files` array of `{path, sha256, bytes}` for the
sealed file set. Its `sealId` is the SHA-256 digest of the RFC 8785 canonical
form of:

```json
{
  "schemaVersion": 1,
  "packId": "<pack id>",
  "manifestDigest": "sha256:...",
  "acceptanceDigest": "sha256:...",
  "sourceBaselines": {},
  "files": []
}
```

`generatedAt`, the lock file itself, local paths, and Git working-directory
metadata are excluded. Equal input bytes therefore produce the same seal.

### 3.5 Committed and drift rules

At init, every sealed file must be tracked and its working-tree/index bytes
must equal the blob reachable at `HEAD`. The pack root may be inside any
declared repository, but `packRepository` must match that binding.

Drift has these closed codes:

| Code | Result |
|------|--------|
| `PACK_BYTES_CHANGED` | Fail: sealed file bytes differ |
| `PACK_FILESET_CHANGED` | Fail: file added, removed, untracked, ignored, or symlinked |
| `ACCEPTED_INPUT_CHANGED` | Fail: accepted input digest differs |
| `SOURCE_BASELINE_CRITICAL` | Fail: changed path intersects a writable batch claim or proof input |
| `SOURCE_BASELINE_UNRELATED` | Warn: changed tracked path intersects no claim, accepted input, or proof input |
| `SOURCE_BASELINE_UNAVAILABLE` | Fail unless the repository is declared read-only and the pack marks its proof optional |

No model classifies drift during init.

## 4. Routing policy and capability floors

Routing evaluates the following rules in order; first match wins. A policy may
raise a class or lower thresholds, but cannot lower these floors.

| Rule ID | Guard | Class | Permitted result |
|---------|-------|-------|------------------|
| `safety-integrity-v1` | Contradictory authoritative state, unauthorized-effect evidence, or journal discontinuity | `D3` plus system hold | `propose-reconciliation`, `escalate` |
| `normative-contradiction-v1` | Conflicting accepted references or missing material normative decision | `D3` plus impact-scoped system hold | `propose-specification-resolution`, `request-pack-amendment`, `escalate` |
| `pack-semantic-drift-v1` | Critical pack/source drift | `D3` | `request-pack-amendment`, `escalate` |
| `review-reject-repeated-v1` | Reject for a batch with two or more prior correction openings | `D3` | reject/correction proposals, amendment, escalation |
| `review-reject-v1` | Valid reviewer reject | `D2` | reject/correction proposals, escalation |
| `worker-blocked-unique-v1` | Valid blocked event with exactly one declared dependency owner and one legal route | `M0` | the unique preauthorized notification/reroute |
| `worker-blocked-v1` | Other valid blocked event | `D2` | correction/reroute/escalation |
| `review-accept-v1` | Complete valid reviewer commit set | `M0` | record acceptance and prepare publication |
| `ready-unique-v1` | Exactly one ready candidate, or a committed total-priority rule selects one | `M0` | dispatch that candidate |
| `ready-ambiguous-critical-v1` | Multiple candidates and any candidate is cross-repository or reasoning class `R4`/`R5` | `D2` | select batch or escalate |
| `ready-ambiguous-v1` | Multiple equally valid candidates | `D1` | select batch or escalate |
| `projection-query-v1` | Exact registered structured query | `M0` | bounded projection answer |
| `operator-complex-v1` | Cross-repository, redesign, integrity, drift, repeated failure, or safety guard | `D3` | advisory response/escalation |
| `operator-bounded-v1` | Exact single-subject non-semantic registered form | `D1` | advisory response/escalation |
| `operator-default-v1` | Other natural language | `D2` | advisory response/escalation |
| `no-work-v1` | No unhandled trigger | `M0` | no effect |

The fixed capability scale is:

| Capability | Contract |
|------------|----------|
| `C2` | Typed bounded response, reference use, basic comparison |
| `C3` | Semantic review/correction reasoning across bounded evidence |
| `C5` | Complex cross-repository reconciliation and safety reasoning |

Floors are D1→C2, D2→C3, and D3→C5.

No natural-language template is M0 in v1. M0 operator access is limited to the
documented structured CLI and slash commands. Friendly natural-language
references may resolve deterministically, but the containing question still
routes at least D2 unless it matches `operator-bounded-v1`.

## 5. Proposal and effect registry

Every proposal has the common schema in `$defs.decisionProposal`, an expiry,
snapshot digest, evidence references, and exactly one type-specific body.

| Proposal type | Minimum origin/class | Legal mapped effect |
|---------------|----------------------|---------------------|
| `select-ready-batch` | automated D1; operator D1 with confirmation | `dispatch-batch` |
| `classify-reject` | D2 | Journal classification only; no direct worker launch |
| `open-correction` | D2 | `open-correction` |
| `select-correction-route` | D2 | `route-correction` |
| `request-reroute` | D1 | `reroute-endpoint` within active routing policy |
| `propose-reconciliation` | D3 plus operator confirmation | bounded `reconcile-projection`; never rewrite history |
| `request-pack-amendment` | D2 plus operator confirmation | create amendment request only |
| `propose-specification-resolution` | D3/C5 architect advisor | advisory resolution record only; no pack mutation |
| `admit-pack-amendment` | confirmed pack/spec-authority plus independent pack acceptance | atomic `activate-pack-revision` |
| `resume-specification-blocked-session` | M0 after admitted revision and worktree-sync validation | bounded `resume-blocked-session` |
| `grant-session-budget` | operator confirmation | finite grant within lane ceiling and unprotected capacity |
| `place-hold` | operator confirmation, or M0 safety policy | create scoped expiring hold |
| `release-hold` | operator confirmation, or M0 expiry | close hold |
| `escalate` | D1–D3 | create/update attention session and policy-required hold |

Normal operators may confirm `select-ready-batch`, rerouting within an already
approved endpoint pool, amendment requests, finite grants, scoped holds, and
escalation closure. Reconciliation, dependency/scope change, required-work
removal, review weakening, and acceptance invalidation require the
pack/spec-authority role recorded in local policy. No role may confirm
arbitrary shell, path, Git ref, state-key, or Markdown mutations.

An architect advisor cannot confirm or apply its own resolution. Pack-revision
activation and same-session resumption follow `specification-resolution.md`;
activation never performs arbitrary Git synchronization.

The idempotency key is the SHA-256 semantic digest of lane ID, proposal ID,
effect type, target identities, snapshot digest, and policy version. Local
postconditions and external prepare/attempt/verify rules are declared by the
runtime action manifest. V1 external effect adapters are limited to tmux
session creation and Git push. Any other external effect is rejected.

## 6. Adapter contract

Skill installation support and unattended decision support are separate
capabilities. Codex, Cursor, and Claude adapters may install knowledge. An
adapter may run an unattended D1–D3 cycle only when `wt doctor` proves all of:

- a pinned compatible executable/version;
- argv-array invocation with no shell evaluation;
- explicit cwd and environment allowlist;
- stdin or file-descriptor delivery of the immutable envelope;
- exactly one schema-valid JSON result channel;
- write-denied repository/lane/runtime access during generation;
- context access only through the bounded broker;
- process-group interruption and exit-status reporting; and
- output byte and wall-clock enforcement.

Otherwise the adapter is `advisory-confirmed` and requires an attached operator
confirmation for each invocation, or `skill-only`. Streaming is optional;
buffered validated output is the required fallback. Provider usage telemetry
is `reported`, `estimated`, or `unknown`.

Adapter capability, not host brand, determines eligibility. No v1 feature may
claim unattended support for a host until its conformance fixture passes.

V1 ships two concrete decision-endpoint adapters behind this provider-neutral
contract:

- `opencode-cli` is required. Release acceptance requires a compatible
  installed OpenCode executable to pass detection, bounded invocation, result,
  cancellation, write-denial, redaction, catalog-freshness, and telemetry
  fixtures. A provider route or model exposed by OpenCode is not supported
  merely because it appears in a catalog; each usable endpoint still needs a
  current capability profile and project-eligibility evidence.
- `hermes-cli` is conditionally qualified. The adapter ships in v1 and `doctor`
  detects it, but absence of Hermes is an explicit non-failing `not-installed`
  result. When present and selected, it must pass the same applicable
  conformance checks before advisory or unattended use.

These adapters are unrelated to the Codex/Cursor/Claude knowledge-install
targets unless a separate skill-install contract names them. Adapter and model
names never determine capability. Endpoint selection first enforces decision
class, access, freshness, independence, bounds, and protected reserves; only
then may it prefer a `free-entitlement` or otherwise lower-cost route.

Every endpoint records an executable fingerprint, adapter version, route,
catalog observation, model identity/configuration, capability-evidence version,
and `capacityPoolId`. A change to any capability-bearing fingerprint makes the
endpoint ineligible until rediscovery and requalification. Aliases exposed
through OpenCode, Hermes, or another adapter that consume the same entitlement
share one capacity pool and are never counted as independent capacity.

## 7. Shipping policy baseline

The following defaults are materialized at init and may be tightened by the
operator. Values are decimal estimated tokens.

| Class | Input soft/hard | Output hard | Broker requests | Wall clock |
|-------|-----------------|-------------|-----------------|------------|
| D1 | 12,000 / 24,000 | 2,000 | 4 | 120 s |
| D2 | 20,000 / 40,000 | 4,000 | 8 | 300 s |
| D3 | 40,000 / 80,000 | 8,000 | 16 | 600 s |

Operator-standard session defaults:

- 40,000 input and 4,000 output tokens per turn;
- 50 model-backed turns and 500,000 total estimated tokens per session;
- 32 MiB retained full text per session;
- 16 open sessions and 2 concurrent turns per lane;
- 2,000,000 total operator-session estimated tokens per lane;
- 20% of remaining lane coordinator capacity protected for escalation and
  recovery and unavailable to grants;
- 8 recent raw turns, 16 pins, 4 cross-session capsules, 64 KiB per capsule,
  8 broker requests, and 256 KiB broker bytes per ordinary turn;
- closed-session retention of 30 days and lane session storage limit of
  256 MiB; and
- hold expiry of 60 minutes unless a shorter value is requested, with an
  absolute maximum of 24 hours.

Unknown provider capacity cannot satisfy a monetary/quota hard limit. It may
run only when byte/token estimate limits pass and policy explicitly permits
`unknown` telemetry for that adapter.

Retention does not run implicitly in v1. `session close` retains content;
explicit `session prune <id> [--dry-run] [--confirm]` applies eligible
retention and tombstone rules. There is no automatic archive state transition
in v1; `archived` is reserved for a future retention worker.

## 8. Public command and JSON contract

Every documented command supports global options only where meaningful.
Unknown options and invalid combinations exit 2. `--dry-run` performs no
filesystem write, runtime staging, journal append, model invocation, tmux
operation, or Git operation.

For `--json`, a successful finite command writes exactly one
`$defs.commandResult` JSON value to stdout and diagnostics remain on stderr.
On failure, stdout is empty and stderr contains exactly one
`$defs.commandError` JSON value. Interactive attachments reject `--json`.
Streaming commands emit JSONL only when their command-specific
`--format=jsonl` is explicit; global `--json` returns one bounded page.

All result data uses the corresponding definition in the schema bundle:

| Command family | Data definition |
|----------------|-----------------|
| `init`, applied `upgrade`, skill/hold/session mutations | `mutationResult` |
| `list` | `laneListPage` |
| `status` | `laneStatus` |
| `config show` | `resolvedConfig` |
| `doctor` | `doctorReport` |
| `upgrade` | `upgradePlan` |
| `version` | `versionReport` |
| coordinator index/status/context/explain/cycle | `coordinatorResult` |
| events/ready | `eventPage` / `readySet` |
| session list/show/history/ask/export | `sessionPage` / `sessionResult` |

`watch` is a foreground runtime attachment and rejects global `--json`; its
validated durable observations are available through `status` and `events`.
`help` emits static text and rejects `--json`. `init --dry-run` and preview-only
`upgrade` return `mutationResult`/`upgradePlan` with `applied: false`.

Schema definitions specify the required stable floor. Additional fields are
allowed only where the definition says so, must preserve meaning and type
within schema version 1, and must not be required for a v1 consumer to
interpret success, identity, mutation state, warnings, or pagination.

Every page has an enforced limit, stable sort, opaque cursor tied to query
digest and projection revision, and `nextCursor: null` at completion. Default
and maximum limits are respectively 50 and 200 records. Cursor mismatch or
revision invalidation returns exit 2 and a stable reason code.

Exit-code mapping is:

- 2: syntax, schema, cursor, unsupported version, or invalid configuration;
- 3: workspace/lane/session not found or selection ambiguity;
- 4: dependency, integrity, policy, index, route, or preflight unavailable;
- 5: managed collision, stale proposal, lock/effect conflict, unsafe mutation,
  or confirmation required;
- 1: unexpected I/O, subprocess, or internal failure not represented above.

## 8A. Derived SQLite storage contract

### 8A.1 Boundary and authority

Watchtower v1 requires embedded SQLite 3 lane-local stores for query-heavy
derived indexes and projections. SQLite is an implementation substrate, not a
new authority:

```text
sealed implementation pack + append-only durable journals
  → deterministic compiler/projector
  → disposable SQLite read models
  → bounded typed queries
```

The authoritative pack, acceptance, lock, JSON/JSONL journals, lane/install
manifests, repository bindings, lane-owned policy, and shell-compatible state
projection remain files. No authoritative event, effect, session turn, pack
fact, or acceptance fact may exist only in SQLite.

The v1 stores are:

```text
coordinator/index/
  pack/
    current.json
    <index-id>/
      index-manifest.json
      index.sqlite              # immutable after publication
  runtime/
    index-manifest.json
    runtime.sqlite              # derived event/decision/projection index
  sessions/
    index-manifest.json
    sessions.sqlite             # derived cross-session/query index
```

Per-session exact turn text remains under `operator-sessions/<id>/`; the
session database stores identities, digests, offsets, bounded metadata,
references, proposal/open-question projections, and optional policy-bounded
excerpts only. It must not become an independent unlimited copy of session
content.

### 8A.2 Storage abstraction

Foundation services consume typed `PackIndexStore`, `RuntimeProjectionStore`,
and `SessionIndexStore` interfaces. Commands, coordinator policy, TaskHandlers,
and shell leaf adapters never open a database or issue SQL directly. V1 supplies
one SQLite implementation; arbitrary SQL, extension loading, user SQL hooks,
and database paths from project configuration are forbidden.

The selected Node driver is an implementation clarification recorded by the
storage feasibility batch. It must:

- support the repository's pinned Node/NVB build and global-install targets;
- use parameterized statements and expose no extension-loading path;
- provide transactions, foreign keys, integrity checks, busy handling, and
  deterministic typed row access;
- package without an undeclared system database or compiler dependency; and
- pass the distribution, ownership, crash, and supported-platform fixtures.

Failure to identify a conforming driver blocks the SQLite-owning batches and
requires a specification amendment. It does not authorize a silent JSON-shard
fallback.

### 8A.3 Schema, identity, and publication

Each database has an application schema version, compiler/projector version,
lane ID, source identity, source checkpoints, and semantic root recorded both
inside the database and in an adjacent
`$defs.derivedStoreManifest`. Foreign-key enforcement is mandatory.

Raw SQLite bytes, page order, journal files, vacuum results, and engine version
are excluded from semantic identity. The semantic root is computed from a
versioned logical export:

1. enumerate the closed table registry in schema order;
2. read rows in declared primary-key order;
3. encode each typed row as RFC 8785 canonical JSON;
4. hash the table name, row count, and length-delimited canonical rows; and
5. hash the ordered table digests into one lowercase `sha256:` root.

For identical accepted inputs, schema, and compiler/projector version, logical
rows and the semantic root must be identical even when SQLite file bytes
differ.

Pack index compilation writes a new database in an adjacent staging directory,
verifies its source digests, semantic root, foreign keys, and SQLite integrity,
closes it with no live journal/temporary files, fsyncs it, and atomically
publishes the immutable index directory before switching `current.json`.

### 8A.4 Runtime behavior and concurrency

The pack database is opened read-only after publication. Runtime and session
databases use write-ahead logging for concurrent read-only status/query access,
but have exactly one Watchtower writer under the existing lane lock. SQLite
transactions strengthen local atomicity; they do not replace `flock`, journal
fsync, effect idempotency, or the single effect authority.

Shipping defaults are:

- foreign keys enabled;
- extension loading disabled;
- a 5,000 ms busy timeout;
- no automatic unbounded checkpoint/vacuum on a foreground read command;
- bounded prepared statements only; and
- owner-only database/WAL/shared-memory permissions unless a validated
  configured execution account requires narrower read access.

A busy read reports the active mutation or returns a bounded busy error; it
does not repair, delete, or rebuild the store. Filesystems that cannot provide
the required local locking and atomic-rename behavior fail doctor/preflight.
Network/shared filesystems are unsupported for mutable v1 derived stores.

### 8A.5 Rebuild, corruption, privacy, and upgrade

Pack stores rebuild only from a valid accepted seal. Runtime and session stores
rebuild only from verified append-only journals and retained content
checkpoints. Rebuild writes and verifies a staged replacement, then switches it
atomically under the lane lock. Readers see the old complete store or the new
complete store, never a partially rebuilt database.

Missing, stale, corrupt, incompatible, or checkpoint-divergent stores:

- remain non-authoritative;
- block automated cycles or session resumption that require them;
- never trigger complete-pack/session model context or an ad hoc full scan;
- are reported by status/doctor without read-side repair; and
- require explicit `coordinator index build`, runtime rebuild, session rebuild,
  init, or upgrade action.

Database backup is not required for correctness because authority remains in
pack/journal files. Upgrade uses versioned rebuild-first migrations; it never
mutates an immutable pack database in place. Credentials, raw environment
maps, unrestricted repository content, and unredacted unlimited session text
are forbidden from derived stores.

## 9. Event, queue, cursor, and replay contract

All JSONL records validate against `$defs.durableEvent`. The `type` registry
in the detailed coordinator/operator specs is closed for schema version 1.
Every record includes:

```text
schemaVersion, eventId, sequence, at, laneId, producer,
correlationId, causationId, policyVersion, payload
```

`sequence` is a contiguous lane-journal-local unsigned integer. `eventId` is
globally unique. Type-specific payload required fields are those named by the
event’s meaning plus the referenced entity ID and before/after revision when
it mutates a projection. Unknown event types do not affect projections and
make automated mutation pause with an integrity diagnostic.

JSONL append uses one open-with-append write containing the complete
UTF-8 record plus newline, followed by `fsync` before any cursor or projection
claims it. A partial final line is ignored for reads, reported as corruption,
and blocks mutation until an explicit runtime-index rebuild verifies/truncates
only that incomplete tail.

`queue.json` is a projection of unhandled trigger IDs ordered by:

1. safety integrity;
2. system/operator escalation;
3. durable worker event sequence; and
4. lexicographic event ID tie-break.

`cursor.json` stores journal identity, last durably handled sequence/event ID,
byte offset, prefix digest, and projection revision. A cursor advances only
after the terminal outcome event is fsynced. Replay of an already completed
idempotency key returns the recorded outcome without repeating its effect.

## 10. Reviewer acceptance commit verification

For each batch, launch journals bind one implementer session ID and one
independent reviewer session ID. A reviewer `accept` event is valid only when:

- it is produced by the bound active reviewer session for that batch;
- every writable repository changed since the batch baseline has exactly one
  listed commit and no undeclared repository is listed;
- each commit exists, is reachable from the bound worktree branch tip, and its
  first-parent range begins at the recorded review baseline;
- the commit was created after reviewer launch according to the durable Git
  observation journal;
- the implementer session did not emit the commit as its handoff commit; and
- proof metadata and repository/path claims pass.

Git author/committer strings and signatures are recorded evidence but are not
the session-ownership authority. Rebase or replacement after acceptance
creates a publication/reconciliation condition; Watchtower never silently
substitutes a new hash.

## 11. Locking, transactions, and recovery

Locks are acquired only in this order:

1. data-root catalog or membership-index lock;
2. lane lock;
3. operator-session lock;
4. projection/index publication lock.

Code requiring an earlier lock must release later locks and retry; lock-order
inversion is invalid. Locks contain owner PID, process start identity, command,
and acquisition time. A PID alone is insufficient stale-lock proof.

Init uses a private staging directory adjacent to the final lane directory.
Runtime staging is immutable and content-addressed, so a successfully staged
unused runtime may remain after rollback. Membership-index changes are
prepared under its lock but published only after the final lane rename.
`--update-gitignore` uses an atomic replace and records original digest; if lane
publication fails, it restores the original only when the current digest still
matches the value written by init, otherwise it reports a recoverable conflict.

The commit point is atomic rename of the complete staged lane to its final
previously absent path. After that point, membership registration is retried
idempotently; failure leaves a valid home-discoverable lane and an explicit
index-registration warning, never a half-lane. Read-only secondary discovery
does not work until registration succeeds through an explicit `wt upgrade
--apply` compatibility repair.

Upgrade stages all links, manifests, schemas, and migrations, fsyncs them,
then switches one atomic install pointer. Old runtime binding and historical
artifacts remain until the new pointer is verified. External effects never
occur inside init or upgrade.

SQLite transactions are nested inside the lane/projection lock scope and never
reverse this order. Database busy handling does not grant permission to break
or steal a lane lock.

## 12. Conformance artifacts and implementation-ready gate

The schema bundle is normative and uses JSON Schema draft 2020-12. Before a
feature is called Stable, fixtures must cover:

- minimum and full valid examples;
- every required-field/type/path/digest failure;
- unknown-field preservation;
- deterministic seal and semantic digest reproduction;
- deterministic logical SQLite roots across rebuilds with non-identical
  permitted file bytes;
- driver packaging/global-install, foreign-key, corruption, busy-reader,
  WAL-permission, crash, and model-free rebuild behavior;
- every routing rule and hard guard;
- every proposal/effect pair in valid, stale, illegal, duplicate, interrupted,
  and uncertain states;
- every command’s human/JSON success, empty, warning, and failure forms;
- lock ordering and each transaction crash point;
- journal replay, partial-tail, duplicate, and cursor mismatch;
- adapter unattended/advisory/skill-only classification; and
- large-pack and long-session boundedness.

The requirement-to-test traceability key is the stable section anchor plus
schema `$id`/`$defs` name until individual test IDs are added during
implementation. No implementation may weaken a `must` in the normative chain
without updating the specification in the same change.
