# Batch RM-01 — Contract Kernel And Error Taxonomy

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

Status: ❌ Pending
Phase: Contract foundation
Depends on: —

**Required implementor reasoning class:** `R4`
**Class rationale:** type system foundation and error taxonomy determine every downstream exit code. The class is a floor; escalate under the lane reasoning rules when source inspection exposes additional risk.

## Objective

Establish versioned domain types, all error codes with exit-code mappings, and
exhaustive error fixtures. This is the type foundation every other batch consumes.
No batch may begin implementation before RM-01 is accepted.

## Required Work

1. Define the domain type vocabulary in `src/contracts/types.ts`: `LaneRef`,
   `ResolvedLane`, `RepositoryRef`, `RepositoryBinding`, `WorkspaceContext`,
   `LaneManifestV1`, `LaneStatusV1`, `LaneLifecycle`, `HealthStatus`,
   `WorkerEventV1`, `WorkerEventRole`, `WorkerEventType`, and supporting types.
2. Define every error code in `src/contracts/errors.ts` as stable uppercase
   identifiers with structured payloads. Each error code carries a message
   template and an associated exit code (1-5). Include: `ERR_LANE_NOT_FOUND`,
   `ERR_AMBIGUOUS_SELECTION`, `ERR_INVALID_LANE_CONFIG`, `ERR_WORKSPACE_NOT_FOUND`,
   `ERR_PATH_ESCAPE`, `ERR_PARSE_FAILURE`, `ERR_MISSING_DEPENDENCY`,
   `ERR_MANAGED_CONFLICT`, `ERR_INTERNAL`, and all required variants.
3. Define exit-code constants and a mapping utility in `src/contracts/exitCodes.ts`.
   Export `ExitCode` as a numeric literal union (1-5). Provide a function mapping
   error codes to exit codes.
4. Create exhaustive error fixtures: one fixture per error code demonstrating
   valid construction, one fixture per error code demonstrating boundary values,
   and one fixture demonstrating malformed/invalid input rejection.
5. Update `src/contracts/index.ts` to re-export all public types, errors, and
   exit codes.

## Expected Ownership

- `src/contracts/types.ts` — domain types and their focused specs.
- `src/contracts/errors.ts` — error taxonomy and its focused specs.
- `src/contracts/exitCodes.ts` — exit-code constants and its focused specs.
- `src/contracts/index.ts` — public barrel.

## Tests And Evidence

- Unit tests for every error code construction with valid and boundary inputs.
- Tests proving exit-code mapping for every error code (no unmapped codes).
- Tests proving no exit code reuse (each error code maps to exactly one exit code).
- Tests covering every domain type with valid, invalid, and boundary fixtures.
- `nvb build` and `nvb test` pass.

## What Must Not Change

- Do not change the existing scaffold `HelloCommand` or its help.
- Do not introduce runtime, foundation, or filesystem logic into contracts.
- Do not depend on Nirvana rendering or CLI utilities in `src/contracts/`.
- Do not change the package structure or build configuration.

## Review Procedure Highlights

1. Enumerate every exported error code; verify each maps to exit codes 1-5.
2. Verify every domain type matches the schema in `v1.schema.json`.
3. Confirm no error code is unmapped or maps to multiple exit codes.
4. Verify exhaustive fixtures cover valid, boundary, and malformed cases.
5. Confirm `src/contracts/index.ts` exports all public symbols.

## Required Reasoning Posture

The assigned agent must reason from the governing specifications and current
source, not from the batch title or predecessor report alone.

- Map every requested behavior to one contract owner, one lower-layer
  implementation owner, its front-door delegation point, and focused proof.
- Enumerate invalid states, failure ordering, compatibility risks, concurrency or
  re-entrancy concerns, unsupported behavior, and likely shortcut failures.
- Inspect accepted predecessor output directly and verify assumptions against the
  current tree before planning changes or accepting claims.
- Use negative cases and counterexamples to prove that happy-path success does
  not hide missing error codes, reused exit codes, or unmapped boundary cases.
- Escalate unresolved spec/source contradictions through a correction brief.
  Never guess a new public contract inside implementation code.

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

The implementation report must make independent verification possible.
It must include:

- exact changed files and the ownership role of each
- physical line counts for every new or materially rewritten source/spec file
- a responsibility inventory for every warning-band file
- exact commands and actual results for focused and regression proof
- final tracker/roadmap state, final git status, and proof that local reports are
  not staged
- unresolved limitations or deferred questions stated honestly

## Completion And Handoff

The error taxonomy is complete with versioned IDs, exit-code mappings, and
exhaustive fixtures. Every domain type is defined and matches the schema bundle.
RM-02 through RM-05 may begin in parallel; they consume the accepted types and
error codes. Verify that `src/contracts/index.ts` exports all symbols required
by downstream batches.
