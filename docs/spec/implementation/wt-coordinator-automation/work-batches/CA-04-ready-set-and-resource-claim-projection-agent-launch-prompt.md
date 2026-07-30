# Agent Launch Prompt — Work Batch CA-04

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for DAG scheduling projection and resource-claim conflict resolution`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
that can load the complete brief/spec/source context, inspect and edit the
repository with tools, reason across DAG scheduling, resource-claim conflict
detection, and deterministic projection boundaries, and run the required proof
without replacing evidence with narrative confidence.

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

You are assigned **implementation work batch CA-04** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch calculates the ready set — pending batches whose dependencies and hard
dispatch constraints pass — and detects resource-claim conflicts that block
dispatch. Entirely model-free and deterministic.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-04-ready-set-and-resource-claim-projection.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md` — especially §7.4 (repository bindings and claim semantics)
5. `docs/spec/v1-contracts.md` — especially §4 (routing policy), §5 (ready-set role in M0/D1)
6. `docs/spec/architecture.md` — especially §3.1 (domain model), §4.8 (coordinator decision plane)
7. `docs/spec/coordinator-automation.md` — especially §5.3 (ready set versus next batch)
8. `docs/spec/schemas/v1.schema.json`
9. `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`
10. `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
11. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
12. `docs/spec/v1-implementation-map.md` — section 8 (CA-04)
13. Accepted RM-08 repository bindings and conflict inspection
14. Accepted CA-01 pack index — `BatchIndexEntry`, dependency graph
15. Accepted CA-03 journal projections — `JournalProjection` for accepted-batch tracking
16. the canonical source owners you will actually change:
    - `src/foundation/resource-claims.ts` (create)
    - `src/foundation/ready-set.ts` (create)
    - `spec/basic/ready-set-spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for DAG scheduling and resource-claim conflict resolution`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   ready-set formula, resource-claim types, conflict detection rules, and
   blocker classification.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. Enumerate public invariants: deterministic output for identical inputs; no
   arbitrary winner selection when multiple candidates are valid; every blocker
   has a specific kind and source reference.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating ownership, safety, or public result
   semantics, then ensure focused proof rejects it.
5. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process.
6. Treat predecessor reports as leads, not proof.

## Structural Design And Module-Size Gate

- Front doors and public barrels target 160 lines or fewer. Files from 161
  through 220 lines require an explicit cohesion justification. A hand-maintained
  front door over 220 lines is rejectable without a narrow pre-existing
  constraint, and no front door may exceed 300 lines.
- Focused implementation modules target 220 lines or fewer. Files from 221
  through 300 lines require a responsibility inventory and independent reviewer
  scrutiny. Files from 301 through 350 lines are expected to split. New or
  materially rewritten implementation modules above 350 lines are rejected.
- Four hundred physical lines is the absolute ceiling for every hand-maintained
  JS/TS source or spec module touched by this lane.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
- Record physical line counts for every new or materially rewritten file.

## Your Mission

Calculate the ready set and detect resource-claim conflicts:

1. Create `src/foundation/resource-claims.ts` with `ResourceClaimStore`,
   `evaluateClaimConflict`, `registerBatchClaims`, `checkWorktreeConflict`,
   `checkWritableOverlap`, and all supporting types (`ResourceClaim`,
   `ClaimConflictReport`, `ClaimBlocker`).

2. Create `src/foundation/ready-set.ts` with `computeReadySet` — computes ready
   candidates from pack index, accepted batch IDs, active claims, and endpoint
   availability. Includes `ReadySetParams`, `ReadySetResult`, and supporting
   types. Classifies each ready candidate with its blocker list when not ready.

3. Ensure no arbitrary winner selection: if multiple candidates are ready,
   report all; selection is a coordinator decision (CA-05/CA-09).

4. All operations are synchronous and model-free.

5. Write focused Jasmine specs covering: ready-set computation with all-dependencies-accepted,
   with blocked dependencies, with worktree conflicts, with capacity blockers,
   empty pack, fully accepted pack, and deterministic output proof.

## What You Must Not Do

- Do not invoke any model, LLM, or AI.
- Do not perform network I/O.
- Do not modify CA-01 pack index types, RM-08 repository binding types, or
  CA-03 journal projection interfaces.
- Do not modify `src/cli.ts` or any command file.
- Do not implement selection logic — only classification into ready/blocked.
- Do not commit.

## Required Proof

- `nvb build` passes
- `nvb test` passes
- Ready set computed correctly for 30-batch fixture pack
- All dependency blockers correctly identified
- Worktree conflict detection works for shared-write, branch, and path overlap
- Capacity blockers detected when no eligible endpoint available
- Deterministic output: same inputs → identical ReadySetResult
- No arbitrary winner: multiple ready candidates → all reported
- Model-free architecture check passes
- exact proof commands used
- final `git status --short`
- proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

- `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- Entirely model-free. No model invocation through any code path.
- Deterministic output from identical inputs.
- No arbitrary winner selection — report all ready candidates.
- Every blocker has a specific kind and source reference.
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-04-ready-set-and-resource-claim-projection.md`

The report must include: documents studied, exact files changed, physical line
counts, proof commands and outcomes, final `git status --short`, and one proposed
commit message for the reviewer.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

State: which files were created/changed, the ready-set formula and signature,
the resource-claim conflict types and detection rules, which proofs passed,
and what the CA-05 (ordered routing policy) agent needs to know about the
`ReadySetResult` shape and how it feeds into M0/D1 classification.
