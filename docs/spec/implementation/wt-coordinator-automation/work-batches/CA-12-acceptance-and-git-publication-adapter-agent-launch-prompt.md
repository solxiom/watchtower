# Agent Launch Prompt — Work Batch CA-12

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for effect-adapter, Git operations, ownership validation, and recovery-path work`
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

You are assigned **implementation work batch CA-12** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch implements the Git acceptance and publication adapter — the
reviewer-ownership enforcement, commit-set validation, and partial-push-recovery
boundary that keeps semantic acceptance separate from Git publication.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-12-acceptance-and-git-publication-adapter.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/coordinator-automation.md` §12.2–12.3 — external effects and journals
5. `docs/spec/coordinator-automation.md` §13 — acceptance and publication separation
6. `docs/spec/v1-contracts.md` §5 — effect registry (Git acceptance/publication effects)
7. `docs/spec/v1-contracts.md` §11 — locking and recovery rules
8. Accepted RM-08 repository bindings and writable conflict inspection
9. Accepted CA-10 atomic lane-local effect executor
10. the canonical source owners you will actually work with:
    - `src/foundation/git-acceptance.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for effect-adapter, Git operations, ownership validation, and recovery-path work`
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
3. Enumerate every `git push` failure mode (no remote, auth failure, network
   loss, merge conflict, partial success). Define the recovery path for each.
4. Define the exact rules that separate reviewer identity from Git author
   metadata. Prove that Git author strings cannot be used as session ownership.
5. Use counterexamples: identify at least one plausible acceptance/publication
   conflation bug, then ensure focused proof rejects it.
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

Implement the Git acceptance and publication adapter:

1. Create `src/foundation/git-acceptance.ts` with `GitAcceptanceAdapter`,
   reviewer-session ownership validation, commit-set validation (SHA existence,
   tree contents, ancestry, repository binding), publication with per-repository
   push and partial recovery, and the strict acceptance/publication separation.
2. CA-10 integration through a typed interface with two distinct effect types:
   `record-acceptance` (durable journal) and `publish-commits` (external Git push).
3. Prepare/attempt/verify journaling for publication: validate → push → verify
   remote ref. Idempotency key shared with CA-10.
4. Write focused Jasmine specs covering: reviewer ownership match/mismatch,
   every commit-set validation rule (found, unexpected files, ancestry, binding),
   successful push, partial push recovery, acceptance survival through
   publication failure, idempotent replay, and every error code.
5. Produce implementation report, update tracker/roadmap, leave handoff.

## What You Must Not Do

- Do not combine acceptance and publication into a single effect type.
- Do not use Git author strings or commit metadata as reviewer identity.
- Do not permit force push.
- Do not modify RM-08 bindings or CA-10's effect executor.
- Do not invoke models.
- Do not add npm scripts or NVB tasks.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- reviewer ownership validation: match passes, mismatch fails with
  `GIT_OWNERSHIP_MISMATCH`
- commit-set validation: every rule (SHA existence, tree contents, ancestry,
  binding) correctly allows valid and rejects invalid
- successful push: verified commits reach the test remote
- partial push: three repositories, third fails, first two succeed,
  recovery retries only failed repo
- acceptance survives publication failure: durable acceptance event is not
  rolled back
- idempotent replay: second publication does not re-push
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

- acceptance and publication are separate effect types
- reviewer ownership comes from durable events, not Git author metadata
- force push is never permitted
- partial push recovery never invalidates accepted semantic state
- idempotency keys are checked before every publication attempt
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-12-acceptance-and-git-publication-adapter.md`

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

Record the exact error taxonomy, the complete commit-set validation rules,
the partial-push recovery algorithm, and the acceptance/publication separation
design. Confirm that CA-10's typed interface correctly supports both
`record-acceptance` and `publish-commits` effect types. Note that CA-13 will
consume this adapter and CA-11 for the full effect-adapter suite.
