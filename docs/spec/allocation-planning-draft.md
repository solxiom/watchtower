# Watchtower Implementation Allocation Planning

Status: **Draft**
Target horizon: post-v1, after pack design
CLI group: `wt allocation`
Last updated: 2026-07-30

This document specifies the phase between an accepted, sealed implementation
pack and implementation dispatch. It converts provider-neutral batch
requirements into a feasible, budget-aware plan for the models, accounts,
execution hosts, and operating-system users available to the operator at that
time.

This draft depends on the lane and repository model in
[architecture.md](architecture.md) and the pack contract in
[pack-design-draft.md](pack-design-draft.md).

## 1. Product statement

Implementation allocation planning answers:

> Given this accepted implementation pack, current endpoint capacity, account
> limits, repository permissions, and operator budget, who should implement and
> review each batch without weakening required quality?

The phase starts after an implementation lane is initialized from an accepted,
sealed pack. It ends when a reviewed allocation plan is activated and its
capacity reservations are recorded.

```text
accepted + sealed implementation pack
  → implementation lane: allocation-required
  → authorized capability discovery
  → inventory diff and operator approval
  → project eligibility checks
  → point-in-time capacity snapshot
  → feasibility and optimization
  → allocation review
  → activation and reservations
  → implementation dispatch enabled
```

Allocation planning is part of the implementation-lane lifecycle, not a third
lane kind. Its inputs are already owned by one implementation lane; its
decisions are machine-local, time-sensitive, and expected to be recomputed.
A separate lane would create identity and handoff overhead without a separate
committed product artifact.

## 2. Why this phase is necessary

An implementation pack can correctly say that a batch needs high reasoning,
large context, independent review, or provider diversity without knowing:

- which models are installed or permitted today;
- which provider accounts have remaining quota;
- which Unix user owns each CLI login;
- when usage windows reset;
- which endpoints can access the required worktrees;
- how many assignments may run concurrently;
- how much token or monetary budget remains;
- which capacity is already reserved by another active lane; or
- whether a preferred endpoint is currently unavailable.

Resolving these facts during each launch is late, inconsistent, and prone to
spending high-capability capacity on low-value work. A durable local plan makes
the trade-offs reviewable before implementation starts.

## 3. Goals and non-goals

### 3.1 Goals

1. Prove that every required implementation and review role has at least one
   permitted, sufficiently capable endpoint.
2. Discover underused CLIs, plans, accounts, and models across explicitly
   authorized local execution users.
3. Protect the pack's minimum reasoning, context, proof, and independence
   requirements as hard constraints.
4. Allocate scarce high-capability capacity to the batches where it matters
   most.
5. Minimize expected token, quota, and monetary consumption after quality and
   feasibility are satisfied.
6. Reserve capacity for correction and re-review instead of consuming the
   entire budget on first-pass implementation.
7. Prevent multiple active lanes from double-booking the same local account
   capacity.
8. Keep credentials and machine-specific account identities out of committed
   implementation packs.
9. Explain every assignment, fallback, exclusion, downgrade refusal, and
   infeasibility result.
10. Support safe replanning when capacity or execution reality changes.
11. Work across any number of lane repository bindings and local worktrees.

### 3.2 Non-goals

- Provisioning, authenticating, purchasing, or refreshing provider accounts.
- Circumventing provider limits, terms, billing controls, or account policy.
- Pooling credentials or exposing one user's authentication material to
  another user.
- Predicting exact provider quota when no trustworthy telemetry exists.
- Choosing product architecture or weakening an accepted implementation pack.
- Ranking individual people or agents by token consumption.
- Migrating a running assignment between sessions automatically.
- Treating the cheapest model as the default objective.
- Replacing the implementation coordinator's dispatch and correction policy.
- Storing endpoint credentials, API keys, access tokens, cookies, or complete
  provider CLI configuration.

## 4. Vocabulary

| Term | Definition |
|------|------------|
| Capability requirement | Provider-neutral minimum declared by a pack for one assignment role. |
| Endpoint | One executable combination of provider, provider account, host adapter/CLI, OS user, model, and effort mode. |
| Tool adapter | Provider-neutral Watchtower integration that detects and safely interrogates one CLI family. |
| Plan route | A provider account entitlement such as a subscription tier, free pool, or metered route exposed through a CLI. |
| Model catalog | Time-bounded set of models and declared capabilities visible through one plan route. |
| Inventory proposal | Discovered additions, changes, removals, and uncertainty awaiting operator approval. |
| Endpoint inventory | Local declarations of endpoints and relatively stable capabilities or permissions. |
| Project eligibility | Lane-specific result of checking an endpoint against repository, worktree, runtime, and required-tool access. |
| Capacity snapshot | Time-bounded observation of availability, limits, reset windows, and confidence for eligible endpoints. |
| Assignment slot | One batch role to allocate, such as implementation, review, correction, or re-review. |
| Allocation candidate | Endpoint that satisfies an assignment slot's hard constraints. |
| Allocation plan | Versioned local mapping from assignment slots to primary and fallback endpoints with estimates and rationale. |
| Reservation | Lane-owned claim against finite endpoint capacity for a stated time or usage envelope. |
| Activation | Atomic validation and reservation step that makes a plan dispatchable. |
| Replan | New plan revision for pending work after material capacity or scope change. |
| Telemetry quality | Provenance class describing how trustworthy a usage or capacity value is. |
| Preserve-session route | Correction assignment routed back to the original implementation session when still safe and capable. |

An account is not an endpoint. One account may expose several models, effort
modes, or CLIs; each eligible combination is a separate endpoint. An OS user
is not an account. It identifies the local execution and permission boundary
through which an account-backed CLI is invoked.

## 5. Authority and ownership

| Question | Authority |
|----------|-----------|
| What quality and reasoning does a batch require? | Accepted implementation pack |
| Which repositories and paths may it touch? | Pack claims plus lane repository bindings |
| Which endpoints and plan routes are approved? | Local endpoint inventory and approval journal |
| What may an approved endpoint access for this lane? | Lane-specific project-eligibility evidence |
| What capacity is available now? | Named capacity snapshot with telemetry quality |
| What capacity is already promised? | Global local reservation ledger |
| Which endpoint should perform a pending slot? | Active allocation-plan revision |
| Which session owns an active assignment? | Durable implementation-lane assignment event |
| Is a plan acceptable? | Allocation reviewer or permitted operator approval |
| Did an assignment consume capacity? | Usage ledger, qualified by telemetry quality |

