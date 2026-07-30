# Agent Launch Prompt — Work Batch CA-08

## Governing Contract And Precedence — Mandatory

This prompt is an execution aid, not product authority. Resolve conflicts in
this order and stop for a specification amendment rather than inventing
behavior:

1. `docs/spec/v1-contracts.md` and `docs/spec/schemas/v1.schema.json`
2. `docs/spec/v1.md`
3. `docs/spec/nirvana-integration-architecture.md`,
   `docs/spec/coordinator-automation.md`, `docs/spec/operator-session.md`, and
   `docs/spec/cli-session.md` within their scopes
4. `docs/spec/architecture.md`
5. `docs/development/engineering-and-review-standard.md`
6. `AGENTS.md`
7. the accepted implementation map, pack rules, and this batch brief

The implementation/review agent must read the mandatory engineering standard
and Nirvana integration architecture in full. A stale path, module suggestion,
or technical mechanism in this prompt must be corrected to the governing
contract while preserving the batch objective and proof obligations.

## Nirvana-First And NVB Execution Gate — Mandatory

- Complete and report the required Nirvana API usage audit before introducing
  infrastructure or bare Node behavior.
- Commands use Nirvana command, argument, pretty, and terminal-view APIs and
  remain thin.
- Public reason codes, exit mappings, event names, and schema identifiers remain
  owned by accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`. A
  batch-local symbolic name is not automatically public; reconcile it with the
  registry, and update the owning contract/schema in the same batch when a new
  public identifier is genuinely required.
- Use the Nirvana storage facade for ordinary managed-root operations only
  after CLI-safe root/bootstrap semantics are proved. Atomic durability,
  canonical path security, locking, append-only journals, ownership/modes, and
  SQLite stay behind focused adapters when the facade lacks required semantics.
- Use the Nirvana logger only through the Watchtower logging boundary for
  redacted diagnostics. Logs are never command output, lifecycle events,
  acceptance evidence, or authoritative journals.
- Substantial deterministic workflows use the immutable packaged Watchtower
  NVB catalog, focused TaskHandlers, and task groups.
- `LaneTaskRunner` is the only internal NVB invocation boundary. Task selection
  is an allowlisted Watchtower action mapping, never an arbitrary user/agent
  task name or parent-project discovery.
- Never create or modify a participating repository's root `nvb.json`.
- Shell is restricted to checksum-manifested leaf adapters for tmux, Git, or
  external tools when no conforming Nirvana API exists. Workflow-level shell is
  a hard reject.
- Mutating tasks do not gain authority from NVB. They require the normal
  Watchtower effect executor, current-state validation, locks, idempotency, and
  a valid single-use invocation envelope.

## Project-Wide Structural And Size Gate — Mandatory

Apply the exact limits in
`docs/development/engineering-and-review-standard.md`; pack-local numbers may
be stricter but may never relax them:

- CLI entry, command, or NVB task: preferred at most 120 lines, warning at
  121–160, hard reject over 180.
- Orchestrator, controller, or renderer shell: preferred at most 140 lines,
  warning at 141–180, hard reject over 200.
- Foundation service, planner, validator, adapter, or store: preferred at most
  200 lines, warning at 201–260, hard reject over 300.
- Contract/type/schema registry: preferred at most 240 lines, warning at
  241–320, hard reject over 400.
- Test/spec module: preferred at most 300 lines, warning at 301–420, hard reject
  over 500.
- Function: target at most 40 lines, justification at 41–60, reject over 80.
- Constructor: target at most 25 lines, warning at 26–40, reject over 50.

Passing a line limit never excuses mixed responsibilities, a god object,
generic helper bag, hidden cycle, foreign API laundering, or layer violation.
Use `PascalCase` for classes/class-owning files, `lowerCamelCase` for non-class
modules and directories, and never introduce dashed or underscored backend
source/spec names.

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
    - `src/foundation/CycleBudget.ts` (create)
    - `src/foundation/ContextBroker.ts` (create)
    - `spec/basic/contextBroker.spec.ts` (create)

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

## Your Mission

Implement the context broker and cycle budgets:

1. Create `src/foundation/CycleBudget.ts` with `CycleBudget`, `BudgetTracker`,
   `BudgetStatus`, `BudgetExceeded`, and `createBudget`. Per-class defaults
   from `v1-contracts.md §7`: input soft/hard, output hard, broker-request
   hard, wall-clock hard. Soft limits warn; hard limits block further context.

2. Create `src/foundation/ContextBroker.ts` with `ContextBroker` class:
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
