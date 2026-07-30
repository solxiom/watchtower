# wt-upgrade-knowledge Implementation Roadmap

> **Draft pack-authoring artifact.** This document is not a seal, acceptance
> record, or authority to initialize a lane. Before pack acceptance, reconcile
> it with `docs/spec/v1-implementation-map.md`,
> `docs/development/engineering-and-review-standard.md`, and
> `docs/spec/nirvana-integration-architecture.md`. The normative precedence in
> `docs/spec/v1-contracts.md` governs every conflict.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: ❌ Pending — pack design complete, implementation not started
Date: 2026-07-30
Owner areas: Watchtower upgrade foundation, host adapters, upgrade/skill-install/version commands

Parent documents:

- `docs/spec/implementation/wt-upgrade-knowledge/README.md`
- `docs/spec/v1.md` — §11.5 (`wt upgrade`), §11.8 (`wt skill install`), §11.10 (`wt version`)
- `docs/spec/v1-contracts.md` — §11 (locking, transactions, and recovery)
- `docs/spec/v1-implementation-map.md` — §7

## Mission

Update managed software and install host knowledge without changing lane-owned
values or history.

The delivery must guarantee:

- a runtime/knowledge/schema compatibility matrix that classifies every managed
  asset as changed, preserved, or in conflict
- read-only upgrade preview that never mutates lane state, link targets, or
  install manifests
- a pure version-steps migration registry with staged rebuild of session
  indexes, policy baselines, and coordinator journals preserving values,
  history, pin references, and lifecycle identities
- manifest-last atomic switch: no new manifest is written until every staged
  asset passes validation, fsync, and checksum verification
- crash recovery that restores the authoritative previous pointer and keeps
  the old runtime accessible and runnable
- guarded downgrade requiring explicit `--allow-downgrade` with lane-schema
  backward-compatibility proof; failure must stop before any mutation
- host adapters for Codex, Cursor, and Claude that preview destination and
  scope, require explicit `--replace` in non-interactive mode, and record
  the installed knowledge version
- no false claim that a host notification is configured or operational
- a `wt version` command producing CLI, runtime, knowledge, and schema
  versions with two-version coexistence fixtures, collision proof, and
  failed-migration proof

## Non-Negotiable Delivery Rules

- Preview is default. Apply requires `--apply`. No lane mutation occurs
  without explicit operator confirmation.
- Manifest-last rule: the install manifest (`install.json`) is the final
  write. An interrupted upgrade before manifest write leaves the old binding
  authoritative and the new staged assets unused.
- Old runtime must remain accessible and invocable after a failed or
  interrupted upgrade. A stale pointer is safer than a broken one.
- Downgrade must be explicitly requested (`--allow-downgrade`) and must fail
  when the lane schema version has features not supported by the target
  runtime.
- Lane-owned values, operator-session journals, pins, lifecycle states, and
  config files are never overwritten by upgrade.
- Migration steps are pure version functions. They transform one well-known
  schema version to the next. They do not execute runtime actions, close
  sessions, prune content, or change lifecycle states.
- Host adapters are preview-first. Non-interactive install requires `--replace`.
  No lane-specific state is embedded in personal skill paths.
- Version reporting must derive all four components (CLI, runtime, knowledge,
  schema) from verifiable sources, not hardcoded constants.
- `--json` output for `version` and `upgrade` must match the schema bundle
  (`versionReport`, `upgradePlan`).
- Upgrade foundation modules are independent of host-adapters and version
  reporting; no circular dependency.
- Keep front doors, commands, and renderers thin.
- Do not commit `.local/` artifacts.

## Delivery Phases

### Phase 1: Upgrade compatibility and preview planner (UK-01)

Goal:

- establish the upgrade foundation: a pure read-only compatibility matrix
  that classifies every managed asset without mutating the lane

Batch UK-01 — Upgrade compatibility and preview planner (R4)

Status: ❌ Pending

Acceptance snapshot (target):

- `UpgradePlanner.ts` ingested from lane manifests and packaged runtime/
  knowledge manifests
- three-way comparison: current install manifest, new runtime manifest,
  new knowledge manifest