The committed pack declares requirements and suggested capability classes. It
must not name personal Unix users, local account aliases, credentials, or
machine paths. The allocation plan may refer to local endpoint IDs but remains
inside the ignored lane overlay.

Watchtower may validate hard constraints and calculate candidates. It must not
silently lower a pack requirement, fabricate availability, or infer precise
remaining quota from an unknown source.

## 6. Position in the implementation lifecycle

### 6.1 States

```text
ALLOCATION_REQUIRED
  → DISCOVERY
  → INVENTORY_PROPOSED
  → INVENTORY_READY
  → PROJECT_ELIGIBILITY
  → CAPACITY_SNAPSHOTTED
  → FEASIBILITY
      ├── INFEASIBLE
      └── ALLOCATION_DRAFT
            → ALLOCATION_REVIEW
                ├── ALLOCATION_CORRECTION → ALLOCATION_REVIEW
                └── ALLOCATION_READY
                      → ALLOCATION_ACTIVATED
                      → IMPLEMENTATION_ACTIVE

Pending work + material change → REPLAN_REQUIRED → CAPACITY_SNAPSHOTTED
Any pre-activation state → PAUSED
```

An unexpired approved inventory may satisfy discovery without a new probe when
policy permits. A stale catalog, requested adapter refresh, unknown required
capability, or changed executable forces the discovery/proposal path.

| State | Meaning |
|-------|---------|
| `allocation-required` | Lane exists, but no implementation assignment may start |
| `discovery` | Approved tool adapters are probing explicitly authorized execution users |
| `inventory-proposed` | Discovery diff exists and awaits operator approval or rejection |
| `inventory-ready` | Approved endpoint inventory and model catalogs are structurally valid |
| `project-eligibility` | Approved endpoints are being checked against this lane's repositories, worktrees, runtime, and tools |
| `capacity-snapshotted` | A named, unexpired capacity snapshot exists |
| `feasibility` | Hard constraints and candidate sets are being evaluated |
| `infeasible` | At least one required slot has no feasible plan under current constraints |
| `allocation-draft` | A complete proposed mapping and reserve model exists |
| `allocation-review` | Plan is locked for semantic review |
| `allocation-correction` | Numbered findings are being resolved |
| `allocation-ready` | Review accepted the plan, but capacity is not yet reserved |
| `allocation-activated` | Snapshot was revalidated and reservations were written atomically |
| `implementation-active` | Coordinator may dispatch assignments according to the active plan |
| `replan-required` | Pending assignments cannot safely continue under the active plan |
| `paused` | Operator stopped planning or dispatch |

`infeasible` is a valid and useful result. It must report the unsatisfied
constraints and nearest rejected candidates. It must not create a hidden
downgrade.

### 6.2 Gates

| Gate | Required outcome | Failure route |
|------|------------------|---------------|
| A0 — Pack readiness | Pack is accepted, sealed, structurally valid, and baseline drift is classified | Pack correction or rebaseline |
| A1 — Discovery | Every probe used an approved adapter, host, execution user, and non-secret method | Correct authorization or adapter |
| A2 — Inventory approval | Discovery diff is explicitly accepted; endpoint, route, pool, and model identities validate | Approve, reject, or correct proposal |
| A3 — Project eligibility | Required runtime, repository, worktree, proof, and tool access is verified for candidate endpoints | Correct bindings/permissions |
| A4 — Snapshot | Capacity facts have provenance, capture time, expiry, and required dimensions | Refresh or operator-supplied bounds |
| A5 — Feasibility | Every mandatory slot has an eligible primary route and required fallback policy | `infeasible` |
| A6 — Budget | Base plan plus mandatory reserves fits hard token, quota, money, concurrency, and window limits | `infeasible` or explicit policy change |
| A7 — Independence | Review and acceptance separation satisfies pack policy | Reallocate |
| A8 — Plan review | Reviewer issues ACCEPT, or small-plan operator approval is permitted by policy | `allocation-correction` |
| A9 — Activation | Snapshot is fresh, permissions still pass, and reservations do not conflict | Refresh/replan |

No implementation worker starts before A9.

## 7. Inputs

### 7.1 Implementation-pack inputs

For each batch and role, allocation consumes:

- batch ID, dependency edges, parallel group, and criticality;
- primary and participating repositories;
- read/write/path claims and proof environments;
- implementation and review reasoning classes;
- workload and context-envelope classes;
- required tools or host features;
- reviewer independence rules;
- provider-diversity requirements or preferences;
- correction and re-review expectations;
- expected preserve-session policy; and
- pack-level quality floors and budget guidance.

It also consumes the installed v1 coordinator policy's D1–D3 minimum
capability, context, tool, fallback, and reserve requirements. Coordinator M0
is mechanical and consumes no endpoint.

Pack suggestions are not local endpoint assignments. A suggestion such as
“frontier reasoning, independent frontier review” remains portable. The local
plan decides which currently available endpoints meet it.

### 7.2 Operator policy

Operator policy may constrain:

- hard and soft token budgets;
- monetary budget;
- provider subscription/message quota;
- concurrency by endpoint, account, provider, OS user, repository, or lane;
- reset windows and scheduling horizon;
- minimum correction and re-review reserve;
- permitted providers, models, CLIs, users, and accounts;
- data-residency or repository-access restrictions;
- required provider diversity;
- whether small plans may use operator approval;
- staleness tolerance; and
- how unknown capacity may be admitted.

A policy override must be explicit, scoped, timestamped, and accompanied by a
rationale. An override may change operator policy; it cannot alter the accepted
pack's minimum capability requirement.

### 7.3 Endpoint inventory

The inventory describes relatively stable local facts:

```json
{
  "schemaVersion": 1,
  "tools": [
    {
      "toolId": "codex-local-kavan",
      "hostId": "local-ubuntu",
      "osUser": "kavan",
      "adapterId": "codex-cli",
      "executable": "/opt/watchtower-tools/codex",
      "version": "1.x"
    }
  ],
  "routes": [
    {
      "routeId": "openai-codex-kavan-plan",
      "toolId": "codex-local-kavan",
      "provider": "openai",
      "accountId": "codex-kavan",
      "planLabel": "subscription",
      "chargingClass": "subscription",
      "capacityPoolIds": ["openai-codex-kavan"]
    }
  ],
  "capacityPools": [
    {
      "capacityPoolId": "openai-codex-kavan",
      "dimensions": ["tokens", "messages", "concurrency"]
    }
  ],
  "catalogRefs": [
    {
      "catalogId": "codex-plan-20260730",
      "routeId": "openai-codex-kavan-plan",
      "path": "catalogs/codex-openai-codex-kavan-plan-20260730.json"
    }
  ],
  "endpoints": [
    {
      "endpointId": "codex-kavan-frontier-high",
      "toolId": "codex-local-kavan",
      "routeId": "openai-codex-kavan-plan",
      "capacityPoolId": "openai-codex-kavan",
      "catalogId": "codex-plan-20260730",
      "catalogEntryId": "frontier",
      "model": "frontier",
      "effort": "high",
      "capabilities": {
        "reasoningClass": "R5",
        "contextClass": "large",
        "roles": ["implementation", "review", "correction"],
        "evidence": "operator-approved"
      },
      "concurrency": 1,
      "enabled": true
    }
  ]
}
```

Rules:

- `endpointId` is an opaque local identifier and must not contain a secret.
- `accountId` is an opaque alias, not a username, email, credential, or token.
- `capacityPoolId` groups endpoint aliases that consume the same finite quota.
- `hostId` identifies the execution host without embedding a network secret.
- `toolId`, `routeId`, catalog, pool, and endpoint references must resolve
  without reconstructing identity from display names.
- capability claims identify the declaration source and last verification.
- project repository permission is not global inventory; it is deny-by-default
  until a lane-specific eligibility check passes.
- executable discovery never sources another user's shell startup files merely
  to inspect credentials.
- inventory validation may confirm CLI presence and non-secret identity, but
  authentication probes require an adapter designed not to print secrets.
- the same provider account exposed through two adapters remains one capacity
  pool unless explicitly proven independent.

### 7.4 Capacity snapshot

A capacity snapshot freezes the facts used for one planning calculation:

```json
{
  "schemaVersion": 1,
  "snapshotId": "cap-20260730T120000Z-a31f",
  "capturedAt": "2026-07-30T12:00:00Z",
  "validUntil": "2026-07-30T13:00:00Z",
  "endpoints": [
    {
      "endpointId": "codex-kavan-frontier-high",
      "availability": "available",
      "remaining": {
        "tokens": 350000,
        "messages": null,
        "money": null
      },
      "resetAt": "2026-07-31T00:00:00Z",
      "telemetryQuality": {
        "tokens": "estimated",
        "messages": "unknown",
        "availability": "reported"
      }
    }
  ],
  "reservationLedgerRevision": 17
}
```

Every measured field uses one provenance class:

| Class | Meaning |
|-------|---------|
| `reported` | Returned by a provider or adapter through a documented interface |
| `operator-supplied` | Explicit limit or observation entered by the operator |
| `estimated` | Derived from local history or a declared heuristic |
| `unknown` | No defensible value is available |

Zero and unknown are different. Unknown capacity may be used only when policy
defines a conservative admissible bound or the operator explicitly accepts the
uncertainty. A snapshot must record its reservation-ledger revision so
activation can detect intervening bookings.

## 8. Capability discovery and endpoint onboarding

### 8.1 Discovery boundary

Discovery finds usable execution surfaces; it does not search the whole machine
for credentials. Its scope is the Cartesian product of:

- explicitly authorized hosts;
- explicitly authorized OS execution users;
- installed and trusted tool adapters; and
- operator-permitted project roots.

Watchtower must never enumerate `/home`, credential stores, browser profiles,
or arbitrary shell history to guess accounts. It does not elevate privileges or
invent a `sudo` route. Cross-user probes run only through an operator-configured
execution transport that has already been authorized and passes `wt doctor`.
Adapters use explicit executable paths and controlled environment variables;
they do not source interactive shell startup files as a discovery strategy.

Discovery is global first and lane-specific second:

1. global discovery identifies CLIs, provider routes, plans, model catalogs,
   capability evidence, and shared capacity pools;
2. the operator reviews an inventory diff;
3. lane discovery tests the approved endpoints against the current project's
   repositories, worktrees, runtime, proof tools, and policy; and
4. capacity snapshotting measures only the endpoints eligible for that lane.

This avoids rescanning every account for every project while preventing a
globally installed endpoint from being assumed usable in every repository.

### 8.2 Resource hierarchy

Discovery preserves the real hierarchy instead of flattening every advertised
model into an independent account:

```text
Host
  └── OS execution user
        └── CLI / agent harness
              └── provider account alias
                    └── plan route
                          └── shared capacity pool
                                └── model
                                      └── effort/configuration
                                            └── project-eligible endpoint
```

A CLI or agent harness supplies execution behavior. A provider plan supplies
entitlements. A capacity pool represents the quota shared by one or more
models. A model and effort combination supplies capability. Project eligibility
supplies the final permission boundary.

For example, an OpenCode installation may expose several approved provider
routes and models, while a Hermes installation may expose a different local or
remote catalog. These are adapter fixtures, not hardcoded product assumptions:
the actual Go, Zen, free, subscription, Qwen, Kimi, DeepSeek, or other catalog
visible to an operator is discovered at that time and recorded with provenance
and expiry. Watchtower must not ship a timeless list claiming that a plan or
model is still available.

### 8.3 Tool-adapter contract

Each supported CLI family has a versioned adapter. An adapter may implement:

| Operation | Output |
|-----------|--------|
| `detect` | Executable path, version, host, execution user, and adapter compatibility |
| `routes` | Non-secret account aliases, provider routes, plan labels, and charging classes |
| `models` | Currently visible model IDs, configurations, catalog source, and expiry |
| `capabilities` | Reported facts plus evidence-backed or operator-approved capability mapping |
| `capacity` | Non-consuming quota, reset, availability, and concurrency observations |
| `projectCheck` | Repository, worktree, runtime, proof-tool, and required-feature access |
| `launchDescriptor` | Non-secret runtime data needed to invoke an approved endpoint |
| `redact` | Adapter-specific removal of account and authentication material from observations |

