# Review Batch DB-01 — SQLite driver, packaging, and derived-store feasibility

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
Review outcome: correction 04 independently verified and accepted
Reasoning: `R5`
Paired work brief: `work-batches/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`
Implementation report: `.local/agent-reports/wt-read-model/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`

## Scope Verification

- [ ] Focused SQLite connection/transaction/store ports created; no generic
  universal `StorageAdapter`
- [ ] `src/foundation/storage/SqliteConfig.ts` created with typed configuration capsule and shipping defaults
- [ ] `src/foundation/storage/SqliteDriver.ts` adapts the evidence-selected
  driver
- [ ] `docs/spec/decisions/sqlite-driver-selection.md` (ADR) created
- [ ] `spec/storage/feasibility.spec.ts` created with comprehensive feasibility fixtures
- [ ] Package/distribution configuration contains the evidence-selected driver
  and required target artifacts
- [ ] No derived indexes, pack compilers, projections, or session stores implemented
- [ ] No raw SQL or driver internals exposed to consumers
- [ ] No JSON-shard fallback exists

## Required Independent Proof

1. **Driver selection audit**: Verify the ADR evaluates viable synchronous and
   asynchronous candidates, records reproduced evidence and the
   no-JSON-shard-fallback rule, and maps the selected driver to every
   `v1-contracts.md §8A.2` requirement. No driver is predetermined and an
   alleged ecosystem convention is not selection proof.
2. **Global install proof**: Independently run `nvb dist && npm install -g ./dist`. Verify the globally installed CLI resolves the SQLite driver at runtime without native-binding errors.
3. **Parameterized query proof**: Verify all operations use parameterized
   statements. Confirm no interpolation or raw SQL concatenation crosses a
   store-facing typed port.
4. **Foreign-key enforcement**: Independently run fixtures proving FK violations are rejected. Test insert, update, and delete violations across related tables.
5. **WAL mode verification**: Verify WAL mode is activated on database creation. Confirm that concurrent readers can access the store while a writer holds a transaction.
6. **Busy-timeout handling**: Verify the 5,000 ms busy timeout is configured. Prove that a concurrent reader observes the timeout rather than failing silently or returning stale data.
7. **Permissions verification**: Verify database files are created with owner-only permissions (0600 or platform equivalent).
8. **Integrity check**: Independently run `PRAGMA integrity_check` on a newly created populated store. Verify it passes.
9. **Corruption detection**: Manually corrupt database bytes. Verify `integrity_check` fails with a diagnostic. Confirm the corrupted store is not silently accepted.
10. **Staged rebuild proof**: Populate a store from canonical sources. Rebuild from the identical sources into a staging path. Verify logical rows are identical (same count, content, primary-key order).
11. **Semantic-root reproduction**: Compute the semantic root (per `v1-contracts.md §8A.3`) for both the original and the rebuild. Verify they are identical even when SQLite file bytes differ.
12. **Atomic switch proof**: Verify the staging database is atomically switched to the active path. Confirm readers see either the complete old store or the complete new store, never a partially rebuilt database.
13. **Crash safety proof**: Simulate an interrupted write (kill process mid-transaction). Verify the store is recoverable via WAL recovery or detectably corrupt without silent data loss.
14. **Contract API audit**: Verify focused SQLite/store ports expose no raw SQL,
    arbitrary statements, driver internals, database paths, or extension
    loading, and do not impersonate the Nirvana commons storage facade.
15. Run `nvb build` and `nvb test` independently. Record exact output.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. This batch is an architectural
feasibility gate; the reviewer must independently prove every claim.

- Audit the ADR: verify the driver selection rationale, failure-model analysis,
  platform constraints, and the no-JSON-shard-fallback rule.
- Inspect every storage module independently. Verify the focused ports are
  sufficient for downstream SQLite-owning batches (CA-01, CA-02, CA-03,
  CA-16) without exposing raw SQL or driver internals.
- Reproduce every feasibility fixture independently. Do not trust implementation
  report claims.
- Verify the global install path works end-to-end: the native binding must
  resolve correctly from the globally installed package.
- Verify the rebuild contract: two builds from identical canonical sources must
  produce identical logical rows and semantic roots.

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

The review report must include: independently rerun proof commands and outcomes
for all 15 proof items, structural verification results, line-count verification,
ADR audit result, global install verification output, tracker/roadmap sync
status, and the acceptance or rejection decision.

## Acceptance Gate

The batch is accepted only when:

- The driver proves all feasibility criteria: global install, parameterized queries,
  FK enforcement, WAL mode, busy-timeout, permissions, integrity, corruption
  detection, staged rebuild, semantic-root reproduction, and crash safety.
- The ADR documents the driver choice, its failure model, platform constraints,
  and the explicit no-JSON-shard-fallback rule.
- Focused typed SQLite/store ports are sufficient for downstream stores without
  exposing raw SQL, arbitrary statements, paths, extensions, or driver
  internals.
- The `SqliteConfig` shipping defaults match `v1-contracts.md §8A.4`.
- No derived indexes, pack compilers, projections, or session stores have been
  implemented.
- No raw SQL or driver internals leak to consumers.
- No JSON-shard fallback exists in any source file.
- All hard-reject checklist items are clear.
- `nvb build` and `nvb test` pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Reject Conditions

- The driver fails any feasibility criterion.
- The ADR is missing, incomplete, or does not document the no-JSON-shard-fallback rule.
- Raw SQL, arbitrary statements, paths, extensions, or driver internals leak
  through a store-facing port.
- Any derived index, pack compiler, projection, or session store has been implemented.
- A JSON-shard fallback exists.
- Foreign-key enforcement is not enabled.
- WAL mode is not configured.
- Extension loading is not disabled.
- Busy-timeout is not configured to the shipping default.
- The driver does not resolve in global install context.
- Rebuild does not produce identical logical rows.
- A database file has world-readable permissions.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **storage interfaces, feasibility fixtures, ADR**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/reviews/DB-01-sqlite-driver-packaging-and-derived-store-feasibility-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Node/NVB/dist/global install; parameterization; FK/integrity; busy/WAL/permissions; rebuild and semantic-root proof**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **storage interfaces, feasibility fixtures, ADR** and **Node/NVB/dist/global install; parameterization; FK/integrity; busy/WAL/permissions; rebuild and semantic-root proof**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-read-model/reviews/corrections/DB-01-sqlite-driver-packaging-and-derived-store-feasibility-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-read-model/reviews/DB-01-sqlite-driver-packaging-and-derived-store-feasibility-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
