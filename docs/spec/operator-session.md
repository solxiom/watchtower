# Watchtower v1 Operator Sessions

Status: **Proposed — implementation-ready**
Target release: `1.0.0`
CLI groups: `wt coordinator ask|session`, `wt coordinator hold`
Last updated: 2026-07-31

This document is normative for durable human–Watchtower operator sessions. It
resolves
[discussions/operator-coordinator-conversation.md](discussions/operator-coordinator-conversation.md)
and
[discussions/cli-session-ux.md](discussions/cli-session-ux.md),
with gap corrections from
[discussions/operator-session-gaps.md](discussions/operator-session-gaps.md),
and extends
[coordinator-automation.md](coordinator-automation.md).
Exact operator authority, default limits, retention execution, adapter
eligibility, and JSON/error behavior are closed by
[v1-contracts.md](v1-contracts.md).

## 1. Product statement

Operators need sustained tactical discussion, not only status commands and
emergency escalation. Watchtower therefore models an operator session as a durable
sequence of bounded, snapshot-based coordinator turns:

```text
operator message
  → deterministic reference resolution and safe M0 classification
  → immutable lane snapshot + bounded session memory
  → M0 answer or short-lived D1–D3 coordinator turn
  → typed advisory response
  → append-only session journal
  → optional separately confirmed effect proposal
```

An operator session provides continuity without a lane-lifetime model session.
Its state is durable local data; each model invocation remains bounded and
independently routed. A lane may have many independent operator sessions for
different questions, investigations, or escalations.

The polished terminal experience is a foreground **session attachment**. An
attachment renders and accepts input for one operator session at a time, but it
is not the durable session, a worker/tmux session, or a provider session.
Exiting an attachment does not close its operator session.

## 2. Core boundary

Operator session and mutation are separate planes:

```text
OPERATOR SESSION PLANE                    EFFECT PLANE
read snapshot                         operator confirms proposal
resolve/index context                   → revalidate current state
bounded reasoning turn                 → acquire lane lock
typed advisory response                → prepare/apply/verify effect
release                                → journal outcome
```

Session turns are advisory and do not hold the lane mutation lock while a
model thinks. Automated lane cycles continue unless an explicit scoped hold
exists.

The coordinator agent may propose an effect. It cannot apply one. Operator
confirmation is necessary but not sufficient: Watchtower still validates the
proposal against current pack, state, routing, claims, and policy before the
effect executor may act.

## 3. Goals and non-goals

### 3.1 Goals

1. Give operators natural one-shot and multi-turn coordinator interaction.
2. Preserve operator-session continuity without cumulative provider sessions.
3. Answer mechanically provable questions with zero model tokens.
4. Resolve explicit lane references through existing bounded indexes.
5. Route every model-backed turn to an appropriate minimum capability.
6. Journal full session content while it remains resumable.
7. Bound per-turn, per-session, and lane-wide consumption.
8. Keep automated coordination progressing during advisory discussion.
9. Make proposed mutations explicit, previewable, confirmable, and revalidated.
10. Support interruption, suspension, continuation, closure, forking, and
    retention without losing audit truth.
11. Provide a responsive, accessible terminal experience with bounded
    streaming, deterministic slash commands, references, completion, budgets,
    state-change notices, and effect previews.
12. Allow multiple focused operator sessions and terminal attachments for the
    same lane without introducing another state or effect authority.

### 3.2 Non-goals

- Restoring one persistent lane-lifetime coordinator model session.
- Allowing session text to become specification, pack, acceptance, or
  lane-state authority.
- Holding the lane mutation lock while waiting for model output or operator
  input.
- Automatically applying “skip,” “reorder,” “pause,” budget, scope, or routing
  suggestions from natural-language discussion.
- Perfect semantic classification using regex or deterministic heuristics.
- Using a cheap model to decide which more expensive model should answer.
- Resetting lane-wide usage by compacting or starting another session.
- Treating model-generated compaction as authoritative memory.
- Letting a session bypass pack amendment, reviewer acceptance, or effect
  validation.
- Committing session journals or full text to project Git.
- Treating a foreground TUI attachment, terminal screen/scrollback, component
  state, render buffer, tmux pane, or provider process as durable session
  authority.
- Turning the session UI into a general shell or unrestricted `wt` command
  executor.
- Requiring a daemon, network service, or provider-side persistent conversation
  for the local full-screen v1 TUI.

## 4. Vocabulary

