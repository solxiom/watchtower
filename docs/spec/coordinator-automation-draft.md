# Watchtower v1 Coordinator Automation

Status: **Draft**
Target release: `1.0.0`
CLI group: `wt coordinator`
Last updated: 2026-07-30

This document is normative for the Watchtower v1 coordinator execution model.
It resolves the cost and automation questions raised in
[discussions/coordinator-cost-and-automation.md](discussions/coordinator-cost-and-automation.md).

Watchtower is not the coordinator agent. It is the deterministic decision
router, context broker, validator, and effect executor around short-lived
coordinator decision agents.

## 1. Product statement

The inherited coordinator uses one long-running agent session for polling,
shell work, routine dispatch, semantic triage, and rare complex judgments.
That makes context and high-capability model usage grow with lane length.

Watchtower v1 separates the work:

```text
durable event or operator request
  → mechanical observation and routing
  → no-model effect when uniquely preauthorized
     or bounded coordinator decision cycle when judgment is required
  → typed decision proposal
  → deterministic validation
  → atomic effect application
  → durable decision/effect events
```

The coordinator becomes a role fulfilled by bounded decision invocations. It
does not remain one cumulative lane-lifetime conversation.

## 2. Goals and non-goals

### 2.1 Goals

1. Spend no model tokens on polling, heartbeat, parsing, graph calculation,
   session checks, template rendering, or uniquely preauthorized transitions.
2. Match every judgment cycle to a minimum capability class without silently
   downgrading difficult decisions.
3. Construct a narrow, reproducible context envelope for each decision.
4. Keep coordinator policy in the versioned knowledge pack.
5. Require agents to return typed decision proposals rather than mutating lane
   state directly.
6. Validate and apply permitted effects atomically and idempotently.
7. Make coordinator decisions, context expansion, escalation, and effects
   auditable through durable events.
8. Separate operator conversations from automated decision context.
9. Bound coordinator tokens, cost, latency, and cycle count by decision class
   and lane.
10. Preserve reviewer acceptance authority and multi-repository commit sets.

### 2.2 Non-goals

- Encoding semantic reject or acceptance judgment in TypeScript.
- Allowing an agent to write authoritative state, tracker, reservation, or push
  records directly.
- Treating a worker's prose or tmux output as trusted instructions.
- Running a model merely to generate deterministic launch prose.
- Reinterpreting reviewer acceptance because publication failed.
- Choosing among several valid ready batches without committed priority or a
  coordinator decision.
- Automatically lowering a decision's minimum capability to save cost.
- Supporting imported copied-template lanes or mixed legacy/new authority.
- Providing a generic workflow engine or arbitrary executable policy hooks.

## 3. Vocabulary

| Term | Definition |
|------|------------|
| Coordinator cycle | One bounded request → proposal → validation → effect attempt |
| Trigger | Durable event or operator request that opens a cycle |
| Decision class | Minimum reasoning category selected by deterministic policy |
| Decision envelope | Immutable, bounded input assembled for one cycle |
| Context broker | Read-only interface for approved incremental context |
| Decision proposal | Typed agent output requesting one permitted transition or escalation |
| Effect plan | Deterministic mutation plan derived from a valid proposal |
| Effect executor | Watchtower/runtime component that atomically applies the effect plan |
| Ready set | Pending batches whose dependencies and hard dispatch constraints pass |
| Preauthorized transition | Unique effect fully determined by accepted pack, active allocation/routing, and knowledge policy |
| Decision journal | Append-only coordinator cycle, proposal, validation, and effect events |
| Effect authority | The one component permitted to commit a cycle's state changes |

## 4. Authority model

| Question | Authority |
|----------|-----------|
| What work and dependencies exist? | Accepted implementation pack |
| Is implementation work semantically accepted? | Reviewer ACCEPT plus verified per-repository commit set |
| Which pending batches are structurally ready? | Deterministic projection from pack, events, repository claims, and active routing |
| Which ready batch should run when several remain valid? | Accepted priority policy or coordinator decision |
| Which decision class does a trigger require? | Versioned coordinator-routing policy plus hard escalation guards |
| Which endpoint may handle the class? | Active allocation plan or v1 coordinator routing plan |
| What should happen in an ambiguous case? | Validated coordinator decision proposal |
| What state mutation is legal? | Lane state-machine contract in the knowledge pack |
| Who applies state and external effects? | Watchtower effect executor through declared runtime actions |
| What happened? | Append-only worker, coordinator, and effect events |

