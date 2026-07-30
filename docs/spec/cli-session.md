# Watchtower v1 Full-Screen Operator Session TUI

Status: **Proposed — implementation-ready**
Target release: `1.0.0`
CLI group: `wt coordinator session`
Last updated: 2026-07-31

This document is normative for the full-screen terminal user interface (TUI)
used by a foreground attachment to an operator session. Session semantics,
bounded memory, routing, retention, proposals, and effect authority remain
normative in
[operator-session.md](operator-session.md). This document resolves
[discussions/cli-session-ux.md](discussions/cli-session-ux.md) and the UI
portions of
[discussions/operator-session-gaps.md](discussions/operator-session-gaps.md).
Default limits, adapter capability fallback, output/error envelopes, and
retention execution are normative in [v1-contracts.md](v1-contracts.md).

## 1. Product statement

`wt coordinator session` gives an operator an OpenCode-quality, full-screen
terminal workspace for working with Watchtower without creating a persistent
coordinator model. The TUI presents durable conversation, lane context,
sessions, agents, batches, budgets, events, holds, and proposals in one
responsive interface. It may feel continuous; the underlying reasoning remains
a sequence of independently routed, bounded turns.

```text
full-screen foreground TUI attachment
  → layout, focus, input, rendering, completion, notifications
  → shared WT query/command services
  → durable operator session journal and indexes
  → one M0 or bounded D1–D3 turn
  → validated answer or separately confirmed effect
```

The TUI attachment is a presentation client. Its panels, component state,
scroll positions, animation frames, and render buffers are never lane state,
session memory, a provider-side chat, an effect authority, or a background
daemon.

## 2. Goals and non-goals

### 2.1 Goals

1. Deliver a polished full-screen terminal workspace suitable for daily,
   sustained operator use.
2. Make bounded advisory interaction responsive, legible, and discoverable.
3. Show lane, session, routing, context, budget, staleness, and authority
   boundaries at the moment they matter.
4. Provide a stable conversation workspace plus a right-side contextual
   inspector for sessions, lane state, batches, agents, budgets, holds,
   proposals, events, and turn context.
5. Provide deterministic commands and a searchable command palette without
   invoking a model unnecessarily.
6. Preserve terminal usability through streaming, multiline input, completion,
   history navigation, interruption, resize, focus navigation, mouse support,
   and state-change notifications.
7. Allow many operator sessions and attachments for one lane while retaining
   one effect authority.
8. Support themes, bounded purposeful animation, reduced motion, no-color, and
   accessible non-cursor alternatives without changing product semantics.
9. Keep TUI behavior testable through stable view models, presentation events,
   render snapshots, and PTY fixtures.
10. Preserve `ask`, JSON output, and ordinary one-shot CLI commands as
    first-class non-interactive surfaces.

### 2.2 Non-goals

- An IDE, browser application, desktop GUI, or general shell.
- A lane-wide singleton chat.
- A persistent provider conversation or lane-lifetime coordinator process.
- Direct inline agent tool execution or arbitrary `wt` command execution.
- Treating terminal screen contents, scrollback, component state, or
  provisional text as
  authoritative history.
- Pausing automation merely because an attachment or operator session exists.
- Replacing `wt coordinator ask`, command JSON output, or conventional
  non-interactive commands with the TUI.
- Requiring a daemon or network service for a local v1 TUI attachment.

## 3. Vocabulary and cardinality

| Term | Meaning |
|------|---------|
| Operator session | Durable lane-bound human–WT discussion |
| TUI attachment | Ephemeral full-screen terminal process bound to one lane and one operator session at a time |
| Turn | One bounded operator request and response attempt |
| Presentation event | Typed UI record emitted by shared WT services |
| Notification | M0 projection of a relevant lane event shown by an attachment |
| Conversation workspace | Primary panel containing retained turns, provisional output, structured results, and the composer |
| Inspector | Secondary right-side panel showing one selected contextual view |
| Inspector view | Sessions, lane, batches, agents, budgets, holds, proposals, events, or turn context |
| Overlay | Temporary modal surface such as the command palette, picker, help, confirmation, or details viewer |
| Focus target | One keyboard-input owner: conversation, composer, inspector, or overlay |
| View model | Bounded, immutable presentation projection consumed by TUI components |

Cardinality:

```text
one lane
  → any number of historical operator sessions
  → policy-bounded open sessions and concurrent turns
  → any number of foreground attachments within local resource policy

one operator session
  → zero or more attachments
  → at most one active turn

one TUI attachment
  → exactly one lane
  → at most one currently bound operator session
  → exactly one active focus target
```

Operator sessions are not scoped one-per-project or one-per-lane. Separate
topics should normally use separate sessions so their memory, pins, proposals,
and budgets remain attributable and bounded.

## 4. Entry and attachment lifecycle

```text
wt coordinator session
  [--topic=<text>]
  [--policy-profile=<id>]
  [--tag=<tag>...]
  [--stream|--no-stream]
  [--entry-density=<compact|full|minimal>]

wt coordinator session attach <operator-session-id>
  [--observe]
  [--stream|--no-stream]
  [--wait-for-active-turn]
  [--entry-density=<compact|full|minimal>]
```

- Bare `session` creates a new open operator session and attaches.
- `session attach <id>` validates the selected lane and session, loads its
  bounded current projection from verified indexes, and attaches without
  appending a turn or changing lifecycle state.
- `session resume <id>` is reserved for the `suspended → open` lifecycle
  transition and does not attach.
