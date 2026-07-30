# Discussion: Coordinator Agent Cost, Quality Tiers, and Mechanical Automation

Status: **Proposed**
Started: 2026-07-30
Related:

- `docs/spec/v1-draft.md` §§ 4, 10–14
- `docs/spec/architecture.md` §§ 2–4, 6, 9
- `docs/spec/allocation-planning-draft.md` §§ 2, 8, 10

## 1. Problem statement

The coordinator agent applies bundled knowledge-pack policy to lane lifecycle
decisions — waking on events, reading state, interpreting worker results, and
selecting the next action. In the current model inherited from
`implementation-lane-coordinator`, the coordinator is one long-running agent
session that carries:

- lane configuration, pack metadata, batch graph, and dependency edges;
- accumulated conversation history spanning every wake → decision cycle;
- full worker reports, reviewer findings, and correction briefs in context;
- implementation-tracker, roadmap, and quality-policy documents;
- all prior accept/reject/correct/push decisions; and
- model-plan and account routing decisions.

This becomes a usage bottleneck for several compounding reasons:

### 1.1 Context inflation over lane lifetime

A lane with 30 batches produces 30+ coordinator wake cycles. Each cycle adds
at minimum the worker event, the coordinator's own reasoning, any operator
conversation, and the selected action. By batch 20, the coordinator is
re-reading 19 prior decisions plus growing tracker, roadmap, and report state.

The current model has no **coordinator context budget**. The agent host
determines the context window; when it fills, the coordinator either loses
relevant history or the operator pays for a larger window on every cycle.

### 1.2 One model tier for all coordinator work

The coordinator performs tasks across a wide quality spectrum, but all of them
burn the same model tier:

| Task | Required reasoning | Token cost profile |
|------|-------------------|-------------------|
| Poll file state, detect new events | None (mechanical) | Every cycle regardless of changes |
| Identify next ready batch from graph | Deterministic lookup | Every cycle after accept |
| Determine correction destination | Simple policy rule | On reject |
| Construct launch command with WT_* env | Template fill | Every batch launch |
| Push accepted commits, verify per repo | Medium, but patternable | On accept |
| Classify reject reason (brief error vs scope creep vs real failure) | Medium reasoning | On reject |
| Decide complex acceptance across multi-repo with partial push | Strong reasoning | Rare but expensive |
| Triage operator mid-work question | Strong reasoning | Intermittent |

A frontier model processing a "no new events" poll is token waste. A cheap model
deciding whether a multi-repository partial-push accept is semantically complete
may produce an incorrect decision that corrupts lane state.

### 1.3 Agent-tokens spent on deterministic work

Several coordinator actions described as "smart" in the current playbook are
mechanical:

- **Wake detection**: The watcher emits `AGENT_LOOP_WAKE_lane`. The coordinator
  reads this string from stdout. This is a grep, not a reasoning task.
- **Event reading**: `state/worker-events.jsonl` is a structured log. Finding
  the latest `accept` or `reject` for batch N is a JSONL filter, not a
  semantic decision.
- **Session presence**: Checking whether an implementer or reviewer tmux session
  exists is a `tmux has-session` call. The coordinator does not need to
  interpret tmux output.
- **Batch sequence**: After batch B07 is accepted, the next batches are those
  whose dependencies are satisfied and which are not yet accepted. This is
  graph traversal on a committed `implementation-pack.json`.
- **State writing**: `coordinator-lane-state.txt` records `lane_status=active`,
  `active_batch=B08`, `last_accept_at=...`. These are structured keys, not
  prose.
- **Launch construction**: `coordinator-launch-implementer.sh B08` with
  `WT_*` environment. The command is deterministic given batch and plan.

These actions are currently executed by the coordinator agent reading its own
prompt and producing shell commands. At scale, a meaningful fraction of
coordinator token consumption is spent on tasks a shell script or TypeScript
CLI could perform deterministically.

### 1.4 Operator mid-work conversations

When the operator intervenes — asking for status, questioning a reject
decision, requesting batch reordering — the coordinator session gains
conversation turns that may be context-heavy (human prose, interpreted results,
narrative explanations). These are necessary but expensive when the same
session also carries routine cycle overhead.

