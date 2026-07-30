# Work Batch LC-03 — Transactional Lane Layout and Manifests

Status: ❌ Pending
Implementation reasoning: R5
Review reasoning: R5
Depends on: LC-01, LC-02, RT-06
Workload: very-large

## Scope

Create the complete lane directory layout transactionally. Use adjacent staging,
atomic commit via rename, and full rollback on any write/fsync/rename failure.
Generate schema-valid `lane.json` and `install.json`. Write manifests last so
an interrupted operation is detectable. This batch owns the lane store
foundation: `lane-store.ts` and `transactional-writer.ts`.

## Specification References

| Reference | Section | Topic |
|-----------|---------|-------|
| v1.md | §7.2 | Per-workspace layout: complete lane directory tree |
| v1.md | §7.3 | Lane marker schema: `lane.json` required fields, slug/ID/repository rules |
| v1.md | §7.4 | Local repository bindings: `repositories.local.json` schema |
| v1.md | §7.5 | Install manifest schema: `install.json` schema |
| v1.md | §11.1 | Init behavior: creates once, transactional, no force overwrite |
| v1-contracts.md | §11 | Locking, transactions, and recovery: adjacent staging, atomic rename, commit point, membership post-commit |
| v1-contracts.md | §2 | Lifecycle: init commits lane as `bootstrap` |
| schemas/v1.schema.json | `$defs` | Lane manifest, install manifest, repository binding schemas |

## Owned Files

### New foundation modules

- `src/foundation/lane-store.ts` — constructs complete lane layout plan,
  generates schema-valid `lane.json`, `install.json`, `repositories.local.json`,
  `lane.config.env`
- `src/foundation/transactional-writer.ts` — adjacent staging directory,
  atomic rename commit point, fsync discipline, complete rollback on failure,
  manifest-last ordering

## Dependencies

### From this pack

- **LC-01** (init planner): consumes `InitPlan` to know what to create.
  The lane store reads the plan and materializes it.
- **LC-02** (pack validation): validates the pack before materializing
  manifests that reference pack artifacts.

### From pack 2 (wt-runtime-distribution)

- **RT-06** (managed assets): lane links and compatibility names. The
  `install.json` managedAssets entries and `bin/` links reference managed
  assets from the runtime catalog.

## Required Interfaces

### LaneStore

```typescript
interface LaneLayout {
  laneDir: string;
  dirs: string[];              // absolute paths, created in order
  files: LaneFile[];            // files to write with content
  links: ManagedLink[];         // symlinks to managed runtime assets
}

interface LaneFile {
  path: string;
  content: string | Buffer;
  mode?: number;
}

interface ManagedLink {
  path: string;                 // e.g. "bin/coordinator-watch.sh"
  target: string;               // absolute path in runtime store
  sha256?: string;              // expected checksum of target
}

function buildLaneLayout(plan: InitPlan, runtimeRefs: RuntimeAssetRef[]): LaneLayout;
function generateLaneManifest(plan: InitPlan): LaneManifestV1;
function generateInstallManifest(plan: InitPlan, assets: ManagedLink[]): InstallManifestV1;
function generateRepositoriesLocal(plan: InitPlan): RepositoriesLocalV1;
function generateLaneConfig(plan: InitPlan): string;
```

### TransactionalWriter

```typescript
interface WriteResult {
  committed: boolean;
  laneDir: string;
}

interface WriteError {
  stage: "mkdtemp" | "mkdir" | "write" | "fsync" | "symlink" | "rename" | "manifest";
  path: string;
  cause: Error;
}

function commitLane(layout: LaneLayout): Promise<WriteResult>;
function rollbackStaging(stagingDir: string): Promise<void>;
```

## Implementation Steps

1. **Create `src/foundation/transactional-writer.ts`**
   - `commitLane(layout: LaneLayout)`: the atomic commit path
     - Create staging directory adjacent to final lane dir (same filesystem):
       `{controlHome}/.watchtower/lanes/.staging-{uuid}/`
     - Create each directory in `layout.dirs` under staging (recursively, in order)
     - For each `LaneFile`:
       - Write content to temp file, fsync temp file
       - If fsync fails: rollback entire staging, throw `WriteError`
     - For each `ManagedLink`:
       - Create symlink at staged path → target
       - If target doesn't exist or checksum mismatch: fail
     - Write manifests LAST:
       - `lane.json` → temp, fsync, rename into place in staging
       - `install.json` → temp, fsync, rename into place in staging
       - `repositories.local.json` → temp, fsync, rename into place in staging
       - `lane.config.env` → temp, fsync, rename into place in staging
     - Final atomic rename: rename staging dir → final lane dir
     - If rename fails: rollback staging, throw
     - On success: return `{committed: true, laneDir}`
   - At every stage, if any operation fails:
     - Remove all files and directories created in staging
     - Remove the staging directory
     - Do not touch anything outside staging (the destination never existed before rename)
   - `rollbackStaging(stagingDir)`: remove the staging directory and all contents

