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
  "packIndex": {
    "packSealId": "seal-43dc",
    "manifestDigest": "sha256:...",
    "compilerVersion": "1.0.0"
  },
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

## 9. Pack index and bounded memory

### 9.1 Purpose and authority

Coordinator cost must not grow in proportion to the complete implementation
pack on every cycle. Watchtower compiles a deterministic local read index once
per sealed pack and uses bounded index queries for envelopes, projections, and
context requests.

The accepted pack and append-only journals remain authority. Static pack
indexes are:

- derived from `implementation-pack.json`, its lock file, canonical artifacts,
  and verified file digests;
- identified by `packSealId`, index schema, compiler version, and source
  digests;
- local under the lane's ignored coordinator directory;
- reproducible without a model;
- safe to delete and rebuild; and
- never a source of requirements, acceptance, architecture, or prose.

Runtime-memory indexes are separately derived from append-only worker,
coordinator, and effect journals. They record journal identity, byte length,
last event ID/offset, and checksum checkpoint. Appending runtime events never
invalidates the sealed-pack index.

A missing, stale, corrupt, or incompatible index blocks automated coordinator
cycles. Watchtower must not fall back to scanning or preloading the whole pack.

### 9.2 Index structure

```text
coordinator/index/
  pack/
    current.json
    <index-id>/
      index-manifest.json
      artifacts/<shard>/<key-hash>.json
      batches/<shard>/<key-hash>.json
      dependencies/<shard>/<batch-key-hash>.json
      requirements/<shard>/<key-hash>.json
      repository-claims/<repository>/<shard>.json
      proofs/<shard>/<key-hash>.json
  runtime/
    index-manifest.json
    events/<shard>/<key-hash>.json
    decisions/<shard>/<key-hash>.json
```

| Index | Required lookups |
|-------|------------------|
| Artifact | Logical role/path → repository, digest, bytes, headings, owning batch |
| Batch | Batch ID → title, briefs, reasoning/workload, requirements, repositories, proof classes |
| Dependency | Batch → direct parents/children; accepted/pending projection → ready candidates |
| Requirement | Requirement ID → work batches, review batches, proof references |
| Repository claim | Repository/path/ownership area → potentially conflicting batches |
| Proof | Proof class/environment → owning batches, commands/references, review evidence |
| Event (runtime) | Batch/role/type → latest journal offset and bounded conflict window |
| Decision (runtime) | Batch/cycle/trigger → latest proposal, effect, outcome, and correlation |

Indexes contain normalized references and mechanically extracted metadata, not
model-generated summaries. Human-authored titles and identifiers may be copied
with their source digest. Large prose remains at its canonical path.

The physical representation must support bounded direct lookup. A monolithic
JSON file that must be fully parsed for one batch or requirement query is not a
conforming v1 index. The default representation uses deterministic hash
sharding with maximum records/bytes per shard. An alternative representation
is allowed only when contract tests prove equivalent bounded lookup, immutable
identity, integrity verification, and rebuild behavior without adding a
database requirement.

### 9.3 Index manifest

```json
{
  "schemaVersion": 1,
  "compilerVersion": "1.0.0",
  "laneId": "9d0ee3d2-8833-4fb7-b112-8438f04f57d2",
  "packId": "route-groups-v2",
  "packSealId": "seal-43dc",
  "source": {
    "repository": "awrux",
    "path": "docs/spec/routing/route-groups/implementation/v2",
    "manifestDigest": "sha256:...",
    "lockDigest": "sha256:..."
  },
  "counts": {
    "artifacts": 84,
    "batches": 30,
    "dependencyEdges": 38,
    "requirements": 126,
    "repositoryClaims": 91
  },
  "indexes": {
    "batch": {
      "path": "batches",
      "semanticRoot": "sha256:..."
    },
    "dependency": {
      "path": "dependencies",
      "semanticRoot": "sha256:..."
    }
  },
  "builtAt": "2026-07-30T12:00:00Z"
}
```

