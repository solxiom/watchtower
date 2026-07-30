# Review Batch CA-01 — Deterministic Sealed-Pack SQLite Compiler

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
Paired work brief: `work-batches/CA-01-deterministic-sealed-pack-sqlite-compiler.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-01-deterministic-sealed-pack-sqlite-compiler.md`

## Scope Verification

- [ ] `src/foundation/PackIndex.ts` created with all domain types
- [ ] `src/foundation/PackIndexWriter.ts` created as the narrow pack-index
      schema/write/integrity/logical-export capsule behind DB-01 ports
- [ ] `src/foundation/PackIndexCompiler.ts` created with `compilePackIndex`, `verifyPackSeal`, `computeSemanticRoot`, `publishIndex`
- [ ] Complete SQLite schema defined: artifact, batch, batch_repository, dependency, requirement, batch_requirement, repository, proof, index_meta tables with FK constraints
- [ ] Staged write-then-rename publication contract implemented
- [ ] Semantic root computed from logical rows, never raw SQLite bytes
- [ ] Seal-drift detection implemented
- [ ] All error codes implemented (13 codes including SQLite-specific)
- [ ] No model/AI imports in compiler or index modules
- [ ] `PackIndexWriter` uses DB-01 focused ports; only DB-01's driver capsule
      imports the selected driver or owns driver-specific primitives, and only
      `PackIndexWriter.ts` owns pack-index SQL

## SQLite-Specific Verification

- [ ] Resolve the selected package from DB-01's ADR and prove it is imported
      only by DB-01's driver capsule; prove pack-index SQL is confined to
      `PackIndexWriter.ts`, never `PackIndexCompiler.ts` or consumers
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
8. Verify no model/AI imports. Verify DB-01 focused-port usage and no selected
   driver package import in CA-01.
9. Verify `git log` shows the implementation agent did not commit.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. Inspect every file independently.
Verify the semantic-root algorithm does not depend on raw SQLite bytes. Verify
the FK constraints are actually enforced (insert a row with a broken FK and
prove it is rejected).

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
