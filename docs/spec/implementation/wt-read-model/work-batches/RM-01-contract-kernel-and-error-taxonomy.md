# Batch RM-01 — Contract Kernel And Error Taxonomy

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
3. Define exit-code constants and a mapping utility in `src/contracts/exit-codes.ts`.
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
- `src/contracts/exit-codes.ts` — exit-code constants and its focused specs.
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

This batch must leave focused, named owners and must reject ball-of-mud growth,
god objects, giant coordinators, and generic overflow modules.

- Front doors and public barrels target at most 160 physical lines. The 161-220
  band requires explicit cohesion justification; over 220 is rejectable without
  a narrow pre-existing constraint, and 300 is the absolute front-door ceiling.
- Focused implementation modules target at most 220 physical lines. The 221-300
  band requires a responsibility inventory; 301-350 requires a source-backed
  reason not to split; over 350 is rejected for new or materially rewritten
  hand-maintained implementation code.
- No hand-maintained JS/TS source or spec module touched by the lane may exceed
  400 physical lines. This ceiling never excuses mixed responsibilities.
- Split below the numeric thresholds when one file combines three or more
  independently nameable concerns.
- Do not create `helpers`, `utils`, `common`, or `misc` bags.
- Record physical line counts for every new or materially rewritten file in the
  implementation report.

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
