# Watchtower v1 Release — Implementation Pack 6

> **Accepted bootstrap implementation artifact.** Dispatch is authorized only under the
> accepted dependency DAG and paired independent batch-review gates. Product-created
> lanes remain subject to the structured pack acceptance and seal contract in
> `docs/spec/v1-contracts.md`.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: **Accepted and bootstrap-sealed — implementation dispatch authorized**
Target release: `1.0.0`
Pack order: 6 of 6
Work/review pairs: 4
Milestone: M7
Last updated: 2026-07-30

## Purpose

This is the sixth and final implementation pack for the Watchtower v1 CLI.
It does not add product features. It qualifies the assembled product end to
end, produces release evidence, and creates the final acceptance gate.

The pack owns:

- end-to-end fresh-lane implementer→reviewer→accept trial (REL-01)
- concurrent and multi-repository recovery trials (REL-02)
- security, ownership, performance, and package qualification (REL-03)
- documentation consistency and release gate (REL-04)

## Start Here

Read in this order:

1. `AGENTS.md`
2. `docs/spec/v1-implementation-map.md` — especially sections 9, 10–14
3. `docs/spec/v1.md` — especially §17 release acceptance criteria
4. `docs/spec/v1-contracts.md`
5. `docs/spec/architecture.md`
6. `docs/spec/implementation/wt-v1-release/README.md` (this file)
7. `implementation-roadmap.md`
8. `implementation-tracker.md`
9. `implementation-quality-and-agent-rules.md`
10. `batch-reasoning-difficulty-ranking.md`
11. `work-batches/README.md`
12. `work-batches/00-work-batch-index.md`
13. `review-batches/README.md`
14. `review-batches/00-review-batch-index.md`

Then read the specific paired work/review batch brief and the real source
owners you will inspect or change.

## Prompt-Pack Maturity Guarantees

The 4 implementation batches and 4 paired review batches have a common
execution floor. Every durable brief and launch prompt must preserve, in
addition to its batch-specific scope:

- the declared reasoning class and capability-based agent selection rule
- source-first dependency and ownership mapping before edits or acceptance
- explicit negative-path, compatibility, concurrency, and unsupported-state
  reasoning appropriate to the batch
- clean-code and module-size gates that reject ball-of-mud growth, god objects,
  giant coordinators, generic helper bags, and unjustified oversized modules
- exact focused, regression, architecture, real-engine, and failure-injection
  evidence required by the governing acceptance cases
- protected user/ownership instructions in operator launch prompts
- tracker, roadmap, local-report, correction, handoff, and commit authority
  instructions sufficient for an agent receiving the prompt without prior chat
  context

The common rules are additive. Batch-specific details remain mandatory even
when a shared rule covers the same topic. Prompt maintainers may expand these
artifacts, but must not shorten a safety section into a link or summary. Wrong
claims and broken paths must be replaced with equally detailed or more detailed
correct instructions.

The authoritative reasoning-class matrix, source-size bands, category-specific hard-reject
ceilings, responsibility gates, and prompt-integrity policy live in
`implementation-quality-and-agent-rules.md`. A batch prompt that conflicts with
that file must be corrected before the batch starts.

## Batch Artifact Authority

The lane has one authoritative artifact role per batch. The canonical
implementation plan in `docs/spec/v1-implementation-map.md` remains the
normative scope document for all packs. The work and review briefs in this
directory are the executable contracts for implementation and acceptance agents.

| Batch | Phase | Work brief | Review brief | Current status |
|-------|-------|-----------|-------------|----------------|
| REL-01 | Release qualification | [work](work-batches/REL-01-fresh-lane-implementer-reviewer-accept-trial.md) | [review](review-batches/REL-01-review-fresh-lane-implementer-reviewer-accept-trial.md) | ❌ Pending |
| REL-02 | Release qualification | [work](work-batches/REL-02-concurrent-and-multi-repository-recovery-trials.md) | [review](review-batches/REL-02-review-concurrent-and-multi-repository-recovery-trials.md) | ❌ Pending |
| REL-03 | Release qualification | [work](work-batches/REL-03-security-ownership-performance-and-package-qualification.md) | [review](review-batches/REL-03-review-security-ownership-performance-and-package-qualification.md) | ❌ Pending |
| REL-04 | Release qualification | [work](work-batches/REL-04-documentation-consistency-and-release-gate.md) | [review](review-batches/REL-04-review-documentation-consistency-and-release-gate.md) | ❌ Pending |

