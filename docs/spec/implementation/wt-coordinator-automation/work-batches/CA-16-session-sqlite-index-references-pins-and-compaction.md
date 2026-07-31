# Batch CA-16 — Session SQLite Index, References, Pins, and Compaction

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
Pack: wt-coordinator-automation (Pack 5)
Phase: Session memory foundation
Depends on: CA-02, CA-15 accepted
Owned files: `src/foundation/SessionIndexes.ts`, `src/foundation/SessionCompaction.ts`

**Required implementor reasoning class:** `R5`
**Class rationale:** SQLite-backed session indexes storing bounded metadata and excerpts, cross-session turn reference capsules, compaction with source-turn preservation, and the critical constraint that exact full text remains journal-owned — index is derived and disposable. No full-history fallback. No raw SQL from consumers. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Build SQLite-backed session indexes that store bounded metadata and excerpts
(turn ID, timestamp, kind, first 500 chars of content, pin status) while exact
full text remains in the append-only journal files. Implement same-lane
cross-session reference capsules — loading one bounded non-transitive capsule,
not transitive history. Implement compaction — pruning old indexes while
preserving pinned and recent turns. The SQLite store is disposable derived
infrastructure; sessions.sqlite is never session authority.

## Required Work

1. **Read the normative session index and compaction contracts.** Study
   `operator-session.md` §11.2 for session indexes. Study `operator-session.md`
   §10.2 for cross-session turn reference capsules. Study `operator-session.md`
   §12 for compaction. Study `coordinator-automation.md` §9 for the SQLite
   index contract (bounded queries, typed access, no raw SQL). Study accepted
   CA-02 for the SQLite index store and bounded typed query contracts. Study
   accepted CA-15 for session journal and turn format.

2. **Implement `src/foundation/SessionIndexes.ts`:**
   - `SessionIndexBuilder` class — builds the derived `sessions.sqlite` index
     from the append-only session journals and turn directories.
   - **SQLite schema:**
     - `operator_sessions` table: `operator_session_id` (TEXT PK), `lane_id`,
       `origin`, `policy_profile_id`, `state`, `topic`, `created_at`,
       `last_turn_at`, `turn_count`, `parent_operator_session_id`,
       `budget_segment_id`, `journal_checkpoint` (last journal offset),
       `content_root` (filesystem directory path).
     - `session_pins` table: `operator_session_id`, `ref_type` (batch|event|
       requirement|finding|turn|artifact), `ref_value`, `pinned_at`.
     - `turns` table: `turn_id` (TEXT PK), `operator_session_id`, `turn_number`,
       `state`, `decision_class`, `routing_rule_id`, `endpoint_id`,
       `snapshot_revision`, `stale`, `completed_at`, `content_excerpt`
       (first 500 chars of operator message), `answer_excerpt` (first 500
       chars of coordinator answer), `input_tokens`, `output_tokens`,
       `telemetry_quality`, `operator_bytes`, `coordinator_bytes`.
     - `turn_refs` table: `turn_id`, `ref_type`, `ref_value`.
     - `turn_open_questions` table: `turn_id`, `question_index`, `question_text`.
     - `session_proposals` table: `proposal_id` (TEXT PK),
       `operator_session_id`, `source_turn_id`, `proposal_type`, `state`,
       `created_at`, `expires_at`.
     - `turn_reference_capsules` table: `source_turn_id`, `capsule_json`
       (bounded JSON capsule per `operator-session.md §10.2`), `created_at`.
   - **Index build:**
     - `build(storePath: string, sessions: OperatorSession[]): BuildResult` —
       scans all operator-session directories, reads `operator-session.json`
       for each session, reads the `journal.jsonl` for turn metadata, and
       populates the SQLite tables. Build is deterministic — same journals
       produce the same logical rows. Raw SQLite file bytes may differ.
     - Build is model-free and requires no model invocation.
     - `BuildResult` type: `{sessions, turns, pins, proposals, semanticRoot,
       builtAt}`.
   - **Incremental update:**
     - `incrementalUpdate(storePath: string, sessionId: string,
       journalCheckpoint: string): UpdateResult` — reads only new journal
       entries since the last checkpoint and updates index rows. Does not
       rebuild the entire index.
   - **Bounded typed queries (no raw SQL from consumers):**
     - `getSession(sessionId: string): SessionIndexRecord`
     - `listSessions(filters: SessionFilters): SessionIndexRecord[]`
     - `getTurn(turnId: string): TurnIndexRecord`
     - `listTurns(sessionId: string, filters: TurnFilters): TurnIndexRecord[]`
     - `getTurnExcerpt(turnId: string): string` — returns the stored content
       excerpt (first 500 chars). If the full text is needed, the consumer
       must read the journal directly.
     - `getPin(sessionId: string, refType: string, refValue: string): PinRecord | null`
     - `listPins(sessionId: string): PinRecord[]`
     - `getProposal(proposalId: string): ProposalRecord`
     - `listProposals(sessionId: string): ProposalRecord[]`
     - Every query is bounded (limit, offset/cursor, max bytes) and declared.
       No unbounded full-table scans are exposed.
   - **Index manifest:**
     - Written as `coordinator/index/sessions/index-manifest.json` matching
       `coordinator-automation.md §9.3`. Includes database schema version,
       lane ID, journal checkpoints, counts, and `semanticRoot`.
   - **Disposability:** The entire `sessions.sqlite` can be deleted and rebuilt
     from the journals. The index manifest records this contract. No
     authoritative data lives only in the index.

