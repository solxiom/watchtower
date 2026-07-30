# wt-lane-lifecycle — Implementation Pack 3

Status: ⏳ Pack authoring — work/review briefs complete
Date: 2026-07-30
Owner: Watchtower v1
Pack ID: wt-lane-lifecycle
Depends on: wt-read-model, wt-runtime-distribution

## Purpose

This implementation directory is the execution owner for the Watchtower v1
lane lifecycle delivery pack. It creates and operates new managed implementation
lanes safely, covering init, watch, doctor, and scaffold removal.

It exists to deliver:

- init argument resolution and preflight planning
- pack acceptance, seal validation, and drift detection
- transactional lane layout with atomic commit/rollback
- Git-ignore binding, membership registration, and repository mutation
- coordinator/session baselines and initial pack indexes
- foreground watcher command with Ctrl-C/stdio compatibility
- comprehensive doctor diagnostic registry (pass/warn/fail/skip)
- end-to-end lifecycle integration and scaffold artifact removal

## Start Here

Read in this order:

1. `AGENTS.md`
2. `docs/spec/v1.md`
3. `docs/spec/v1-contracts.md`
4. `docs/spec/v1-implementation-map.md` (esp. sections 6, 10-14)
5. `docs/spec/architecture.md`
6. `docs/spec/schemas/v1.schema.json`
7. `implementation-roadmap.md`
8. `implementation-tracker.md`
9. `implementation-quality-and-agent-rules.md`
10. `batch-reasoning-difficulty-ranking.md`
11. `work-batches/00-work-batch-index.md`
12. `review-batches/00-review-batch-index.md`

Then read the specific paired work/review batch brief and the real source
owners you will inspect or change.

## Prompt-Pack Maturity Guarantees

The 8 implementation batches and 8 paired review batches have a common
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

The authoritative reasoning-class matrix, source-size bands, absolute 400-line
ceiling, responsibility gates, and prompt-integrity policy live in
`implementation-quality-and-agent-rules.md`. A batch prompt that conflicts with
that file must be corrected before the batch starts.

## Batch Artifact Authority

The lane has one authoritative artifact role. The implementation map
(`docs/spec/v1-implementation-map.md` sections 6, 10-14) is the normative scope
document. The work and review briefs in this directory are the executable
contracts for implementation and acceptance agents.

| Batch | Phase | Work brief | Review brief | Current status |
| --- | --- | --- | --- | --- |
| LC-01 | Init foundation | [work](work-batches/LC-01-init-argument-resolution-and-preflight-plan.md) | [review](review-batches/LC-01-review-init-argument-resolution-and-preflight-plan.md) | ❌ Pending |
| LC-02 | Pack validation | [work](work-batches/LC-02-pack-acceptance-seal-and-drift-validation.md) | [review](review-batches/LC-02-review-pack-acceptance-seal-and-drift-validation.md) | ❌ Pending |
| LC-03 | Lane store | [work](work-batches/LC-03-transactional-lane-layout-and-manifests.md) | [review](review-batches/LC-03-review-transactional-lane-layout-and-manifests.md) | ❌ Pending |
| LC-04 | Bindings/registration | [work](work-batches/LC-04-bindings-gitignore-and-membership-registration.md) | [review](review-batches/LC-04-review-bindings-gitignore-and-membership-registration.md) | ❌ Pending |
| LC-05 | Coordinator bootstrap | [work](work-batches/LC-05-coordinator-session-baselines-and-pack-index.md) | [review](review-batches/LC-05-review-coordinator-session-baselines-and-pack-index.md) | ❌ Pending |
| LC-06 | Watch command | [work](work-batches/LC-06-foreground-watch-command.md) | [review](review-batches/LC-06-review-foreground-watch-command.md) | ❌ Pending |
| LC-07 | Doctor registry | [work](work-batches/LC-07-comprehensive-doctor-registry.md) | [review](review-batches/LC-07-review-comprehensive-doctor-registry.md) | ❌ Pending |
| LC-08 | Integration/scaffold | [work](work-batches/LC-08-lifecycle-integration-and-scaffold-removal.md) | [review](review-batches/LC-08-review-lifecycle-integration-and-scaffold-removal.md) | ❌ Pending |

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

