# Review Batch CA-16 — Session SQLite index, references, pins, and compaction

## Synchronized batch execution matrix

- **Accepted-map title:** Session SQLite index, references, pins, and compaction
- **Dependencies:** `CA-02`, `CA-15`
- **Exclusive ownership/interface:** session memory foundation
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Bounded metadata/excerpts; exact text remains journal-owned; same-lane capsules; no full-history fallback
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-16-session-sqlite-index-references-pins-and-compaction.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-16-session-sqlite-index-references-pins-and-compaction-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-16-session-sqlite-index-references-pins-and-compaction-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **session memory foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-16-session-sqlite-index-references-pins-and-compaction-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-02`, `CA-15`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Bounded metadata/excerpts; exact text remains journal-owned; same-lane capsules; no full-history fallback**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **session memory foundation** and **Bounded metadata/excerpts; exact text remains journal-owned; same-lane capsules; no full-history fallback**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-16-session-sqlite-index-references-pins-and-compaction-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-16-session-sqlite-index-references-pins-and-compaction-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