Every operation declares whether it is:

- read-only and non-consuming;
- potentially quota-consuming;
- interactive;
- supported for unattended use; and
- capable of returning secrets before redaction.

Automatic discovery invokes only read-only, non-consuming, non-interactive
operations that cannot intentionally return credentials. Any other probe
requires separate operator confirmation. Watchtower does not scrape unstable
human help or terminal UI output as authoritative catalog data when the adapter
cannot parse it safely.

Provider-specific behavior remains behind adapters. Core inventory, capability,
planning, and reservation contracts stay provider-neutral. A new CLI such as
Hermes or OpenCode becomes compatible by supplying this adapter contract; it
does not require a new lane kind or planner.

#### Compatibility tiers

Watchtower reports one support tier per tool/route:

| Tier | Contract |
|------|----------|
| `discovered` | Adapter safely detects routes, catalogs, capability evidence, capacity, project access, and launch data |
| `catalog-declared` | Operator supplies routes/models/capabilities; adapter verifies executable, access, and launch data |
| `launch-only` | Operator supplies one endpoint and capability profile; no automatic catalog or capacity claim |
| `unsupported` | Safe invocation or secret boundary cannot be established |

The declarative tiers use validated data fields and an argv launch descriptor;
they are not arbitrary shell-hook execution. Unknown or private CLIs can
therefore participate conservatively before a full adapter exists. Status and
planning explanations must expose the tier so a manually declared endpoint is
never presented as fully discovered.

### 8.4 Discovery proposal and approval

Discovery writes an immutable proposal containing:

- adapter and executable additions, upgrades, removals, or failures;
- newly observed or missing account/plan routes;
- model additions, removals, aliases, or capability changes;
- capacity-pool relationships;
- catalog source and freshness;
- charging class such as `free-entitlement`, `subscription`, `metered`, or
  `unknown`;
- changed uncertainty or telemetry quality;
- project eligibility results; and
- warnings that require operator judgment.

The proposal is a four-way diff against the approved inventory:

| Diff | Default handling |
|------|------------------|
| Added | Disabled until approved |
| Changed | Existing approved record remains active; changed record awaits approval |
| Missing | Marked stale; not deleted automatically |
| Security-sensitive | Quarantined and excluded until explicitly resolved |

Approval may accept the entire proposal or selected records. It records
operator identity, time, proposal digest, accepted records, rejected records,
and rationale for overrides. Approval never approves credentials because
credentials are outside the proposal.

Removing or disabling an endpoint with active reservations is blocked unless
the affected lanes are paused or replanned. Read-only inventory commands never
approve, remove, or repair records.

### 8.5 Model and agent capability profiles

Model names and prices are not capability rankings. Each endpoint profile keeps
separate dimensions such as:

- reasoning class and confidence;
- effective context class;
- code understanding and editing;
- shell/tool calling;
- structured output reliability;
- session resume and correction continuity;
- repository-scale navigation;
- MCP, web, browser, image, or other required modalities;
- subagent or parallel-task support supplied by the harness;
- implementation, review, architecture, research, documentation, and
  mechanical-work suitability;
- latency and concurrency;
- charging class and quota behavior; and
- known restrictions.

Each claim records one of:

| Evidence | Meaning |
|----------|---------|
| `adapter-reported` | Tool/provider returned a documented capability |
| `watchtower-verified` | A versioned, non-destructive capability check passed |
| `operator-approved` | Operator accepted a local mapping or benchmark |
| `estimated` | Heuristic mapping with named estimator and uncertainty |
| `unknown` | No acceptable evidence |

Marketing tier, “free,” “flash,” “pro,” release recency, parameter count, and
price alone cannot raise a reasoning class. Conversely, a free endpoint is not
treated as low quality merely because it is free. The planner considers its
evidenced capability first and its cost class later.

Capability profiles are versioned by adapter, route, model, effort, and
catalog observation. A material model alias or provider-side behavior change
stales the old profile instead of silently inheriting it.

### 8.6 Project eligibility checks

An approved global endpoint is projected into the current lane only after
checking:

- control-home and runtime-store traversal;
- each repository binding and declared read/write mode;
- dedicated-worktree and branch access;
- required build, test, browser, MCP, or proof tools;
- network or data-residency policy;
- host feature requirements;
- safe launch as the declared OS user; and
- ability to write only the endpoint's allowed output locations.

The result records `eligible`, `ineligible`, or `unknown` per requirement with
evidence and expiry. It never mutates source or consumes provider capacity.
When a necessary proof cannot be non-destructive, the operator supplies or
approves the result.

### 8.7 Coverage and underuse analysis

The discovery report helps the operator understand unused capabilities without
turning usage into a target. It reports:

- `coverage-gap` — a pack requirement has no capable endpoint;
- `single-route-risk` — important work depends on one account, provider, host,
  or user;
- `unused-capable-route` — an approved endpoint satisfies pending work but is
  absent from every candidate plan;
- `free-capable-opportunity` — a free-entitlement endpoint satisfies a slot
  without weakening quality or reserves;
- `shared-pool-overcount` — several models were incorrectly treated as
  independent capacity;
- `stale-catalog` — advertised availability or capability needs refresh; and
- `permission-gap` — a capable endpoint cannot safely access required project
  resources.

These are planning observations, not mandates. Watchtower does not assign work
merely to “use every agent,” maximize plan consumption, or equalize token
spend. Some endpoints should remain unused because they add switching cost,
share the same quota, lack independent review value, or are weaker for the
current pack.

## 9. Endpoint eligibility

An endpoint is eligible for a slot only when all hard constraints pass:

1. endpoint is enabled and available;
2. role is supported;
3. reasoning and context capability meet or exceed the pack minimum;
4. required host/tool features exist;
5. OS user can traverse the control home, runtime store, and required
   worktrees;
6. repository access meets each read/write claim;
7. provider/account/model policy permits the assignment;
8. concurrency and reset-window bounds can accommodate it;
9. reviewer independence rules are satisfied;
10. no active reservation makes the capacity unavailable; and
11. required proof commands and environments are accessible.

Capability comparisons are based on declared classes, not model-name ordering.
Watchtower must not assume that a newer, more expensive, or differently named
model satisfies a class without a capability mapping.

