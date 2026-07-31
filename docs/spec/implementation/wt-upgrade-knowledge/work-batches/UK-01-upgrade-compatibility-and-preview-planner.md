# Batch UK-01 — Upgrade compatibility and preview planner

## Synchronized batch execution matrix

- **Accepted-map title:** Upgrade compatibility and preview planner
- **Dependencies:** `LC-03`, `RT-02`
- **Exclusive ownership/interface:** upgrade foundation/command
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Runtime/knowledge/schema matrix; changed/preserved/conflict classification
- **Implementation report:** `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md`
- **Review report:** `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-01-upgrade-compatibility-and-preview-planner-review.md`
- **Correction report:** `.local/agent-reports/wt-upgrade-knowledge/reviews/corrections/UK-01-upgrade-compatibility-and-preview-planner-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Batch ID: `UK-01`
Pack: `wt-upgrade-knowledge` (pack 4 of 6)
Reasoning class: R4 (deep repository reasoning)
Depends on: LC-03 (transactional lane layout) accepted, RT-02 (runtime/knowledge manifests) accepted

## Scope

Implement the upgrade compatibility foundation: a pure read-only matrix that
classifies every managed asset and a preview command that never mutates lane
state.

## Governing Specs

- `docs/spec/v1.md` — §11.5 (`wt upgrade`), §7.5 (install manifest schema), §6 (ownership model)
- `docs/spec/v1-contracts.md` — §3 (implementation-pack consumer contract)
- `docs/spec/schemas/v1.schema.json` — `upgradePlan`, `mutationResult`

## Files Owned By This Batch

- `src/foundation/UpgradePlanner.ts` — NEW: compatibility matrix, classification, read-only preview
- `src/commands/UpgradeCommand.ts` — NEW: user-facing upgrade orchestration (preview mode only)
- `src/contracts/upgrade.ts` — NEW: upgrade plan types (may be part of an existing contracts file)
- `spec/basic/upgrade-preview.spec.ts` — NEW: unit and integration specs (Jasmine)

## Implementation Steps

1. **Contract types**: Define `UpgradePlan`, `AssetClassification`, `CompatibilityMatrix`, `SchemaCompatibility` types in `src/contracts/`. Types must match the `upgradePlan` schema in the schema bundle.

2. **Upgrade planner foundation** (`src/foundation/UpgradePlanner.ts`):
   - Accept: current `install.json` manifest, target runtime manifest, target knowledge manifest
   - Load current managed assets from the lane's `install.json` `managedAssets` map
   - Load target managed assets from the new runtime manifest
   - For each managed asset path:
     - **`preserved`**: path exists in both, SHA-256 matches (exact byte identical)
     - **`changed`**: path exists in both, SHA-256 differs (new version of managed file)
     - **`added`**: path exists in target only (new managed asset)
     - **`removed`**: path exists in current only (deprecated managed asset)
     - **`conflict`**: path is in managed set but the filesystem has an unrecognized regular file (not tracked by current manifest, not a directory)
   - Validate runtime-versus-knowledge version compatibility against declared ranges
   - Validate lane-schema-version compatibility against runtime's declared compatible schema versions
   - Return a read-only `UpgradePlan` with the full matrix; never mutate filesystem, links, or manifests

3. **Upgrade command** (`src/commands/UpgradeCommand.ts`):
   - Extend `BaseCommand`
   - Accept `--lane=<slug-or-uuid>`, `--to=<version>`, `--apply` (parsed but only preview is implemented; `--apply` exits with "not implemented in this batch"), `--json`, `--dry-run`
   - Resolve lane via foundation discovery services
   - Invoke `UpgradePlanner.ts` with current and target manifests
   - Render human output: table of changed/preserved/added/removed/conflicted paths with old and new checksums, schema compatibility assessment
   - Render JSON output via `--json`: `upgradePlan` object validated against schema
   - Exit 0 for clean preview; exit 5 on unmanaged conflicts; exit 4 on missing target runtime; exit 3 on lane not found
   - Never stage runtimes, mutate links, or write manifests

4. **Proof** (`spec/basic/upgrade-preview.spec.ts`):
   - No-change upgrade: current and target manifests identical → all assets `preserved`
   - Added assets: target has extra managed entries → classified as `added`
   - Removed assets: target lacks entries present in current → classified as `removed`
   - Changed assets: same path, different SHA-256 → classified as `changed`
   - Conflict detection: managed path on disk is an unrecognized regular file → classified as `conflict`
   - Incompatible schema version: lane schema not in target runtime's compatible range → error
   - Missing target: `--to=<version>` not installed or packaged → error
   - Unmanaged collision: at least one conflict → exit 5, human and JSON output include conflicts
   - JSON output validates against `upgradePlan` schema
   - Preview never mutates lane state (verify using write-tracking filesystem double)
   - All tests run via `nvb test` compatible Jasmine specs

## Exclusions

- `--apply` is parsed but not implemented; it exits with a message directing to UK-03
- No migration step planning (owned by UK-02)
- No atomic staging or manifest writes (owned by UK-03)
- No host adapter integration (owned by UK-04)
- No version command interaction (owned by UK-05)
- No `doctor` integration in this batch
- No help fragment until UK-05 (but command must have `--help` support via BaseCommand)

## Required Proof

| Proof class | Evidence |
|-------------|----------|
| Unit tests | Every classification outcome independently; schema compatibility matrix; missing target; incompatible schema |
| Contract validation | `--json` output validates against `$defs.upgradePlan` schema |
| No-mutation proof | Write-tracking filesystem double proves no writes during preview |
| Integration smoke | `wt upgrade --lane=<valid-lane> --to=<version>` renders preview without error |
| Build | `nvb build` passes |

## Acceptance Gate

- All Jasmine specs pass (unit + integration)
- `nvb build` passes
- `--json` output validates against the schema bundle
- No lane mutation during preview (proved by test double)
- Command prefers at most 120 lines, warns at 121–160, and rejects over 180;
  the foundation planner prefers at most 200, warns at 201–260, and rejects
  over 300. Both must remain cohesive below those thresholds.
- No product logic in `src/cli.ts`

## Implementation Report

Write a durable report at `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md`
containing: files created/modified with line counts, exact test commands and
results, any open questions or intentional limitations.

---
---

# UK-01: Upgrade Compatibility And Preview Planner — Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** R4 — deep repository reasoning with cross-file contracts,
ownership-boundary decisions, and negative-path design.

**Primary suitability:** A coding agent capable of reading multiple manifest
formats, comparing structured data, classifying assets by five outcome
categories, and proving preview-only purity through write-tracking test doubles.

**Alternatives:** An R3 agent may be adequate if it can reliably follow the
exact classification rules, but the cross-manifest comparison and schema
compatibility checking benefit from R4 codebase awareness.

**Steering-only tools:** Agents that cannot independently inspect source files
or run build commands are unsuitable. The agent must read the current
`src/foundation/` modules to understand path resolution, lane manifest parsing,
and runtime catalog access patterns.

**Prohibited final-pass classes:** R1, R2 — insufficient for cross-file
contract design and negative-path coverage.

**Context requirements:** The agent needs the complete spec (§11.5, §7.5, §6),
the schema bundle for `upgradePlan` validation, the existing foundation modules
for path/manifest patterns, and the `BaseCommand` convention.

**Final-authority limits:** The implementation agent may not commit. The
reviewer owns acceptance.

### Complete forwarding profile — mandatory

- **Class:** R4 (deep repository reasoning)
- **Primary models:** any currently strongest coding-capable model meeting R4
- **Good alternatives:** any model with strong TypeScript, manifest-parsing,
  and cross-file comparison capability
- **Steering-only tools:** agents that cannot run `nvb build` or read the
  schema bundle are unsuitable
- **Prohibited final-pass classes:** R1, R2
- **Context retention:** the agent must retain the full classification matrix
  algorithm, all five outcomes, and the no-mutation invariant across the
  session
- **Final-authority limits:** implementation agent does not commit; reviewer
  owns acceptance decision

## Capability-Based Agent Selection Rule

This batch requires R4 reasoning because:

- It defines cross-manifest comparison logic that must be correct for UK-02
  and UK-03 to function safely
- Asset classification has five outcomes with overlapping edge cases (a changed
  file at a managed path vs. a lane-owned file whose name collides)
- Schema compatibility checking requires parsing and range-matching semantic
  version declarations
- The no-mutation invariant must be provable through test doubles, not
  narrative confidence

## Context Assignment

You are agent UK-01 implementing the upgrade compatibility and preview planner
for Watchtower v1. Your work establishes the foundation that all later upgrade
batches depend on. You work in the Watchtower repository at the current
working directory. Your work is bounded; you do not expand scope beyond this
batch's ownership.

## Read In This Order

1. `AGENTS.md` — repo-level agent instructions and conventions
2. `docs/spec/implementation/wt-upgrade-knowledge/README.md` — pack overview
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md` — delivery phases
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md` — batch status
5. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md` — hard acceptance rules
6. `docs/spec/implementation/wt-upgrade-knowledge/batch-reasoning-difficulty-ranking.md` — difficulty context
7. `docs/spec/v1.md` — §11.5 (upgrade), §7.5 (install manifest), §6 (ownership model), §10.2 (exit codes)
8. `docs/spec/v1-contracts.md` — §3, §11
9. `docs/spec/schemas/v1.schema.json` — `upgradePlan`, `mutationResult` schemas
10. `docs/spec/architecture.md` — §4.3 (foundation services), §11.2 (filesystem integration testing)
11. Existing `src/foundation/` modules: `RuntimeCatalog`, `LaneManifestStore`, `LanePaths`, `RuntimeInstaller`
12. Existing `src/commands/` modules: any `BaseCommand` subclass for conventions
13. Existing `src/contracts/` modules: existing type patterns