### 1.5 Cumulative real-world evidence

In manual operation, a GPT Luna Medium coordinator running a 30-batch lane
showed measurable cost pressure, particularly after batch 15–18 when context
contained substantial tracker, roadmap, and decision history. The coordinator
was spending more tokens representing its own prior work than reasoning about
the current cycle.

## 2. Design goals

1. Reduce coordinator token consumption without weakening decision quality.
2. Match task model tier to task required reasoning — cheap work should use
   cheap or zero-token paths.
3. Move deterministic lane lifecycle actions into the CLI and shell runtime,
   removing them from agent-token budgets entirely.
4. Define a structured coordinator context budget with explicit selective-load
   policies.
5. Preserve the knowledge-pack boundary: coordinator policy rules remain
   versioned and auditable even when execution is partially mechanical.

## 3. Proposed model: coordinator context budget + tiered dispatch

### 3.1 The coordinator decision envelope

Every coordinator wake should load a **narrow decision envelope**, not the full
lane history:

```text
One coordinator decision cycle loads:
  ✓ current lane_status and active_batch (from state file, ~100 bytes)
  ✓ latest durable worker event (one JSONL record, ~500 bytes)
  ✓ batch brief for active or candidate batch (committed file, referenced)
  ✓ relevant policy rule fragment (from knowledge pack, versioned)
  ✓ lane config summary (WT_* environment, ~300 bytes)
  ✓ current cycle's observation diff (what changed since last wake)

It must NOT load:
  ✗ full conversation history of prior coordinator cycles
  ✗ all prior worker events (only latest per batch role)
  ✗ full implementation-tracker (summary projection only)
  ✗ full roadmap (current position + next candidates only)
  ✗ all batch briefs (only the batch under decision)
  ✗ model-plan (endpoint routing is in the allocation plan, not the coordinator prompt)
```

The CLI constructs this envelope before invoking the coordinator agent. The
coordinator receives only what it needs for one decision, drawn from the durable
state files.

### 3.2 Tiered coordinator tasks

Split coordinator wake cycles into four tiers. The active tier is selected
deterministically by the event that triggered the wake:

