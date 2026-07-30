# Watchtower v1 Operator–Coordinator Conversation

Status: **Draft**
Target release: `1.0.0`
CLI groups: `wt coordinator ask|chat|conversation`, `wt coordinator hold`
Last updated: 2026-07-30

This document is normative for human-operator conversation with a Watchtower
coordinator. It resolves
[discussions/operator-coordinator-conversation.md](discussions/operator-coordinator-conversation.md)
and extends
[coordinator-automation-draft.md](coordinator-automation-draft.md).

## 1. Product statement

Operators need sustained tactical discussion, not only status commands and
emergency escalation. Watchtower therefore models a conversation as a durable
sequence of bounded, snapshot-based coordinator turns:

```text
operator message
  → deterministic reference resolution and safe M0 classification
  → immutable lane snapshot + bounded conversation memory
  → M0 answer or short-lived D1–D3 coordinator turn
  → typed advisory response
  → append-only conversation journal
  → optional separately confirmed effect proposal
```

A conversation provides continuity without a lane-lifetime model session.
Conversation state is durable local data; each model invocation remains
bounded and independently routed.

## 2. Core boundary

Conversation and mutation are separate planes:

```text
CONVERSATION PLANE                    EFFECT PLANE
read snapshot                         operator confirms proposal
resolve/index context                   → revalidate current state
bounded reasoning turn                 → acquire lane lock
typed advisory response                → prepare/apply/verify effect
release                                → journal outcome
```

Conversation turns are advisory and do not hold the lane mutation lock while a
model thinks. Automated lane cycles continue unless an explicit scoped hold
exists.

The coordinator agent may propose an effect. It cannot apply one. Operator
confirmation is necessary but not sufficient: Watchtower still validates the
proposal against current pack, state, routing, claims, and policy before the
effect executor may act.

## 3. Goals and non-goals

### 3.1 Goals

1. Give operators natural one-shot and multi-turn coordinator interaction.
2. Preserve conversational continuity without cumulative provider sessions.
3. Answer mechanically provable questions with zero model tokens.
4. Resolve explicit lane references through existing bounded indexes.
5. Route every model-backed turn to an appropriate minimum capability.
6. Journal full conversation content while it remains resumable.
7. Bound per-turn, per-conversation, and lane-wide consumption.
8. Keep automated coordination progressing during advisory discussion.
9. Make proposed mutations explicit, previewable, confirmable, and revalidated.
10. Support interruption, suspension, continuation, closure, forking, and
    retention without losing audit truth.

### 3.2 Non-goals

- Restoring one persistent lane-lifetime coordinator model session.
- Allowing conversation text to become specification, pack, acceptance, or
  lane-state authority.
- Holding the lane mutation lock while waiting for model output or operator
  input.
- Automatically applying “skip,” “reorder,” “pause,” budget, scope, or routing
  suggestions from natural-language conversation.
- Perfect semantic classification using regex or deterministic heuristics.
- Using a cheap model to decide which more expensive model should answer.
- Resetting lane-wide usage by compacting or starting another conversation.
- Treating model-generated compaction as authoritative memory.
- Letting a conversation bypass pack amendment, reviewer acceptance, or effect
  validation.
- Committing conversation journals or full text to project Git.

## 4. Vocabulary

| Term | Definition |
|------|------------|
| Conversation | Durable lane-bound sequence of operator/coordinator turns |
| Turn | One operator message plus its M0 or D1–D3 response attempt |
| Conversation snapshot | Immutable lane/index/event revisions used by one turn |
| Working set | Bounded recent turns, pinned references, open questions, and relevant proposals loaded for a turn |
| Pinned reference | Operator-selected artifact/turn kept eligible for later turn context |
| Advisory response | Typed answer that has no direct mutation authority |
| Conversation proposal | Bounded requested effect produced during discussion |
| Conversation hold | Explicit expiring block on new effects for a declared lane/batch/repository scope |
| Compaction | Derived summary of older turns with source-turn references |
| Fork | New conversation referencing a closed or existing conversation without changing its history |
| Provisional stream | Unvalidated partial model output shown for responsiveness |

