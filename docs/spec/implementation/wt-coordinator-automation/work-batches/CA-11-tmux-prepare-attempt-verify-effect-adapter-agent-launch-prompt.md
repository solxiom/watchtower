# Agent Launch Prompt — Work Batch CA-11

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for effect-adapter and external-recovery work`
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

You are assigned **implementation work batch CA-11** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch implements the tmux prepare/attempt/verify effect adapter — the
typed external-effect boundary for all tmux coordinator effects. It wraps
CA-10's effect executor for tmux-specific effects and enforces strict
no-arbitrary-kill and no-shell-escape constraints.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-11-tmux-prepare-attempt-verify-effect-adapter.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/coordinator-automation.md` §12.2–12.3 — external effects, prepare/attempt/verify
5. `docs/spec/coordinator-automation.md` §14 — watcher and queue model
6. `docs/spec/v1-contracts.md` §5 — effect registry (tmux effects)
7. `docs/spec/v1-contracts.md` §12 — external-effect recovery
8. Accepted RT-05 central runtime invocation adapter contract
9. Accepted CA-10 atomic lane-local effect executor contract
10. the canonical source owners you will actually work with:
    - `src/foundation/tmux-effect.ts` (create)
    - `src/foundation/tmux-adapter.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for effect-adapter and external-recovery work`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, types, errors, tests, and status artifacts affected by this batch.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. Enumerate the complete allowed tmux command set. Identify every character
   class that must be rejected in target identifiers. Map every crash point in
   the prepare→attempt→verify chain and define its recovery behavior.
4. Use counterexamples: identify at least one plausible forbidden command that
   could slip past weak sanitization, then ensure focused proof rejects it.
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

Implement the tmux prepare/attempt/verify effect adapter:

1. Create `src/foundation/tmux-adapter.ts` with `TmuxAdapter`, `TmuxEffectCommand`,
   `PrepareResult`, `AttemptResult`, `VerifyResult`, and the complete
   prepare/attempt/verify pipeline. Implement sanitization grammar that rejects
   all shell metacharacters. Implement the closed allowed command set. Route all
   execution through the accepted RT-05 runtime adapter.
2. Create `src/foundation/tmux-effect.ts` with `TmuxEffectExecutor`,
   `executeTmuxEffect`, unknown-launch recovery, duplicate suppression via
   idempotency key, the forbidden-operation blocklist, and CA-10 integration
   through a typed interface. Implement phase journaling using CA-10's effect
   journal format.
3. Write focused Jasmine specs covering: valid prepare, invalid target
   sanitization, missing target, every forbidden command, successful
   attempt→verify, failed command, uncertain verify, idempotent duplicate
   suppression, unknown-launch recovery, and proof that no shell metacharacter
   reaches the runtime adapter.
4. Produce implementation report, update tracker/roadmap, leave handoff.

## What You Must Not Do

- Do not expand the allowed tmux command set beyond the closed registry.
- Do not permit any shell metacharacter or path-like value in target identifiers.
- Do not create a direct tmux invocation path that bypasses the adapter.
- Do not modify CA-10's effect executor or the RT-05 central runtime adapter.
- Do not invoke models.
- Do not add npm scripts or NVB tasks.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- every allowed tmux command succeeds through prepare→attempt→verify
- every forbidden command is rejected before runtime invocation
- target sanitization rejects all shell metacharacters: `;`, `|`, `$`, `` ` ``, `\`,
  `(`, `)`, `{`, `}`, `<`, `>`, `&`, `*`, `?`, `~`, `!`, newline, and `..`
- duplicate suppression returns recorded outcome without re-execution
- unknown-launch recovery probes without re-executing
- crash recovery: kill process between attempt and verify, restart, prove
  recovery path
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

- every tmux command must be from the closed allowed set
- no shell metacharacter reaches the runtime adapter
- duplicate suppression through idempotency key is mandatory
- unknown-launch recovery must probe, never re-execute blindly
- no arbitrary kill or shell escape
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-11-tmux-prepare-attempt-verify-effect-adapter.md`

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

Record the exact allowed tmux command set, the sanitization grammar, the error
taxonomy, and the complete prepare/attempt/verify/recovery state machine. Note
that CA-12 may begin in parallel (separate adapter, shared CA-10 boundary) and
CA-13 will consume all effect adapters. Confirm that the typed interface with
CA-10 is settled and documented.