```
═══════════════════════════════════════════════════════════════
TIER 0 — Mechanical (zero agent tokens)
═══════════════════════════════════════════════════════════════
Handled by: shell watcher or WT CLI (no agent invoked at all)

Triggers:
  - No new worker event (idle poll)
  - Heartbeat timeout (worker session missing)
  - Worker event format validation failure
  - Session presence change (tmux created/destroyed)

Actions:
  - Write heartbeat timestamp
  - Update session presence in state
  - Re-emit WAKE after configured interval
  - Log warning for missing session, stale heartbeat
  - Signal operator attention via status

Why mechanical: these are pattern matches on structured data.
No interpretation of worker output, no lifecycle decision, no
batch graph navigation.

═══════════════════════════════════════════════════════════════
TIER 1 — Deterministic dispatch (cheap/free model or WT CLI)
═══════════════════════════════════════════════════════════════
Handled by: cheap model (when template-fill needs prose) or
            WT CLI (when purely deterministic)

Triggers:
  - Durable worker ACCEPT event received
  - Batch dependency graph says next batch exists
  - Correction routing is unambiguous

Actions:
  - Read next batch ID from pack dependency graph
  - Construct launch command from template
  - Export WT_* environment
  - Create tmux session with correct worktree, model, effort
  - Write coordinator-lane-state.txt with new active_batch
  - Update implementation-tracker with batch status

Why cheap: dependency graph traversal is a deterministic
algorithm. The "next batch" after accepted B07 is B08 (or next
parallel group) — not a judgment call. Template-fill is string
substitution. The only prose needed is a brief wake message to
the worker agent, which a cheap/free model can handle.

═══════════════════════════════════════════════════════════════
TIER 2 — Structured decision (medium model)
═══════════════════════════════════════════════════════════════
Handled by: medium-capability model (e.g., capable-tier)

Triggers:
  - Durable worker REJECT event received
  - Correction batch completed, re-review needed
  - Operator requests batch reordering or skip
  - Worker handoff event with ambiguous next owner

Actions:
  - Classify reject reason into stable categories:
      BRIEF_ERROR    — worker misunderstood brief scope
      SCOPE_CREEP    — worker added unrequested work
      MISSED_REQ     — worker failed to satisfy a traced requirement
      REAL_FAILURE   — implementation is genuinely insufficient
      DEPENDENCY     — upstream batch change invalidated this work
  - Select correction or reassignment strategy
  - Determine preserve-session vs new-session correction
  - Update tracker with reject classification and correction plan
  - Report structured reject summary to operator

Why medium: reject triage requires understanding the relationship
between a brief, the worker's output, and the reviewer's findings.
It is structured reasoning (match finding type → select strategy)
but involves prose interpretation of the reviewer's rejection.

═══════════════════════════════════════════════════════════════
TIER 3 — Complex judgment (frontier model)
═══════════════════════════════════════════════════════════════
Handled by: frontier-capability model

Triggers:
  - Multi-repository accept with partial push failure
  - Semantic conflict between batches (one accepted, another invalidated)
  - Operator escalates an ambiguous tactical decision
  - Pack drift detected mid-lane requiring scope judgment
  - Complex operator mid-work question requiring lane-wide context
  - Independent reviewer challenges coordinator's batch selection rationale

Actions:
  - Assess whether a partial-push accept is semantically complete
  - Decide whether to retry, reassign, or accept partial work
  - Reconcile conflicting tracker and event state
  - Reason across multiple batches, repositories, and reviewers
  - Produce operator-facing narrative explanation

Why frontier: these decisions involve ambiguity, trade-offs
across multiple repositories, and consequences that cannot
be mechanically derived. Misclassification here produces
either lost work or corrupted lane state.

What it must NOT load: the tier-3 coordinator does not need
all batch briefs or full historical tracker. It receives a
structured summary of affected batches, repository states,
event history for the conflict window, and the relevant
policy rules.
```

### 3.3 Tier selection is deterministic

The watcher determines which tier to invoke based on the event that triggered
the wake:

```text
Event → Tier mapping (deterministic, in coordinator-watch.sh and WT CLI):

no_new_events              → TIER 0
heartbeat_timeout          → TIER 0
worker_accept              → TIER 1 (or TIER 3 if multi-repo partial push)
worker_reject              → TIER 2
worker_blocked             → TIER 2
worker_handoff             → TIER 1 (or TIER 2 if ambiguous)
operator_interrupt         → TIER 3 (or TIER 2 for simple queries)
correction_complete        → TIER 2 (re-review dispatch)
pack_drift_detected        → TIER 3
state_inconsistent         → TIER 3
```

The operator may override the tier before dispatch via a configurable policy,
but the default tier assignment is part of the knowledge pack, not a runtime
guess by the coordinator itself.

### 3.4 Coordinator context budget

Define a soft and hard token budget for coordinator cycles:

| Tier | Soft limit | Hard limit | Enforcement |
|------|-----------|------------|-------------|
| TIER 1 | 4K tokens | 8K tokens | CLI refuses to construct envelope exceeding limit |
| TIER 2 | 16K tokens | 32K tokens | Full brief plus finding summary; references for rest |
| TIER 3 | 64K tokens | 128K tokens | Structured summary plus key briefs; never full lane history |

Tier 1 context should fit in the equivalent of a well-structured system prompt
plus one worker event. Tier 3 context should never approach full lane history.

If the coordinator agent requests additional context (file read, tracker section),
it does so through tool calls that read from disk, not by preloading everything.
This means the agent's context grows only when it actively needs data, and
shrinks when the cycle ends (since the next cycle starts fresh from the decision
envelope).

**Important**: This requires the coordinator host (Codex, Cursor, Claude) to
support per-cycle session reset or at minimum reference-based context loading.
If a host forces cumulative conversation history, Watchtower should spawn one
decision cycle as a short-lived sub-agent rather than a persistent session.

