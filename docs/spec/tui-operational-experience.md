# Watchtower v1 TUI Operational Experience

Status: Proposed, normative for v1

Applies to: `wt coordinator session`, TUI attachments, TUI diagnostics, and
operator-local presentation state

This document closes the operational gaps around the full-screen interface in
[cli-session.md](cli-session.md). That document owns the interaction and
presentation architecture; this document owns supported environments, entry
selection, attention priority, recovery, cross-attachment conflict behavior,
diagnostics, bounded navigation, and local-state compatibility. If the two
conflict, the more safety-preserving rule applies and the conflict blocks v1
acceptance until the documents are reconciled.

## 1. Product invariant

The TUI is a polished attachment to durable Watchtower state. It is not lane
state, session memory, a coordinator, or a second effect boundary. Restarting,
resizing, detaching, or losing the renderer cannot change lane authority. Every
view is reconstructed from validated bounded projections plus explicitly
non-authoritative operator-local state.

The non-interactive command surface remains fully supported. A renderer,
terminal, native-library, or compatibility failure must leave `status`,
`doctor`, `coordinator ask`, and the other non-TUI commands usable.

## 2. V1 support and capability matrix

### 2.1 Required release target

V1 full-screen support is required for this exact baseline:

| Dimension | Required baseline |
|-----------|-------------------|
| OS/ABI | Linux x86_64 with glibc |
| Node.js | `>=26.4.0` and within the runtime manifest's tested major range |
| Engine | imperative `@opentui/core` and framework-neutral `@opentui/keymap` |
| Invocation | local interactive PTY, tmux, direct SSH PTY, and SSH inside tmux |
| Terminal behavior | xterm-compatible input, alternate screen, resize, Unicode width, and at least monochrome output |
| Distribution | relocated `nvb dist` global install with all checksum-pinned native artifacts |

Truecolor, 256-color, 16-color, monochrome, mouse input, hyperlinks, clipboard,
and animation are discovered capabilities, not separate authority modes. Loss
of optional capabilities degrades to semantic text, keyboard navigation, and
reduced or absent motion. It never hides status or blocks keyboard operation.

The release PTY matrix must identify each tested terminal/emulator, `$TERM`
family, color tier, tmux version, SSH mode, locale, Node version, OpenTUI
version, native-artifact digest, and distribution installation path. Product
claims name the tested matrix; “terminal compatible” without evidence is not a
release claim.

### 2.2 Promotion and fail-closed behavior

Linux arm64/glibc, musl-based Linux, macOS, Windows, and untested Node majors
are unsupported for the v1 full-screen interface unless `RT-03` promotes an
exact target tuple into the checksum-verified runtime manifest and `CA-18`,
`CA-23`, and `CA-24` supply the same packaging, restoration, accessibility,
and PTY evidence required of the baseline.

An unsupported or failed target:

1. is detected before alternate-screen entry where possible;
2. returns an actionable diagnostic and stable reason code;
3. suggests `wt doctor --tui` and a non-TUI command such as
   `wt coordinator ask`; and
4. never downloads, compiles, repairs, or replaces native artifacts implicitly.

The disposable OpenTUI/Nirvana experiment may provide evidence and reveal
specification defects. It does not promote a target, satisfy an implementation
batch, or weaken the independent v1 acceptance gates.

## 3. Lane and session entry

### 3.1 Syntax and selection order

```text
wt coordinator session [--lane=<slug-or-uuid>] [creation options]
wt coordinator session attach <operator-session-id>
  [--lane=<slug-or-uuid>] [attachment options]
```

Bare `session` continues to mean “create a new durable session, then attach.”
Existing sessions are entered with `session attach` or selected from an
already-attached TUI. Watchtower never guesses that the operator intended to
reuse the most recent session.

Entry resolves in this order, before a session is created or a model is
eligible to run:

1. validate an explicit `--lane` against discovery and membership;
2. otherwise discover relevant lanes from the current context;
3. select the only relevant lane when there is exactly one;
4. when several lanes are relevant in an interactive terminal, show a bounded
   deterministic lane picker; and
5. when no lane is relevant, or selection is ambiguous without an interactive
   terminal, fail with candidates and an explicit next command.

The entry picker is M0 and model-free. It shows lane identity, control home,
lifecycle, relevant repository bindings, active-session count, and any
conflict that makes entry unavailable. Candidates are sorted deterministically
and paged; scanning session history or pack contents is forbidden.

### 3.2 First-run and unavailable states

