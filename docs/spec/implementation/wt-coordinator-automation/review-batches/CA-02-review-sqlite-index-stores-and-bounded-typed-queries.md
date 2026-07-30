# Review Batch CA-02 — SQLite Index Stores and Bounded Typed Queries

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

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