| Term | Definition |
|------|------------|
| Operator session | Durable lane-bound sequence of operator/coordinator turns with its own topic, lifecycle, memory, and budget segment |
| Session attachment | Ephemeral full-screen foreground TUI client attached to one operator session |
| Turn | One operator message plus its M0 or D1–D3 response attempt |
| Session snapshot | Immutable lane/index/event revisions used by one turn |
| Working set | Bounded recent turns, pinned references, open questions, and relevant proposals loaded for a turn |
| Pinned reference | Operator-selected artifact/turn kept eligible for later turn context |
| Advisory response | Typed answer that has no direct mutation authority |
| Session proposal | Bounded requested effect produced during discussion |
| Session hold | Explicit expiring block on new effects for a declared lane/batch/repository scope |
| Compaction | Derived summary of older turns with source-turn references |
| Fork | New session referencing a closed or existing session without changing its history |
| Provisional stream | Unvalidated partial model output shown for responsiveness |
| Worker session | Implementation/review agent process, normally hosted by tmux; not an operator session |
| Provider invocation | One bounded model execution; provider-side continuity is never authoritative |
| Turn reference capsule | Deterministic bounded same-lane projection of one referenced turn |
| Amendment request | Durable handoff asking an authoritative pack/spec workflow to evaluate a change |
| Budget grant | Audited finite authorization for additional session usage within lane-wide policy |

## 5. Authority model

| Question | Authority |
|----------|-----------|
| What did the operator ask and coordinator answer? | Append-only full-text session journal while retained |
| What lane state did a turn see? | Turn snapshot revision and referenced indexes |
| What does a pack artifact mean? | Accepted committed pack, not session prose |
| What coordinator advice was given? | Validated advisory response |
| Does advice change lane state? | No |
| What effect did the operator approve? | Confirmation event plus referenced proposal |
| Is the approved effect legal now? | Coordinator proposal validator and knowledge policy |
| What effect actually happened? | Effect journal |
| Which automated work must pause? | Explicit active scoped hold |

A digest proves identity but cannot reconstruct content. Exact replay requires
retained full text.

## 6. Session lifecycle

```text
OPEN
  ↔ ACTIVE_TURN
  ↔ SUSPENDED
  → CLOSED
  → ARCHIVED
  → PRUNED

Any non-pruned session → new OPEN child session
```

| State | Meaning |
|-------|---------|
| `open` | Resumable and waiting for an operator turn |
| `active-turn` | Exactly one response attempt is running |
| `suspended` | Resumable, but no new turn starts until explicitly resumed |
| `closed` | Terminal session; continuation requires a fork |
| `archived` | Closed content retained under archival policy |
| `pruned` | Full text removed according to policy; tombstones/digests remain |

`idle` is an observation derived from `lastTurnAt`, not a durable state.
`archived` is reserved in schema version 1 but no v1 command or automatic
worker enters it; explicit prune operates directly on eligible closed content.
Closed sessions are not reopened; `fork` creates a new identity and budget
segment while preserving the relationship.

One operator session has at most one active turn. A lane may have any number of
historical operator sessions and a policy-bounded number of open sessions and
concurrent turns. This is never a one-session-per-lane model. Multiple advisory
sessions do not create multiple effect authorities.

One attachment binds to one operator session at a time. Several attachments
may exist for the same lane, including attachments to different operator
sessions. Several attachments may observe the same session, but a competing
turn fails with `OPERATOR_SESSION_TURN_ACTIVE`; waiting requires an explicit
client option and does not reserve endpoint capacity.

## 7. Session identity

```json
{
  "schemaVersion": 1,
  "operatorSessionId": "opsess-3f8a1b2c",
  "laneId": "9d0ee3d2-8833-4fb7-b112-8438f04f57d2",
  "origin": "operator",
  "policyProfileId": "operator-standard",
  "tags": ["investigation"],
  "state": "open",
  "topic": "batch 14 reject triage",
  "createdAt": "2026-07-30T14:00:00Z",
  "lastTurnAt": "2026-07-30T14:05:00Z",
  "turnCount": 4,
  "parentOperatorSessionId": null,
  "retentionPolicy": "local-standard",
  "budgetSegmentId": "session-july-30",
  "pinnedRefs": [
    "batch:B14",
    "finding:B14:F3"
  ]
}
```

`origin` is the closed value `operator` or `system-escalation`.
`policyProfileId` selects a named finite policy profile and `tags` are
non-authoritative operator labels. A profile supplies limits/reserves and may
raise a minimum guard, but cannot directly select or lower a turn's decision
class. A system escalation may select an escalation profile and create a
policy-required safety hold through the independent safety path; ordinary
session creation never creates a hold.

Operator-session identity does not contain an attachment ID, permanent
endpoint, worker session, or decision class. Each turn is classified and routed
independently. Endpoint continuity is a soft preference only when capability,
availability, and budget still pass.