## 5. Authority model

| Question | Authority |
|----------|-----------|
| What did the operator ask and coordinator answer? | Append-only full-text conversation journal while retained |
| What lane state did a turn see? | Turn snapshot revision and referenced indexes |
| What does a pack artifact mean? | Accepted committed pack, not conversation prose |
| What coordinator advice was given? | Validated advisory response |
| Does advice change lane state? | No |
| What effect did the operator approve? | Confirmation event plus referenced proposal |
| Is the approved effect legal now? | Coordinator proposal validator and knowledge policy |
| What effect actually happened? | Effect journal |
| Which automated work must pause? | Explicit active scoped hold |

A digest proves identity but cannot reconstruct content. Exact replay requires
retained full text.

## 6. Conversation lifecycle

```text
OPEN
  ↔ ACTIVE_TURN
  ↔ SUSPENDED
  → CLOSED
  → ARCHIVED
  → PRUNED

Any non-pruned conversation → new OPEN child conversation
```

| State | Meaning |
|-------|---------|
| `open` | Resumable and waiting for an operator turn |
| `active-turn` | Exactly one response attempt is running |
| `suspended` | Resumable, but no new turn starts until explicitly resumed |
| `closed` | Terminal conversation; continuation requires a fork |
| `archived` | Closed content retained under archival policy |
| `pruned` | Full text removed according to policy; tombstones/digests remain |

`idle` is an observation derived from `lastTurnAt`, not a durable state.
Closed conversations are not reopened; `fork` creates a new identity and budget
segment while preserving the relationship.

One conversation has at most one active turn. A lane may have several open
conversations subject to policy and endpoint concurrency. Multiple advisory
conversations do not create multiple effect authorities.

## 7. Conversation identity

```json
{
  "schemaVersion": 1,
  "conversationId": "conv-3f8a1b2c",
  "laneId": "9d0ee3d2-8833-4fb7-b112-8438f04f57d2",
  "state": "open",
  "topic": "batch 14 reject triage",
  "createdAt": "2026-07-30T14:00:00Z",
  "lastTurnAt": "2026-07-30T14:05:00Z",
  "turnCount": 4,
  "parentConversationId": null,
  "retentionPolicy": "local-standard",
  "budgetSegmentId": "conversation-july-30",
  "pinnedRefs": [
    "batch:B14",
    "finding:B14:F3"
  ]
}
```

Conversation identity does not contain one permanent endpoint or decision
class. Each turn is classified and routed independently. Endpoint continuity
is a soft preference only when capability, availability, and budget still pass.

## 8. Turn processing

### 8.1 Flow

One turn:

1. validate conversation lifecycle and acquire a short conversation-write lock;
2. append the operator message and release the lock;
3. capture immutable lane, pack-index, runtime-index, routing, and budget
   revisions;
4. resolve explicit references deterministically;
5. test exact M0 query forms;
6. select D1–D3 minimum class conservatively when a model is required;
7. build the bounded working set and envelope;
8. preview/refuse when budgets or route requirements fail;
9. invoke one short-lived endpoint;
10. validate the typed advisory response;
11. append response, usage, references, and staleness result under the
    conversation-write lock; and
12. return response plus conversation ID and next actions.

No lane mutation lock is held during steps 3–10.

### 8.2 Snapshot contract

Every turn records:

- lane-state projection revision;
- `packSealId` and pack-index ID;
- runtime event/decision journal checkpoints;
- active allocation/routing revision;
- active hold revision;
- captured time;
- referenced artifact/turn digests; and
- whether any relevant revision changed before response completion.

If relevant state changes during a turn, the response remains valid as advice
about its recorded snapshot but is marked `stale`. Any proposed effect must be
revalidated regardless of staleness.

### 8.3 Turn record