- `--topic`, `--policy-profile`, and `--tag` apply only to creation.
- `--observe` creates an explicitly read-only attachment.
- The command requires an interactive terminal in v1.
- `wt coordinator ask` remains the stdin, pipe, and one-result JSON interface.
- `wt coordinator chat` is not a v1 alias; an unknown-command diagnostic may
  suggest `wt coordinator session`.
- Exiting or losing an attachment never closes or suspends the operator
  session.

Attachment states are local and ephemeral:

```text
STARTING → ATTACHED ↔ TURN_ACTIVE → DETACHING → STOPPED
             ↘ OBSERVING
             ↘ SESSION_UNAVAILABLE
```

An attachment in `SESSION_UNAVAILABLE` may use `/new`, `/switch`, or `/exit`;
it cannot append natural-language input.

## 5. TUI shell, layout, and session entry

### 5.1 Canonical wide layout

The v1 reference layout uses a dominant conversation workspace and a
right-side contextual inspector:

```text
┌────────────────────────────────────────────────────┬────────────────────────┐
│ WT · lane sql-backends · batch B22 · session 7f3a │ Inspector: Lane        │
├────────────────────────────────────────────────────┤                        │
│ Conversation                                       │ lifecycle   active     │
│                                                    │ batch       B22        │
│ Operator                                           │ ready       3          │
│ Why was B14 rejected?                              │ holds       1          │
│                                                    │ budget      38%        │
│ WT                                                 ├────────────────────────┤
│ The reviewer found three contract mismatches…      │ Agents                 │
│                                                    │ D2 route    available  │
│ [Proposal opsess-prop-92 · requires confirmation]  │ reviewer    running    │
│                                                    │ implementer waiting    │
│                                                    │                        │
├────────────────────────────────────────────────────┤                        │
│ ▸ Ask WT…                                          │                        │
│ D2 · codex-primary · stream on · 38% lane budget   │                        │
└────────────────────────────────────────────────────┴────────────────────────┘
```

The conversation begins at the stable left reading edge. Opening, closing, or
changing the inspector must not change the semantic position of retained
conversation content. The inspector is on the right by default because it is
context for, not the owner of, the current conversation.

The shell contains:

1. a compact global header with Watchtower, lane, batch, session, connectivity,
   attention, and budget state;
2. the scrollable conversation timeline;
3. a multiline composer and turn preflight/footer region;
4. a right-side inspector with tabs or a view picker;
5. transient toasts that never cover the composer or required confirmation;
6. overlays for the command palette, session/reference picker, help,
   confirmation, details, and settings; and
7. a discoverable status/shortcut footer when space permits.

The header, composer, required warnings, confirmation choices, and current
focus indication take precedence over decorative information when space is
constrained.

### 5.2 Inspector contract

The inspector has a closed v1 view registry:

| View | Required bounded content |
|------|--------------------------|
| `sessions` | Filtered recent/open operator sessions, state, topic, last turn, attention count |
| `lane` | Lane lifecycle, current batch, readiness, watcher/coordinator health, repository bindings |
| `batches` | Ready/active/blocked batches with stable IDs and blocking reason codes |
| `agents` | Declared routes, active worker sessions, availability, allocation, and health |
| `budgets` | Turn/session/lane usage, telemetry quality, reservations, limits, and protected reserves |
| `holds` | Active scoped holds, expiry, owner, and blocked action classes |
| `proposals` | Current session proposals, state, risk class, staleness, and confirmation requirement |
| `events` | Paginated recent durable events with filters and stable IDs |
| `context` | Exact bounded working-set manifest, references, pins, capsules, limits, and truncation |

Every view consumes a typed bounded query result. It must show loading, empty,
stale, truncated, unavailable, and error states explicitly. It must never scan
an entire pack or journal, invoke a model, infer authority from tmux prose, or
silently replace unavailable data with an unbounded fallback.

Selecting an item may:

- move conversation focus to an already retained turn or proposal;
- open a bounded details overlay;
- insert an authorized reference into the composer; or
- invoke a documented command through the shared command registry.

Selection alone never mutates lane or session state.

### 5.3 Responsive layout

The TUI recomputes layout on every terminal resize without restarting or
losing unsubmitted composer text:

| Terminal class | Required behavior |
|----------------|-------------------|
| Wide, at least 120 columns and 24 rows | Persistent conversation plus right inspector |
| Standard, 80–119 columns and at least 20 rows | Conversation is primary; inspector toggles as a full-height drawer/overlay |
| Narrow, 50–79 columns or 14–19 rows | Single-pane conversation; all secondary views use overlays; dense metadata collapses to labeled summaries |
| Temporarily unusable, below 50 columns or 14 rows | Preserve state and show a resize-required screen with exit/help actions; automatically recover after resize |

Column counts use terminal cells, not Unicode code-point length. Layout must
honor wide glyphs, combining characters, wrapping, and stable-ID visibility.
No viewport may truncate a required failure code, confirmation choice,
proposal ID, or selected reference without a details path.

`inspectorSide` defaults to `right`. A supported operator-local `left`
preference may mirror the wide layout, but the right-side layout is the v1
golden baseline. Inspector width is operator-adjustable within layout bounds;
the bounded local preference stores a ratio, not an absolute assumption about
future terminal size.

### 5.4 Focus and navigation

Exactly one target owns keyboard input. Focus changes are explicit and visibly
indicated; background panels never consume typing.

The default action registry includes:

| Action | Default interaction |
|--------|---------------------|
| Focus composer | `i` from navigation mode or direct selection |
| Cycle major regions | `Tab` / `Shift-Tab` |
| Toggle inspector | `Ctrl-B` |
| Select inspector view | command palette or inspector tab keys |
| Open command palette | `Ctrl-P` |
| Open session picker | palette action `session.switch` |
| Open help/keymap | `?` outside composer |
| Scroll focused view | arrows, PageUp/PageDown, mouse wheel when supported |
| Return/close overlay | `Esc` |
| Detach | palette/slash action, or Ctrl-D at an empty composer |