Deliver lane creation, operation, and diagnosis as a transactional, safe,
spec-verified lifecycle. The operator must be able to:

- preview and create a valid new implementation lane
- bind repositories with safe concurrency defaults
- run the watcher in the foreground with Ctrl-C compatibility
- run comprehensive doctor checks (pass/warn/fail/skip)
- trust that init is transactional and rolls back on any write failure
- trust that the CLI removes all scaffold artifacts on completion

The accepted delivery must guarantee:

- init argument resolution validates prefix/scope/routing without destination creation
- JSON Schema and RFC 8785 validate packs with drift reason matrix
- transactional lane layout with adjacent staging and atomic commit point
- lock-ordered binding, conditional Git-ignore rollback, and idempotent registration
- finite policy seeding, correct provenance, and sealed pack indexes
- foreground watcher with preflight, exec behavior, stdout/Ctrl-C
- comprehensive pass/warn/fail/skip doctor checks covering tools, accounts,
  packs, policies, indexes, and permissions
- init-to-status-to-watch/doctor end-to-end proof with rollback
- safe removal of all hello/scaffold artifacts

## Canonical Lane Rules

- `src/commands/InitCommand.ts` owns init argument validation and user-facing
  orchestration; it calls foundation services
- `src/foundation/init-planner.ts` owns preflight plan construction
- `src/foundation/pack-consumer.ts` and `pack-seal.ts` own pack validation
  and seal reproduction
- `src/foundation/lane-store.ts` and `transactional-writer.ts` own layout
  and transactional commit
- `src/foundation/binding-mutator.ts` and `membership-registrar.ts` own
  repository/index mutation
- `src/foundation/coordinator-baseline.ts` and `pack-index-bootstrap.ts`
  own policy/index seeding
- `src/commands/WatchCommand.ts` owns watch preflight and invocation
- `src/foundation/doctor-registry.ts` and `src/commands/DoctorCommand.ts`
  own diagnostic checks and orchestration
- keep commands thin and delegate to foundation services
- apply the repo file-size, helper-capsule, naming, and module-size rules
- `.local/` reports are required working artifacts but never committed
- `implementation-quality-and-agent-rules.md` is a hard acceptance gate, not
  advisory background

## Lane Owner Map

This lane should be read with an explicit owner map in mind.

### Init owner

- `src/foundation/init-planner.ts` — preflight plan, argument validation,
  prefix/scope/routing checks
- `src/commands/InitCommand.ts` — CLI orchestration, rendering, dry-run

### Pack consumer owners

- `src/foundation/pack-consumer.ts` — JSON Schema validation, file-set checks
- `src/foundation/pack-seal.ts` — RFC 8785 seal reproduction, drift matrix

### Lane store owners

- `src/foundation/lane-store.ts` — lane directory layout, manifest generation
- `src/foundation/transactional-writer.ts` — adjacent staging, atomic rename,
  fsync, rollback on failure

### Binding owners

- `src/foundation/binding-mutator.ts` — lock order, conditional Git-ignore
  write/rollback
- `src/foundation/membership-registrar.ts` — post-commit idempotent index
  registration

### Coordinator bootstrap owners

- `src/foundation/coordinator-baseline.ts` — seed finite policies with
  correct provenance
- `src/foundation/pack-index-bootstrap.ts` — sealed index construction

### Watch owners

- `src/commands/WatchCommand.ts` — preflight, exec watcher, stdio/signal
  forwarding

### Doctor owners

- `src/foundation/doctor-registry.ts` — composable diagnostic check definitions
- `src/commands/DoctorCommand.ts` — CLI orchestration, rendering grouped results

### Integration owners

- `spec/e2e/lifecycle.spec.ts` — end-to-end init→status→watch/doctor fixture
- `help/commands/` — help fragments for init, watch, doctor
- `src/commands/HelloCommand.ts` — removed in LC-08

## Implementation-Phase Decision Clarifications

