# Review Batch CA-16 — Session SQLite Index, References, Pins, and Compaction

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

Status: ❌ Not started
Paired work batch: CA-16
Reviewer owns the acceptance commit.

## Scope Verification

1. **File ownership:** Verify `src/foundation/SessionIndexes.ts` and
   `src/foundation/SessionCompaction.ts` are the only new files. No other
   module gained SQLite session-index capability.
2. **Dependency direction:** Verify dependencies point to CA-02 (SQLite index
   store) and CA-15 (session journals), not the reverse. Verify no raw SQL
   is exposed to consumers — all access is through typed query methods.
3. **Spec compliance:** SQLite schema matches the session-index contract in
   `operator-session.md §11.2` and `coordinator-automation.md §9`. Content
   excerpts are capped at 500 chars. Cross-session capsules match
   `operator-session.md §10.2`. Compaction matches `operator-session.md §12`.
   Index manifest matches `coordinator-automation.md §9.3`.
4. **Layer integrity:** No session routing, budgets, proposals, or holds (that
   is CA-17). No model invocation. No raw SQL escape hatch for consumers.
5. **Authority separation:** The SQLite index is derived and disposable. Exact
   full text lives only in journals and turn files. The index manifest records
   disposability. A missing index blocks queries; no full-history fallback.

## Required Independent Proof

- **Index build:** Independently populate sessions and turns. Build the index.
  Verify correct row counts for every table. Verify content/answer excerpts
  are at most 500 chars. Verify semantic-root determinism (rebuild from same
  journals → same `semanticRoot`).
- **Incremental update:** Add new turns. Run incremental update. Independently
  verify only new turn data is indexed; existing rows are unchanged.
- **Every typed query:** Independently call every query method with valid
  parameters. Verify results match journal data.
- **Excerpt cap enforcement:** Create a turn with a 10,000-character operator
  message and coordinator answer. Build the index. Verify both excerpts in
  SQLite are exactly 500 characters. Verify truncation is detectable (stored
  digest allows exact-length verification).
- **Cross-session capsule:** Build a capsule for a turn in session A,
  requested by session B. Independently verify the capsule includes: turn
  identity, decision class, snapshot revision, open questions, proposal IDs,
  500-char answer excerpt, complete answer digest. Independently verify it
  does NOT include: the operator message, the full coordinator answer, any
  transitive turn references.
- **Non-transitivity:** Create a turn that references another turn. Build the
  capsule. Independently verify the referenced turn's content is absent.
- **Cross-lane denial:** Request a capsule for a turn in a different lane.
  Prove `OPERATOR_SESSION_REFERENCE_DENIED`.
- **Pruned content:** Prune a turn's full text. Build the capsule. Verify it
  resolves to `OPERATOR_SESSION_CONTENT_PRUNED` tombstone.
- **Compaction:** Index 100 turns with 5 pins. Compact to keep 20 recent.
  Independently verify: only 25 turns remain in the index, journal files are
  byte-for-byte identical to pre-compaction, turn files on disk are untouched.
- **Compaction preview:** Run preview-compact. Independently verify the
  preview correctly lists turns without removing index rows.
- **Disposability:** Delete `sessions.sqlite`. Rebuild from journals.
  Independently verify identical logical rows and semantic root.
- **No fallback:** Delete `sessions.sqlite`. Attempt a typed query.
  Independently verify it fails with `SESSION_INDEX_MISSING` rather than
  scanning the journals.
- **Build and test:** Run `nvb build` and `nvb test` independently. Verify
  zero failures.
- **Model-free audit:** grep session-indexes and session-compaction for any
  model invocation. Prove none exist.

## Required Reasoning Posture

The reviewer must independently reason through every path that could make the
index authoritative. The reviewer must prove: the index can be deleted and
rebuilt with identical logical results, excerpt truncation at 500 chars is
enforceable, capsules are non-transitive, and compaction never touches journals.

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

1. Independent index build and row-count verification.
2. Excerpt-cap enforcement proof (500-char limit).
3. Cross-session capsule boundedness and non-transitivity proof.
4. Compaction does-not-touch-journals proof.
5. Index disposability evidence.
6. No-full-history-fallback evidence.
7. `nvb build` and `nvb test` output.
8. Model-free audit results.

## Acceptance Gate

The batch is accepted only when:
- SQLite index is built deterministically from journals.
- Content excerpts are capped at 500 chars.
- Every typed query works correctly with bounded pagination.
- Cross-session capsules are bounded, non-transitive, and exclude operator
  messages.
- Cross-lane capsule requests are denied.
- Compaction touches only the SQLite index, never journals or turn files.
- The index is disposable (delete + rebuild = identical logical rows).
- Missing index blocks queries; no full-history fallback.
- `nvb build` and `nvb test` pass independently.
- Zero model invocations.
- No raw SQL exposed to consumers.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Reject Conditions

Reject immediately if:
- Full turn text (beyond 500 chars) is stored in the SQLite index.
- Raw SQL is exposed to consumers (any method returns or accepts SQL strings).
- Compaction modifies session journals or turn files.
- A missing index triggers a full journal scan.
- Cross-session capsules include the operator message or transitive references.
- Cross-lane capsule requests succeed.
- The index is not disposable (rebuild produces different results).
- Build or tests fail.
- `.local/` artifacts are staged.
- The implementation agent committed.
- Any file exceeds the structural ceiling without documented reviewer acceptance.