The keymap is a command-to-key mapping, not scattered component handlers.
Commands declare availability, mutation class, confirmation needs, observer
eligibility, and focus scope. Conflicts are rejected during preference loading
and the effective keymap is inspectable from help.

Mouse input may focus, scroll, select tabs, and activate explicit controls. All
features remain keyboard-complete, and text selection/copy must remain usable.

### 5.5 Session entry

The default compact shell includes:

- Watchtower version;
- selected lane slug and lifecycle;
- operator-session ID, topic, lifecycle, and turn count;
- active D1–D3 route aliases and route availability;
- session and lane-wide budget state;
- active holds affecting the lane;
- changes since the session's prior turn or attachment; and
- one concise advisory/effect-boundary reminder.

In the full-screen TUI these values populate the initial shell rather than
printing an irreversible banner. Example compact header and footer state:

```text
WT 1.0.0 · sql-backends · active · B22 · opsess-7f3a · 4 turns
D2 codex-primary-medium · budget healthy · /apply always revalidates
```

The shell must not disclose OS usernames, account credentials, provider
secrets, or raw environment values. Endpoint aliases are allowed.

When attaching to an existing session, an entry overlay or bounded
conversation callout shows the last turn time and a deterministic M0 change
projection from that turn's snapshot to current lane state. It includes
policy-bounded recent worker events, holds, watcher/coordinator outcomes, and
budget changes with stable IDs and a `+N more` action opening the filtered
events inspector when truncated. It is never model-summarized.

`compact` is the default entry density. `full` may include an existing bounded
last-turn capsule; `minimal` shows identity and whether changes exist. No entry
density suppresses safety, staleness, policy, or budget failures.

## 6. Presentation architecture

The TUI event loop and component tree contain no coordinator policy or effect
logic. They consume normalized presentation events and bounded query results
returned by shared foundation services:

```text
attachment.opened
session.bound
turn.preflight
turn.invocation-started
turn.provisional
turn.validated
turn.stale
turn.interrupted
turn.failed
proposal.available
effect.preview
effect.confirmed
effect.result
lane.notification
budget.updated
attachment.detached
```

Each event carries stable lane, operator-session, turn, correlation, and
revision identifiers as applicable. Presentation events are renderable as
TUI view models, plain-text fallbacks, and test fixtures; they do not replace
authoritative journals.

This is a transport-neutral internal boundary in v1, not a public JSON wire
protocol. The v1 product supplies the local foreground TTY attachment only.
Socket,
IDE, web, and remote transports require a later versioned authentication,
authorization, replay, backpressure, and compatibility contract.

The reference component ownership is:

```text
TuiApplication
├── AttachmentLifecycleController
├── PresentationEventReducer
├── TuiViewModelStore
├── FocusManager
├── KeymapRegistry
├── RenderScheduler
├── ThemeResolver
└── RootLayout
    ├── Header
    ├── ConversationViewport
    │   ├── TurnBlock*
    │   ├── ProposalBlock*
    │   └── Composer
    ├── Inspector
    │   └── InspectorView
    ├── OverlayHost
    ├── ToastRegion
    └── StatusFooter
```

This is responsibility guidance, not permission for one oversized TUI module.
Components render immutable bounded view models and emit typed UI intentions.
Controllers translate intentions into shared application capability calls.
Reducers accept only validated presentation events. No component imports a
session store, SQLite driver, model/provider adapter, effect executor, NVB
facade, or raw subprocess capability.

Rendering is frame-coalesced and backpressure-aware:

- state changes mark affected view-model regions dirty;
- the scheduler coalesces bursts up to a configured maximum refresh rate;
- durable terminal events and input are never discarded;
- provisional stream chunks may be coalesced for rendering but remain ordered
  in the owning turn accumulator;
- resize causes a complete layout pass, not a product-state refresh;
- slow rendering cannot create a second unbounded event queue; and
- renderer failure stops the attachment safely without corrupting the durable
  operator session.

Terminal Markdown, colors, separators, progress indicators, tables, borders,
and text measurement belong to a shared Nirvana TUI/rendering capability, not
feature-local ANSI helpers. Existing `TerminalView` remains the conventional
buffered-output surface; it is not by itself a full-screen compositor.
Provider adapters normalize streaming and usage telemetry before TUI reducers
see it.

## 7. Turn UX

### 7.1 Preflight

Before a model-backed invocation, WT resolves references, builds the bounded
working set, chooses the minimum decision class and route, and estimates usage.
When enabled, the composer footer or preflight overlay displays:

```text
Resolved: batch:B14, event:evt-772
Routing: D2 · codex-primary-medium · estimated 18K input tokens
```

This display does not create an implicit confirmation pause unless attachment
preference or lane policy selects confirmation mode `d3`, `d2-d3`, or `all`.
`off` is the UI default, but lane policy may require a stricter minimum that a
preference cannot weaken.

- `off`: no UI-added pause;
- `d3`: confirm D3 model-backed turns;
- `d2-d3`: confirm D2 and D3 model-backed turns; and
- `all`: confirm every model-backed turn.

M0 never requires model-invocation confirmation.

When confirmation applies, WT opens a focus-trapped confirmation overlay with
resolved context, route, telemetry quality, estimated usage, session/lane
remaining limits, protected reserve impact, explicit choices, and the
applicable keyboard shortcuts. Declining records
`operator-session-turn-cancelled-before-invocation` with zero model use because
the operator message already has a durable turn identity. It does not silently
delete the message or disable future confirmation.