Zero-lane entry does not create global conversation state. The full-screen
shell may show a bounded welcome/diagnostic screen only after terminal
capability checks succeed. Its actions are limited to help, exit, copy an
`init` example, run read-only diagnostics, or retry discovery. `wt init`
remains an explicit command and is never performed by selecting a welcome
screen action.

A selected lane with no sessions may create a session through bare `session`
or show an empty session picker through an in-TUI switch action. Closed,
suspended, corrupt, unauthorized, and currently unavailable sessions remain
distinct states with distinct next actions.

### 3.3 Switching

Switching sessions within one lane detaches the current attachment and attaches
the selected session. Switching lanes performs a fresh lane selection and
attachment; it never moves, renames, or forks a session across lanes.

The TUI requires explicit confirmation before switching or exiting when a
composer draft exists. It refuses a switch while the attachment owns an active
turn or confirmation unless the operator first cancels or completes that
operation. Observer attachments have no draft or active-turn authority.

## 4. Canonical attention and failure model

The UI reduces all presentation events to one deterministic priority order:

| Priority | Class | Presentation and interaction rule |
|----------|-------|-----------------------------------|
| P0 | terminal restoration or security failure | Stop ordinary rendering, restore terminal first, emit sanitized fallback diagnostic |
| P1 | authority invalidation | Block the affected action; close stale confirmation; show conflict overlay with re-read/retry choices |
| P2 | session or turn unavailability | Lock composer or affected control; keep bounded read-only navigation available |
| P3 | route, budget, pack-index, policy, or capability block | Prevent invocation; show exact reason/evidence age and safe next action |
| P4 | proposals, holds, findings, attention items, and durable changes | Badge and ordered attention view; do not steal typing focus |
| P5 | progress and informational notification | Coalesced banner/status item; never open a modal automatically |

Within one priority, durable sequence then stable event ID determines order.
New lower-priority events never replace a visible higher-priority condition.
No notification steals focus, submits input, selects a confirmation choice, or
invokes a model. Every modal has a stable title, reason code, focused default,
cancel action, and equivalent keyboard path.

Loading, empty, stale, truncated, unavailable, and failed are different view
states. A stale projection is visibly stale and cannot back a mutation or
confirmation. Unknown usage, availability, or freshness is displayed as
unknown rather than healthy, free, or zero.

## 5. Composer draft and crash recovery

Unsubmitted text is operator-local, non-authoritative draft state. It never
enters the session journal, pack index, model context, usage ledger, or effect
executor until submitted through the normal turn preflight.

Crash recovery is enabled by default and governed by these limits:

- one draft per `{lane UUID, session UUID, attachment owner}`;
- maximum 32 KiB of UTF-8 text per draft and 20 drafts total per operator;
- drafts expire after seven days without modification;
- owner-only directory and file permissions, atomic replacement, and no secret
  expansion, telemetry, shell history, or diagnostic-report inclusion; and
- pasted input above the limit remains only in memory and receives a visible
  warning before any truncation or exit.

The canonical local layout is:

```text
<watchtower-data-root>/
  ui-drafts/
    v1/
      <lane-uuid>/
        <operator-session-uuid>.json
```

Each file contains only `schemaVersion`, lane/session UUIDs, UTF-8 draft text,
`updatedAt`, `byteLength`, and a content checksum. Temporary atomic-write files
remain in the same owner-only directory and are removed at the next safe
startup. At the 20-draft limit Watchtower removes expired drafts first; if no
expired draft exists, it keeps the new text in memory and requires the operator
to select an existing draft to discard. It never silently evicts a live draft.

On reattachment, a matching recovered draft is shown as recovered and requires
an explicit keep or discard choice before submission. Recovery never submits
automatically. A draft whose lane/session identity no longer validates is
quarantined from the composer and can only be inspected locally or discarded.

Successful submission deletes the draft only after the durable turn append is
acknowledged. Explicit discard, session pruning, privacy purge, or removal of
the relevant authorization also removes the corresponding recoverable draft.
Closing a session retains an eligible draft until the next attachment offers
discard/export, expiry removes it, or privacy policy requires immediate
removal. `draftRecovery: off` disables durable drafts and removes existing
recoverable drafts only after explicit confirmation.

## 6. Cross-attachment conflicts

Each actionable view records the durable revision, proposal revision, policy
digest, session lifecycle, and attachment role from which it was derived.
Before confirmation and again before effect execution, current state is read
and validated by the normal authority boundary.

When another attachment or command changes relevant state:

- a visible confirmation becomes invalid immediately and cannot be accepted;
- an applied, rejected, expired, or superseded proposal becomes a terminal
  result with the responsible durable event, never an actionable button;
