# Discussion: Interactive CLI Session UX for Operator Sessions

Status: **Resolved**
Started: 2026-07-30
Resolved: 2026-07-30
Related:

- `docs/spec/operator-session.md` §§ 19, 24
- `docs/spec/cli-session.md`
- `docs/spec/coordinator-automation.md` § 15
- `docs/spec/v1.md` § 11.10

## Resolution

The polished UX is adopted for v1 with corrected terminology and authority
boundaries:

- the durable human–WT object is an **operator session**, not a chat;
- bare `wt coordinator session` creates a new session/attachment;
- `wt coordinator session attach <id>` attaches to an existing session, while
  lifecycle `resume` only changes `suspended → open`;
- a lane may have many operator sessions and many attachments;
- one attachment is lane-bound and operates on one session at a time;
- one operator session has at most one active turn, even when several
  attachments observe it;
- attachments, provider processes, terminal scrollback, and readline caches
  are not durable memory or effect authority;
- `ask` remains the scripting/one-result interface;
- slash commands are classified shared WT operations, not all M0 or
  token-free;
- `/apply` still uses confirmation, current-state revalidation, and the sole
  effect executor;
- streaming remains provisional until response validation;
- history caching is bounded and coupled to authoritative retention; and
- foreground status observation requires neither a daemon nor model polling.

The normative result is
[../cli-session.md](../cli-session.md). Examples below record the
original proposal and may retain the earlier `chat` vocabulary; where they
conflict, the normative operator-session and CLI-session drafts win.

## 1. Problem statement

The operator-session spec defines `wt coordinator chat` in one sentence:
"terminal/readline loop; it still executes one bounded turn at a time." The
`ask` command takes a positional question and returns a response. The spec
says `--stream` may show provisional chunks and that diagnostics go to stderr.
That is the entirety of the v1 UX specification for what is arguably the
primary human interface to the coordinator.

Operators expect a polished interactive CLI experience comparable to:

- **OpenCode** — terminal-based coding agent with streaming responses, inline
  tool-use rendering, history navigation, multi-line input, and a responsive
  terminal UI
- **Claude Code (Codex)** — agentic CLI with slash commands, context windows,
  permission prompts, progress indicators, and session management
- **Cursor** — IDE-integrated chat with inline diffs, file references, and
  command execution

Watchtower's architecture is fundamentally different from these tools — the
coordinator is an advisory agent with bounded turns and no mutation authority.
But the operator shouldn't *feel* that architectural difference as a degraded
experience. A thoughtfully designed CLI session should make the advisory
boundary visible and natural, not clunky.

### 1.1 Current state of the spec

What's specified:

| Feature | Specified? | Detail |
|---------|-----------|--------|
| One-shot question | Yes | `wt coordinator ask "question"` |
| Multi-turn continuation | Yes | `--continue=<id>` |
| Interactive loop | Yes (name only) | `wt coordinator chat` |
| Streaming | Partial | `--stream` flag exists, no behavior defined |
| Budget display | Partial | stderr diagnostics, no format defined |
| Turn staleness | Yes | Response marked stale if state changed |
| Proposal confirmation | Yes | `wt coordinator conversation apply` |
| Readline/line editing | No | Not mentioned |
| History navigation | No | Not mentioned |
| Multi-line input | Partial | `--message-file=-` for stdin |
| Syntax highlighting | No | Not mentioned |
| Markdown rendering | No | Not mentioned |
| Slash commands | No | Not mentioned |
| Auto-completion | No | Not mentioned |
| Progress indicators | No | Not mentioned |
| Inline context display | No | Not mentioned |
| Response styling | No | Not mentioned |
| Session branding | No | Not mentioned |
| Color theming | No | Not mentioned |
| `--no-color` support | Yes (global) | In v1-draft global options |

### 1.2 The UX gap