Non-interactive `ask` fails with
`OPERATOR_SESSION_CONFIRMATION_REQUIRED` when policy requires confirmation,
unless the caller supplied explicit `--confirm-invoke`. It never silently
treats confirmation as off. Once adapter invocation starts, WT must not claim
that Ctrl-C prevented provider usage.

M0 responses display `M0 · no model invoked` and use a compact deterministic
table.

### 7.2 Response

A completed turn renders as one addressable timeline block containing:

- validated advisory answer;
- resolved evidence references;
- assumptions and open questions when present;
- proposal callouts with stable proposal IDs;
- staleness and changed revisions;
- decision class and endpoint alias;
- reported or clearly labeled estimated usage; and
- session/turn ID and remaining budget.

The advisory boundary is stated in the shell and visually reinforced on
proposal/effect callouts. WT need not repeat a prose disclaimer after every
ordinary answer.

Turn blocks support deterministic collapse/expand, copy, reference insertion,
and a bounded details overlay. Collapse state is attachment-local and cannot
change retained content. The timeline keeps only a bounded visible render
window plus overscan; scrolling toward unloaded retained history requests
another bounded page from the session query service. A large session must not
produce a DOM-like component or terminal buffer for every retained turn.

### 7.3 Staleness

Automation continues during a turn. When relevant revisions change, the
attachment displays the old and current revision plus a bounded change
summary. The answer remains advice about its recorded snapshot. Every proposal
still requires current-state revalidation.

## 8. Streaming

Streaming defaults on for an interactive terminal when the selected adapter
supports safe interruption; it is otherwise buffered. `--stream` cannot
override an adapter that lacks the required contract.

States:

```text
PREFLIGHT → PROVISIONAL* → VALIDATING
  → VALIDATED | STALE_VALIDATED | INTERRUPTED | FAILED
```

Rules:

- provisional chunks are visibly marked non-authoritative;
- chunks never create proposals or effects;
- only one complete schema-valid response becomes the recorded answer;
- validation failure leaves provisional content only as interrupted/failed
  diagnostic evidence;
- accessible mode uses append-only lines rather than cursor rewriting;
- if validated prose differs from provisional prose, the final validated
  answer is printed distinctly; and
- usage is reported from the adapter when available and otherwise remains
  explicitly estimated.

The conversation viewport follows new provisional output only while the
operator remains at the live edge. Scrolling upward disables automatic follow
and shows a `new output` indicator; returning to the live edge resumes it.
Streaming must not steal focus, move the composer cursor, close an overlay, or
reset the inspector selection.

## 9. Slash commands

Slash commands use exact parsing and invoke shared WT services. They never pass
through the natural-language classifier.

Every slash command has one canonical action ID shared with the command
palette. The palette is searchable by title, action ID, alias, and contextual
keywords and displays disabled reasons, mutation class, and shortcut. A palette
action and its slash equivalent must produce the same typed request and
authorization behavior. The TUI must not maintain a second command
implementation.

### 9.1 Read-only M0 commands

| Command | Result |
|---------|--------|
| `/status` | Current lane projection |
| `/ready` | Ready candidates and blockers |
| `/batch <id>` | Bounded batch-index lookup |
| `/events [--batch=<id>]` | Paginated recent durable events |
| `/holds` | Active scoped holds |
| `/budget` | Turn, session, lane, and reserve status |
| `/queue` | Coordinator trigger queue |
| `/history [--since=<turn>]` | Paginated retained turns |
| `/context` | Exact bounded working-set manifest, not hidden provider history |
| `/proposals` | Current unapplied session proposals |
| `/sessions` | Operator sessions for the selected lane |
| `/export [options]` | Deterministically render retained records; no model summary |

### 9.2 Session metadata and lifecycle commands

| Command | Behavior |
|---------|----------|
| `/pin <ref>` | Add an allowed bounded continuity reference |
| `/unpin <ref>` | Remove a pin |
| `/compact` | Preview and explicitly start deterministic or model-backed compaction |
| `/new [--topic=<text>]` | Create and bind a new operator session |
| `/switch <operator-session-id>` | Bind this attachment to another resumable session |
| `/fork [--topic=<text>]` | Create a child and bind the attachment to it |
| `/suspend` | Suspend the current session after confirmation |
| `/resume` | Resume the currently bound suspended session |
| `/close` | Terminally close the current session after confirmation |
| `/budget grant ...` | Preview/confirm a finite authorized session budget grant |

Pin/unpin operations are reversible journal mutations and do not require a
confirmation prompt by default. Compaction may invoke a model and consume
budget; its preview states whether it is M0 or model-backed. Close is terminal
and always confirms interactively. Forking or opening a new session never
resets lane-wide usage.

### 9.3 Proposal and effect commands

| Command | Behavior |
|---------|----------|
| `/apply <proposal-id> [--dry-run]` | Preview, confirm, revalidate, and invoke the normal effect executor |
| `/reject <proposal-id>` | Journal explicit operator rejection |
| `/amend [--from-turn=<id>] [--rationale=<text>]` | Prepare/confirm a typed amendment-request handoff |

`/apply` is only a UI shortcut for
`wt coordinator session apply <proposal-id>`. It does not grant inline agent
authority. Actual mutation always requires confirmation, current-state
revalidation, lane locking where required, effect journaling, and idempotent
execution.

### 9.4 Attachment commands

