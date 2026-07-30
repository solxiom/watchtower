# Agent Launch Prompt — Work Batch CA-18

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
    - `src/foundation/TerminalRenderer.ts` or `src/terminal/renderer.ts` (create)
    - `src/foundation/PtyAttachment.ts` or `src/terminal/attachment.ts` (create)
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
- Do not add npm scripts or unrelated/public/project-root NVB tasks. Foreground
  PTY behavior uses NVB only to the extent proven by RT-05.
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