## Reasoning / Agent Class

- **Class:** R4 (deep repository reasoning)
- **Primary suitability:** cross-manifest structured comparison with five
  classification outcomes; schema compatibility range matching; no-mutation
  invariant requiring test-double proof
- **Primary models:** any strongest coding agent meeting R4
- **Good alternatives:** any agent with strong TypeScript, structured-data
  comparison, and file-system test-double experience
- **Steering-only tools:** agents that cannot run `nvb build` or read the
  schema bundle are unsuitable
- **Prohibited final-pass classes:** R1, R2
- **Context requirements:** the agent must retain manifest schema knowledge
  across the session
- **Final-authority limits:** implementation agent does not commit; reviewer
  owns acceptance

## Mandatory Reasoning Protocol

Before writing any implementation code:

1. **Dependency map**: enumerate every module in `src/foundation/` and
   `src/contracts/` your code will import. Verify each dependency exists and
   its public API matches your planned usage.
2. **Inspect source**: read the existing `lane.json` parser, `install.json`
   parser, and `RuntimeCatalog` to understand file formats and resolution
   patterns. Do not guess manifest structure.
3. **Invariants**: state the three critical invariants for this batch before
   coding: (a) preview never mutates lane state, links, or manifests;
   (b) every managed asset receives exactly one classification;
   (c) schema compatibility failures block the plan.
