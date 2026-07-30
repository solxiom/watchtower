# Agent Launch Prompt — Work Batch RM-01

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for type-system foundation work`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only
non-normative examples and may become unavailable or stale. Select a currently
available agent that can load the complete brief/spec/source context, inspect
and edit the repository with tools, reason across contract boundaries, and run
the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, or cross-module
  integration closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch RM-01** for the Watchtower v1
wt-read-model delivery lane.

This batch establishes versioned domain types, all error codes with exit-code
mappings, and exhaustive error fixtures — the type foundation every other batch
consumes.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/work-batches/RM-01-contract-kernel-and-error-taxonomy.md`
2. `docs/spec/implementation/wt-read-model/work-batches/README.md`
3. `docs/spec/implementation/wt-read-model/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md`
5. `docs/spec/v1-contracts.md`
6. `docs/spec/architecture.md`
7. `docs/spec/schemas/v1.schema.json`
8. `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
9. `docs/spec/implementation/wt-read-model/implementation-tracker.md`
10. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
11. the canonical source owners you will actually change:
    - `src/contracts/types.ts` (create)
    - `src/contracts/errors.ts` (create)
    - `src/contracts/exit-codes.ts` (create)
    - `src/contracts/index.ts` (update)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for type-system foundation work`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, types, errors, exit codes, tests, and status artifacts affected
   by this batch.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, failure precedence, concurrency
   or re-entrancy risks, compatibility constraints, and deliberately unsupported
   behavior before choosing or evaluating a design.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating ownership, safety, or public result
   semantics, then ensure focused proof rejects it.
5. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
6. Treat predecessor reports as leads, not proof. Re-open the actual changed
   files and reproduce all acceptance-critical evidence from the current tree.

## Structural Design And Module-Size Gate

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- Front doors and public barrels target 160 lines or fewer. Files from 161
  through 220 lines require an explicit cohesion justification. A hand-maintained
  front door over 220 lines is rejectable without a narrow pre-existing
  constraint, and no front door may exceed 300 lines.
- Focused implementation modules target 220 lines or fewer. Files from 221
  through 300 lines require a responsibility inventory and independent reviewer
  scrutiny. Files from 301 through 350 lines are expected to split; acceptance
  requires a source-backed reason why splitting would reduce ownership clarity.
  New or materially rewritten implementation modules above 350 lines are rejected.
- Four hundred physical lines is the absolute ceiling for every hand-maintained
  JS/TS source or spec module touched by this lane. The ceiling does not make a
  mixed-responsibility file acceptable.
- Split a module below those thresholds when it owns three or more independently
  nameable concerns.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
  Use feature-local capsules with explicit owner names.
- Record physical line counts for every new or materially rewritten file. The
  reviewer must independently verify warning-band files and reject unjustified
  growth.

## Your Mission

Establish the versioned domain type foundation and error taxonomy:

1. Create `src/contracts/types.ts` with all domain types required by v1:
   `LaneRef`, `ResolvedLane`, `RepositoryRef`, `RepositoryBinding`,
   `WorkspaceContext`, `LaneManifestV1`, `LaneStatusV1`, `LaneLifecycle`,
   `HealthStatus`, `WorkerEventV1`, `WorkerEventRole`, `WorkerEventType`,
   and supporting type aliases. Every type must have explicit TypeScript
   type annotations. No `any` types on public interfaces.
2. Create `src/contracts/errors.ts` with a complete error taxonomy. Define
   stable uppercase error codes (`ERR_LANE_NOT_FOUND`, `ERR_AMBIGUOUS_SELECTION`,
   `ERR_INVALID_LANE_CONFIG`, `ERR_WORKSPACE_NOT_FOUND`, `ERR_PATH_ESCAPE`,
   `ERR_PARSE_FAILURE`, `ERR_MISSING_DEPENDENCY`, `ERR_MANAGED_CONFLICT`,
   `ERR_INTERNAL`, and all required variants). Each error code carries a
   structured payload with message template and exit code (1-5). Create
   error factory functions that construct typed error objects.
3. Create `src/contracts/exit-codes.ts` with an `ExitCode` numeric literal
   union and a mapping function from error codes to exit codes. Document
   the mapping exhaustively.
4. Update `src/contracts/index.ts` to re-export all public types, error
   codes, and exit code utilities.
5. Write focused Jasmine specs for every error code (valid construction,
   boundary values, malformed input rejection), for the exit-code mapping
   (every error code mapped, no unmapped codes, no reused codes), and for
   domain types (valid, invalid, and boundary fixtures).

## What You Must Not Do

- Do not introduce runtime, foundation, or filesystem logic into `src/contracts/`.
- Do not depend on Nirvana rendering or CLI utilities in `src/contracts/`.
- Do not change the existing `HelloCommand` or its help.
- Do not change the package structure or build configuration.
- Do not add npm scripts or NVB tasks.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- every error code has a valid construction path
- every error code maps to exactly one exit code in 1-5
- no exit code is unmapped or reused for different error codes
- every domain type has valid, invalid, and boundary fixtures
- `nvb build` passes
- `nvb test` passes
- exact proof commands used
- final `git status --short`
- proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- every error code must be typed, stable, and mapped to exactly one exit code
- no `any`-typed public interfaces in `src/contracts/`
- do not import foundation or command modules into `src/contracts/`
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-read-model/RM-01-contract-kernel-and-error-taxonomy.md`

The report must include:

- documents studied
- exact files changed
- exact owners introduced or modified
- physical line counts for every new source/spec file
- proof commands and outcomes
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the final public error taxonomy (all codes, exit code mappings), the
domain type vocabulary, and the contents of `src/contracts/index.ts`. Make
explicit that RM-02 through RM-05 may begin in parallel and must consume
types and errors from this accepted foundation. Note any error codes that
were intentionally left for later batches to define.
