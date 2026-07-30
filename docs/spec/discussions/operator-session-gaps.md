# Discussion: Operator Session Spec Gaps and Suggested Resolutions

Status: **Proposed**
Started: 2026-07-30
Related:

- `docs/spec/operator-session-draft.md`
- `docs/spec/cli-session-draft.md`
- `docs/spec/coordinator-automation-draft.md`
- `docs/spec/v1-draft.md`
- `docs/spec/architecture.md`
- `docs/spec/discussions/operator-coordinator-conversation.md`
- `docs/spec/discussions/cli-session-ux.md`

## 1. Problem statement

The operator-session and cli-session drafts are thorough and well-structured.
They define the durable session model, advisory boundary, attachment concept,
turn lifecycle, budget model, and terminal UX. However, a systematic review
against realistic operator workflows reveals several underspecified areas.

These gaps fall into three categories:

1. **Parser/CLI ambiguity** — the same command string can be interpreted in
   conflicting ways.
2. **Missing features** — operator workflows that have no defined mechanism.
3. **Architectural clarity** — concepts that are mentioned but never detailed
   or resolved.

This document identifies 18 specific gaps, describes why each matters with
concrete scenarios, and proposes a resolution for each. The proposals are
designed to be compatible with the existing architecture and consistent with
the advisory/mutation boundary and attachment/session separation.

## 2. Gap inventory and proposed resolutions

---

### Gap 1: `wt coordinator session` parser ambiguity

**Severity:** High (will cause actual command parsing bugs)

**Problem:** The CLI contract defines three syntactic forms that collide:

```
wt coordinator session                              # attach (new session)
wt coordinator session list|show|suspend|...         # lifecycle subcommand
wt coordinator session opsess-3f8a1b2c               # ???
```

The spec states: "The parser must not guess whether an unrecognized positional
token is a session ID." But the parser cannot distinguish a lifecycle
subcommand from a session ID without a known subcommand registry. If the
operator types `wt coordinator session opsess-3f8a1b2c`, did they mean
`--resume=opsess-3f8a1b2c` or `show opsess-3f8a1b2c`?

Even worse: if the operator has a session with topic "list" (unlikely but
allowed), there is no disambiguation. The spec's instruction to "not guess"
is correct but doesn't resolve the conflict.

**Concrete scenario:** A shell script echoes a session ID and the operator
copy-pastes `wt coordinator session opsess-7f3a`. The parser interprets
`opsess-7f3a` as an unknown subcommand and errors. The operator retries with
`--resume`. This friction is unnecessary.

**Proposed resolution:**

The bare `wt coordinator session` form **always** creates a new session and
attaches. It never resumes.

Resumption uses an explicit subcommand:

```
wt coordinator session resume <operator-session-id>
  [--stream|--no-stream]
  [--wait-for-active-turn]
```

This is added to the lifecycle subcommand family alongside `list`, `show`,
`suspend`, `close`, etc. The bare attachment form is exclusively for new
sessions.

Alternative rejected: `--resume` flag on bare form. While functional, it
means the bare form with one optional argument has two meanings (create vs
resume), and the `session` namespace already has lifecycle subcommands.
Consistency favors a subcommand.

