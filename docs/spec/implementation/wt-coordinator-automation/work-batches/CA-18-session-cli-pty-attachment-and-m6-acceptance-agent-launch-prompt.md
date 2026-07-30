# Agent Launch Prompt — Work Batch CA-18

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5` — strongest required for interactive PTY attachment with streaming/signal/accessibility integration, presentation-event rendering, slash-command determinism, interactive vs non-interactive mode separation, the pack-exit scaling proof at four scale points (30/300/3,000/10,000 batches), long-lane replay context-bounding proof, and the final M6 acceptance gate
- agent suitability: `high for terminal UX implementation, PTY/readline integration, signal handling, streaming, accessibility, and pack-scale proof construction`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto` — must be steered away from making the attachment authoritative, allowing slash typos to invoke models, or skipping scale-point proof
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration — insufficient for PTY, signal, and scale-proof reasoning
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. CA-18 is R5 because it is the pack-exit
gate — it must prove that all CA-01 through CA-17 foundations integrate into a
correct, safe, responsive terminal experience, that the attachment is never
authoritative, that slash-command typos never invoke models, that signals
produce safe interruption without partial effects, and that the pack-scale
guarantees hold at 30/300/3,000/10,000 batches. A missing scale proof,
incorrect signal handling, or an attachment that becomes session authority
would fail the M6 acceptance gate.

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

You are assigned **implementation work batch CA-18** for the Watchtower v1
wt-coordinator-automation delivery lane.

This is the pack-exit gate. It implements the complete session CLI command
surface, the interactive PTY attachment, the terminal renderer consuming typed
presentation events, streaming with provisional/validated separation, signal
handling at every stage, accessibility, and the M6 scaling proof.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-18-session-cli-pty-attachment-and-m6-acceptance.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/cli-session.md` (entire document — all 18 sections)
5. `docs/spec/operator-session.md` §19 — CLI contract
6. `docs/spec/operator-session.md` §15 — proposals and confirmation
7. `docs/spec/operator-session.md` §19.3 — export
8. `docs/spec/operator-session.md` §19.4 — output and interruption
9. `docs/spec/coordinator-automation.md` §19 — CLI contract
10. `docs/spec/coordinator-automation.md` §23.3–23.4 — cost/scaling proof
11. `docs/spec/v1-contracts.md` §8 — JSON envelope contract
12. Accepted CA-14 coordinator commands (for command pattern consistency)
13. Accepted CA-15 session store and lifecycle
14. Accepted CA-16 session SQLite index
15. Accepted CA-17 session routing, budgets, proposals, and holds
16. the canonical source owners you will actually work with:
    - `src/commands/` (many new command files)
    - `src/foundation/terminal-renderer.ts` or `src/terminal/renderer.ts` (create)
    - `src/foundation/pty-attachment.ts` or `src/terminal/attachment.ts` (create)
    - `help/commands/` (many new help fragments)
    - `help/help.json` (update)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5` — strongest required for interactive PTY attachment with streaming/signal/accessibility integration, presentation-event rendering, slash-command determinism, interactive vs non-interactive mode separation, and the pack-exit scaling proof at four scale points
- agent suitability: `high for terminal UX implementation, PTY/readline integration, signal handling, streaming, accessibility, and pack-scale proof construction`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   commands, renderer, attachment, help fragments, tests, and scaling proof
   artifacts affected by this batch.
2. Inspect the current source. Do not infer behavior from filenames, the
   implementation report, or the launch prompt.
3. Map the complete attachment lifecycle (STARTING → ATTACHED ↔ TURN_ACTIVE →
   DETACHING → STOPPED, plus OBSERVING and SESSION_UNAVAILABLE). For every
   state, define the allowed operations and signal behavior.
4. Enumerate every presentation event type and define the renderer's behavior
   for each. Enumerate every slash command and its deterministic service call.
5. Define every signal-handling scenario: Ctrl-C at editing, at preflight, after
   invocation, at confirmation; Ctrl-D at empty prompt; SIGHUP during active
   turn. Prove no scenario produces a partial effect or loses durable state.
6. Design the scaling proof: at 30/300/3,000/10,000 batches, measure envelope
   bytes, broker context records, ready-set update scope, latest-event lookup
   cost, index build time, session startup time, and model invocations.
7. Use counterexamples: identify at least one slash-typo-to-model bug, one
   signal-handling partial-effect bug, and one pack-growth-context-inflation
   bug, then ensure focused proof rejects them.
8. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
9. Treat predecessor reports as leads, not proof. Re-open the actual changed
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

Implement the session CLI commands, PTY attachment, terminal renderer, and M6
scaling proof:

1. Create session command files in `src/commands/`: SessionCreateCommand,
   SessionAttachCommand, SessionResumeCommand, SessionObserveCommand,
   SessionCloseCommand, SessionArchiveCommand, SessionPruneCommand,
   SessionListCommand, SessionShowCommand, SessionHistoryCommand,
   SessionSuspendCommand, SessionForkCommand, SessionPinCommand,
   SessionCompactCommand, SessionExportCommand, SessionBudgetGrantCommand,
   SessionApplyCommand, SessionAmendmentRequestCommand, HoldPlaceCommand,
   HoldReleaseCommand, HoldListCommand. Every command extends BaseCommand,
   delegates to CA-15–CA-17 foundations. No business logic in commands.
2. Create the terminal renderer: consumes typed presentation events from
   `cli-session.md §6`, renders compact/full/minimal banners, terminal Markdown,
   colors, separators, progress indicators, tables. Supports `--no-color`/
   `NO_COLOR` and accessible append-only mode. Redacts secrets.
3. Create the PTY attachment: readline/terminal loop, signal handling (Ctrl-C
   at every stage, Ctrl-D, SIGHUP), streaming dispatch (provisional chunks
   with non-authoritative markers), slash-command dispatch (deterministic
   parsing, unknown slash = error), input/completion/history, notification
   display.
4. Slash-command registry: exact parsing. Every registered slash command maps
   to a deterministic WT service call. Unknown `/word` errors without model
   invocation. `//text` is natural-language escape. M0 slash commands must
   prove zero model invocations.
5. `--dry-run` and `--json` support where applicable (list, show, history,
   export, compact, prune, budget grant, apply, amendment request).
6. Scale acceptance proof: generate sealed fixtures at 30/300/3,000/10,000
   batches. For each scale point, measure and report: M0/D1/ordinary-D2
   envelope bytes, broker context record count per trigger, affected
   dependency edges for ready-set update, latest-event lookup time, index
   build time, session attachment startup time, and model invocations (must
   be zero for M0 and index operations). Prove all measurements remain
   bounded and the packet context does not grow with pack size.
7. Write focused Jasmine specs covering: every command valid/invalid args,
   dry-run purity, human/JSON parity, interactive attachment walkthrough,
   every slash command, streaming (provisional/validated separation, adapter
   fallback), every signal scenario, accessibility modes, scaling proof
   assertions, and model-free audit.
8. Produce implementation report, update tracker/roadmap, leave handoff.

## What You Must Not Do

- Do not add product logic to `src/cli.ts`.
- Do not modify any CA-15 through CA-17 foundation module.
- Do not make the attachment authoritative — it is a presentation client.
- Do not allow slash-command typos or unknown `/word` to invoke a model.
- Do not allow provisional streaming chunks to become authoritative.
- Do not skip any scale point in the scaling proof.
- Do not invoke models for M0 slash commands or index operations.
- Do not add npm scripts or NVB tasks.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- every session command runs with valid args, fails clearly with invalid args
- `--dry-run` purity for every mutating command
- human/JSON parity for every read-only command
- interactive attachment: create, attach, submit turn, receive response,
  detach without closing session
- every slash command works (M0 commands: zero model invocation)
- unknown `/word` errors without model invocation
- `//text` sends natural language turn
- streaming: provisional chunks marked non-authoritative
- Ctrl-C at editing clears input; at preflight aborts without invocation;
  after invocation journals `interrupted`; at confirmation applies no effect
- Ctrl-D detaches without closing
- SIGHUP during turn preserves session; no partial effect applied
- `--no-color` and `NO_COLOR` produce readable output
- screen-reader mode uses append-only output (verified by rendering fixture)
- scaling proof at 30/300/3,000/10,000 batches: all measurements bounded,
  no pack-size context inflation
- long-lane replay: session working set does not grow with history length
- M0 operations and index operations: zero model invocations at all scales
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

- attachment is a presentation client, never session authority, memory, or
  effect authority
- slash-command typos never fall through to a paid model turn
- `//text` is the only natural-language escape from slash parsing
- provisional streaming is non-authoritative; only validated response is recorded
- Ctrl-C journals `interrupted`, applies no partial effect
- Ctrl-D detaches without closing the session
- SIGHUP preserves session state
- scaling proof covers all four scale points with bounded measurements
- M0 slash commands and index operations invoke zero models
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-18-session-cli-pty-attachment-and-m6-acceptance.md`

The report must include:

- documents studied
- exact files changed
- exact owners introduced or modified
- physical line counts for every new source/spec file
- proof commands and outcomes
- scaling proof tables (all four scale points, all measurements)
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact session command list, slash-command registry with
deterministic service call mappings, presentation event types and rendering
behavior per event, signal-handling matrix, streaming contract, accessibility
verification results, and the complete scaling proof tables (30/300/3,000/
10,000 batches). Note that this batch completes Pack 5 (M6). The next batch
(REL-01 in Pack 6 — wt-v1-release) begins end-to-end qualification.