```json
{
  "schemaVersion": 1,
  "turnId": "turn-0003",
  "conversationId": "conv-3f8a1b2c",
  "turn": 3,
  "state": "complete",
  "operatorMessage": {
    "contentPath": "turns/turn-0003/operator.md",
    "sha256": "sha256:...",
    "bytes": 312
  },
  "resolvedRefs": [
    "batch:B14",
    "batch:B07",
    "finding:B14:F3"
  ],
  "unresolvedRefs": [],
  "snapshot": {
    "laneRevision": 81,
    "packSealId": "seal-43dc",
    "packIndexId": "index-71ac",
    "eventCheckpoint": "evt-772"
  },
  "decisionClass": "D2",
  "routingRuleId": "operator-tactical-v1",
  "endpointId": "codex-primary-medium",
  "response": {
    "contentPath": "turns/turn-0003/coordinator.md",
    "sha256": "sha256:...",
    "bytes": 1540
  },
  "usage": {
    "inputTokens": 18000,
    "outputTokens": 2200,
    "quality": "reported"
  },
  "stale": false,
  "completedAt": "2026-07-30T14:05:00Z"
}
```

Interrupted and failed turns remain journaled with partial-output metadata,
failure reason, and no complete advisory response.

## 9. Typed advisory response

The agent returns one structured response:

```json
{
  "schemaVersion": 1,
  "turnId": "turn-0003",
  "type": "operator-response",
  "answer": "Batch B14 was rejected for three recorded findings.",
  "evidenceRefs": [
    "event:evt-772",
    "finding:B14:F1",
    "finding:B14:F2",
    "finding:B14:F3"
  ],
  "assumptions": [],
  "openQuestions": [
    "Should F3 be handled through a pack amendment?"
  ],
  "proposedEffects": [
    {
      "proposalId": "conv-prop-91",
      "type": "place-hold",
      "scope": "batch:B14",
      "reason": "Await operator decision about finding F3."
    }
  ],
  "recommendedDecisionClass": null,
  "confidence": "high"
}
```

Rules:

- `answer` is advisory prose.
- Evidence references must resolve through the turn snapshot.
- Proposed effects use the closed coordinator proposal vocabulary.
- The response cannot contain arbitrary commands, paths, environment maps, or
  state patches.
- A requested scope/spec/pack change may recommend amendment but cannot encode
  a bypass.
- `recommendedDecisionClass` may request escalation for the next turn; it
  cannot lower capability.

Human rendering includes citations to local artifacts/turns where safe.
`--json` returns the complete typed response and metadata.

## 10. Reference resolution and request classification

### 10.1 Deterministic references

The M0 parser resolves explicit grammar:

| Input | Lookup |
|-------|--------|
| `B14`, `batch:B14`, configured exact batch alias | Batch index |
| `event:evt-772` | Runtime event index |
| `requirement:REQ-42` | Requirement index |
| `finding:B14:F3` | Indexed review finding |
| `repo:awrux` | Lane repository binding |
| `path:docs/spec/...` | Artifact index |
| `turn:3`, `conversation:<id>:turn:3` | Conversation turn index |

Friendly forms such as “batch 14” may resolve only when exactly one candidate
exists. Ambiguity returns candidates and asks for clarification; it never
guesses. Unknown text remains untrusted operator prose.

Explicit CLI options such as `--include-batch`, `--include-event`,
`--include-requirement`, `--include-turn`, and `--include-file` create the same
typed references. Included files must be within an allowed repository/lane
root, are treated as evidence, and remain subject to byte/token limits.

### 10.2 M0 questions

M0 answers only exact policy-defined query forms whose complete answer is
mechanically available, such as:

- current batch/lane status;
- ready candidates and blockers;
- recorded usage totals and telemetry quality;
- tmux/session presence;
- latest structured reviewer event/findings;
- active holds;
- queue and publication status; and
- conversation budget/turn metadata.

M0 answers include the projection revision and are journaled for continuity.
If the requested answer requires summarizing prose, comparing meaning, or
making a recommendation, it is not M0.

### 10.3 D1–D3 classification