For each rejected candidate, validation records a stable reason code. Human
output may summarize these reasons, while JSON output exposes them all.

## 10. Allocation objective

Planning uses a lexicographic objective. A lower-priority preference cannot
trade away a higher-priority requirement:

1. satisfy all hard quality, access, and pack constraints;
2. satisfy reviewer independence;
3. fit hard capacity, budget, concurrency, and reset-window limits;
4. reserve correction and re-review capacity;
5. protect critical-path and highest-reasoning batches;
6. minimize expected tokens, quota consumption, and monetary cost;
7. balance load across accounts and providers where useful;
8. minimize provider, adapter, account, and context handoffs;
9. maximize safe parallelism consistent with repository/worktree claims; and
10. prefer plans with higher-quality telemetry and stronger fallbacks.

The planner must be deterministic for the same normalized pack, policy,
inventory, snapshot, and reservation revision. Ties are broken by stable
endpoint ID, never filesystem iteration order.

The initial design may use a deterministic rules engine rather than a general
optimization solver. The output contract and hard/soft distinction must not
depend on the chosen algorithm.

## 11. Reserve model

The plan separates:

- first-pass implementation;
- first-pass review;
- expected correction;
- expected re-review;
- coordination/context overhead; and
- contingency.

Default reserve percentages are policy, not universal facts. A recommended
starting posture is:

| Reserve | Suggested starting range |
|---------|--------------------------|
| Correction plus re-review | 20–30% of implementation/review estimate |
| Coordination/context overhead | 5–10% |
| Uncertainty contingency | 10–20%, increased for estimated/unknown telemetry |

Critical batches may require dedicated fallback capacity. Unused reserve is
released when its protected work is accepted or the operator explicitly
reclaims it. The planner must not make reserve disappear merely to produce a
feasible-looking first-pass plan.

## 12. Allocation-plan contract

### 12.1 Structured plan

`allocation-plan.json` is the execution authority:

```json
{
  "schemaVersion": 1,
  "planId": "alloc-7d06b5c1",
  "revision": 3,
  "laneId": "9d0ee3d2-8833-4fb7-b112-8438f04f57d2",
  "packSealId": "seal-43dc",
  "snapshotId": "cap-20260730T120000Z-a31f",
  "policyDigest": "sha256:...",
  "status": "ready",
  "assignments": [
    {
      "slotId": "B07:implementation",
      "batchId": "B07",
      "role": "implementation",
      "primary": {
        "endpointId": "codex-kavan-frontier-high",
        "model": "frontier",
        "effort": "high"
      },
      "fallbacks": [
        {
          "endpointId": "claude-kavan2-capable",
          "condition": "primary-unavailable"
        }
      ],
      "estimate": {
        "inputTokens": 70000,
        "outputTokens": 18000,
        "quality": "estimated"
      },
      "reserveIds": ["reserve-B07-correction"],
      "rationaleCodes": ["MEETS_R5", "CRITICAL_PATH", "BEST_CONTEXT_REUSE"]
    },
    {
      "slotId": "B07:review",
      "batchId": "B07",
      "role": "review",
      "primary": {
        "endpointId": "claude-kavan2-capable",
        "model": "capable",
        "effort": "high"
      },
      "fallbacks": [],
      "estimate": {
        "inputTokens": 42000,
        "outputTokens": 10000,
        "quality": "estimated"
      },
      "reserveIds": ["reserve-B07-rereview"],
      "rationaleCodes": ["INDEPENDENT_ACCOUNT", "PROVIDER_DIVERSITY"]
    }
  ],
  "reserves": [
    {
      "reserveId": "reserve-B07-correction",
      "endpointId": "codex-kavan-frontier-high",
      "purpose": "correction",
      "tokens": 22000
    }
  ],
  "createdAt": "2026-07-30T12:05:00Z"
}
```

The real schema must use explicit units and nullable values. It must not encode
an unavailable dimension as zero. Model and effort are repeated in the plan so
dispatch does not depend on mutable inventory defaults.

### 12.2 Human plan

`allocation-plan.md` is generated from the same plan contract and includes:

- assumptions and snapshot expiry;
- budget summary by dimension and telemetry quality;
- assignment table;
- critical-path and highest-reasoning protection;
- reviewer independence and provider-diversity analysis;
- fallback and reserve coverage;
- unknowns, exclusions, and infeasibility risks;
- safe parallel groups and repository contention; and
- explanation of estimated savings against the declared baseline.

The Markdown view is not a second authority and must not be hand-edited to
change assignments.

### 12.3 Correction routing

Correction should return to the original implementation session when:

- the session is still available and trustworthy;
- the reviewer did not require reassignment;
- endpoint capability remains sufficient;
- capacity and permissions remain valid; and
- preserving context is expected to reduce cost or error.

Otherwise the active plan's correction fallback is used. The preserve-session
decision is recorded; it is not inferred solely from a tmux session name.
Re-review remains independent of the correction implementer.

### 12.4 Coordinator decision routing

Coordinator decision classes from
[coordinator-automation-draft.md](coordinator-automation-draft.md) are dynamic
allocation slots:

- `coordinator:D1`;
- `coordinator:D2`;
- `coordinator:D3`; and
- `coordinator:operator-conversation:D1`;
- `coordinator:operator-conversation:D2`;
- `coordinator:operator-conversation:D3`; and
- escalation and conversation-compaction reserves.

The plan assigns an eligible primary endpoint pool, explicit fallbacks, context
budget, concurrency, and usage reserve for each class. It need not predict
every cycle or bind one endpoint for the entire lane. Selection occurs when a
cycle opens against the active snapshot and reservations.

Operator conversation follows
[operator-conversation-draft.md](operator-conversation-draft.md). Each turn is
routed independently; endpoint continuity is a preference only. Conversation
reserves are distinct from automated reject/recovery capacity. Compaction,
forking, or opening a new conversation does not reset lane-wide usage or
replenish reservations.

M0 never receives an endpoint. The coordinator router cannot choose its own
model, use an implementation worker's session accidentally, or downgrade below
the knowledge-policy minimum. When no capable route exists, coordinator
dispatch pauses and reports infeasibility.

The complete allocation feature supersedes the v1 manually supplied
`coordinator-routing.json` by generating the same routing contract. Migration
requires explicit validation/activation and never occurs as a runtime upgrade.