Push state is publication state, not acceptance authority. A partial push
creates recovery work but does not revoke a valid reviewer acceptance.

## 5. Mechanical-versus-judgment boundary

### 5.1 Mechanical work

Watchtower or the shell runtime performs:

- cursor-based worker-event polling and schema validation;
- heartbeat and tmux session observation;
- latest-event and per-batch projection;
- pack DAG validation and ready-set calculation;
- repository/path/worktree conflict checks;
- active endpoint/reservation lookup;
- prompt-envelope rendering from structured inputs;
- launch argv and controlled environment construction;
- legal-transition and proposal-schema validation;
- atomic lane-state projection;
- generated local tracker projection;
- accepted-commit verification;
- Git push attempt and per-repository push-journal verification; and
- durable event and usage-ledger writes.

Mechanical does not mean automatically permitted. A side effect still requires
a preauthorized transition or valid decision proposal, current preconditions,
the lane lock, and idempotency checks.

### 5.2 Agent judgment

A coordinator decision agent handles:

- semantic reject classification;
- correction strategy when more than one valid route exists;
- ambiguous preserve-session versus reassignment choice;
- operator-requested priority changes;
- contradictory evidence or state reconciliation proposals;
- source/pack drift requiring scope judgment;
- conflict between batches or repository outcomes;
- complex publication recovery strategy; and
- tactical operator questions not answerable from deterministic projections.

The agent proposes. It never applies.

### 5.3 Ready set versus next batch

Watchtower calculates a ready set:

```text
pending batch
  + every dependency accepted
  + pack baseline still admissible
  + repository/worktree claims non-conflicting
  + required endpoint route active
  + required capacity reserved
  = ready candidate
```

If the set has one member, or the accepted pack contains a total priority rule
that selects one member, dispatch may be preauthorized. If multiple candidates
remain equally valid, selection is a coordinator decision. Watchtower must not
use filesystem order, batch-name sorting, or implementation accident as policy.

## 6. Decision classes

Decision classes describe required judgment, not provider price or model name.

| Class | Model use | Typical work |
|-------|-----------|--------------|
| `M0` | None | Polling, projections, ready set, unique preauthorized dispatch, state/effect validation |
| `D1` | Bounded routine judgment | Ambiguous handoff, simple operator routing request, non-semantic clarification |
| `D2` | Semantic judgment | Reject classification, correction selection, dependency impact assessment |
| `D3` | Complex judgment | Cross-repository conflict, pack drift, contradictory state, complex operator escalation |

Rules:

1. M0 is always preferred when the effect is uniquely provable.
2. A model is never invoked solely to fill a template or restate a known fact.
3. The routing policy declares a minimum capability for D1–D3.
4. Operator policy may escalate a class but cannot downgrade below the
   knowledge-pack minimum.
5. An invalid, uncertain, or out-of-schema result escalates; it is never
   coerced into a lower-risk shape.
6. “Frontier,” “medium,” “cheap,” and “free” may describe endpoint economics,
   but they are not normative decision classes.

## 7. Routing policy

The knowledge pack contains a signed/versioned machine-readable routing policy.
It maps trigger plus guard facts to a decision class and permitted proposal
types.

Illustrative rules:

| Trigger and guards | Class |
|--------------------|-------|
| No new durable event | `M0` |
| Session/heartbeat observation changed | `M0` |
| Reviewer ACCEPT; commit set valid; push not attempted | `M0` |
| Accepted batch exposes one preauthorized next candidate | `M0` |
| Several ready candidates without total priority | `D1` or higher by pack criticality |
| Worker BLOCKED with one declared dependency route | `M0` |
| Worker BLOCKED with ambiguous cause/owner | `D2` |
| Reviewer REJECT | `D2` minimum |
| Repeated reject above policy threshold | `D3` |
| Pack/source drift with semantic scope impact | `D3` |
| State contradiction or unauthorized effect evidence | `D3` plus operator attention |
| Status query answerable from projections | `M0` |
| Tactical operator question requiring interpretation | `D1`–`D3` from guards |

Event name alone is insufficient. Guards include repository count, criticality,
correction count, conflicting events, pack drift, commit verification, routing
availability, and whether one legal effect is uniquely determined.