### 3.5 Mechanical actions moved to WT CLI

The following coordinator responsibilities should become WT CLI or shell runtime
logic, not agent decisions:

| Current coordinator action | Proposed WT CLI/shell action | Rationale |
|---------------------------|------------------------------|-----------|
| Detect new worker event | `wt events tail --since=<timestamp>` or shell watcher polling `worker-events.jsonl` | JSONL tail, not reasoning |
| Check tmux session exists | `tmux has-session -t <prefix>-impl` | Shell built-in |
| Write heartbeat | Shell watcher writes timestamp to `state/watcher-heartbeat.txt` | File write, not prose |
| Determine next batch | `wt batch next --after-accept=B07` reads pack dependency graph | Graph traversal algorithm |
| Construct launch command | `wt batch launch B08 --role=implementation` | Template fill with WT_* env |
| Update lane state | `wt state set active_batch=B08 lane_status=active` | Key-value write |
| Update tracker | `wt tracker mark B07 accepted --at=<iso-time>` | Structured field update |
| Push accepted commits | `wt repo push --lane=<id> --batch=B07` (runtime action) | Git commands, deterministic |
| Verify push result per repo | `wt repo verify-push --batch=B07` reads push journal | File check |

These become `wt` subcommands or NVB tasks. The coordinator agent's remaining
responsibilities are:

1. Interpret worker reject findings and classify the reject category.
2. Decide complex multi-repo acceptance when pushes partially fail.
3. Handle operator tactical questions with lane-wide context.
4. Reconcile ambiguous or contradictory state.
5. Select correction strategy (preserve-session vs new session vs reassign).

This shifts the coordinator from being a "smart shell script executor" to a
"policy decision maker," which is the architectural intent stated in the spec.

### 3.6 Coordinator session lifecycle

Instead of one long-running coordinator session:

```text
Current model:
  ┌─────────────────────────────────────────────┐
  │  Coordinator session (30+ batch lifetime)   │
  │  Cumulative context grows every cycle       │
  │  Model tier is fixed for all work           │
  └─────────────────────────────────────────────┘

Proposed model:
  Watcher (shell, persistent, zero tokens)
    │
    ├── Wake: no events → ignore (tier 0, no agent)
    ├── Wake: ACCEPT    → spawn TIER 1 agent (cheap) or WT CLI
    │                     Agent runs one decision, writes state, exits
    ├── Wake: REJECT    → spawn TIER 2 agent (medium)
    │                     Agent classifies, selects strategy, exits
    └── Wake: CONFLICT  → spawn TIER 3 agent (frontier)
                          Agent reasons, produces decision, exits

  Each agent invocation:
    - Starts with the narrow decision envelope
    - Has file-read tools if it needs more context
    - Exits after producing one decision + state update
    - Does not carry prior conversation history
```

The watcher remains the persistent session-owner. The coordinator becomes a
series of stateless decision invocations, each one brief and tier-matched.

### 3.7 Operator conversation separation

Operator mid-work conversations (questions, escalations, batch reordering) should
spawn a separate coordinator session from the active decision cycle:

- If no decision is pending: spawn a TIER 3 session with the operator's question
  and the lane summary context.
- If a decision is in progress: queue the operator question; complete the current
  decision cycle first.
- Operator context is limited to the current lane status, active batch, recent
  event history (last 5 events), and tracker summary — not full lane history.

This prevents operator conversations from inflating the context of the next
automated decision cycle.

## 4. Coordinator prompt architecture

### 4.1 Static vs dynamic context

```text
Static (loaded once, shared across all cycles for a lane kind):
  ✓ coordinator policy rules (from knowledge pack)
  ✓ lane kind contract (implementation state machine)
  ✓ event vocabulary and meanings
  ✓ tier-specific decision guidance

Dynamic (constructed fresh per cycle):
  ✓ current lane_state
  ✓ triggering worker event
  ✓ active batch brief (if relevant)
  ✓ tracker summary projection (batches: done, active, pending, blocked)
  ✓ dependency graph snapshot (what's ready, what's blocked)
  ✓ current repository push/branch state
```