- session close, suspension, pruning, or authorization loss locks the composer;
- active-turn ownership shows the owner, start time, and wait/read-only choices
  without permitting a competing invocation; and
- unrelated durable changes become P4 notifications and do not erase input or
  scroll position.

The UI never merges simultaneous drafts, elects authority, performs
last-writer-wins mutation, or retries a semantic action automatically. A retry
starts from a fresh bounded projection and a new explicit operator action.

## 7. Agent and allocation inspector

The `agents` inspector is a projection consumer. It reads approved endpoint
inventory, accepted allocation-plan revisions, capacity snapshots,
reservations, assignments, route health, and usage-quality metadata. It never
scans operating-system users, credentials, provider CLIs, or networks itself.

For each visible endpoint or assignment it may show only bounded non-secret
fields: stable alias, adapter, account alias, model/capability profile,
compatibility tier, charging class, telemetry quality, evidence age, snapshot
age, availability state, reservation/assignment, health reason, and last
successful check. Missing or stale data is explicit.

`refresh` invokes the authorized model-free discovery/snapshot command with its
normal scope and audit behavior. It cannot expand an allowlist, approve an
inventory proposal, activate a plan, expose credential locations, or imply
provider-reported precision where only estimates exist. Until the allocation
feature lands, unavailable projections produce a documented empty state rather
than an alternate local scanner.

## 8. Diagnostics and support bundle

```text
wt doctor [--lane=<slug-or-uuid>] --tui [--json]
wt doctor [--lane=<slug-or-uuid>] --tui --report=<path>
```

`--tui` adds read-only checks for:

- supported target tuple, Node range, OpenTUI/keymap versions, FFI bootstrap,
  native-artifact presence/digests/loadability, and relocated-package paths;
- interactive PTY, `$TERM`/terminfo, color and input capabilities, locale and
  Unicode width, tmux/SSH nesting, dimensions, resize delivery, and mouse mode;
- effective theme, contrast, reduced-motion/accessibility modes, preference
  migration, cache permissions, and keymap conflicts; and
- alternate-screen/signal restoration self-test in an isolated child PTY that
  cannot mutate lane or session state.

Doctor remains read-only. It does not install packages, compile artifacts,
rewrite preferences, repair caches, change a terminal, or initialize a lane.
Human and JSON output use stable check/reason IDs.

`--report` is an explicit local write to an operator-selected non-lane path. It
creates an owner-only, schema-versioned, redacted support bundle containing the
check results, effective non-secret versions/capabilities, tested target tuple,
and sanitized recent renderer diagnostics. It excludes environment values,
credentials and paths to them, conversation text, drafts, model prompts or
responses, pack content, full filesystem paths beyond declared installation
roots, and session/lane journals. Existing files are not overwritten without
the command's normal explicit overwrite confirmation.

The report contains `schemaVersion`, CLI/runtime/renderer versions, target
tuple, invocation nesting, capability summary, ordered checks, stable reason
IDs, redaction counters, and generation time. Sanitized renderer diagnostics
are capped at the newest 200 records and 256 KiB total. Truncation is explicit.

`--report` without `--tui` is invalid in v1. Report creation failure does not
change the diagnostic results and leaves no partial target file.

## 9. Bounded search, navigation, and attention

Search is M0 and operates only over validated bounded indexes. Its scopes are:

- loaded plus indexed pages of the current session timeline;
- bounded session metadata for the selected lane;
- indexed durable events, batches, findings, requirements, holds, and
  proposals authorized for the attachment; and
- command-palette actions and local command history within retention limits.

Search never recursively scans repositories, implementation packs, raw
journals, or provider output and never invokes a model. Results name their
scope, index revision, staleness, and truncation/cursor state. Query length,
result count, page size, time, and highlighted excerpts have finite configured
limits. An unindexed scope offers an explicit indexing action rather than a
hidden scan.

V1 defaults and hard maxima are: 256 UTF-8 characters per query, 25 results per
page, 100 candidate results examined per query, 512 UTF-8 bytes of highlighted
excerpt per result, and 250 ms of local index work before returning a partial
page with a continuation cursor. Operators may lower but not raise these hard
maxima through preferences. Command-history search reads at most the newest
200 retained local entries. Attention pages contain at most 50 items and one
attachment retains at most the newest 200 attention rows; durable state is not
deleted when the presentation window rolls over.

The attention navigator is a stable filtered projection of P1 through P4
items. `next`/`previous` traverses durable ordering, preserves the current
draft, and does not mark an item resolved merely by viewing it.

## 10. Preference and cache compatibility

