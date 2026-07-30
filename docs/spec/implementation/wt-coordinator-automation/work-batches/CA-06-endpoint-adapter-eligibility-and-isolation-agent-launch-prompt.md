# Agent Launch Prompt — Work Batch CA-06

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for endpoint adapter classification, eligibility proof, and provider-neutral isolation`
- primary: `GPT-5.4`, `Claude Opus 4.1`, `Claude Sonnet 4.6`
- good alternatives: `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
that can load the complete brief/spec/source context, inspect and edit the
repository with tools, reason across adapter classification, eligibility
verification, and isolation boundaries, and run the required proof.

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

You are assigned **implementation work batch CA-06** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch builds the provider-neutral endpoint adapter layer that classifies
every adapter as unattended, advisory-confirmed, or skill-only, and proves
adapter eligibility before any unattended invocation.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-06-endpoint-adapter-eligibility-and-isolation.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md`
5. `docs/spec/v1-contracts.md` — especially §6 (complete adapter contract, 10 requirements for unattended eligibility)
6. `docs/spec/architecture.md` — especially §4.8 (coordinator decision plane services)
7. `docs/spec/coordinator-automation.md` — especially §8 (endpoint invocation), §9 (adapter isolation), §16 (endpoint routing and allocation)
8. `docs/spec/schemas/v1.schema.json`
9. `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`
10. `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
11. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
12. `docs/spec/v1-implementation-map.md` — section 8 (CA-06)
13. Accepted RT-05 runtime invocation adapter — argv/env/cwd contract
14. Accepted CA-05 routing policy — `DecisionClass`, `RouteDecision` types
15. the canonical source owners you will actually change:
    - `src/foundation/endpoint-adapter.ts` (create)
    - `src/foundation/endpoint-eligibility.ts` (create)
    - `spec/basic/endpoint-adapter-spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for endpoint adapter classification and eligibility verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`, `Claude Sonnet 4.6`
- good alternatives: `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   adapter interface, the 10 unattended-eligibility requirements, and the
   classification modes.
2. Inspect the current source. Do not infer behavior from filenames.
3. Enumerate public invariants: unattended adapters must pass all 10 checks;
   advisory-confirmed adapters may be eligible for operator-supervised use;
   skill-only adapters can only install knowledge; a misclassified adapter
   must not reach the decision envelope or effect executor.
4. Use counterexamples: identify at least one shortcut that would mark an
   adapter as eligible without verifying argv safety or env allowlisting.
5. When a spec and current source disagree, stop that line of implementation.
6. Treat predecessor reports as leads, not proof.

## Structural Design And Module-Size Gate

- Front doors and public barrels target 160 lines or fewer.
- Focused implementation modules target 220 lines or fewer.
- Four hundred physical lines is the absolute ceiling.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
- Record physical line counts for every new or materially rewritten file.

## Your Mission

Build the provider-neutral endpoint adapter layer:

1. Create `src/foundation/endpoint-adapter.ts` with the `EndpointAdapter`
   interface — `adapterId`, `hostBrand`, `classification`, `installKnowledge`,
   `invokeAdvisory`, `invokeUnattended`, `isHealthy`, `getTelemetry`,
   `validateEligibility`. Define `AdapterClassification`, `UsageTelemetry`,
   and `EligibilityReport` types.

2. Create `src/foundation/endpoint-eligibility.ts` with
   `EndpointEligibilityChecker` and `proveUnattendedEligibility` — verifies
   ALL 10 requirements from `v1-contracts.md §6`: pinned compatible
   executable/version, argv-array invocation with no shell evaluation, explicit
   cwd and environment allowlist, bounded timeouts, output capture with size
   limits, signal forwarding, exit-code verification, streaming fallback,
   usage telemetry, and no credential materialization.

3. Classification is mandatory before any unattended invocation. Adapters
   default to skill-only unless proven eligible.

4. Write focused Jasmine specs covering: every adapter classification,
   eligibility pass/fail for all 10 requirements, unattended vs
   advisory-confirmed vs skill-only classification, misclassified adapter
   blocking, and adapter isolation proof.

## What You Must Not Do

- Do not invoke any model, LLM, or AI.
- Do not implement concrete adapters for specific providers (Codex, Cursor,
  Claude) — define the interface and eligibility checker only.
- Do not modify RT-05 runtime invoker or CA-05 routing policy types.
- Do not modify `src/cli.ts` or any command file.
- Do not commit.

## Required Proof

- `nvb build` passes
- `nvb test` passes
- All 10 eligibility requirements independently verifiable
- Adapter defaults to skill-only until proven
- Unattended eligibility pass requires all 10 checks
- Misclassified adapter cannot reach invocation path
- Classification is pure — no I/O, no state
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

- Classification is pure — no I/O, no state, no model.
- No adapter is unattended-eligible until proven.
- Skill-only is the safe default.
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-06-endpoint-adapter-eligibility-and-isolation.md`

The report must include: documents studied, exact files changed, physical line
counts, proof commands and outcomes, final `git status --short`, and one proposed
commit message for the reviewer.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

State: which files were created/changed, the complete `EndpointAdapter`
interface, all 10 eligibility requirements, which proofs passed, and what the
CA-07 (immutable decision envelopes) agent needs to know about adapter
classification modes and how they affect envelope construction.