Deterministic routing uses explicit operator class, resolved references, exact
request form, lane guards, and conservative keyword/shape rules:

- D1: bounded non-semantic clarification with one known subject;
- D2: tactical explanation, comparison, reject/correction reasoning, or
  uncertain natural-language request;
- D3: cross-batch/repository strategy, structural redesign, integrity
  conflict, repeated failure pattern, scope/pack drift, or safety escalation.

Natural language that is not proven M0 defaults to at least D2. D1 is used only
when policy proves the bounded shape. Hard guards raise the minimum to D3.
`--class` may escalate but cannot under-route.

A D1/D2 endpoint may return a typed escalation without answering when it finds
complexity beyond its class. Watchtower records and reroutes only if an
eligible higher-class endpoint and budget exist.

## 11. Bounded conversation memory

### 11.1 Working set

Each turn may include:

- conversation identity/topic;
- current operator message;
- most recent raw turns within turn, byte, and token limits;
- explicitly pinned turns/artifacts within pin limits;
- unresolved questions and unapplied proposals;
- referenced current-turn artifacts;
- lane/event change summary since the prior turn; and
- current budget/hold state.

It does not preload the full conversation, complete pack, full automated cycle
history, or every artifact ever mentioned.

### 11.2 Conversation indexes

```text
conversations/<conversation-id>/index/
  current.json
  turns/<shard>/<turn-key-hash>.json
  artifact-references/<shard>/<ref-key-hash>.json
  proposals/<shard>/<proposal-key-hash>.json
  open-questions/<shard>/<question-key-hash>.json
```

Indexes are deterministic derived data tied to journal checkpoint and retained
turn-content digests. Queries are bounded and paginated under the same
principles as coordinator pack/runtime indexes. Missing or stale indexes block
resumption until a model-free rebuild; there is no full-conversation prompt
fallback.

### 11.3 Older context

Older turns enter a working set only through:

- explicit operator reference;
- pinned reference;
- unresolved-question/proposal link;
- deterministic artifact-reference lookup; or
- a bounded broker query approved for the decision class.

Prior answers are evidence of advice, not facts about current lane state.

## 12. Compaction

Compaction is an explicit operator action that creates a derived continuity
artifact containing:

- source turn range and digests;
- topics and resolved references;
- unresolved questions;
- proposed/applied/rejected effect references;
- operator-stated preferences; and
- a bounded non-authoritative summary.

The summary is model-generated unless a deterministic projection suffices. It
is labeled derived/untrusted and never replaces source turns while they remain
retained.

Compaction:

- reduces future working-set input;
- consumes and records tokens when model-generated;
- does not reduce cumulative conversation or lane usage;
- does not replenish allocation reserves;
- does not reset turn count or policy overrides; and
- cannot be used to evade a hard budget.

Starting or forking a conversation creates a new conversation segment but does
not reset lane-wide coordinator/conversation budgets.

## 13. Budget model

Budget dimensions include:

- per-turn input/output and broker-context limits;
- per-conversation cumulative tokens, money/quota, turns, context requests,
  latency, and stored full-text bytes;
- lane-wide operator-conversation usage and reserves;
- maximum open conversations;
- maximum concurrent active turns;
- idle/suspension/retention intervals; and
- compaction and escalation reserves.

Every dimension records telemetry quality. Defaults are finite policy, not
unlimited. Concrete token limits are endpoint/tokenizer-specific and therefore
belong to routing/context policy rather than universal spec constants.

Soft limit:

- warn before invocation;
- show estimated turn cost and remaining reserve; and
- recommend closure, suspension, compaction, or explicit override.

Hard limit:

- reject a new model-backed turn;
- continue to allow M0 status/history/budget queries;
- preserve the conversation;
- permit an audited policy override when authorized; and
- never suggest opening a new conversation as a budget bypass.

## 14. Endpoint routing

Each turn is an allocation slot:

```text
coordinator:operator-conversation:D1
coordinator:operator-conversation:D2
coordinator:operator-conversation:D3
```

