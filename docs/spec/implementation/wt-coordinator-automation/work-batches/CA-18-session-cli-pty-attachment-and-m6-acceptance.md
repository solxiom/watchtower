# Batch CA-18 — Session CLI/PTY Attachment and M6 Acceptance

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Terminal UX and pack exit
Depends on: CA-14, CA-15, CA-16, CA-17 accepted
Owned files: commands in `src/commands/`, terminal renderer, PTY attachment, help fragments

**Required implementor reasoning class:** `R5`
**Class rationale:** interactive PTY attachment with streaming, signal handling, accessibility, typed presentation events, and the 30–10k pack-scale and long-lane-replay scaling proof required for M6 acceptance. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Implement `wt session create`, `wt session attach`, `wt session resume`,
`wt session observe`, `wt session close`, `wt session archive`, and
`wt session prune` commands. Build the terminal renderer consuming typed
presentation events from `cli-session.md`. Implement streaming support,
signal handling, and accessibility. Prove that 30–10k pack scale and
long-lane replay do not increase ordinary model context.

## Required Work

1. **Read the normative CLI session and PTY contracts.** Study
   `cli-session.md` §4 for entry and attachment lifecycle. Study
   `cli-session.md` §6 for presentation architecture. Study
   `cli-session.md` §7 for turn UX. Study `cli-session.md` §8 for streaming.
   Study `cli-session.md` §9 for slash commands. Study `cli-session.md` §10
   for input, completion, and references. Study `cli-session.md` §11 for
   history and retention. Study `cli-session.md` §12 for concurrency and
   notifications. Study `cli-session.md` §13 for signals and terminal behavior.
   Study `cli-session.md` §14 for rendering and accessibility.

2. **Implement session CLI commands:**
   - `wt session create [--topic=<text>] [--policy-profile=<id>] [--tag=<tag>...]
     [--stream|--no-stream] [--banner=<compact|full|minimal>]` — creates a new
     operator session via CA-15 and attaches. Requires interactive TTY.
   - `wt session attach <operator-session-id> [--observe] [--stream|--no-stream]
     [--wait-for-active-turn] [--banner=<compact|full|minimal>]` — attaches to
     an existing session without changing lifecycle state.
   - `wt session resume <operator-session-id>` — changes a suspended session
     back to open. Does NOT attach.
   - `wt session observe <operator-session-id>` — creates an explicitly
     read-only observer attachment.
   - `wt session close <operator-session-id>` — terminal close with rationale.
   - `wt session archive <operator-session-id>` — schema reserved for v1+;
     currently returns a descriptive unavailable message.
   - `wt session prune <operator-session-id> [--dry-run] [--confirm]` —
     previews and executes full-text pruning per retention policy.
   - `wt session list [--state=<state>] [--origin=<origin>] [--limit=<N>]
     [--cursor=<cursor>] [--sort=<field>]` — lists sessions with filters and
     pagination.
   - `wt session show <operator-session-id>` — shows identity, snapshot summary,
     pins, open questions, proposals, and budget.
   - `wt session history <operator-session-id> [--limit=<N>] [--cursor=<cursor>]`
     — pages retained turns with references, routing, usage, and interruption
     state.
   - `wt session suspend <operator-session-id>` — prevents new turns while
     retaining resumability.
   - `wt session fork <operator-session-id>` — starts a related session with
     explicit inherited pins/turn refs.
   - `wt session pin|unpin <operator-session-id> <ref>` — manages bounded
     continuity references.
   - `wt session compact <operator-session-id> [--dry-run]` — creates derived
     bounded continuity summary.
   - `wt session export <operator-session-id> [--format=markdown|json]
     [--turns=<range>] [--output=<path>]` — deterministically exports retained
     session records.
   - `wt session budget grant <operator-session-id> ...` — preview/confirm a
     finite authorized budget grant.
   - `wt session apply <proposal-id> [--dry-run]` — preview/confirm/revalidate
     a proposed effect.
   - `wt session amendment request <operator-session-id> ...` — create/confirm
     a typed amendment request.
   - `wt hold place|release|list` — manage explicit scoped holds.
   - Register all commands in `help/help.json` with help fragments.

