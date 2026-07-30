# Agent Launch Prompt — Work Batch CA-08

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for context broker design with allowlisted queries, provenance tracking, and soft/hard budget enforcement`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
that can load the complete brief/spec/source context, inspect and edit the
repository with tools, reason across context brokering, budget tracking, and
usage-quality semantics, and run the required proof.

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

You are assigned **implementation work batch CA-08** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch implements the context broker — the only path through which coordinator
decision agents may access additional context beyond the initial envelope. All
queries are allowlisted, metered, provenance-tracked, and bounded. Per-class
cycle budgets with soft/hard limits and usage-quality tracking.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-08-context-broker-and-cycle-budgets.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md`
5. `docs/spec/v1-contracts.md` — especially §7 (shipping policy baseline: per-class input/output/broker/wall-clock limits)
6. `docs/spec/architecture.md` — especially §4.8 (coordinator decision plane services)
7. `docs/spec/coordinator-automation.md` — especially §10 (context broker and budgets)
8. `docs/spec/schemas/v1.schema.json`
9. `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`
10. `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
11. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
12. `docs/spec/v1-implementation-map.md` — section 8 (CA-08)
13. Accepted CA-02 index query — `IndexQuery` typed methods
14. Accepted CA-06 endpoint adapter
15. Accepted CA-07 decision envelope — `DecisionEnvelope`, `BoundedContext` types
16. the canonical source owners you will actually change:
    - `src/foundation/cycle-budget.ts` (create)
    - `src/foundation/context-broker.ts` (create)
    - `spec/basic/context-broker-spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for context broker design and budget enforcement`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   context-broker query types, allowlist rules, budget dimensions, and
   soft/hard limit enforcement.
2. Inspect the current source. Do not infer behavior from filenames.
3. Enumerate public invariants: all broker queries are allowlisted by type;
   every query is metered against the cycle budget; provenance and redaction
   are applied; unauthorized context references are denied and recorded; soft
   limits warn, hard limits block; the broker does not kill processes in a way
   that leaves external effects ambiguous.
4. Use counterexamples: identify a shortcut that bypasses allowlisting or
   skips budget debiting.
5. When a spec and current source disagree, stop that line of implementation.
6. Treat predecessor reports as leads, not proof.

## Structural Design And Module-Size Gate

- Front doors and public barrels target 160 lines or fewer.
- Focused implementation modules target 220 lines or fewer.
- Four hundred physical lines is the absolute ceiling.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
- Record physical line counts for every new or materially rewritten file.

## Your Mission

Implement the context broker and cycle budgets:

1. Create `src/foundation/cycle-budget.ts` with `CycleBudget`, `BudgetTracker`,
   `BudgetStatus`, `BudgetExceeded`, and `createBudget`. Per-class defaults
   from `v1-contracts.md §7`: input soft/hard, output hard, broker-request
   hard, wall-clock hard. Soft limits warn; hard limits block further context.

2. Create `src/foundation/context-broker.ts` with `ContextBroker` class:
   - `requestContext(request: ContextRequest): ContextResponse` — validates
     the request against the allowlist, resolves via typed index queries,
     applies redaction and size limits, debits the cycle budget, records a
     `coordinator-context-requested` event, and returns content with provenance.
   - Allowlisted context types: `batch-brief`, `review-finding`, `recent-events`,
     `repository-state`, `tracker-projection`, `dependency-neighborhood`,
     `policy-fragment`, `push-journal`.
   - Every response includes: content, provenance/redaction markers, byte size,
     budget impact, and truncation markers.
   - Unauthorized request types are denied and recorded.

3. Budget tracking: input/output token estimation hooks (host-dependent),
   broker-request counting, wall-clock elapsed tracking. Usage quality:
   `reported`, `estimated`, or `unknown`.

4. The agent does not receive unrestricted filesystem tools for authoritative
   coordinator context.

5. Write focused Jasmine specs covering: all allowlisted context types, budget
   tracking (soft/hard boundary), unauthorized request denial, provenance
   tracking, redaction, budget exhaustion, and concurrent-budget isolation.

## What You Must Not Do

- Do not invoke any model, LLM, or AI.
- Do not expose unrestricted filesystem access as "context."
- Do not allow unlisted context types through the broker.
- Do not modify CA-02 index query, CA-06 adapter, or CA-07 envelope types.
- Do not kill processes — only block further context.
- Do not modify `src/cli.ts` or any command file.
- Do not commit.

## Required Proof

- `nvb build` passes
- `nvb test` passes
- All allowlisted context types resolve correctly
- Unauthorized request types denied with recorded event
- Soft-limit warnings returned but context still served
- Hard-limit blocking: no context returned, budget-exceeded recorded
- Provenance and redaction applied to all responses
- Budget per-cycle isolation: two concurrent cycles have independent budgets
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

- All context requests pass through the broker — no direct index/filesystem access.
- All broker queries are allowlisted by type.
- Every query is metered and debits the cycle budget.
- Unauthorized references are denied and recorded.
- Soft limits warn; hard limits block.
- The broker does not kill a process.
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-08-context-broker-and-cycle-budgets.md`

The report must include: documents studied, exact files changed, physical line
counts, proof commands and outcomes, final `git status --short`, and one proposed
commit message for the reviewer.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

State: which files were created/changed, the complete allowlist of context types,
the per-class budget defaults (D1/D2/D3 soft/hard limits), the budget tracking
interface, which proofs passed, and what the CA-09 (typed proposals and
current-state validator) agent needs to know about how the broker feeds
additional context into the decision cycle and how budgets gate further context
expansion.
