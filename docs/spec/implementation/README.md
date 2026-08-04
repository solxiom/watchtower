# Watchtower v1 — Implementation Packs

> **Active 74-batch revision.** Exact pack revision
> `f02517c4df43c969ad670049be2825d08da69f82` received independent
> `ACCEPT_PACKS` and was atomically activated with its six reproduced seals.
> Dispatch remains constrained by the accepted dependency DAG, resource claims,
> reasoning floors, and paired independent review gates.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: **Synchronized 74-batch packs accepted and active**
Superseded acceptance instrument: `pack-acceptance-review.md`
Remediation authority: `planning-remediation-amendment.md`
Date: 2026-07-31

## Lane Purpose

This directory contains six accepted implementation packs governing
construction of Watchtower v1 (`1.0.0`). Each pack contains work batches,
paired review batches, launch prompts, and supporting documents for one bounded
product milestone.

These are bootstrap construction packs, not inputs to the not-yet-implemented
`wt init` consumer. This one-time bootstrap distinction does not weaken the v1
product contract: every lane initialized by Watchtower requires
`implementation-pack.json`, `pack-acceptance.json`, and
`implementation-pack.lock.json` exactly as specified in `v1-contracts.md`.

Normative behavior remains in `../v1.md`, `../v1-contracts.md`,
`../schemas/v1.schema.json`, `../architecture.md`,
`../nirvana-integration-architecture.md`,
`../architecture/foundation-module-architecture.md`,
`../coordinator-automation.md`, `../operator-session.md`, and
`../cli-session.md`, `../tui-operational-experience.md`, together with
`../../development/engineering-and-review-standard.md`. These packs translate
those specifications into
actionable implementation contracts; they do not override or reinterpret
the product specification.

Implementation architecture specs (foundation layout, barrels, remediation)
live under [../architecture/](../architecture/).

## Lane Owner Maps

| Concern | Owner | Forbidden |
|---------|-------|-----------|
| Pack acceptance | Reviewer batch agent | Implementation agent commit |
| Product authority | Normative spec documents | Pack-local interpretation |
| Repository gate | `AGENTS.md`, `src/` conventions | Custom build/config in pack root |
| Quality contract | `implementation-quality-and-agent-rules.md` per pack | Ad-hoc style in batch briefs |
| Tracker truth | `implementation-tracker.md` per pack | Oral or commit-message-only claims |

## Implementation Packs

| Order | Pack | Milestones | Work/review pairs | Directory |
|------:|------|------------|------------------:|-----------|
| 1 | `wt-read-model` | M1 | 14 | `wt-read-model/` |
| 2 | `wt-runtime-distribution` | M2 | 10 | `wt-runtime-distribution/` |
| 3 | `wt-lane-lifecycle` | M3–M4 | 10 | `wt-lane-lifecycle/` |
| 4 | `wt-upgrade-knowledge` | M5 | 5 | `wt-upgrade-knowledge/` |
| 5 | `wt-coordinator-automation` | M6 | 31 | `wt-coordinator-automation/` |
| 6 | `wt-v1-release` | M7 | 4 | `wt-v1-release/` |
| | **Total** | | **74 work + 74 review** | |

## Pack Acceptance Order

```text
wt-read-model ───────────────┐
  ├─ wt-runtime-distribution ├─ wt-lane-lifecycle
  │                          │       ├─ wt-upgrade-knowledge
  │                          └───────┴─ wt-coordinator-automation
  └───────────────────────────────────────────────┐
                                                  ▼
                                            wt-v1-release
```

Each pack has an independent exit gate, but scheduling is batch-DAG driven
rather than blanket pack-serial. A later-pack batch may begin only when every
dependency named for that batch is independently accepted. It may integrate
only the accepted interfaces it depends on; it must not assume the remainder
of a predecessor pack is accepted or stable.

## Per-Pack Directory Layout

```
<pack>/
├── README.md
├── implementation-roadmap.md
├── implementation-tracker.md
├── implementation-quality-and-agent-rules.md
├── batch-reasoning-difficulty-ranking.md
├── work-batches/
│   ├── README.md
│   ├── 00-work-batch-index.md
│   ├── <ID>-<name>.md
│   └── <ID>-<name>-agent-launch-prompt.md
└── review-batches/
    ├── README.md
    ├── 00-review-batch-index.md
    ├── <ID>-review-<name>.md
    ├── <ID>-review-<name>-agent-launch-prompt.md
    └── corrections/
        └── README.md
```

## Artifact Authority

| Artifact | Owner | Commit authority |
|----------|-------|------------------|
| Work brief | Pack author (operator) | Reviewer acceptance commit |
| Work launch prompt | Pack author (operator) | Reviewer acceptance commit |
| Review brief | Pack author (operator) | Reviewer acceptance commit |
| Review launch prompt | Pack author (operator) | Reviewer acceptance commit |
| Implementation report | Implementation agent | Never committed (`.local/`) |
| Review report | Review agent | Never committed (`.local/`) |
| Correction brief | Review agent | Reviewer acceptance commit |

## Storage Architecture

V1 uses embedded SQLite only for disposable lane-local derived indexes and
projections. Canonical authority remains in sealed packs and append-only
files. Raw SQLite bytes never define semantic identity; canonical logical
rows and source checkpoints do. Commands, agents, policy, and shell scripts
cannot issue SQL or treat a derived database as authority.

Pack 1 includes `DB-01`, which selects and proves one conforming SQLite
driver. Failure blocks derived-store implementation and requires a spec
amendment — there is no silent JSON-shard fallback. Packs 2, 5, and 6
integrate the proven driver into distribution, coordinator indexes, session
memory, and release qualification respectively.

## Implementation-Phase Clarifications

1. The v1 spec's `docs/spec/v1.md` is the normative product authority. Pack
   briefs may add bounded implementation clarifications but may not silently
   invent public behavior.
2. If a batch exposes a missing product decision, the affected batch stops
   and raises a specification amendment. The pack does not proceed until the
   spec resolves the question.
3. Execute the dependency waves in `docs/spec/v1-implementation-map.md §10`.
   Cross-pack work is permitted at the exact accepted predecessor-batch
   boundaries named there; pack directory order is not an extra dependency and
   does not override the DAG.
4. Corrections retain the same work/review identity and append a correction
   number; they are not preallocated as additional batches.
5. Cross-pack compatibility surfaces require reproducible golden evidence.
6. Every command-owning batch updates its help fragment and the relevant
   specification status marker.
7. Foundation-only batches update architecture or contract documentation when
   an implementation clarification affects module boundaries.

## Completion Meaning

The implementation delivery is complete only when:
- all 74 work batches have matching independent review outcomes
- all six bootstrap implementation packs remain seal-valid
- every cross-pack compatibility surface has reproducible golden evidence
- every v1 release criterion traces to an accepted batch and proof
- no critical specification amendment remains unresolved
- the committed package contains no scaffold-only command or generated/local artifact

Completion of batch count alone is not v1 acceptance. The reviewer-owned
evidence and release gates remain authoritative.