- every managed asset classified as: `changed` (bytes differ), `preserved`
  (identical), `conflict` (lane-owned path replaced by unrecognized regular
  file), `added` (new in target), `removed` (absent in target)
- lane-schema version compatibility check against runtime manifest's
  declared compatible schema versions
- knowledge-versus-runtime compatibility check against the knowledge manifest's
  declared compatible runtime range
- complete preview plan as an array of classified paths with old/new checksums
- preview plan never mutates lane state, links, or manifests
- `UpgradeCommand` invokes the planner, renders the preview as human or JSON
  (`upgradePlan` schema), and exits with zero unless an unmanaged conflict is
  found (exit 5)
- `--json` output validates against `$defs.upgradePlan`
- `--to=<version>` selects a specific installed or package-provided target
- `--dry-run` is identical to default preview behavior (no-op)
- unit tests cover: no-change upgrade, added assets, removed assets, changed
  assets, lane-owned conflict detection, incompatible schema version, missing
  target runtime, and every classification edge case

### Phase 2: Lane/session/index migration registry (UK-02)

Goal:

- create a pure version-steps migration system that preserves lane-owned
  values, session history, operator pins, and lifecycle identities across
  schema upgrades

Batch UK-02 — Lane/session/index migration registry (R5)

Status: ❌ Pending — depends on UK-01 accepted

Acceptance snapshot (target):

- `MigrationRegistry.ts` registers migration step functions by source and
  target schema version
- `migrationSteps.ts` owns individual step implementations; each step is a
  pure function from old state to new state
- step ordering uses a dependency graph: every adjacent version pair has at
  most one migration step; chains compose from current version to target
  version
- migration steps preserve: lane-owned `lane.config.env` values, operator-
  session journals (full turn text), session pins, session lifecycle
  identities, scoped holds, amendment requests, budget grants, and lane
  state
- staged rebuild: policy baselines, session indexes, and coordinator
  journals are rebuilt from durable source data, never from prior indexes
- migration steps never: execute runtime actions, close sessions, prune
  session content, change lifecycle states, or modify committed implementation
  packs
- a step that cannot be applied to the lane's current schema version produces
  a deterministic error and blocks the upgrade chain
- unit tests cover: every migration step independently, step composition,
  missing intermediate step, value preservation for every lane-owned
  artifact class, session-index rebuild correctness, and policy-baseline
  migration

### Phase 3: Atomic upgrade apply, recovery, and downgrade guard (UK-03)

Goal:

- implement the manifest-last atomic switch with crash recovery that keeps
  the old runtime usable, and a guarded downgrade path

Batch UK-03 — Atomic upgrade apply, recovery, and downgrade guard (R5)

Status: ❌ Pending — depends on UK-02 accepted

Acceptance snapshot (target):

- `UpgradeApply.ts` stages all new managed assets alongside the old ones
  without overwriting them until the final atomic pointer switch
- staging directory adjacent to the lane directory; atomic rename for each
  managed link
- every new managed asset validated against the packaged runtime manifest
  checksum before staging
- manifest (`install.json`) written last after all assets fsynced
- `UpgradeRecovery.ts` detects an incomplete upgrade (staging artifacts
  present but manifest not updated) and restores the authoritative previous
  manifest
- old runtime links remain intact and the old runtime is invocable after
  recovery
- downgrade guard: `--allow-downgrade` required; pre-check verifies the
  lane schema version is declared backward-compatible by the target
  runtime manifest; failure stops before any mutation and reports exit 5
- downgrade follows the same manifest-last staging pattern as upgrade
- unit and integration tests cover: successful upgrade, interrupted upgrade
  at every write point (before first link, after first link, before manifest,
  after manifest but before verification), successful recovery at each
  point, downgrade refusal without flag, incompatible downgrade refusal,
  downgrade with flag on compatible target, checksum mismatch during staging

### Phase 4: Codex, Cursor, and Claude knowledge installers (UK-04)

Goal:

- implement host adapters that preview and install the bundled knowledge pack
  for supported agent hosts without false notification claims

Batch UK-04 — Codex, Cursor, and Claude knowledge installers (R3)

Status: ❌ Pending — depends on RT-01, RT-02 accepted

Acceptance snapshot (target):

