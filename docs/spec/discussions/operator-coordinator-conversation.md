# Discussion: Human-Operator ↔ Coordinator Conversation Model

Status: **Resolved**
Started: 2026-07-30
Resolved: 2026-07-30
Related:

- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- `docs/spec/coordinator-automation.md` §§ 5, 15, 19
- `docs/spec/v1.md` §§ 5, 10–11
- `docs/spec/discussions/coordinator-cost-and-automation.md` §§ 1.4, 3.7

## Resolution

Accepted with corrections in
[`../operator-session.md`](../operator-session.md) as
required Watchtower v1 behavior.

The resolution keeps first-class durable multi-turn interaction, M0 answers,
per-turn D1–D3 routing, bounded memory, journaling, budgets, terminal CLI UX,
allocation reserves, and escalation entrypoints. The durable object is now
called an **operator session**; one lane may have many, and its polished
foreground process is an ephemeral **attachment**. It changes the proposal in
these important ways:

- conversation turns are advisory and never mutate lane state directly;
- model generation does not hold the lane mutation lock;
- automated cycles continue unless an explicit scoped, expiring hold applies;
- conversation effects require separate operator confirmation and current-state
  revalidation through the normal effect executor;
- full text is required while a conversation remains resumable;
- exact replay is unavailable after policy-driven pruning;
- compaction/forking cannot reset cumulative or lane-wide usage;
- M0 is limited to exactly provable query forms; unknown natural language
  defaults conservatively to D2 and hard guards raise it to D3;
- endpoint/class selection occurs per turn rather than per conversation;
- closed conversations are terminal and later work uses a fork; and
- safety escalation creates an attention thread/hold even when no D3 model is
  available.

The remaining sections preserve the original proposal, evidence, and earlier
`conversation` command/path vocabulary. Where they conflict with this
resolution, the normative operator-session and CLI-session drafts win.

## 1. Problem statement

The coordinator-automation spec defines a thorough model for automated
coordinator cycles — M0 mechanical routing, D1–D3 bounded decision cycles,
decision envelopes, typed proposals, validated effects, and append-only
journals. But the operator interaction model is a stub.

Section 15 of `coordinator-automation.md` is four paragraphs. It states
that operator session "uses a separate short-lived cycle and never joins
the next automated coordinator context." It says operator requests are
classified before model invocation and that safety escalation may interrupt
routine routing. It offers `wt coordinator escalate` as the sole operator-
facing mutation command for coordinator communication.

This is insufficient for realistic lane operation. Operators need to converse
with the coordinator — not just escalate emergencies — in ways that the spec
does not describe.

### 1.1 No command to start a conversation

The only mutating coordinator commands currently specified are:

| Command | What it does |
|---------|-------------|
| `wt coordinator cycle --trigger=<event-id>` | Process one automated trigger |
| `wt coordinator escalate [--cycle=<id>] --reason=<text>` | Record escalation |

Neither is "ask the coordinator a question and get an answer." There is no
`wt coordinator ask "why is batch 14 stuck?"`, no interactive mode, no way for
the operator to type natural language and receive natural language from the
decision agent that manages their lane.

The operator's only path into the coordinator is escalation — an emergency
signal, not a conversation tool. If the operator wants to discuss batch
priorities, ask for an explanation of a reject decision, explore "what if we
skip batch 18?", or understand why the lane has been paused for two hours, they
have no mechanism except reading status output. The coordinator's expertise is
trapped behind an escalation event that was designed for emergencies.

### 1.2 "Conversation" vs "cycle" mismatch

The spec says the operator session is "a separate short-lived cycle." But
a conversation is multi-turn by definition. Consider a realistic exchange:

```
Operator: "Why did batch 14 get rejected?"
Coordinator: "R5 reasoning requirement wasn't met. Reviewer flagged three
             findings: F1 (incomplete proof), F2 (missing edge case), F3
             (scope deviation). Correction batch 14-R1 is queued."
Operator: "Is F3 the same scope issue we had on batch 7?"
Coordinator: "Yes — both attempted to extend the API contract beyond the
             accepted spec boundary. Batch 7 was corrected in one cycle."
Operator: "Given that pattern, should we pull F3 into a new batch and let
          14-R1 handle only F1 and F2?"
```

