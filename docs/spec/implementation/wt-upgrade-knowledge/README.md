# wt-upgrade-knowledge — Implementation Pack 4

> **Dispatch hold.** UK-02 is being corrected under
> `../planning-remediation-amendment.md`; this pack's former seal is superseded
> and no untouched batch is dispatchable pending independent review and reseal.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: **Remediation candidate — dispatch suspended**
Date: 2026-07-30
Pack ID: `wt-upgrade-knowledge`
Pack order: 4 of 6
Milestone: M5
Owner areas: Watchtower `src/commands/UpgradeCommand.ts`, `src/commands/SkillInstallCommand.ts`, `src/commands/VersionCommand.ts`, `src/foundation/UpgradePlanner.ts`, `src/foundation/MigrationRegistry.ts`, `src/foundation/MigrationSteps.ts`, `src/foundation/UpgradeApply.ts`, `src/foundation/UpgradeRecovery.ts`, `src/foundation/HostAdapters.ts`, `help/commands/`

## Purpose

This implementation directory is the execution owner for the Watchtower v1
upgrade-knowledge delivery. It exists to keep managed-software upgrades and
host knowledge installation disciplined across:

- an upgrade compatibility matrix and read-only preview planner
- a pure version-steps lane/session/index migration registry
- atomic upgrade apply, crash recovery, and guarded downgrade
- Codex, Cursor, and Claude host knowledge adapters
- CLI/runtime/knowledge/schema version reporting and conformance

Every batch preserves lane-owned values, operator-session history, and
committed implementation-pack identity. The pack must not silently overwrite
operator-owned configuration, session journals, lane config, or historical
state.

## Start Here

Read in this order:

1. `AGENTS.md`
2. `docs/spec/v1.md` — §11.5 (`wt upgrade`), §11.8 (`wt skill install`), §11.10 (`wt version`)
3. `docs/spec/v1-contracts.md` — §11 (locking, transactions, and recovery)
4. `docs/spec/v1-implementation-map.md` — §7 (Pack 4 specification)
5. `docs/spec/architecture.md` — §4.3 (foundation services)
6. `docs/spec/schemas/v1.schema.json`
7. `implementation-roadmap.md`
8. `implementation-tracker.md`
9. `implementation-quality-and-agent-rules.md`
10. `batch-reasoning-difficulty-ranking.md`
11. `work-batches/00-work-batch-index.md`
12. `review-batches/00-review-batch-index.md`

Then read the specific paired work/review batch brief and the real source
owners you will inspect or change.

## Mission

Update managed software and install host knowledge without changing lane-owned
values or history.

The accepted delivery must guarantee:

- a runtime/knowledge/schema compatibility matrix classifying every managed
  asset as changed, preserved, or in conflict
- read-only upgrade preview that never mutates lane state
- a pure version-steps migration registry preserving values, history, pins,
  and lifecycle identity
- staged rebuild of session indexes and policy baselines across schema versions
- manifest-last atomic switch with crash recovery that keeps the old runtime
  usable
- guarded downgrade requiring `--allow-downgrade` and backward-compatibility
  proof
- host-adapters for Codex, Cursor, and Claude that preview destination and
  scope, require explicit `--replace` in non-interactive mode, and record the
  installed knowledge version
- no false host-notification claims
- a `wt version` command reporting CLI, runtime, knowledge, and schema versions
  with two-version coexistence fixtures, collision proof, and failed-migration
  proof

## Canonical Pack Rules

- `src/foundation/UpgradePlanner.ts` owns the compatibility matrix and
  read-only preview; it never mutates lane state
- `src/foundation/MigrationRegistry.ts` and `migrationSteps.ts` own pure
  version-steps; no runtime execution, no session closure, no arbitrary pruning
- `src/foundation/UpgradeApply.ts` owns manifest-last atomic switch and crash
  recovery; `UpgradeRecovery.ts` owns post-crash validation and old-runtime
  usability
- `src/foundation/HostAdapters.ts` owns host-specific knowledge installation;
  no lane-specific state embeds in personal skill paths
- `src/commands/UpgradeCommand.ts` orchestrates preview/apply; `SkillInstallCommand.ts`
  orchestrates preview/replace/scope; `VersionCommand.ts` reports versions
- commands call foundation services and contain no duplicate path, parser, or
  runtime logic
- keep commands thin; upgrade foundation modules own the detailed algorithms
- `.local/` reports are required working artifacts but never committed
- `implementation-quality-and-agent-rules.md` is a hard acceptance gate, not
  advisory background

## Pack Owner Map

### Upgrade foundation owners

- `src/foundation/UpgradePlanner.ts` — compatibility matrix, changed/preserved/
  conflict classification, read-only preview
- `src/foundation/MigrationRegistry.ts` — version-step registry, dependency
  ordering
- `src/foundation/MigrationSteps.ts` — individual migration step execution,
  value/history/pin/lifecycle preservation
- `src/foundation/UpgradeApply.ts` — manifest-last atomic switch, link
  replacement, pointer update
- `src/foundation/UpgradeRecovery.ts` — crash recovery, old-runtime validation,
  downgrade guard

### Host adapter owners

- `src/foundation/HostAdapters.ts` — Codex/Cursor/Claude adapter factory,
  preview/replace/scope, version record

### Command owners

- `src/commands/UpgradeCommand.ts` — user-facing upgrade orchestration
- `src/commands/SkillInstallCommand.ts` — user-facing skill install orchestration
- `src/commands/VersionCommand.ts` — version reporting