The static context is a versioned file in the knowledge pack. The dynamic
context is constructed by `wt coordinator context --tier=<N>` from live lane
state. The coordinator agent prompt is the concatenation, never hand-authored
per cycle.

### 4.2 Reference over inclusion

Briefs, tracker sections, roadmap positions, and worker reports are referenced
by path, not embedded in the coordinator prompt:

```text
Bad (current pattern):
  "Here is the full implementation brief for batch B07:
   [300 lines of committed brief]"

Good (proposed):
  "Batch B07 brief is at docs/spec/.../work-batches/B07.md.
   Summary: Implement route-group caching layer in awrux
   repo. Reasoning class R4. Primary + 2 integration repos.
   Read the brief if the reject finding concerns scope."
```

The coordinator agent reads files through tool calls only when its decision
requires detailed understanding of the brief or findings. The CLI constructs
a summary that is sufficient for the common cases (accept dispatch, simple
reject).

### 4.3 State file as coordinator memory

The durable state file (`coordinator-lane-state.txt`) and the
implementation-tracker together encode all history the coordinator needs:

```text
coordinator-lane-state.txt:
  lane_status=active
  active_batch=B22
  last_accept_at=2026-07-30T12:05:00Z
  last_reject_at=2026-07-30T11:30:00Z
  last_reject_batch=B21
  correction_count=3
  lane_started_at=2026-07-28T08:00:00Z

implementation-tracker.md (summary projection read by CLI):
  B01-B18: accepted
  B19: accepted (2026-07-30T10:00:00Z)
  B20: accepted (2026-07-30T11:00:00Z)
  B21: rejected (correction B21-R1 in progress)
  B22: active (implementer session present)
  B23-B30: pending
```

A Tier 1 coordinator only reads `active_batch` and `lane_status`. A Tier 3
coordinator reads the tracker summary and recent reject history. Neither loads
the full 200-line tracker with per-batch commentary unless the cycle demands it.

## 5. Watcher as mechanical event router

The watcher (`coordinator-watch.sh`) already polls state and events. In the
proposed model it gains tier-routing responsibility:

```text
coordinator-watch.sh loop:

  while true; do
    1. Poll worker-events.jsonl for new events since last-seen cursor
    2. Poll heartbeat files for worker sessions
    3. Poll coordinator-lane-state.txt for status changes

    4. Determine wake tier from event + state combination (see §3.3)

    5. if TIER 0:
         Handle mechanically (update heartbeat, log, re-emit WAKE)
         continue

    6. Construct decision envelope via `wt coordinator context --tier=N`

    7. Select model/endpoint for tier N from active allocation plan

    8. Invoke coordinator agent with envelope, bounded context limit

    9. Wait for agent to exit, then read resulting state changes

    10. Validate state changes against policy (mechanical post-check)

    11. Write updated state, tracker, events

    12. Sleep for configured interval
  done
```

The watcher never interprets agent output beyond checking that the state
transition is valid. If the agent produces an invalid transition (e.g., moving
to "complete" when unaccepted batches exist), the watcher rejects it and
escalates to the operator.

## 6. Allocation integration

The allocation plan (§10 of `allocation-planning-draft.md`) already separates
endpoints by capability class and role. The coordinator tier model extends this
naturally:

- Tier 0 needs no endpoint (mechanical).
- Tier 1 routes to the cheapest capable endpoint that passes project eligibility.
- Tier 2 routes to a medium-capability endpoint with review-quality reasoning.
- Tier 3 routes to the highest available frontier endpoint.

