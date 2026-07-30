# Review Batch RM-01 — Contract Kernel And Error Taxonomy

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
Reasoning: `R4`
Paired work brief: `work-batches/RM-01-contract-kernel-and-error-taxonomy.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-01-contract-kernel-and-error-taxonomy.md`

## Scope Verification

- [ ] `src/contracts/types.ts` created with all domain types from v1.md and v1.schema.json
- [ ] `src/contracts/errors.ts` created with complete error taxonomy
- [ ] `src/contracts/exitCodes.ts` created with ExitCode union and mapping
- [ ] `src/contracts/index.ts` updated to export all public symbols
- [ ] No foundation or CLI logic in `src/contracts/`
- [ ] No Nirvana rendering dependencies in `src/contracts/`

## Required Independent Proof

1. Enumerate every exported error code. Verify each maps to exactly one exit code in the 1-5 range. Prove no code is unmapped or maps to multiple exit codes.
2. Compare every domain type against `v1.schema.json` definitions. Every `$defs` entry must have a corresponding TypeScript type.
3. Verify every error code fixture: valid construction, boundary values, malformed input rejection.
4. Run `nvb build` and `nvb test`. Confirm focused specs pass.
5. Verify `src/contracts/index.ts` exports all symbols required by downstream batches.
6. Confirm no `any`-typed public interfaces exist.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. Inspect every file independently.
Compare error codes against the spec-mandated exit-code mapping table. Verify
every domain type has correct field names, types, and required/optional markers.

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
structural verification results, line-count verification, tracker/roadmap sync
status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Every error code maps to exactly one exit code.
- All domain types match v1.schema.json.
- `nvb build` and `nvb test` pass with zero failures.
- No product logic in `src/cli.ts`.
- Tracker and roadmap updated.

## Reject Conditions

- Unmapped or multiply-mapped error codes.
- Missing required field in domain types.
- `any`-typed public interfaces.
- Foundation or CLI dependencies in contracts.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