| Command | Behavior |
|---------|----------|
| `/help` | Show commands and completion hints |
| `/clear` | Clear presentation only; retained session state is unchanged |
| `/verbose` | Toggle attachment diagnostics |
| `/confirm-mode [off|d3|d2-d3|all] [--save]` | Show/change attachment invocation confirmation preference |
| `/exit`, `/quit` | Detach without closing |

Unknown commands show an exact error and nearest documented candidates. The
attachment does not execute arbitrary shell commands or unrelated mutating WT
commands.

Confirmation preference cannot weaken lane policy. Without `--save`, a
`/confirm-mode` change lasts only for the attachment; `--save` updates the
operator-local UI preference, not session policy or budget.

### 9.5 Observer attachments

An attachment created with `--observe`:

- may execute only the read-only commands in §9.1;
- accepts no natural-language turns or session/effect mutations;
- holds no session write lock, endpoint slot, or budget reservation;
- may observe durable validated, stale, interrupted, and failed turn events;
- does not receive another process's provisional chunks in v1; and
- displays an explicit read-only shell/composer state and detaches without changing
  session state.

Any number of local observers is allowed within filesystem access and resource
policy. Observer mode does not broaden multi-user permissions or expose
full-text content to an OS account that could not already read it.

## 10. Input, completion, and references

The attachment supports:

- a multiline full-screen composer with cursor/selection editing and standard
  word/line deletion;
- up/down and reverse search over authorized operator-message history;
- newline insertion, bounded paste, trailing `\`, and `/msg`;
- `$EDITOR` for `/msg` when configured safely;
- completion for slash commands, their options, session IDs, and allowed
  indexed references; and
- `@` references such as `@batch:B14`, `@event:evt-772`,
  `@finding:B14:F3`, `@req:REQ-42`, `@turn:3`, and
  `@session:opsess-9b2e:turn:5`.

`@file:` resolves only normalized authorized files in the sealed
implementation pack or declared participating repositories under context
policy. It rejects traversal, symlink escape, uncommitted unauthorized
material, credentials, and arbitrary filesystem paths before invocation.

An unresolved or ambiguous explicit reference fails before model use. Friendly
natural-language references remain subject to the conservative resolver in the
operator-session spec.

The composer distinguishes submit from newline with a documented, inspectable
key binding. Large pastes are represented by a reversible attachment-local
paste capsule showing line/byte counts; expanding or submitting the capsule
uses the exact bounded pasted content. Input over policy limits is rejected
before journaling or model invocation.

Completion and reference pickers are overlays fed by bounded cancellable
queries. A stale completion result cannot overwrite a newer input revision.
Opening a picker never changes the current composer buffer until the operator
accepts a candidate.

Slash parsing is deterministic:

- a leading token exactly matching the closed registry is a command and invalid
  arguments produce a command error;
- an unknown leading `/word` is an error, never a paid natural-language turn;
- `//text` explicitly escapes to natural language and journals `/text`; and
- slash-like text after the first token is ordinary message content.

## 11. History and retention

Authoritative input history comes from retained operator-session journals and
bounded indexes. WT must not create an unlimited independent plaintext copy of
operator messages by default.

An optional local line-editor cache may exist only when it:

- uses owner-only permissions;
- has finite entry, byte, and age limits;
- is identified as non-authoritative;
- is purged when matching session content is pruned;
- never survives an explicit privacy purge of that session; and
- does not make pruned content replayable.

Terminal scrollback is outside WT authority and must never be used to rebuild
memory.

## 12. Concurrency and notifications

Many attachments may target one lane. Different operator sessions may run
turns concurrently within endpoint and lane policy. One operator session has
at most one active turn.

When another attachment attempts a turn for the same active session:

- default behavior returns `OPERATOR_SESSION_TURN_ACTIVE`;
- `--wait-for-active-turn` waits for the durable turn result without launching
  another invocation; and
- no waiting attachment holds the session write lock, lane mutation lock, or
  endpoint reservation.

An observer follows durable journal/index checkpoints and can issue M0 queries
while another turn runs. V1 does not relay in-memory provisional chunks between
attachments; completed/failed/interrupted events are sufficient for correctness
without a daemon or attachment IPC authority.

Lane notifications derive mechanically from journal/index checkpoints. They:

- invoke no model;
- never advance the watcher authority cursor;
- may refresh non-focused header/inspector/status projections without changing
  focus, scroll anchor, composer content, or selected confirmation;
- queue intrusive conversation callouts and toasts while the operator confirms
  an effect;
- surface queued attention at the next safe interaction boundary;
- include stable event IDs; and
- update the next turn's bounded change summary.

A foreground filesystem watch or bounded low-frequency poll may improve
responsiveness. It terminates with the TUI attachment and is not a daemon.
Refresh work is coalesced, cancellable, and visibility-aware; hidden inspector
views do not poll independently. On-turn checkpoint refresh remains the
correctness baseline.

## 13. Signals and terminal behavior

| Input | Behavior |
|-------|----------|
| Ctrl-C while editing | Clear current unsubmitted input |
| Ctrl-C during preflight before invocation | Abort without starting an endpoint |
| Ctrl-C after invocation starts | Request interruption; journal partial output and actual/estimated usage |
| Ctrl-C at confirmation | Reject the confirmation; apply no effect |
| Ctrl-D at an empty prompt | Detach without closing the operator session |
| Terminal loss/SIGHUP | Stop rendering, request safe interruption if a turn is owned, and preserve durable recovery state |
| Resize/SIGWINCH | Recompute the responsive layout while preserving composer text, selection, focus where valid, timeline anchor, and overlay intent |
| Suspend/SIGTSTP | Restore terminal modes before suspension and completely redraw verified current state after SIGCONT |

