# Watchtower v1 Operator Session CLI UX

Status: **Proposed — implementation-ready**
Target release: `1.0.0`
CLI group: `wt coordinator session`
Last updated: 2026-07-30

This document is normative for the polished foreground terminal attachment to
an operator session. Session semantics, bounded memory, routing, retention,
proposals, and effect authority remain normative in
[operator-session.md](operator-session.md). This document resolves
[discussions/cli-session-ux.md](discussions/cli-session-ux.md) and the UI
portions of
[discussions/operator-session-gaps.md](discussions/operator-session-gaps.md).
Default limits, adapter capability fallback, output/error envelopes, and
retention execution are normative in [v1-contracts.md](v1-contracts.md).

## 1. Product statement

`wt coordinator session` gives an operator a responsive human interface to
Watchtower without creating a persistent coordinator model. The terminal may
feel continuous; the underlying reasoning remains a sequence of independently
routed, bounded turns.

```text
foreground attachment
  → input, rendering, completion, notifications
  → shared WT query/command services
  → durable operator session journal and indexes
  → one M0 or bounded D1–D3 turn
  → validated answer or separately confirmed effect
```

The attachment is a presentation client. It is never lane state, session
memory, a provider-side chat, an effect authority, or a background daemon.

## 2. Goals and non-goals

### 2.1 Goals

1. Make bounded advisory interaction responsive, legible, and discoverable.
2. Show lane, session, routing, context, budget, staleness, and authority
   boundaries at the moment they matter.
3. Provide deterministic slash commands without invoking a model unnecessarily.
4. Preserve terminal usability through streaming, multiline input, completion,
   history navigation, interruption, and state-change notifications.
5. Allow many operator sessions and attachments for one lane while retaining
   one effect authority.
6. Keep terminal behavior accessible, pipe-safe, and testable through stable
   presentation records.

### 2.2 Non-goals

- A full-screen TUI, IDE, browser application, or general shell.
- A lane-wide singleton chat.
- A persistent provider conversation or lane-lifetime coordinator process.
- Direct inline agent tool execution or arbitrary `wt` command execution.
- Treating terminal scrollback, readline cache, or provisional text as
  authoritative history.
- Pausing automation merely because an attachment or operator session exists.

## 3. Vocabulary and cardinality

| Term | Meaning |
|------|---------|
| Operator session | Durable lane-bound human–WT discussion |
| Attachment | Foreground terminal process bound to one operator session at a time |
| Turn | One bounded operator request and response attempt |
| Presentation event | Typed UI record emitted by shared WT services |
| Notification | M0 projection of a relevant lane event shown by an attachment |

Cardinality:

```text
one lane
  → any number of historical operator sessions
  → policy-bounded open sessions and concurrent turns
  → any number of foreground attachments within local resource policy

one operator session
  → zero or more attachments
  → at most one active turn

one attachment
  → exactly one lane
  → at most one currently bound operator session
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
  [--banner=<compact|full|minimal>]

wt coordinator session attach <operator-session-id>
  [--observe]
  [--stream|--no-stream]
  [--wait-for-active-turn]
  [--banner=<compact|full|minimal>]
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

## 5. Session entry

The default compact banner includes:

- Watchtower version;
- selected lane slug and lifecycle;
- operator-session ID, topic, lifecycle, and turn count;
- active D1–D3 route aliases and route availability;
- session and lane-wide budget state;
- active holds affecting the lane;
- changes since the session's prior turn or attachment; and
- one concise advisory/effect-boundary reminder.

Example:

```text
watchtower 1.0.0 — operator session
lane: sql-backends · active · batch B22
operator-session: opsess-7f3a · open · 4 turns · budget healthy
routing: D2 codex-primary-medium · D3 codex-primary-high

Responses are advisory. /apply previews and confirms proposed effects.
Type /help for commands. Ctrl-D detaches.

