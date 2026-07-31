# Review Batch CA-03 — Runtime SQLite indexes and projections

## Synchronized batch execution matrix

- **Accepted-map title:** Runtime SQLite indexes and projections
- **Dependencies:** `RM-05`, `CA-02`
- **Exclusive ownership/interface:** runtime index/projection foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Journal checkpoints; single writer/WAL readers; incremental append; corruption and staged rebuild
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-03-runtime-sqlite-indexes-and-projections.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-03-runtime-sqlite-indexes-and-projections-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-03-runtime-sqlite-indexes-and-projections-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/CA-03-runtime-sqlite-indexes-and-projections.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-03-runtime-sqlite-indexes-and-projections.md`

## Scope Verification

- [ ] `src/foundation/JournalWal.ts` created — WAL-mode SQLite access
- [ ] `src/foundation/JournalIndex.ts` created — derived SQLite journal index with `journal_event` and `journal_checkpoint` tables
- [ ] `src/foundation/JournalProjection.ts` created — deterministic projections
- [ ] Incremental append from authoritative JSONL with sequence continuity validation
- [ ] Partial-tail detection and handling
- [ ] Corruption detection and staged rebuild from authoritative JSONL
- [ ] WAL-mode concurrent readers (single writer)
- [ ] All projections read through `JournalIndex` typed methods, never raw JSONL or raw SQL

## SQLite-Specific Verification

- [ ] **No raw SQL exposed to consumers**: Grep for `.exec(`, `.run(`, `.prepare(`, `.all(`, `.get(` — prove they appear ONLY in `src/foundation/JournalWal.ts`, never in `JournalIndex.ts`, `JournalProjection.ts`, or any consumer.
- [ ] **SQLite bytes never treated as semantic authority**: The authoritative JSONL journals are the source of truth. The SQLite index is derived and disposable. Verify rebuild reads from JSONL, not from internal SQLite state.
- [ ] **Index is provably rebuildable**: Delete the SQLite database entirely. Trigger rebuild from authoritative JSONL. Prove the rebuilt index is identical to the original (same events, same checkpoints, same projections).
- [ ] **Corruption is detected, not silently served**: Corrupt the SQLite database bytes. Prove `JOURNAL_INDEX_CORRUPT` detection, queries blocked, and staged rebuild restores correct state.
- [ ] **No full-pack/JSON-shard fallback exists**: Verify projection code uses ONLY `JournalIndex` typed methods; no raw JSONL file reads, no full-journal scans.

## Required Independent Proof

1. Append events incrementally. Verify checkpoint advances correctly after each append.
2. Open a concurrent reader while writer appends. Verify WAL-mode allows concurrent access without SQLITE_BUSY.
3. Append a partial-tail event. Verify corruption detection and mutation blocking.
4. Trigger rebuild after a partial tail. Verify only the complete prefix is
   indexed, the authoritative JSONL remains byte-for-byte unchanged, and
   mutation stays blocked pending completion or separately authorized repair.
5. Introduce a sequence gap (skip sequence 3). Verify `JOURNAL_SEQUENCE_GAP` and append blocking.
6. Append a malformed JSONL line. Verify `JOURNAL_INVALID_RECORD` rejection.
7. Corrupt the SQLite database bytes. Verify `JOURNAL_INDEX_CORRUPT` → queries blocked → staged rebuild restores correct state.
8. Interrupt a rebuild mid-way, retry. Prove rebuild is idempotent and final state matches clean rebuild.
9. Run all projections from fixture journal data. Verify correct output.
10. Run the same projection twice. Verify deterministic (identical) output.
11. Verify the authoritative JSONL journal is never modified by any index or rebuild operation.
12. Run `nvb build` and `nvb test`. Record output.
13. Grep for raw SQL primitives — prove they appear ONLY in `JournalWal.ts`.
14. Verify `git log` shows the implementation agent did not commit.

## Required Reasoning Posture

The reviewer must verify that the authoritative JSONL journals remain immutable
through all index and rebuild operations. The SQLite index is disposable —
verify that complete deletion and rebuild from JSONL produces identical results.
Reject if any projection reads raw JSONL or raw SQL directly.

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

The review report must include: independently rerun proof commands and outcomes,
SQLite-specific verification (raw-SQL grep, rebuild-from-JSONL proof, corruption
detection, authoritative JSONL immutability proof), structural verification,
line-count verification, tracker/roadmap sync status, and the acceptance or
rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- WAL-mode concurrent reads work without blocking.
- Partial-tail detected and handled correctly.
- Sequence gaps detected and blocked.
- Corruption detected and staged rebuild restores correct state from JSONL.
- Rebuild is idempotent.
- All projections deterministic and correct.
- Authoritative JSONL never modified by any index/projection/rebuild operation.
- No raw SQL exposed outside `JournalWal.ts`.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.

## Reject Conditions

- Authoritative JSONL journal modified by index or rebuild operation.
- Projection reads raw JSONL or raw SQL instead of `JournalIndex` typed methods.
- Rebuild not idempotent (different result on retry).
- Corruption silently served instead of detected and blocked.
- Raw SQL primitives outside `JournalWal.ts`.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **runtime index/projection foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-03-runtime-sqlite-indexes-and-projections-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-05`, `CA-02`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Journal checkpoints; single writer/WAL readers; incremental append; corruption and staged rebuild**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **runtime index/projection foundation** and **Journal checkpoints; single writer/WAL readers; incremental append; corruption and staged rebuild**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-03-runtime-sqlite-indexes-and-projections-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-03-runtime-sqlite-indexes-and-projections-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