Each operator turn builds on the previous answer. The second question ("is F3
the same as batch 7?") is meaningless if the coordinator doesn't have the
context of the first answer. The third question proposes a tactical change
that depends on understanding both the current situation and the historical
pattern the coordinator just described.

The spec's "short-lived cycle" model — where each cycle gets a fresh bounded
envelope with no conversation continuity — cannot support this. The operator
would need to restate all context in every message, which is not conversation.
It's one-shot Q&A pretending to be a discussion.

### 1.3 No context inheritance between turns

Automated coordinator cycles are stateless by design: each one loads the current
trigger, the decision envelope, and relevant brokered context from indexes, then
produces a proposal and exits. This is correct for automated work — M0 polling
and D1 dispatch don't need to know what the coordinator decided three cycles ago.

But a human conversation reuses context. The fifth turn depends on the first
four. Without a context inheritance model, every operator message starts from
scratch with just lane status + pack index, which means:

- The operator must re-explain their situation every time.
- The coordinator cannot refer to its own prior answers ("as I mentioned…").
- The operator cannot ask "what about batch 14?" and then "and how does that
  affect batch 15?" — each is a fresh cycle with no shared context.
- The conversation is effectively N independent one-shot queries, each paying
  the full envelope construction cost without benefiting from what was already
  loaded.

### 1.4 No conversation audit trail

The coordinator-automation spec defines these durable event streams:

| Stream | Content |
|--------|---------|
| `worker-events.jsonl` | Worker lifecycle events |
| `coordinator/journal/coordinator-events.jsonl` | Decision routing, proposals, escalation |
| `coordinator/journal/effect-events.jsonl` | Effect prepare/attempt/verify |

Automated decision cycles are fully auditable: trigger, guard facts, routing
rule, endpoint, proposal, validation, effect, and outcome are all captured.
An operator can run `wt coordinator explain --cycle=<id>` and see exactly what
happened.

Operator sessions have no equivalent journal. There is no event type for
"operator asked a question," "coordinator answered," "operator requested
reprioritization," or "conversation closed." The `escalate` command records an
event, but escalation is one specific kind of operator communication — not
questions, discussions, or tactical planning.

If the operator decides to skip batch 18 after a conversation, the decision
exists in the effect journal but the *reasoning* — the conversation that led
to it — is invisible. Three weeks later, the operator cannot replay "why did
we skip this?" because the conversation was never recorded.

### 1.5 No budget or endpoint model for conversations

Automated cycles have defined budgets per decision class:

| Class | Soft limit | Hard limit |
|-------|-----------|------------|
| D1 | 12K tokens | 24K tokens |
| D2 | 32K tokens | 64K tokens |
| D3 | 96K tokens | 192K tokens |

Operator sessions have no budget. A long discussion about batch strategy
could consume more tokens than a D3 complex-judgment cycle, but there's no
admitted limit, no endpoint reserved for conversation, and no way to know when
the conversation is getting expensive.

Nor is there a model-tier contract. A "what's the status of batch 14?" query
could be answered with M0 projections (zero tokens). "Explain why the reviewer
rejected batch 14" is D2 (structured reasoning about findings). "Should we
redesign the batch structure given three rejects with the same failure pattern?"
is D3 (complex judgment). The spec says operator requests are "classified before
model invocation" but gives no classification algorithm for conversational
input.

### 1.6 No mechanism to reference lane state in natural language

In the example conversation above, the operator references "batch 14," "F3,"
"batch 7," and "batch 14-R1" — lane artifacts the envelope builder knows how to
index. But how does the envelope builder know to include batch 14's brief,
batch 7's correction history, and the reviewer's F3 finding in the operator's
conversation context?

Automated cycles use a trigger (e.g., "reject event evt-772 for batch B14"),
and the envelope builder derives bounded context from the trigger's batch,
event, and dependency neighborhood. An operator question is unstructured text.
The envelope builder would need to parse it to identify referenced batches,
events, requirements, or artifacts — which brings us to a chicken-and-egg
problem: parsing the question to decide what context to load may itself require
a model, and the model needs context to parse the question well.

### 1.7 Interleaving with automated cycles

What happens when a conversation is in progress — the operator is discussing
batch strategy with a D3 coordinator — and a worker event arrives? The automated
cycle would need to be processed:

- Does it queue behind the conversation?
- Does it interrupt the conversation?
- Can the operator acknowledge that they see the event and choose to finish
  their conversation first?
- What if the automated cycle is M0 (dispatch-ready) and the conversation is
  discussing whether to skip that very batch?

The spec currently says "a pending safety escalation may interrupt routine
routing; ordinary questions do not silently cancel a mutating cycle." But a
conversation *is* a mutating cycle (or series of them). And a conversation is
not a safety escalation. So what happens when a worker accept event arrives
mid-conversation?

### 1.8 Session lifecycle and UX undefined

The spec does not describe:

- Whether the operator types into the same terminal where `wt` runs.
- Whether the operator gets a REPL/readline interface.
- Whether the conversation opens a separate tmux session.
- Whether a conversation can be paused and resumed.
- Whether multiple concurrent conversations are permitted.
- Whether conversations time out.
- Whether operator session history persists between CLI invocations.
- What the operator sees — does the coordinator's response stream in real time
  or appear all at once? Are token counts visible? Can the operator interrupt
  the coordinator mid-response?

These are product questions, not implementation details. An operator who cannot
interact naturally with the coordinator will circumvent it — they'll open their
own model session, copy-paste status output, and make decisions outside
Watchtower's audit boundary.

### 1.9 Escalation is not conversation

The current "escalate" command deserves scrutiny. `wt coordinator escalate --reason="stuck on batch 14"` records a durable event saying the operator raised
a concern. But what happens after that event?

- Who responds to the escalation?
- With what context?
- Does escalation open a conversation, or is it a fire-and-forget signal?
- Can the operator describe the problem beyond a one-line reason?
- Can the coordinator respond with analysis, or does escalation just pause the
  lane and wait for the operator to figure it out themselves?

The spec treats escalation as a boundary event — a signal that moves the lane
from "automated progress" to "operator attention required." But the operator
escalated because they need *help from the coordinator*, not just a pause flag.
Escalation should open a conversation, not replace it.

### 1.10 The operator has no lightweight inquiry path

Every operator interaction currently routes through either:

- Read-only commands (`wt status`, `wt coordinator status`, `wt batch ready`)
- A mutating cycle (`wt coordinator cycle --trigger=...`)
- Escalation (`wt coordinator escalate`)

There is no "quick question" path. If the operator just ran `wt status` and
noticed that batch 14 says "rejected" but wants to understand *why the reject
classification was D2 instead of D1*, they cannot ask. They can run `wt
coordinator explain` to see the routing decision, but if the explanation is
insufficient — "yes, I see it routed to D2, but *why*?" — they have no natural
language channel. They escalate or they accept the opacity.

## 2. Requirements

A credible operator session model must satisfy these requirements:

### 2.1 Conversation command

The CLI must expose a command that accepts natural-language operator input,
routes it to an appropriate decision class, invokes a decision agent, and
returns a natural-language response. The operator must not need to understand
M0/D1–D3 classification, triggers, or envelope structure to ask a question.

### 2.2 Multi-turn continuity

When the operator asks a follow-up question, the coordinator must retain
context from the current conversation — prior turns, prior answers, and
the shared understanding established so far. The operator must not restate
the entire lane situation on each message.

Multi-turn context must be bounded. It cannot grow indefinitely any more than
an automated cycle's context can. A sliding window, token budget, or explicit
context-compaction mechanism is required.

### 2.3 Conversation journal

Every operator message and coordinator response must be recorded in an
append-only durable journal. The journal must capture:

- Who initiated (operator or coordinator agent)
- Timestamp
- Message content (or hash if content is large)
- Referenced lane artifacts (batch IDs, event IDs, files)
- Decision class and routing rule used
- Endpoint/model/effort assigned
- Turn number
- Token consumption per turn
- Conversation state transitions (open, idle, closed)

The journal must be replayable: a future operator (or the operator three weeks
from now) must be able to reconstruct the conversation and understand what
decisions were made and why.

### 2.4 Context construction from operator input

The envelope builder must accept unstructured operator text and construct a
bounded decision envelope. It must:

- Identify references to batches, events, requirements, artifacts, files, or
  repository paths using indexes and deterministic pattern matching (not a
  model — this is an M0 classification problem).
- Include referenced artifacts in the brokered context via standard index
  queries.
- Attach the lane summary, recent event window, and active conversation history.
- Classify the request into D1/D2/D3 based on the routing policy plus question
  complexity heuristics (e.g., status questions → D1, "should we" questions →
  D2, "redesign/conflict/reconcile" questions → D3).
- Enforce the conversation token budget — if a question and its referenced
  context would exceed the turn budget, truncate with continuation and warn
  the operator.

This must be deterministic and model-free. Using a model to decide what context
another model needs is self-defeating — you'd pay tokens to save tokens.

### 2.5 Conversational budget

Conversation must have its own budget dimensions, separate from automated
cycles:

- Per-turn token budget (soft and hard limits)
- Per-conversation cumulative token budget
- Maximum conversation turns before automatic compaction or operator review
- Time budget (maximum idle time between turns before auto-close)
- Conversation count budget (maximum concurrent open conversations per lane)

These budgets must be configurable in the coordinator context policy. They
must never be implied or defaulted to infinite.

### 2.6 Endpoint routing for conversation cycles

The routing policy must classify operator questions into D1/D2/D3 based on
the question's content and guard facts, and route to the appropriate endpoint.
A "what's the status?" question should not consume a frontier model. A
"should we restructure the remaining batches?" question should not be handled
by a cheap model that might suggest an invalid batch graph.

The operator should be able to optionally override the class if they explicitly
want a higher-capability answer: `wt coordinator ask --class=D3 "complex
strategy question"`.

### 2.7 Conversation lifecycle management

Operators must be able to:

- Start a conversation: `wt coordinator ask "question"`
- Continue an existing conversation: `wt coordinator ask --continue "follow-up"`
- Pause and resume a conversation
- List active conversations: `wt coordinator conversation list`
- View conversation history: `wt coordinator conversation history <id>`
- Close a conversation: `wt coordinator conversation close <id>`
- Return to a prior conversation after hours or days

A conversation is a durable lane object with its own identity and lifecycle.

### 2.8 Integration with automated cycles

When a conversation is active and an automated trigger arrives:

- M0 cycles may run concurrently (they're mechanical, not conversational).
- D1/D2 automated cycles queue behind the active conversation unless the
  conversation is idle (no operator turn for N seconds).
- D3 automated cycles and safety escalations may interrupt a D1 conversation
  but must not silently cancel a D2 or D3 conversation — the operator must
  be notified and given the option to suspend or complete.
- The operator must be able to see queued triggers during a conversation and
  choose to handle them.
- The conversation itself is a cycle that holds the lane mutation lock while
  a coordinator response is being generated for the current turn. Between
  turns (while waiting for operator input), the lock is released.

### 2.9 UX

At minimum:

- The operator types a question into their terminal.
- The response streams or appears when complete.
- Token counts and budget consumption are visible (in `--verbose` or always
  in a status line).
- The operator can Ctrl-C to interrupt a coordinator response without losing
  the conversation state.
- The operator can provide multi-line input for complex questions.
- `--json` output is available for scripting.
- The operator receives clear feedback when context was truncated or a
  reference couldn't be resolved.

### 2.10 M0-qualified questions

Some operator questions do not need a model at all:

| Question | Can be answered by |
|----------|-------------------|
| "What's the status of batch 14?" | `wt coordinator status` projections |
| "Which batches are ready?" | `wt batch ready` |
| "How many tokens did batch 12 consume?" | Projected usage ledger |
| "Is the implementer session for batch 14 still running?" | Tmux presence check |
| "What did the reviewer say about batch 14?" | Latest worker event for batch 14 review role |

These should route to M0 with a structured response, not invoke a model. The
operator should not need to know which questions are M0 — the classification
is automatic.

## 3. Proposed solution

### 3.1 Conversation as a first-class lane object

A conversation is a durable, journaled, multi-turn interaction between the
human operator and one or more coordinator decision agents. It has:

- A stable `conversationId` (UUID)
- A `laneId` binding (one conversation belongs to exactly one lane)
- A lifecycle state: `open`, `active` (coordinator generating response),
  `idle` (waiting for operator input), `closed`
- A turn counter
- A topic tag (optional, operator-supplied or derived from first message)
- An append-only journal
- Separate budget counters

```text
coordinator/conversations/
  <conversation-id>/
    conversation.json        # identity, state, budget counters
    journal.jsonl            # append-only message stream
```

`conversation.json`:

```json
{
  "schemaVersion": 1,
  "conversationId": "conv-3f8a1b2c",
  "laneId": "9d0ee3d2-8833-4fb7-b112-8438f04f57d2",
  "state": "idle",
  "topic": "batch 14 reject triage",
  "createdAt": "2026-07-30T14:00:00Z",
  "lastTurnAt": "2026-07-30T14:05:00Z",
  "turnCount": 4,
  "budget": {
    "tokensConsumed": 48000,
    "tokensLimit": 200000,
    "turnSoftLimit": 16000,
    "turnHardLimit": 32000
  },
  "defaultDecisionClass": "D2",
  "endpointId": "codex-primary-medium"
}
```

### 3.2 Conversation journal records

```json
{
  "schemaVersion": 1,
  "recordId": "conv-3f8a1b2c-turn-3",
  "conversationId": "conv-3f8a1b2c",
  "turn": 3,
  "at": "2026-07-30T14:04:00Z",
  "from": "operator",
  "contentDigest": "sha256:...",
  "contentByteLength": 312,
  "referencedArtifacts": ["B14", "B07", "finding-F3"],
  "decisionClass": "D2",
  "routingRuleId": "operator-tactical-v1",
  "contextWindowTokens": 18000,
  "responseTokens": 2200
}
```

```json
{
  "schemaVersion": 1,
  "recordId": "conv-3f8a1b2c-turn-4",
  "conversationId": "conv-3f8a1b2c",
  "turn": 4,
  "at": "2026-07-30T14:05:00Z",
  "from": "coordinator",
  "contentDigest": "sha256:...",
  "contentByteLength": 1540,
  "referencedArtifacts": ["B14", "B07", "finding-F3", "B14-R1"],
  "decisionClass": "D2",
  "endpointId": "codex-primary-medium",
  "inputTokens": 18000,
  "outputTokens": 2200
}
```

The full message content may be stored alongside or referenced by digest. At
minimum, the digest, byte length, and referenced artifacts are sufficient for
audit. Optionally, the full text is retained for replay.

### 3.3 Multi-turn context model

A conversation's context is constructed per-turn from:

```text
Turn N envelope:
  ✓ lane summary (status, active batch, recent events window)
  ✓ conversation preamble (topic tag, participant identity, state-machine role)
  ✓ prior turns window — last K turns or last T tokens, whichever is smaller
  ✓ turn N operator message
  ✓ artifacts referenced in the operator message (via index lookup)
  ✓ artifacts referenced in prior turns that are still within the window
  ✓ any explicit context the operator attached (--include-batch, --include-event)
  ✓ conversation budget counters (consumed, remaining, turn limit)

Not loaded:
  ✗ full prior conversation history beyond the window
  ✗ automated cycle history (unless relevant and explicitly requested)
  ✗ full pack briefs (unless referenced by ID in operator message)
  ✗ worker reports (unless referenced)
  ✗ prior coordinator decisions (unless referenced or relevant to the question)
```

When the conversation hits the per-conversation cumulative token budget, the
operator is warned. They may:

- Increase the budget (explicit policy override)
- Close the conversation and start a new one (fresh budget)
- Request compaction — the coordinator summarizes the conversation so far into
  a brief preamble for the next turn (this costs tokens but resets the window)

Compaction is an explicit operator action, not an automatic background process.

### 3.4 Operator input parsing (M0)

Before a model is invoked, the CLI deterministically scans the operator's
message for references to lane artifacts:

| Pattern | Resolved via |
|---------|-------------|
| `batch 14`, `B14`, `batch-14` | Batch index lookup by ID or title |
| `event evt-772` | Runtime event index by ID |
| `requirement REQ-42` | Requirement index by ID |
| `finding F3` | Reviewer finding from batch brief (indexed) |
| `repo awrux` | Repository binding by logical ID |
| `file docs/spec/...` | Artifact index by path |
| `batch 14 through 18` | Range of batch IDs |

The parser is a regex/pattern engine, not a model. Unknown references are left
in the message for the coordinator to interpret. The parser records which
references it resolved, which it couldn't, and warns the operator in verbose
mode.

Referenced artifacts are loaded through standard bounded index queries and
added to the envelope's brokered context.

### 3.5 Question classification (M0 + routing policy)

The routing policy is extended to classify operator messages:

```text
Classification inputs:
  - message text
  - resolved artifact references
  - lane complexity guards (total batches, active corrections, recent rejects)
  - operator-specified --class override

Classification rules:
  - M0: message matches a status/query template that projections can answer
    → respond mechanically, not via model
  - D1: simple single-artifact question, non-semantic clarification
    ("what batch is active?", "is the reviewer done?")
  - D2: tactical question, single-decision analysis, pattern explanation
    ("why was batch 14 rejected?", "what's the correction strategy?")
  - D3: strategic question, cross-batch reasoning, conflict reconciliation
    ("should we restructure batches 14-18?", "given 3 similar rejects,
     is the pack design wrong?")
  - D3 + operator attention: emergency, data integrity concern, escalated cycle

Default classification (no strong signal): D2
```

The classification is part of the routing policy in the knowledge pack. An
operator may override with `--class` if they explicitly want a more capable
review.

M0-qualified questions are answered deterministically. The CLI constructs a
structured response from projections and returns it immediately — no model,
no journal record beyond an M0 conversation entry. If the operator follows up
with a non-M0 question, a proper D1–D3 cycle is invoked.

### 3.6 CLI contract

```
wt coordinator ask "<question>"
  [--class=<D1|D2|D3>]       Override automatic classification
  [--continue=<conversation-id>]  Continue an existing conversation
  [--include-batch=<id>]      Explicitly load batch context
  [--include-event=<id>]      Explicitly load event context
  [--include-file=<path>]     Explicitly load a committed file
  [--dry-run]                 Show envelope without invoking model

wt coordinator conversation list
  [--lane=<id>]               Filter by lane
  [--state=<state>]           Filter by conversation state

wt coordinator conversation history <conversation-id>
  [--since=<turn>]            Start from turn N
  [--json]                    Structured output

wt coordinator conversation close <conversation-id>
  [--reason=<text>]           Why close

wt coordinator conversation resume <conversation-id>
                              Reopen a closed conversation (new budget segment)

wt coordinator conversation compact <conversation-id>
                              Request coordinator to summarize and reset window
```

`wt coordinator ask` without `--continue` starts a new conversation. The
response includes the `conversationId` so the operator can continue it later.

`--dry-run` shows the constructed envelope, resolved references, classified
decision class, budget state, and estimated token consumption — without
invoking a model. This is essential for the operator to inspect what context
will be sent before spending tokens.

### 3.7 Conversation flow

```
operator: wt coordinator ask "why is batch 14 stuck?"

CLI (M0):
  1. Parse message, resolve references → "batch 14" → B14
  2. Classify: tactical question about one batch → D2
  3. Check: is there an active mutating cycle? If yes, warn
  4. Load conversation context window (empty — new conversation)
  5. Load brokered context: B14 brief summary + tracker status + latest events
  6. Build decision envelope (D2 class, operator-session trigger)
  7. Verify envelope fits turn budget
  8. Create conversation directory and identity
  9. Invoke D2 endpoint with envelope
  10. Wait for typed proposal (response proposal type: "operator-response")
  11. Validate proposal
  12. Write conversation journal: operator turn + coordinator turn
  13. Display coordinator's response to operator
  14. Print: "Conversation conv-3f8a1b2c. Continue with:
            wt coordinator ask --continue=conv-3f8a1b2c \"question\""

operator: wt coordinator ask --continue=conv-3f8a1b2c "is F3 like batch 7?"

CLI (M0):
  1. Parse message, resolve references → "F3" + "batch 7" → B07
  2. Classify: comparison between two batches → D2
  3. Load conversation context: prior turns window (turn 1-2)
  4. Load brokered context: B07 brief summary + correction history
     (added because B07 was referenced in this turn)
  5. Build envelope with conversation preamble + prior turns + new message
  6. Invoke D2 endpoint
  7. Write journal, display response
```

### 3.8 Interleaving with automated cycles

```text
Conversation state: idle (waiting for operator)

Automated trigger: worker ACCEPT for batch B14 arrives

Watcher:
  1. Check: is there an active mutating cycle?
     → No (conversation is idle, lock released between turns)
  2. Process M0 routing and effect
  3. Update state, tracker projection
  4. Status message appended to conversation's event feed
     (operator sees on next ask: "Note: batch 14 was accepted while you were away")

Conversation state: active (coordinator generating response for turn N)

Automated trigger: worker REJECT for batch B15 arrives

Watcher:
  1. Check: is there an active mutating cycle?
     → Yes (conversation holds lane lock during coordinator response generation)
  2. Queue trigger behind conversation
  3. When conversation releases lock, process queued trigger
  4. If trigger is D3/safety, notify operator:
     "URGENT: batch 15 rejected. [A]cknowledge and handle now,
      [C]ontinue conversation, [S]uspend conversation"

Conversation state: active

Operator types Ctrl-C during coordinator response

Watcher:
  1. Interrupt coordinator agent
  2. Record partial response in journal (marked as interrupted)
  3. Release lock
  4. Operator can: resume conversation, close it, or ask a new question
```

### 3.9 Conversation budget model

```json
{
  "operatorConversation": {
    "defaultDecisionClass": "D2",
    "perTurn": {
      "softTokens": 16000,
      "hardTokens": 32000
    },
    "perConversation": {
      "softTokens": 200000,
      "hardTokens": 500000
    },
    "contextWindowTurns": 6,
    "contextWindowTokens": 48000,
    "maxConcurrentConversations": 3,
    "idleTimeoutMinutes": 30,
    "maxTurnsBeforeCompactionSuggestion": 20
  }
}
```

The context window of 6 turns means the envelope includes the last 6 messages
(operator + coordinator), subject to the 48K token window budget — if 6 turns
exceed 48K tokens, fewer turns are included. The operator can configure both
dimensions.

### 3.10 Conversation budget in allocation planning

When the full allocation-planning system is active, operator session
endpoints are separate allocation slots:

- `coordinator:operator-session:D1` — lightweight operator Q&A
- `coordinator:operator-session:D2` — tactical discussion
- `coordinator:operator-session:D3` — strategic/emergency conversation

Reserves cover expected conversation load. An operator who runs out of
conversation budget can explicitly override (audited) or wait for the next
budget window. This prevents an unconstrained conversation from consuming
the coordinator's entire allocation.

### 3.11 Escalation redefined

`wt coordinator escalate` becomes a special case of conversation initiation:

```
wt coordinator escalate --reason="stuck" --concerning-cycle=<cycle-id>
```

This:

1. Creates an escalation conversation (state: `escalated`)
2. Sets default decision class to D3
3. Loads the concerning cycle's envelope, proposal, and effect as initial context
4. Invokes a coordinator agent with the escalation context
5. The agent responds with analysis and questions
6. The operator continues the conversation with `wt coordinator ask --continue`

Escalation is no longer a fire-and-forget event. It is the opening turn of a
conversation that starts with elevated context and capability.

### 3.12 Filesystem contract

```text
<control-home>/.watchtower/lanes/<slug>/
  coordinator/
    conversations/
      <conversation-id>/
        conversation.json
        journal.jsonl
        full-text/                  (optional, when content preservation is on)
          turn-001-operator.md
          turn-002-coordinator.md
          ...
    context-policy.json             (extended with conversation budget)
```

All conversation artifacts are local and gitignored. The journal is
append-only. Full-text storage is optional and configurable.

### 3.13 Durable events

Additional conversation events in `coordinator/journal/coordinator-events.jsonl`:

| Event | Meaning |
|-------|---------|
| `conversation-opened` | New operator session created |
| `conversation-operator-message` | Operator turn recorded |
| `conversation-coordinator-response` | Coordinator turn recorded |
| `conversation-compacted` | Operator requested and received context compaction |
| `conversation-closed` | Operator closed the conversation |
| `conversation-budget-warning` | Soft budget threshold crossed |
| `conversation-budget-exceeded` | Hard budget reached, conversation paused |
| `escalation-opened` | Escalation conversation initiated |

All events carry `conversationId`, `turn`, `decisionClass`, endpoint info,
and token counts.

## 4. Rejected alternatives

### 4.1 Operator talks directly to the long-running coordinator session

Rejected. This is the model the whole coordinator-automation spec was designed
to replace. One provider session accumulating all operator interaction and automated
decisions produces unbounded context and requires a lane-lifetime frontier
session.

### 4.2 No operator session — just read-only commands and escalation

Rejected. Operators need to discuss strategy, question decisions, and explore
what-ifs with the coordinator. Removing this path forces the operator to make
decisions without the coordinator's structured knowledge of the lane, or to
open their own model session outside Watchtower entirely.

### 4.3 Fully stateless one-shot Q&A (no conversation continuity)

Rejected. Multi-turn conversation is how humans naturally interact with
advisory systems. Requiring the operator to restate all context in every
message is not a conversation — it's a query engine. The coordinator's value
as an interlocutor depends on it remembering what was just discussed.

### 4.4 Conversation in a separate tmux session

Rejected for the CLI path. The operator should type into their existing
terminal. A future TUI may open a pane, but the v1 CLI path is the terminal.
The coordinator response should appear inline — stdout for the response, stderr
for diagnostics and budget info.

### 4.5 Unlimited conversation context window

Rejected. Unbounded conversation context reproduces the same problem the
coordinator-automation spec was designed to solve. The context window must
be bounded by both turn count and token budget, with explicit compaction as
the escape hatch.

### 4.6 Model-based question parsing and classification

Rejected. Using a model to decide which model to invoke and what context to
load is circular — you're consuming tokens to save tokens. Classification
and reference resolution must be deterministic (M0) where possible. D1–D3
classification uses heuristics and routing policy, not a model judgment.

## 5. Relationship to existing spec documents

### coordinator-automation.md

This discussion proposes replacing the four-paragraph §15 (Operator interaction)
with a complete conversation model. The key architectural change: operator
conversation is not "a separate short-lived cycle" but a "multi-turn
conversation composed of bounded cycles with shared context."

### v1.md

The `wt coordinator` command group would expand from `index|status|context|explain|cycle|escalate` to include `ask`, `conversation list|history|close|resume|compact`.

### allocation-planning-draft.md

Operator session endpoints become allocation slots with reserved budget.
The `coordinator-routing.json` v1 file adds conversation-specific budget
parameters.

### architecture.md

The domain model gains `OperatorConversation` as a lane object. Foundation
services add `ConversationManager` and `OperatorMessageParser`.

## 6. Open questions

1. **Should M0-classified operator questions produce a journal record?**
   Currently proposed: yes, as an M0 conversation event. Alternative: only
   model-invoking turns are journaled. M0 responses are instant and stateless,
   so journaling them adds audit weight without agent cost. But the operator
   may want to see "what did I ask and what did it tell me?"

2. **Should coordinator responses stream or appear all at once?**
   Streaming provides faster feedback but complicates journaling (what if the
   operator reads a partial response and asks a question based on incomplete
   information?). Batch delivery is simpler and auditable. The spec may leave
   this as an implementation choice.

3. **Should conversation full-text be preserved by default?**
   Digest-only journal records are sufficient for audit (what was discussed,
   when, at what cost). Full-text preservation enables exact replay and is
   valuable for operator continuity, but consumes disk. Configurable: on by
   default, with a retention policy.

4. **Can the coordinator initiate a conversation with the operator?**
   Currently the operator always initiates. But if the coordinator detects
   a D3-level concern (pack drift, three repeated rejects, budget exhaustion),
   should it open a conversation and alert the operator? This is a notification
   + conversation initiation model, which requires the host to support
   notifications.

5. **Should there be a conversation priority model?**
   If the operator opens three conversations (one about batch 14, one about
   reviewer strategy, one about budget), should they be prioritized? Default:
   most recent is active. Explicit: operator designates priority.

6. **How does this interact with a future TUI?**
   A TUI could present conversations in a pane, show streaming responses, and
   allow the operator to reference batches by clicking. The CLI model should
   not preclude this, but the v1 contract is CLI-first.

7. **Should the operator be able to attach files to a question?**
   `--include-file=<path>` loads committed pack files. Should the operator be
   able to attach arbitrary local files (reports, notes)? This introduces
   trust boundaries — arbitrary files are untrusted content and should be
   handled as evidence, not policy.

## 7. Recommended next steps

1. Adopt this discussion as resolved with corrections.
2. Replace `coordinator-automation.md` §15 with a full conversation
   model section.
3. Add conversation commands to the v1-draft command table.
4. Add conversation budget to `coordinator-routing.json` schema.
5. Add conversation events to the durable event vocabulary.
6. Define the M0 operator-message parser contract (reference resolution,
   classification heuristics) as a testable foundation module.