Every routing result records the matched rule, guard inputs, selected class,
minimum capability, and escalation reason.

## 8. Coordinator decision envelope

### 8.1 Envelope contract

The CLI constructs one immutable JSON envelope:

```json
{
  "schemaVersion": 1,
  "cycleId": "cc-01J4Y8A9P5",
  "laneId": "9d0ee3d2-8833-4fb7-b112-8438f04f57d2",
  "initiativeId": "sql-backends-v1",
  "decisionClass": "D2",
  "routingRuleId": "reviewer-reject-v1",
  "policyVersion": "1.0.0",
  "trigger": {
    "eventId": "evt-772",
    "event": "reject",
    "batchId": "B21"
  },
  "laneProjection": {
    "status": "active",
    "activeBatch": "B21",
    "accepted": ["B01", "B02"],
    "ready": [],
    "blocked": ["B22"]
  },
  "batch": {
    "id": "B21",
    "briefRef": {
      "repository": "nirvana",
      "path": "docs/spec/example/implementation/v1/work-batches/B21.md",
      "digest": "sha256:..."
    },
    "reasoningClass": "R4",
    "repositories": ["nirvana"]
  },
  "findingRefs": [
    {
      "repository": "nirvana",
      "path": "docs/spec/example/implementation/v1/review-batches/B21.md",
      "digest": "sha256:..."
    }
  ],
  "permittedProposalTypes": [
    "classify-reject",
    "escalate"
  ],
  "budget": {
    "inputSoft": 16000,
    "inputHard": 32000,
    "outputHard": 4000,
    "unit": "estimated-tokens"
  },
  "createdAt": "2026-07-30T12:00:00Z"
}
```

The semantic envelope is deterministic for the same authoritative inputs.
`createdAt` and cycle ID are operational metadata and excluded from its
semantic digest.

### 8.2 Default included context

Include only:

- lane and active-batch projection;
- triggering durable event;
- affected batch summary and canonical references;
- latest relevant events for the conflict window;
- ready/blocked projection;
- per-repository acceptance/publication summary when relevant;
- applicable policy rule identifiers;
- permitted proposal types; and
- cycle budget.

Do not preload:

- prior coordinator conversations;
- every batch brief;
- full worker-event history;
- full Markdown tracker or roadmap;
- entire worker/reviewer reports;
- unrelated repository status;
- credentials or endpoint configuration; or
- allocation details beyond the selected endpoint's non-secret launch contract.

### 8.3 Untrusted content

Worker reports, reviewer prose, repository files, and operator-supplied text are
untrusted data. Envelopes label and delimit them as evidence, never as policy
instructions. Only the installed knowledge pack defines coordinator rules.

## 9. Context broker and budgets

### 9.1 Brokered context

A decision agent requests additional context by typed reference:

```text
batch-brief
review-finding
recent-events
repository-state
tracker-projection
dependency-neighborhood
policy-fragment
push-journal
```

The broker:

1. verifies the reference is permitted for the cycle;
2. resolves logical repository paths safely;
3. verifies expected digests when present;
4. applies redaction and size limits;
5. records a `coordinator-context-requested` event;
6. returns content with provenance; and
7. debits the cycle context budget.

The agent does not receive unrestricted filesystem tools for authoritative
coordinator context. A host that cannot enforce the broker boundary cannot run
unattended decision cycles.

### 9.2 Budget dimensions

Budget policy separates:

- estimated and host-reported input tokens;
- broker-loaded context;
- output tokens;
- monetary or subscription quota;
- wall-clock latency;
- context-request count;
- retry/escalation count;
- cumulative coordinator usage per batch; and
- cumulative coordinator usage per lane.

Numeric class defaults are configurable policy because tokenizers, hosts, and
models differ. The knowledge pack defines relative bounds and minimum required
content; endpoint-specific allocation resolves concrete limits.

The CLI can enforce bytes and its declared token estimate before invocation.
Host-internal billing is `reported`, `estimated`, or `unknown`, never presented
as an exact CLI-enforced fact when the host does not expose it.

At a soft limit, the cycle warns and requires justification for more context.
At a hard limit, no further broker context is returned and the agent must
propose a bounded result or escalation. Watchtower does not kill a process in a
way that could leave an external side effect ambiguous.