4. **Counterexamples**: for each classification outcome, write down the
   counterexample test case before implementing. For the conflict case,
   explicitly decide: what happens when a managed path has an unrecognized
   regular file vs. a directory vs. does not exist?
5. **Spec disagreements**: if the v1.md spec, v1-contracts.md, and schema
   bundle disagree on any field, stop and report. The precedence chain in
   v1-contracts.md §1 governs.
6. **Predecessor reports**: LC-03 and RT-02 accepted reports are in
   `.local/agent-reports/`. Review them for any known limitations that
   affect manifest parsing or path resolution.

## Structural Design And Module-Size Gate

Line count is a design alarm, never permission to accumulate unrelated work.
Count physical lines, including comments and blanks, in new and materially
rewritten hand-maintained files. Generated artifacts are excluded only when
their generator ownership is explicit and they contain no hand-maintained
behavior.

Use the exact project-wide matrix:

| Category | Preferred maximum | Warning band | Hard reject |
| --- | ---: | ---: | ---: |
| CLI command, NVB TaskHandler/front door, registry, renderer, public barrel | 120 | 121–160 | over 180 |
| Orchestrator, controller, coordinator, presenter | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contract/type-only module | 240 | 241–320 | over 400 |
| Test/spec module | 300 | 301–420 | over 500 |

Functions target 40 lines, warn at 41–60, and reject above 80. Constructors
target 25 lines, warn at 26–40, and reject above 50. Warning-band owners require
a responsibility inventory and explicit reviewer judgment.

Every module has one primary responsibility and one cohesive reason to change.
Commands and TaskHandlers validate, normalize, delegate, and map results.
Orchestrators sequence collaborators without absorbing their algorithms.
Storage, validation, rendering, subprocess/leaf I/O, and state-machine policy do
not accumulate in one owner. Three independently nameable responsibilities
require a split even below a preferred maximum.