The executable implementation contract for each batch is the complete set of:

1. the canonical work brief;
2. its paired implementation agent launch prompt;
3. the governing specifications;
4. the lane quality rules; and
5. accepted outcomes and handoffs from prerequisite batches.

The executable review contract for each batch is the complete set of:

1. the canonical review brief;
2. its paired review agent launch prompt;
3. the paired work contract above;
4. the implementation report and real changed source; and
5. the governing specifications and quality rules.

## Mission

Qualify the assembled Watchtower v1 product against every release acceptance
criterion in `v1.md §17`. Do not add features. Produce end-to-end evidence,
system acceptance fixtures, security/performance/package qualification, and
documentation consistency. Close the release gate.

## Canonical Lane Rules

- Pack 1 (`wt-read-model`) through Pack 5 (`wt-coordinator-automation`) must
  be accepted before any REL batch begins.
- REL batches are sequential: REL-01 → REL-02 → REL-03 → REL-04.
- REL-04 audits documentation; it must not retroactively invent missing help
  fragments or specification text.
- No release evidence may be derived from narrative alone. Every acceptance
  criterion in §17 must trace to a tested, reproducible observation.
- No security or performance claim may be made without reproducible fixture
  evidence.
- `.local/` reports are required working artifacts but never committed.
- `implementation-quality-and-agent-rules.md` is a hard acceptance gate, not
  advisory background.

## Reviewer Operating Standard

The v1 release review briefs are acceptance instruments for the assembled
product, not courtesy checks.

Every reviewer should be able to answer:

1. whether every §17 acceptance criterion has current,
   independently reproducible evidence
2. whether security and performance claims are backed by fixture evidence
   rather than narration
3. whether the globally installed package completes one full managed-lane
   cycle without copying the runtime tree
4. whether all help fragments, docs, and the spec agree on every shipped
   command
5. whether any scaffold, generated, or local artifact appears in the
   committed tree
6. whether the status docs still tell the truth after the accept/reject
   decision

Reviewers should use
`implementation-quality-and-agent-rules.md#reviewer-hard-reject-checklist`
as a stop/go gate before discussing polish, naming, or minor cleanup.

## Mandatory Status-Doc Sync

Whenever a review accepts or rejects a batch, explicitly audit:

- `implementation-tracker.md`
- `implementation-roadmap.md`
- `docs/spec/v1-implementation-map.md` (Pack 6 section)

Also audit these if the batch outcome changes what they claim:

- `docs/spec/v1.md` (acceptance criterion status)
- `docs/spec/architecture.md`
- `docs/spec/implementation/wt-v1-release/README.md`
- `docs/spec/implementation/wt-v1-release/batch-reasoning-difficulty-ranking.md`

If the outcome exposes a stale claim, update the document as part of the same
review/closure pass rather than leaving it as cleanup debt.

## Durable Artifact Rules

- implementation reports go under `.local/agent-reports/watchtower-release/`
- review reports go under `.local/agent-reports/watchtower-release/reviews/`
- correction briefs go under `review-batches/corrections/`
- `.local/` artifacts are never staged or committed

## Completion Meaning

This pack is not complete when code merely exists.

Completion for `wt-v1-release` means:

- a fresh globally installed `wt` package initiates a lane, dispatches work,
  hands off to a reviewer, records independent acceptance, and publishes
  acceptance commits — in one end-to-end documented cycle
- two isolated lanes coexist without slug or state collision; a
  multi-repository commit set is verified and partially pushed with
  documented recovery
- traversal, config, permission, manifest, and global install proof passes
- every §17 acceptance criterion has current, reproducible evidence
  traceable to the batch that produced it
- the committed package contains no scaffold, generated, dist, node_modules,
  `.nira/local`, or `.watchtower` artifact
- REL-04 records the final release verdict
