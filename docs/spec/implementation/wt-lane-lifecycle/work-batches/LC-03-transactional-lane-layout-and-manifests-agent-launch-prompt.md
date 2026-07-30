# Agent Launch Prompt — Work Batch LC-03

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `very high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `very high for transactional filesystem operations, atomic commit, rollback correctness, and schema-valid manifest generation`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing
  specs, current source, predecessor handoff, and proof output in context; if it
  cannot do so, escalate the agent rather than shortening or partitioning away
  safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help
  with bounded exploration, but it cannot issue the final implementation or
  acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only
non-normative examples and may become unavailable or stale. Select a currently
available agent that can load the complete brief/spec/source context, inspect
and edit the repository with tools, reason across package boundaries, and run
the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, driver behavior,
  destructive migration safety, or cross-package closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch LC-03** for the Watchtower v1
wt-lane-lifecycle delivery lane.

This batch creates the complete lane directory layout transactionally using
adjacent staging, atomic rename commit, and full rollback on any failure.
It generates schema-valid manifests, writes them last, and proves that every
failure stage leaves no residual state.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-03-transactional-lane-layout-and-manifests.md`
3. `docs/spec/implementation/wt-lane-lifecycle/work-batches/README.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`
5. `docs/spec/v1.md` — especially §7.2 (layout), §7.3 (lane.json schema and rules), §7.4 (repositories.local.json), §7.5 (install.json schema), §8 (lane config), §11.1 (init creates once, transactional), §14 (safety)
6. `docs/spec/v1-contracts.md` — especially §11 (locking, transactions, recovery): adjacent staging, atomic rename, commit point, init staging rules
7. `docs/spec/schemas/v1.schema.json` — all `$defs` for manifests
8. `docs/spec/v1-implementation-map.md` — §6 (this pack)
9. `docs/spec/architecture.md` — §4.3 (foundation services), §6.2 (mutation flow), §6.2 (manifest-last rule)
10. `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
11. `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
12. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
13. `docs/spec/implementation/wt-lane-lifecycle/batch-reasoning-difficulty-ranking.md`
14. the canonical source owners you will create:
    - `src/foundation/lane-store.ts` (new)
    - `src/foundation/transactional-writer.ts` (new)
15. the dependency modules you must inspect:
    - LC-01: `src/foundation/init-planner.ts` (for InitPlan type)
    - LC-02: `src/foundation/pack-consumer.ts`, `src/foundation/pack-seal.ts` (for pack validation)
    - RT-06: managed asset/links foundation
    - `src/contracts/` — for public type conventions

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `very high for transactional filesystem operations, atomic commit, rollback correctness, and schema-valid manifest generation`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing
  specs, current source, predecessor handoff, and proof output in context; if it
  cannot do so, escalate the agent rather than shortening or partitioning away
  safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help
  with bounded exploration, but it cannot issue the final implementation or
  acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, factories, lower-layer capsules, front doors, tests, and status
   artifacts affected by this batch.
2. Inspect the current source and accepted predecessor-batch output. Do not infer
   behavior from filenames, the implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, failure precedence, concurrency
   or re-entrancy risks, compatibility constraints, and deliberately unsupported
   behavior before choosing or evaluating a design.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating ownership, safety, boundedness, or public
   result semantics, then ensure focused proof rejects it.
5. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
6. Treat predecessor reports as leads, not proof. Re-open the actual changed
   files and reproduce all acceptance-critical evidence from the current tree.

## Structural Design And Module-Size Gate

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- Front doors, factories, registries, directors, commands, renderers, and public
  barrels target 160 lines or fewer. Files from 161 through 220 lines require an
  explicit cohesion justification. A hand-maintained front door over 220 lines
  is rejectable without a narrow pre-existing constraint, and no front door may
  exceed 300 lines.
- Focused implementation modules target 220 lines or fewer. Files from 221
  through 300 lines require a responsibility inventory and independent reviewer
  scrutiny. Files from 301 through 350 lines are expected to split; acceptance
  requires a source-backed reason why splitting would reduce ownership clarity.
  New or materially rewritten implementation modules above 350 lines are
  rejected.
- Four hundred physical lines is the absolute ceiling for every hand-maintained
  JS/TS source or spec module touched by this lane. The ceiling does not make a
  mixed-responsibility file acceptable.
- Split a module below those thresholds when it owns three or more independently
  nameable concerns or combines state policy, I/O, normalization, planning,
  error translation, or rendering.
- Coordinators sequence focused collaborators; they do not absorb collaborator
  algorithms. Barrels expose a local capsule; they do not launder foreign APIs.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
  Use feature-local capsules with explicit owner names.
