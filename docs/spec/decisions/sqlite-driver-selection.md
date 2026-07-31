# ADR: SQLite Substrate Selection For Derived Read-Model Stores

- Status: **Accepted — independently reviewed after correction 04**
- Date: 2026-07-31
- Batch: DB-01 — SQLite driver, packaging, and derived-store feasibility
- Governing contract: `docs/spec/v1-contracts.md §1.1, §8A`,
  `docs/spec/architecture.md` A-033, `docs/spec/nirvana-integration-architecture.md §4.3`

## Context

Watchtower v1 requires embedded SQLite lane-local stores for query-heavy derived
indexes and projections (pack index, runtime projection, session index). Per
A-033 and §8A, SQLite is a **disposable implementation substrate**, never a new
authority: authority stays in the sealed pack, append-only JSONL journals, and
manifest files, from which every store is fully rebuildable.

The first DB-01 attempt selected the Node built-in `node:sqlite` and built a
local driver capsule. Independent review rejected it: the mandatory Nirvana-first
audit was performed with a symlink-blind `grep` and therefore **missed a
conforming SQLite facade already shipped by the pinned `@nirvana/commons`
package**. Under the engineering standard, a local driver cannot stand when a
pinned facade covers the capability. This ADR supersedes that decision.

## Corrected Nirvana API audit (symlink-following)

Inspected the pinned `@nirvana/commons@1.0.0` symlink target
(`~/.nirvana/ecosystem/versions/1.0.0-alpha/components/commons`) with symlink
following. The package publicly exports `foundation/db` → `sqlite`, a
worker-isolation SQLite capsule:

- **`SqliteService`** (`ServiceDB` + `SqlExecutor<token, BoundSql>`): file/memory
  lifecycle over one worker-owned connection; bound-statement `execute`, explicit
  transactions (`begin`/`beginImmediate`/commit/rollback), a **migration barrier**
  for guarded rebuild admission, opaque connection tokens, and diagnostics.
- **`SqliteWorkerPool` / worker entry**: the only module that loads
  `better-sqlite3`, kept off the application thread; worker boot verifies foreign
  keys, WAL/delete journal mode, a **default 5,000 ms busy timeout**, the SQLite
  version, and JSON support, and supports **safe-integer rows**.
- `SqlitePathResolver` (app-root canonicalization closing symlink escape),
  `SqliteConfigNormalizer`, typed `NirvanaDatabaseError` codes
  (`DB_FOREIGN_KEY_CONSTRAINT`, `DB_CORRUPT`, `DB_BUSY`, …), and
  `SqliteDatabaseFileOwner`.
- `@nirvana/commons/package.json` declares `better-sqlite3@13.0.1`.

There is therefore **no `NIRVANA_API_GAP` for embedded SQLite access**. The prior
"no Nirvana SQLite" claim was false.

## Decision

**Use the pinned `@nirvana/commons` SQLite worker facade (`SqliteService`) as the
storage substrate.** The concrete driver is **`better-sqlite3@13.0.1`**, owned
and isolated inside the commons worker thread; Watchtower never imports it or
`node:sqlite`. A single Watchtower adapter (`derivedSqliteStore.ts`) is the sole
importer of the facade, exposing only a typed `DerivedStore` capability.

Re-evaluation of alternatives from this evidence:

- **Direct `node:sqlite`** (the prior choice): rejected. It duplicates a pinned
  facade — a Nirvana-first hard reject — and, as review reproduced, its default
  rows throw `ERR_OUT_OF_RANGE` on a 64-bit integer unless safe-integer mode is
  set per statement, which the facade already manages.
- **Direct `better-sqlite3`**: rejected. It is the same engine the facade already
  wraps, but on the application thread and without the worker isolation, FK/WAL
  boot verification, migration barrier, and typed error translation.
- No candidate justifies re-implementing an existing, conforming facade.

## §8A semantic map: facade coverage and residual gaps

