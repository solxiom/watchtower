# Batch DB-01 — SQLite driver, packaging, and derived-store feasibility

## Synchronized batch execution matrix

- **Accepted-map title:** SQLite driver, packaging, and derived-store feasibility
- **Dependencies:** `RM-01`
- **Exclusive ownership/interface:** storage interfaces, feasibility fixtures, ADR
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Node/NVB/dist/global install; parameterization; FK/integrity; busy/WAL/permissions; rebuild and semantic-root proof
- **Implementation report:** `.local/agent-reports/wt-read-model/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/DB-01-sqlite-driver-packaging-and-derived-store-feasibility-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/DB-01-sqlite-driver-packaging-and-derived-store-feasibility-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ✅ Accepted
Accepted by review batch: `DB-01`
Phase: Storage feasibility
Depends on: RM-01 accepted

**Required implementor reasoning class:** `R5`
**Class rationale:** technology selection and architectural feasibility gate with far-reaching implications. The chosen driver and storage abstraction shape every derived index, projection, and session store. A wrong or unproven selection silently introduces packaging, integrity, concurrency, or recoverability failures that propagate to all SQLite-owning batches (CA-01–CA-03, CA-16) and the release qualification (REL-03). There is no JSON-shard fallback; failure requires a specification amendment.

## Objective

Evaluate, select, and prove one conforming SQLite driver without presupposing
the result. The normative contract deliberately leaves the Node driver as an
implementation clarification; no candidate is preferred merely because it is
familiar or common. Build a thin derived-SQLite capsule with capability-specific
ports, typed configuration, parameterized operations, foreign-key enforcement,
WAL mode, busy-timeout, and staged rebuild semantics. Prove the driver works
after global npm installation and that rebuilds reproduce identical logical
rows and semantic roots. Write an ADR with the evaluated candidates, evidence,
decision, failure model, supported targets, and no-JSON-shard-fallback rule.

This batch is a gating feasibility gate. Failure to identify a conforming driver blocks all derived-store implementation (CA-01, CA-02, CA-03, CA-16) and requires a specification amendment. It does not authorize a silent JSON-shard fallback.

## Required Work

1. Evaluate at least the viable synchronous and asynchronous Node SQLite
   candidates, then select and verify one conforming driver. The driver must:
   - support the repository's pinned Node/NVB build and global-install targets;
   - use parameterized statements and expose no extension-loading path;
   - provide transactions, foreign keys, integrity checks, busy handling, and deterministic typed row access;
   - package without an undeclared system database or compiler dependency; and
   - pass distribution, ownership, crash, and supported-platform fixtures.
2. Define focused internal ports such as `SqliteConnection`,
   `SqliteTransaction`, and typed store-owned statement/query operations under
   `src/foundation/storage/`. Do not use the generic name `StorageAdapter`,
   which is easily confused with the Nirvana commons storage facade and invites
   a universal database abstraction. Store consumers expose domain methods;
   raw SQL, arbitrary statements, database paths, extensions, and driver
   internals remain inside the driver/store capsule.
3. Create `src/foundation/storage/SqliteConfig.ts`: a typed configuration capsule with shipping defaults (WAL mode, 5,000 ms busy timeout, foreign keys enabled, extension loading disabled, owner-only permissions).
4. Create `src/foundation/storage/SqliteDriver.ts` as the selected-driver
   adapter implementing the focused internal ports. Support parameterized
   statements, explicit transactions, integrity checks, busy-timeout handling,
   WAL mode, and staged rebuild semantics without exposing the selected package
   to domain stores.
5. Write `docs/spec/decisions/sqlite-driver-selection.md`: an architectural decision record (ADR) documenting:
   - the evaluated candidates and selection rationale;
   - the driver's failure model, platform constraints, and packaging requirements;
   - the no-JSON-shard-fallback rule and its rationale;
   - the driver's role as a disposable implementation substrate, not a new authority;
   - the shipping configuration defaults and their justification.
6. Write feasibility fixtures in `spec/storage/feasibility.spec.ts` proving:
   - Node/NVB build and test pass with the driver as a dependency;
   - global npm install (`nvb dist && npm install -g ./dist`) succeeds and the driver resolves correctly;
   - parameterized query execution with typed row access;
   - foreign-key enforcement (insert/update/delete violations rejected);
   - WAL mode activation and verification;
   - busy-timeout handling (concurrent reader observed, not rejected silently);
   - database file permissions are owner-only after creation;
   - integrity check (`PRAGMA integrity_check`) passes on a newly created store;
   - corrupt database detection (manual byte mutation → integrity check fails);
   - staged rebuild semantics: open a store, populate typed rows, rebuild from canonical sources into a staging path, verify logical rows are identical (semantic-root reproduction), then atomically switch;
   - crash safety: simulate an interrupted write, verify the store is recoverable or detectably corrupt without silent data loss.

## Expected Ownership

- focused type-only SQLite port modules under `src/foundation/storage/`; avoid a
  generic universal `StorageAdapter`.
- `src/foundation/storage/SqliteConfig.ts` — typed configuration capsule with shipping defaults.
- `src/foundation/storage/SqliteDriver.ts` — selected-driver adapter.
- `docs/spec/decisions/sqlite-driver-selection.md` — architectural decision record.
- `spec/storage/feasibility.spec.ts` — feasibility and proof fixtures.
- `package.json` and distribution configuration — add only the driver selected
  by the ADR and any actually required type/package metadata.

## Tests And Evidence

- Unit tests for `SqliteConfig` construction and default validation.
- Contract tests for the focused SQLite ports and selected-driver adapter.
- Feasibility fixture suite proving all required proof categories (see Required Proof below).
- `nvb build` passes with the SQLite driver as a dependency.
- `nvb test` passes including all storage feasibility specs.
- Global install proof: `nvb dist && npm install -g ./dist && wt --version` succeeds.

## What Must Not Change

- Do not implement any derived indexes yet. This batch proves the storage substrate only.
- Do not expose raw SQL or driver internals to commands, foundation consumers, or agents.
- Do not create non-rebuildable stores. Every store must be rebuildable from canonical sources.
- Do not fall back to JSON shards. If the driver cannot be proven, stop and raise a spec amendment.
- Do not change existing scaffold commands or their help.
- Do not change the product specification or architecture without an ADR entry.

## Review Procedure Highlights

1. Independently verify the driver selection rationale against the ADR and Nirvana ecosystem conventions.
2. Independently rerun every feasibility fixture: global install, FK enforcement, WAL mode, busy-timeout, integrity, corruption detection, staged rebuild, semantic-root reproduction, and crash safety.
3. Verify store-facing ports do not leak raw SQL, arbitrary statements, paths,
   extensions, or driver internals and do not impersonate the Nirvana commons
   storage facade.
4. Verify the `SqliteConfig` shipping defaults match `v1-contracts.md §8A.4`.
5. Confirm no derived index or projection has been implemented.
6. Verify the ADR documents the no-JSON-shard-fallback rule explicitly.
7. Run `nvb build` and `nvb test` independently. Verify the driver resolves in global install context.

## Required Reasoning Posture

The assigned agent must reason from the governing specifications, the v1-contracts §8A storage contract, the architecture A-033 decision (SQLite only for disposable derived indexes/projections), and the current source baseline. This is a technology selection decision with architectural implications.

- Map the driver selection to every contract requirement in `v1-contracts.md §8A.2` (parameterized statements, no extension loading, transactions, foreign keys, integrity checks, busy handling, deterministic typed row access, packaging without undeclared dependencies).
- Enumerate the failure modes of the selected driver: what happens on corrupt database, missing native binding, NFS/filesystem without proper locking, concurrent access from a non-WAL store, and crash mid-write.
- Prove the driver can be rebuilt identically: two builds from the same canonical sources must produce identical logical rows and semantic roots, even when SQLite file bytes differ.
- Prove the global install path: `nvb dist` packages the native binding correctly, and `npm install -g ./dist` from the package output resolves the driver at runtime.
- Escalate any contradiction between the driver's actual behavior and the storage contract's requirements through a correction brief. Never silently accept a driver limitation as an implementation clarification.

## Structural And Module-Size Acceptance

Line count is a design alarm, never permission to accumulate unrelated work.
Count physical lines, including comments and blanks, in new and materially
rewritten hand-maintained files. Generated artifacts are excluded only when
their generator ownership is explicit and they contain no hand-maintained
behavior.

Use the exact project-wide matrix:

| Category | Preferred maximum | Warning band | Hard reject |
| --- | ---: | ---: | ---: |
| CLI command, NVB TaskHandler/front door, registry, renderer, public barrel | 120 | 121–160 | over 180 |
| Orchestrator, controller, coordinator, presenter | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contract/type-only module | 240 | 241–320 | over 400 |
| Test/spec module | 300 | 301–420 | over 500 |

Functions target 40 lines, warn at 41–60, and reject above 80. Constructors
target 25 lines, warn at 26–40, and reject above 50. Warning-band owners require
a responsibility inventory and explicit reviewer judgment.

Every module has one primary responsibility and one cohesive reason to change.
Commands and TaskHandlers validate, normalize, delegate, and map results.
Orchestrators sequence collaborators without absorbing their algorithms.
Storage, validation, rendering, subprocess/leaf I/O, and state-machine policy do
not accumulate in one owner. Three independently nameable responsibilities
require a split even below a preferred maximum.

Class-owning TypeScript modules use PascalCase filenames; function/value modules
use lowerCamelCase. New source filenames do not use dashes or underscores.
Generic `helpers`, `utils`, `common`, and `misc` overflow bags are rejected.

Any size exception must be approved before implementation and name the exact
file, proposed maximum, cohesion reason, reviewer, and expiry/follow-up batch.
Existing oversized files are not precedent: when touched they become smaller,
split, or remain line-count neutral under an approved extraction plan.

The implementation report records categorized line counts for every new or
materially rewritten file plus warning-band functions/constructors. The
reviewer reproduces those counts and independently judges cohesion. Passing a
line-count check never overrides the responsibility gate.

# Agent Launch Prompt — Work Batch RT-05

## Required Review Packet

The implementation report must make independent verification possible. It must include:

- exact changed files and the ownership role of each
- physical line counts for every new or materially rewritten source/spec file
- a responsibility inventory for every warning-band file
- exact commands and actual results for focused and regression proof
- the ADR content and its compliance with Nirvana ecosystem conventions
- proof of the selected driver and version, all viable candidates evaluated,
  and why the evidence—not a presumed ecosystem preference—determined selection
- global install verification output
- final tracker/roadmap state, final git status, and proof that local reports are not staged
- unresolved limitations or deferred questions stated honestly

## Completion And Handoff

The SQLite driver is selected, proven, and documented. The
`src/foundation/storage/` capsule provides focused typed, parameterized,
rebuild-safe driver/store ports without becoming a generic storage facade. The
ADR records the evidence-based decision and the no-JSON-shard-fallback rule.
The feasibility fixtures prove global install, FK integrity, WAL mode,
busy-timeout, permissions, corruption detection, staged rebuild, and
semantic-root reproduction.

DB-01 gates the derived-store path. CA-01 (deterministic sealed-pack SQLite
compiler) and RT-03 (packaged NVB task runtime and distribution staging,
including the selected driver) may begin after DB-01 is accepted. Downstream
stores consume focused typed ports and never import the selected driver
directly. Failure to prove feasibility requires a specification amendment
before any derived-store work proceeds.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **storage interfaces, feasibility fixtures, ADR**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Node/NVB/dist/global install; parameterization; FK/integrity; busy/WAL/permissions; rebuild and semantic-root proof**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **storage interfaces, feasibility fixtures, ADR** and **Node/NVB/dist/global install; parameterization; FK/integrity; busy/WAL/permissions; rebuild and semantic-root proof**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-read-model/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