`builtAt` is informational and excluded from semantic index identity. The same
pack bytes, compiler version, and index schema produce the same semantic index
identity and equivalent record bytes apart from fields explicitly declared
informational.

`current.json` is an atomic pointer containing only index ID, pack seal, schema,
compiler version, and manifest digest. Index directories are immutable after
publication. The watcher verifies a new index before pinning it for cycles;
read-only commands do not switch the pointer.

### 9.4 Query contract

The context broker exposes typed queries, never unrestricted full-index dumps:

```text
batch.get(batchId)
batch.artifacts(batchId, roles, limit)
dependency.neighborhood(batchId, direction, depth, nodeLimit)
dependency.ready(changedBatchIds)
requirement.lookup(requirementIds, limit)
claim.conflicts(repositoryId, paths, limit)
proof.forBatch(batchId, limit)
event.window(batchId, roles, eventLimit, byteLimit)
decision.latest(batchId, type)
artifact.section(ref, headingId, byteLimit)
```

Every query declares:

- maximum records;
- maximum graph depth and nodes when applicable;
- maximum returned bytes;
- estimated tokens for the selected endpoint when available;
- stable truncation order and continuation cursor;
- provenance and source digests; and
- whether truncation occurred.

The broker rejects an unbounded query. Truncation never silently implies
completeness; the coordinator must request a permitted next page or escalate.

### 9.5 Complexity and scaling requirements

Let:

- `F` be indexed pack artifacts;
- `B` be batches;
- `E` be dependency edges;
- `R` be requirement references; and
- `C` be repository/path claims.

The full deterministic build may be `O(F + B + E + R + C)` and occurs at init,
seal change, or explicit rebuild—not on every wake.

After build:

- direct batch/artifact/requirement lookup is expected `O(1)` or `O(log n)`;
- one direct lookup reads only the manifest/pointer and addressed bounded
  shard(s), never every index record;
- a dependency query is proportional to the returned bounded neighborhood;
- ready-set maintenance after an acceptance is proportional to the changed
  batch and affected outgoing edges, not all pack prose;
- latest-event lookup uses indexed offsets, not a full JSONL rescan;
- one routine envelope reads only bounded records for its trigger; and
- default envelope byte/token limits do not increase merely because unrelated
  batches or artifacts are added.

No v1 correctness guarantee depends on embeddings, vector search, an external
database, model summarization, or provider prompt caching. Implementations may
use safe caches, but authoritative lookup remains structured and reproducible.

### 9.6 Memory model

The coordinator has no private lane-lifetime conversational memory. Durable
memory consists of:

1. accepted pack and seal;
2. append-only worker/coordinator/effect events;
3. deterministic indexes;
4. derived current projections; and
5. explicit decision evidence references.

Per-cycle memory is the envelope plus brokered bounded context. Static policy
and immutable artifact content may use host prompt caching when available, but
cache hits are an optimization and never part of correctness or budget truth.

Decision rationale is not repeatedly copied into later prompts. Later cycles
load a prior decision only by typed lookup when it is relevant to the current
trigger.

### 9.7 Freshness and rebuild

Pack-index verification runs before routing:

- matching `packSealId`, manifest/lock digests, compiler version, and schema;
- every indexed path remains within its logical repository/pack root;
- every index digest matches;
- counts and cross-references are internally consistent; and
- static cross-references resolve against the sealed pack.

Runtime-index verification checks journal identity, checkpoint digest, byte
length, last event/offset, and append-only continuity. A runtime index may
incrementally consume verified appended records. Truncation, replacement, or
invalid continuity makes it stale and requires a deterministic rebuild from
the journal.

Pack drift marks the pack index stale before another cycle begins. Read-only
status may report stale details, but it cannot repair them. `index build`
requires an accepted sealed pack and writes to a staged directory before an
atomic switch. A semantic pack change requires normal pack revalidation and
resealing; index rebuild cannot legitimize drift.

### 9.8 Hard pack-size safety guarantee

For M0, D1, and ordinary D2 cycles:

- no complete-pack scan is permitted after a valid index exists;
- no complete tracker, roadmap, brief set, report set, or event journal is
  loaded into model context;
- unrelated pack growth cannot increase the default decision envelope;
- context queries remain within class and endpoint budgets; and
- stale/missing index state pauses automation instead of taking an expensive
  fallback path.

D3 may request a wider affected subgraph, but every request remains explicitly
bounded, metered, paginated, and auditable. “Complex” does not authorize loading
the full lane by default.

## 10. Context broker and budgets

### 10.1 Brokered context

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

### 10.2 Budget dimensions

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

## 11. Decision proposal

### 11.1 Schema

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

### 11.2 Proposal types

v1 proposal types are closed and versioned:

- `select-ready-batch`;
- `classify-reject`;
- `open-correction`;
- `select-correction-route`;
- `request-reroute`;
- `propose-reconciliation`;
- `escalate`.

Adding a proposal type requires a knowledge-policy update, validator, effect
mapping, fixtures, and spec update.

## 12. Validation and effect execution

### 12.1 Validation

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

### 12.2 Atomic effect plan

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

### 12.3 No raw mutation commands

The public CLI does not expose unrestricted commands such as
`wt state set <arbitrary-key>` or arbitrary tracker-line mutation. Those would
bypass transition policy. All mutations use bounded domain actions and the same
validator/effect executor as automated cycles.

## 13. Acceptance and publication

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

## 14. Watcher and queue model

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

## 15. Operator interaction

The complete v1 contract lives in
[operator-conversation-draft.md](operator-conversation-draft.md).

A conversation is a durable sequence of bounded advisory turns. Each turn uses
a versioned lane snapshot, bounded recent/pinned memory, per-turn routing, and a
typed response. It does not hold the lane mutation lock while a model runs.
Automated cycles continue unless an explicit scoped hold applies.

Conversation advice has no effect authority. Any proposed mutation requires
separate operator confirmation, current-state revalidation, and the normal
effect executor. Conversation continuity comes from Watchtower journals and
indexes, never a hidden provider session.

## 16. Endpoint routing and allocation

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
  },
  "conversationClasses": {
    "D1": {
      "primary": "codex-primary-high",
      "fallbacks": []
    },
    "D2": {
      "primary": "codex-primary-high",
      "fallbacks": []
    },
    "D3": {
      "primary": "codex-primary-high",
      "fallbacks": []
    }
  },
  "conversationBudgetPolicyRef": "context-policy.json#operatorConversation"
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

## 17. Filesystem contract

```text
<control-home>/.watchtower/lanes/<slug>/
  coordinator/
    routing-policy.json
    coordinator-routing.json
    context-policy.json
    index/
      pack/
        current.json
        <index-id>/
          index-manifest.json
          artifacts/
          batches/
          dependencies/
          requirements/
          repository-claims/
          proofs/
      runtime/
        index-manifest.json
        events/
        decisions/
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
    conversations/                     # operator-conversation-draft.md
    holds/                              # explicit scoped automation holds
```

The installed knowledge pack owns the canonical routing and transition policy.
`routing-policy.json` is a managed pinned projection with policy version and
digest. Routing, context, queue, cycle, journal, and projection artifacts are
local and ignored by Git.

Committed implementation-tracker prose remains project-owned. Automated
coordinator effects update the local generated tracker projection. A committed
tracker change requires an explicitly defined project-owned workflow; the
runtime must not mechanically rewrite arbitrary Markdown.

## 18. Durable coordinator events

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

## 19. CLI contract