| §8A requirement | Source |
| --- | --- |
| Parameterized statements, no extension surface | Facade (`BoundSql`, worker) |
| Transactions incl. `BEGIN IMMEDIATE` | Facade `createTransaction` |
| Foreign-key enforcement | Facade (worker boot; verified `foreign_keys=1`) |
| WAL journal mode | Facade config (`journalMode: 'wal'`) |
| 5,000 ms busy timeout | Facade default + normalized config |
| Integrity check | Facade (`PRAGMA integrity_check` via bound statement) |
| Deterministic typed rows incl. 64-bit | Facade **safe-integer** reads → `bigint` |
| Typed error taxonomy | Facade `NirvanaDatabaseError`, mapped to RM-01 codes |
| **Owner-only `0600` db/WAL/SHM** | **Watchtower gap** — worker leaves `0644`; `sqliteFilePermissions.ts` |
| **Semantic root (§8A.3 canonical rows)** | **Watchtower gap** — `semanticRoot.ts` |
| **Staged whole-file rebuild + atomic switch (§8A.3/§8A.5)** | **Watchtower gap** — `SqliteRebuilder.ts` (facade migration barrier is in-place, not disposable file-swap) |
| **Cross-process projection/index publication lock (§8A.4, §11 lock 4)** | **Watchtower gap** — `sqliteWriteLock.ts` + `writeLockRecord.ts` (`§4.3` names locking as a dedicated adapter) |
| **Process start identity for §11 lock records** | **Watchtower gap** — `foundation/process/processIdentity.ts`; no pinned package exposes it |
| Typed store boundary (no raw SQL/paths/driver) | Watchtower `DerivedStore` + `sqliteSchemaSql` (private) |

Each residual gap is owned by a focused Watchtower module; `node:crypto`
(canonical JSON + SHA-256) and `node:fs` (permissions, lock, atomic rename)
have no Nirvana equivalent and are used only inside those adapters.

## The projection/index publication lock

### Scope: what this lock is, and what it is not

This adapter implements **lock 4 of the `v1-contracts.md §11` order — the
projection/index publication lock** — for one derived store. That is its entire
claim.

It is **not** the lane lock (§11 lock 2), and nothing here proves lane-lock
integration. A caller that also requires lane authority must acquire the lane
lock *outside* this one, preserving the §11 order; a later lane-lifecycle batch
owns that integration. What is proved here is the inner portion of the order:
this lock is always taken before any SQLite connection or transaction exists, so
SQLite transactions nest inside the projection-lock scope as §11 requires. No
pinned Nirvana facade exposes cross-process file locking, which
`nirvana-integration-architecture.md §4.3` names as a dedicated adapter.

### Exclusion

The single-writer invariant (§8A.4) is enforced by the capsule, not by caller
discipline. **A writable store acquires this lock when it is opened and holds it
for the handle's entire lifetime**, and a rebuild publication acquires the same
lock over the same path. There is therefore no ordinary write that can bypass the
lock a publication takes: the two contend for one exclusion, and the loser
receives a bounded `ERR_LOCK_CONFLICT`. Read-only handles take no lock and remain
concurrent under WAL.

### Durable record and stale-owner recovery (§11)

§11 requires a lock to record owner PID, process start identity, command, and
acquisition time, and states explicitly that **a PID alone is insufficient
stale-lock proof**. Every lock and reclaim-sentinel record therefore carries
exactly these five fields, each validated against its own grammar:

| Field | Meaning | Accepted values |
| --- | --- | --- |
| `pid` | owner process id | integer in `1..4194304` (Linux `pid_max`) |
| `processStartIdentity` | the owner's actual boot-anchored start marker — **never** the acquisition time | `linux-boot:<seconds>:start:<ms>` with bounded, leading-zero-free counters, or exactly `unverifiable` |
| `command` | bounded, redacted command identity | base names joined by single spaces, `[A-Za-z0-9._-]` only, ≤ 120 chars; no paths, no arguments |
| `acquiredAt` | when this acquisition happened | canonical `toISOString()` form that round-trips exactly |
| `token` | per-acquisition identity for release ownership | canonical lowercase UUID |

### Lock records are untrusted input

A lock file is attacker-influenced text, so validation is the security boundary,
not a formality. The record is **size-bounded before it is read** (1 KiB; a
well-formed record is ~250 bytes), must parse to a plain object carrying
**exactly** the five keys — no missing key and no extra key — and every value
must satisfy the grammar above.

This matters most for `processStartIdentity`. If an arbitrary string were
accepted there, it would mismatch the real process occupying the PID, be
classified as a reused PID, and license reclaiming a **live** holder's lock.
Validating the minted grammar is precisely what stops crafted text from becoming
stale authority. Only a fully validated record ever reaches liveness
classification or token comparison.

Deliberate tradeoff: because an unreadable record is never auto-stolen, a
genuinely corrupt lock file requires operator intervention rather than silent
takeover. Failing closed is the required posture for a mutation lock.

Liveness matches **both** the PID and the process start identity:

- **dead** — no process occupies the PID: reclaimable;
- **stale** — a process occupies the PID but its start identity differs from the
  record, i.e. the PID was reused: reclaimable. A PID-only check cannot detect
  this and would block the lock indefinitely;