3. **Implement terminal renderer:**
   - The readline/terminal loop contains NO coordinator policy or effect logic.
   - Consumes typed presentation events: `attachment.opened`, `session.bound`,
     `turn.preflight`, `turn.invocation-started`, `turn.provisional`,
     `turn.validated`, `turn.stale`, `turn.interrupted`, `turn.failed`,
     `proposal.available`, `effect.preview`, `effect.confirmed`,
     `effect.result`, `lane.notification`, `budget.updated`,
     `attachment.detached`.
   - Each event carries stable lane, operator-session, turn, correlation, and
     revision identifiers.
   - Rendering supports: compact/full/minimal banners, compact/verbose turn
     footers, terminal Markdown, colors, separators, progress indicators,
     and compact tables.
   - `--no-color` and `NO_COLOR` disable ANSI color.
   - Accessible mode: screen-reader-friendly append-only output (no cursor
     rewriting).
   - Narrow terminal wrapping without truncating identifiers.
   - Secrets and configured sensitive fields are redacted in all rendering
     modes.

4. **Implement streaming support:**
   - Streaming defaults on for interactive TTY when the selected adapter
     supports safe interruption.
   - States: PREFLIGHT → PROVISIONAL* → VALIDATING → VALIDATED |
     STALE_VALIDATED | INTERRUPTED | FAILED.
   - Provisional chunks are visibly marked non-authoritative (`[provisional]`
     prefix or equivalent).
   - Only one complete schema-valid response becomes the recorded answer.
   - If validated prose differs from provisional prose, the final validated
     answer is printed distinctly.
   - `--stream` cannot override an adapter that lacks the required contract.
   - Usage is reported from the adapter when available; otherwise explicitly
     estimated.

5. **Implement slash commands (per `cli-session.md §9`):**
   - Read-only M0: `/status`, `/ready`, `/batch`, `/events`, `/holds`,
     `/budget`, `/queue`, `/history`, `/context`, `/proposals`, `/sessions`,
     `/export`.
   - Session metadata/lifecycle: `/pin`, `/unpin`, `/compact`, `/new`,
     `/switch`, `/fork`, `/suspend`, `/resume`, `/close`, `/budget grant`.
   - Proposal/effect: `/apply`, `/reject`, `/amend`.
   - Attachment: `/help`, `/clear`, `/verbose`, `/confirm-mode`, `/exit`,
     `/quit`.
   - Slash parsing is deterministic: a leading token exactly matching the
     closed registry is a command; unknown `/word` is an error, never a paid
     natural-language turn. `//text` escapes to natural language.

6. **Implement signal handling:**
   - Ctrl-C while editing: clear current unsubmitted input.
   - Ctrl-C during preflight: abort without starting an endpoint.
   - Ctrl-C after invocation: request interruption, journal partial output
     and usage as `interrupted`.
   - Ctrl-C at confirmation: reject confirmation, apply no effect.
   - Ctrl-D at empty prompt: detach without closing the operator session.
   - Terminal loss/SIGHUP: stop rendering, request safe interruption if a turn
     is owned, preserve durable recovery state.

7. **Scale acceptance proof (M6 pack exit gate):**
   - Generate sealed fixtures with 30, 300, 3,000, and 10,000 batches.
   - After one index build: prove M0/D1/ordinary-D2 envelope bytes and
     estimated tokens remain within the same configured bound.
   - Prove unrelated batch growth adds no broker records to the cycle.
   - Prove ready-set updates inspect only affected dependency edges.
   - Prove latest-event lookup does not rescan the full journal.
   - Prove query truncation and continuation are stable.
   - Prove index verification detects any source/seal drift.
   - Prove no model is invoked to build, verify, or query the index at any
     scale point.
   - Prove that long-lane replay (many completed cycles) does not increase
     the default session working set beyond configured bounds.
   - Prove that session attachment startup time is not proportional to total
     lane history (index query time is bounded).

8. **Help registration:**
   - Register all session and hold commands in `help/help.json`.
   - Create help fragments for every command.

## Expected Ownership

- `src/commands/SessionCreateCommand.ts` through `src/commands/HoldListCommand.ts`
  — one file per command, extending `BaseCommand`.