- Record physical line counts for every new or materially rewritten file. The
  reviewer must independently verify warning-band files and reject unjustified
  growth in an existing oversized module.

## Your Mission

Create the complete lane directory layout transactionally. Adjacent staging,
atomic rename, full rollback. Manifest-last ordering.

1. Create `src/foundation/lane-store.ts`:
   - `buildLaneLayout(plan: InitPlan, runtimeRefs: RuntimeAssetRef[]): LaneLayout`:
     - Compute absolute lane dir: `{controlHome}/.watchtower/lanes/{slug}/`
     - Enumerate all directories per v1.md §7.2 (14 directory paths minimum):
       - `{laneDir}/` (root marker)
       - `{laneDir}/bin/`
       - `{laneDir}/state/`
       - `{laneDir}/prompts/`
       - `{laneDir}/reports/`
       - `{laneDir}/budgets/`
       - `{laneDir}/logs/`
       - `{laneDir}/briefs/`
       - `{laneDir}/coordinator/`
       - `{laneDir}/coordinator/operator-sessions/`
       - `{laneDir}/coordinator/amendment-requests/`
       - `{laneDir}/coordinator/holds/`
       - `{laneDir}/coordinator/journal/`
       - `{laneDir}/coordinator/projections/`
     - Enumerate managed links from runtime refs → `bin/`
     - Enumerate all LaneFile entries for manifests and config
   - `generateLaneManifest(plan: InitPlan): LaneManifestV1`:
     - `schemaVersion: 1`
     - `laneId`: UUID from plan (via `crypto.randomUUID()` if not preset)
     - `kind: "implementation"`
     - `slug`: from plan args
     - `initiativeId`: from plan's pack metadata or explicit input
     - `controlHomeRepository`: the repo ID matching the control home
     - `laneDir: ".watchtower/lanes/{slug}"` (relative)
     - `implementationPack`: `{repository, path}` from plan
     - `repositories`: array of `{id, role, access}` — exactly one matches
       `controlHomeRepository`, all IDs unique, all match pattern
     - `relations`: from plan (or `{}`)
     - `claims`: from plan (or `[]`)
     - `createdAt`: current ISO timestamp
     - Validate against JSON Schema before returning; throw on invalid
   - `generateInstallManifest(plan: InitPlan, assets: ManagedLink[]): InstallManifestV1`:
     - `schemaVersion: 1`
     - `cliVersion`: read from package.json or passed from CLI
     - `runtimeVersion`: from plan
     - `knowledgeVersion`: from plan or compatible version
     - `mode: "linked"`
     - `managedAssets`: object mapping relative lane path (e.g., `"bin/coordinator-watch.sh"`)
       to `{target: absoluteRuntimePath, sha256: digest}`
     - Validate against JSON Schema
   - `generateRepositoriesLocal(plan: InitPlan): RepositoriesLocalV1`:
     - `schemaVersion: 1`
     - `repositories`: for each binding, `{id, path: absoluteCanonical, branch,
       worktreeMode: "dedicated"|"shared", role, access}`
     - Paths must be absolute and canonicalized
   - `generateLaneConfig(plan: InitPlan): string`:
     - Produce strict `KEY=value` lines for: `LANE_ID`, `LANE_SLUG`,
       `INITIATIVE_ID`, `HOME_REPOSITORY_ID`, `WORKSPACE`, `TMUX_PREFIX`,
       `IMPL_PACK_REL`
     - Each value is scalar, no shell expansion, no command substitution
     - `WORKSPACE` is the absolute control home path

2. Create `src/foundation/transactional-writer.ts`:
   - `commitLane(layout: LaneLayout): Promise<WriteResult>`:
     - Generate staging path: `{controlHome}/.watchtower/lanes/.staging-{uuid}/`
       (adjacent to the final path, same filesystem)
     - Create staging root directory
     - Create each directory in `layout.dirs` under staging (using relative paths
       from lane dir root), recursively, in order
       - On `mkdir` failure: `rollbackStaging`, throw `WriteError`
     - For each `LaneFile` in `layout.files`:
       - Compute staged path relative to staging root
       - Write content to temp path, then fsync the file
       - On write failure: `rollbackStaging`, throw `WriteError`
       - On fsync failure: `rollbackStaging`, throw `WriteError`
     - For each `ManagedLink` in `layout.links`:
       - Verify target exists and optional checksum matches
       - Create symlink at staged path pointing to target
       - On failure: `rollbackStaging`, throw `WriteError`
     - Write MANIFESTS LAST (this order is critical for detection):
       - `lane.json` → write temp → fsync → rename into staging
       - `install.json` → write temp → fsync → rename into staging
       - `repositories.local.json` → write temp → fsync → rename into staging
       - `lane.config.env` → write temp → fsync → rename into staging
       - On any manifest write/fsync/rename failure: `rollbackStaging`, throw
     - Final atomic commit: `fs.rename(stagingDir, finalLaneDir)`
       - On rename failure: `rollbackStaging`, throw `WriteError`
       - On success: return `{committed: true, laneDir: finalLaneDir}`
   - `rollbackStaging(stagingDir: string): Promise<void>`:
     - Recursively remove all files and directories in stagingDir
     - Remove the stagingDir itself
     - Catch and log but do not throw: the staging dir was already invalid
   - Before any staging: verify the final destination does not exist.
     If it does: reject with a specific error code; no v1 force overwrite.