- **active** — PID and start identity both match: never reclaimed, even when the
  record's token is foreign to the contender;
- **unverifiable** — unsupported platform, unreadable `/proc`, an `EPERM` probe,
  or a malformed/incomplete record: treated as active. A lock is **never** stolen
  on absent evidence; the contender gets a bounded `ERR_LOCK_CONFLICT` instead.

The token protections that already passed review are retained unchanged:
competing reclaimers are serialized by an exclusive `wx` reclaim sentinel and the
stale holder's token is re-verified while that sentinel is held; release removes
the file only while its token still matches this acquisition; and a sentinel
leaked by a killed reclaimer is itself reclaimed by the same liveness rule.

### Process-identity source and supported platforms

Nirvana audit (proven `NIRVANA_API_GAP`): the pinned packages — `@nirvana/base`,
`@nirvana/b-core`, `@nirvana/builder`, `@nirvana/commons`, `@nirvana/framework` —
expose no process start-identity or PID-safety capability under symlink-following
inspection. The ecosystem's `nira` component does ship
`foundation/process/pidSafety`, but `nira` is not a Watchtower dependency and no
pinned package re-exports it, so it is **comparable usage**, not an available API.

`src/foundation/process/processIdentity.ts` is therefore the smallest focused
adapter, mirroring that accepted mechanism: Linux `/proc/<pid>/stat` `starttime`
ticks anchored to `/proc/stat` `btime`. One deliberate divergence: Nira compares a
recorded wall-clock timestamp to process start time within a 15 s tolerance;
Watchtower records the exact start marker in its own field, separate from
`acquiredAt`, and compares by equality — §11 requires the two to be distinct, and
repeated reads of one process are byte-identical, so equality is both stronger
and stable.

**Supported-platform behavior:** start identity is available on Linux, the
reproduced target. On any other platform the marker is `unverifiable`, no record
is ever classified `stale`, and stale recovery degrades to dead-PID detection
only. That degradation is safe by construction — it can only refuse a reclaim,
never grant one — and is recorded here as the explicit platform limitation.

## Failure model

- **Corrupt database**: integrity is established at **admission**. A non-creating
  open runs `PRAGMA integrity_check` before the handle is returned and marks the
  store poisoned on failure; a `DB_CORRUPT` observed later poisons it too. Every
  dependent operation on a poisoned store then rejects with
  `ERR_INTEGRITY_FAILURE`. This is what prevents partial results: damage confined
  to one table's pages does **not** let an intact table keep serving rows, which
  was reproduced directly (the raw engine still returns the intact table's rows
  from the same damaged file, while the capsule refuses).
- **Concurrent writer vs. publication**: closed by the projection-lock exclusion
  above. The correction-02 race — a 5,000-row writer overlapping a publication,
  where both previously reported success and the committed rows vanished — now
  ends with the publication rejected as `ERR_LOCK_CONFLICT` and all 5,001 rows
  present in the active store.
- **Crash mid-write**: an external `SIGKILL` during an open transaction leaves no
  partial rows; WAL recovery discards uncommitted frames and committed rows
  survive (reproduced). The killed process's projection lock is left behind with
  its full §11 record and is reclaimed as a dead owner on the next open.
- **Abandoned lock from a reused PID**: a record whose PID is later occupied by a
  different process is detected as a stale owner through the start-identity
  mismatch and reclaimed, instead of blocking the store until manual deletion.
- **Busy contention**: a bounded collision surfaces the registered
  `ERR_LOCK_CONFLICT`. The facade's `NirvanaDatabaseError` codes (`DB_BUSY`,
  `DB_TIMEOUT`, `DB_READ_ONLY`, `DB_TRANSACTION_STATE`) are translated at the
  adapter boundary and never escape; transaction creation, start, body, commit,
  and abort are all inside the translated region, and a failing rollback retains
  the original failure.
- **Network/shared filesystems**: unsupported for mutable derived stores (§8A.4);
  a later doctor/preflight batch must assert local locking + atomic rename.

## Platform constraints and packaging

- Reproduced supported target: **Linux, Node 26.4.0** (the governing floor from
  `v1-contracts.md §1.1`), `@nirvana/commons` worker with `better-sqlite3@13.0.1`.
  No macOS/Windows claim is made here; those require their own reproduced proof.
- `package.json` / dist metadata pin `engines.node >= 26.4.0`;
  `package-lock.json` is synchronized. Watchtower adds **no** direct SQLite
  dependency — the driver is a transitive dependency of the already-pinned
  `@nirvana/commons`. The native `better-sqlite3` binding is resolved through the
  commons package, proven functional from a global install at runtime.

