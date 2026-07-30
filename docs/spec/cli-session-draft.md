# Watchtower v1 Operator Session CLI UX

Status: **Draft**
Target release: `1.0.0`
CLI group: `wt coordinator session`
Last updated: 2026-07-30

This document is normative for the polished foreground terminal attachment to
an operator session. Session semantics, bounded memory, routing, retention,
proposals, and effect authority remain normative in
[operator-session-draft.md](operator-session-draft.md). This document resolves
[discussions/cli-session-ux.md](discussions/cli-session-ux.md).

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
  [--resume=<operator-session-id>]
  [--topic=<text>]
  [--stream|--no-stream]
  [--wait-for-active-turn]
  [--banner=<compact|full|minimal>]
```

- Without `--resume`, WT creates a new open operator session and attaches.
- With `--resume`, WT validates the selected lane and session, rebuilds the
  bounded current projection from its indexes, and attaches without appending
  a turn.
- `--topic` names a newly created session and is invalid with `--resume`.
- The command requires an interactive terminal in v1.
- `wt coordinator ask` remains the stdin, pipe, and one-result JSON interface.
- `wt coordinator chat` is not a v1 alias; an unknown-command diagnostic may
  suggest `wt coordinator session`.
- Exiting or losing an attachment never closes or suspends the operator
  session.

Attachment states are local and ephemeral:

```text
STARTING → ATTACHED ↔ TURN_ACTIVE → DETACHING → STOPPED
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
session: opsess-7f3a · open · 4 turns · budget healthy
routing: D2 codex-primary-medium · D3 codex-primary-high

Responses are advisory. /apply previews and confirms proposed effects.
Type /help for commands. Ctrl-D detaches.

▸
```

The banner must not disclose OS usernames, account credentials, provider
secrets, or raw environment values. Endpoint aliases are allowed.

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

This display does not create an implicit confirmation pause. Cancellation
before spend is guaranteed only by `ask --dry-run` or an explicit configured
confirm-before-invoke mode. Once adapter invocation starts, WT must not claim
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
| `/exit`, `/quit` | Detach without closing |

Unknown commands show an exact error and nearest documented candidates. The
attachment does not execute arbitrary shell commands or unrelated mutating WT
commands.

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
visibility/confirmation, footer density, notification classes, color,
accessible append-only rendering, and bounded history-cache limits.

Preferences cannot change decision-class floors, endpoint eligibility,
budgets, retention authority, confirmation policy, hold semantics, or effect
permissions. Unknown keys are preserved for forward compatibility but ignored
with a diagnostic.

## 16. Testing strategy

Contract and PTY fixtures cover:

- new, resumed, suspended, closed, forked, and pruned sessions;
- multiple sessions for one lane and concurrent attachments;
- same-session turn contention and explicit waiting;
- M0, D1, D2, and D3 display paths;
- preflight refusal, route loss, budget exhaustion, and adapter failure;
- buffered and provisional streaming with validation replacement;
- Ctrl-C at editing, preflight, invocation, and confirmation stages;
- Ctrl-D and terminal loss without session closure;
- state revision changes and queued notifications during input/generation;
- slash-command classification and proof that M0 commands invoke no model;
- `/apply` proof that no effect bypasses revalidation/execution;
- multiline input, paste, completion, ambiguous references, and path escape;
- no-color, screen-reader, narrow-terminal, and redirected-output behavior;
- history-cache retention coupling and restrictive permissions; and
- attachment restart with continuity reconstructed only from journals/indexes.

Golden rendering fixtures consume typed presentation events rather than
provider output directly.

## 17. v1 acceptance criteria

- [ ] `wt coordinator session` creates or resumes a durable operator session
      through a polished foreground attachment.
- [ ] One lane supports multiple independent open and historical operator
      sessions.
- [ ] Multiple attachments do not create competing turn or effect authority.
- [ ] Every natural-language input remains one bounded independently routed
      turn.
- [ ] M0 slash commands invoke no model and mutating commands use their normal
      authority path.
- [ ] Streaming is visibly provisional until schema validation completes.
- [ ] Routing, budget, references, usage quality, and staleness are visible.
- [ ] Ctrl-C and terminal loss preserve auditable interruption with no partial
      effect.
- [ ] Exiting an attachment does not close or suspend its operator session.
- [ ] History and completion do not bypass retention or expose unauthorized
      artifacts.
- [ ] Notifications invoke no model and do not interrupt active typing or
      confirmation.
- [ ] No-color and accessible append-only output retain all semantic
      information.
- [ ] The attachment requires no daemon, provider-side conversation, or lane
      mutation lock during model generation.

## 18. Decisions fixed by this draft

| Decision | Outcome |
|----------|---------|
| Operator command | `wt coordinator session`; `chat` is not the normative command |
| Durable object | Operator session |
| UI process | Ephemeral foreground attachment |
| Lane cardinality | Many operator sessions per lane |
| Attachment binding | One lane and at most one current operator session |
| Same-session concurrency | At most one active turn; other attachments observe/fail/wait explicitly |
| Scripting | `wt coordinator ask`; interactive session is TTY-only in v1 |
| Streaming | Default for capable TTY adapters; provisional until validated |
| Slash commands | Closed registry over shared WT services, not shell execution |
| Effects | `/apply` uses normal confirmation, revalidation, and effect executor |
| History | Journal/index authority; optional bounded retention-coupled UI cache |
| Status updates | Foreground M0 observation; no daemon or model polling |
| Lane switching | Start another attachment; one attachment remains lane-bound |
| Full-screen TUI | Not required for v1 |
