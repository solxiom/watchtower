# Work Batch LC-01 — Init Argument Resolution and Preflight Plan

Status: ❌ Pending
Implementation reasoning: R4
Review reasoning: R5
Depends on: RM-03, RM-08, RT-04
Workload: medium

## Scope

Parse and validate all init CLI arguments. Construct a complete preflight plan
without creating any destination directory, lane file, or runtime link. This
batch owns the init planning foundation and the `InitCommand` front door.

## Specification References

| Reference | Section | Topic |
|-----------|---------|-------|
| v1.md | §10.3, §11.1 | Init command syntax and preflight steps |
| v1-contracts.md | §2 | Fixed v1 init syntax |
| v1.md | §7.2, §7.3, §7.4 | Lane marker schema, local bindings, install manifest |
| v1-contracts.md | §3.1, §3.2 | Pack required files and path rules |
| v1-contracts.md | §4 | Routing policy rules — referenced in coordinator-routing validation |
| v1.md | §7.1 | Runtime store model for `--runtime=<version>` |
| v1.md | §14 | Safety: init rejects paths escaping declared binding |

## Owned Files

### New foundation modules

- `src/foundation/init-planner.ts` — preflight plan construction, argument
  validation, dry-run plan enumeration; the single owner of init planning logic

### New command

- `src/commands/InitCommand.ts` — CLI orchestration: resolves args, calls
  init-planner, renders plan output; delegates all logic to foundation

## Dependencies

### From pack 1 (wt-read-model)

- **RM-03** (canonical paths): path resolution, canonicalization, symlink handling.
  Init depends on workspace resolution and path canonicalization.
- **RM-08** (repository conflicts): writable worktree/branch/path conflict
  detection. Init must reject lanes that conflict with existing active lanes.

### From pack 2 (wt-runtime-distribution)

- **RT-04** (runtime catalog): XDG data-root, immutable runtime version staging.
  `--runtime=<version>` must resolve through the runtime catalog.

## Required Interfaces

### InitPlanner

```typescript
// Core types (to be fully defined in implementation)
interface InitArgs {
  slug: string;
  tmuxPrefix: string;
  implPackPath: string;
  coordinatorRouting: CoordinatorRoutingPolicy;
  scopePath?: string;
  runtimeVersion?: string;
  workspacePath?: string;
  updateGitignore: boolean;
  dryRun: boolean;
}

interface InitPlan {
  // The complete materialization plan — no filesystem writes have occurred
  lane: { id: string; slug: string; kind: "implementation"; };
  controlHome: string;
  repositories: RepositoryBinding[];
  coordinatorBaseline: CoordinatorBaselineSeed;
  packIndex: PackIndexSeed;
  directories: string[];
  links: ManagedLink[];
  manifests: { lane: LaneManifestV1; install: InstallManifestV1; };
  config: LaneConfigEnv;
  warnings: InitWarning[];
}

// Public exports
function buildInitPlan(args: InitArgs): Promise<InitPlan>;
function validateInitArgs(args: Partial<InitArgs>): InitArgs;
```

### InitCommand

```typescript
export default class InitCommand extends BaseCommand implements Command {
  name: "init";
  // Delegates validation to InitPlanner, renders plan or errors
}
```

## Implementation Steps

1. **Create `src/foundation/init-planner.ts`**
   - Import RM-03 workspace resolution, RM-08 conflict detection, RT-04 runtime catalog
   - Implement `validateInitArgs`: parse and validate slug, tmux-prefix,
     impl-pack path, coordinator-routing JSON, scope JSON, runtime version,
     workspace path, update-gitignore, dry-run
   - Implement slug pattern validation: `^[a-z0-9][a-z0-9-]{0,62}$`
   - Implement tmux-prefix pattern validation: `^[a-z0-9][a-z0-9-]{0,15}$`
   - Resolve impl-pack path as absolute or control-home-relative
   - Validate coordinator-routing against the routing policy schema
   - Parse and validate scope bindings JSON
   - Resolve runtime version through RT-04 catalog when `--runtime` is set
   - Validate that `/.watchtower/` is Git-ignored or `--update-gitignore` is set
   - Implement `buildInitPlan`: compose complete InitPlan from validated args
   - Generate stable UUID lane ID
   - Resolve workspace and control-home repository
   - Build repository binding list from scope or control-home default
   - Detect writable worktree/branch/path conflicts via RM-08
   - Enumerate all directories, links, manifests, config entries to create
   - In dry-run mode: return complete plan without any I/O mutation
   - Emit warnings for detected conflicts and issues

2. **Create `src/commands/InitCommand.ts`**
   - Extend BaseCommand
   - Parse CLI args: `<slug>`, `--tmux-prefix`, `--impl-pack`, `--coordinator-routing`,
     `--scope`, `--runtime`, `--workspace`, `--update-gitignore`, `--dry-run`
   - Call `validateInitArgs` then `buildInitPlan`
   - In dry-run mode: render the complete plan to stdout with human-readable
     summary of directories, links, bindings, manifests, policy provenance
   - On validation failure: render specific error with exit code 2
   - On conflict detection: render conflict details with exit code 4
   - On runtime-not-found: render with exit code 4

3. **Write focused specs**
   - `spec/foundation/init-planner.spec.ts`: every arg combination,
     invalid slug/prefix, missing required args, scope validation,
     impl-pack resolution, workspace resolution, conflict detection,
     dry-run vs non-dry-run, plan shape validation
   - `spec/commands/InitCommand.spec.ts`: CLI arg parsing, rendering,
     error rendering

## Exclusions

- No directory or file creation — that belongs to LC-03
- No pack seal validation or drift detection — that belongs to LC-02
- No coordinator/session baseline materialization — that belongs to LC-05
- No repository binding or membership writes — that belongs to LC-04

## Required Proof

### Focused
- All arg combinations produce correct plan shape
- Invalid slug rejected with code 2
- Invalid tmux-prefix rejected with code 2
- Missing impl-pack rejected with code 2
- Missing coordinator-routing rejected with code 2
- Scope JSON schema validation passes/rejects correctly
- Runtime version resolution succeeds/fails correctly
- Dry-run produces identical plan shape to non-dry-run (minus applied flag)
- Plan contains correct manifest previews (lane.json, install.json shape)

### Regression
- `nvb build` passes
- All existing Jasmine suites pass from tracked-only checkout

### Architecture
- `src/cli.ts` contains no product logic
- `InitCommand` delegates all logic to `init-planner`
- `init-planner` imports from RM-03, RM-08, RT-04, not from any later batch

### Adversarial
- Path escape through impl-pack path
- Malformed scope JSON
- Malformed coordinator-routing JSON
- Unicode/malformed slug values
- Path traversal through workspace resolution

## Help and Documentation

- Create `help/commands/init.hlp.json` describing init syntax, required and
  optional flags, preflight steps, and dry-run behavior
- Register init in `help/help.json`

## Handoff Notes

After acceptance, the `InitPlan` type and `buildInitPlan` function serve as the
single source of truth for all downstream init batches. LC-03 consumes the plan
to perform transactional layout. LC-05 consumes coordinator/routing/policy data
from the plan to seed baselines.