The plan provides minimum capability, primary/fallback endpoint pools,
concurrency, context bounds, and reserves. Conversation routing is separate
from automated coordinator-cycle reserves so operator discussion cannot consume
all reject/recovery capacity.

Endpoint/session reuse is preferred only when:

- the next turn's minimum capability is satisfied;
- the endpoint remains available and eligible;
- continuity benefit exceeds switching cost;
- budget and independence policy pass; and
- no provider session history outside Watchtower is required for correctness.

The authoritative continuity source is the bounded Watchtower working set, not
hidden provider chat history.

## 15. Conversation proposals and confirmation

### 15.1 Proposal lifecycle

```text
PROPOSED
  → OPERATOR_CONFIRMED
  → REVALIDATED
      ├── REJECTED_STALE_OR_ILLEGAL
      └── EFFECT_PREPARED
            → EFFECT_VERIFIED | EFFECT_UNCERTAIN

PROPOSED → OPERATOR_REJECTED | EXPIRED
```

Conversation proposals have a finite expiry and snapshot revision. Operator
confirmation records intent but grants no arbitrary authority.

### 15.2 Effects requiring confirmation

At minimum:

- place/release a hold;
- pause/resume eligible dispatch scope;
- choose among otherwise valid ready candidates;
- accept a routing/budget override within operator authority;
- request pack/spec amendment;
- abandon or supersede a correction strategy; and
- close an escalation.

Skipping accepted required work, changing committed dependency structure,
weakening review, or changing specification scope cannot be approved solely
through conversation. The proposal must route to the authoritative amendment
workflow.

### 15.3 Apply command

```sh
wt coordinator conversation apply <proposal-id> [--dry-run]
```

Default output previews current-state revalidation and effects. Actual apply
requires explicit confirmation in an interactive terminal or `--confirm` in a
non-interactive context. The normal effect executor and journals are used.

## 16. Scoped holds

A hold is explicit, narrow, expiring, and durable:

```json
{
  "schemaVersion": 1,
  "holdId": "hold-7a91",
  "laneId": "9d0ee3d2-8833-4fb7-b112-8438f04f57d2",
  "scope": {
    "kind": "batch",
    "id": "B18"
  },
  "blocks": ["new-dispatch", "new-correction"],
  "reason": "Operator discussing whether B18 needs pack amendment.",
  "conversationId": "conv-3f8a1b2c",
  "createdAt": "2026-07-30T14:00:00Z",
  "expiresAt": "2026-07-30T15:00:00Z"
}
```

Rules:

- conversation creation never creates a hold implicitly;
- holds block only declared future effects;
- active workers are not terminated;
- expiry is reported and journaled, not silently extended;
- a broad lane hold requires stronger confirmation than a batch hold;
- release is idempotent;
- safety policy may create a system hold without a model, but must notify the
  operator; and
- read-only conversation/status commands do not renew holds.

## 17. Interleaving and concurrency

### 17.1 Default behavior

- M0 observations/effects and automated D1–D3 cycles may continue while an
  advisory conversation turn runs.
- Conversation response generation holds only endpoint capacity and its
  conversation-turn lock.
- Lane mutation locks are acquired only for confirmed effects.
- New automated events are added to a conversation-visible change feed.
- The next turn receives a bounded “changed since prior snapshot” projection.

### 17.2 Conflicts

If automation changes a referenced batch while a response is running:

- complete the advisory response unless safety requires endpoint termination;
- mark it stale;
- list changed revisions;
- do not apply its proposals automatically; and
- require revalidation after confirmation.

If the operator wants automation paused before discussion, they place a hold.
The UI should suggest a hold when a question explicitly concerns skipping,
reordering, or structurally changing imminent work, but must not create it
without confirmation.

### 17.3 Safety escalation

A D3 safety trigger may create a system escalation conversation and scoped
hold without invoking a model. It records evidence and notifies the operator.
When a D3 endpoint is available, the operator may begin/continue analysis.
Safety does not depend on model availability.

## 18. Escalation

`wt coordinator escalate`:

