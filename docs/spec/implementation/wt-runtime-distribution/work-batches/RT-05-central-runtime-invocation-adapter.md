# Batch RT-05 — Central Runtime Invocation Adapter

Status: ❌ Pending
Phase: Runtime adapter, managed links, and smoke proof
Depends on: RT-04 accepted (immutable catalog), RM-01 accepted (contract kernel from Pack 1)

**Required implementor reasoning class:** `R5`
**Class rationale:** single security boundary between the TypeScript control plane and the shell runtime. Env allowlisting, argv-only execution, account permission validation, signal forwarding, and subprocess management cross interacting state concerns. The class is a floor.

## Objective

Implement the single runtime invocation adapter. All runtime script spawning must
cross this boundary. The adapter constructs argv without shell interpolation,
allows only `WT_*` environment variables, validates cwd/account/access, and
forwards signals and exit status.

## Required Work

1. Implement `RuntimeAdapter` in `src/foundation/runtime-adapter.ts`:
   - `invoke(action: string, options: RuntimeInvokeOptions): ChildProcess`
     - resolve the action against the runtime manifest to get the script path
     - validate the action is declared in the manifest's `actions` for at least
       one asset
     - use `child_process.spawn(scriptPath, argv, options)` with `{ shell: false }`
     - construct the `WT_*` environment from resolved lane context, not
       `process.env`
     - export only keys matching `^WT_` — never pass arbitrary environment
     - validate cwd exists and is a directory (throw `CWD_NOT_FOUND` otherwise)
     - resolve effective OS user and check filesystem access on the entrypoint
       (read + execute permission; throw `ACCESS_DENIED` otherwise)
     - supports `stdio: 'inherit'` for interactive actions and `stdio: 'pipe'`
       for captured output
     - forward signals: SIGINT → `child.kill('SIGINT')`, SIGTERM →
       `child.kill('SIGTERM')`, SIGHUP → `child.kill('SIGHUP')`
     - preserve child exit code and signal status
     - log only `WT_*` key names at `--verbose`, never values
   - The adapter must never:
     - use `{ shell: true }`
     - construct a command string with template literals
     - pass `process.env` to the child
     - log environment values at any verbosity level
     - invoke an action not declared in the runtime manifest
     - invoke a script path that escapes the runtime root after resolution

2. Implement `RuntimeInvoker` in `src/foundation/runtime-invoke.ts`:
   - `buildInvocationContext(lane: ResolvedLane, action: string):
     RuntimeInvokeContext`
     - resolves the lane's installed runtime version from the catalog
     - builds the `WT_*` environment map from lane context:
       `WT_WORKSPACE`, `WT_LANE_ID`, `WT_INITIATIVE_ID`, `WT_LANE_SLUG`,
       `WT_LANE_DIR`, `WT_HOME_REPOSITORY_ID`, `WT_REPOSITORIES_FILE`,
       `WT_ACTIVE_REPOSITORY_ID`, `WT_RUNTIME_ROOT`, `WT_RUNTIME_VERSION`,
       `WT_KNOWLEDGE_ROOT`
     - coordinator-only variables (`WT_COORDINATOR_CYCLE_ID`,
       `WT_DECISION_CLASS`) are present only for bounded decision invocations
   - `resolveActionPath(action: string, runtimeRoot: string): string` — maps an
     action name to the script path within the runtime root, validated against
     the runtime manifest

3. Define `RuntimeInvokeOptions` and `RuntimeInvokeContext` types in
   `src/contracts/manifests.ts` (or a new `src/contracts/runtime.ts` if they
   don't fit the manifests module).

## Expected Ownership

- `src/foundation/runtime-adapter.ts` — `RuntimeAdapter` class
- `src/foundation/runtime-invoke.ts` — `RuntimeInvoker`, context construction
- `src/contracts/manifests.ts` — `RuntimeInvokeOptions`, `RuntimeInvokeContext`
  types

## Tests And Evidence

- Prove `spawn` is called with `{ shell: false }` (mock `child_process.spawn`
  and assert the options)
- Prove only `WT_*` keys are exported (assert the env object passed to spawn)
- Prove `process.env` is never merged or passed through
- Prove cwd validation rejects a non-existent directory
- Prove cwd validation rejects a file path
- Prove access check rejects a non-readable entrypoint
- Prove access check rejects a non-executable entrypoint
- Prove action not in manifest is rejected before spawn
- Prove script path escape after resolution is rejected
- Prove SIGINT forwarded to child process
- Prove child exit code preserved
- Prove child signal exit detected
- Prove verbose output contains `WT_*` key names but not values
- Prove `RuntimeInvoker.buildInvocationContext` produces the correct `WT_*` map
- Prove coordinator-only variables are absent for non-decision invocations
- Prove coordinator-only variables are present for decision invocations
- Run architecture checks

## What Must Not Change

- Do not create a second invocation boundary — all spawning crosses
  `RuntimeAdapter`
- Do not use `{ shell: true }` anywhere in the adapter
- Do not use template literals for command construction
- Do not pass `process.env` to child processes
- Do not log environment values at any level
- Do not introduce managed-link or smoke-proof logic

## Review Procedure Highlights

1. Trace every `child_process.spawn` call in the codebase. Confirm only one
   invocation boundary exists.
2. Mock the subprocess layer and assert exact spawn arguments for each rejection
   path.
3. Verify the env object passed to spawn contains only `^WT_` keys.
4. Verify no string interpolation or shell-mode is used.
5. Verify verbose output is safe (key names only, no values).
6. Verify signal forwarding with a real subprocess fixture (e.g., a script that
   blocks on stdin, then is killed).
7. Verify exit code and signal propagation.