An operator running `wt coordinator chat` gets... a prompt. They type, press
enter, and wait. There's no indication of what's happening, what context was
loaded, how many tokens the response will cost, whether automation is still
running, or that the response is advisory. The experience is functionally a
raw stdin/stdout pipe between human and model — no different from `curl`ing
an API.

Compare to OpenCode, where the operator sees:

- A branded session header with model name and working directory
- A `>` prompt accepting natural language and slash commands
- Streaming tokens appearing in real time with markdown formatting
- Inline rendering of tool calls, file reads, and command output
- A visible token counter / budget indicator
- Tab completion for file paths and commands
- Ctrl-C interruption with partial output preserved
- Session history persisted and navigable with up/down arrows
- Permission prompts styled distinctly from chat prose

Watchtower needs none of the tool-execution UX (it doesn't execute tools in
conversation) and none of the file-editing UX (mutations go through the effect
executor separately). But it needs the session *feel* — responsive, informative,
and polished.

### 1.3 Architectural constraints that shape UX

Watchtower's conversation architecture creates UX requirements that are
different from opencode/claude/codex:

**Constraint 1: Advisory-only responses.** The coordinator never mutates
anything. OpenCode can run `npm install` mid-conversation. Watchtower's
coordinator can only *suggest* placing a hold. The UX must make this clear
without being obstructive — the operator should understand that the response is
advice, not action, but shouldn't need to read a disclaimer on every turn.

**Constraint 2: Separate effect confirmation.** Proposals go through
`wt coordinator conversation apply`, not inline approval during the chat.
This means the UX needs a natural handoff: "I suggest placing a hold on batch
B18. Run `wt coordinator conversation apply conv-prop-91` to do this." The CLI
should make this friction feel like deliberate safety, not broken automation.

**Constraint 3: No lane lock during generation.** Automation keeps running.
The UX should surface this — a stale indicator when state changed, a change
feed visible during conversation, and the ability to check status without
leaving the chat session.

**Constraint 4: Bounded context per turn.** The working set is narrow (last
N turns + pinned refs + change summary). The UX should make the context window
visible so the operator knows what the coordinator "remembers" vs what it needs
re-told.

**Constraint 5: M0 classification.** Simple questions like "what's the status?"
should get instant mechanical answers. The UX should make this feel fast and
natural — the operator shouldn't even notice whether a turn went to M0 or D2.

## 2. Desired session experience

### 2.1 Session entry

```
$ wt coordinator chat

  watchtower 1.0.0 — coordinator conversation
  lane:         sql-backends (active, batch B22)
  routing:      D2 → codex-primary-medium | D3 → codex-primary-high
  conversation: conv-7f3a (open, 0 turns, budget unused)

  Type your question. /help for commands. Ctrl-C to interrupt. Ctrl-D to exit.
  Responses are advisory — use /apply to act on proposals.

▸
```