Interruption never treats provisional output as an answer and never applies a
partial proposal.

The attachment has one idempotent terminal-restoration owner. Normal exit,
startup failure, renderer failure, uncaught error, SIGHUP, SIGTERM, and
suspension restore raw mode, alternate-screen state, mouse mode, bracketed
paste, cursor visibility, terminal title where possible, and installed signal
handlers. A best-effort emergency restoration path must not write session or
lane authority.

## 14. Rendering and accessibility

### 14.1 Visual system

The TUI uses semantic design tokens rather than component-owned ANSI values:

```text
surface, surfaceRaised, border, borderFocused
text, textMuted, textStrong
accent, info, success, warning, danger
operator, watchtower, provisional, stale, disabled
```

Themes map semantic tokens to terminal capabilities. V1 ships at least
`dark`, `light`, and `system` themes plus a high-contrast mode. The resolver
detects capability conservatively and degrades truecolor → 256 color → 16
color → monochrome without changing meaning. User themes, if enabled, are
schema-validated, bounded data files and cannot contain executable code or
escape sequences.

Borders, spacing, typography, Markdown, tables, diffs, code blocks, badges, and
status indicators form a shared component system. Components may not invent
private palettes or width algorithms. Long code/diff lines support horizontal
inspection or deterministic wrapping without making stable identifiers
unreachable.

### 14.2 Animation

Animation is allowed only for state continuity and active progress:

- bounded spinner/progress frames while a known operation is active;
- inspector, overlay, and focus transitions;
- restrained arrival emphasis for notifications or completed turns; and
- streaming caret/activity indication.

Animation never delays an authoritative result, confirmation, error, or
interruption. It cannot encode the only indication of state, run while the TUI
is not visible, or generate durable events. Frame rate and queued frames are
bounded; dropped decorative frames do not affect correctness.

`reducedMotion` disables nonessential transitions and replaces animated
progress with a labeled static indicator. The TUI automatically avoids
high-frequency animation when terminal capability or measured rendering
latency is insufficient.

### 14.3 Accessibility and fallback

- All color meaning also has a text label or symbol.
- `--no-color` and `NO_COLOR` disable color without removing structure.
- Focus, selection, provisional, stale, disabled, success, and failure states
  remain distinguishable in monochrome.
- References are copyable stable IDs; clickable terminal links are optional
  enhancement, not a correctness promise.
- A screen-reader/accessible mode uses a linear logical focus order, restrained
  redraw, explicit region titles, static progress, and an append-only
  announcement stream.
- Required state remains accessible without mouse, animation, Unicode icons,
  syntax highlighting, or terminal hyperlinks.
- Narrow layouts preserve IDs and actionable failure information.
- Secrets and configured sensitive fields are redacted in normal, verbose,
  error, copied, and debug presentation.

If the full-screen renderer cannot initialize safely, interactive `session`
fails with an actionable diagnostic and restores the terminal. It does not
silently switch to a semantically different interactive console. The operator
may use `wt coordinator ask` and ordinary one-shot commands; a future explicit
plain attachment mode would require its own contract.

### 14.4 Nirvana TUI capability and renderer selection

The pinned Nirvana `TerminalView` is a buffered report renderer, not a
full-screen input/layout runtime. V1 therefore requires a documented
`NIRVANA_API_GAP` and a reusable Nirvana interactive-TUI capability rather than
a Watchtower-local ANSI engine.

The capability boundary must provide:

- terminal capability detection and alternate-screen lifecycle;
- raw keyboard, mouse, bracketed-paste, resize, suspend, and resume events;
- cell-accurate text measurement, clipping, wrapping, and flex/grid layout;
- focus, selection, scroll viewport, overlays, and input-editor primitives;
- semantic theme tokens and terminal-color degradation;
- bounded render scheduling, diffing, animation, and restoration;
- deterministic fake-renderer and PTY test adapters; and
- a framework-neutral component/application boundary consumable by
  Watchtower.

The selected v1 engine is the imperative `@opentui/core` API with
`@opentui/keymap`, behind the generic Nirvana capability. WT uses plain
TypeScript renderable composition. It does not use React, Solid, Ink,
JSX/TSX, Babel, OpenTUI framework bindings, framework hooks/reconcilers, or a
second frontend build pipeline.

Node `>=26.4.0` is the v1 runtime floor. OpenTUI native rendering requires
`--experimental-ffi`; if a caller explicitly enables Node's permission model,
the TUI additionally requires an explicit least-privilege `--allow-ffi`.
Neither flag grants product authority, and ordinary commands must not import or
initialize the OpenTUI native renderer merely because it is packaged.

Adoption remains blocked on the `CA-18` feasibility gate proving:

1. Node 26.4+ runtime compatibility without migrating the CLI to Bun;
2. ESM, TypeScript build, `nvb dist`, and relocated global-install behavior;
3. native artifact availability and checksum/manifest coverage for every
   supported platform/architecture;
4. cold-start, resize, Unicode, streaming, memory, and long-session bounds;
5. raw-mode, signal, suspend/resume, crash-restoration, and terminal-emulator
   compatibility;
6. license and supply-chain acceptance; and
7. accessibility, no-color, reduced-motion, and deterministic test seams;
8. no regression in Nirvana CLI, pretty, storage, logger, cmd, NVB, signal,
   environment, or global-install behavior; and
9. a transparent bounded FFI bootstrap that preserves TTY ownership and does
   not cause re-execution loops or load OpenTUI for non-TUI commands.