- Terminal renderer and PTY attachment in `src/foundation/` or a new
  `src/terminal/` module as design dictates.
- Help fragments in `help/commands/`.
- No command owns business logic belonging to CA-15 through CA-17.

## Tests And Evidence

- **Every session command:** Run with valid args, prove correct output.
  Run with invalid args, prove clear error.
- **Dry-run purity:** Prove every `--dry-run` flag produces preview without
  side effects (no state change, no journal write, no model invocation).
- **Human/JSON parity:** Every read-only list/show/history/export command
  with `--json` matches human output semantically.
- **Interactive attachment:** Create a session, attach, submit a turn,
  verify response rendering.
- **Slash commands:** Every slash command invokes the correct WT service.
  Unknown `/word` produces an error, never a model turn. `//text` sends
  natural language.
- **Streaming:** Verify provisional chunks are marked non-authoritative.
  Verify only validated response becomes the recorded answer.
- **Signal handling:** Ctrl-C at editing clears input. Ctrl-C at preflight
  aborts without invocation. Ctrl-C after invocation journals `interrupted`.
  Ctrl-D detaches without closing.
- **Terminal loss:** Simulate SIGHUP during an active turn. Verify the
  session state is preserved and no effect is partially applied.
- **Accessibility:** Verify `--no-color` and `NO_COLOR` produce readable
  output. Verify screen-reader mode uses append-only output.
- **Scaling proof:** At 30, 300, 3,000, and 10,000 batches: envelope
  bytes bounded, no unrelated batch growth in context, ready-set updates
  inspect only affected edges, latest-event is indexed, no full-journal scan,
  no model for index operations, session startup time bounded.
- **Help completeness:** Every command in `help/help.json` with a help
  fragment.

## What Must Not Change

- Do not add product logic to `src/cli.ts`.
- Do not modify CA-15 through CA-17 foundation modules.
- Do not let the attachment own session state, memory, or effect authority.
- Do not allow slash-command typos to fall through to a paid model turn.
- Do not change the existing BaseCommand pattern.

## Review Procedure Highlights

1. Independently run every session command.
2. Test interactive attachment with real turn processing.
3. Prove every slash command is deterministic and M0 commands invoke no model.
4. Stress-test signal handling at every stage.
5. Independently reproduce scaling proof at 30, 300, 3,000, and 10,000 batches.
6. Verify long-lane replay does not increase the default working set.

---

## Required Reasoning Posture

CA-18 is the pack-exit gate for the entire `wt-coordinator-automation` pack.
It must prove that all preceding batches integrate correctly into a usable
terminal experience, and that the pack-size scaling guarantees from
`coordinator-automation.md §23.4` hold at every scale point. The implementor
must reason about every presentation event, every signal edge case, every
accessibility path, and every scaling dimension.

## Structural And Module-Size Acceptance

- Each command file target ≤120 lines (thin host). Warning-band at 121–160.
- Terminal renderer target ≤300 lines (presentation event consumption,
  rendering modes, Markdown/table utilities). Split expected.
- PTY attachment module target ≤250 lines (readline loop, signal handling,
  streaming dispatch).
- Help fragments ≤40 lines each.
- Scale-proof fixtures are generated, not hand-maintained; included in
  `.local/` only.
- Test modules ≤300 lines; split by commands, rendering, signals, streaming,
  accessibility, and scaling families.

## Required Review Packet

1. Implementation report in `.local/agent-reports/coordinator-automation/`.
2. All `nvb build` and `nvb test` output.
3. Every session command execution output (human and `--json`).
4. Interactive attachment walkthrough evidence.
5. Slash-command registry completeness proof.
6. Signal-handling test matrix (every Ctrl-C stage, SIGHUP, Ctrl-D).
7. Accessibility verification (no-color, screen-reader mode).
8. Full scaling proof at 30/300/3,000/10,000 batches with measurements.
9. Long-lane replay evidence.

## Completion And Handoff

- Implementation report, updated tracker/roadmap.
- This batch completes Pack 5 (M6). The pack exit criteria in
  `coordinator-automation.md §24` must be verified.
- Leave the exact command list, slash-command registry, presentation event
  types, scaling measurements, and accessibility verification results for the
  next agent (Pack 6 — `wt-v1-release`).