3. Write focused specs:
   - `spec/foundation/lane-store.spec.ts`:
     - Layout enumerates all 14+ directories per v1.md §7.2
     - Layout links match runtime asset references
     - `lane.json` generation: all required fields present
     - `lane.json` generation: slug matches pattern, repository IDs unique,
       controlHomeRepository matches exactly one repository
     - `lane.json` generation: invalid schema → thrown
     - `install.json` generation: all required fields present, managed assets
       structure correct
     - `repositories.local.json`: paths absolute and canonicalized
     - `lane.config.env`: all required vars present, shell-safe format
   - `spec/foundation/transactional-writer.spec.ts`:
     - Successful commit: all dirs, files, links, manifests exist at final path
     - Manifest-last: manifests are the last files written (timestamp/mock order)
     - Staging adjacent: staging dir is on same parent as final dir
     - Rollback on mkdir failure: no residual staging, no residual final dir
     - Rollback on write failure: no residual staging, no residual final dir
     - Rollback on fsync failure: no residual staging, no residual final dir
     - Rollback on rename failure: staging removed, final dir does not exist
     - Rollback on manifest generation failure: staging removed
     - Pre-existing destination: rejected before any staging begins
     - Each failure stage independently proven via fault injection / mock

## What You Must Not Do

- Do not add Git-ignore management — that belongs to LC-04
- Do not register membership indexes — that belongs to LC-04
- Do not seed coordinator/session baselines — that belongs to LC-05
- Do not build pack indexes — that belongs to LC-05
- Do not add product logic to `src/cli.ts` or any command (InitCommand already
  exists from LC-01; do not modify it to include transaction logic — it calls
  lane store and transactional writer)
- Do not create a staging directory outside `.watchtower/lanes/`
- Do not allow the staging path to collide with an existing lane
- Do not commit
- Do not add `.local` artifacts to git

## Required Proof

Before finishing, verify and report:

- Layout contains all directories required by v1.md §7.2 (14+ paths)
- `lane.json` passes JSON Schema validation
- `install.json` passes JSON Schema validation
- `repositories.local.json` has correct canonicalized paths
- `lane.config.env` has all required KEY=value entries
- Staging directory is adjacent to final lane directory, same filesystem
- Atomic rename commits the staging directory
- Manifest is written LAST (lane.json, install.json appear last in staging)
- Every failure stage independently proven: mkdir, write, fsync, symlink,
  manifest write, manifest fsync, rename — each rolls back with no residue
- Pre-existing destination is rejected before any staging I/O
- `nvb build` passes from tracked-only checkout
- Final `git status --short`
- Proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
- `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- adjacent staging directory, same filesystem
- manifests written last (lane.json, install.json, etc.)
- atomic rename is the commit point
- rollback on every failure stage (write, fsync, rename, manifest generation)
- no v1 force overwrite; pre-existing destination rejected
- no product logic in `src/cli.ts`
- `nvb build` must pass
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-lane-lifecycle/LC-03-transactional-lane-layout-and-manifests.md`

The report must include:

- documents studied
- exact files created
- lane store public API shape (types and functions)
- transactional writer public API shape (types and functions)
- complete list of directories created (14+ paths)
- manifest generation verification (schema validation passes)
- rollback proof matrix: each stage, failure injection method, residual check
- manifest-last proof: how you verified manifests are written last
- atomic rename mechanism and proof
- proof commands and outcomes
- `nvb build` result
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact staging path pattern, the commit point mechanism (rename),
the rollback discipline, the manifest-last ordering, and the complete
`LaneLayout` type shape. Make explicit that LC-04 must not begin binding
until the lane exists (committed) and that LC-05 must seed baselines
into paths under the committed lane directory.