## 13. Filesystem contract

### 13.1 Global local capacity state

```text
<watchtower-data-root>/
  capacity/
    discovery-policy.json
    inventory/
      endpoints.json
      catalogs/
        <adapter>-<route>-<catalog-id>.json
      proposals/
        <proposal-id>.json
      approvals.jsonl
    snapshots/
      <snapshot-id>.json
    reservations.json
```

`discovery-policy.json` allowlists hosts, OS users, adapters, transports, and
project roots; it is never expanded by a scan. `endpoints.json` is the approved
inventory. Catalogs and proposals are immutable, while approvals are
append-only. Approved inventory and reservations are written atomically under
a global capacity lock. A reservation records lane ID, plan ID/revision,
endpoint/account capacity pool, quantity, window, purpose, status, and
timestamps.

The reservation ledger is local coordination state, not provider truth. It
prevents Watchtower lanes on the same data root from allocating the same
declared capacity twice.

### 13.2 Lane-local allocation state

```text
<control-home>/.watchtower/lanes/<slug>/
  allocation/
    policy.json
    discovery/
      proposal-ref.json
      project-eligibility.json
      coverage-report.json
      coverage-report.md
    capacity-snapshot.json
    allocation-plan.json
    allocation-plan.md
    allocation-review.md
    findings/
    history/
      <plan-id>-r<revision>.json
    usage-ledger.jsonl
```

All allocation artifacts are local and ignored by Git. The lane copy of the
capacity snapshot is immutable evidence for the plan. Superseded plans move to
history; they are preserved rather than overwritten.

The v1 `model-plan.md` and `budgets/` layout remain a compatibility surface.
When this feature lands, migration imports their non-secret intent into
`allocation/` or reports a manual-resolution conflict. A runtime upgrade alone
must not perform that migration.

### 13.3 Secret boundary

No allocation file may contain:

- API keys, access tokens, cookies, passwords, or authentication headers;
- full credential-store or provider configuration contents;
- secret environment-variable values;
- private SSH key paths unless a future security review explicitly permits
  non-secret key references; or
- captured CLI output that has not passed adapter redaction.

Endpoint adapters pass only the minimum non-secret launch identity required by
the runtime. Logs redact account emails and provider-specific identifiers by
default; stable local aliases are sufficient for diagnostics.

## 14. Review and activation

### 14.1 Allocation review

Large, expensive, high-risk, or multi-provider plans require an independent
allocation reviewer. Policy may allow small plans to use operator approval
plus deterministic validation.

The reviewer checks:

1. every pack slot is allocated exactly once;
2. every capability floor and access requirement is satisfied;
3. critical and high-reasoning work is not systematically under-routed;
4. implementation/review independence is real at account and session level;
5. provider diversity requirements are met;
6. correction and re-review reserves are credible;
7. estimates and telemetry quality are not presented as exact facts;
8. concurrency and repository/worktree constraints are safe;
9. fallback routes are feasible rather than decorative;
10. cost optimization did not outrank quality; and
11. unknown capacity has explicit policy treatment.

Review produces numbered findings and a final `ACCEPT` or `REJECT`. A semantic
plan correction increments the revision and invalidates the prior verdict.

### 14.2 Activation

Activation is one atomic mutation:

1. acquire the global capacity lock and lane mutation lock;
2. verify plan, pack seal, policy digest, and review verdict;
3. refresh or reject stale availability and permission facts;
4. compare the snapshot's reservation revision to the current ledger;
5. recompute conflicts for the proposed reservations;
6. append reservations and mark the plan active; and
7. emit `allocation-activated`.

Failure leaves neither partial reservations nor a partially active plan.
Activation does not launch a worker. Dispatch remains a separate coordinator
or operator action.

## 15. Replanning

Replanning is triggered by:

- endpoint, model, CLI, account, or provider unavailability;
- expired or materially changed capacity;
- quota or cost variance crossing policy thresholds;
- permission, worktree, or repository-binding change;
- pack amendment, reseal, batch addition, or dependency change;
- repeated rejection or unexpectedly expensive correction;
- a higher-priority reservation accepted by explicit operator policy; or
- loss of a required independent review route.

Rules:

1. Active assignments keep their endpoint and session unless the operator
   stops them or safety requires termination outside this phase.
2. Replanning changes pending slots and future reserves by default.
3. Accepted work is historical fact and is never reallocated.
4. A new pack seal invalidates all unstarted allocations and requires review
   proportional to the change.
5. Each revision records its predecessor, trigger, changed slots, released
   reservations, and new snapshot.
6. Replanning must not release capacity still protecting active correction or
   re-review work.
7. If no feasible replan exists, new dispatch pauses and status becomes
   `infeasible`; active sessions are not silently killed.

## 16. Usage accounting

`usage-ledger.jsonl` records append-only observations:

- event ID and timestamp;
- lane, plan revision, batch, role, endpoint, and assignment/session ID;
- input, output, cached, and other provider-specific token dimensions when
  available;
- message/quota or monetary usage when available;
- telemetry quality per dimension;
- estimate before dispatch and actual/updated estimate;
- correction/re-review association; and
- coordinator cycle and decision class when the assignment is coordination;
- source adapter or operator attribution.

Provider dimensions must remain distinct when they are not safely comparable.
Watchtower may render normalized summaries, but it must preserve the raw
qualified observations.

Usage data improves future estimates only through an explicit estimator
version. Historical observations are not silently reinterpreted after an
estimator change.

## 17. Durable events

| Event | Producer | Meaning |
|-------|----------|---------|
| `capability-discovered` | Watchtower adapter | Immutable discovery proposal written |
| `inventory-approved` | operator | Selected proposal records became inventory authority |
| `catalog-stale` | Watchtower/adapter | Route or model facts require refresh |
| `project-eligibility-changed` | Watchtower/operator | Endpoint access for this lane materially changed |
| `capacity-snapshot` | Watchtower/operator | Named snapshot captured |
| `allocation-infeasible` | Watchtower | Hard constraints cannot currently be satisfied |
| `allocation-draft` | Watchtower/planner | Complete draft written |
| `allocation-reject` | allocation reviewer | Numbered findings require correction |
| `allocation-ready` | allocation reviewer/operator | Plan accepted but not reserved |
| `allocation-activated` | Watchtower | Reservations committed and dispatch enabled |
| `capacity-changed` | Watchtower/operator | Material capacity fact changed |
| `replan-required` | Watchtower/coordinator/operator | Pending plan is no longer safe or feasible |
| `allocation-replanned` | Watchtower/planner | New pending-work revision written |
| `reservation-released` | Watchtower/operator | Capacity claim ended with reason |
| `budget-override` | operator | Explicit policy boundary changed |

