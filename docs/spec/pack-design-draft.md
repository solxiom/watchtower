# Watchtower Pack Design — Process Specification

Status: **Draft**
Proposed lane kind: `pack-design`
Proposed command group: `wt pack`
Target horizon: post-v1, currently v1.2
Last updated: 2026-07-30

This document specifies the canonical process for converting accepted
specifications and their associated architecture, review, testing, and
repository documentation into a consumable implementation pack.

It is normative for the proposed process model. It does not add commands to
the Watchtower v1 release defined in [v1.md](v1.md).
It is a post-v1 producer specification and does not define the input accepted
by v1 `wt init`; that normative consumer contract is
[v1-contracts.md §3](v1-contracts.md#3-implementation-pack-consumer-contract).

## 1. Product statement

Pack design is the compilation phase between accepted design intent and
implementation coordination:

```text
accepted specifications
        │
        ▼
pack-design lane
        │
        ▼
accepted implementation pack
        │
        ▼
implementation lane
```

The phase establishes source-backed ownership, resolves or escalates remaining
decisions, decomposes work into an executable dependency graph, pairs every
work batch with an independent review instrument, and assigns reasoning
requirements without prematurely binding the pack to particular model names.

Watchtower provides the process, validation, runtime, observations, and cost
controls. Architect agents produce the design evidence and pack. Watchtower
does not decide architecture, invent missing requirements, or semantically
accept the result.

## 2. Why this is a separate lane kind

Pack design is not ordinary specification authoring:

- its primary inputs are already accepted;
- it must inspect current source and proof systems;
- it makes implementation ownership and sequencing concrete;
- it may uncover feasibility contradictions that reopen a specification;
- its output is an execution instrument rather than a design proposal.

It is also not implementation coordination:

- architect agents do not implement production behavior;
- there are no implementer/reviewer acceptance cycles for source changes;
- work is organized around evidence streams and synthesis gates;
- the pack integrator is a controlled single writer;
- acceptance means “safe and consumable for implementation,” not “feature
  delivered.”

The `pack-design` and `implementation` lane kinds share Watchtower discovery,
runtime distribution, state, events, status, budgeting, and host adapters.
They have different roles, policies, artifacts, and transition vocabularies.

## 3. Goals and non-goals

### 3.1 Goals

1. Convert accepted specifications into a complete, source-backed
   implementation pack.
2. Detect specification/source contradictions before implementation agents
   spend substantial tokens.
3. Give every normative requirement an implementation and review path.
4. Produce batches that are independently executable and reviewable.
5. Separate implementation reasoning difficulty from workload and context
   volume.
6. Route planning work across multiple architect agents without shared-file
   conflicts.
7. Use lower-cost agents and deterministic tools for bounded reconnaissance,
   reserving stronger reasoning for architecture synthesis and adversarial
   review.
8. Make source/specification drift visible after the pack is accepted.
9. Preserve Markdown as the normative human-readable plan while adding a small
   machine-readable structural manifest.
10. Hand an accepted pack directly to an implementation lane.

### 3.2 Non-goals

- Generating a pack from an unaccepted idea without specification review.
- Implementing production code or acceptance commits for implementation work.
- Automatically resolving normative ambiguity.
- Claiming semantic correctness from structural validation.
- Replacing independent architecture review with model consensus.
- Creating a generic workflow language or third-party plugin SDK.
- Requiring every architect to read the entire repository.
- Choosing models globally or embedding volatile model names in committed
  briefs.
- Treating token count, price, or agent speed as a quality score.

## 4. Vocabulary

| Term | Definition |
|------|------------|
| Accepted input | Normative spec, accepted review, architecture decision, proof requirement, or governing repository rule admitted to the pack baseline. |
| Initiative | Overall product effort relating this pack-design lane to its later implementation/research/maintenance lanes. |
| Repository ID | Stable logical name used by committed pack content instead of a machine path. |
| Source baseline | Per-repository Git revision and worktree facts against which feasibility and ownership were inspected. |
| Requirement reference | Stable path plus heading, identifier, or other source locator for one normative obligation. |
| Evidence stream | Bounded parallel investigation of source ownership, proof surfaces, compatibility, dependencies, or documentation. |
| Planning coordinator | Agent that operates the pack-design state machine, assignments, gates, and budget. |
| Architect | Agent that performs a bounded evidence or design assignment. |
| Pack integrator | Sole routine writer of canonical pack documents during synthesis. |
| Pack reviewer | Independent architect that accepts or rejects the complete pack. |
| Implementation pack | Committed set of roadmap, tracker, work/review briefs, quality rules, and structural metadata used by an implementation lane. |
| Pack seal | Deterministic digest record proving the reviewed pack file set. |
| Consumable | An implementation/review pair can execute without making a new material architecture or product decision. |

## 5. Authority model

| Question | Authority |
|----------|-----------|
| What behavior is required? | Accepted specifications and decisions |
| What source behavior exists now? | Inspected source at the recorded baseline |
| Which repository rules constrain the work? | Applicable `AGENTS.md` and canonical repo documentation |
| What evidence can accept the behavior? | Accepted proof requirements plus source-backed proof architecture |
| How is work divided? | Accepted implementation map and batch graph |
| Which agent edits canonical pack files? | Pack integrator during synthesis; pack reviewer during final verdict/acceptance |
| Which model/account performs an implementation assignment? | Active local implementation allocation plan |
| Is the pack semantically acceptable? | Independent pack reviewer |
| Is the pack structurally valid? | `wt pack validate` |

Watchtower may identify contradictions between authorities. It must not choose
which authority to change.

## 6. Lifecycle

### 6.1 Lane states

```text
INTAKE
  → BASELINED
  → FEASIBILITY
      ├── SPEC_AMENDMENT_REQUIRED
      └── RECONNAISSANCE
            → SYNTHESIS
            → DECOMPOSITION
            → BRIEFING
            → PACK_REVIEW
                ├── CORRECTION → PACK_REVIEW
                └── ACCEPTED
                      → SEALED
                      → HANDED_OFF

Any active state → PAUSED (operator)
Any pre-ACCEPTED state → ABANDONED (operator)
```

| State | Meaning |
|-------|---------|
| `intake` | Candidate accepted inputs and destination are being identified |
| `baselined` | Input digests, Git revision, dirty-state facts, and governing rules are recorded |
| `feasibility` | Architects are checking source reality and proof feasibility |
| `spec-amendment-required` | A material contradiction or missing normative decision blocks pack design |
| `reconnaissance` | Bounded parallel evidence streams are active |
| `synthesis` | The pack integrator is reconciling evidence into owner, decision, risk, and coverage maps |
| `decomposition` | Batch boundaries, dependencies, gates, and safe parallelism are being designed |
| `briefing` | Paired work and review briefs are being authored and validated |
| `pack-review` | Independent reviewer is auditing the complete pack |
| `correction` | Reviewer findings are being corrected by the integrator or a bounded architect |
| `accepted` | Reviewer issued final ACCEPT and the committed pack is semantically approved |
| `sealed` | File digests and structural validation match the accepted pack |
| `handed-off` | An implementation lane has been initialized from the accepted pack in `allocation-required` state |
| `paused` | Operator stopped new assignments without deleting state |
| `abandoned` | Operator intentionally ended the lane without an accepted pack |

`accepted` is not inferred from a clean validation result. It requires an
independent reviewer verdict.

### 6.2 Gate model

| Gate | Required outcome | Failure route |
|------|------------------|---------------|
| G0 — Input acceptance | Every normative input has verifiable accepted status or explicit operator admission | Return to specification review |
| G1 — Baseline | Input digests, repo revision, dirty state, and applicable instructions recorded | Complete baseline |
| G2 — Feasibility | No unresolved contradiction between accepted intent, source ownership, and available proof | `spec-amendment-required` |
| G3 — Coverage | Every requirement is mapped to ownership, work, and review/proof | Reconnaissance or synthesis correction |
| G4 — Decomposition | Dependency graph is acyclic; batches are bounded and ownership-safe | Redesign batch graph |
| G5 — Consumability | Every work/review pair contains the mandatory brief contract | Brief correction |
| G6 — Independent review | Pack reviewer issues final ACCEPT | `correction` |
| G7 — Seal | Structural validation and file digests match accepted content | Repair drift and re-review when semantic content changed |
| G8 — Handoff | Implementation-lane preflight accepts pack and current source baseline | Rebaseline or pack correction |

## 7. Transition rules

1. No reconnaissance assignment starts before G1.
2. A material feasibility contradiction stops decomposition immediately.
3. `spec-amendment-required` cannot transition directly to synthesis. The
   amended specification must be accepted and rebaselined.
4. Parallel evidence streams may finish independently, but synthesis does not
   pass G3 until every mandatory stream is complete or explicitly waived with
   operator rationale.
5. Only the pack integrator routinely edits canonical pack files before review.
6. Pack review locks canonical pack content except reviewer verdict/findings.
7. A REJECT creates numbered correction findings; it does not silently rewrite
   the pack.
8. Any semantic correction invalidates the previous review verdict and seal.
9. Source or accepted-input drift after ACCEPT must be classified before an
   implementation lane starts.
10. Handoff does not make the pack-design lane the implementation coordinator;
    it closes or archives after recording the new lane reference.
11. Handoff enters implementation allocation planning; it cannot launch an
    implementation worker or preselect a local endpoint.

## 8. Roles and separation of duties

### 8.1 Operator

- admits accepted inputs when acceptance metadata is not machine-readable;
- sets cost, account, provider, and concurrency policy;
- resolves whether a feasibility finding returns to specification work;
- pauses, abandons, or authorizes scope expansion;
- selects the pack reviewer; and
- may override allocation recommendations with recorded rationale.

### 8.2 Planning coordinator

- owns the entire pack-design lane until handoff;
- reads lane state, assignment graph, findings, and budget on each wake;
- dispatches bounded architect assignments;
- prevents shared-file conflicts;
- advances gates only from durable events and required artifacts;
- pauses new dispatch when a hard budget boundary is reached; and
- never authors architectural conclusions merely to unblock the lane.

The planning coordinator is an orchestration role. It is not the pack
integrator or reviewer.

### 8.3 Evidence architects

Evidence architect specializations may include:

| Specialization | Primary output |
|----------------|----------------|
| Requirements analyst | Requirement inventory and trace references |
| Source cartographer | Current owners, construction paths, identities, and integration seams |
| Proof architect | Test/proof owners, environments, commands, observability, and reviewer rerun design |
| Compatibility architect | Regression surfaces, public contracts, migration and failure risks |
| Dependency architect | Cross-package/order dependencies and safe parallelism constraints |
| Documentation architect | Public/internal docs, examples, status, and closure surfaces |
| Cost analyst | Planning difficulty, implementation difficulty, workload, context, and allocation proposal |

Each assignment is bounded. Evidence architects write reports under local lane
state unless explicitly assigned a disjoint canonical artifact by the
integrator.

### 8.4 Pack integrator

- reconciles evidence into one coherent implementation architecture;
- owns the committed implementation map, traceability, roadmap, tracker,
  batch graph, and paired briefs;
- identifies conflicts rather than selecting whichever architect wrote last;
- keeps shared rules factored instead of duplicating them into every prompt;
- prepares the pack for independent review; and
- performs or delegates numbered review corrections.

The integrator must not review and accept their own pack.

### 8.5 Pack reviewer

- starts from accepted inputs and source, not only integrator summaries;
- checks feasibility, coverage, decomposition, proof, compatibility, and
  consumability;
- samples source references and requirement mappings;
- audits the hardest batches at their declared reasoning class;
- verifies lower-cost allocation did not weaken critical work;
- issues final ACCEPT or numbered REJECT findings;
- owns the pack acceptance record and acceptance commit under the repository's
  review policy.

### 8.6 Separation matrix

| Action | Coordinator | Evidence architect | Integrator | Reviewer |
|--------|-------------|-------------------|------------|----------|
| Dispatch assignments | Owns | No | Advises | No |
| Write local evidence | May log | Owns | May | May |
| Write canonical pack | No | Only explicit disjoint assignment | Owns | Verdict/corrections only |
| Decide semantic architecture | No | Proposes | Synthesizes | Challenges/accepts |
| Accept pack | No | No | No | Owns |
| Initialize implementation lane | Invokes after acceptance | No | No | No |

## 9. Parallelism model

### 9.1 Safe parallel work

Parallelize evidence streams that have distinct questions and output reports:

- source ownership by package or subsystem;
- proof/test infrastructure;
- compatibility/public API risk;
- documentation/status impact;
- requirement extraction by accepted input;
- cost/context inventory.

### 9.2 Unsafe parallel work

Do not allow multiple agents to concurrently rewrite:

- implementation map;
- dependency graph;
- roadmap;
- tracker;
- shared quality rules;
- the same batch brief;
- the same review brief;
- pack manifest; or
- final acceptance record.

### 9.3 Assignment graph

Every assignment declares:

- unique assignment ID;
- role/specialization;
- questions to answer;
- required input references;
- excluded questions;
- output path;
- dependencies;
- planning reasoning class;
- context envelope;
- token/cost envelope;
- whether it may run in parallel;
- completion event; and
- escalation conditions.

Concurrency is limited by the assignment dependency graph, shared ownership,
account/provider capacity, and configured budget. Maximum available agent slots
are not a reason to dispatch unnecessary work.

## 10. Filesystem and artifact contract

### 10.1 Committed implementation pack

Recommended layout:

```text
<implementation-pack>/
  README.md
  implementation-pack.json
  implementation-pack.lock.json
  pack-acceptance.md
  requirements-traceability.md
  implementation-map.md
  risk-and-decision-register.md
  implementation-quality-and-agent-rules.md
  batch-reasoning-difficulty-ranking.md
  implementation-roadmap.md
  implementation-tracker.md
  work-batches/
    00-work-batch-index.md
    <batch-id>-<slug>.md
  review-batches/
    00-review-batch-index.md
    <batch-id>-review-<slug>.md
```

The repository may add domain-specific artifacts. The manifest identifies
which required roles they fulfill.

Committed packs must not contain:

- account-specific model allocation;
- token ledgers;
- agent conversation transcripts;
- machine-local paths;
- runtime prompts containing duplicated brief prose;
- worker reports;
- secrets; or
- unresolved critical decisions disguised as implementation notes.

The committed pack is the durable architecture and collaboration artifact. It
is never moved into `.watchtower/`, archived only to XDG storage, or replaced
by a tracker summary. Watchtower does not implement pack push/pull; Git owns
durable synchronization and history.

### 10.2 Local pack-design runtime

```text
.watchtower/lanes/<lane-slug>/
  lane.json
  install.json
  lane.config.env
  repositories.local.json
  pack-model-plan.md
  operator-tracker.md
  bin/
  state/
    pack-design-state.txt
    assignment-graph.json
    worker-events.jsonl
  budgets/
    budget-plan.json
    budget-ledger.jsonl
  reports/
    evidence/
    assignments/
    reviews/
  prompts/
  logs/
```

These artifacts are never committed.

### 10.3 Artifact ownership

| Artifact | Owner |
|----------|-------|
| Accepted specs/reviews | Upstream specification process |
| Evidence reports | Assigned evidence architect |
| Canonical implementation pack | Pack integrator |
| Pack acceptance and review report | Pack reviewer |
| Lane state/assignments/budget observations | Pack-design runtime/coordinator |
| Actual account/model mapping | Operator-local model plan |
| Pack seal | Watchtower-generated, reviewer verifies |

## 11. Structural manifest

`implementation-pack.json` contains structure and trace references, not
duplicated requirements prose.

It is also the primary structural input for the v1 coordinator pack-index
compiler. The committed manifest must contain enough explicit identity,
dependency, repository-claim, requirement, proof-class, and artifact-reference
metadata to build coordinator indexes without parsing every Markdown document
on each decision cycle.

Illustrative future producer shape (its emitted v1-compatible subset must
validate against [schemas/v1.schema.json](schemas/v1.schema.json)):

```json
{
  "schemaVersion": 1,
  "packId": "route-groups-v2",
  "initiativeId": "route-groups-v2",
  "authoredByLaneId": "1a14c207-03dd-4bc9-b0b1-66940360543e",
  "kind": "implementation",
  "status": "draft",
  "packRepository": "awrux",
  "repositories": [
    {"id": "awrux", "role": "primary", "access": "write"},
    {"id": "ux-dev-server", "role": "integration", "access": "write"},
    {"id": "public-ux", "role": "consumer-proof", "access": "read"}
  ],
  "sourceBaselines": {
    "awrux": {"revision": "0123456789abcdef", "dirty": false},
    "ux-dev-server": {"revision": "123456789abcdef0", "dirty": false},
    "public-ux": {"revision": "23456789abcdef01", "dirty": false}
  },
  "acceptedInputs": [
    {
      "repository": "awrux",
      "path": "docs/spec/routing/route-groups/spec.md",
      "sha256": "...",
      "acceptanceRef": "docs/spec/routing/route-groups/reviews/review-2.md"
    }
  ],
  "artifacts": {
    "readme": "README.md",
    "traceability": "requirements-traceability.md",
    "implementationMap": "implementation-map.md",
    "qualityRules": "implementation-quality-and-agent-rules.md",
    "roadmap": "implementation-roadmap.md",
    "tracker": "implementation-tracker.md",
    "acceptance": "pack-acceptance.md",
    "seal": "implementation-pack.lock.json"
  },
  "batches": [
    {
      "id": "FRAME-C",
      "title": "Transition-time frame builder",
      "dependsOn": ["FRAME-B"],
      "primaryRepository": "awrux",
      "workBrief": "work-batches/FRAME-C-frame-builder.md",
      "reviewBrief": "review-batches/FRAME-C-review-frame-builder.md",
      "requirements": ["RGF-021", "RGF-022"],
      "repositories": [
        {
          "id": "awrux",
          "access": "write",
          "ownershipAreas": ["route/group"],
          "paths": ["ux/core/support/route/group/**"],
          "claimMode": "exclusive-write"
        },
        {
          "id": "ux-dev-server",
          "access": "write",
          "ownershipAreas": ["integration-proof"],
          "paths": ["handlers/route-group/**"],
          "claimMode": "exclusive-write"
        }
      ],
      "implementationReasoning": "R4",
      "reviewReasoning": "R4",
      "workload": "large",
      "proofClasses": ["focused-runtime", "failure-matrix"]
    }
  ]
}
```

Rules:

- paths are pack-relative and cannot escape the pack;
- `initiativeId`, stable `authoredByLaneId`, `packRepository`, and at least one
  logical repository are required;
- repository IDs are unique and carry no machine-local path;
- every accepted input, requirement owner, batch scope, proof, and documentation
  target identifies its repository;
- every batch primary repository appears in that batch's repository scope;
- writable batch scopes declare normalized repository-relative path claims so
  parallelism/conflict analysis can be conservative;
- batch IDs are unique and stable;
- every batch has exactly one work brief and review brief;
- `dependsOn` references existing batch IDs and forms a DAG;
- accepted-input digests are mandatory at seal time;
- every participating source baseline and dirty state is recorded honestly;
- every requirement reference maps to at least one batch;
- each batch declares reasoning and workload independently;
- actual model/account names do not appear in the manifest;
- coordinator-critical relationships are explicit structural references and
  must not exist only in unindexed prose;
- unknown fields are preserved when schema-compatible.

## 12. Required canonical artifacts

### 12.1 README

Defines mission, accepted inputs, reading order, pack status, owner map,
high-level batch stack, and handoff instructions.

### 12.2 Requirements traceability

For every normative requirement:

| Field | Requirement |
|-------|-------------|
| Reference | Stable ID or path/heading |
| Summary | Short faithful statement |
| Current owner | Existing source owner or new owner decision |
| Work batch | Batch or explicit no-work rationale |
| Review/proof | Review batch and evidence class |
| Decision status | Settled, clarified, or blocked |

A requirement cannot disappear because it is inconvenient to batch.

### 12.3 Implementation map

Records:

- current source architecture;
- target ownership;
- construction/integration paths;
- identity and lifecycle boundaries;
- dependency edges;
- compatibility surfaces;
- proof ownership;
- documentation ownership; and
- rejected architecture shortcuts.

### 12.4 Risk and decision register

Every finding is classified:

| Class | Meaning |
|-------|---------|
| `settled-input` | Accepted upstream decision; pack must not reopen |
| `implementation-clarification` | Non-public execution detail consistent with accepted inputs |
| `spec-amendment-required` | Material behavior/product decision missing or contradictory |
| `source-risk` | Current ownership or behavior makes delivery risky |
| `proof-risk` | Acceptance cannot yet be rerun reliably |
| `cost-risk` | Context/workload/agent availability threatens efficient completion |

An implementation clarification must state why it does not change public or
normative behavior. Critical unresolved entries block G2 or G3.

### 12.5 Quality and agent rules

Factors shared hard-reject rules, source conventions, proof requirements,
file/layer ownership, documentation rules, reports, Git policy, and acceptance
authority out of individual batch prompts.

### 12.6 Difficulty ranking

Ranks implementation batches by reasoning difficulty and separately declares
workload/context. It explains primary failure risks and required reviewer
strength. Ranking never changes dependency order.

### 12.7 Roadmap and tracker

The roadmap explains phases, goals, batch dependencies, gates, and acceptance
snapshots. The tracker is the concise status and evidence ledger. Reviewer-owned
accept/reject status must remain distinct from coordinator factual maintenance.

## 13. Work-batch contract

Every work brief contains:

1. stable ID and title;
2. required implementation reasoning class;
3. estimated workload/context class;
4. accepted dependencies;
5. mission and measurable outcome;
6. primary repository plus participating repository IDs and read/write scope;
7. current and target owners, qualified by repository;
8. required work;
9. non-goals;
10. compatibility constraints;
11. proof requirements and the repository/environment that owns each proof;
12. acceptance checklist;
13. hard-reject conditions;
14. deliverables and local report path;
15. handoff contract for downstream batches; and
16. explicit “implementer does not commit” rule when reviewer-owned commits
    apply.

A work brief is not consumable when the assigned implementation agent must
choose a new public contract, invent an owner, design the proof system, or
decide between materially different architectures.

## 14. Review-batch contract

Every work brief has one paired review brief containing:

1. the same required reasoning class or a justified stronger class;
2. paired work brief and expected report;
3. independent reviewer mission;
4. mandatory source inspection;
5. requirements and ownership audit;
6. independent proof rerun protocol;
7. compatibility and failure-boundary checks;
8. hard-reject conditions;
9. explicit ACCEPT/REJECT rule;
10. correction-brief behavior; and
11. acceptance report and per-writable-repository commit authority.

The review brief must enable rejection of a superficially complete but
architecturally misplaced implementation.

## 15. Runtime prompt policy

Canonical batch briefs are the source of task truth. Runtime launch prompts are
generated or materialized as thin envelopes containing:

- role and assignment identity;
- required reading references;
- canonical brief reference;
- local report destination;
- event-writing instructions;
- ownership/Git safety rules;
- current model/effort selection; and
- optional downstream handoff note.

Launch prompts must not restate the entire batch mission, proof matrix, and hard
reject list. Duplicated prompt prose increases token consumption, creates drift,
and makes review unclear.

`wt pack context <assignment>` may construct a bounded context manifest or
runtime prompt. It must reference canonical files rather than concatenate the
entire repository by default.

## 16. Reasoning and workload classification

### 16.1 Separate dimensions

Reasoning difficulty answers:

> How strong must the agent's architectural reasoning be for a reliable result?

Workload answers:

> How much source, proof, documentation, and output volume must be processed?

A mechanically broad documentation inventory may have high workload but modest
reasoning. A five-line ownership decision may have low workload and extreme
reasoning difficulty.

### 16.2 Planning reasoning classes

| Class | Appropriate planning work |
|-------|---------------------------|
| `P1` | Deterministic inventory, link/path extraction, manifest checks |
| `P2` | Bounded source or documentation reconnaissance with explicit questions |
| `P3` | Cross-document synthesis, traceability, proof/status reconciliation |
| `P4` | Cross-module ownership, decomposition, compatibility, lifecycle, and failure-boundary design |
| `P5` | Highly coupled cross-system architecture, ambiguous source/spec reconciliation, or final adversarial review of critical packs |

Planning class is based on the maximum material reasoning risk, not average
task simplicity.

### 16.3 Implementation reasoning classes

The pack may use repository-established `R1–R5` implementation reasoning
classes. Where a repository lacks a scale, the pack defines one in its
difficulty document.

The classification describes capabilities, not model brands. The local model
plan maps classes to currently available models, efforts, accounts, providers,
and fallback routes.

### 16.4 Workload classes

| Class | Meaning |
|-------|---------|
| `small` | Narrow owner and proof surface; one bounded context packet |
| `medium` | Several related files/documents and one primary proof surface |
| `large` | Cross-module context, multiple proof surfaces, or substantial output |
| `extra-large` | Broad closure/synthesis requiring staged context and checkpoints |

Extra-large work should be decomposed unless its value comes specifically from
whole-lane synthesis.

### 16.5 Scoring inputs

Allocation considers:

- ownership complexity;
- source breadth;
- uncertainty;
- compatibility sensitivity;
- state/timing/lifecycle complexity;
- identity and ordering requirements;
- failure boundaries;
- proof complexity;
- cross-batch contract load;
- synthesis load;
- context volume; and
- expected correction risk.

Watchtower may calculate a recommendation. An architect/integrator records the
final class and rationale.

## 17. Cost and token management

### 17.1 Principles

1. Spend deterministic computation before model tokens.
2. Use bounded reconnaissance before high-cost synthesis.
3. Escalate capability when evidence shows uncertainty, not merely because a
   stronger model is available.
4. Reserve strong independent reasoning for the highest-risk batch design and
   pack review.
5. Do not save tokens by weakening reviewer independence.
6. Do not dispatch parallel agents whose likely output substantially overlaps.
7. Budget corrections and re-review; do not allocate the entire budget to the
   first draft.

### 17.2 Budget plan

The local `budget-plan.json` may define:

- total soft and hard token/cost envelopes;
- per-stage envelopes;
- per-assignment envelope and context maximum;
- provider/account concurrency;
- review/correction reserve;
- escalation reserve;
- currency/pricing snapshot when cost is estimated; and
- behavior when telemetry is unavailable.

Recommended default allocation posture:

```text
reconnaissance and inventories     20–30%
synthesis and decomposition        30–40%
briefing and structural checks     15–25%
independent review                 15–20%
correction reserve                 at least 10%
```

These are planning ranges, not universal quotas.

### 17.3 Usage ledger

`budget-ledger.jsonl` records per assignment:

- assignment ID;
- provider/model/account when known;
- start/end timestamps;
- reported input/output/cache tokens when available;
- estimated usage when telemetry is absent;
- pricing snapshot/source when cost is calculated;
- retry/correction relationship; and
- whether values are `reported`, `estimated`, or `unknown`.

Watchtower must never present estimated usage as provider-reported fact.

### 17.4 Budget enforcement

- Soft threshold: warn coordinator and recommend rerouting/rescoping.
- Hard threshold: pause new assignment dispatch and request operator action.
- Active agents are not killed merely because the threshold was crossed.
- Reviewer and correction reserve cannot be silently reassigned to additional
  reconnaissance.
- Operator overrides are durable lane events with rationale.

### 17.5 Context economy

Each assignment receives the smallest sufficient context set:

- governing instructions;
- accepted-input fragments or references;
- relevant source map/evidence;
- assignment brief;
- shared rules;
- exact output and event contract.

Context packets record included paths and baseline digests. They do not copy
large canonical documents into new committed prompt files.

Source exploration uses the assigned agent host's authorized project tools.
Any source evidence returned to the lane is bounded to explicit logical paths,
symbols, commits, and verification obligations; host caches or indexes never
become pack artifacts, lane state, or completeness authority.

## 18. Durable event contract

The proposed pack-design runtime adds role-specific events:

| Event | Allowed role | Meaning |
|-------|--------------|---------|
| `finding` | evidence architect | Bounded evidence report completed |
| `blocked` | any worker | Concrete blocker prevents assignment completion |
| `proposal-ready` | architect | Architecture/decomposition proposal ready for integrator |
| `synthesis-ready` | pack integrator | Canonical maps and graph ready for briefing |
| `pack-ready` | pack integrator | Complete pack ready for independent review |
| `reject` | pack reviewer | Final pack REJECT with numbered findings |
| `accept` | pack reviewer | Final semantic ACCEPT |
| `sealed` | Watchtower/reviewer action | Structural seal written and verified |
| `handed-off` | planning coordinator | Implementation lane initialized |
| `budget-override` | operator | Budget/concurrency policy explicitly changed |

Events include `id`, `at`, `lane`, `assignment`, `role`, `event`, `artifact`,
and optional `detail`. A completion event is valid only when its required
artifact exists and matches the assignment.

Tmux text remains diagnostic and cannot advance a gate.

## 19. Proposed CLI contract

### 19.1 Commands

| Command | Purpose |
|---------|---------|
| `wt pack init --from=<repo-id>:<path> --output=<repo-id>:<path> [--scope=<bindings.json>]` | Initialize multi-repository pack-design lane and committed pack skeleton |
| `wt pack status [--lane=<slug-or-uuid>]` | Show phase, repositories, conflicts, gates, assignments, budget, and drift |
| `wt pack validate [--path=<pack>]` | Run deterministic structural validation |
| `wt pack graph [--path=<pack>]` | Render batch dependencies, critical path, and safe parallel groups |
| `wt pack budget [--lane=<slug-or-uuid>]` | Show or recalculate allocation and usage projections |
| `wt pack context <assignment>` | Build/inspect a bounded assignment context manifest |
| `wt pack diff [--path=<pack>]` | Compare current specs/source with recorded baseline |
| `wt pack seal [--path=<pack>]` | Validate and write deterministic pack seal |
| `wt init <lane> --from-pack=<path>` | Initialize implementation lane from accepted sealed pack |

These commands are proposed for the pack-design horizon, not v1.

### 19.2 `wt pack init`

Preflight:

1. resolve the control-home repository and optional participating repository
   bindings;
2. assign an initiative ID, stable lane ID, and logical repository IDs;
3. validate every `--from` reference inside its declared repository;
4. collect per-repository Git revisions and dirty state;
5. detect applicable instructions in every participating repository;
6. require explicit acceptance references or operator admissions;
7. ensure output does not overwrite an existing committed pack;
8. create `.watchtower/lanes/<slug>/` local state and the committed skeleton
   transactionally.

It must not populate architecture conclusions or batch content automatically.

### 19.3 `wt pack status`

Reports:

- state and current gate;
- accepted-input and source drift;
- mandatory evidence streams;
- active/completed/blocked assignments;
- pack-integrator and reviewer lock state;
- requirement coverage totals;
- batch/brief/graph validation;
- budget used, estimated, remaining, and telemetry quality;
- findings requiring operator/specification action; and
- safe next operator action.

Status is observational and does not accept gates.

### 19.4 `wt pack validate`

Deterministic validation includes:

- manifest schema and paths;
- required canonical artifacts;
- accepted input and seal digests;
- unique batch IDs;
- valid DAG and missing dependencies;
- exactly one work/review pair per batch;
- work/review heading contracts;
- requirement coverage;
- missing or orphaned references;
- duplicate primary ownership among batches declared parallel;
- reasoning/workload declarations;
- machine-local paths or model/account names in committed metadata;
- committed runtime prompt duplication warnings;
- tracker/roadmap/index batch-set consistency;
- coordinator-indexability: stable IDs, resolvable artifact references,
  reverse-reference inputs, repository claims, proof classes, and digest
  coverage required by the v1 compiler; and
- pack status/seal consistency.

Validation cannot determine:

- whether the architecture is correct;
- whether a batch is genuinely well sliced;
- whether proof is sufficient;
- whether a requirement summary is faithful;
- whether a reasoning class is honest; or
- whether the pack deserves acceptance.

Those remain reviewer obligations.

### 19.5 `wt pack graph`

Produces human and JSON representations of:

- dependency DAG;
- critical path;
- roots and leaves;
- batches safe to parallelize by dependency;
- primary ownership overlap warnings;
- proof-environment contention; and
- reasoning/workload distribution.

Safe-to-parallel is advisory until an architect confirms ownership and runtime
resource independence.

### 19.6 `wt pack budget`

Combines declared assignment classes, configured provider/account profiles, and
available telemetry. It may recommend:

- lower-cost reconnaissance route;
- stronger synthesis/reviewer route;
- context subdivision;
- concurrency reduction;
- task merge when coordination overhead exceeds savings; or
- escalation reserve use.

It never changes allocation automatically during active work.

### 19.7 `wt pack diff`

Classifies drift:

| Drift | Required response |
|-------|-------------------|
| Accepted input content changed | Rebaseline and re-review affected coverage |
| Governing instruction changed | Revalidate affected artifacts |
| Source owner/path changed | Re-run bounded feasibility/ownership inspection |
| Unrelated source changed | Record and continue when reviewer agrees |
| Pack content changed after acceptance | Seal invalid; semantic changes require re-review |

### 19.8 `wt pack seal`

Seal preconditions:

- manifest status is accepted;
- pack acceptance contains final reviewer ACCEPT;
- structural validation passes;
- no unresolved critical decision/risk;
- accepted-input and pack files have digests;
- current file set matches manifest.

The seal is written to `implementation-pack.lock.json`. It records schema,
informational generation time, accepted-input digests, source baseline, pack
file digests, reviewer acceptance reference, and a deterministic `sealId`
calculated from normalized paths and digests. The lock file itself is excluded
from its file-digest set to avoid self-reference.

The same accepted inputs and pack bytes must produce the same `sealId`; the
informational generation time may differ. The seal contains no semantic claim
beyond the referenced reviewer verdict.

### 19.9 Implementation handoff

The future handoff invokes the normative v1
`wt init <slug> --impl-pack=...` contract and additionally requires:

- accepted, sealed pack;
- passing structural validation;
- no unclassified critical baseline drift;
- implementation lane slug/prefix, initial allocation policy, and all local
  repository bindings;
- no unsafe writable-worktree conflict with another active lane;
- compatible implementation runtime and knowledge pack.

It derives implementation-pack path and batch IDs from the manifest, creates
the implementation lane in the chosen control home, and records reciprocal
stable lane-ID relations under the shared initiative. It registers every
participating repository in the user-local membership index. It does not launch
batch 1. For a post-v1 allocation-enabled runtime, the new implementation lane
may enter `allocation-required` and complete
[allocation-planning-draft.md](allocation-planning-draft.md) before dispatch.
This does not add `allocation-required` to the v1 lifecycle. Pack capability
classes become allocation inputs; the pack-design lane does not select
machine-local accounts or endpoints.

Handoff also invokes the deterministic v1 coordinator pack-index compiler.
The derived index stays in the implementation lane's local `coordinator/`
subtree and is tied to the pack seal. Build or verification failure aborts
handoff transactionally; it never causes a full-pack runtime fallback.

## 20. Pack reviewer protocol

The reviewer audits at least:

1. all accepted inputs and acceptance evidence;
2. all requirements marked clarified, waived, or no-work;
3. source-backed owner map samples across every subsystem;
4. the dependency graph and claimed parallel groups;
5. every highest-reasoning batch;
6. at least one lower-reasoning/high-workload batch;
7. each proof environment and failure boundary;
8. documentation and closure ownership;
9. work/review pair symmetry;
10. pack consumption without access to private integrator reasoning;
11. baseline and drift policy; and
12. cost allocation for systematic under-routing.

Final verdict:

- `ACCEPT` only when the pack is feasible, traceable, bounded, reviewable, and
  consumable;
- `REJECT` with numbered findings otherwise;
- no conditional ACCEPT with unresolved material architecture.

## 21. Consumability test

Before acceptance, conduct a dry handoff for representative batches:

- one highest-reasoning batch;
- one ordinary batch;
- one proof/integration batch;
- one documentation/closure batch when present.

For each, an independent reader must be able to identify:

- why the batch exists;
- accepted prerequisites;
- exact owner and scope;
- prohibited shortcuts;
- deliverables;
- proof and acceptance boundary;
- downstream handoff; and
- what decisions are already settled.

If the reader must consult the pack integrator to resolve a material ambiguity,
the brief fails G5.

## 22. Safety and integrity

- Pack-design mutations use the same Watchtower lock and atomic-write model.
- Canonical pack files are committed repository artifacts; local evidence,
  ledgers, events, and prompts remain under `.watchtower/`.
- No agent writes outside assigned ownership without coordinator/integrator
  reassignment.
- No runtime command stages or commits `.watchtower/`.
- Baseline capture records dirty worktree truth rather than requiring a clean
  tree unconditionally.
- Digests use SHA-256 and pack-relative normalized paths.
- Symlinked pack inputs must resolve within a declared repository binding
  unless explicitly admitted and recorded.
- Generated prompt/context output redacts configured secret keys.
- Budget stops pause new dispatch rather than terminating active sessions.
- Pack acceptance never triggers Git push or implementation launch implicitly.

## 23. Testing strategy

### 23.1 Contract fixtures

Maintain sanitized fixtures for:

- a small linear pack;
- a branched pack with safe parallel batches;
- the RouteGroup v2-style ten-batch pack;
- missing requirement coverage;
- cyclic dependencies;
- work/review mismatch;
- ownership overlap;
- accepted-input drift;
- post-accept pack drift;
- absent token telemetry;
- budget threshold and override; and
- spec-amendment-required recovery.

### 23.2 Structural tests

- manifest schema/path validation;
- Markdown contract heading checks;
- DAG/critical-path/parallel-group derivation;
- requirement coverage;
- seal determinism;
- baseline drift classification;
- account/model leakage detection;
- context manifest bounding;
- token ledger reported/estimated distinction.

### 23.3 Process acceptance

Pilot the process on:

1. an already completed pack, reconstructing the baseline and comparing the
   generated findings with known corrections;
2. a new moderate pack;
3. a cross-package high-reasoning pack.

The pilot must measure coordination overhead as well as token savings.

## 24. Acceptance criteria for the pack-design feature

- [ ] `pack-design` is a recognized lane kind without a generic plugin system.
- [ ] Canonical knowledge pack defines coordinator, architect, integrator, and
      reviewer behavior.
- [ ] Init records accepted inputs and source baseline transactionally.
- [ ] Parallel assignments cannot claim overlapping canonical output ownership.
- [ ] Structural manifest represents batches, dependencies, ownership,
      reasoning, workload, requirements, and proofs.
- [ ] Multi-repository packs use logical IDs and per-repository source
      baselines without committed machine paths.
- [ ] Every batch declares repository read/write scope and reviewer commit
      authority for each writable repository.
- [ ] Accepted packs remain committed while prompts, reports, allocation, and
      usage stay in the local lane overlay.
- [ ] Validation distinguishes deterministic checks from semantic review.
- [ ] Graph output identifies cycles, critical path, and candidate parallelism.
- [ ] Budgeting distinguishes reported, estimated, and unknown usage.
- [ ] Hard budget threshold pauses new dispatch without killing workers.
- [ ] Runtime prompts reference canonical briefs instead of duplicating them.
- [ ] Spec contradictions enter `spec-amendment-required`.
- [ ] Every accepted requirement maps to work and review/proof or an accepted
      no-work rationale.
- [ ] Independent reviewer owns final pack ACCEPT/REJECT.
- [ ] Seal invalidates after pack or accepted-input drift.
- [ ] Accepted sealed pack initializes an implementation lane without manual
      path re-entry.
- [ ] Every accepted pack is structurally indexable without model
      summarization, and its derived coordinator index matches the pack seal.
- [ ] A RouteGroup-v2-scale pilot demonstrates bounded context, independent
      review, and lower duplication than the current hand-authored format.

## 25. Decisions fixed by this draft

| Decision | Outcome |
|----------|---------|
| Process name | Pack design; CLI group `wt pack`; lane kind `pack-design` |
| Product position | Separate phase between accepted spec and implementation lane |
| Writing model | Parallel local evidence, single canonical pack integrator |
| Acceptance | Independent pack reviewer; validation alone cannot accept |
| Missing decisions | Return to specification amendment; never silently invent |
| Structural metadata | `implementation-pack.json` alongside normative Markdown |
| Repository scope | Logical repository IDs in committed pack; local worktree paths only in lane bindings |
| Pack persistence | Accepted pack remains committed; no local-only pack or Watchtower push/pull |
| Local execution | `.watchtower/lanes/<slug>/` structured overlay |
| Prompt strategy | Thin generated runtime envelopes referencing canonical briefs |
| Difficulty | Planning reasoning, implementation reasoning, and workload are separate |
| Model routing | Capability classes in committed pack; actual models/accounts local |
| Budget enforcement | Warn at soft threshold; pause new dispatch at hard threshold |
| State authority | Durable events/artifacts, never tmux prose |
| Handoff | Accepted sealed pack initializes a separate implementation lane in `allocation-required` state |

## 26. Open questions

1. Should stable requirement IDs be mandatory, or may path/heading references
   remain first-class indefinitely?
2. Should `pack-acceptance.md` follow one global template or allow
   repository-specific reviewer protocols?
3. Which host/provider usage APIs can supply trustworthy token telemetry?
4. Should planning context manifests record exact byte/token estimates for each
   file using the selected model tokenizer?
5. Which completed implementation packs should become the initial golden
   compatibility corpus beyond RouteGroup v2 and SQL backends?