An operator-created fork has `origin: operator`, references its parent, and
inherits the parent profile only when that profile remains authorized; an
explicit authorized profile may replace it. Tags are copied only when
explicitly requested.

## 8. Turn processing

### 8.1 Flow

One turn:

1. validate session lifecycle and acquire a short operator-session write lock;
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
    operator-session write lock; and
12. return response plus session ID and next actions.

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
  "operatorSessionId": "opsess-3f8a1b2c",
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
      "proposalId": "opsess-prop-91",
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
| `turn:3`, `session:<id>:turn:3` | Session turn index |

Friendly forms such as “batch 14” may resolve only when exactly one candidate
exists. Ambiguity returns candidates and asks for clarification; it never
guesses. Unknown text remains untrusted operator prose.

Explicit CLI options such as `--include-batch`, `--include-event`,
`--include-requirement`, `--include-turn`, and `--include-file` create the same
typed references. Included files must be within an allowed repository/lane
root, are treated as evidence, and remain subject to byte/token limits.

### 10.2 Cross-session turn references

`session:<id>:turn:<N>` may reference only a retained turn in the same lane.
Cross-lane references fail with `OPERATOR_SESSION_REFERENCE_DENIED`. The
resolver loads one deterministic bounded turn reference capsule containing:

- operator-session and turn identity;
- timestamp, decision class, routing alias, and snapshot revision;
- resolved evidence references and staleness;
- open questions;
- proposal IDs and types only; and
- a byte-capped answer excerpt with the complete answer digest and original
  byte length.

The excerpt is explicitly labeled incomplete when truncated. WT does not call
a model to summarize it, imply that an excerpt is the complete answer, or load
the operator message, other turns, compactions, or full source-session history.
Transitive turn/session references are never expanded automatically.

Capsule bytes count against the current turn's context budget and are shown in
preflight provenance. Pruned source content resolves to its tombstone and
`OPERATOR_SESSION_CONTENT_PRUNED`; oversized or unavailable content never
causes an unbounded fallback.

### 10.3 M0 questions

M0 answers only exact policy-defined query forms whose complete answer is
mechanically available, such as:

- current batch/lane status;
- ready candidates and blockers;
- recorded usage totals and telemetry quality;
- tmux/session presence;
- latest structured reviewer event/findings;
- active holds;
- queue and publication status; and
- session budget/turn metadata.

M0 answers include the projection revision and are journaled for continuity.
If the requested answer requires summarizing prose, comparing meaning, or
making a recommendation, it is not M0.

### 10.4 D1–D3 classification

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

## 11. Bounded session memory

### 11.1 Working set

Each turn may include:

- session identity/topic;
- current operator message;
- most recent raw turns within turn, byte, and token limits;
- explicitly pinned turns/artifacts within pin limits;
- unresolved questions and unapplied proposals;
- referenced current-turn artifacts;
- lane/event change summary since the prior turn; and
- current budget/hold state.

It does not preload the full session, complete pack, full automated cycle
history, or every artifact ever mentioned.

### 11.2 Session indexes