| Command | Mutation | Purpose |
|---------|----------|---------|
| `wt coordinator index build [--runtime]` | Yes | Compile the sealed-pack index, or rebuild runtime indexes from append-only journals |
| `wt coordinator index status|verify` | No | Report freshness, digests, counts, compiler compatibility, and corruption |
| `wt coordinator index explain <batch-or-requirement>` | No | Show bounded index references and provenance without loading canonical prose |
| `wt coordinator status` | No | Show queue, active cycle, routing, budget, and last outcome |
| `wt coordinator context --class=<D1\|D2\|D3> --trigger=<event-id>` | No | Preview the decision envelope and size estimates |
| `wt coordinator explain [--cycle=<id>]` | No | Explain routing rule, guards, endpoint, proposal, and effect result |
| `wt coordinator cycle --trigger=<event-id> [--dry-run]` | Yes unless dry-run | Route and process one idempotent cycle |
| `wt coordinator escalate [--cycle=<id>] --reason=<text>` | Yes | Open an attention conversation and any policy-required safety hold |
| `wt coordinator ask|chat` | Journal only | Run one bounded advisory turn or an interactive sequence |
| `wt coordinator conversation ...` | Varies | Inspect/manage history, lifecycle, pins, compaction, and proposed effects |
| `wt coordinator hold place|release|list` | Varies | Manage explicit scoped automation holds |
| `wt events tail [--since=<cursor>]` | No | Read validated durable events |
| `wt events latest [--batch=<id>]` | No | Show latest relevant event projection |
| `wt batch ready` | No | Calculate ready candidates and blocking reasons |

Internal bounded runtime actions may launch a declared batch role, apply a
transition, or attempt publication. They are not exposed as arbitrary state or
shell mutation commands.

All mutating commands support stable idempotency keys internally. Human and
`--json` output derive from the same contracts.

## 20. Failure semantics

| Code | Meaning |
|------|---------|
| `COORDINATOR_TRIGGER_INVALID` | Trigger is malformed, stale, duplicate, or incompatible |
| `COORDINATOR_POLICY_MISMATCH` | Installed policy, runtime, and envelope versions disagree |
| `COORDINATOR_INDEX_MISSING` | Required compiled pack index does not exist |
| `COORDINATOR_INDEX_STALE` | Pack seal/source digest does not match the installed index |
| `COORDINATOR_INDEX_INVALID` | Index schema, digest, path, count, or cross-reference failed |
| `COORDINATOR_QUERY_UNBOUNDED` | Context/index request lacks an admitted record, depth, byte, or token limit |
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

## 21. Safety properties

- Exactly one effect authority exists for a lane.
- Agents cannot directly mutate authoritative files or execute arbitrary
  coordinator effects.
- Operator-conversation responses are advisory; unconfirmed proposals produce
  no effects.
- Model-backed conversation turns never hold the lane mutation lock.
- Conversation existence never pauses automation; only an explicit scoped hold
  may block declared future effects.
- Worker/reviewer/operator prose is untrusted evidence, never policy.
- Pack indexes are derived, seal-bound, model-free, and never requirement or
  acceptance authority.
- Missing/stale/corrupt indexes pause automation; no full-pack fallback exists.
- Every index and context query is bounded, paginated, and provenance-bearing.
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

## 22. Delivery strategy

Coordinator automation is required for v1, but delivery is staged:

1. audit every imported coordinator action as M0, D1, D2, or D3;
2. implement deterministic pack indexes and bounded query contracts;
3. implement durable read projections, ready-set calculation, and envelopes;
4. implement decision proposal validators and effect planning;
5. run decision and effect calculation in shadow fixtures with no mutation;
6. implement atomic lane-local effects and external-effect journals;
7. enable short-lived D1–D3 cycles;
8. remove lane-lifetime coordinator-session authority; and
9. run replay, scale, and real-lane acceptance trials.

This is implementation sequencing, not a product compatibility mode. Watchtower
starts new lanes only; it does not import old coordinator lanes. A created lane
uses one declared coordinator mode and never falls through between competing
authorities because a feature is missing.

## 23. Testing strategy

### 23.1 Deterministic fixtures

