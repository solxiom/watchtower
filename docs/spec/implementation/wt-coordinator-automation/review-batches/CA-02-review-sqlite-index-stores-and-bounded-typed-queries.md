# Review Batch CA-02 — SQLite index stores and bounded typed queries

## Synchronized batch execution matrix

- **Accepted-map title:** SQLite index stores and bounded typed queries
- **Dependencies:** `CA-01`
- **Exclusive ownership/interface:** index store/query foundation
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Indexed bounded reads; limits/cursors/truncation; no direct SQL; stale/missing/corrupt block
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-02-sqlite-index-stores-and-bounded-typed-queries.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-02-sqlite-index-stores-and-bounded-typed-queries-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-02-sqlite-index-stores-and-bounded-typed-queries-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/CA-02-sqlite-index-stores-and-bounded-typed-queries.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-02-sqlite-index-stores-and-bounded-typed-queries.md`

## Scope Verification

- [ ] `src/foundation/IndexStore.ts` created as a domain store behind DB-01
  focused ports; it does not import the selected driver package
- [ ] `src/foundation/IndexQuery.ts` created — typed query facade
- [ ] All typed query methods implemented: `getArtifact`, `getBatch`, `getBatches`, `getBatchesByIds`, `getDependencies`, `getDependents`, `getRequirements`, `getRepositories`, `getProofs`, `getArtifactsByBatch`, `assembleBatchContext`
- [ ] Cursor/pagination with hard limits (max 200 per page, max depth 10, max 64 KiB content)
- [ ] Stale/missing/corrupt index blocks refuse queries
- [ ] No raw SQL exposed to consumers
- [ ] No full-pack/JSON-shard fallback exists

## SQLite-Specific Verification

- [ ] **No raw SQL exposed to consumers**: Grep for `.exec(`, `.run(`, `.prepare(`, `.all(`, `.get(` — prove they appear ONLY in `src/foundation/IndexStore.ts`, never in `IndexQuery.ts` or any consumer module.
- [ ] **SQLite bytes never treated as semantic authority**: Verify `assembleBatchContext` and all query methods return typed objects from logical rows; no method returns raw SQLite bytes, database handles, or SQL strings to consumers.
- [ ] **Index is provably rebuildable (semantic root)**: The index was compiled by CA-01 which already proved semantic-root rebuildability. Verify the query layer passes through the CA-01 semantic root from `index_meta` without altering or reinterpreting it.
- [ ] **Corruption is detected, not silently served**: Corrupt the SQLite database bytes. Prove EVERY query method returns `INDEX_CORRUPT` and the index is invalidated. No query returns partial or incorrect data.
- [ ] **No full-pack/JSON-shard fallback exists**: Grep for pack-manifest reading, JSONL scanning, or full-file loading outside `PackIndexCompiler.ts` — prove none exist in `IndexStore.ts` or `IndexQuery.ts`.

## Required Independent Proof

1. Open a compiled 30-batch index. Verify every typed query method returns correct results.
2. Corrupt the SQLite database (flip bytes, truncate file). Prove `INDEX_CORRUPT` from every query and that the index is invalidated.
3. Tamper with `index_meta` pack seal. Prove `INDEX_STALE` on open.
4. Request 201 records. Prove `INDEX_LIMIT_EXCEEDED`.
5. Test cursor mismatch (different query, different revision). Prove `INDEX_CURSOR_INVALID`.
6. Test dependency resolution with 5-deep chain. Verify correct results and depth-limit 10 enforcement.
7. Run `nvb build` and `nvb test`. Record output.
8. Grep for `.exec(`, `.run(`, `.prepare(`, `.all(`, `.get(` across ALL source. Prove they appear ONLY in `IndexStore.ts`.
9. Grep for pack manifest/JSONL/full-file reads in `IndexStore.ts` and `IndexQuery.ts`. Prove none exist.
10. Verify `git log` shows the implementation agent did not commit.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. The grep evidence for no-raw-SQL and
no-fallback is the most critical acceptance criterion. Reject immediately if
any raw SQL primitive appears outside `IndexStore.ts`.

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
SQLite-specific verification (raw-SQL grep output, no-fallback grep output,
corruption detection proof), structural verification, line-count verification,
tracker/roadmap sync status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- No raw SQL exposed outside `IndexStore.ts`.
- Corruption detected and all queries blocked, no partial data served.
- No full-pack/JSON-shard fallback exists.
- All typed query methods return correct results.
- Cursor/revision semantics correct.
- Page/depth limits enforced.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.

## Reject Conditions

- Raw SQL primitive (`.exec`, `.run`, `.prepare`, `.all`, `.get`) found outside `IndexStore.ts`.
- Query returns partial or incorrect data when index is corrupt.
- Full-pack or JSON-shard fallback path exists.
- Database handle or SQL string exposed to consumers.
- SQLite bytes treated as semantic authority.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **index store/query foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-02-sqlite-index-stores-and-bounded-typed-queries-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Indexed bounded reads; limits/cursors/truncation; no direct SQL; stale/missing/corrupt block**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **index store/query foundation** and **Indexed bounded reads; limits/cursors/truncation; no direct SQL; stale/missing/corrupt block**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-02-sqlite-index-stores-and-bounded-typed-queries-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-02-sqlite-index-stores-and-bounded-typed-queries-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