3. **Implement `src/foundation/SessionCompaction.ts`:**
   - `SessionCompactor` class — manages compaction of session indexes.
   - `compact(sessionId: string, options: CompactOptions): CompactResult` —
     prunes old turn index rows while preserving: pinned turns, recent turns
     (within configurable count or time window), turns referenced by active
     proposals, and turns explicitly marked for retention. Compaction only
     affects the SQLite index rows; the append-only journal and turn files
     are NOT modified.
   - `CompactOptions` type: `{keepRecentTurns: number, keepRecentDays: number,
     keepPinnedOnly: boolean, keepProposalSourceTurns: boolean}`.
   - `CompactResult` type: `{turnsRemoved, turnsKept, bytesFreed}`.
   - **Compaction preview:** `previewCompact(sessionId: string, options:
     CompactOptions): CompactPreview` — shows what WOULD be removed without
     actually removing. Dry-run for compaction decisions.
   - **No full-history fallback:** If the index is stale, missing, or corrupt,
     the caller must request a rebuild. The compactor must not fall back to
     scanning all journal files directly.

4. **Cross-session turn reference capsules:**
   - `buildTurnCapsule(sourceTurnId: string, requestingSessionId: string):
     TurnReferenceCapsule` — builds a bounded capsule for cross-session
     reference per `operator-session.md §10.2`: operator-session and turn
     identity, timestamp, decision class, routing alias, snapshot revision,
     resolved evidence references, staleness, open questions, proposal IDs
     and types only, and a byte-capped answer excerpt (500 chars) with
     complete answer digest and original byte length.
   - The capsule is explicitly labeled incomplete when truncated. No model
     is invoked to summarize. The operator message is NOT included in the
     capsule.
   - Transitive references are NOT expanded — the capsule is non-transitive.
   - Cross-lane references fail with `OPERATOR_SESSION_REFERENCE_DENIED`.
   - Pruned source content resolves to its tombstone and
     `OPERATOR_SESSION_CONTENT_PRUNED`.
   - Capsule bytes are counted against the current turn's context budget.

5. **Error taxonomy:**
   - `SESSION_INDEX_BUILD_FAILED` — index build encountered an unrecoverable
     error.
   - `SESSION_INDEX_STALE` — journal checkpoint mismatch; rebuild required.
   - `SESSION_INDEX_CORRUPT` — index schema, counts, or cross-references fail
     verification.
   - `SESSION_INDEX_STORE_UNAVAILABLE` — SQLite driver, lock, or permissions
     unavailable.
   - `SESSION_INDEX_STORE_BUSY` — SQLite busy timeout exceeded.
   - `OPERATOR_SESSION_REFERENCE_DENIED` — cross-lane reference or unauthorized
     access.
   - `OPERATOR_SESSION_CONTENT_PRUNED` — requested turn content is no longer
     retained.