The specs intentionally leave some details open. For this implementation lane,
use the following clarifications so batch work and review remain aligned:

1. **Drift is model-free.** No model classifies drift during init. The drift
   reason matrix (`PACK_BYTES_CHANGED`, `PACK_FILESET_CHANGED`,
   `ACCEPTED_INPUT_CHANGED`, etc.) is purely mechanical.
2. **Staging is adjacent.** Transactional layout uses a staging directory
   adjacent to the final lane directory on the same filesystem. No temp
   directory outside the control home is used for staging.
3. **Lock order is fixed.** The lock acquisition order is: data-root catalog/
   membership-index lock, then lane lock, then operator-session lock, then
   projection/index publication lock. No inversion is permitted.
4. **Membership registration is idempotent.** Post-commit registration is
   retried on failure; a valid lane without index registration is discoverable
   from its control home but not from secondary repositories.
5. **Baselines are finite.** Coordinator/session baselines seed finite policy
   defaults from the shipping-policy-baseline contract. No model or
   full-pack fallback occurs.
6. **Pack index is sealed.** The pack index is deterministic, model-free,
   reproducible, and matched to the active pack seal. No full-pack scan.
7. **Watch is foreground only.** No daemonization. The watcher execs with
   inherited stdio and forwards signals.
8. **Doctor is read-only.** No repair, rebuild, or migration in v1. Repair
   must be an explicit init, index, retention, or upgrade action.
9. **Scaffold removal is safe.** Hello artifacts are removed only after the
   first real command and build smoke test exist and pass. No partial removal.

## Reviewer Operating Standard

The lane lifecycle review briefs are acceptance instruments, not courtesy checks.

Every reviewer should be able to answer:

1. what exact owner now holds the behavior
2. whether init is truly transactional (fails at any stage, rolls back cleanly)
3. whether pack validation matches the schema and seal contract exactly
4. whether lock ordering and membership registration are unimpeachable
5. whether the watcher runs in foreground without daemonization
6. whether doctor checks are comprehensive and read-only
7. whether proof was rerun rather than narrated
8. whether the status docs still tell the truth after the accept/reject decision

Reviewers should use
`implementation-quality-and-agent-rules.md#reviewer-hard-reject-checklist`
as a stop/go gate before discussing polish, naming, or minor cleanup.

## Mandatory Status-Doc Sync

Whenever a review accepts or rejects a batch, explicitly audit:

- `implementation-tracker.md`
- `implementation-roadmap.md`
- `docs/spec/v1.md` (status markers for init, watch, doctor)

Also audit these if the batch outcome changes what they claim:

- `docs/spec/v1-implementation-map.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/architecture.md`

If the outcome exposes a stale claim, update the document as part of the same
review/closure pass rather than leaving it as cleanup debt.

## Durable Artifact Rules

- implementation reports go under `.local/agent-reports/wt-lane-lifecycle/`
- review reports go under `.local/agent-reports/wt-lane-lifecycle/reviews/`
- correction briefs go under `review-batches/corrections/`
- `.local/` artifacts are never staged or committed

## Completion Meaning

This lane is not complete when code merely exists.

Completion for wt-lane-lifecycle means:

- init preflight validates prefix, scope, routing without creating any destination
- pack JSON Schema validation and RFC 8785 seal reproduction are proven against
  fixtures
- transactional lane layout stages adjacently, commits atomically, and rolls back
  on every write/fsync/rename failure
- bindings use correct lock order, Git-ignore rollback is conditional/digest-aware,
  and membership registration is idempotent
- coordinator/session baselines seed finite policies with correct provenance
- pack index is deterministic, model-free, seal-bound
- foreground watcher execs with preflight, stdio forwarding, and Ctrl-C
- doctor checks are comprehensive, grouped, read-only, and produce
  pass/warn/fail/skip results
- init→status→watch/doctor end-to-end passes with rollback proof
- all hello artifacts are removed safely after real command paths exist
- `nvb build` and all Jasmine suites pass
- no build, dist, node_modules, `.nira/local`, or `.watchtower` artifact is
  committed
