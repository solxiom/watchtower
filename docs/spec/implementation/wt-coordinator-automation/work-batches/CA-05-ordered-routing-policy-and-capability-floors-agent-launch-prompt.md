# Agent Launch Prompt — Work Batch CA-05

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for ordered routing policy implementation with first-match determinism and capability-floor enforcement`
- primary: `GPT-5.4`, `Claude Opus 4.1`, `Claude Sonnet 4.6`
- good alternatives: `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
that can load the complete brief/spec/source context, inspect and edit the
repository with tools, reason across ordered rule evaluation, first-match
determinism, and capability-floor enforcement, and run the required proof.

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

You are assigned **implementation work batch CA-05** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch implements the complete v1 routing policy: every rule/guard in the
normative decision-class table, first-match determinism, and D1/C2, D2/C3,
D3/C5 minimum capability floors. Classify only — never execute effects.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-05-ordered-routing-policy-and-capability-floors.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md`
5. `docs/spec/v1-contracts.md` — especially §4 (complete routing rule table, 15 rules, first-match determinism, capability scale C2/C3/C5)
6. `docs/spec/architecture.md` — especially §4.8 (coordinator decision plane services)
7. `docs/spec/coordinator-automation.md` — especially §6 (decision classes), §7 (routing policy)
8. `docs/spec/schemas/v1.schema.json`
9. `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`
10. `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
11. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
12. `docs/spec/v1-implementation-map.md` — section 8 (CA-05)
13. Accepted CA-04 ready-set projection — `ReadySetResult` shape
14. Accepted RT-02 runtime/knowledge manifests — policy version and digest
15. the canonical source owners you will actually change:
    - `src/foundation/capability-floors.ts` (create)
    - `src/foundation/routing-policy.ts` (create)
    - `spec/basic/routing-policy-spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for ordered routing policy and capability-floor enforcement`
- primary: `GPT-5.4`, `Claude Opus 4.1`, `Claude Sonnet 4.6`
- good alternatives: `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   15 routing rules, their guard conditions, first-match order, and capability
   floor mappings.
2. Inspect the current source. Do not infer behavior from filenames.
3. Enumerate public invariants: first-match determinism; every rule produces a
   decision class and matched rule ID; capability escalation only, never
   silent downgrade; M0 routes never invoke a model.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating first-match order or capability floors.
5. When a spec and current source disagree, stop that line of implementation.
6. Treat predecessor reports as leads, not proof.

## Structural Design And Module-Size Gate

- Front doors and public barrels target 160 lines or fewer. Files from 161
  through 220 lines require an explicit cohesion justification.
- Focused implementation modules target 220 lines or fewer. Files from 221
  through 300 lines require a responsibility inventory.
- Four hundred physical lines is the absolute ceiling.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
- Record physical line counts for every new or materially rewritten file.

## Your Mission

Implement the v1 routing policy with capability floors:

1. Create `src/foundation/capability-floors.ts` with `CapabilityFloor` enum
   (C2, C3, C5), `DecisionClass` enum (M0, D1, D2, D3),
   `minimumCapabilityForClass`, `validateEndpointCapability`, and
   `classifyEndpointTier`. Pure functions — no I/O, no state.

2. Create `src/foundation/routing-policy.ts` with `RoutingPolicy` class.
   Implement all 15 routing rules from `v1-contracts.md §4` in exact priority
   order. Each rule is a pure guard function. `classifyTrigger` evaluates
   trigger facts against every rule and returns the first match's decision class.

3. Implement `TriggerContext`, `RouteDecision`, and `RuleId` types.

4. Classification only — no execution, no model invocation, no state mutation.

5. Write focused Jasmine specs covering: every rule order, first-match
   determinism, every trigger/guard combination, capability-floor enforcement,
   D1→C2/D2→C3/D3→C5 mappings, M0 for no-event/idle-poll, operator escalation
   cannot downgrade below knowledge-pack minimum, and invalid/out-of-schema
   results escalate.

## What You Must Not Do

- Do not invoke any model, LLM, or AI.
- Do not execute effects or mutate state.
- Do not modify CA-04 ready-set types or RT-02 manifest types.
- Do not modify `src/cli.ts` or any command file.
- Do not commit.

## Required Proof

- `nvb build` passes
- `nvb test` passes
- All 15 routing rules evaluated in correct order
- First-match determinism: same trigger → same rule matched every time
- Every guard condition tested with positive and negative fixtures
- Capability floors: D1→C2, D2→C3, D3→C5
- M0 classification for no-event, heartbeat-only, and uniquely-preauthorized triggers
- Operator escalation cannot downgrade below knowledge-pack minimum
- Invalid/out-of-schema trigger escalates, never coerced
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

- Classification only — no execution, no model invocation, no state mutation.
- First-match determinism with explicit rule ordering.
- Capability escalation only — never silently downgrade below policy minimum.
- M0 routes never invoke a model.
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-05-ordered-routing-policy-and-capability-floors.md`

The report must include: documents studied, exact files changed, physical line
counts, proof commands and outcomes, final `git status --short`, and one proposed
commit message for the reviewer.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

State: which files were created/changed, the complete routing rule registry
(all 15 rules with guard conditions and decision classes), the capability-floor
mappings, which proofs passed, and what the CA-06 (endpoint adapter eligibility)
agent needs to know about `DecisionClass`, `RouteDecision`, and how endpoint
eligibility interacts with routing decisions.