▸
```

The banner must not disclose OS usernames, account credentials, provider
secrets, or raw environment values. Endpoint aliases are allowed.

When attaching to an existing session, the banner additionally shows the last
turn time and a deterministic M0 change projection from that turn's snapshot
to current lane state. It includes policy-bounded recent worker events, holds,
watcher/coordinator outcomes, and budget changes with stable IDs and a
`(+N more; /events …)` continuation when truncated. It is never
model-summarized.

`compact` is the default reconnection banner. `full` may include an existing
bounded last-turn capsule; `minimal` shows identity and whether changes exist.
No banner mode suppresses safety, staleness, policy, or budget failures.

## 6. Presentation architecture

The readline/terminal loop contains no coordinator policy or effect logic. It
consumes normalized presentation events returned by shared foundation
services:

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
plain text and test fixtures; they do not replace authoritative journals.

This is a transport-neutral internal boundary in v1, not a public JSON wire
protocol. The v1 product supplies the foreground PTY attachment only. Socket,
IDE, web, and remote transports require a later versioned authentication,
authorization, replay, backpressure, and compatibility contract.

Terminal Markdown, colors, separators, progress indicators, and compact tables
belong to shared rendering utilities usable by other `wt` commands. Provider
adapters normalize streaming and usage telemetry before the renderer sees it.

## 7. Turn UX

### 7.1 Preflight

Before a model-backed invocation, WT resolves references, builds the bounded
working set, chooses the minimum decision class and route, and estimates usage.
When enabled, the attachment displays:

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

When confirmation applies, WT displays resolved context, route, telemetry
quality, estimated usage, session/lane remaining limits, and protected reserve
impact before asking whether to invoke. Declining records
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

A completed turn renders:

- validated advisory answer;
- resolved evidence references;
- assumptions and open questions when present;
- proposal callouts with stable proposal IDs;
- staleness and changed revisions;
- decision class and endpoint alias;
- reported or clearly labeled estimated usage; and
- session/turn ID and remaining budget.

The advisory boundary is stated in the entry banner and visually reinforced on
proposal/effect callouts. WT need not repeat a prose disclaimer after every
ordinary answer.

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

## 9. Slash commands

Slash commands use exact parsing and invoke shared WT services. They never pass
through the natural-language classifier.

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
- displays an explicit read-only banner/prompt and detaches without changing
  session state.

Any number of local observers is allowed within filesystem access and resource
policy. Observer mode does not broaden multi-user permissions or expose
full-text content to an OS account that could not already read it.

## 10. Input, completion, and references

The attachment supports:

- left/right editing and standard word/line deletion;
- up/down and reverse search over authorized operator-message history;
- multiline input through trailing `\`, paste, and `/msg`;
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
- are queued while the operator types or confirms an effect;
- appear before the next safe prompt boundary;
- include stable event IDs; and
- update the next turn's bounded change summary.

A foreground filesystem watch or low-frequency poll may improve responsiveness.
It terminates with the attachment and is not a daemon. On-turn checkpoint
refresh remains the correctness baseline.

## 13. Signals and terminal behavior

| Input | Behavior |
|-------|----------|
| Ctrl-C while editing | Clear current unsubmitted input |
| Ctrl-C during preflight before invocation | Abort without starting an endpoint |
| Ctrl-C after invocation starts | Request interruption; journal partial output and actual/estimated usage |
| Ctrl-C at confirmation | Reject the confirmation; apply no effect |
| Ctrl-D at an empty prompt | Detach without closing the operator session |
| Terminal loss/SIGHUP | Stop rendering, request safe interruption if a turn is owned, and preserve durable recovery state |
| Resize | Rely on terminal reflow in v1; no cursor-addressed layout assumption |

Interruption never treats provisional output as an answer and never applies a
partial proposal.

## 14. Rendering and accessibility

- All color meaning also has a text label or symbol.
- `--no-color` and `NO_COLOR` disable ANSI color.
- The default palette is safe for common light and dark terminals.
- Output remains understandable without syntax highlighting.
- References are copyable stable IDs; clickable terminal links are optional
  enhancement, not a correctness promise.
- Screen-reader mode and non-cursor terminals use append-only output.
- Progress indicators do not hide routing, interruption, or failure state.
- Narrow terminals wrap cleanly without truncating identifiers.
- Secrets and configured sensitive fields are redacted in normal, verbose,
  error, and debug rendering.

V1 may provide compact/full/minimal banners and compact/verbose turn footers.
Custom theme files and a full-screen dashboard are not required.

## 15. Local preferences

Display preferences are operator-local and non-authoritative:

```text
<watchtower-data-root>/
  operator-preferences.json
  ui-cache/
    history/                         # optional bounded cache
```

Supported preference classes include streaming, banner density, preflight
visibility, `confirmBeforeInvoke: off|d3|d2-d3|all`, footer density,
notification classes, color, accessible append-only rendering, and bounded
history-cache limits.

Preferences cannot change decision-class floors, endpoint eligibility,
budgets, retention authority, the lane-policy confirmation minimum, hold
semantics, or effect permissions. Unknown keys are preserved for forward
compatibility but ignored with a diagnostic.

## 16. Testing strategy

Contract and PTY fixtures cover:

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
  and
- deterministic bounded change projection on reconnection.

Golden rendering fixtures consume typed presentation events rather than
provider output directly.

## 17. v1 acceptance criteria

- [ ] Bare `wt coordinator session` creates a durable operator session;
      `session attach <id>` attaches and `session resume <id>` only changes
      suspended lifecycle state.
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
- [ ] The attachment requires no daemon, provider-side conversation, or lane
      mutation lock during model generation.

## 18. Decisions fixed by this draft

| Decision | Outcome |
|----------|---------|
| Operator command | `wt coordinator session`; `chat` is not the normative command |
| Existing-session command | `session attach <id>`; `session resume <id>` is lifecycle-only |
| Durable object | Operator session |
| UI process | Ephemeral foreground attachment |
| Lane cardinality | Many operator sessions per lane |
| Attachment binding | One lane and at most one current operator session |
| Same-session concurrency | At most one active turn; other attachments observe/fail/wait explicitly |
| Observer | Read-only M0 attachment over durable validated events; no provisional relay in v1 |
| Scripting | `wt coordinator ask`; interactive session is TTY-only in v1 |
| Streaming | Default for capable TTY adapters; provisional until validated |
| Slash commands | Closed registry over shared WT services, not shell execution |
| Slash escape | Unknown leading slash is an error; `//` explicitly sends natural language |
| Invocation confirmation | Attachment preference may strengthen policy; required non-interactive confirmation fails closed |
| Effects | `/apply` uses normal confirmation, revalidation, and effect executor |
| History | Journal/index authority; optional bounded retention-coupled UI cache |
| Status updates | Foreground M0 observation; no daemon or model polling |
| Lane switching | Start another attachment; one attachment remains lane-bound |
| Full-screen TUI | Not required for v1 |
