# Review Batch LC-02 — Pack Acceptance, Seal, and Drift Validation

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
Paired work brief: `work-batches/LC-02-pack-acceptance-seal-and-drift-validation.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-02-pack-acceptance-seal-and-drift-validation.md`

## Scope Verification

- [ ] `src/foundation/PackConsumer.ts` created with JSON Schema validation for `implementation-pack.json`, `implementation-pack.lock.json`, `pack-acceptance.json`
- [ ] `src/foundation/PackSeal.ts` created with RFC 8785 canonicalization, seal reproduction, drift classification matrix
- [ ] Pack consumer validates file sets: regular files pass, symlinks/devices/sockets/untracked/ignored rejected
- [ ] Pack seal implements correct drift codes: `PACK_BYTES_CHANGED`, `PACK_FILESET_CHANGED`, `ACCEPTED_INPUT_CHANGED`, `SOURCE_BASELINE_CRITICAL`, `SOURCE_BASELINE_UNRELATED`, `SOURCE_BASELINE_UNAVAILABLE`
- [ ] No model invocation for drift classification — purely mechanical
- [ ] No mutation of any filesystem path — read-only validation
- [ ] No product logic in `src/cli.ts`

## Required Independent Proof

1. JSON Schema validation:
   - `implementation-pack.json`: valid fixture passes; invalid with missing `schemaVersion` rejected; invalid with duplicate batch IDs rejected; invalid with missing requirement coverage rejected.
   - `implementation-pack.lock.json`: valid fixture passes; tampered digest rejected; truncated file rejected; duplicate file paths rejected.
   - `pack-acceptance.json`: valid fixture passes; non-accept verdict rejected; open critical findings rejected.
2. File-set validation: normal regular files pass; symlink rejected; device node rejected; socket rejected; untracked file rejected; ignored file rejected; paths outside pack root rejected; non-UTF-8 paths rejected.
3. RFC 8785 canonicalization: independently verify against known-good test vectors. Produce canonical bytes and compare against reference implementation or known-good outputs. Verify key sorting by code-point order. Verify number serialization without exponential notation.
4. Seal reproduction: build a seal input from a known-good fixture, compute the seal, compare against the locked seal in the fixture. Seal mismatch: modify one file in the fixture, verify seal computation no longer matches.
5. Drift code matrix: for each of the six drift codes, create a representative fixture and verify the correct code is produced:
   - `PACK_BYTES_CHANGED`: modify a sealed file's contents
   - `PACK_FILESET_CHANGED`: add or remove a file from the pack
   - `ACCEPTED_INPUT_CHANGED`: modify the acceptance record's input digests
   - `SOURCE_BASELINE_CRITICAL`: change a file that intersects a writable batch claim
   - `SOURCE_BASELINE_UNRELATED`: change a file outside writable batch claims
   - `SOURCE_BASELINE_UNAVAILABLE`: remove a repository needed for baseline
6. Lock verification: missing sealed file detected; digest mismatch detected; extra file in pack detected.
7. Adversarial tests: lock referencing files outside pack root rejected; manifest with zero batches rejected; acceptance with future commit ID rejected.
8. Run `nvb build` and `nvb test` independently. Confirm focused specs pass.
9. Verify no model invocation anywhere in pack-consumer or pack-seal. Search imports and function bodies.

## Required Reasoning Posture

The reviewer must independently reproduce seal computation and drift
classification. Do not trust the implementation report's claims about RFC 8785
correctness — verify against known-good test vectors. The drift matrix must be
exhaustively tested: every code must have at least one fixture that produces it
and at least one fixture where it should NOT be produced. Verify that drift
classification is purely mechanical (no model, no heuristic judgment).

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
drift matrix coverage table (every code, fixture name, expected result, actual result),
RFC 8785 verification details, structural verification results, line-count
verification, tracker/roadmap sync status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- JSON Schema validation correct for all three document types.
- RFC 8785 canonicalization verified against known-good vectors.
- Seal reproduction matches locked seal on known-good fixtures.
- All six drift codes tested with representative fixtures.
- File-set validation rejects all invalid path classes.
- No model invocation for drift classification.
- No filesystem mutations.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.

## Reject Conditions

- Incorrect RFC 8785 implementation (key ordering, number formatting, Unicode normalization).
- Drift code produced for wrong condition or missed for correct condition.
- Model invocation for any validation or classification.
- Filesystem mutation during validation.
- Missing drift code coverage.
- `any`-typed public interfaces.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