Class-owning TypeScript modules use PascalCase filenames; function/value modules
use lowerCamelCase. New source filenames do not use dashes or underscores.
Generic `helpers`, `utils`, `common`, and `misc` overflow bags are rejected.

Any size exception must be approved before implementation and name the exact
file, proposed maximum, cohesion reason, reviewer, and expiry/follow-up batch.
Existing oversized files are not precedent: when touched they become smaller,
split, or remain line-count neutral under an approved extraction plan.

The implementation report records categorized line counts for every new or
materially rewritten file plus warning-band functions/constructors. The
reviewer reproduces those counts and independently judges cohesion. Passing a
line-count check never overrides the responsibility gate.

# Agent Launch Prompt — Work Batch RT-05

## Your Mission

Create the upgrade compatibility foundation:

1. Define `UpgradePlan`, `AssetClassification`, `CompatibilityMatrix`, and
   `SchemaCompatibility` contract types
2. Implement `src/foundation/UpgradePlanner.ts` with the five-outcome
   classification matrix and read-only preview
3. Implement `src/commands/UpgradeCommand.ts` with preview-only behavior
   (delegate to planner, render output, parse `--apply` but defer to UK-03)
4. Write comprehensive Jasmine specs covering every classification outcome,
   error path, and no-mutation invariant
5. Verify `nvb build` passes
6. Write the implementation report

## What You Must Not Do

- Write to the filesystem during preview (no link updates, no manifest writes,
  no runtime staging)
- Implement `--apply` behavior (parsed but exits with "not implemented")
- Implement migration steps or migration registry (owned by UK-02)
- Implement atomic staging or crash recovery (owned by UK-03)
- Implement host adapters or skill install (owned by UK-04)
- Implement `wt version` command (owned by UK-05)
- Modify `lane.json`, `install.json`, or any lane state
- Add product logic to `src/cli.ts`
- Commit any code

## Required Proof

- Every classification outcome has a focused spec with synthetic manifest
  fixtures
- Schema compatibility matrix coverage: compatible, incompatible (too old,
  too new), missing declaration
- Missing target runtime produces error code 4
- At least one unmanaged conflict produces exit code 5
- `--json` output validates against `$defs.upgradePlan` in the schema bundle
- Write-tracking filesystem double proves zero writes during any preview call
- Integration smoke: `node build/src/cli.js upgrade --lane=<slug>` renders
  preview without error
- All Jasmine specs pass via `nvb test` (or equivalent project test command)

## Trackers and Status Docs

After implementation, update:
- `implementation-tracker.md` — mark UK-01 as ⏳ awaiting review
- `implementation-roadmap.md` — mark UK-01 phase status as ⏳

Do NOT mark as ✅ — only the reviewer does that.

## Local Artifact Git Rule

Write your implementation report to `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md`.
Do not stage or commit `.local/` artifacts.

## Non-Negotiable Rules

- Never commit `dist/`, `build/`, `node_modules/`, `.nira/local/`, `.watchtower/`
- Preview is default; no mutation without `--apply`
- No shell evaluation of lane config or state in TypeScript
- Match Nirvana CLI patterns — `@nirvana/base/cli`, NVB for build/dist
- Delegate to foundation modules; commands stay thin

## Required Disk Report

Write a complete implementation report at `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md`
containing:

- Files created and modified with before/after line counts
- Exact test commands run and their output (pass/fail counts)
- Every open question or intentional limitation
- Any spec discrepancies discovered during implementation
- A handoff summary for the UK-02 agent and the reviewer

## Always plan and make task lists

Before writing code, produce a task list covering: contract types, planner
implementation, command implementation, spec writing, build verification, and
report writing. Work through the list methodically.

## Leave a helpful handoff message for the next agent

After completing implementation, write a concise handoff message summarizing:
which foundation APIs are now stable, what the UK-02 agent needs from this
batch, any edge cases discovered during implementation, and the exact command
to run tests.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **upgrade foundation/command**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`LC-03`, `RT-02`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Runtime/knowledge/schema matrix; changed/preserved/conflict classification**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **upgrade foundation/command** and **Runtime/knowledge/schema matrix; changed/preserved/conflict classification**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