Events contain stable lane, plan, snapshot, and correlation IDs. Tmux prose and
provider UI text are observations, not event authority.

## 18. Proposed CLI contract

| Command | Purpose |
|---------|---------|
| `wt allocation discover [--adapter=<id>] [--user=<id>]` | Probe only the allowlisted discovery scope and write an inventory proposal |
| `wt allocation inventory diff [--proposal=<id>]` | Show discovered additions, changes, missing routes, and uncertainty |
| `wt allocation inventory approve <proposal-id> [--only=<ids>]` | Accept selected non-secret discovery records |
| `wt allocation inventory list|check` | Show or validate non-secret endpoint inventory |
| `wt allocation inventory add|update|disable <endpoint-id>` | Mutate one endpoint declaration without handling credentials |
| `wt allocation catalog [--route=<id>]` | Show approved model catalogs, evidence, charging class, and freshness |
| `wt allocation check --project` | Derive lane-specific endpoint eligibility and coverage gaps |
| `wt allocation explain-capability <endpoint-id>` | Explain capability evidence, uncertainty, pool sharing, and restrictions |
| `wt allocation snapshot [--refresh]` | Capture time-bounded capacity and existing reservations |
| `wt allocation plan [--snapshot=<id>]` | Evaluate feasibility and write a draft plan |
| `wt allocation validate` | Validate structure, hard constraints, estimates, and cross-lane conflicts |
| `wt allocation review` | Prepare or record independent review and findings |
| `wt allocation activate` | Revalidate and atomically reserve an accepted plan |
| `wt allocation status` | Show allocation state, freshness, budget, reservations, and blockers |
| `wt allocation explain <batch> [--role=<role>]` | Explain selection, fallbacks, and rejected candidates |
| `wt allocation replan [--reason=<text>]` | Recompute pending slots against a new snapshot |

All commands use normal Watchtower lane discovery and explicit selection.
Read-only commands do not refresh snapshots, repair inventory, release
reservations, approve proposals, or mutate lane state. `--user` and `--adapter`
may narrow the allowlisted discovery scope; they cannot expand it.

`--json` output uses stable reason codes and distinguishes errors, warnings,
unknowns, estimates, and policy overrides. Human output never describes an
estimated or operator-supplied value as provider-reported.

## 19. Validation versus semantic review

`wt allocation validate` can prove:

- schema and reference integrity;
- adapter compatibility, proposal approval, and catalog freshness;
- pack seal and policy digest match;
- slot completeness and uniqueness;
- eligibility constraints;
- budget arithmetic and reserve inclusion;
- declared independence;
- dependency/concurrency compatibility;
- snapshot freshness; and
- reservation conflicts.

It cannot prove:

- that the pack assigned the right reasoning class;
- that a capability mapping accurately represents model quality;
- that estimates will match provider accounting;
- that a provider will remain available; or
- that cost savings justify a fragile plan.

Those remain reviewer and operator judgments. A valid plan is not necessarily
an accepted plan.

## 20. Failure semantics

Stable failure categories include:

| Code | Meaning |
|------|---------|
| `ALLOCATION_PACK_NOT_READY` | Accepted/sealed pack or baseline gate failed |
| `ALLOCATION_DISCOVERY_NOT_AUTHORIZED` | Requested host, user, adapter, transport, or project is outside the allowlist |
| `ALLOCATION_ADAPTER_UNSAFE` | Adapter cannot perform the requested probe within the non-secret/non-consuming contract |
| `ALLOCATION_INVENTORY_APPROVAL_REQUIRED` | Discovered records are not approved allocation authority |
| `ALLOCATION_INVENTORY_INVALID` | Endpoint declaration is incomplete or contradictory |
| `ALLOCATION_CATALOG_STALE` | Required route/model facts exceed policy freshness |
| `ALLOCATION_ELIGIBILITY_UNKNOWN` | Required project access or tool capability could not be proven or admitted |
| `ALLOCATION_SNAPSHOT_STALE` | Required facts expired before planning or activation |
| `ALLOCATION_NO_CAPABLE_ENDPOINT` | No endpoint meets a slot's capability floor |
| `ALLOCATION_ACCESS_DENIED` | Eligible model route cannot access required repositories |
| `ALLOCATION_INDEPENDENCE_UNSATISFIED` | Required review separation cannot be formed |
| `ALLOCATION_BUDGET_INFEASIBLE` | Base plan plus reserves exceeds a hard budget |
| `ALLOCATION_RESERVATION_CONFLICT` | Another lane reserved required capacity |
| `ALLOCATION_REVIEW_REQUIRED` | Plan lacks a valid acceptance verdict |
| `ALLOCATION_PLAN_DRIFT` | Pack, policy, inventory, or plan changed since review |
| `ALLOCATION_REPLAN_REQUIRED` | Active plan is unsafe for pending dispatch |

Failure output names the affected slots and remediation options without
changing policy automatically.

## 21. Safety and concurrency

- Global capacity and lane mutations use ordered locks to avoid deadlock.
- Snapshot creation is read-only with respect to provider accounts unless an
  adapter documents a safe, non-consuming telemetry request.
- Discovery never broadens its host/user/adapter/project allowlist and never
  treats discovered credentials as inventory.
- Tool adapters and capability-check definitions are versioned, integrity
  checked, and disabled by default when incompatible.
- Planner probes must not consume meaningful paid quota merely to estimate
  remaining quota.
- Reservations are compare-and-swap against a ledger revision.
- Expired reservations are reported, not silently removed by read commands.
- Repository/worktree write conflicts remain hard constraints independent of
  model capacity.
- One account shared by several endpoint aliases has one declared capacity
  pool unless proven otherwise.
- Provider rate limits, subscription quotas, token budgets, money, context,
  concurrency, and operator time remain separate dimensions.