1. records the escalation and any required system hold;
2. creates an escalation conversation;
3. references the concerning cycle/effect/events;
4. attempts a D3 turn only if route and budget are available;
5. otherwise leaves a durable operator-attention thread; and
6. resolves only through a confirmed legal proposal or explicit operator
   closure with rationale.

Escalation is therefore a conversation entrypoint, not a replacement for
conversation and not merely a pause flag.

## 19. CLI contract

### 19.1 One-shot and interactive commands

```text
wt coordinator ask [<question>]
  [--continue=<conversation-id>]
  [--class=<D1|D2|D3>]
  [--include-batch=<id>]
  [--include-event=<id>]
  [--include-requirement=<id>]
  [--include-turn=<id>]
  [--include-file=<path>]
  [--message-file=<path|->]
  [--dry-run]
  [--stream]

wt coordinator chat [--continue=<conversation-id>]
```

With no positional question, `ask` reads one message from stdin.
`--message-file=-` supports multi-line stdin explicitly. `chat` is the
terminal/readline loop; it still executes one bounded turn at a time.

`--dry-run` never invokes a model or mutates a journal. It resolves references,
classifies, builds the working set/envelope, and estimates usage. Without
`--continue` it does not create a conversation; with `--continue` it reads the
existing conversation without appending a turn.

### 19.2 Lifecycle and history

| Command | Purpose |
|---------|---------|
| `wt coordinator conversation list` | List conversations, state, topic, budget, last turn, holds, and stale proposals |
| `wt coordinator conversation show <id>` | Show identity, snapshot summary, pins, open questions, proposals, and budget |
| `wt coordinator conversation history <id>` | Page retained turns with references, routing, usage, and interruption state |
| `wt coordinator conversation suspend <id>` | Prevent new turns while retaining resumability |
| `wt coordinator conversation resume <id>` | Resume a suspended conversation |
| `wt coordinator conversation close <id>` | Terminal close with rationale |
| `wt coordinator conversation fork <id>` | Start a related conversation with explicit inherited pins/turn refs |
| `wt coordinator conversation pin|unpin <id> <ref>` | Manage bounded continuity references |
| `wt coordinator conversation compact <id>` | Create derived bounded continuity summary |
| `wt coordinator conversation apply <proposal-id>` | Preview/confirm/revalidate a proposed effect |
| `wt coordinator hold place|release|list` | Manage explicit scoped holds |

History output is paginated. Read-only commands never compact, resume, repair
indexes, renew holds, or modify retention.

### 19.3 Output and interruption

- Normal answer goes to stdout; diagnostics/budget/staleness go to stderr.
- `--json` emits one documented result and disables decorative streaming.
- Buffered validated response is the default.
- `--stream` may show provisional chunks clearly marked non-authoritative.
- Only a complete typed/validated response becomes the coordinator answer.
- Ctrl-C requests endpoint interruption, journals partial output as
  `interrupted`, applies no effects, and leaves the conversation resumable.
- The result shows conversation ID, turn, class, endpoint alias, reported or
  estimated usage, remaining budget, staleness, unresolved references, and
  continuation command.

## 20. Filesystem contract

```text
<control-home>/.watchtower/lanes/<slug>/coordinator/
  conversations/
    <conversation-id>/
      conversation.json
      journal.jsonl
      turns/
        turn-0001/
          operator.md
          response.json
          coordinator.md
          snapshot.json
          usage.json
      compactions/
      proposals/
      index/
        current.json
        turns/
        artifact-references/
        proposals/
        open-questions/
  holds/
    <hold-id>.json
  context-policy.json
```

Conversation artifacts are local and ignored by Git. Open/suspended full text
is required for continuity. Default file permissions are owner-only unless a
configured multi-user coordinator route requires narrowly granted read access;
write ownership remains with the operator/effect executor.

## 21. Retention and privacy

Conversation policy declares:

- full-text retention while open/suspended;
- closed/archive retention duration;
- maximum stored bytes;
- pruning preview and confirmation;
- whether operator message redaction is available;
- which configured execution users may read turn content; and
- export behavior.

