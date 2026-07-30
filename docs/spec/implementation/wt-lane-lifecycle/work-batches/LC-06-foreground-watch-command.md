# Work Batch LC-06 — Foreground Watch Command

Status: ❌ Pending
Implementation reasoning: R4
Review reasoning: R4
Depends on: LC-05, RT-07
Workload: medium

## Scope

Implement the `wt watch` command. Preflight the lane, export the runtime
invocation context, exec the bundled watcher in the foreground. Stdout/stderr
passthrough. Ctrl-C terminates the foreground process group. No daemonization.
This batch owns the WatchCommand.

## Specification References

| Reference | Section | Topic |
|-----------|---------|-------|
| v1.md | §11.4 | Watch command behavior: validates lane, exports env, execs watcher, no daemonize |
| v1.md | §12 | Runtime invocation contract: WT_* environment variables |
| v1.md | §14 | Watcher must not daemonize, use model for idle polling, or infer lifecycle from tmux prose |
| v1-contracts.md | §8 | Watch rejects --json |
| architecture.md | §4.5 | Runtime adapter: verifies action, resolves lane/runtime, supplies WT_*, forwards signals |
| architecture.md | §6.3 | Runtime execution flow |

## Owned Files

### New command

- `src/commands/WatchCommand.ts` — validates lane, exports invocation context,
  resolves and execs watcher, handles signals

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
  // Parses --lane, --workspace; delegates preflight to foundation;
  // resolves watcher path through RuntimeInvoker; exec's with WT_* env
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
     - Resolve watcher binary path: `{runtimeRoot}/coordinator/coordinator-watch.sh`
     - Verify watcher exists and is executable
     - Verify watcher checksum against install.json manifest
   - Exec watcher:
     - Use RuntimeInvoker (RT-05) to invoke the action
     - Pass `WT_*` environment
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
     validation, watcher resolution, env construction, signal forwarding,
     error cases; use a fake/mock watcher binary for unit tests
   - Verify that RuntimeInvoker is called with correct action and env

## Exclusions

- No watcher logic — the watcher is in the shell runtime
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
- WatchCommand delegates to RuntimeInvoker (RT-05)
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