- `hostAdapters.ts` provides a factory that resolves the correct adapter
  for a given host identifier: `codex`, `cursor`, `claude`
- each adapter previews: source knowledge location, destination host-specific
  path, scope of files to write, and any existing files that would be replaced
- `--scope=<scope>` limits install to a subset of the knowledge pack (e.g.,
  `skill-only`, `guides-only`)
- `SkillInstallCommand` renders the preview as human or JSON, requires
  `--replace` for non-interactive contexts, and records the installed
  knowledge version in a host-specific location
- installed knowledge version is recorded: for Codex, in its skill manifest;
  for Cursor, in `.cursorrules` or equivalent; for Claude, in its skill
  descriptor
- no lane-specific state (home paths, lane IDs, tmux prefixes, repository
  bindings) is embedded in the installed skill
- no claim is made that a host notification is configured or verified;
  Watchtower records only that the knowledge files were placed
- `--dry-run` performs the full preview without writing
- unit tests cover: each adapter preview output, `--replace` refusal in
  non-interactive mode, installed version recording for each host, scope
  filtering, existing-file detection, destination-path validation

### Phase 5: Version reporting and upgrade conformance (UK-05)

Goal:

- deliver the `wt version` command, comprehensive upgrade integration proof,
  and help/documentation closure

Batch UK-05 — Version reporting and upgrade conformance (R3)

Status: ❌ Pending — depends on UK-03, UK-04 accepted

Acceptance snapshot (target):

- `VersionCommand` reads: CLI version from `package.json`, runtime version
  from the lane's `install.json` or the default packaged runtime manifest,
  knowledge version from the knowledge manifest, schema version from
  `lane.json`
- when no lane is selected, `wt version` reports the CLI version plus the
  highest available packaged runtime, knowledge, and schema versions
- when a lane is selected via `--lane=`, `wt version` reports the lane's
  actual installed versions
- `--json` produces a `versionReport` matching the schema bundle
- two-version coexistence fixture: stage two runtime versions, verify both
  are reported as available, verify a lane bound to one reports that one
- collision fixture: attempt upgrade on a lane with an unmanaged collision,
  verify the collision is reported and no mutation occurs
- failed migration fixture: simulate a migration step that fails, verify
  the upgrade stops with a recovery state and the old runtime remains usable
- help fragments: `upgrade.hlp.json`, `skill-install.hlp.json`,
  `version.hlp.json` registered in `help/help.json`
- all help text matches implemented behavior; no scaffold-only content
- `nvb build` passes
- relevant Jasmine specs pass

## Sequencing Rule

- UK-01 must be accepted before UK-02
- UK-02 must be accepted before UK-03
- UK-03 must be accepted before the UK-05 integration proof that depends on
  upgrade apply/recovery
- UK-04 may begin after RT-01 and RT-02 are accepted and may proceed in
  parallel with UK-01/UK-02
- UK-05 depends on UK-03 and UK-04 both being accepted
- No batch may begin before its stated predecessor batches are accepted

## Recommended Honest Execution Order

1. UK-01: read only the current and target manifests, establish the
   compatibility matrix, and implement the upgrade preview command
2. UK-02: register all v1 migration steps, implement staged rebuild for
   session indexes and policy baselines, prove value preservation
3. UK-03: implement manifest-last atomic switch, crash recovery at every
   write point, and the downgrade guard
4. UK-04: implement the three host adapters with preview/replace/scope/version
5. UK-05: implement `wt version`, comprehensive integration proof, and help
   closure

## Rejected Shortcuts

This roadmap rejects:

- upgrading by directly overwriting managed links without staging
- writing the manifest before all assets are fsynced
- allowing downgrade without explicit operator intent and schema compatibility
- silently deleting lane-owned files that happen to share a managed path name
- embedding lane-specific state (home paths, IDs, prefixes) in installed
  knowledge skills
- claiming a host notification is active without verifying it
- deferring help, spec status markers, or integration proof to a later pack
- treating version reporting as a hardcoded string rather than derived from
  manifest sources
- writing migration steps that close sessions, prune content, or change
  lifecycle states
- implementing upgrade planning logic inside `UpgradeCommand.ts` rather than
  in the foundation service