The coordinator itself becomes an allocation slot: the plan should include
explicit coordinator endpoint assignments (or a policy like "Tier 1 uses the
cheapest eligible endpoint, Tier 3 uses the assigned frontier endpoint").

This closes the loop: the allocation plan that routes implementation work also
routes the coordinator's own consumption. The coordinator does not independently
choose which model to think with.

## 7. Mechanical actions — detailed automation catalog

### 7.1 Actions that should be WT CLI subcommands

```
wt events tail --lane=<id> --since=<cursor>     Read new JSONL events
wt events latest --lane=<id> --batch=<B>         Latest event for batch
wt state get <key> --lane=<id>                   Read one state key
wt state set <key>=<value> --lane=<id>           Write one state key (validated)
wt batch next --lane=<id> --after=<batch-id>    Next ready batch from graph
wt batch launch <batch-id> --role=<role>         Construct and exec launch command
wt tracker summary --lane=<id>                   Project tracker to summary JSON
wt tracker mark <batch-id> <status>              Update batch status line
wt repo push --lane=<id> --batch=<B>             Push acceptance commits
wt repo verify-push --lane=<id> --batch=<B>      Verify push journal
wt session check --lane=<id> --role=<role>       Check tmux session exists
wt heartbeat write --lane=<id>                   Write watcher heartbeat
wt coordinator context --lane=<id> --tier=<N>    Construct decision envelope
```

### 7.2 Actions that remain shell-in-watcher

```
Poll worker-events.jsonl for new entries         (tail -c +cursor)
Check tmux session presence                      (tmux has-session)
Write heartbeat timestamp                        (date +%s > file)
Acquire/release lane lock                        (flock)
Compare manifest checksums                       (sha256sum)
```

### 7.3 What remains agent-executed

```
Classify reject reason from reviewer findings
Determine correction strategy (preserve/reassign)
Decide multi-repo partial-push acceptance
Answer operator tactical questions
Reconcile contradictory state
Select batch reordering when operator requests it
```

## 8. Safety properties

1. **Mechanical post-check**: After every agent decision cycle, the watcher
   validates that the resulting state transition is legal (e.g., cannot go
   from "active" + accepted B22 to "complete" if B23+ remain pending).

2. **Tier escalation guard**: If a Tier 1 agent produces output that doesn't
   match the expected deterministic shape, the watcher escalates to Tier 2
   or Tier 3 rather than silently applying it.

3. **State write atomicity**: All state changes from one coordinator cycle
   are written atomically. A partial write from a failed agent cycle is
   never visible to the next cycle.

4. **Model fallback**: If the allocation plan's assigned Tier 3 endpoint is
   unavailable, the watcher does not silently downgrade to a weaker model.
   It reports the situation and waits for operator intervention (or uses
   an explicit tier-fallback policy from the allocation plan).

5. **Cost guard**: If a Tier 3 cycle exceeds its hard token budget, the
   watcher terminates it, logs the budget exceedance, and escalates to the
   operator. It does not silently restart with a higher budget.

## 9. Migration from current coordinator model

This is a post-v1 change. The current single-session, single-model coordinator
continues to work in v1. The proposed model is an evolution, not a replacement
that must ship before v1.

Migration path:

1. Ship v1 with the current coordinator model (single session, knowledge-pack
   driven).
2. Implement WT CLI mechanical actions (`wt events`, `wt state`, `wt batch`,
   `wt tracker`, `wt session`, `wt coordinator context`).
3. Implement tiered watcher routing in `coordinator-watch.sh`.
4. Add coordinator tier assignments to the knowledge pack and allocation plan.
5. Run side-by-side: the current coordinator delegates mechanical actions to
   WT CLI while continuing to handle decisions. Operator reports confirm cost
   reduction.
6. Once stable, make tiered dispatch the default.

During migration, any step that has not been implemented falls through to the
current coordinator session, so no lane is blocked by a partially implemented
tier.

## 10. Open questions

1. **Session-per-decision vs persistent coordinator**: The proposed model uses
   short-lived decision agents. Some agent hosts (particularly Cursor and
   Claude desktop) may have per-session startup overhead that makes this
   expensive. Should there be a "persistent Tier 1 session" that handles
   multiple consecutive cheap cycles before exiting?

2. **Operator conversation routing**: Should the operator be able to "talk to"
   a specific tier, or should all operator messages route through a default
   tier with the ability to escalate? A Tier 3 session handling "what's the
   status of batch 14?" is wasteful.

3. **Context budget enforcement**: Can the CLI reliably enforce a context
   budget when the agent host (Codex/Cursor/Claude) controls how context is
   counted and billed? Should enforcement be soft (warn and report) rather
   than hard (refuse to invoke)?

4. **Tier assignment in knowledge pack**: Should tier-per-event mapping be
   in the knowledge pack (operator-editable policy) or hardcoded in the
   watcher? If the former, how do we prevent an operator from routing a
   complex accept through a cheap model?

5. **Cheap model minimum bar**: What is the minimum capability a model needs
   to safely handle Tier 1 dispatch? If a cheap model hallucinates the
   wrong batch ID, the watcher's post-check should catch it — but is the
   watcher's check comprehensive enough?

6. **Event vocabulary for coordinator transitions**: Should we add durable
   events for coordinator decisions (e.g., `coordinator-dispatched`,
   `coordinator-escalated`) so the coordinator's own actions are auditable
   alongside worker events?

## 11. Rejected alternatives

### Keep the current single-session, single-model coordinator

Rejected. Real-world evidence from a 30-batch lane shows cost pressure and
context inflation. As packs grow larger and lanes run longer, this will only
worsen. The spec already says "Watchtower is not the coordinator agent" —
if the coordinator burns frontier tokens on idle polling, the boundary is
incomplete.

### Move all coordinator logic into TypeScript

Rejected. The spec correctly separates coordinator policy from mechanical CLI.
Some decisions (reject classification, multi-repo acceptance judgment) genuinely
require agent reasoning. Moving these into deterministic TypeScript would
hardcode policy into CLI code, violating architectural decision A-006 ("Keep
coordinator policy in versioned knowledge pack").

### One model tier with dynamic effort (low/high)

Rejected. Model effort modes are about reasoning depth, not about whether
a task needs an agent at all. A frontier model on "low effort" is still
consuming frontier-priced tokens for mechanical work. The tier model separates
tasks by required capability class, not by effort knob.

### Compress coordinator context with summarization

Rejected as the primary strategy. Asking a model to summarize its own history
before each cycle is:
- Consuming tokens to reduce tokens (questionable net savings);
- Lossy in ways the operator cannot verify;
- Still requires loading the full context to summarize it.

Structured selective-loading (decision envelope) is cheaper and verifiable.

## 12. Relationship to existing spec documents

### v1-draft.md

The v1 spec already states (§1): "Watchtower is not the coordinator agent.
It does not interpret acceptance, triage rejects, select the next batch, or
create acceptance commits."

This discussion extends that boundary: the things Watchtower *should* do
mechanically (event polling, batch graph traversal, state file I/O, session
checks) and the things that genuinely require an agent (reject classification,
multi-repo acceptance reasoning, operator conversation).

### architecture.md

Architecture decision A-006: "Keep coordinator policy in versioned knowledge
pack — Prevent CLI behavior from forking agent decision rules."

The tier model preserves this: the knowledge pack defines tier-per-event
mappings, decision guidance, and state-machine transitions. The CLI enforces
context budgets and routes to the right tier. Policy is not duplicated.

### allocation-planning-draft.md

The allocation plan's lexicographic objective (§10) prioritizes capability
over cost. This discussion extends the same principle to the coordinator
itself: coordinator tasks that need frontier reasoning get it; tasks that
don't, don't. The allocation plan should include coordinator endpoint slots.

## 13. Recommended next steps

1. **Audit current coordinator playbook** from `implementation-lane-coordinator`
   to catalog every coordinator action and classify it by tier (using the
   taxonomy in §3.2).

2. **Implement Tier 0 first** (mechanical watcher polling, event tailing,
   heartbeat) — this moves the most frequent and least valuable token
   consumption off the coordinator immediately.

3. **Add `wt coordinator context` command** as part of M1 (read model) or M4
   (operate) — it is read-only and depends only on lane discovery + state
   parsing + tracker reading, all of which land in M1.

4. **Formalize the decision envelope schema** as a JSON contract, so the
   coordinator prompt construction is structured and testable.

5. **Run a comparison trial**: one lane with the current coordinator model,
   one with tiered dispatch, measuring token consumption per accepted batch.