The entry banner establishes:
- What tool they're using (watchtower)
- Which lane (so they know they're in the right context)
- What model routing is active (transparency)
- Whether they're continuing or starting fresh
- The advisory boundary (stated once, not nagged every turn)

### 2.2 Turn interaction

```
▸ why was batch B14 rejected?

  Resolved: batch:B14, event:evt-772 (reject, B14, reviewer)
  Routing:  D2 | endpoint: codex-primary-medium | ~18K input tokens estimated

  Batch B14 was rejected with three reviewer findings:

  1. **F1 — Incomplete proof** (`finding:B14:F1`)
     The route-group cache implementation doesn't include the cold-start
     benchmark required by the acceptance criteria.

  2. **F2 — Missing edge case** (`finding:B14:F2`)
     Empty route groups cause a nil dereference in `resolveRouteGroup()`.
     This was explicitly called out in the batch brief under "failure
     boundaries."

  3. **F3 — Scope deviation** (`finding:B14:F3`)
     The worker extended the API contract to include a `warmup` method that
     isn't in the accepted spec. This is the same pattern seen on batch B07.

  Correction batch B14-R1 is queued. I suggest preserving the implementation
  session since findings F1 and F2 are straightforward corrections.

  ──────────────────────────────────────────────────────────
  Proposed: place-hold on batch:B14 (conv-prop-91)
  Purpose:   Await operator decision on whether F3 needs pack amendment
  Run:       /apply conv-prop-91    (preview first with /apply conv-prop-91 --dry-run)
  ──────────────────────────────────────────────────────────

  Turn 1 complete | D2 · 18K in · 2.2K out | conv-7f3a

▸
```

Key UX elements:

- **Pre-flight preview**: Before model invocation, show what references were
  resolved and estimated cost. The operator can Ctrl-C here to abort before
  spending tokens.
- **Markdown rendering**: The response uses terminal markdown (bold, bullet
  points, separators). Code blocks, if present, are syntax-highlighted.
- **Inline evidence references**: `batch:B14`, `finding:B14:F1` are styled
  distinctly (dimmed/italic) and are clickable/selectable for copy-paste.
- **Proposal callout**: Separated by a horizontal rule, styled distinctly (dimmed
  background or different color), with an explicit copy-pasteable command.
- **Turn footer**: Compact: turn number, decision class, token counts, conv ID.
- **No mutation occurred**: The response told the operator something useful and
  proposed a hold. Nothing changed.

### 2.3 Streaming view

With `--stream` (or a config default), provisional tokens appear in real time:

```
▸ why was batch B14 rejected?

  Resolved: batch:B14, event:evt-772
  Routing:  D2 | codex-primary-medium | ~18K tokens

  Batch B14 was rejected with three reviewer findings: 1. **F1 — Incomplete
  proof** — the route-group cache...

  ─── streaming (non-authoritative) ───
```

The provisional text is visually marked until the complete validated response
arrives and replaces it. If validation fails, the provisional text is cleared
and replaced with an error. Ctrl-C during streaming journals partial output
and shows what was received.

### 2.4 M0 turn (instant, zero tokens)

```
▸ what's the status of batch B22?

  M0 · no model invoked

  batch:B22    active (implementer session present)
  started:     2026-07-30T12:00:00Z
  endpoint:    codex-kavan-frontier-high
  corrections: 0
  repository:  awrux (dedicated worktree)

  Turn 2 complete | M0 · 0 tokens | conv-7f3a

▸
```

M0 responses are instant, structured, and visually distinct (no markdown
decoration, tabular format). The operator learns that not every question
costs tokens.

### 2.5 Staleness during response generation

```
▸ should we skip batch B18?

  ...

  ⚠ Response became stale during generation:
    batch:B14 accepted (turn snapshot was at revision 81, now at 82)

  The advice above references the lane state as it was at the start of this
  turn. Revalidation is required before applying any proposal.

  Turn 3 complete | D2 · 22K in · 3.1K out | stale | conv-7f3a

▸
```

The staleness warning is prominent but doesn't invalidate the response — the
operator can still read the advice, decide, and revalidate when applying.

### 2.6 Multi-turn flow

```
▸ is F3 the same pattern as batch B07?

  Yes — correction batch B07-R1 resolved an identical scope deviation...

▸ given that, should we pull F3 into a separate amendment batch?

  I recommend pulling F3 out. B14-R1 should handle only F1 and F2...

▸ /apply conv-prop-92

  Revalidating proposal conv-prop-92 against current state (revision 82)...

  conv-prop-92: pause dispatch for batch:B14
  Current state: batch:B14 → correction-queued
  Effect:          place hold on batch:B14 (blocks new dispatch & correction)
  Expires:         2026-07-30T16:00:00Z

  Apply? [y/N] y
  Hold hold-8c3f placed on batch:B14.
  Run /hold list to see active holds.

▸
```

The operator uses `/apply` inline during the conversation to confirm a
proposal. The effect goes through the normal confirmation + revalidation
pipeline, and the result appears inline. The flow is natural: discuss →
propose → confirm → see result → continue discussing.

## 3. Slash commands

During a `chat` session, the operator can use slash commands for quick actions
without leaving the conversation loop:

### 3.1 Lane observation (M0, always available)

| Command | Equivalent | Purpose |
|---------|-----------|---------|
| `/status` | `wt status --lane=<id>` | Full lane status report |
| `/ready` | `wt batch ready` | Ready candidates and blockers |
| `/batch <id>` | Index lookup | Show batch summary from index |
| `/events [--batch=<id>]` | `wt events latest` | Latest durable events |
| `/holds` | `wt coordinator hold list` | Active scoped holds |
| `/budget` | Conversation budget status | Remaining tokens, turns, limits |
| `/queue` | Coordinator queue status | Queued automated triggers |

### 3.2 Conversation management

| Command | Purpose |
|---------|---------|
| `/history [--since=<turn>]` | Show prior turns inline |
| `/context` | Show current working set contents (what the model "remembers") |
| `/compact` | Trigger conversation compaction |
| `/pin <ref>` | Pin a reference into future turns |
| `/unpin <ref>` | Remove a pin |
| `/fork [--topic=<text>]` | Start a child conversation |
| `/close` | Close this conversation |

### 3.3 Effect management

| Command | Purpose |
|---------|---------|
| `/apply <proposal-id> [--dry-run]` | Preview/confirm/revalidate a proposal |
| `/reject <proposal-id>` | Reject a proposal explicitly |
| `/proposals` | List unapplied proposals from this conversation |

### 3.4 Session control

| Command | Purpose |
|---------|---------|
| `/help` | Show available commands |
| `/clear` | Clear the terminal (conversation continues) |
| `/verbose` | Toggle verbose diagnostics |
| `/exit`, `/quit`, Ctrl-D | Exit the chat session |

### 3.5 Slash command rules

- Slash commands execute immediately — no model invocation, no token spend
- Commands that would produce side effects (`/apply`, `/compact`, `/close`,
  `/pin`, `/fork`) require confirmation unless `--confirm` is appended
- `/apply conv-prop-91` without `--dry-run` requires interactive confirmation
- Slash commands are available at any `▸` prompt
- Unknown slash commands show help
- Slash commands can be combined with text: `▸ /ready` then `▸ given those candidates, which should we prioritize?` — the `/ready` output appears inline before the model turn

### 3.6 Not a general command executor

`wt coordinator chat` is not a general shell or `wt` command multiplexer.
Only lane-observation and conversation-management slash commands are supported.
Running arbitrary `wt init`, `wt upgrade`, `wt doctor`, or shell commands
requires a separate terminal. This keeps the chat surface simple and prevents
operators from accidentally mutating lane state mid-conversation without the
proper confirmation path.

## 4. Display and styling

### 4.1 Terminal rendering

| Element | Style |
|---------|-------|
| Prompt | `▸` or `>`, bold green/cyan, at start of line |
| Operator input | Normal weight, user's terminal default color |
| Coordinator response | Normal weight, rendered with terminal markdown |
| Bold text | Bold + bright white |
| Code blocks | Dimmed background, syntax highlighted |
| Evidence references (`batch:B14`) | Dim/italic cyan |
| Turn footer | Dim, right-aligned or compact prefix |
| Warnings/staleness | Bold yellow prefix `⚠` |
| Errors | Bold red |
| M0 answers | Tabular, no markdown decoration, distinct prefix |
| Streaming provisional text | Italic or dimmed, with `─── streaming ───` border |
| Proposal callout | Separator line, distinct background shade |
| Budget bar | Compact line in turn footer or status area |
| Separators | Thin dimmed horizontal rule |

### 4.2 Budget display

Every turn footer includes cost:

```
Turn 4 complete | D2 · 22K in · 3.1K out · 25.1K total · 175K remaining | conv-7f3a
```

Verbose mode (`/verbose`) adds:
- Endpoint alias and capability class
- Estimated vs reported quality
- Per-turn soft/hard limits
- Conversation cumulative vs lane-wide budget

### 4.3 Color and theming

- `--no-color` disables all ANSI styling (global watchtower option)
- Default: 16-color terminal-safe palette (works on light and dark backgrounds)
- No custom theme files in v1
- `WT_NO_COLOR` environment variable honored
- `WT_COLOR_THEME=dark|light` for explicit background hint

### 4.4 Readline integration

- Up/down: navigate operator message history (per-session, per-conversation)
- Ctrl-R: reverse search in history
- Tab: auto-complete slash commands and conversation IDs
- Tab: auto-complete batch/event/requirement references after `@` or `batch:`
- Ctrl-W: delete word backward
- Ctrl-U: delete to beginning of line
- Alt-Enter or `\` continuation: multi-line input (equivalent to `--message-file=-`)
- Left/right: navigate within input line

Tab completion for lane artifacts loads from indexes (M0, no model). Completion
candidates are scoped to the current lane.

## 5. Session management

### 5.1 Session identity

A `chat` session is not a conversation. The session is the CLI process. The
conversation is the durable journal. One session may span multiple
conversations (via `/fork` or `/close` + new `ask`). One conversation may span
multiple sessions (via `--continue`).

Session metadata (local, not committed):
- Session start time
- Conversations accessed during this session
- Shell history file path
- Display preferences

### 5.2 Session resume

```
$ wt coordinator chat --continue=conv-7f3a

  watchtower 1.0.0 — coordinator conversation
  lane:         sql-backends (active, batch B22)
  conversation: conv-7f3a (open, 4 turns, 25.1K tokens used)
  last turn:    2026-07-30T14:05:00Z (12 minutes ago)
  stale:        batch B14 accepted since last turn

  Resuming...

▸
```

The session rebuilds the working set from the journal, shows what changed
while the operator was away, and drops them back at the prompt.

### 5.3 Multiple concurrent sessions

The spec permits multiple open conversations. The CLI should allow:

```
$ wt coordinator chat --continue=conv-7f3a     # session 1

# In another terminal:
$ wt coordinator chat --continue=conv-9b2e     # session 2
```

The chat session doesn't enforce singleton access — only the conversation-write
lock prevents two sessions from appending turns to the same conversation
simultaneously.

### 5.4 Session history

Shell history is saved per-conversation to a local file:

```
<watchtower-data-root>/chat-history/<conversation-id>.hist
```

This preserves operator message history across sessions. The file is plain text,
one message per line (multi-line messages use explicit delimiters). It is
gitignored and local.

## 6. @Reference syntax

Beyond the M0 parser's implicit reference resolution, the operator can use
explicit `@` syntax to attach context to a question:

```
▸ @batch:B14 @event:evt-772 why was this rejected?
```

```
▸ compare @batch:B07 and @batch:B14 — are there shared failure patterns?
```

```
▸ @file:docs/spec/routing/route-groups/implementation/v2/implementation-roadmap.md
   which batches should we prioritize given the remaining budget?
```

The `@` prefix is unambiguous and easy to type. The parser resolves these
deterministically before classification. Unresolved `@` references produce
an inline error before the model is invoked:

```
▸ @batch:B99 what's the status?
  ✗ batch:B99 not found in pack index
```

### 6.1 Reference forms

| Syntax | Resolves to |
|--------|------------|
| `@batch:B14` | Batch index entry |
| `@event:evt-772` | Runtime event |
| `@finding:B14:F3` | Review finding |
| `@req:REQ-42` | Requirement |
| `@repo:awrux` | Repository binding |
| `@turn:3` | Prior turn in current conversation |
| `@conv:9b2e:turn:5` | Turn in another conversation |
| `@file:docs/spec/...` | Committed pack file (within repo) |
| `@hold:hold-8c3f` | Active hold |

### 6.2 Tab completion for references

Pressing Tab after `@batch:` shows a selectable list of batch IDs. Pressing Tab
after `@event:` shows recent events. The completion data comes from pack/runtime
indexes and is instantaneous.

## 7. Progression bar / lane dashboard

During a chat session, a persistent status line (or optional split view in a
future TUI) shows:

```
[ lane: active B22 | impl: running | review: — | watcher: running | holds: 1 | queue: 0 ]
```

This line updates on a polling interval (or inotify on the state file) and
provides ambient awareness. The operator sees the lane's health without running
`/status`. In v1, this is a single line above the prompt that updates after
each turn. In a future TUI, it could be a persistent top bar.

## 8. Profile and preferences

A local operator preferences file (not per-lane, not committed):

```
<watchtower-data-root>/operator-preferences.json
```

```json
{
  "schemaVersion": 1,
  "chat": {
    "stream": true,
    "showEstimatedCost": true,
    "showRoutingBeforeTurn": true,
    "showTurnFooter": "compact",
    "statusBar": true,
    "statusBarPollIntervalSeconds": 5,
    "confirmEffects": true,
    "maxHistoryEntries": 500,
    "welcomeBanner": "compact"
  }
}
```

These are local UI preferences, not lane policy. They don't affect routing,
budget, or conversation behavior — only what the operator sees.

## 9. Multi-line input

For complex questions:

```
▸ \
  I need to understand the relationship between batches 14-18.
  Batch 14 was rejected with three findings. Batch 16 depends on 14.
  Batch 17 depends on 16. If we restructure 14, what's the
  minimum change to keep 16 and 17 on track?

  [Enter submits, Ctrl-C cancels, \ continues on next line]
```

The `\` at end of line continues input. The prompt changes to `…` for
continuation lines. Empty line + Enter submits. This is compatible with
readline and paste.

Alternatively, `--message-file=-` or `/msg` for editor-style input:

```
▸ /msg
  [opens $EDITOR or a temporary file for multi-paragraph input]
```

## 10. Notification during chat

If an important event occurs while the operator is in a chat session (but not
actively in a turn):

```
▸

  ⚡ batch B15 accepted (automated M0 dispatch → batch B16 launched)

▸
```

The notification appears before the next prompt. The operator is not
interrupted mid-typing. Configurable: which event classes trigger
notifications (default: accept, reject, escalation, watcher failure).

## 11. Accessibility

- All information conveyed by color also uses text labels or symbols (`⚠`, `✓`,
  `✗`, `⚡`)
- `--no-color` produces clean monochrome output
- Slash commands have text equivalents (`/status` = `wt status`)
- Turn footers include compact text versions of all color-coded information
- Streaming chunks are self-contained (no cursor-position tricks)
- `--json` mode bypasses all terminal UI and streams structured records
- Screen-reader compatible: output is plain text with ANSI, no TUI widgets
  that assume cursor addressing in v1

## 12. Comparison with opencode/Claude Code

| Aspect | OpenCode / Claude Code | Watchtower `chat` |
|--------|----------------------|-------------------|
| Primary role | Coding agent (reads/writes/executes) | Advisory coordinator (reads/proposes) |
| Mutation | Agent directly edits files, runs commands | Separate `/apply` through effect executor |
| Tool use | Inline rendered with streaming | No tool use during conversation |
| Session continuity | One provider session per conversation | Stateless per turn, bounded working set |
| File editing | Diff view, inline changes | Not applicable |
| Permission prompts | Before each tool execution | Before each effect application |
| Slash commands | Agent commands + shell commands | Only lane-observation + conversation |
| History | Provider remembers everything | Watchtower journal/index, bounded window |
| Multi-session | Yes | Yes (different terminals, different conversations) |
| Streaming | Yes | Yes (`--stream`) |
| Markdown rendering | Yes | Yes |
| Budget display | Visible | Visible (turn footer + verbose mode) |

The fundamental difference: OpenCode's agent acts; Watchtower's coordinator
advises. The UX goal is to make this boundary feel like deliberate safety, not
missing functionality.

## 13. Integration with wt commands

The chat session is a CLI mode, not a separate binary or process. It shares the
same lane discovery, pack indexes, and configuration as the rest of `wt`. The
operator can always open another terminal and run `wt status`, `wt doctor`, etc.
alongside a chat session.

Slash commands are convenience shortcuts for exact `wt` equivalents:

| Slash | Equivalent |
|-------|-----------|
| `/status` | `wt status --lane=<id>` |
| `/ready` | `wt batch ready --lane=<id>` |
| `/events` | `wt events latest --lane=<id>` |
| `/holds` | `wt coordinator hold list --lane=<id>` |
| `/budget` | `wt coordinator conversation budget <id>` |
| `/queue` | `wt coordinator status --lane=<id>` |

The outputs are formatted for inline display (compact, structured) rather than
the full `wt` command output, but derive from the same JSON contracts.

## 14. Filesystem contract

```
<watchtower-data-root>/
  chat-history/
    <conversation-id>.hist        # shell history, one message per line
  operator-preferences.json        # local display preferences
```

Chat history files are local, gitignored, and may be deleted without affecting
conversation journal integrity. They are convenience data for readline, not
authoritative conversation records.

## 15. Open questions

1. **Should the chat session support pipe/redirect for scripting?**
   `echo "question" | wt coordinator chat` — does this enter the interactive
   loop and immediately exit after one turn, or should `ask` remain the
   scripting interface?

2. **Should multi-line input use `\` continuation or a separate input mode?**
   `\` at end of line is readline-native. `/msg` with $EDITOR is more powerful
   but context-switches to a different interface. Both should be supported.

3. **How verbose should welcome banners be?**
   `compact` (lane + routing + 1 advisory note), `full` (adds budget, active
   holds, recent events), `minimal` (just the prompt). Configurable in
   preferences.

4. **Should streaming be default, opt-in, or config-dependent?**
   Streaming provides better responsiveness. Batch delivery is simpler and more
   auditable. Default: streaming on for interactive terminals, off for pipes
   and `--json`. Overridable in preferences.

5. **Should the status bar auto-refresh or update on demand?**
   Polling every N seconds vs on-turn-only. Polling adds filesystem noise but
   provides awareness during long operator pauses. Default: low-frequency
   polling (30s) with `/status` for on-demand.

6. **Can the chat session span multiple lanes?**
   The session binds to one lane on startup. Switching lanes requires exiting
   and restarting. A future `/lane <slug-or-id>` command could switch, but
   this adds complexity without clear v1 need.

7. **Should the operator be able to pipe command output into the chat?**
   `wt status --json | wt coordinator ask --message-file=- "summarize this"`.
   This is already supported via `--message-file=-`. Should there be a
   shorthand?

8. **How should the CLI handle terminal resize during streaming?**
   Streaming already handles this at the terminal level (line wrapping).
   Structured output should reflow cleanly. Future TUI would need explicit
   resize handling.

## 16. Recommended next steps

1. Adopt this discussion and extract the normative parts into
   `operator-session.md` §19 (CLI contract) and a new § for
   session UX, or a separate `cli-session.md`.

2. Define the exact M0 slash-command contract and output schemas.

3. Implement the readline loop, history, and tab completion as foundation
   modules before building the full chat experience.

4. Prototype streaming with provisional-vs-validated state transitions.

5. Define the terminal rendering primitives (markdown, colors, separators,
   turn footers) as shared utilities usable by all `wt` commands, not just
   `chat`.

6. Test with real operator sessions: does the advisory boundary feel natural?
   Is the proposal → apply flow discoverable?