## No-JSON-shard-fallback rule

If a supported target cannot provide the conforming facade/driver, Watchtower
**stops and raises a specification amendment through the correction process.** It
**must not** fall back to JSON shards, ad hoc key/value files, or an in-process
map. Derived stores are the only sanctioned query substrate; their absence blocks
dependent automated cycles rather than degrading silently.

## Disposable-substrate rule

The facade and driver are an implementation detail, not an authority. No
authoritative event, effect, session turn, pack fact, or acceptance fact may
exist only in SQLite. Semantic identity (§8A.3) is computed over canonical
logical rows, never raw SQLite bytes, so a store can be re-paged, vacuumed, or
rebuilt with a different engine version without changing identity. Downstream
SQLite-owning batches consume the typed `DerivedStore` ports and must never
import the facade, `better-sqlite3`, or `node:sqlite`; an automated architecture
gate enforces this.

## Shipping configuration defaults (`SqliteConfig`, per §8A.4)

| Setting | Default | Justification |
| --- | --- | --- |
| `journalMode` | `wal` | Concurrent read-only status/query alongside the single writer. Not overridable. |
| `busyTimeoutMs` | `5000` | Bounded wait before a busy error. Overridable within `0..600000`. |
| `foreignKeys` | `true` | Mandatory referential integrity (worker-enforced). Cannot be disabled. |
| `allowExtensions` | `false` | No extension-loading path or user SQL hooks. Cannot be enabled. |
| `fileMode` | `0o600` | Owner-only db/WAL/SHM. Overridable only to other owner-only modes. |
| `readOnly` | `false` | Mutable by default; the pack store opens read-only after publication. |

`createSqliteConfig` validates every override and rejects any that would weaken a
non-negotiable invariant with a registered `ERR_INVALID_ARGUMENT`.

## Capsule surface and path authority

The storage barrel exports exactly one construction entry point,
`openDerivedStorage(root)`, which is the **single authorized owner of filesystem
location and lock-path selection**. It is rooted once at an already-authorized
lane index directory, mirroring the composition-root pattern in
`nirvana-integration-architecture.md §4.3`. Domain consumers then address the
three §8A stores **by kind** (`pack` | `runtime` | `sessions`) and receive only
typed `DerivedStore` / `RebuildResult` capabilities.

Nothing else path-bearing is public. `DerivedStoreLocation`, `openDerivedStore`,
`rebuildStore`, `RebuildRequest`, `acquireWriteLock`, `WriteLock`, and the SQL
renderers are all capsule-internal. Statement text is confined to two modules,
and the commons facade to one adapter. Automated architecture fixtures enforce
this: they parse the barrel's export list and the capsule's exported type bodies
and fail on any re-exported construction/rebuild/lock name or any exported type
carrying a `root`/`path`/`file`/`lockPath`/`databasePath` member. Those fixtures
carry positive controls, and re-exporting the previously flagged
`DerivedStoreLocation` and `acquireWriteLock` was confirmed to fail them.

## Consequences

- DB-01 is independently accepted. Its dependency gate for CA-01 (deterministic
  sealed-pack SQLite compiler) and RT-03 (NVB distribution staging) is clear;
  dispatch remains subject to the current architect planning hold.
- All derived stores build on the typed `DerivedStorage` / `DerivedStore` /
  `computeSemanticRoot` surface obtained from `openDerivedStorage`, and never
  import the facade, a driver, or a store path directly.
- Because a writable handle holds the mutation lock for its whole lifetime, a
  long-lived writable store blocks publication for that duration. Downstream
  incremental-projection batches must open writable handles narrowly, around a
  unit of work, rather than for the life of a command.
- A non-creating open pays one `PRAGMA integrity_check` at admission. This is the
  price of the no-partial-results guarantee; if a future batch measures it as
  material for large stores, the manifest-verified admission path in §8A must be
  amended deliberately rather than by weakening this check.
- macOS/Windows support and network-filesystem preflight remain open items for
  later batches with their own reproduced proof.
- **Open packaging limitation**: `npm install -g ./dist` and runtime native-binding
  resolution are proved in the configured Nirvana ecosystem, where `@nirvana/*`
  install as local links. An isolated registry/tarball install cannot be proved
  here — `npm install` of the packed tarball fails with `E404` on
  `@nirvana/b-core` because those packages are unpublished. This is a
  pre-existing ecosystem-distribution constraint, not a DB-01 storage defect, and
  it remains unproved rather than claimed.
