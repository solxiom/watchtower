# Agent Launch Prompt — Work Batch CA-15

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for durable session persistence, lifecycle state-machine, crash-safe journaling, and multi-session isolation`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
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

You are assigned **implementation work batch CA-15** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch implements operator-session persistence and the complete lifecycle
state machine — the durable storage boundary for all operator interaction. Many
sessions per lane, immutable closed history, crash-safe journals, and the full
open → active-turn → suspended → closed → archived → pruned lifecycle.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-15-operator-session-persistence-and-lifecycle.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/operator-session.md` §6 — session lifecycle
5. `docs/spec/operator-session.md` §7 — session identity
6. `docs/spec/operator-session.md` §8 — turn processing
7. `docs/spec/operator-session.md` §20 — filesystem contract
8. `docs/spec/operator-session.md` §21 — retention and privacy
9. `docs/spec/operator-session.md` §22 — durable events
10. `docs/spec/v1-contracts.md` §9 — operator-session types and durability
11. Accepted CA-03 runtime journal indexes
12. Accepted UK-02 session/index migration registry
13. the canonical source owners you will actually work with:
    - `src/foundation/session-store.ts` (create)
    - `src/foundation/session-lifecycle.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for durable session persistence, lifecycle state-machine, crash-safe journaling, and multi-session isolation`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, types, tests, and status artifacts affected by this batch.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. Map the complete lifecycle state machine (all states, all valid transitions,
   all invalid transitions, all concurrency constraints). Enumerate every
   journal event type and define when each is appended.
4. Define the atomic line-write contract for crash-safe journaling. Prove that
   a partial write leaves the journal readable up to the last complete line.
5. Use counterexamples: identify at least one plausible lifecycle-transition bug
   (e.g., closing a session mid-turn) and at least one concurrency bug (e.g.,
   two simultaneous turn starts), then ensure focused proof rejects them.
6. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
7. Treat predecessor reports as leads, not proof. Re-open the actual changed
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

Implement operator-session persistence and lifecycle:

1. Create `src/foundation/session-store.ts` with `SessionStore`: session creation
   (durable JSON identity + journal), loading, listing with filters and
   pagination, journal append (atomic line write), journal reading with cursor,
   turn storage (operator message, response, coordinator answer, snapshot,
   usage), turn retrieval, and list-turns with pagination. Enforce immutable
   closed history — no turn modification after session close.
2. Create `src/foundation/session-lifecycle.ts` with `SessionLifecycle`: the
   complete state machine (open, active-turn, suspended, closed, archived,
   pruned), transition validation, transition execution with journal events,
   fork creation with explicit inheritance, active-turn concurrency enforcement,
   and idempotent transition handling.
3. Write focused Jasmine specs covering: session creation and identity,
   multiple sessions per lane, complete lifecycle walkthrough, every illegal
   transition, one-active-turn enforcement, immutable closed history, crash-safe
   journal append/recovery, fork creation and inheritance, idempotent
   transitions, and session listing with filters/pagination.
4. Produce implementation report, update tracker/roadmap, leave handoff.

## What You Must Not Do

- Do not limit sessions to one per lane.
- Do not allow turn modification after session closure.
- Do not implement session indexes — that is CA-16.
- Do not implement session routing, budgets, proposals, or holds — that is CA-17.
- Do not invoke models.
- Do not add npm scripts or NVB tasks.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- session creation writes correct `operator-session.json` and journal
- multiple sessions per lane are independently addressable
- complete lifecycle: open → active-turn → open → suspended → open → closed
  with correct journal events at each transition
- every illegal transition rejected with `OPERATOR_SESSION_STATE_INVALID`
- concurrent turn start on same session blocked with
  `OPERATOR_SESSION_TURN_ACTIVE`
- closed session: turn modification refused
- crash-safe journal: kill during write, restart, verify readable up to
  last complete line
- fork: child has new ID, references parent, inherits only explicit pins/refs
- idempotent transitions: double-suspend is no-op
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

- `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- many sessions per lane; never limited to one
- immutable closed history — turns are append-only, never mutated after close
- crash-safe journal: atomic line write, partial-write recovery
- one active turn per session at a time
- lifecycle state machine matches operator-session.md §6 exactly
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-15-operator-session-persistence-and-lifecycle.md`

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

Record the exact session identity schema, the complete lifecycle state machine
(all states, valid transitions, journal events per transition), the atomic
line-write journal contract, and the concurrency model. Note that CA-16 will
build the SQLite session index on this foundation, CA-17 will add routing/
budgets/proposals/holds, and CA-18 will build the PTY attachment commands.
