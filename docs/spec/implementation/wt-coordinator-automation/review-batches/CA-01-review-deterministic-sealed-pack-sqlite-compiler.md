# Review Batch CA-01 — Deterministic Sealed-Pack SQLite Compiler

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/CA-01-deterministic-sealed-pack-sqlite-compiler.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-01-deterministic-sealed-pack-sqlite-compiler.md`

## Scope Verification

- [ ] `src/foundation/pack-index.ts` created with all domain types
- [ ] `src/foundation/pack-index-compiler.ts` created with `compilePackIndex`, `verifyPackSeal`, `computeSemanticRoot`, `publishIndex`
- [ ] Complete SQLite schema defined: artifact, batch, batch_repository, dependency, requirement, batch_requirement, repository, proof, index_meta tables with FK constraints
- [ ] Staged write-then-rename publication contract implemented
- [ ] Semantic root computed from logical rows, never raw SQLite bytes
- [ ] Seal-drift detection implemented
- [ ] All error codes implemented (13 codes including SQLite-specific)
- [ ] No model/AI imports in compiler or index modules
- [ ] Uses DB-01 storage adapter; no raw SQLite access outside adapter

## SQLite-Specific Verification

- [ ] Verify no raw SQL exposed: grep `.exec(`, `.run(`, `.prepare(`, `.all(`, `.get(` — must appear ONLY in DB-01 adapter, not in `pack-index-compiler.ts`
- [ ] Verify SQLite bytes are never treated as semantic authority — `computeSemanticRoot` must export logical rows, canonicalize, and digest; must NOT hash the `.sqlite` file bytes
- [ ] Verify index is provably rebuildable: compile same sealed pack twice, export all rows from both databases, prove identical logical row sets
- [ ] Verify corruption is detected, not silently served: corrupt a staged SQLite database, prove `INDEX_STAGED_CORRUPT` and refusal to publish
- [ ] Verify no full-pack/JSON-shard fallback exists in compiler paths

## Required Independent Proof

1. Independently compile the same sealed pack from byte-identical input into two separate SQLite databases.
2. Export all logical rows from both databases. Prove row-level identity.
3. Compute the semantic root of each database. Prove they match.
4. Verify FK integrity across all tables: every artifact→batch, batch→repository, dependency edge, requirement mapping, and proof→batch resolves.
5. Simulate crash at every stage of staged publication: after temp-file write, during integrity verification, during rename. Prove active pointer is never left pointing to corrupt or partial index.
6. Verify seal-drift detection: change pack seal between compilations → `SEAL_DRIFT_DETECTED`.
7. Run `nvb build` and `nvb test`. Record output.
8. Verify no model/AI imports. Verify DB-01 adapter usage (no direct `better-sqlite3` imports).
9. Verify `git log` shows the implementation agent did not commit.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. Inspect every file independently.
Verify the semantic-root algorithm does not depend on raw SQLite bytes. Verify
the FK constraints are actually enforced (insert a row with a broken FK and
prove it is rejected).

## Structural And Module-Size Acceptance

- `src/foundation/pack-index.ts` target ≤160 lines (types only).
- `src/foundation/pack-index-compiler.ts` target ≤220 lines. Verify responsibility inventory if over 220.
- No `helpers`, `utils`, `common`, or `misc` modules.
- No raw SQLite primitives outside DB-01 adapter.

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
structural verification results, SQLite-specific verification results (raw SQL
grep, semantic-root algorithm audit, rebuild proof, corruption detection, no-
fallback grep), line-count verification, tracker/roadmap sync status, and the
acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Semantic root is provably rebuildable (identical logical rows, matching
  semantic-root digest from independent databases).
- FK integrity across all index tables verified.
- Staged write-then-rename crash-safe at every stage.
- Corrupt partial index detected and refused.
- SQLite bytes never treated as semantic authority.
- No raw SQL exposed outside storage capsule.
- No full-pack/JSON-shard fallback exists.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.

## Reject Conditions

- Semantic root computed from raw SQLite bytes instead of logical rows.
- FK constraints not enforced or not verified.
- Staged publication skips verification or writes directly to final name.
- Raw SQLite access outside the DB-01 adapter.
- Full-pack fallback path exists.
- Model/AI imports in compiler or index modules.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