The already-defined `session resume` subcommand (currently "Resume a suspended
session" per the lifecycle table) is renamed to `session unsuspend` to avoid
overloading "resume" with both "re-attach" and "unsuspend."

---

### Gap 2: Read-only observer attachments

**Severity:** Medium — useful for pair-debugging and multi-terminal workflows

**Problem:** The spec allows "several attachments may observe the same
session." But it defines only one behavior for a concurrent attachment
attempting a turn: failure with `OPERATOR_SESSION_TURN_ACTIVE`. There is no
"read-only observer" mode.

An operator might want to:
- Check session progress from a second terminal while a turn is running
- Share-screen with a colleague during an escalation session
- Have a status terminal with `/history` open while actively discussing in
  another terminal

The current model gives them an error if they try to type in the observing
attachment. That's correct for mutating input, but read-only slash commands
(`/history`, `/context`, `/budget`, `/status`, `/holds`) should still work.

**Concrete scenario:** An escalation session has a D3 turn running (complex
analysis, takes 30+ seconds). The operator opens a second terminal to check
`/history` and `/holds` while waiting. Currently, even read-only commands
would fail because the session is in `active-turn` state.

**Proposed resolution:**

Add an explicit `--observe` flag and `/observe` slash command:

```
wt coordinator session resume <id> --observe
```

An observer attachment:
- Receives real-time turn events (provisional streaming, completion,
  interruption) as they occur in the active turn
- Can execute read-only slash commands: `/history`, `/context`, `/budget`,
  `/status`, `/ready`, `/batch`, `/events`, `/holds`, `/queue`, `/proposals`,
  `/sessions`
- Cannot execute: `/apply`, `/reject`, `/pin`, `/unpin`, `/compact`, `/new`,
  `/switch`, `/fork`, `/suspend`, `/close`, or any natural-language input
- Sees a distinct banner: `[observing session opsess-7f3a — read-only]`
- Prompts display `▸ [observing]` instead of `▸`
- Attempting a mutating command shows: "Observer mode — use /exit and attach
  without --observe to participate"
- Does not hold the session write lock for any read-only operation
- Detaches with Ctrl-D without affecting session state

An observer attachment does not consume an endpoint slot and has no budget
impact beyond the read-only slash command queries (which are M0).

Multiple concurrent observers are permitted. All observers receive the same
presentation events for the active turn.

---

### Gap 3: Cross-session reference resolution

**Severity:** Medium — feature is mentioned but mechanism undefined

**Problem:** Both `operator-session-draft.md` §10.1 and `cli-session-draft.md`
§10 mention `@session:opsess-9b2e:turn:5` as a valid reference form. But
neither defines what the context broker does when it encounters this reference.

Does it:
- Load turn 5's full text into the working set?
- Load turn 5's resolved references and snapshot metadata?
- Load a bounded summary generated from the turn record?
- Preload the entire referenced session's history?

Without an answer, the feature is a syntactic promise without semantic
behavior. An operator who uses `@session:opsess-9b2e:turn:5` in a question
might get: the full turn text (could be thousands of tokens unexpectedly),
nothing (if the feature isn't implemented), or unbounded transitive context
(if turn 5 referenced turn 3 which referenced turn 1).

**Concrete scenario:** The operator is in a new planning session discussing
batch structure. They reference a specific turn from an investigation session
where the coordinator analyzed batch dependency chains:

```
▸ given @session:opsess-9b2e:turn:5 analysis, should we reorder B14-B18?
```

They expect the coordinator to understand what analysis turn 5 contained.
They do NOT expect the entire investigation session's history to be preloaded.

**Proposed resolution:**

When the context broker encounters `@session:<id>:turn:<N>`:

1. **Verify the reference is authorized** — the referenced session must belong
   to the same lane. Cross-lane session references are denied with
   `OPERATOR_SESSION_REFERENCE_DENIED`.

2. **Load bounded turn metadata** — turn number, decision class, routing info,
   timestamp, resolved references, and snapshot revision. This is a small
   fixed-size record from the session index (~200 bytes).

3. **Load bounded turn summary** — if the referenced turn has a coordinator
   response, load a bounded summary of the response content:
   - The typed response's `answer` field, truncated to a per-reference byte
     limit (default: 2KB)
   - The response's `evidenceRefs` and `openQuestions`
   - The response's `proposedEffects` (proposal IDs and types only)
   - The turn's `stale` flag and snapshot revision

4. **Do NOT load** — the full turn text, operator message, other turns,
   compactions, or full session history.

5. **Count against budget** — the loaded bytes count against the current turn's
   context budget. The preflight estimate accounts for cross-session references.

6. **Mark provenance** — the envelope records which external session/turn was
   referenced and the snapshot revision at which the reference was resolved.
   If the referenced session's content was pruned, the reference resolves to
   a tombstone with `OPERATOR_SESSION_CONTENT_PRUNED`.

7. **Transitive references are not resolved** — if turn 5 of session 9b2e
   itself references `@session:opsess-3a1c:turn:12`, that transitive reference
   is NOT automatically loaded. The operator must reference it explicitly.

---

### Gap 4: Promote session advice to pack amendment

**Severity:** High — critical operator workflow has no defined mechanism

**Problem:** Both `operator-session-draft.md` §15.2 and `coordinator-automation-
draft.md` state that certain changes "cannot be approved solely through an
operator session" and "must route to the authoritative amendment workflow."
But there is no command, no event, no mechanism, and no defined "amendment
workflow" to route to.

The operator's path from "the coordinator advised that F3 needs a pack
amendment" to "a pack amendment is in progress" is a void. The operator must:
- Remember the advice
- Exit the session
- Manually find the pack-design workflow
- Manually reference the finding and the coordinator's reasoning
- Somehow reconnect the amendment outcome to the implementation lane

This is precisely the kind of unstructured handoff that Watchtower exists to
eliminate.

**Concrete scenario:** After three turns discussing batch B14's rejection,
the coordinator advises: "F3 is a scope deviation that requires pack amendment.
Pull F3 out of B14, create a new batch B14-F3 in the pack, and adjust
dependencies." The operator agrees. Now what? There is no `/propose-amendment`,
no `wt coordinator session promote`, no event that records this decision for
the pack-design workflow.

**Proposed resolution:**

Add a proposal type and supporting commands:

**New proposal type in the coordinator proposal vocabulary:**

```json
{
  "type": "propose-pack-amendment",
  "rationale": "F3 scope deviation requires expanding the API contract.",
  "affectedBatchIds": ["B14"],
  "affectedFindings": ["B14:F3"],
  "suggestedChange": "Extract F3 into new batch B14-F3 with adjusted deps.",
  "evidenceRefs": ["event:evt-772", "finding:B14:F3", "batch:B07:R1"]
}
```

**New slash command:**

```
/amend [<rationale>]
```

This opens a structured prompt: the operator confirms they want to propose an
amendment, provides a rationale, and the command:

1. Records a durable `session-proposed-amendment` event with:
   - The current session ID and turn
   - The amendment rationale
   - Affected batches, findings, and evidence references
   - Lane snapshot at time of proposal
2. Suspends (not closes) the current session
3. Creates a durable amendment proposal record at:
   ```
   <control-home>/.watchtower/lanes/<slug>/coordinator/
     amendment-proposals/<proposal-id>.json
   ```
4. Emits a lane-level notification: "operator session opsess-7f3a proposed
   pack amendment — requires pack-design workflow"
5. Prints the command for the operator to run (or automatically invokes if
   the pack-design workflow is locally available):
   ```
   wt pack amend --from-proposal=<proposal-id>
   ```

**New CLI command for the non-interactive path:**

```
wt coordinator session propose-amendment <session-id>
  [--rationale=<text>]
  [--from-turn=<turn-id>]
  [--dry-run]
```

The amendment proposal record is a local durable artifact. It is not a pack
change — it's a request that a pack-design lane or human reviewer must act on.
The implementation lane is not blocked while the amendment is pending unless
the operator places an explicit hold.

If a pack-design lane exists and has the same initiative, the proposal should
be discoverable from that lane via `wt pack status` or a shared initiative
event feed.

---

### Gap 5: Operator session kind taxonomy

**Severity:** Medium — affects default policy and user experience

**Problem:** Every operator session has a `topic` (free-text string) but no
structural kind. The spec implicitly distinguishes escalation sessions from
other sessions (they have different creation paths, default routing, and hold
behavior), but this distinction is ad hoc — there is no `kind` field on session
identity.

Different session purposes have different natural defaults:

| Purpose | Typical D-class | Hold behavior | Budget expectation | Turn limit |
|---------|-----------------|---------------|--------------------|------------|
| Investigation | D2 | Rare | Moderate (50K-100K tokens) | 10-15 turns |
| Escalation | D3 | Auto-created system hold | High (100K-200K tokens) | 5-10 turns |
| Planning | D2/D3 | Common (user-placed holds) | High (100K-300K tokens) | 20+ turns |
| Review | D2 | Optional | Moderate (50K-100K tokens) | 5-10 turns |
| General | D2 | None | Default (policy-defined) | Policy-defined |

Without a kind field, every session gets identical defaults. An escalation
might exhaust budget too quickly. An investigation might be unnecessarily
routed through D3 because the routing policy can't distinguish it from an
escalation.

**Concrete scenario:** The operator starts a general Q&A session: "why is
batch 14 taking so long?" and an escalation session: "D3 safety trigger —
multiple repeated rejects." Both get identical budget windows, routing
defaults, and context limits. The escalation should have higher reserves and
auto-created holds; the Q&A should not.

**Proposed resolution:**

Add a `kind` field to session identity with a closed v1 vocabulary:

```json
{
  "operatorSessionId": "opsess-3f8a1b2c",
  "kind": "investigation",
  ...
}
```

v1 kinds:

| Kind | Default D-class | Auto-hold? | Default budget segment | Created by |
|------|----------------|------------|------------------------|------------|
| `general` | D2 | No | Standard | `wt coordinator session` (default) |
| `investigation` | D2 | No | Standard (extended) | `wt coordinator session --kind=investigation` |
| `review` | D2 | No | Standard | `wt coordinator session --kind=review` |
| `planning` | D2 | No | Extended | `wt coordinator session --kind=planning` |
| `escalation` | D3 | Yes (scoped hold) | Escalation reserve | `wt coordinator escalate` |

Each kind maps to a named budget profile in `context-policy.json`:

```json
{
  "operatorSessionKindProfiles": {
    "general": {
      "perTurn": {"softTokens": 16000, "hardTokens": 32000},
      "perSession": {"softTokens": 100000, "hardTokens": 200000},
      "contextWindowTurns": 6,
      "contextWindowTokens": 48000,
      "idleTimeoutMinutes": 30
    },
    "escalation": {
      "perTurn": {"softTokens": 32000, "hardTokens": 64000},
      "perSession": {"softTokens": 200000, "hardTokens": 500000},
      "contextWindowTurns": 10,
      "contextWindowTokens": 96000,
      "idleTimeoutMinutes": 120,
      "autoHoldScope": "affected-batches",
      "defaultRoutingClass": "D3"
    }
  }
}
```

The kind is set at creation time and is immutable for the session's lifetime.
`/fork` inherits the parent's kind with an optional `--kind=` override. The
kind is visible in the session banner and in `wt coordinator session show`.

---

### Gap 6: `wt init` does not seed operator-session policy

**Severity:** High — first `wt coordinator session` has undefined behavior

**Problem:** `wt init` creates `lane.json`, `install.json`, `repositories.
local.json`, `lane.config.env`, coordinator routing/context policy, and pack
indexes. But it never creates session policy defaults. The operator-session
draft defines per-turn limits, per-session limits, lane-wide session usage,
max open sessions, max concurrent turns, and retention policy — all of which
must have defined values before the first session starts.

Without explicit creation at init time, either:
- The first session invocation must create defaults (race condition between
  init and first session, and undocumented default behavior)
- The session subsystem loads "hardcoded defaults" (brittle, not versioned in
  policy files)
- The session subsystem fails with "no session policy configured"

**Concrete scenario:** `wt init my-lane --tmux-prefix=ml --impl-pack=...`
completes successfully. The operator immediately runs `wt coordinator session`.
What is the max open sessions? What is the per-turn soft token limit? What is
the retention duration? None of these are defined, but the session must have
answers to enforce budgets.

**Proposed resolution:**

`wt init` creates `context-policy.json` (or a new `session-policy.json`) with
versioned defaults for operator sessions:

```json
{
  "schemaVersion": 1,
  "operatorSession": {
    "maxOpenSessions": 5,
    "maxConcurrentActiveTurns": 2,
    "kindProfiles": {
      "general": {
        "perTurn": {"softTokens": 16000, "hardTokens": 32000},
        "perSession": {"softTokens": 100000, "hardTokens": 200000},
        "contextWindowTurns": 6,
        "contextWindowTokens": 48000,
        "idleTimeoutMinutes": 30,
        "defaultRoutingClass": "D2"
      },
      "investigation": {
        "perTurn": {"softTokens": 16000, "hardTokens": 32000},
        "perSession": {"softTokens": 200000, "hardTokens": 400000},
        "contextWindowTurns": 8,
        "contextWindowTokens": 64000,
        "idleTimeoutMinutes": 60,
        "defaultRoutingClass": "D2"
      },
      "review": {
        "perTurn": {"softTokens": 24000, "hardTokens": 48000},
        "perSession": {"softTokens": 150000, "hardTokens": 300000},
        "contextWindowTurns": 6,
        "contextWindowTokens": 64000,
        "idleTimeoutMinutes": 45,
        "defaultRoutingClass": "D2"
      },
      "planning": {
        "perTurn": {"softTokens": 24000, "hardTokens": 48000},
        "perSession": {"softTokens": 300000, "hardTokens": 500000},
        "contextWindowTurns": 10,
        "contextWindowTokens": 96000,
        "idleTimeoutMinutes": 60,
        "defaultRoutingClass": "D2"
      },
      "escalation": {
        "perTurn": {"softTokens": 32000, "hardTokens": 64000},
        "perSession": {"softTokens": 200000, "hardTokens": 500000},
        "contextWindowTurns": 10,
        "contextWindowTokens": 96000,
        "idleTimeoutMinutes": 120,
        "autoHoldScope": "affected-batches",
        "defaultRoutingClass": "D3"
      }
    },
    "retention": {
      "fullTextWhileOpenOrSuspended": true,
      "closedRetentionDays": 90,
      "archivedRetentionDays": 365,
      "maxStoredBytesPerSession": 104857600,
      "maxStoredBytesPerLane": 524288000,
      "pruningRequiresConfirmation": true
    },
    "laneWideBudget": {
      "softTokens": 1000000,
      "hardTokens": 2000000,
      "reservedForEscalation": 500000
    }
  }
}
```

These defaults are lane-owned and durable. The operator may edit them
(they are policy, not managed assets). `wt upgrade` preserves them.

If `context-policy.json` already has sections for operator sessions (from a
prior init), these values are not overwritten.

`wt doctor` validates that:
- Session policy exists and is schema-valid
- Budget values are non-negative and finite
- Lane-wide budget ≥ sum of escalation reserve + minimum expected session
  budget
- Max open sessions ≥ 1
- Retention values are reasonable (not zero, not indefinite unless explicitly
  set to null)

---

### Gap 7: Session export

**Severity:** Medium — important for collaboration and record-keeping

**Problem:** The spec mentions "export behavior" in the retention policy but
never defines a command, format, or mechanism. Operators will want to:

- Share a session summary with a teammate who doesn't have WT access
- Archive a session as a markdown document for project documentation
- Include session advice in a retrospective or decision log
- Export session findings for the pack reviewer to reference

The session journal is an append-only JSONL file — not a sharable document.
Full text is stored as turn artifacts — not a single exportable file.

**Concrete scenario:** The operator completes a planning session that produced
a batch restructuring plan. The pack reviewer (a different person) needs to
understand the reasoning. The operator wants to run `wt coordinator session
export opsess-7f3a` and get a readable document. Currently, they would need
to manually compile information from `/history`, `/proposals`, and turn
records.

**Proposed resolution:**

```
wt coordinator session export <operator-session-id>
  [--format=markdown|json]
  [--turns=<range>]           # e.g., 1-12 or 1,3,5-8
  [--include-full-text]       # include complete turn content (default: summary)
  [--include-routing]         # include per-turn routing decisions
  [--redact-secrets]          # apply configured redaction (default: on)
  [--output=<path>]           # write to file (default: stdout)
```

**Markdown export format:**

```markdown
# Operator Session Export: batch 14 reject triage

**Session:** opsess-7f3a
**Lane:** sql-backends
**Kind:** investigation
**Created:** 2026-07-30T14:00:00Z
**Turns:** 4
**Total tokens:** 25,100 (estimated)
**Exported:** 2026-07-30T15:30:00Z

> ⚠ **Exported advice** — not lane authority. See operator-session journal
> for authoritative records. Full text may be pruned after retention expiry.

---

## Turn 1 (2026-07-30T14:00:00Z)

**Operator:** why was batch B14 rejected?

**Coordinator** (D2 · 18K in · 2.2K out · stale: no):

Batch B14 was rejected with three reviewer findings:

1. **F1 — Incomplete proof** — missing cold-start benchmark
2. **F2 — Missing edge case** — nil dereference on empty route groups
3. **F3 — Scope deviation** — `warmup` method outside accepted spec

Correction batch B14-R1 is queued. Suggested preserving the implementation
session for F1 and F2.

**Evidence:** event:evt-772, finding:B14:F1, finding:B14:F2, finding:B14:F3
**Proposals:** place-hold on batch:B14 (opsess-prop-91)

---

## Turn 2 (2026-07-30T14:02:00Z)
...
```

**JSON export** includes all structured turn records with optional full-text
inclusion. It is machine-readable and suitable for programmatic analysis.

Export is read-only and does not mutate the session. Exported content is
marked non-authoritative. An exported file is a snapshot, not a live reference.

Exports respect retention policy: if turn content was pruned before export,
the export includes tombstones with digest, timestamp, and routing info but
no full text.

The export command should be available both as a slash command (`/export
[--format=...]`) inside an attachment and as a CLI command outside any
attachment.

---

### Gap 8: Invocation confirmation mode

**Severity:** Medium — important for cost-conscious operators

**Problem:** The cli-session spec mentions "explicit configured confirm-before-
invoke mode" in §7.1 (Turn UX / Preflight):

> "Cancellation before spend is guaranteed only by `ask --dry-run` or an
> explicit configured confirm-before-invoke mode."

But this mode is never defined. It doesn't appear in the operator preferences
schema, there's no configuration key, no `/confirm-mode` slash command, and
no behavior specification. The operator who wants to approve every model
invocation after seeing the cost estimate has no mechanism.

**Concrete scenario:** An operator using an expensive frontier endpoint for D3
turns wants to see the preflight estimate before every invocation and explicitly
approve it. Currently, the preflight displays information but immediately
proceeds to model invocation. The only way to avoid spending is to Ctrl-C
during the narrow preflight window, or use `--dry-run` on `ask` (which doesn't
apply to the interactive `session` command).

**Proposed resolution:**

Add a preference and a `/confirm-mode` toggle:

**Operator preference:**

```json
{
  "chat": {
    "confirmBeforeInvoke": "off" | "d2-d3" | "d3-only" | "all"
  }
}
```

Values:
- `off` (default): Preflight is informational only. Model invocation starts
  immediately after preflight.
- `d3-only`: D3 turns require confirmation. D1/D2 and M0 proceed immediately.
- `d2-d3`: D2 and D3 turns require confirmation.
- `all`: Every model-backed turn (D1/D2/D3) requires confirmation. M0 never
  requires confirmation.

**Confirmation prompt:**

```
▸ why was batch B14 rejected?

Resolved: batch:B14, event:evt-772
Routing: D2 · codex-primary-medium
Estimated: 18K input tokens · currently 25.1K session total · 175K remaining

Invoke coordinator? [Y/n/skip] █
```

- `Y` or Enter: proceed with invocation
- `n`: abort this turn (no spend, turn not journaled), return to prompt
- `skip`: abort this turn AND toggle confirmation mode off for this session
  (convenience for when the operator decides they trust the routing)

If the terminal is non-interactive (pipe), confirmation mode is silently
treated as `off` — a pipe cannot confirm, and the session attachment is
TTY-only in v1, so this only affects `ask` with `--session=` in non-TTY
contexts. In that case, `ask` proceeds without confirmation and logs a
diagnostic.

**Slash command:**

```
/confirm-mode [off|d2-d3|d3-only|all]
```

Shows current mode or changes it. Affects only the current attachment's
session. Does not write to global preferences unless `--save` is specified.

---

### Gap 9: Slash command escape for natural language

**Severity:** Low — edge case, but the ambiguity is real

**Problem:** The cli-session spec says slash commands "use exact parsing and
invoke shared WT services. They never pass through the natural-language
classifier." But what happens when the operator intentionally types a line
that starts with `/`?

Examples:
- "/status of batch 14 is unclear — can you explain?"
- "/hold on, I need to think about this"
- "Should we /apply opsess-prop-91 now or wait?"

The first two look like slash commands but are prose. The third contains a
slash command nested in natural language. The spec doesn't define how the
parser distinguishes these cases.

**Concrete scenario:** The operator types `/hold on, let me think` and the
parser routes to the `/hold` slash command parser, which fails to parse
"on, let me think" and returns an error. The operator didn't want to run a
command — they were typing natural language.

**Proposed resolution:**

A line starting with `/` followed by a recognized slash command word AND a
space (or end-of-line) is a slash command. The parser checks:

1. If the first token (`/word`) exactly matches a slash command registry entry
   — it is a command. `/status of batch 14` → `/status` command with unexpected
   arguments → error: "/status takes no arguments. Did you mean to ask a
   question about batch 14?"

2. If the first token does NOT match any slash command — it is natural language.
   `/hold on, let me think` → natural language (no command called `hold ` with
   a space suffix). The `/` is treated as part of the message.

3. Embedded slash references like `/apply opsess-prop-91` in the middle of a
   line are always natural language. The slash is just a character.

4. Explicit escape: `//status` is always natural language (the double-slash is
   stripped to `/status` in the operator message).

This is implemented as a deterministic check in the attachment input handler,
before the message reaches the M0 classifier. It never invokes a model.

---

### Gap 10: Session list filtering and search

**Severity:** Medium — usability for operators with many sessions

**Problem:** `wt coordinator session list` is mentioned as a command but
has no specified options. An operator with 20+ sessions across multiple
investigations, escalations, and planning discussions needs to find a specific
session. Without filtering, the list is an unusable wall of session IDs.

**Concrete scenario:** An operator returns to a lane after two weeks. They
have 15 sessions (3 closed, 5 suspended, 7 open). They remember the topic was
"batch dependency analysis" but not the session ID. `wt coordinator session
list` dumps all 15 in creation order. The operator must read every topic to
find the right one.

**Proposed resolution:**

```
wt coordinator session list
  [--state=open|suspended|closed|archived]
  [--kind=general|investigation|review|planning|escalation]
  [--topic=<substring>]           # case-insensitive substring match
  [--since=<ISO-8601-date>]       # created or last turn after this date
  [--before=<ISO-8601-date>]
  [--with-active-holds]           # only sessions that have proposed holds
  [--with-unapplied-proposals]    # only sessions with pending proposals
  [--sort=created|last-turn|turns|tokens]
  [--limit=<N>]
  [--json]
```

Human output is a compact table:

```
ID              State  Kind          Turns  Last Turn            Topic
opsess-7f3a     open   investigation 4      2026-07-30T14:05:00  batch 14 reject triage
opsess-9b2e     open   planning      12     2026-07-30T13:45:00  batch dependency analysis
opsess-3a1c     closed escalation    6      2026-07-29T18:00:00  D3: repeated rejects B07-B10
opsess-5d4f     susp   general       2      2026-07-28T09:00:00  quick question about budgets
```

JSON output includes the full session identity record for each match.

Default sort: `last-turn` descending (most recently active first). Default
limit: 50.

---

### Gap 11: `wt doctor` session integrity checks

**Severity:** Medium — operator needs to know if session state is healthy

**Problem:** `v1-draft.md` §11.7 mentions doctor checks for "conversation
lifecycle/journal/index consistency, retention permissions, budget accounting,
stale proposals, and hold expiry/scope." These were written before the session
model existed and reference "conversation" objects that no longer exist in the
vocabulary.

The current spec text needs updating, but more importantly, the specific
checks are underspecified. What does "journal/index consistency" mean for a
session? What does "budget accounting" validate?

**Proposed resolution:**

Replace the existing session-related doctor check description with explicit
checks:

| Check | Severity | What it validates |
|-------|----------|-------------------|
| Session count vs policy max | `warn` | Open sessions ≤ `maxOpenSessions`; warn when approaching limit |
| Session index checkpoint consistency | `fail` | Every session's `index/current.json` matches its `journal.jsonl` checkpoint; stale indexes block resumption |
| Session journal integrity | `fail` | Every journal record is valid JSON with required fields; append-only continuity verified |
| Turn record completeness | `warn` | Every journaled turn has a turn directory with at minimum `operator.md` and either `response.json` or `interrupted`/`failed` metadata |
| Stale sessions | `warn` | Open sessions with `lastTurnAt` older than idle timeout; warn but do not close |
| Stale proposals | `warn` | Unapplied proposals where the session snapshot no longer matches current lane revision |
| Hold expiry | `warn` | Active holds past their `expiresAt` — report with recommendation to release |
| Budget accounting | `fail` | Sum of session usage vs lane-wide usage ledger; detect accounting drift |
| Retention disk usage | `warn` | Total stored session bytes vs `maxStoredBytesPerLane`; warn at 80% threshold |
| Retention permissions | `fail` | Session directories and full-text files have owner-only permissions unless multi-user route policy requires specific grants |
| Orphaned session artifacts | `warn` | Session directories without matching journal entries, or journal entries without session directories |

Exit code 4 for `fail` checks. Warnings do not change exit code but are
reported. Doctor is read-only and never repairs sessions.

---

### Gap 12: Session survival across lane upgrades

**Severity:** Medium — data integrity risk

**Problem:** `wt upgrade` changes the lane's runtime version, knowledge version,
pack seal, and potentially schema version. Operator sessions contain snapshots
referencing specific pack seal IDs, index revisions, and routing policy
versions.

What happens to existing sessions after `wt upgrade`?

- Are open sessions still resumable?
- Do turns referencing the old pack seal become invalid?
- Is session budget policy preserved, migrated, or reset?
- Do session indexes need rebuilding?

**Concrete scenario:** A lane has an open investigation session (opsess-7f3a,
4 turns, referencing `packSealId: seal-43dc`). The operator runs `wt upgrade
--apply` to update from runtime 1.0.0 to 1.1.0, which includes a new pack seal
(`seal-67fe`) because the pack was amended. The operator then tries
`wt coordinator session resume opsess-7f3a`. What happens?

**Proposed resolution:**

Sessions survive upgrades with the following behavior:

1. **Existing turn records are preserved** — they remain valid historical
   artifacts referencing their original snapshots. Turn 3 of opsess-7f3a
   referenced `packSealId: seal-43dc` — that fact is immutable.

2. **New turns after upgrade use current seal** — when the operator appends
   turn 5 to opsess-7f3a after upgrade, the new turn snapshots
   `packSealId: seal-67fe`. The session's journal records the seal transition.

3. **Indexes are rebuilt on first post-upgrade resumption** — the session
   indexes are stale (they reference the old pack index). On first resumption
   after upgrade, a model-free index rebuild is triggered. If the rebuild
   fails (e.g., old pack artifacts referenced in session pins no longer exist),
   the session is marked with a warning but remains resumable. Pins to missing
   artifacts are cleared with a tombstone event.

4. **Budget policy survives upgrade** — `context-policy.json` is lane-owned,
   not managed. `wt upgrade` does not overwrite it. New budget fields from a
   newer policy version are added with defaults; existing values are preserved.

5. **Session policy schema migration** — if the session policy schema version
   changes between runtime versions, the upgrade performs a schema migration.
   Migration is previewed in `--dry-run` and applied atomically with the
   upgrade. Failed migration blocks the upgrade.

6. **Sessions with irreconcilable snapshots** — if the pack changed so
   fundamentally that session snapshots reference artifacts that no longer
   exist (e.g., a batch was deleted, not amended), the session is marked
   `archived` with a migration note. It is not resumable for new turns, but
   its history remains readable and exportable.

7. **No silent session closure** — upgrade never closes, suspends, or prunes
   sessions. The operator is warned about sessions that may have reduced
   usefulness after upgrade, but the decision to close or fork remains
   explicit.

---

### Gap 13: Worker session vs operator session naming collision

**Severity:** Low — naming clarity, not a functional bug

**Problem:** The vocabulary defines:

- **Worker session:** "Implementation/review agent process, normally hosted
  by tmux; not an operator session"
- **Operator session:** "Durable lane-bound human–WT discussion"

In status output, logs, event journals, and operator communication, the
bare word "session" is ambiguous. "Session is active" — does that mean
the implementer tmux session or the operator's discussion session? "Session
budget" — worker budget or operator-session budget?

**Concrete scenario:** `wt status` shows `"sessions": {"implementer": null,
"reviewer": null}`. This is worker session presence. But `wt doctor` might
also check operator-session integrity. An operator reading the output sees
"session" used in two meanings without consistent qualification.

**Proposed resolution:**

Adopt a consistent prefix convention across all human and JSON output:

| Term in output | Meaning |
|---------------|---------|
| `worker-session` | tmux-hosted implementer or reviewer agent process |
| `operator-session` | Durable lane-bound human–WT discussion |
| `session` (unqualified) | Never used alone in output; always prefixed |

In `wt status` JSON:

```json
{
  "workerSessions": {
    "implementer": {"present": true, "name": "ml-B22-impl"},
    "reviewer": {"present": false}
  },
  "operatorSessions": {
    "open": 2,
    "activeTurns": 0,
    "budgetWarning": false
  }
}
```

In `wt status` human output:

```
worker sessions:  implementer (ml-B22-impl) · reviewer (—)
operator sessions: 2 open · 0 active turns · budget healthy
```

In logs and events, the producer field distinguishes `producer: "worker"` vs
`producer: "operator-session"`.

The vocabulary table in `operator-session-draft.md` already defines the
distinction. This resolution applies the distinction consistently across all
output surfaces.

---

### Gap 14: Session reconnection UX

**Severity:** Medium — affects operator perception of continuity

**Problem:** The cli-session spec says `--resume` "rebuilds the bounded current
projection from its indexes." But what does the operator SEE on reconnection?

If the operator detaches mid-discussion (Ctrl-D) and reconnects 10 minutes
later, do they see:
- Just a bare prompt?
- A banner with session metadata?
- The last few turns?
- A summary of what changed while they were away?
- The current working set contents?

The operator needs to re-establish context before typing their next question.
A bare prompt forces them to run `/history` and `/context` manually. A good
reconnection UX should provide ambient context without overwhelming.

**Concrete scenario:** The operator is 4 turns into an investigation. They
Ctrl-D to answer a phone call. 15 minutes later they reconnect. During that
time, batch B14 was accepted (automated M0 dispatch) and batch B15 was
launched. The operator doesn't know this. If they immediately type a follow-up
about B14, their response will be based on stale mental context — but the
coordinator will load the current state. A reconnection banner would surface
the change.

**Proposed resolution:**

On reconnection, show a compact banner:

```
watchtower 1.0.0 — operator session (resumed)
lane: sql-backends · active · batch B15
session: opsess-7f3a · open · 4 turns · budget healthy
last turn: 2026-07-30T14:05:00Z (15 minutes ago)

Changes since your last turn:
  ✓ batch B14 accepted (M0) → batch B15 launched
  ✓ batch B15 implementer session present

Responses are advisory. /apply previews and confirms proposed effects.

▸
```

The "changes since" section derives mechanically from the session's last
snapshot revision and the current lane projection. It lists:
- Worker events accepted/rejected since last turn (by batch and event type)
- Holds placed/released
- Watcher state changes (if relevant)
- Coordinator cycles completed
- Budget consumption since last turn
- No more than 5 change entries; a `(+N more)` line for overflow

This is an M0 projection, never model-generated. It gives the operator enough
context to continue without running `/history` or `/status` manually.

Operator preferences control how verbose the reconnection banner is:
`compact` (default), `full` (includes last turn summary), `minimal` (session
ID only).

---

### Gap 15: Cross-session budget transfer

**Severity:** Low — edge case, but policy should address it

**Problem:** If an investigation session hits its hard budget but an escalation
session has unused budget, can the operator transfer? Or if a planning session
needs a single expensive D3 turn that exceeds its per-session budget, can the
operator authorize an override?

The spec says "never suggest opening a new session as a budget bypass." But
an explicit operator override to transfer budget between sessions of the same
lane is a legitimate operational need.

**Concrete scenario:** The operator opens a general investigation session
("why are batches 14-18 all showing high correction rates?") that turns into
a multi-turn deep-dive. By turn 12, they've hit the per-session soft budget
of 100K tokens. The coordinator has just identified a structural pack issue
that needs one more D3 turn to fully analyze. The operator should be able to
authorize one additional turn rather than fork the session (which resets the
working set) or start fresh (losing all context).

**Proposed resolution:**

Add an explicit budget override mechanism:

**Slash command:**

```
/budget override [--tokens=<N>] [--turns=<N>] [--reason=<text>]
```

This:
1. Prompts for confirmation: "This will increase the session budget by N
   tokens/turns. This action is audited. Continue? [y/N]"
2. Records a durable `operator-session-budget-override` event with:
   - Session ID
   - Override amount (tokens and/or turns)
   - Operator-provided rationale
   - Current budget state before override
3. Increases the session's hard budget ceiling (not the lane-wide budget)
4. Does NOT replenish allocation reserves
5. Does NOT affect other sessions

**Limitations:**
- Cannot increase lane-wide budget (that requires policy amendment)
- Cannot transfer from another session's budget
- Cannot override an escalation reserve (those are protected)
- Each override is individually audited
- The lane-wide hard budget remains the ultimate ceiling; a session override
  cannot exceed what the lane-wide budget permits

The purpose is to handle the "one more turn" scenario, not to bypass budget
discipline. The cost is explicitly acknowledged rather than worked around.

---

### Gap 16: Operator session IDs in `wt status`

**Severity:** Low — convenience feature

**Problem:** `wt status --json` shows session counts but not session IDs or
topics. The operator who wants to resume a specific session must remember or
look up the ID via `wt coordinator session list`.

**Concrete scenario:** The operator runs `wt status` to check the lane:
"2 operator sessions open, 0 active turns." They want to resume one of them.
They must now run a second command (`wt coordinator session list`) to find the
session ID, then a third (`wt coordinator session resume <id>`) to reconnect.
Three commands for what should be one informational + one action command.

**Proposed resolution:**

Add an `operatorSessions` array to `wt status --json` output (always present,
but entries may be truncated in default human output):

```json
{
  "operatorSessions": {
    "open": 2,
    "activeTurns": 0,
    "budgetWarning": false,
    "sessions": [
      {
        "id": "opsess-7f3a",
        "kind": "investigation",
        "state": "open",
        "topic": "batch 14 reject triage",
        "turnCount": 4,
        "lastTurnAt": "2026-07-30T14:05:00Z"
      },
      {
        "id": "opsess-9b2e",
        "kind": "planning",
        "state": "suspended",
        "topic": "batch dependency analysis",
        "turnCount": 12,
        "lastTurnAt": "2026-07-30T13:45:00Z"
      }
    ]
  }
}
```

In human output:
- Default (compact): "operator-sessions: 2 open (opsess-7f3a 'batch 14 reject
  triage', opsess-9b2e 'batch dependency analysis' suspended)"
- Verbose: table with ID, kind, state, turns, last turn, topic

The operator can copy-paste the session ID directly from status output.

---

### Gap 17: Attachment protocol architecture for non-terminal clients

**Severity:** Informational — architectural guidance, not a v1 requirement

**Problem:** The cli-session spec mentions "a future documented structured
attachment protocol" but doesn't architect the boundary between the session
backend and a presentation client. The presentation events architecture is
already defined (§6 of cli-session-draft.md). The natural extension is to
define these events as a protocol boundary, not just an internal pattern.

This matters for: testing (fixtures consume presentation events), IDE
integration (a VS Code extension consuming the same events), and future
non-terminal interfaces (web, TUI, notification-only).

**Proposed resolution:**

Document (not implement for v1) the presentation-event protocol boundary:

```
┌──────────────────────────────────────────────────┐
│ Presentation client (PTY, socket, IDE, web)      │
│ - consumes typed presentation events             │
│ - emits operator input and slash commands        │
│ - renders according to local display capabilities│
└────────────────────┬─────────────────────────────┘
                     │ presentation events (JSON)
┌────────────────────▼─────────────────────────────┐
│ Session attachment service                       │
│ - manages attachment lifecycle                   │
│ - translates input to turn requests              │
│ - translates session state to presentation events│
│ - enforces one active turn per session           │
└────────────────────┬─────────────────────────────┘
                     │ turn requests
┌────────────────────▼─────────────────────────────┐
│ Shared WT foundation services                    │
│ - lane discovery, indexes, routing, validation   │
│ - operator-session manager                       │
│ - effect executor                                │
└──────────────────────────────────────────────────┘
```

The presentation-event protocol is the boundary. Today's PTY attachment
renders events as terminal output. A future socket attachment sends events
as JSON over a Unix socket. A future IDE attachment consumes events through
an LSP-like protocol.

v1 delivers the PTY attachment. The architecture note ensures that the
presentation events are structured as a protocol from day one, not as
internal implementation details that later need extraction.

The existing presentation event vocabulary (§6 of cli-session-draft.md)
is already sufficient for this boundary. No additional specification is needed
for v1 beyond an architectural note in `architecture.md` §4.8 stating that
the attachment service boundary uses typed presentation events and supports
pluggable transport layers.

---

### Gap 18: `ask --session=` inherits working-set context

**Severity:** Medium — affects consistency between `ask` and `session`
commands

**Problem:** The `ask` command has `--session=<operator-session-id>` but
the spec never clarifies whether this turn inherits the session's working set.
If an operator uses `ask --session=opsess-7f3a "follow-up"` from a script or
non-TTY context, does the turn get the same bounded context as an attached
turn would?

If yes: `ask` with `--session` is functionally equivalent to a single attached
turn.
If no: `ask` with `--session` is just appending to a journal without context
continuity, which makes follow-up questions nonsensical.

**Concrete scenario:** A CI system or shell script detects a condition and
wants to ask the coordinator a follow-up in the context of an existing
investigation session:

```sh
wt coordinator ask --session=opsess-7f3a \
  "batch B18 was accepted while this session was discussing it. Should we revise the hold?"
```

This question is meaningless without the working set from turns 1-4.

**Proposed resolution:**

`ask --session=<id>` builds the same working set as an attached turn would:

1. Opens the session's journal and indexes
2. Reads the last N turns within configured context window (turn count and
   token budget)
3. Resolves pinned references
4. Includes unresolved questions and unapplied proposals
5. Captures lane snapshot, pack index, routing revision
6. Classifies the question (M0 or D1-D3)
7. Invokes the endpoint (or returns M0 projection)
8. Appends the turn to the session journal
9. Returns the response

The only difference from an attached turn is:
- Input comes from `--message` or `--message-file` or positional argument,
  not from readline
- Output is plain text or `--json`, not rendered terminal UI
- No slash commands are available (the input is a single message, not a
  conversation loop)
- No streaming (unless `--stream` is explicitly set and the adapter supports
  it for non-TTY output)

`ask` without `--session` creates a new one-shot session that is automatically
closed after the response (unless `--keep-session` is specified to leave it
open for later attachment).

This makes `ask --session=` the scripting/automation equivalent of an attached
turn, and `ask` (no session) the one-shot equivalent.

---

## 3. Summary of resolutions

| # | Gap | Resolution |
|---|-----|------------|
| 1 | Parser ambiguity | Bare form always creates new; `session resume <id>` re-attaches; rename lifecycle resume to `unsuspend` |
| 2 | No observer mode | `--observe` flag: read-only slash commands, real-time turn streaming, no mutating input |
| 3 | Cross-session refs undefined | Bounded load: turn metadata + bounded response summary; no transitive resolution; counts against budget |
| 4 | No pack amendment routing | New `propose-pack-amendment` proposal type; `/amend` slash command; `session propose-amendment` CLI |
| 5 | No session kind taxonomy | `kind` field: general, investigation, review, planning, escalation; each maps to budget profile in policy |
| 6 | No session policy at init | `wt init` seeds `context-policy.json` with versioned operator-session defaults |
| 7 | No session export | `session export` command; markdown and JSON formats; respects retention/pruning |
| 8 | No invocation confirmation | `confirmBeforeInvoke` preference; `/confirm-mode` toggle; Y/n/skip prompt before model spend |
| 9 | Slash command / prose ambiguity | Exact slash command registry match; unknown commands are natural language; `//` escape |
| 10 | No session list filtering | `--state`, `--kind`, `--topic`, `--since`, `--with-active-holds`, `--sort`, `--limit` |
| 11 | Doctor session checks vague | 11 explicit session integrity checks with severity levels |
| 12 | Sessions across lane upgrades | Sessions preserved; new turns use current seal; indexes rebuilt; irreconcilable snapshots archived |
| 13 | Session naming collision | Prefix convention: `worker-session` vs `operator-session` in all output |
| 14 | Reconnection UX bare | Compact reconnection banner with change summary since last turn |
| 15 | No budget transfer | `/budget override` for per-session increases within lane-wide hard budget; audited |
| 16 | No session IDs in status | `operatorSessions.sessions[]` array in status JSON and verbose output |
| 17 | No attachment protocol arch | Document presentation-event protocol boundary; v1 PTY is one transport |
| 18 | `ask --session=` context unclear | `ask --session=` inherits full working set; `ask` without `--session` is one-shot with auto-close |

## 4. Relationship to existing spec documents

### operator-session-draft.md

Gaps 3, 4, 5, 6, 7, 12, 13, 15, 18 affect this document directly. The
proposed resolutions would:
- Add session kind taxonomy to §7 (Session identity)
- Add amendment routing to §15 (Session proposals)
- Add budget override to §13 (Budget model)
- Add session policy defaults to §13
- Add export CLI to §19
- Add `ask --session=` semantics to §19.1
- Update vocabulary with worker-session/operator-session prefix convention in §4
- Add upgrade behavior to a new § (or §20)

### cli-session-draft.md

Gaps 1, 2, 8, 9, 14 affect this document directly. The proposed resolutions
would:
- Update entry and attachment lifecycle (§4) with observer mode
- Add invocation confirmation mode to §7.1
- Add slash command escape to §9 or §10
- Add reconnection banner to §5
- Clarify bare form behavior in §4
- Add observer attachment lifecycle states to §4

### coordinator-automation-draft.md

Gap 4 affects the proposal vocabulary. The proposed resolution adds
`propose-pack-amendment` to the closed proposal types list in §11.2.

### v1-draft.md

Gap 11 affects the doctor check descriptions in §11.7. Gap 16 affects the
status JSON schema in §11.3. Gap 6 affects the init flow in §11.1. Gap 13
affects the status output vocabulary.

### architecture.md

Gap 17 adds an architectural note to §4.8 about the presentation-event
protocol boundary.

## 5. Open questions

1. **Should `unsuspend` be a separate command or a state on `session resume`?**
   Currently proposed: separate `unsuspend` subcommand. Alternative: `session
   resume` resumes either a suspended session or re-attaches to an open session.
   This is simpler but means `resume` has two different meanings depending on
   session state — which is the ambiguity this resolution is trying to avoid.

2. **Should observer mode show streaming previews or only completed turns?**
   Currently proposed: observers see streaming provisional chunks in real time.
   Alternative: observers see only completed/validated turns to avoid confusion
   if provisional text is later invalidated. Streaming gives better live
   awareness; buffered gives cleaner output.

3. **Should session export include the coordinator's full Markdown response or
   a redacted summary?**
   Currently proposed: summary by default, `--include-full-text` for complete
   responses. The full response could contain sensitive analysis about batch
   quality or worker performance that the operator may not want in a sharable
   export.

4. **Should `wt coordinator session resume` fail if the session is already
   attached elsewhere?**
   Currently proposed: second attachment fails with OPERATOR_SESSION_TURN_ACTIVE
   if it tries to create a turn. An observer attachment can attach alongside.
   Should there be an explicit "detach other attachment" option? This could be
   dangerous if the other attachment is mid-turn. Default: fail with message
   suggesting observer mode or waiting.

5. **Should budget overrides expire or be permanent?**
   Currently proposed: permanent for the session (increased hard ceiling until
   session close). Alternative: temporary overrides that expire after N minutes
   or N turns. Permanent is simpler; the audit record provides accountability.

6. **Should the reconnection banner be configurable per-session or only
   globally?**
   Currently proposed: global preference, with per-session default. The compact
   form is sufficient for most cases; full form may be desirable for escalation
   sessions where every change matters.

## 6. Recommended implementation order

1. **Gap 1 (parser) and Gap 6 (init policy)** — blockers; without these, the
   session command is ambiguous and budgets are undefined.
2. **Gap 14 (reconnection UX) and Gap 2 (observer mode)** — day-one operator
   experience; bare reconnection is confusing.
3. **Gap 5 (session kinds) and Gap 13 (naming)** — vocabulary and defaults
   stability; harder to change later.
4. **Gaps 8, 9, 10, 16** — operator ergonomics; lower risk, higher polish.
5. **Gaps 3, 4, 7, 11** — advanced features and validation.
6. **Gaps 12, 15, 17, 18** — cross-cutting concerns and architecture.