- no-event poll uses M0 and zero agent invocation;
- pack-index output is deterministic for fixed pack bytes/compiler/schema;
- stale, corrupt, missing, and path-escaping indexes block cycles;
- unrelated batches do not enter a bounded batch query or envelope;
- unique ready batch produces a stable preauthorized effect;
- multiple ready batches without priority require a decision;
- invalid and duplicate worker events do not advance the cursor;
- model/provider names never determine decision class;
- the same normalized inputs produce the same envelope digest and route;
- unauthorized context references are denied and recorded; and
- untrusted report prose cannot alter permitted proposal types.

### 23.2 Proposal and effect fixtures

- every proposal type has valid, invalid, stale, and illegal-transition cases;
- an agent cannot request arbitrary shell/state changes;
- interrupted local effect is all-or-nothing;
- uncertain tmux launch and Git push recover through journals;
- concurrent cycles cannot both mutate one lane;
- reviewer ACCEPT remains durable through partial publication;
- correction preserves reviewer independence; and
- route loss pauses rather than downgrades.

### 23.3 Cost and quality proof

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

### 23.4 Pack-size scaling proof

Generate sealed fixtures with the same active batch and affected dependency
neighborhood at 30, 300, 3,000, and 10,000 batches. After one index build:

- M0/D1/ordinary-D2 envelope bytes and estimated tokens remain within the same
  configured bound;
- unrelated batch growth adds no broker records to the cycle;
- ready-set updates inspect only affected dependency edges;
- latest-event lookup does not rescan the full journal;
- query truncation and continuation are stable;
- index verification detects any source/seal drift; and
- no model is invoked to build, verify, or query the index.

Build time/storage may grow linearly with pack structure. Per-cycle model input
must not grow linearly with total pack size.

## 24. v1 acceptance criteria

- [ ] Idle polling, heartbeat, event filtering, session checks, and ready-set
      calculation invoke no model.
- [ ] Each judgment cycle uses a fresh bounded decision envelope.
- [ ] Every cycle references a valid deterministic pack index matching the
      active `packSealId` and runtime indexes matching journal checkpoints.
- [ ] Missing, stale, corrupt, or incompatible indexes block automation rather
      than causing complete-pack scanning or prompt loading.
- [ ] Index queries enforce record, graph-depth/node, byte, and token-estimate
      limits with explicit pagination/truncation.
- [ ] One direct lookup reads bounded addressable shards; no conforming
      implementation parses a monolithic full-pack index per query.
- [ ] Routine coordinator input depends on the affected batch and bounded
      neighborhood, not total pack size.
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
- [ ] Multi-turn operator conversation follows the bounded advisory-turn,
      journal, budget, hold, and confirmed-effect contract.
- [ ] Conversation response generation never holds the lane mutation lock.
- [ ] Coordinator decisions and context requests are durable events.
- [ ] A long-lane replay demonstrates material cost reduction without degraded
      transition correctness or review quality.

## 25. Decisions fixed by this draft

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
| Pack memory | Deterministic seal-bound local indexes plus bounded queries |
| Pack-size failure | Pause on unavailable index; never full-pack fallback |
| Scaling | One linear structural build; routine model context bounded independently of unrelated pack growth |
| Ready batches | Mechanical ready set; selection only when preauthorized or decided |
| Acceptance | Reviewer semantic authority, distinct from publication |
| Operator chat | Durable conversation composed of bounded advisory turns |
| Conversation effects | Separate confirmation plus current-state validation |
| Conversation concurrency | Automation continues unless explicit scoped hold |
| Allocation | Coordinator decision classes are explicit endpoint roles with reserves |
| Failure | Pause/escalate rather than guess, coerce, or downgrade |
| Legacy | No adopt, fallback, or mixed coordinator authority |

## 26. Open questions

1. Which host adapters can enforce typed output and broker-only context without
   exposing unrestricted filesystem tools?
2. Which concrete v1 endpoint capability classes map to D1–D3?
3. What measured default budget ranges should ship after replay trials?
4. Which external effects beyond tmux launch and Git push require explicit
   prepare/attempt/verify adapters?
5. Should safe operator cancellation terminate an invoked decision agent, or
   only supersede its unapplied proposal?