The gate evaluates whole-process `--experimental-ffi`, POSIX TUI-only
`process.execve()`, and a focused launcher adapter where required. It selects
the smallest cross-platform strategy with evidence. Any direct platform API
requires the engineering-standard `NIRVANA_API_GAP` audit and a capability-
named adapter; bootstrap logic must not accumulate in `src/cli.ts`.

Failure is not permission to build rendering infrastructure inside WT or
silently switch to Terminal Kit. It blocks the TUI and reopens the engine
decision through a specification amendment.

### 14.5 Terminal security

All model, repository, pack, event, tool, agent, and operator-derived text is
untrusted terminal content. Before measurement or rendering, the presentation
boundary:

- strips or visibly escapes C0/C1 controls except explicitly handled newline
  and tab semantics;
- rejects embedded CSI, OSC, DCS, APC, PM, device-control, terminal-title,
  clipboard, notification, and hyperlink escape sequences;
- prevents content from changing cursor state, focus, mouse mode, paste mode,
  alternate screen, terminal title, or keyboard protocol;
- applies an explicit bidi-control policy and offers a visible escaped form for
  suspicious directional controls;
- bounds link targets and emits terminal hyperlinks only from validated WT
  references or explicitly authorized URLs;
- never sends OSC 52 clipboard writes without a direct operator copy action;
  and
- applies the same sanitization to normal, verbose, copied, error, toast,
  overlay, inspector, diff, Markdown, and debug paths.

Renderer-native markup or component interpolation must not create an escape
around this boundary. Adversarial fixtures include escape injection, poisoned
Markdown, wide/combining glyphs, bidi controls, extremely long tokens, and
malformed UTF-8.

### 14.6 Responsiveness and resource bounds

The acceptance pack records hardware, terminal emulator, dimensions, renderer,
runtime, and fixture versions. On that declared reference profile:

- warm startup reaches the first usable composer within 1,000 ms at p95;
- ordinary typing, cursor movement, and focus actions render within 50 ms at
  p95 while no product operation blocks the event loop;
- cached inspector view changes render within 100 ms at p95;
- animation targets at most 30 frames per second and automatically reduces or
  stops when the renderer misses its frame budget;
- no render queue, provisional-chunk queue, notification queue, completion
  result, or inspector page grows without an explicit finite bound;
- rendered timeline memory is proportional to viewport + overscan, not retained
  session length; and
- a two-hour long-session PTY soak with repeated streaming, resize, inspector
  changes, and history paging has no monotonic attachment-memory growth after
  bounded caches stabilize.

These are UI responsiveness targets, not authority deadlines. Missing a visual
frame may degrade presentation; it must never skip a durable event, validation,
confirmation, interruption, or terminal-restoration obligation.

## 15. Local preferences

Display preferences are operator-local and non-authoritative:

```text
<watchtower-data-root>/
  operator-preferences.json
  ui-cache/
    history/                         # optional bounded cache
```

Supported preference classes include streaming, entry density, preflight
visibility, `confirmBeforeInvoke: off|d3|d2-d3|all`, footer density,
notification classes, theme, no-color, high contrast, reduced motion,
accessible rendering, inspector visibility/side/width/last view, keymap,
conversation density, and bounded history-cache limits.

Preferences cannot change decision-class floors, endpoint eligibility,
budgets, retention authority, the lane-policy confirmation minimum, hold
semantics, or effect permissions. Unknown keys are preserved for forward
compatibility but ignored with a diagnostic.

Preference loading is transactional at attachment startup. Invalid themes,
key conflicts, unsafe values, or unsupported options produce bounded
diagnostics and use documented safe defaults; a partially applied preference
set must not create an uninspectable effective UI configuration.

## 16. Testing strategy

Contract and PTY fixtures cover:

- full-screen startup, alternate-screen entry/exit, and complete terminal
  restoration on every normal/failure/signal path;
- canonical wide layout, right inspector, standard drawer, narrow single-pane,
  unusable-size recovery, and repeated live resize;
- focus traversal, focus trapping, keymap conflicts, mouse parity, text
  selection, command palette, and bounded pickers;
- every inspector view and its loading, empty, stale, truncated, unavailable,
  and failure states;
- virtualized long timelines, bounded history paging, scroll-anchor
  preservation, live-edge streaming, and `new output` indication;
- theme token mapping across truecolor/256/16/monochrome, dark/light/system,
  no-color, high contrast, reduced motion, and accessible mode;
- animation scheduling, frame coalescing, slow-render backpressure, hidden-TUI
  suppression, and proof that dropped frames do not drop product events;
- Unicode width, combining characters, emoji, bidi-safe presentation policy,
  long IDs, code/diff overflow, multiline paste, and narrow rendering;
- terminal escape/OSC/clipboard/title/hyperlink injection through every
  untrusted-content presentation path;
- reference-profile startup/input/view-switch latency, frame throttling,
  bounded queues, viewport-proportional history rendering, and two-hour soak;
- new, attached, resumed, suspended, closed, forked, and pruned sessions;
- multiple sessions for one lane and concurrent attachments;
- observer attachments permit only M0 reads and never relay provisional chunks;
- same-session turn contention and explicit waiting;
- M0, D1, D2, and D3 display paths;
- preflight refusal, route loss, budget exhaustion, and adapter failure;
- every confirmation mode, policy minimum, explicit non-interactive
  authorization, and fail-closed non-interactive refusal;