- No command attempts to bypass a provider limit by rotating accounts.
- Cross-account allocation is permitted only for accounts the operator has
  declared authorized for the work.

## 22. Testing strategy

### 22.1 Contract fixtures

Fixtures cover:

- multiple Codex accounts under different Unix users;
- Hermes and OpenCode-style adapters with multiple dynamic plan routes and
  model catalogs;
- one free-entitlement route whose models share a finite quota pool;
- model addition, alias change, disappearance, and stale catalog;
- unauthorized Unix-user scan and unsafe/interactive adapter probe;
- selective inventory approval and rejected discovery records;
- globally approved endpoint that lacks one project permission;
- multiple providers with asymmetric model capability;
- one provider account exposed by two CLI adapters;
- unknown, estimated, operator-supplied, and reported quota;
- multi-repository batch permissions;
- required independent review with and without provider diversity;
- two lanes competing for one account capacity pool;
- correction session preservation;
- stale snapshot between review and activation;
- partial and complete infeasibility; and
- pack drift after allocation acceptance.

### 22.2 Deterministic planning

For fixed normalized inputs:

- plan output and tie-breaking are stable;
- no filesystem-order or wall-clock value enters the semantic plan;
- adding an ineligible endpoint does not change selected assignments;
- lower-cost candidates never displace a required higher-capability route;
- reserves remain included in hard-budget calculations; and
- explanation output accounts for every candidate.

### 22.3 Mutation and recovery

- activation either records all reservations or none;
- interrupted activation can be retried idempotently;
- two concurrent activations cannot overbook one capacity pool;
- replan preserves active and accepted assignments;
- release is idempotent and auditable; and
- no test fixture captures a real credential.

## 23. Acceptance criteria

- [ ] An implementation lane created from a sealed pack starts
      `allocation-required`.
- [ ] Discovery scans only explicitly authorized hosts, users, adapters,
      transports, and project roots.
- [ ] Installed CLIs, account/plan routes, shared quota pools, model catalogs,
      and agent-harness capabilities are represented separately.
- [ ] Hermes, OpenCode, and future CLIs can integrate through the same
      provider-neutral adapter contract.
- [ ] A declarative launch-only tier can onboard a safe unknown CLI without
      arbitrary shell hooks or fabricated catalog/capacity telemetry.
- [ ] Discovery changes remain proposals until explicitly approved.
- [ ] Dynamic catalogs carry provenance and expiry; missing models become stale
      rather than being silently deleted.
- [ ] Global endpoint approval does not imply project eligibility.
- [ ] Free-entitlement endpoints are selected only when they satisfy the same
      hard capability requirements.
- [ ] No implementation assignment starts before an allocation plan is
      activated.
- [ ] Every implementation, review, correction, and re-review requirement has
      a capable route or an explicit infeasibility result.
- [ ] D1–D3 coordinator classes have capability-safe endpoint pools and
      reserves, while M0 consumes no endpoint.
- [ ] Operator-conversation D1–D3 turns have separate pools/reserves and cannot
      consume all automated recovery capacity or reset usage through forks.
- [ ] Cost optimization cannot weaken pack capability floors.
- [ ] Account, session, and provider independence policies are validated.
- [ ] Capacity values preserve provenance and unknown values are never rendered
      as zero.
- [ ] Token, quota, money, concurrency, reset window, context, and operator
      time remain separate budget dimensions.
- [ ] Mandatory correction and re-review reserves are included before
      activation.
- [ ] Concurrent lanes cannot reserve the same finite capacity twice.
- [ ] Activation is atomic and does not launch workers.
- [ ] Replanning changes pending work by default and preserves active sessions.
- [ ] Endpoint inventory and plans contain no credentials or committed
      machine-specific identities.
- [ ] Allocation rationale and rejected-candidate reasons are available in
      human and stable JSON output.
- [ ] A realistic multi-account, multi-provider pilot demonstrates better
      scarce-capability placement without quality downgrade.

## 24. Decisions fixed by this draft

| Decision | Outcome |
|----------|---------|
| Process name | Implementation allocation planning; CLI group `wt allocation` |
| Product position | Required implementation-lane phase after pack handoff and before dispatch |
| Lane modeling | Lifecycle phase, not a separate lane kind |
| Pack boundary | Committed pack declares portable capability requirements |
| Local boundary | Actual users, accounts, endpoints, capacity, plans, and usage stay local |
| Endpoint identity | Host + OS user + tool/adapter + provider account + plan route + capacity pool + catalog model + effort |
| Discovery scope | Explicit host/user/adapter/transport/project allowlist; no machine-wide credential search |
| Compatibility | Versioned tool-adapter contract; provider-specific discovery stays outside planner core |
| Compatibility fallback | Declarative catalog or launch-only onboarding with explicit lower assurance |
| Dynamic catalogs | Discovered with provenance and expiry; never hardcoded as timeless product facts |
| Inventory changes | Immutable diff plus explicit selective operator approval |
| Project use | Global inventory followed by lane-specific eligibility checks |
| Utilization | Report unused capable routes, but never assign work merely to consume every plan |
| Quality rule | Capability floors are hard; infeasibility is preferable to silent downgrade |
| Optimization | Lexicographic quality-first objective, deterministic for fixed inputs |
| Capacity truth | Time-bounded snapshot with per-field telemetry quality |
| Multi-lane safety | Global local reservation ledger prevents double allocation |
| Review | Independent for large/high-risk plans; policy may permit operator approval for small plans |
| Activation | Atomic reservation step, separate from worker launch |
| Replanning | New revisions affect pending work by default |
| Secrets | Credentials are never stored in inventory, snapshot, plan, or logs |

## 25. Open questions

1. Which exact capability taxonomy should supersede or formalize repository
   `R1–R5` classes across providers?
2. Which provider/CLI adapters expose non-consuming, trustworthy quota
   telemetry?
3. Should reservation windows be time-based, usage-based, or both for the
   first release?
4. What pack size/risk threshold mandates independent allocation review?
5. Which estimator inputs are portable enough to share without leaking local
   account history?
6. Should a future portfolio policy support priority preemption, or should all
   active reservations remain non-preemptive?
7. Which adapters should ship with Watchtower versus a separately signed
   adapter distribution?
8. What minimum evidence suite should allow a newly discovered model to receive
   a portable reasoning or review capability class?
