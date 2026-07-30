# Agent Launch Prompt — Work Batch CA-10

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for sole effect authority design with lock/revalidation/idempotency and crash-safe journal append`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
that can load the complete brief/spec/source context, inspect and edit the
repository with tools, reason across lock acquisition, revalidation, all-or-
nothing execution, and crash recovery, and run the required proof.

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

You are assigned **implementation work batch CA-10** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch implements the atomic lane-local effect executor — the ONE authority
for all lane state mutations, journal writes, and projection updates. Every
effect passes through lock acquisition, current-state revalidation, idempotency
verification, all-or-nothing execution, and fsynced journal append.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-10-atomic-lane-local-effect-executor.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md`
5. `docs/spec/v1-contracts.md` — especially §5 (effect registry, idempotency keys, proposal-to-effect mapping), §11 (locking, transactions, recovery rules)
6. `docs/spec/architecture.md` — especially §4.8 (coordinator decision plane services), §6.4 (coordinator cycle flow)
7. `docs/spec/coordinator-automation.md` — especially §12 (validation and effect execution), §13 (acceptance and publication)
8. `docs/spec/schemas/v1.schema.json`
9. `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`
10. `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
11. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
12. `docs/spec/v1-implementation-map.md` — section 8 (CA-10)
13. Accepted LC-03 transactional lane layout — lock/tx contract
14. Accepted CA-09 proposal validator — `ProposalValidationResult`, validated proposals
15. the canonical source owners you will actually change:
    - `src/foundation/effect-plan.ts` (create)
    - `src/foundation/effect-executor.ts` (create)
    - `spec/basic/effect-executor-spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for sole effect authority and crash-safe journal append`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   effect types, planner stages, executor lock/revalidation/idempotency checks,
   and journal-append steps.
2. Inspect the current source. Do not infer behavior from filenames.
3. Enumerate public invariants: exactly one effect authority exists; lane-local
   mutations commit atomically under the lane lock; external effects use
   prepare/attempt/verify journal states; idempotency keys prevent re-execution;
   all-or-nothing — never a partial lane mutation; current-state revalidation
   immediately before commit; the executor writes authoritative event journals.
4. Use counterexamples: identify a shortcut that would bypass idempotency checking
   or commit a lane mutation without revalidating current state.
5. When a spec and current source disagree, stop that line of implementation.
6. Treat predecessor reports as leads, not proof.

## Structural Design And Module-Size Gate

- Front doors and public barrels target 160 lines or fewer.
- Focused implementation modules target 220 lines or fewer.
- Four hundred physical lines is the absolute ceiling.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
- Record physical line counts for every new or materially rewritten file.

## Your Mission

Implement the atomic lane-local effect executor:

1. Create `src/foundation/effect-plan.ts` with `EffectPlanner`:
   - `createEffectPlan(proposal, validation)` — derives bounded effects from a
     valid proposal.
   - `EffectPlan`, `BoundedEffect`, `EffectParams`, `Precondition`, `Postcondition`,
     and `EffectPreview` types.
   - Each effect type has specific `EffectParams` derived from the proposal body.
   - `previewEffectPlan(plan)` — human-readable preview without execution.

2. Create `src/foundation/effect-executor.ts` with `EffectExecutor`:
   - `executeEffectPlan(plan): EffectResult` — the sole mutating entry point:
     1. Acquire lane lock.
     2. Revalidate current state against preconditions (state unchanged since
        proposal validation).
     3. Verify idempotency key not already committed.
     4. Execute all bounded effects in order (all-or-nothing).
     5. Lane-local mutations: atomic projection/journal writes.
     6. External effects (tmux launch, Git push): prepare/attempt/verify
        journal states.
     7. Append effect result and usage journal entries.
     8. Fsync journals and projections.
     9. Release lane lock.
   - `rollbackEffectPlan(plan, partialResult)` — if any effect fails, rollback
     completed lane-local effects (projections/journals) and record the failure.
   - `verifyEffectResult(result): EffectVerification` — postcondition check.

3. Implement the complete effect registry: all effect types from
   `v1-contracts.md §5` mapped to concrete execution logic.

4. Write focused Jasmine specs covering: lock acquisition/release, current-state
   revalidation (state changed → reject), idempotency-key duplicate rejection,
   all-or-nothing execution (partial failure → rollback), lane-local atomic
   commit, external-effect prepare/attempt/verify journal states, crash
   recovery from journal, and preview without mutation.

## What You Must Not Do

- Do not invoke any model, LLM, or AI.
- Do not allow multiple concurrent mutating cycles for one lane.
- Do not apply effects without all preconditions passing.
- Do not skip idempotency verification.
- Do not modify CA-09 proposal validator types or LC-03 locking contract.
- Do not modify `src/cli.ts` or any command file.
- Do not expose raw mutation commands through the public CLI.
- Do not commit.

## Required Proof

- `nvb build` passes
- `nvb test` passes
- Lock acquisition prevents concurrent mutation
- Current-state revalidation: state changed → effect rejected
- Idempotency key duplicate → rejected
- All-or-nothing: partial failure → complete rollback of lane-local effects
- Lane-local effects commit atomically under lane lock
- External effects use prepare/attempt/verify journal states
- Crash recovery: interrupted execution recovers from journal state
- Effect preview produces correct human-readable output without mutation
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

- Exactly one effect authority for a lane.
- All preconditions revalidated immediately before commit.
- Idempotency key verified before every effect.
- All-or-nothing: partial failure → complete lane-local rollback.
- External effects use prepare/attempt/verify journals.
- No raw mutation commands exposed through public CLI.
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-10-atomic-lane-local-effect-executor.md`

The report must include: documents studied, exact files changed, physical line
counts, proof commands and outcomes, final `git status --short`, and one proposed
commit message for the reviewer.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

State: which files were created/changed, the complete effect registry (all
effect types mapped to execution logic), the executor contract (lock →
revalidate → idempotency → execute → journal → fsync → unlock), the external-
effect prepare/attempt/verify journal model, which proofs passed, and what the
CA-11 (tmux prepare/attempt/verify effect adapter) agent needs to know about
the effect executor interface and how external effects are dispatched.