- buffered and provisional streaming with validation replacement;
- Ctrl-C at editing, preflight, invocation, and confirmation stages;
- Ctrl-D and terminal loss without session closure;
- state revision changes and queued notifications during input/generation;
- slash-command classification and proof that M0 commands invoke no model;
- `/apply` proof that no effect bypasses revalidation/execution;
- multiline input, paste, completion, ambiguous references, and path escape;
- exact slash parsing, typo failure, `//` escape, and embedded slash prose;
- no-color, screen-reader, narrow-terminal, and redirected-output behavior;
- history-cache retention coupling and restrictive permissions;
- attachment restart with continuity reconstructed only from journals/indexes;
- renderer initialization/native-artifact failure with no terminal damage and
  an actionable `ask` fallback;
- packaged/global-install PTY smoke tests for every supported runtime target;
  and
- deterministic bounded change projection on reconnection.

Pure state-machine/reducer tests, component tests over a fake renderer, golden
screen snapshots at declared terminal sizes, and end-to-end PTY tests are
separate required layers. Golden rendering fixtures consume typed presentation
events rather than provider output directly. Snapshot review cannot replace
semantic assertions for focus, authority, accessibility, and terminal
restoration.

## 17. v1 acceptance criteria

- [ ] Bare `wt coordinator session` creates a durable operator session;
      `session attach <id>` attaches and `session resume <id>` only changes
      suspended lifecycle state.
- [ ] `session` and `session attach` open a full-screen TUI with a dominant
      conversation workspace and right-side inspector in the canonical wide
      layout.
- [ ] The inspector provides bounded sessions, lane, batches, agents, budgets,
      holds, proposals, events, and context views without model invocation or
      authority.
- [ ] Standard/narrow layouts, live resize, focus, command palette, overlays,
      composer, timeline virtualization, and scroll anchoring preserve
      unsubmitted and durable state.
- [ ] One lane supports multiple independent open and historical operator
      sessions.
- [ ] Multiple attachments do not create competing turn or effect authority.
- [ ] Observer attachments provide read-only M0 access to durable validated
      events without endpoint use or provisional cross-process relay.
- [ ] Every natural-language input remains one bounded independently routed
      turn.
- [ ] M0 slash commands invoke no model and mutating commands use their normal
      authority path.
- [ ] Streaming is visibly provisional until schema validation completes.
- [ ] Routing, budget, references, usage quality, and staleness are visible.
- [ ] Required invocation confirmation fails closed in non-interactive use and
      cancellation journals zero model use.
- [ ] Ctrl-C and terminal loss preserve auditable interruption with no partial
      effect.
- [ ] Exiting an attachment does not close or suspend its operator session.
- [ ] History and completion do not bypass retention or expose unauthorized
      artifacts.
- [ ] Notifications invoke no model and do not interrupt active typing or
      confirmation.
- [ ] Reconnection shows a bounded deterministic change projection.
- [ ] Slash-command typos cannot fall through to a paid natural-language turn.
- [ ] No-color and accessible append-only output retain all semantic
      information.
- [ ] Dark/light/system themes, high contrast, reduced motion, bounded
      animation, and monochrome degradation preserve all semantic states.
- [ ] Renderer or native-artifact failure restores the terminal and leaves
      `ask`, JSON, and conventional CLI commands usable.
- [ ] The selected renderer passes Node/NVB/dist/global-install, native
      packaging, Unicode, performance, restoration, and PTY acceptance gates.
- [ ] Untrusted content cannot emit terminal controls, change terminal modes or
      title, write the clipboard, forge a hyperlink, or bypass the bidi policy.
- [ ] Reference-profile responsiveness, bounded queues, viewport-proportional
      rendering, and long-session soak targets pass with recorded evidence.
- [ ] The attachment requires no daemon, provider-side conversation, or lane
      mutation lock during model generation.

## 18. Decisions fixed by this draft

| Decision | Outcome |
|----------|---------|
| Operator command | `wt coordinator session`; `chat` is not the normative command |
| Existing-session command | `session attach <id>`; `session resume <id>` is lifecycle-only |
| Durable object | Operator session |
| UI process | Ephemeral full-screen foreground TUI attachment |
| Canonical layout | Dominant left conversation workspace plus right contextual inspector |
| Inspector views | Sessions, lane, batches, agents, budgets, holds, proposals, events, and context |
| Responsive layout | Wide persistent inspector; standard drawer; narrow single pane; resize-required recovery |
| Navigation | Central action/keymap registry, focus manager, command palette, keyboard-complete controls |
| Component authority | Bounded immutable view models and UI intentions only |
| Lane cardinality | Many operator sessions per lane |
| Attachment binding | One lane and at most one current operator session |
| Same-session concurrency | At most one active turn; other attachments observe/fail/wait explicitly |
| Observer | Read-only M0 attachment over durable validated events; no provisional relay in v1 |
| Scripting | `wt coordinator ask`; interactive session is TTY-only in v1 |
| Streaming | Default for capable TTY adapters; provisional until validated |
| Slash commands | Closed registry over shared WT services, not shell execution |
| Command palette | Same canonical action registry and typed requests as slash commands |
| Slash escape | Unknown leading slash is an error; `//` explicitly sends natural language |
| Invocation confirmation | Attachment preference may strengthen policy; required non-interactive confirmation fails closed |
| Effects | `/apply` uses normal confirmation, revalidation, and effect executor |
| History | Journal/index authority; optional bounded retention-coupled UI cache |
| Status updates | Foreground M0 observation; no daemon or model polling |
| Lane switching | Start another attachment; one attachment remains lane-bound |
| Full-screen TUI | Required v1 product surface; it complements rather than replaces `ask` and one-shot commands |
| Visual system | Semantic themes, high contrast, no-color, reduced motion, and bounded purposeful animation |
| Renderer | Generic Nirvana TUI capability; candidate must pass Node/NVB/native packaging and PTY gates |
