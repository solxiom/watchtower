# Agent Launch Prompt — Work Batch CA-14

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for CLI command surface implementation, help registration, human/JSON output parity, and cross-foundation integration`
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

You are assigned **implementation work batch CA-14** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch implements the complete `wt coordinator` command group — index,
status, context, explain, cycle, escalate, events, and ready commands — the
public CLI surface for the entire coordinator automation system.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-14-coordinator-event-and-ready-set-commands.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/coordinator-automation.md` §19 — CLI contract
5. `docs/spec/coordinator-automation.md` §17 — filesystem contract
6. `docs/spec/v1-contracts.md` §8 — JSON envelope contract
7. Accepted RM-02 public JSON envelopes and schema validation
8. Accepted CA-01 deterministic sealed-pack index compiler
9. Accepted CA-02 bounded typed queries
10. Accepted CA-03 runtime indexes and projections
11. Accepted CA-04 ready-set projection
12. Accepted CA-05 ordered routing policy
13. Accepted CA-06 endpoint adapter eligibility
14. Accepted CA-07 immutable decision envelopes
15. Accepted CA-08 context broker and budgets
16. Accepted CA-09 typed proposals and validator
17. Accepted CA-10 atomic effect executor
18. Accepted CA-11 tmux adapter, CA-12 Git adapter, CA-13 queue/cursor/replay
19. the canonical source owners you will actually work with:
    - `src/commands/` (many new files)
    - `help/commands/` (many new files)
    - `help/help.json` (update)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for CLI command surface implementation, help registration, human/JSON output parity, and cross-foundation integration`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   commands, foundation modules, help fragments, tests, and status artifacts
   affected by this batch.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. For every command, identify the exact foundation modules it must call and
   the exact output contract it must satisfy (human and `--json`). Prove no
   command duplicates foundation logic.
4. For every mutating command, enumerate every side effect (file write, tmux
   command, Git push, model invocation) and prove `--dry-run` blocks all of
   them.
5. Use counterexamples: identify at least one plausible command that could
   bypass `--dry-run` or produce diverging human/JSON output, then ensure
   focused proof rejects it.
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

Implement the complete `wt coordinator` command group:

1. Create command files in `src/commands/` following the `BaseCommand` pattern:
   `CoordinatorIndexBuildCommand`, `CoordinatorIndexStatusCommand`,
   `CoordinatorIndexVerifyCommand`, `CoordinatorIndexExplainCommand`,
   `CoordinatorStatusCommand`, `CoordinatorContextCommand`,
   `CoordinatorExplainCommand`, `CoordinatorCycleCommand`,
   `CoordinatorEscalateCommand`, `EventsTailCommand`, `EventsLatestCommand`,
   `BatchReadyCommand`.
2. Every command delegates to foundation modules (CA-01 through CA-13). No
   business logic in commands.
3. `--dry-run` is supported for every mutating command. Dry-run never invokes
   a model, executes a tmux command, pushes to Git, or writes files.
4. `--json` is supported for every read-only command. Human and JSON output
   derive from the same data.
5. Create help fragments in `help/commands/` for every command.
6. Register all commands in `help/help.json`.
7. Write focused Jasmine specs: every command with valid args, every command
   with invalid args, dry-run purity for mutating commands, human/JSON parity,
   help completeness, and integration with predecessor foundation modules.
8. Produce implementation report, update tracker/roadmap, leave handoff.

## What You Must Not Do

- Do not add product logic to `src/cli.ts`.
- Do not modify any CA-01 through CA-13 foundation module.
- Do not duplicate path discovery, config parsing, or effect logic in commands.
- Do not change the existing BaseCommand pattern.
- Do not invoke models in `--dry-run` or read-only commands.
- Do not add npm scripts or NVB tasks.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- every command runs with valid arguments (human and `--json` output correct)
- every command fails with clear error on invalid arguments
- `--dry-run` produces preview without any side effect for every mutating command
- human and `--json` output contain identical semantic information
- every command is registered in `help/help.json` with a valid help fragment
- `wt help <command>` works for every new command
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

- no product logic in `src/cli.ts`
- `--dry-run` never invokes models, tmux, Git, or external processes
- human and `--json` output derive from the same data
- every command delegated to foundation, never duplicated
- help fragment for every command; every command in `help/help.json`
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-14-coordinator-event-and-ready-set-commands.md`

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

Record the exact command list, the foundation module each command delegates to,
the help fragment inventory, and the dry-run/JSON parity proof results. Note that
CA-15 through CA-18 will add session commands using the same patterns. Confirm
that every predecessor foundation module is correctly consumed.