## Expected Ownership

- `src/foundation/SessionIndexes.ts` — owns the SQLite session index schema,
  build, incremental update, bounded typed queries, and cross-session capsules.
- `src/foundation/SessionCompaction.ts` — owns index compaction (prune old,
  preserve pinned/recent) with preview and the no-full-history-fallback
  constraint.
- No other module may query session metadata through SQL or bypass the typed
  query layer. No consumer writes raw SQL.

## Tests And Evidence

- **Index build:** Populate a session directory with multiple sessions and
  turns. Build the index. Verify correct row counts, content excerpts (first
  500 chars), and semantic root determinism (same input → same logical rows).
- **Incremental update:** Add new turns to an existing session. Run incremental
  update. Verify only new turns are indexed; existing rows are unchanged.
- **Bounded queries:** Test every query method with valid parameters. Verify
  results match the underlying journal data. Test pagination with limit and
  cursor.
- **Excerpt caps:** Verify `content_excerpt` and `answer_excerpt` are exactly
  first 500 chars (or the full content if shorter). Prove truncation is
  detectable.
- **Cross-session capsule:** Build a capsule for turn X requested by session Y.
  Verify the capsule contains turn identity, decision class, snapshot revision,
  open questions, proposal IDs, and the first 500 chars of the answer. Verify
  the operator message is NOT included. Verify the complete answer digest is
  present and accurate.
- **Non-transitive:** Request a capsule for a turn that itself references
  another turn. Prove the capsule does not include the referenced turn's
  content.
- **Cross-lane denial:** Build a capsule referencing a turn in a different
  lane. Prove `OPERATOR_SESSION_REFERENCE_DENIED`.
- **Pruned content:** Build a capsule for a turn whose full text has been
  pruned. Prove it resolves to `OPERATOR_SESSION_CONTENT_PRUNED` tombstone.
- **Compaction:** Index 100 turns. Compact keeping the 20 most recent plus 5
  pinned turns. Verify only 25 turns remain in the index. Verify the journal
  files are unaffected (turns still exist on disk).
- **Compaction preview:** Preview compaction. Verify the preview correctly
  lists which turns would be removed without actually removing them.
- **Index disposable:** Delete `sessions.sqlite`. Rebuild from journals.
  Verify the rebuild produces identical logical rows (same semantic root).
- **No full-history fallback:** Delete `sessions.sqlite`. Attempt a query.
  Prove it fails with `SESSION_INDEX_MISSING` rather than scanning journals.
- **Model-free proof:** No model invocation in session-indexes or
  session-compaction.

## What Must Not Change

- Do not store full turn text in the SQLite index — only excerpts (500 chars
  max).
- Do not expose raw SQL to consumers — all access is through typed queries.
- Do not modify session journals or turn files during compaction.
- Do not implement session routing, budgets, proposals, or holds — that is
  CA-17.

## Review Procedure Highlights

1. Independently build the index and verify row counts, excerpts, and
   semantic-root determinism.
2. Prove incremental update only touches changed data.
3. Prove cross-session capsules are bounded and non-transitive.
4. Prove compaction preserves pinned/recent turns and never touches journals.
5. Prove the index is disposable — delete and rebuild yields identical logical
   rows.

---

## Required Reasoning Posture

The session SQLite index is derived infrastructure that must never become the
authoritative source for session data. A query that silently returns incomplete
results, a capsule that includes transitive turn history, or a compaction that
affects journal files would violate the separation of index and authority. The
implementor must reason about every query boundary, every excerpt truncation
point, and every capsule construction rule.

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

1. Implementation report in `.local/agent-reports/coordinator-automation/`.
2. All `nvb build` and `nvb test` output.
3. Targeted test results for every required proof above.
4. Index disposability evidence (delete + rebuild).
5. Capsule boundedness and non-transitivity evidence.

## Completion And Handoff

- Implementation report, updated tracker/roadmap.
- CA-17 consumes the session index for routing, budgets, and proposals; CA-20
  consumes it for bounded conversation/history/references; CA-24 owns final
  session command integration.
- Leave the exact SQLite schema, typed query signatures, capsule format, and
  compaction rules for the next agent.