`operator-preferences.json`, draft metadata, and every UI cache carry an
independent `schemaVersion`. Preference loading and migration are
transactional: validate the complete candidate, migrate through declared
steps, then atomically replace it. Unknown keys are preserved but ignored with
a diagnostic. A newer unsupported schema is left untouched and safe defaults
are used for that attachment.

Before a destructive preference migration Watchtower writes one owner-only
bounded backup. Failed migrations leave the original active, report a stable
reason code, and use safe defaults. Backups have a finite count and age. No
upgrade may silently change confirmation floors, lane policy, authority, data
retention, or draft-recovery privacy.

V1 retains at most three preference backups for at most 30 days. Total derived
UI cache is capped at 64 MiB per operator and evicted least-recently-used after
retention/privacy invalidation is applied. Drafts and preference backups do not
count as derived cache and are never evicted to satisfy that cache limit.

Derived caches are disposable, non-authoritative, checksum-bound to their
source projection and keyed by CLI version, renderer contract version, and
cache schema. Incompatible or corrupt entries are ignored and rebuilt lazily
within normal bounds. Cache invalidation must not delete journals, session
artifacts, operator-authored preferences, or recoverable drafts.

Native-renderer and keymap version changes are distribution upgrades, not UI
cache migrations. They follow the runtime manifest, checksum, staged-upgrade,
and rollback rules and must not be fetched on attachment startup.

## 11. Visual acceptance catalog

The v1 golden-state catalog contains, at declared wide/standard/narrow sizes:

1. lane picker and no-lane welcome;
2. new empty session and normal conversation;
3. streaming at live edge and away from live edge;
4. D2/D3 proposal confirmation and completed proposal;
5. route, budget, pack-index, capability, and stale-state blocks;
6. session contention, observer, suspended, closed, and unavailable states;
7. each inspector view, including agent/allocation stale and empty states;
8. search, attention navigation, command palette, details, and conflict overlay;
9. recovered draft and over-limit paste warning;
10. no-color, high-contrast, reduced-motion, accessible append-only, Unicode,
    and unusable-dimension recovery; and
11. renderer/bootstrap failure after complete terminal restoration.

Goldens compare semantic regions, tokens, focus, ordering, truncation, and
accessible labels at fixed inputs. Pixel snapshots may supplement but cannot
replace assertions for authority, keyboard reachability, priority, terminal
restoration, or information preserved under degraded rendering. The disposable
experiment's screenshots are design evidence only; accepted v1 goldens are
owned by the implementation and independent review batches.

## 12. Batch and proof ownership

| Contract area | Primary construction | Required independent proof |
|---------------|----------------------|----------------------------|
| target/native/dist feasibility | `RT-03`, `CA-18` | `CA-18`, `CA-23`, `CA-24` |
| entry picker, shell, state priority, preferences | `CA-19` | `CA-23`, `CA-24` |
| drafts, timeline search, bounded history | `CA-20` | `CA-23`, `CA-24` |
| inspectors, global search, attention, diagnostics UI | `CA-21` | `CA-23`, `CA-24` |
| conflicts, streaming, notifications, attachment roles | `CA-22` | `CA-23`, `CA-24` |
| restoration, accessibility, migration, PTY and visual matrix | `CA-23` | `CA-24` |
| CLI syntax, diagnostics report, scale/replay and M6 closure | `CA-24` | M6 independent acceptance |

No row permits a batch to accept its own semantic review. `CA-24` must trace
every catalog state and matrix tuple to reproducible evidence.

## 13. V1 acceptance additions

- [ ] The exact required Linux/Node/dist/PTY matrix passes; every unpromoted
      tuple fails before damage and preserves non-TUI commands.
- [ ] Zero, one, and multiple discovered lanes have deterministic model-free
      entry behavior, and bare `session` never reuses an existing session.
- [ ] P0–P5 ordering, stale-state invalidation, and cross-attachment conflicts
      cannot produce an action from an obsolete projection.
- [ ] Draft recovery is bounded, owner-only, explicit on restore, coupled to
      privacy/pruning, and never becomes session or model context implicitly.
- [ ] The agent inspector consumes only approved projections and represents
      unknown, stale, estimated, and unavailable state honestly.
- [ ] `wt doctor --tui` and explicit redacted reports diagnose the supported
      stack without mutation or disclosure of conversation/credential data.
- [ ] Search and attention navigation remain index-bounded and model-free as
      pack, event, and session history grow.
- [ ] Preference migration and cache invalidation are transactional and cannot
      alter authority or destroy durable product state.
- [ ] Every visual-catalog state passes semantic, keyboard, accessibility, and
      restoration assertions at its declared dimensions.