Per-session exact content remains in its journal/turn directory. Derived
session lookup data is stored in the lane-local
`coordinator/index/sessions/sessions.sqlite` database defined by
[v1-contracts.md §8A](v1-contracts.md#8a-derived-sqlite-storage-contract).
It indexes turn identity/digests/offsets, artifact references, proposal
metadata, open questions, pins, lifecycle, checkpoints, and policy-bounded
capsules; it is not session authority or an unlimited second copy of full text.

Indexes are deterministic derived data tied to journal checkpoints and retained
turn-content digests. Queries are typed, indexed, bounded, and paginated under
the same principles as coordinator pack/runtime stores. Missing or stale
indexes block resumption until a model-free staged rebuild; there is no
full-session prompt fallback or direct SQL command surface.

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
- does not reduce cumulative session or lane usage;
- does not replenish allocation reserves;
- does not reset turn count or policy overrides; and
- cannot be used to evade a hard budget.

Starting or forking a session creates a new budget segment but does not reset
lane-wide coordinator/operator-session budgets.

## 13. Budget model

Budget dimensions include:

- per-turn input/output and broker-context limits;
- per-session cumulative tokens, money/quota, turns, context requests,
  latency, and stored full-text bytes;
- lane-wide operator-session usage and reserves;
- maximum open sessions;
- maximum concurrent active turns;
- idle/suspension/retention intervals; and
- compaction and escalation reserves.

Every dimension records telemetry quality. Defaults are finite policy, not
unlimited. Concrete token limits are endpoint/tokenizer-specific and therefore
belong to routing/context policy rather than universal spec constants.

### 13.1 Required policy

Before the first session starts, the resolved lane context policy must contain
a schema/versioned `operatorSession` section with:

- named policy profiles and a default operator profile;
- per-turn and per-session limits for every accounted usage dimension;
- lane-wide limits and protected escalation/recovery reserves;
- maximum open sessions and concurrent active turns;
- recent-turn, pin, cross-session-capsule, broker, and compaction bounds;
- closed/archive retention and stored-byte limits;
- confirmation requirements that policy may mandate independently of UI
  preferences; and
- telemetry-quality behavior when a provider dimension is unknown.

All required limits are finite or explicitly unavailable; unknown capacity is
never interpreted as zero or infinity. `wt init` materializes a valid
lane-owned policy from the installed versioned baseline. Operators may edit
lane-owned values, but upgrades never silently overwrite them or insert new
meaning-bearing defaults. A required schema migration is previewed and applied
atomically or blocks the upgrade.

Soft limit:

- warn before invocation;
- show estimated turn cost and remaining reserve; and
- recommend closure, suspension, compaction, or explicit override.

Hard limit:

- reject a new model-backed turn;
- continue to allow M0 status/history/budget queries;
- preserve the session;
- permit an audited policy override when authorized; and
- never suggest opening a new session as a budget bypass.

### 13.2 Finite budget grants

An authorized operator may request a budget grant when lane-wide policy and
reserves permit it:

```text
wt coordinator session budget grant <operator-session-id>
  (--turns=<N> | --usage=<dimension:value>)
  --reason=<text>
  [--expires-at=<timestamp>]
  [--dry-run]
```

A grant is a separately confirmed, journaled, finite allowance for one turn,
an explicit number of turns, a bounded usage dimension, or an expiry window.
It does not permanently rewrite the session profile, increase the lane-wide
hard limit, replenish allocation capacity, consume protected
escalation/recovery reserves, or transfer accounting from another session.
Unknown provider capacity cannot be granted as a guessed token amount.

## 14. Endpoint routing

Each turn is an allocation slot:

```text
coordinator:operator-session:D1
coordinator:operator-session:D2
coordinator:operator-session:D3
```

The plan provides minimum capability, primary/fallback endpoint pools,
concurrency, context bounds, and reserves. Session routing is separate
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

## 15. Session proposals and confirmation

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

Session proposals have a finite expiry and snapshot revision. Operator
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
through an operator session. The proposal must route to the authoritative
amendment workflow.

### 15.3 Amendment-request handoff

The closed proposal vocabulary includes `request-pack-amendment`:

```json
{
  "proposalId": "opsess-prop-92",
  "type": "request-pack-amendment",
  "operatorSessionId": "opsess-3f8a1b2c",
  "sourceTurnId": "turn-0004",
  "rationale": "Finding F3 may require expanding the accepted API contract.",
  "affectedBatchIds": ["B14"],
  "affectedFindingIds": ["B14:F3"],
  "evidenceRefs": ["event:evt-772", "finding:B14:F3"],
  "snapshotRevision": 82
}
```

After operator confirmation and current-state validation, the effect executor
records a durable amendment request plus a lane/initiative handoff event. The
request is evidence for a future authoritative pack/spec workflow; it is not a
pack edit, accepted scope change, new batch, or approval.

Creating the request does not implicitly suspend/close the operator session,
place a hold, or invoke an undefined pack command. If affected implementation
work must pause, the operator separately confirms a scoped hold. When an
initiative-linked pack-design workflow is available, it may discover the
request through the initiative event contract and later report a superseding
accepted pack seal.

```text
wt coordinator session amendment request <operator-session-id>
  --from-turn=<turn-id>
  [--proposal=<proposal-id>]
  [--rationale=<text>]
  [--dry-run]
```

The command deterministically reuses a valid retained proposal or collects
explicit operator rationale/evidence; it does not invoke a model to invent the
request. Actual recording follows the normal preview/confirmation/effect path.

### 15.4 Apply command

```sh
wt coordinator session apply <proposal-id> [--dry-run]
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
  "operatorSessionId": "opsess-3f8a1b2c",
  "createdAt": "2026-07-30T14:00:00Z",
  "expiresAt": "2026-07-30T15:00:00Z"
}
```

Rules:

- session creation never creates a hold implicitly;
- holds block only declared future effects;
- active workers are not terminated;
- expiry is reported and journaled, not silently extended;
- a broad lane hold requires stronger confirmation than a batch hold;
- release is idempotent;
- safety policy may create a system hold without a model, but must notify the
  operator; and
- read-only session/status commands do not renew holds.

## 17. Interleaving and concurrency

### 17.1 Default behavior

- M0 observations/effects and automated D1–D3 cycles may continue while an
  advisory session turn runs.
- Session response generation holds only endpoint capacity and its
  operator-session turn lock.
- Lane mutation locks are acquired only for confirmed effects.
- New automated events are added to a session-visible change feed.
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

A D3 safety trigger may create a system escalation session and scoped
hold without invoking a model. It records evidence and notifies the operator.
When a D3 endpoint is available, the operator may begin/continue analysis.
Safety does not depend on model availability.

## 18. Escalation

`wt coordinator escalate`:

1. records the escalation and any required system hold;
2. creates a session with `origin: system-escalation` and the configured
   escalation policy profile;
3. references the concerning cycle/effect/events;
4. attempts a D3 turn only if route and budget are available;
5. otherwise leaves a durable operator-attention thread; and
6. resolves only through a confirmed legal proposal or explicit operator
   closure with rationale.

Escalation is therefore an operator-session entrypoint, not a replacement for
the session model and not merely a pause flag.

## 19. CLI contract

### 19.1 One-shot and interactive commands

```text
wt coordinator ask [<question>]
  [--session=<operator-session-id>]
  [--one-shot]
  [--class=<D1|D2|D3>]
  [--include-batch=<id>]
  [--include-event=<id>]
  [--include-requirement=<id>]
  [--include-turn=<id>]
  [--include-file=<path>]
  [--message-file=<path|->]
  [--dry-run]
  [--confirm-invoke]
  [--stream]

wt coordinator session
  [--topic=<text>]
  [--policy-profile=<id>]
  [--tag=<tag>...]
  [--stream|--no-stream]

wt coordinator session attach <operator-session-id>
  [--observe]
  [--stream|--no-stream]
  [--wait-for-active-turn]
```

With no positional question, `ask` reads one message from stdin.
`--message-file=-` supports multi-line stdin explicitly. Bare `session` creates
a new open operator session and attaches. `session attach` binds to an existing
open session without changing lifecycle state. `session resume` remains only
the explicit `suspended → open` lifecycle transition. An unrecognized
positional token is never guessed to be a session ID.

`ask --session=<id>` uses exactly the same lifecycle validation,
operator-session turn lock, bounded working set, pins, unresolved
questions/proposals, snapshot, classification, routing, budgets, journaling,
and staleness pipeline as an attachment turn. Only input and rendering differ.
`ask` without `--session` creates an open resumable session and returns its ID.
`--one-shot` closes that newly created session after a completed response; it
is invalid with `--session` and does not conceal interrupted/failed history.

`--dry-run` never invokes a model or mutates a journal. It resolves references,
classifies, builds the working set/envelope, and estimates usage. Without
`--session` it does not create a session; with `--session` it reads the existing
session without appending a turn.

`ask` remains the pipe and scripting interface. `session` requires an
interactive terminal unless a future documented structured attachment
protocol is selected; piped input does not silently enter and exit an
interactive attachment.

### 19.2 Lifecycle and history

| Command | Purpose |
|---------|---------|
| `wt coordinator session list [filters]` | Page sessions by state, origin/profile/tag, topic, time, holds/proposals, and stable sort |
| `wt coordinator session show <id>` | Show identity, snapshot summary, pins, open questions, proposals, and budget |
| `wt coordinator session history <id>` | Page retained turns with references, routing, usage, and interruption state |
| `wt coordinator session suspend <id>` | Prevent new turns while retaining resumability |
| `wt coordinator session resume <id>` | Change a suspended session back to open; it does not attach |
| `wt coordinator session close <id>` | Terminal close with rationale |
| `wt coordinator session fork <id>` | Start a related session with explicit inherited pins/turn refs |
| `wt coordinator session pin|unpin <id> <ref>` | Manage bounded continuity references |
| `wt coordinator session compact <id>` | Create derived bounded continuity summary |
| `wt coordinator session export <id>` | Deterministically export retained session records |
| `wt coordinator session prune <id>` | Preview/confirm eligible full-text pruning and preserve tombstones |
| `wt coordinator session amendment request <id>` | Create/confirm a typed amendment request from retained evidence |
| `wt coordinator session budget grant <id>` | Preview/confirm a finite authorized budget grant |
| `wt coordinator session apply <proposal-id>` | Preview/confirm/revalidate a proposed effect |
| `wt coordinator hold place|release|list` | Manage explicit scoped holds |

History output is paginated. Read-only commands never compact, resume, repair
indexes, renew holds, or modify retention.

`session list` supports repeatable `--state`, `--origin`, `--policy-profile`,
and `--tag` filters plus literal case-insensitive `--topic`, `--since`,
`--before`, `--with-holds`, `--with-unapplied-proposals`, stable
`--sort=created|last-turn|turns`, bounded `--limit`, and opaque
`--cursor`. The default is last-turn descending with operator-session ID as a
stable tie-break. JSON returns a page and next cursor, never an unbounded
array.

### 19.3 Export

```text
wt coordinator session export <operator-session-id>
  [--format=markdown|json]
  [--turns=<range>]
  [--include-routing]
  [--redact|--no-redact]
  [--output=<path>]
  [--overwrite]
  [--confirm-sensitive]
```

Export is a deterministic read of retained exact turn content, structured
records, tombstones, and an already-existing compaction when explicitly
selected. It never invokes a model to create an export summary. Redaction is
on by default. Markdown and JSON identify the lane/session, selected turns,
digests, snapshot/routing provenance, usage quality, proposals, staleness,
pruning, and the non-authoritative nature of advice.

An output file is an external snapshot, not session authority. WT refuses to
overwrite an existing path without explicit `--overwrite`. `--no-redact`
requires an interactive sensitive-data confirmation or an explicit
non-interactive `--confirm-sensitive`. Pruned content exports tombstones rather
than being reconstructed.

### 19.4 Output and interruption

- Normal answer goes to stdout; diagnostics/budget/staleness go to stderr.
- `ask --json` emits one documented result and disables decorative streaming.
- Interactive `session` rejects `--json` in v1; it does not claim that one JSON
  document represents an indefinite terminal attachment.
- Buffered validated response is the default.
- `--stream` may show provisional chunks clearly marked non-authoritative.
- Only a complete typed/validated response becomes the coordinator answer.
- Ctrl-C requests endpoint interruption, journals partial output as
  `interrupted`, applies no effects, and leaves the session resumable.
- The result shows session ID, turn, class, endpoint alias, reported or
  estimated usage, remaining budget, staleness, unresolved references, and
  attach command.

The complete terminal rendering, slash-command, streaming, signal, history,
notification, accessibility, and attachment contract is normative in
[cli-session.md](cli-session.md).

## 20. Filesystem contract

```text
<control-home>/.watchtower/lanes/<slug>/coordinator/
  operator-sessions/
    <operator-session-id>/
      operator-session.json
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
    sessions/
      index-manifest.json
      sessions.sqlite
  amendment-requests/
    <amendment-request-id>.json
  holds/
    <hold-id>.json
  context-policy.json
```

Session artifacts are local and ignored by Git. Open/suspended full text
is required for continuity. Default file permissions are owner-only unless a
configured multi-user coordinator route requires narrowly granted read access;
write ownership remains with the operator/effect executor.

### 20.1 Runtime, knowledge, policy, and pack evolution

Operator sessions survive lane runtime/knowledge upgrades and accepted-pack
seal changes:

- historical turns and snapshots remain immutable and retain their original
  runtime, knowledge, policy, index, and `packSealId` provenance;
- a new turn captures current revisions and records any seal/policy transition;
- a runtime upgrade does not itself imply that the accepted pack seal changed;
- lane-owned policy is preserved unless an explicit previewed schema migration
  is required;
- session-index migration/rebuild is model-free, staged, verified, and explicit
  in the upgrade/index plan;
- an incompatible or failed migration blocks new turns safely without hiding
  retained history; and
- upgrade never silently clears pins, closes/suspends/archives sessions, prunes
  content, or replaces missing references.

A reference to an artifact absent from the current pack remains historical
evidence about its recorded snapshot and is surfaced as unavailable/currently
superseded. The operator may explicitly unpin, close, or fork after reviewing
the transition.

## 21. Retention and privacy

Session policy declares:

- full-text retention while open/suspended;
- closed/archive retention duration;
- maximum stored bytes;
- pruning preview and confirmation;
- whether operator message redaction is available;
- which configured execution users may read turn content; and
- export behavior.

Session input may contain secrets unintentionally. Watchtower warns,
applies configured redaction before model invocation and logs, and never claims
perfect secret detection. Credentials remain forbidden.

Pruning is explicit or policy-scheduled through an auditable mutation. It:

- never changes effect/decision journals;
- preserves turn IDs, timestamps, content digests/lengths, routing, usage,
  proposal/effect references, and pruning reason;
- marks exact replay unavailable;
- invalidates/rebuilds session indexes; and
- never silently removes open/suspended content.

## 22. Durable events

| Event | Meaning |
|-------|---------|
| `operator-session-opened` | Identity and initial operator turn created |
| `operator-session-operator-message` | Full operator turn recorded |
| `operator-session-turn-routed` | M0/D1–D3 rule and endpoint selected |
| `operator-session-response-complete` | Typed validated answer recorded |
| `operator-session-turn-interrupted` | Partial provisional output retained; no answer authority |
| `operator-session-turn-failed` | Turn ended without complete response |
| `operator-session-turn-cancelled-before-invocation` | Operator declined preflight; zero model invocation recorded |
| `operator-session-suspended` | New turns disabled |
| `operator-session-resumed` | Suspended session reopened |
| `operator-session-closed` | Terminal closure |
| `operator-session-forked` | New identity references parent |
| `operator-session-pinned` | Continuity reference added/removed |
| `operator-session-compacted` | Derived continuity artifact written |
| `operator-session-budget-warning` | Soft threshold crossed |
| `operator-session-budget-exceeded` | Model-backed turns blocked at hard threshold |
| `operator-session-budget-granted` | Finite authorized grant created, expired, or consumed |
| `operator-session-proposal-confirmed` | Operator confirmed proposal for revalidation |
| `operator-session-proposal-rejected` | Operator or validator rejected proposal |
| `operator-session-stale-response` | Relevant lane revision changed during turn |
| `operator-session-pruned` | Full text replaced by retention tombstones |
| `amendment-requested` | Confirmed handoff recorded without changing the pack |
| `hold-placed` | Explicit/system scoped hold active |
| `hold-released` | Hold removed/expired with reason |
| `escalation-opened` | Attention thread and optional safety hold created |

Every event includes lane/operator-session/turn IDs as applicable, producer,
timestamp, policy/index revisions, and correlation IDs.

## 23. Failure semantics

| Code | Meaning |
|------|---------|
| `OPERATOR_SESSION_NOT_FOUND` | Session ID is unknown in the selected lane |
| `OPERATOR_SESSION_STATE_INVALID` | Requested action is illegal for lifecycle state |
| `OPERATOR_SESSION_TURN_ACTIVE` | Another turn already runs for this session |
| `OPERATOR_SESSION_OBSERVER_READ_ONLY` | Observer attachment attempted a turn or mutation |
| `OPERATOR_SESSION_REFERENCE_AMBIGUOUS` | Explicit-looking reference has several candidates |
| `OPERATOR_SESSION_REFERENCE_DENIED` | Included artifact is outside allowed scope |
| `OPERATOR_SESSION_INDEX_STALE` | Journal/index checkpoint mismatch blocks resumption |
| `OPERATOR_SESSION_POLICY_INVALID` | Required finite policy is missing, invalid, or migration-blocked |
| `OPERATOR_SESSION_BUDGET_EXCEEDED` | Hard turn/session/lane limit blocks model invocation |
| `OPERATOR_SESSION_CONFIRMATION_REQUIRED` | Policy requires explicit invocation/effect confirmation |
| `OPERATOR_SESSION_ROUTE_UNAVAILABLE` | No endpoint meets the selected minimum class |
| `OPERATOR_SESSION_RESPONSE_INVALID` | Endpoint did not return one valid advisory response |
| `OPERATOR_SESSION_RESPONSE_STALE` | Relevant state changed during generation |
| `OPERATOR_SESSION_PROPOSAL_STALE` | Proposed effect no longer matches current state |
| `OPERATOR_SESSION_PROPOSAL_ILLEGAL` | Proposed effect exceeds operator/policy authority |
| `OPERATOR_SESSION_HOLD_CONFLICT` | Requested hold overlaps incompatible active policy |
| `OPERATOR_SESSION_CONTENT_PRUNED` | Exact requested history is no longer retained |

Failures preserve message/turn identity when created and never imply an effect.

## 24. Testing strategy

### 24.1 Session and memory

- multi-turn follow-ups resolve prior turn references;
- same-lane cross-session references load one bounded non-transitive capsule;
- cross-lane, pruned, and truncated capsule behavior is explicit;
- short-lived endpoints reconstruct continuity from the bounded working set;
- full history is never preloaded;
- stale session index blocks instead of scanning all turns;
- compaction cites source turns and does not reset usage;
- a new/forked session does not reset lane-wide budget;
- pruned history reports replay unavailable; and
- ambiguous friendly references never guess.

### 24.2 Routing and cost

- exact status queries answer at M0 with no endpoint;
- semantic natural language defaults to D2;
- D3 guards override requested D1/D2;
- operator override can escalate but not downgrade;
- each turn records endpoint and telemetry quality;
- route loss preserves session and pauses the turn;
- session reserves remain distinct from automated recovery reserves;
- finite budget grants cannot increase lane limits or consume protected
  reserves; and
- increasing old session history does not increase the default working
  set beyond configured bounds.

### 24.3 Concurrency and effects

- automated M0/D1–D3 cycles continue during advisory response generation;
- relevant state changes mark response stale;
- no operator-session turn holds the lane mutation lock while a model runs;
- advice and unconfirmed proposals cause zero effects;
- confirmed proposals are revalidated against current state;
- amendment requests create handoff evidence but no pack edit, implicit hold,
  session suspension, or undefined command invocation;
- illegal skip/scope/review changes route to amendment rather than apply;
- explicit hold blocks only declared future effects;
- Ctrl-C journals interruption and leaves no partial effect; and
- concurrent sessions cannot create competing effect authorities.

### 24.4 Security and retention

- path traversal and unauthorized includes fail;
- untrusted operator text cannot alter policy or proposal schema;
- full text uses restrictive permissions;
- logs and JSON output redact configured secrets;
- pruning preserves tombstones and immutable effect references; and
- execution users receive only the turn content required for their invocation;
  and
- runtime/knowledge/pack evolution preserves old snapshots and performs no
  silent pin, lifecycle, or retention mutation.

## 25. v1 acceptance criteria

- [ ] Operators can ask one-shot and multi-turn questions through the CLI.
- [ ] `ask --session` uses the same bounded turn pipeline as an attachment;
      `ask` creates a resumable session unless `--one-shot` is explicit.
- [ ] A lane supports multiple independent operator sessions; policy bounds
      open/concurrent use without imposing one session per lane.
- [ ] Foreground attachments create, attach, switch, and detach without
      becoming durable memory or closing a session implicitly.
- [ ] Every model-backed turn is short-lived, bounded, and independently
      routed.
- [ ] Session continuity comes from retained journal/index state, not a
      hidden provider session.
- [ ] Exact M0 questions invoke no model.
- [ ] Ambiguous references and classifications never silently under-route.
- [ ] Full text is retained while a session is resumable.
- [ ] Session working sets remain bounded as history grows.
- [ ] Cross-session references are same-lane, bounded, non-transitive, and
      provenance-bearing.
- [ ] Compaction and session forking do not reset cumulative/lane budget.
- [ ] Advisory turns do not hold the lane mutation lock during model work.
- [ ] Automated cycles continue unless an explicit scoped hold blocks them.
- [ ] Every response records its lane/index snapshot and staleness.
- [ ] Session advice has no direct mutation authority.
- [ ] Effects require explicit confirmation, current-state validation, and the
      normal effect executor.
- [ ] Amendment requests are durable handoffs, not implicit pack edits, holds,
      lifecycle changes, or command execution.
- [ ] Finite budget grants remain within lane-wide policy and protected
      reserves.
- [ ] Closed sessions are immutable; continuation uses fork.
- [ ] Escalation creates a usable attention session even when no D3
      endpoint is available.
- [ ] Interruption, failure, retention, pruning, and exact-replay availability
      are explicit and auditable.
- [ ] Runtime/knowledge upgrades and pack-seal changes preserve historical
      snapshots and never silently mutate pins or session lifecycle.

## 26. Decisions fixed by this draft

| Decision | Outcome |
|----------|---------|
| Release | Required Watchtower v1 behavior |
| Model | First-class durable operator session composed of bounded turns |
| Cardinality | Many operator sessions per lane; one active turn per session |
| Attachment | Ephemeral foreground client bound to one lane and one current session |
| Identity policy | Closed origin plus named policy profile and non-authoritative tags; never a decision-class downgrade |
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
| Escalation | Attention session plus optional system safety hold |
| Amendment | Confirmed durable request/handoff; never an implicit pack mutation |
| Budget override | Finite audited grant within lane-wide limits and protected reserves |
| Export | Deterministic retained records with redaction; no generated summary |
| Evolution | Historical snapshots survive runtime/knowledge/pack changes without silent mutation |
| Streaming | Capability-dependent and provisional; capable TTY attachments default on, but only a validated complete response is authoritative |
| Memory | Bounded derived SQLite session index; no full-history fallback |

## 27. Open questions

No v1-blocking questions remain:

1. V1 supports no M0 natural-language templates; only registered structured
   CLI/slash queries are M0.
2. Closed retention defaults to 30 days with a 256 MiB lane session limit;
   pruning is explicit.
3. Streaming is optional and capability-tested; buffered validation is the
   required fallback.
4. Status polling is the v1 notification baseline; adapters are optional.
5. Normal-operator confirmation authority is the closed registry in
   [v1-contracts.md §5](v1-contracts.md#5-proposal-and-effect-registry).