## 10. Decision proposal

### 10.1 Schema

The agent emits one JSON value:

```json
{
  "schemaVersion": 1,
  "cycleId": "cc-01J4Y8A9P5",
  "proposalId": "cp-01J4Y8BC2F",
  "type": "classify-reject",
  "decision": {
    "classification": "MISSED_REQUIREMENT",
    "findingIds": ["R-B21-1"],
    "strategy": "preserve-session-correction",
    "targetBatch": "B21"
  },
  "evidenceRefs": [
    "event:evt-772",
    "finding:R-B21-1"
  ],
  "rationale": "The accepted behavior named by requirement RG-14 is absent.",
  "requestedEffects": [
    {
      "effect": "open-correction",
      "batchId": "B21",
      "preserveSession": true
    }
  ]
}
```

Proposals contain references and bounded rationale. They contain no shell
commands, arbitrary paths, environment maps, credentials, or direct state-file
edits.

### 10.2 Proposal types

v1 proposal types are closed and versioned:

- `select-ready-batch`;
- `classify-reject`;
- `open-correction`;
- `select-correction-route`;
- `request-reroute`;
- `propose-reconciliation`;
- `answer-operator`;
- `escalate`.

Adding a proposal type requires a knowledge-policy update, validator, effect
mapping, fixtures, and spec update.

## 11. Validation and effect execution

### 11.1 Validation

Before any effect, Watchtower proves:

- cycle and proposal schemas/version compatibility;
- proposal type was permitted by the envelope;
- trigger and referenced evidence still match;
- pack seal and relevant file digests have not drifted;
- lane state has not changed since envelope creation;
- proposed transition is legal;
- target batch is pending/active as required;
- dependencies and claims still pass;
- selected endpoint/reservation remains active;
- reviewer independence is not weakened;
- acceptance commit set remains reviewer-owned and verifiable;
- requested effects map only to declared runtime actions; and
- idempotency key has not already committed an equivalent effect.

A failed proposal is recorded and may route to escalation. It is never partially
applied or repaired by guessing agent intent.

### 11.2 Atomic effect plan

The executor converts a valid proposal into a previewable effect plan:

```text
precondition reads
  → lane-local state projection
  → generated local tracker projection
  → coordinator/worker event append
  → runtime launch or Git publication action
  → effect result and usage journal
```

Lane-local mutations commit atomically under the lane lock. External effects
such as tmux launch and Git push cannot join a filesystem transaction, so they
use prepare/attempt/verify journal states and idempotency keys. Recovery reads
the journal rather than repeating an unknown effect.

### 11.3 No raw mutation commands

The public CLI does not expose unrestricted commands such as
`wt state set <arbitrary-key>` or arbitrary tracker-line mutation. Those would
bypass transition policy. All mutations use bounded domain actions and the same
validator/effect executor as automated cycles.

## 12. Acceptance and publication

Reviewer ACCEPT is authoritative only after Watchtower verifies:

- event role and session;
- expected review batch;
- complete per-repository acceptance commit set;
- commit existence and ancestry;
- permitted repository IDs; and
- pack-defined proof/independence metadata.

After verification, acceptance is durable even if publication fails.

```text
review accepted
  → acceptance recorded
  → push prepared
  → each repository attempted and verified
      ├── all published
      └── partial publication → recovery required
```

Partial publication is never described as partial semantic acceptance.
Complex judgment may propose retry order, operator escalation, or a replacement
publication route, but cannot discard reviewer acceptance without a separate
authorized invalidation process.

## 13. Watcher and queue model

The persistent watcher is a zero-token event router. It:

1. tails durable events from a stored cursor;
2. deduplicates by event ID and correlation ID;
3. derives trigger facts and routing class;
4. handles M0 observations and preauthorized effects;
5. enqueues judgment cycles;
6. invokes one selected decision endpoint with a bounded envelope;
7. validates the proposal;
8. asks the effect executor to apply it;
9. records usage and outcome; and
10. advances the cursor only after durable handling.

One lane has one active mutating coordinator cycle. Read-only status and
context inspection may run concurrently. New triggers are queued with stable
ordering; safety/operator escalation may supersede routine work but must record
the supersession.

Interrupted cycles are recoverable from their journal state:

```text
requested → routed → invoked → proposed → validated
  → effect-prepared → effect-attempted → effect-verified → complete
```

No stage is inferred from tmux prose.

## 14. Operator interaction

Operator requests are classified before model invocation:

- status, ready-set, budget, session, and publication queries use M0
  projections;
- explicit safe commands use bounded domain actions;
- tactical interpretation opens D1–D3 according to routing guards; and
- policy or scope changes require explicit operator authorization and their own
  durable event.

Operator conversation uses a separate short-lived cycle and never joins the
next automated coordinator context. A pending safety escalation may interrupt
routine routing; ordinary questions do not silently cancel a mutating cycle.

## 15. Endpoint routing and allocation

Coordinator decision classes are allocation roles. An active structured
allocation plan should assign primary/fallback endpoint pools and reserves for
D1–D3. M0 has no endpoint.

Until the complete allocation-planning command group is active, v1 accepts a
validated local `coordinator-routing.json` generated during init from explicit
operator input. It uses the same endpoint IDs and minimum-capability contract,
contains no credentials, and cannot route below knowledge-policy minimums.

```json
{
  "schemaVersion": 1,
  "endpoints": [
    {
      "endpointId": "codex-primary-high",
      "hostId": "local",
      "osUser": "operator",
      "adapterId": "codex-cli",
      "provider": "openai",
      "accountId": "primary",
      "model": "configured-model",
      "effort": "high",
      "capabilityClass": "C5"
    }
  ],
  "classes": {
    "D1": {
      "minimumCapability": "C2",
      "primary": "codex-primary-high",
      "fallbacks": []
    },
    "D2": {
      "minimumCapability": "C3",
      "primary": "codex-primary-high",
      "fallbacks": []
    },
    "D3": {
      "minimumCapability": "C5",
      "primary": "codex-primary-high",
      "fallbacks": []
    }
  }
}
```

The v1 file declares endpoints through installed host adapters, not arbitrary
executable paths or shell fragments. Account IDs are non-secret local aliases.
The operator may use separate endpoints for each class; the one-endpoint
example demonstrates shape, not a recommended cost plan.

The coordinator does not choose its own model. If no eligible endpoint meets a
required class, the cycle pauses and reports `coordinator-route-unavailable`.
It never silently downgrades.

Budgets reserve:

- expected routine decision cycles;
- reject/correction triage;
- re-review coordination;
- at least one complex escalation when policy requires; and
- operator conversation separately.

## 16. Filesystem contract

```text
<control-home>/.watchtower/lanes/<slug>/
  coordinator/
    routing-policy.json
    coordinator-routing.json
    context-policy.json
    queue.json
    cursor.json
    cycles/
      <cycle-id>/
        envelope.json
        context-requests.jsonl
        proposal.json
        validation.json
        effect-plan.json
        outcome.json
    journal/
      coordinator-events.jsonl
      effect-events.jsonl
      usage-ledger.jsonl
    projections/
      lane-state.json
      batch-status.json
      ready-set.json
      publication-status.json
      tracker-summary.md
```

The installed knowledge pack owns the canonical routing and transition policy.
`routing-policy.json` is a managed pinned projection with policy version and
digest. Routing, context, queue, cycle, journal, and projection artifacts are
local and ignored by Git.

Committed implementation-tracker prose remains project-owned. Automated
coordinator effects update the local generated tracker projection. A committed
tracker change requires an explicitly defined project-owned workflow; the
runtime must not mechanically rewrite arbitrary Markdown.

## 17. Durable coordinator events

| Event | Meaning |
|-------|---------|
| `coordinator-cycle-requested` | Trigger accepted and cycle ID created |
| `coordinator-routed` | Routing rule, guards, class, and endpoint selected |
| `coordinator-context-requested` | Broker returned named additional context |
| `coordinator-proposal-received` | Typed proposal bytes recorded |
| `coordinator-proposal-rejected` | Validation failed with reason codes |
| `coordinator-escalated` | Higher decision class/operator attention requested |
| `coordinator-effect-prepared` | Idempotent bounded effect plan journaled |
| `coordinator-effect-attempted` | Local/external effect execution started |
| `coordinator-effect-verified` | Effect result verified against postconditions |
| `coordinator-cycle-complete` | Cycle ended with outcome and usage |
| `coordinator-route-unavailable` | No endpoint met the minimum capability |
| `publication-partial` | Acceptance is durable but some repository pushes remain |

