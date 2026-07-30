# Work Batch LC-06 — Foreground Watch Command

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

Status: ❌ Pending
Implementation reasoning: R4
Review reasoning: R4
Depends on: LC-05, RT-07
Workload: medium

## Scope

Implement the `wt watch` command. Preflight the lane, export the runtime
invocation context, and run the manifest-selected bundled watcher through the
proven foreground lifecycle boundary. Stdout/stderr passthrough. Ctrl-C
terminates the foreground process group. No daemonization. The command remains
a thin front door; a focused foundation service owns preflight and foreground
process lifecycle.

## Specification References

| Reference | Section | Topic |
|-----------|---------|-------|
| v1.md | §11.4 | Watch command behavior: validates lane, exports env, execs watcher, no daemonize |
| v1.md | §12 | Runtime invocation contract: WT_* environment variables |
| v1.md | §14 | Watcher must not daemonize, use model for idle polling, or infer lifecycle from tmux prose |
| v1-contracts.md | §8 | Watch rejects --json |
| architecture.md | §4.5 | Lane task runtime and leaf adapter |
| architecture.md | §6.3 | Runtime execution flow |
| nirvana-integration-architecture.md | §§4.5, 4.7, 9 | Task runner, leaf boundary, foreground-watcher exception, and shell migration |

## Owned Files

### New command

- `src/commands/WatchCommand.ts` — validates lane, exports invocation context,
  delegates to the foreground service, and maps typed results
- `src/foundation/ForegroundWatcher.ts` — owns manifest/profile resolution,
  preflight planning, sanitized environment construction, stdio/signal/exit
  semantics, and the proven foreground runtime path

## Dependencies

### From this pack

- **LC-05** (coordinator baselines and pack index): watch preflight reads
  routing-policy.json and pack-index.json to validate lane readiness.

### From pack 2 (wt-runtime-distribution)

- **RT-07** (watcher and runtime smoke): the watcher binary is packaged and
  verified. WatchCommand validates the watcher exists and is executable.

## Required Interfaces

### WatchCommand

```typescript
export default class WatchCommand extends BaseCommand implements Command {
  name: "watch";
  group: "lane";
  // Parses --lane, --workspace; delegates one request to ForegroundWatcher;
  // maps the typed result to terminal output and exit status.
}
```

## Implementation Steps

1. **Create `src/commands/WatchCommand.ts`**
   - Extend BaseCommand; name `"watch"`; group `"lane"`
   - Parse global options: `--lane`, `--workspace`
   - Reject `--json` (watch is a foreground runtime attachment)
   - Preflight:
     - Resolve workspace via RM-03
     - Discover and select lane via RM-06 (or explicit --lane)
     - Validate lane exists and has valid `lane.json` and `install.json`
     - Validate runtime version in install.json is staged via RT-04 catalog
     - Validate coordinator baselines exist (routing-policy.json,
       pack-index.json) via LC-05 output
     - Validate pack index matches active seal
     - Check for active watcher already running (via heartbeat/lock)
   - Construct invocation context:
     - Build `WT_*` environment variables per v1.md §12:
       - `WT_WORKSPACE` — control home path
       - `WT_LANE_ID` — lane UUID
       - `WT_INITIATIVE_ID` — initiative ID
       - `WT_LANE_SLUG` — lane slug
       - `WT_LANE_DIR` — `.watchtower/lanes/{slug}`
       - `WT_HOME_REPOSITORY_ID` — control home repo ID
       - `WT_REPOSITORIES_FILE` — path to `repositories.local.json`
       - `WT_ACTIVE_REPOSITORY_ID` — control home repo (watcher default)
       - `WT_RUNTIME_ROOT` — stage runtime root
       - `WT_RUNTIME_VERSION` — pinned runtime version
       - `WT_KNOWLEDGE_ROOT` — knowledge pack root
     - Resolve the watcher action and entrypoint from the checksum-verified
       runtime catalog plus the lane-pinned task profile. Never hardcode a
       filename, assume the entrypoint is shell, or consult project `nvb.json`.
     - Verify the declared entrypoint exists, is a regular executable managed
       asset, and matches its manifest checksum.
   - Exec watcher:
     - Use `ForegroundWatcher` and RT-05's proven foreground invocation
       capability. If RT-05 proves NVB foreground stdin/signal semantics, use
       the exact catalog action through `LaneTaskRunner`; otherwise keep the
       foreground watcher on its manifest-declared compatibility path through
       the narrow Nirvana `cmd`-based central adapter allowed by
       `nirvana-integration-architecture.md §9`.
     - Construct an explicit environment allowlist. Never merge or forward all
       of `process.env`; parent secrets and undeclared keys must not reach the
       watcher or diagnostics.
     - Inherit stdin, stdout, stderr
     - Forward signals: SIGINT (Ctrl-C) → terminate foreground process group
     - Forward SIGTERM → terminate foreground process group
     - Preserve exit code
   - Handle errors:
     - Missing lane → exit 3
     - Missing watcher → exit 4
     - Corrupt checksum → exit 4
     - Runtime not staged → exit 4
     - Watcher already running → exit 5
     - Stale pack index → exit 4

2. **Create help/commands/watch.hlp.json**
   - Describe watch command, syntax, preflight steps
   - Document signal behavior: Ctrl-C terminates, stdout/stderr passthrough
   - Document that --json is rejected

3. **Register in help/help.json**

4. **Write focused specs**
   - `spec/commands/WatchCommand.spec.ts`: lane selection, preflight
     delegation, result mapping, and error cases
   - `spec/foundation/ForegroundWatcher.spec.ts`: manifest/profile resolution,
     checksum validation, environment isolation, stdio, signal forwarding,
     exit propagation, and RT-05 boundary selection; use a fixture executable
     declared by the runtime manifest

## Exclusions

- No watcher-loop logic in the command or foundation service; the selected
  packaged entrypoint owns that behavior
- No daemonization or background process management
- No coordinator cycle execution
- No doctor checks (doctor validates the watcher, not the command)

## Required Proof

### Focused
- Command parses `--lane` and `--workspace`
- Command rejects `--json`
- Preflight validates lane existence
- Preflight validates watcher binary existence
- Preflight validates watcher checksum
- Env export contains all required `WT_*` variables
- Env values match actual lane data
- Watcher exec inherits stdio
- Ctrl-C terminates the foreground process
- Exit code propagated from watcher
- Missing lane → exit 3
- Missing watcher → exit 4
- Stale pack index → exit 4

### Regression
- `nvb build` passes

### Architecture
- WatchCommand delegates to `ForegroundWatcher`
- `ForegroundWatcher` uses the RT-05 foreground boundary and uses
  `LaneTaskRunner` for bounded sub-operations where the accepted API preserves
  foreground semantics
- WatchCommand does not construct shell strings
- WatchCommand does not contain product logic

### Adversarial
- Watcher binary replaced with non-executable file
- Watcher binary checksum mismatch
- Lane deleted between preflight and exec
- Signal forwarding during watcher startup

## Help and Documentation

- Create `help/commands/watch.hlp.json`
- Register in `help/help.json`

## Handoff Notes

After acceptance, WatchCommand is the single entry point for `wt watch`.
LC-07 (doctor) may check watcher health (presence, heartbeat) but does not
start or stop the watcher.