### Help owners

- `help/commands/upgrade.hlp.json`
- `help/commands/skill-install.hlp.json`
- `help/commands/version.hlp.json`
- `help/help.json`

### Contract owners

- `src/contracts/` — upgrade plan, migration step, knowledge adapter, version
  report types

## Pack-Level Dependency Graph

```text
RM-01 → RT-02, LC-03, LC-05
  ├── UK-01: upgrade compatibility and preview planner (R4)
  │     └── UK-02: lane/session/index migration registry (R5)
  │           └── UK-03: atomic upgrade apply, recovery, downgrade guard (R5)
  │                 └── UK-05: version reporting and upgrade conformance (R3)
  └── RT-01, RT-02
        └── UK-04: Codex, Cursor, and Claude knowledge installers (R3)
              └── UK-05: version reporting and upgrade conformance (R3)
```

Batches execute in order UK-01 through UK-05. UK-04 may proceed in parallel
with UK-01/UK-02 after RT-01 and RT-02 are accepted, but converges at UK-05.
UK-05 is the integration gate and depends on both UK-03 and UK-04.

## Batch Artifact Authority

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

| Batch | Description | Work brief | Review brief | Status |
|-------|-------------|------------|--------------|--------|
| UK-01 | Upgrade compatibility and preview planner | [work](work-batches/UK-01-upgrade-compatibility-and-preview-planner.md) | [review](review-batches/UK-01-review-upgrade-compatibility-and-preview-planner.md) | ❌ Pending |
| UK-02 | Lane/session/index migration registry | [work](work-batches/UK-02-lane-session-index-migration-registry.md) | [review](review-batches/UK-02-review-lane-session-index-migration-registry.md) | ❌ Pending |
| UK-03 | Atomic upgrade apply, recovery, and downgrade guard | [work](work-batches/UK-03-atomic-upgrade-apply-recovery-and-downgrade-guard.md) | [review](review-batches/UK-03-review-atomic-upgrade-apply-recovery-and-downgrade-guard.md) | ❌ Pending |
| UK-04 | Codex, Cursor, and Claude knowledge installers | [work](work-batches/UK-04-codex-cursor-and-claude-knowledge-installers.md) | [review](review-batches/UK-04-review-codex-cursor-and-claude-knowledge-installers.md) | ❌ Pending |
| UK-05 | Version reporting and upgrade conformance | [work](work-batches/UK-05-version-reporting-and-upgrade-conformance.md) | [review](review-batches/UK-05-review-version-reporting-and-upgrade-conformance.md) | ❌ Pending |

## Reviewer Operating Standard

The upgrade-knowledge review briefs are acceptance instruments, not courtesy checks.

Every reviewer should be able to answer:

1. what exact owner now holds the behavior
2. whether lane-owned values, session history, pins, and lifecycle identities
   are preserved byte-for-byte
3. whether the upgrade is genuinely preview-only in default mode
4. whether the manifest-last rule holds at every crash point
5. whether old runtime remains usable after failed upgrade
6. whether downgrade is correctly guarded and fails without `--allow-downgrade`
7. whether host adapters preview destinations, respect `--replace`, and record
   installed versions without false notification claims
8. whether `wt version` reports all four version components (CLI, runtime,
   knowledge, schema) and proves two-version coexistence
9. whether proof was rerun rather than narrated
10. whether status docs still tell the truth after the accept/reject decision

Reviewers should use `implementation-quality-and-agent-rules.md#reviewer-hard-reject-checklist`
as a stop/go gate before discussing polish, naming, or minor cleanup.

## Mandatory Status-Doc Sync

Whenever a review accepts or rejects a batch, explicitly audit:

- `implementation-tracker.md`
- `implementation-roadmap.md`
- `docs/spec/v1.md` — command status markers (§10.3)
- `docs/spec/v1-implementation-map.md` — §7 pack status

Also audit these if the batch outcome changes what they claim:

- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/architecture.md`

If the outcome exposes a stale claim, update the document as part of the same
review/closure pass rather than leaving it as cleanup debt.

## Durable Artifact Rules

- implementation reports go under `.local/agent-reports/wt-upgrade-knowledge/`
- review reports go under `.local/agent-reports/wt-upgrade-knowledge/reviews/`
- correction briefs go under `review-batches/corrections/`
- `.local/` artifacts are never staged or committed

## Completion Meaning

This pack is not complete when code merely exists.

Completion for wt-upgrade-knowledge means:

- `wt upgrade` (default preview) produces a complete compatibility matrix
  classifying every managed asset as changed, preserved, or conflicted without
  mutating the lane
- `wt upgrade --apply` atomically switches managed links and manifests with
  the manifest-last rule, crash recovery that keeps the old runtime usable,
  and guarded downgrade behind `--allow-downgrade`
- lane-owned values, operator-session history, pins, and lifecycle identities
  survive migration steps intact
- `wt skill install` previews destinations for Codex, Cursor, and Claude,
  requires `--replace` in non-interactive contexts, records the installed
  knowledge version, and makes no false host-notification claim
- `wt version` reports CLI, runtime, knowledge, and schema versions with
  two-version coexistence and failed-migration-proof fixtures
- `wt doctor` extension verifies upgrade integrity, managed-link checksums,
  and migration registry consistency
- every upgrade path preserves lane-owned data and implementation-pack
  identity through the full apply/recovery cycle