Every record has schema version, event ID, time, lane ID, cycle/correlation ID,
producer, policy version, and relevant artifact digests.

## 18. CLI contract

| Command | Mutation | Purpose |
|---------|----------|---------|
| `wt coordinator status` | No | Show queue, active cycle, routing, budget, and last outcome |
| `wt coordinator context --class=<D1\|D2\|D3> --trigger=<event-id>` | No | Preview the decision envelope and size estimates |
| `wt coordinator explain [--cycle=<id>]` | No | Explain routing rule, guards, endpoint, proposal, and effect result |
| `wt coordinator cycle --trigger=<event-id> [--dry-run]` | Yes unless dry-run | Route and process one idempotent cycle |
| `wt coordinator escalate [--cycle=<id>] --reason=<text>` | Yes | Record explicit operator escalation |
| `wt events tail [--since=<cursor>]` | No | Read validated durable events |
| `wt events latest [--batch=<id>]` | No | Show latest relevant event projection |
| `wt batch ready` | No | Calculate ready candidates and blocking reasons |

Internal bounded runtime actions may launch a declared batch role, apply a
transition, or attempt publication. They are not exposed as arbitrary state or
shell mutation commands.

All mutating commands support stable idempotency keys internally. Human and
`--json` output derive from the same contracts.

## 19. Failure semantics

| Code | Meaning |
|------|---------|
| `COORDINATOR_TRIGGER_INVALID` | Trigger is malformed, stale, duplicate, or incompatible |
| `COORDINATOR_POLICY_MISMATCH` | Installed policy, runtime, and envelope versions disagree |
| `COORDINATOR_CONTEXT_LIMIT` | Requested context exceeds the admitted cycle budget |
| `COORDINATOR_ROUTE_UNAVAILABLE` | No endpoint meets minimum decision capability |
| `COORDINATOR_OUTPUT_INVALID` | Agent output is not one permitted proposal |
| `COORDINATOR_PROPOSAL_STALE` | State/evidence changed after envelope creation |
| `COORDINATOR_TRANSITION_ILLEGAL` | Proposal violates state-machine policy |
| `COORDINATOR_EFFECT_CONFLICT` | Lock, claim, reservation, or idempotency conflict |
| `COORDINATOR_EFFECT_UNCERTAIN` | External effect started but postcondition is unknown |
| `COORDINATOR_ESCALATION_REQUIRED` | Safe automated progress requires higher judgment/operator input |

Failures do not advance the worker-event cursor past an unhandled trigger.
Retry uses the same cycle/effect identity when safe; otherwise a superseding
cycle explicitly references the prior one.

## 20. Safety properties

- Exactly one effect authority exists for a lane.
- Agents cannot directly mutate authoritative files or execute arbitrary
  coordinator effects.
- Worker/reviewer/operator prose is untrusted evidence, never policy.
- Every automatic effect is uniquely preauthorized or backed by a valid typed
  proposal.
- Every transition is revalidated against current state immediately before
  commit.
- Reviewer independence and acceptance commit ownership cannot be weakened by
  coordinator routing.
- Capability can escalate automatically according to policy but cannot
  silently downgrade.
- External effects have prepare/attempt/verify recovery journals.
- Event cursors, cycles, proposals, and effects are idempotent.
- Read-only context/status commands never repair or advance state.
- No old copied-template lane is discovered or given fallback authority.
- Secrets never enter envelopes, proposals, journals, or routing output.

## 21. Delivery strategy

Coordinator automation is required for v1, but delivery is staged:

1. audit every imported coordinator action as M0, D1, D2, or D3;
2. implement durable read projections, ready-set calculation, and envelopes;
3. implement decision proposal validators and effect planning;
4. run decision and effect calculation in shadow fixtures with no mutation;
5. implement atomic lane-local effects and external-effect journals;
6. enable short-lived D1–D3 cycles;
7. remove lane-lifetime coordinator-session authority; and
8. run replay and real-lane acceptance trials.

This is implementation sequencing, not a product compatibility mode. Watchtower
starts new lanes only; it does not import old coordinator lanes. A created lane
uses one declared coordinator mode and never falls through between competing
authorities because a feature is missing.

## 22. Testing strategy

### 22.1 Deterministic fixtures