2. **Create `src/foundation/lane-store.ts`**
   - `buildLaneLayout(plan, runtimeRefs)`: produce complete `LaneLayout` from plan
     - Compute absolute lane dir path from control home and slug
     - Enumerate all directories per v1.md §7.2:
       - `{laneDir}/` (root)
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
     - Enumerate all managed links from runtime refs → bin/
   - `generateLaneManifest(plan)`: build `lane.json` content
     - `schemaVersion: 1`
     - `laneId`: UUID from plan
     - `kind`: `"implementation"`
     - `slug`: from plan
     - `initiativeId`: derived from pack or plan
     - `controlHomeRepository`: control-home repo ID
     - `laneDir`: relative path `.watchtower/lanes/{slug}`
     - `implementationPack.repository` and `implementationPack.path`
     - `repositories`: array of `{id, role, access}`
     - `relations`: empty or populated from plan
     - `claims`: from plan
     - `createdAt`: current ISO timestamp
     - Validate against schema before returning
   - `generateInstallManifest(plan, assets)`: build `install.json` content
     - `schemaVersion: 1`
     - `cliVersion`: current `wt` version
     - `runtimeVersion`: from plan
     - `knowledgeVersion`: from plan or compatible version
     - `mode`: `"linked"`
     - `managedAssets`: map of relative lane path → `{target, sha256}`
     - Validate against schema before returning
   - `generateRepositoriesLocal(plan)`: build `repositories.local.json`
     - `schemaVersion: 1`
     - `repositories`: array of `{id, path, branch, worktreeMode, role, access}`
     - Paths are absolute and canonicalized
   - `generateLaneConfig(plan)`: build `lane.config.env` content
     - `LANE_ID`, `LANE_SLUG`, `INITIATIVE_ID`, `HOME_REPOSITORY_ID`,
       `WORKSPACE`, `TMUX_PREFIX`, `IMPL_PACK_REL` per v1.md §8

3. **Write focused specs**
   - `spec/foundation/lane-store.spec.ts`: layout generation, manifest
     generation, config generation, schema validation of generated content,
     all required fields present, slug validation, repository uniqueness,
     control-home match
   - `spec/foundation/transactional-writer.spec.ts`: staging creation,
     directory creation order, file write and fsync, manifest-last ordering,
     atomic rename, rollback on write failure, rollback on fsync failure,
     rollback on rename failure, rollback on manifest generation failure,
     pre-existing destination rejection, duplicate lane rejection

## Exclusions

- No Git-ignore management — belongs to LC-04
- No membership index registration — belongs to LC-04
- No coordinator/session baseline materialization — belongs to LC-05
- No pack index bootstrap — belongs to LC-05

## Required Proof

### Focused
- Layout enumerates all directories required by v1.md §7.2
- `lane.json` generation produces schema-valid output with all required fields
- `install.json` generation produces schema-valid output
- `repositories.local.json` generation with canonicalized paths
- `lane.config.env` generation with all required vars
- Staging directory is adjacent to final destination, on same filesystem
- Atomic rename commits and replaces staging path
- Write failure at any stage → complete rollback, no residual state
- fsync failure → rollback, no residual state
- Manifest written last (verify by inspecting file creation order)
- Pre-existing destination → rejected with error

### Regression
- `nvb build` passes

### Architecture
- Transactional writer does not import from commands
- Lane store imports only from contracts and LC-01 plan type

### Adversarial
- Concurrent rename from another process
- Disk full during write
- Permission denied during mkdir/write
- Staging directory already exists (clean up, fail)

## Help and Documentation

- No CLI-facing surface; foundation-only batch
- Update `docs/spec/v1.md` §11.1 if implementation reveals a gap in the
  transactional specification

## Handoff Notes

After acceptance, `lane-store.ts` and `transactional-writer.ts` are the sole
owners of lane materialization. LC-04 calls the lane store to know which paths
exist before binding repositories. LC-05 calls the lane store to know the lane
directory structure before seeding baselines.
