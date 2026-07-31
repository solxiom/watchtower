# Batch LC-01 — Init argument resolution and preflight plan

## Synchronized batch execution matrix

- **Accepted-map title:** Init argument resolution and preflight plan
- **Dependencies:** `RM-03`, `RM-08`, `RT-04`
- **Exclusive ownership/interface:** init planning foundation/command
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Exact syntax; no destination creation in preview; prefix/scope/routing validation
- **Implementation report:** `.local/agent-reports/wt-lane-lifecycle/LC-01-init-argument-resolution-and-preflight-plan.md`
- **Review report:** `.local/agent-reports/wt-lane-lifecycle/reviews/LC-01-init-argument-resolution-and-preflight-plan-review.md`
- **Correction report:** `.local/agent-reports/wt-lane-lifecycle/reviews/corrections/LC-01-init-argument-resolution-and-preflight-plan-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

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

- `src/foundation/InitPlanner.ts` — preflight plan construction, argument
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

1. **Create `src/foundation/InitPlanner.ts`**
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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **init planning foundation/command**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-lane-lifecycle/LC-01-init-argument-resolution-and-preflight-plan.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-03`, `RM-08`, `RT-04`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Exact syntax; no destination creation in preview; prefix/scope/routing validation**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **init planning foundation/command** and **Exact syntax; no destination creation in preview; prefix/scope/routing validation**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-lane-lifecycle/LC-01-init-argument-resolution-and-preflight-plan.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