- no-event poll uses M0 and zero agent invocation;
- unique ready batch produces a stable preauthorized effect;
- multiple ready batches without priority require a decision;
- invalid and duplicate worker events do not advance the cursor;
- model/provider names never determine decision class;
- the same normalized inputs produce the same envelope digest and route;
- unauthorized context references are denied and recorded; and
- untrusted report prose cannot alter permitted proposal types.

### 22.2 Proposal and effect fixtures

- every proposal type has valid, invalid, stale, and illegal-transition cases;
- an agent cannot request arbitrary shell/state changes;
- interrupted local effect is all-or-nothing;
- uncertain tmux launch and Git push recover through journals;
- concurrent cycles cannot both mutate one lane;
- reviewer ACCEPT remains durable through partial publication;
- correction preserves reviewer independence; and
- route loss pauses rather than downgrades.

### 22.3 Cost and quality proof

Replay a representative long lane through:

- inherited lane-lifetime coordinator baseline; and
- v1 M0/D1/D2/D3 routing.

Measure:

- coordinator input/output/context-request tokens by telemetry quality;
- model invocations and cost per accepted batch;
- percentage of triggers completed at M0;
- escalations, invalid proposals, retries, and latency;
- incorrect transition attempts caught by validation;
- reject/correction outcomes; and
- operator interventions.

The v1 model must reduce routine coordinator consumption materially without
increasing invalid transitions, lost acceptance state, reviewer-independence
violations, or unresolved corrections. Token savings alone cannot accept it.

## 23. v1 acceptance criteria

- [ ] Idle polling, heartbeat, event filtering, session checks, and ready-set
      calculation invoke no model.
- [ ] Each judgment cycle uses a fresh bounded decision envelope.
- [ ] Decision class derives from versioned policy plus guard facts, not model
      name or event name alone.
- [ ] Operator policy can escalate but cannot lower the minimum capability.
- [ ] Context expansion is brokered, metered, allowlisted, and auditable.
- [ ] Coordinator agents return typed proposals and cannot directly mutate
      authoritative state.
- [ ] Proposal validation and effect application use current preconditions.
- [ ] Lane-local effects are atomic; external effects use
      prepare/attempt/verify journals.
- [ ] Ready-set calculation distinguishes candidate derivation from selection.
- [ ] Reviewer acceptance remains distinct from Git publication.
- [ ] One lane has exactly one effect authority and one active mutating cycle.
- [ ] Coordinator routing has explicit primary/fallback endpoints and reserves.
- [ ] No capable route produces a pause, never silent downgrade.
- [ ] Status queries use deterministic projections when possible.
- [ ] Coordinator decisions and context requests are durable events.
- [ ] A long-lane replay demonstrates material cost reduction without degraded
      transition correctness or review quality.

## 24. Decisions fixed by this draft

| Decision | Outcome |
|----------|---------|
| Release | Required Watchtower v1 behavior |
| Coordinator lifetime | Short-lived decision cycles, not one cumulative lane session |
| Zero-token work | M0 mechanical routing and effects |
| Judgment classes | D1 bounded, D2 semantic, D3 complex |
| Tier semantics | Minimum capability, not price/model-name tiers |
| Routing authority | Versioned knowledge-pack policy with hard escalation guards |
| Agent output | Typed proposal only |
| Mutation authority | Watchtower validated effect executor |
| State history | Append-only decision/effect journal with derived projections |
| Context | Narrow envelope plus metered typed broker |
| Ready batches | Mechanical ready set; selection only when preauthorized or decided |
| Acceptance | Reviewer semantic authority, distinct from publication |
| Operator chat | Separate bounded cycle |
| Allocation | Coordinator decision classes are explicit endpoint roles with reserves |
| Failure | Pause/escalate rather than guess, coerce, or downgrade |
| Legacy | No adopt, fallback, or mixed coordinator authority |

## 25. Open questions

1. Which host adapters can enforce typed output and broker-only context without
   exposing unrestricted filesystem tools?
2. Which concrete v1 endpoint capability classes map to D1–D3?
3. What measured default budget ranges should ship after replay trials?
4. Which external effects beyond tmux launch and Git push require explicit
   prepare/attempt/verify adapters?
5. Should safe operator cancellation terminate an invoked decision agent, or
   only supersede its unapplied proposal?