Conversation input may contain secrets unintentionally. Watchtower warns,
applies configured redaction before model invocation and logs, and never claims
perfect secret detection. Credentials remain forbidden.

Pruning is explicit or policy-scheduled through an auditable mutation. It:

- never changes effect/decision journals;
- preserves turn IDs, timestamps, content digests/lengths, routing, usage,
  proposal/effect references, and pruning reason;
- marks exact replay unavailable;
- invalidates/rebuilds conversation indexes; and
- never silently removes open/suspended content.

## 22. Durable events

| Event | Meaning |
|-------|---------|
| `conversation-opened` | Identity and initial operator turn created |
| `conversation-operator-message` | Full operator turn recorded |
| `conversation-turn-routed` | M0/D1–D3 rule and endpoint selected |
| `conversation-response-complete` | Typed validated answer recorded |
| `conversation-turn-interrupted` | Partial provisional output retained; no answer authority |
| `conversation-turn-failed` | Turn ended without complete response |
| `conversation-suspended` | New turns disabled |
| `conversation-resumed` | Suspended conversation reopened |
| `conversation-closed` | Terminal closure |
| `conversation-forked` | New identity references parent |
| `conversation-pinned` | Continuity reference added/removed |
| `conversation-compacted` | Derived continuity artifact written |
| `conversation-budget-warning` | Soft threshold crossed |
| `conversation-budget-exceeded` | Model-backed turns blocked at hard threshold |
| `conversation-proposal-confirmed` | Operator confirmed proposal for revalidation |
| `conversation-proposal-rejected` | Operator or validator rejected proposal |
| `conversation-stale-response` | Relevant lane revision changed during turn |
| `conversation-pruned` | Full text replaced by retention tombstones |
| `hold-placed` | Explicit/system scoped hold active |
| `hold-released` | Hold removed/expired with reason |
| `escalation-opened` | Attention thread and optional safety hold created |

Every event includes lane/conversation/turn IDs as applicable, producer,
timestamp, policy/index revisions, and correlation IDs.

## 23. Failure semantics

| Code | Meaning |
|------|---------|
| `CONVERSATION_NOT_FOUND` | Conversation ID is unknown in the selected lane |
| `CONVERSATION_STATE_INVALID` | Requested action is illegal for lifecycle state |
| `CONVERSATION_TURN_ACTIVE` | Another turn already runs for this conversation |
| `CONVERSATION_REFERENCE_AMBIGUOUS` | Explicit-looking reference has several candidates |
| `CONVERSATION_REFERENCE_DENIED` | Included artifact is outside allowed scope |
| `CONVERSATION_INDEX_STALE` | Journal/index checkpoint mismatch blocks resumption |
| `CONVERSATION_BUDGET_EXCEEDED` | Hard turn/conversation/lane limit blocks model invocation |
| `CONVERSATION_ROUTE_UNAVAILABLE` | No endpoint meets the selected minimum class |
| `CONVERSATION_RESPONSE_INVALID` | Endpoint did not return one valid advisory response |
| `CONVERSATION_RESPONSE_STALE` | Relevant state changed during generation |
| `CONVERSATION_PROPOSAL_STALE` | Proposed effect no longer matches current state |
| `CONVERSATION_PROPOSAL_ILLEGAL` | Proposed effect exceeds operator/policy authority |
| `CONVERSATION_HOLD_CONFLICT` | Requested hold overlaps incompatible active policy |
| `CONVERSATION_CONTENT_PRUNED` | Exact requested history is no longer retained |

Failures preserve message/turn identity when created and never imply an effect.

## 24. Testing strategy

### 24.1 Conversation and memory

- multi-turn follow-ups resolve prior turn references;
- short-lived endpoints reconstruct continuity from the bounded working set;
- full history is never preloaded;
- stale conversation index blocks instead of scanning all turns;
- compaction cites source turns and does not reset usage;
- a new/forked conversation does not reset lane-wide budget;
- pruned history reports replay unavailable; and
- ambiguous friendly references never guess.

### 24.2 Routing and cost

- exact status queries answer at M0 with no endpoint;
- semantic natural language defaults to D2;
- D3 guards override requested D1/D2;
- operator override can escalate but not downgrade;
- each turn records endpoint and telemetry quality;
- route loss preserves conversation and pauses the turn;
- conversation reserves remain distinct from automated recovery reserves; and
- increasing old conversation history does not increase the default working
  set beyond configured bounds.

### 24.3 Concurrency and effects

- automated M0/D1–D3 cycles continue during advisory response generation;
- relevant state changes mark response stale;
- no conversation turn holds the lane mutation lock while a model runs;
- advice and unconfirmed proposals cause zero effects;
- confirmed proposals are revalidated against current state;
- illegal skip/scope/review changes route to amendment rather than apply;
- explicit hold blocks only declared future effects;
- Ctrl-C journals interruption and leaves no partial effect; and
- concurrent conversations cannot create competing effect authorities.

### 24.4 Security and retention

- path traversal and unauthorized includes fail;
- untrusted operator text cannot alter policy or proposal schema;
- full text uses restrictive permissions;
- logs and JSON output redact configured secrets;
- pruning preserves tombstones and immutable effect references; and
- execution users receive only the turn content required for their invocation.

## 25. v1 acceptance criteria

- [ ] Operators can ask one-shot and multi-turn questions through the CLI.
- [ ] Every model-backed turn is short-lived, bounded, and independently
      routed.
- [ ] Conversation continuity comes from retained journal/index state, not a
      hidden provider session.
- [ ] Exact M0 questions invoke no model.
- [ ] Ambiguous references and classifications never silently under-route.
- [ ] Full text is retained while a conversation is resumable.
- [ ] Conversation working sets remain bounded as history grows.
- [ ] Compaction and conversation forking do not reset cumulative/lane budget.
- [ ] Advisory turns do not hold the lane mutation lock during model work.
- [ ] Automated cycles continue unless an explicit scoped hold blocks them.
- [ ] Every response records its lane/index snapshot and staleness.
- [ ] Conversation advice has no direct mutation authority.
- [ ] Effects require explicit confirmation, current-state validation, and the
      normal effect executor.
- [ ] Closed conversations are immutable; continuation uses fork.
- [ ] Escalation creates a usable attention conversation even when no D3
      endpoint is available.
- [ ] Interruption, failure, retention, pruning, and exact-replay availability
      are explicit and auditable.

## 26. Decisions fixed by this draft

| Decision | Outcome |
|----------|---------|
| Release | Required Watchtower v1 behavior |
| Model | First-class durable conversation composed of bounded turns |
| Continuity | Watchtower journal/index working set, not provider session |
| Mutation | Advisory by default; separately confirmed/revalidated effect proposals |
| Concurrency | No lane lock during response generation |
| Automation | Continues unless an explicit scoped hold applies |
| M0 | Exact mechanically answerable query forms only |
| Unknown natural language | D2 minimum unless D3 guards apply |
| Endpoint | Selected per turn; reuse is preference, not authority |
| Full text | Required while open/suspended |
| Compaction | Derived and non-authoritative; never resets usage |
| Closed state | Terminal; use fork for later continuation |
| Holds | Explicit, scoped, expiring, and independently journaled |
| Escalation | Attention conversation plus optional system safety hold |
| Streaming | Optional provisional UI; only validated complete response is authoritative |
| Memory | Bounded sharded conversation indexes; no full-history fallback |

## 27. Open questions

1. Which exact M0 natural-language templates should v1 support beyond explicit
   structured commands?
2. What default closed-conversation retention duration and disk limit should
   ship?
3. Which host adapters support safe interruption and provisional streaming?
4. Should notification adapters be required for system-opened escalation
   conversations, or may status polling be the v1 baseline?
5. Which effect proposal types may a normal operator confirm without a
   separate pack/spec amendment role?
