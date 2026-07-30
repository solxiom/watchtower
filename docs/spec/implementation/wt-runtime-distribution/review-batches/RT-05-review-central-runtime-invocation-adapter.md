# Review Batch RT-05 — Central Runtime Invocation Adapter

Status: ❌ Pending
Reviews work batch: RT-05
Depends on: RT-05 implementation complete, implementation report written

**Required reviewer reasoning class:** `R5`
**Class rationale:** independent security audit of the single invocation boundary between TypeScript and shell runtime. Env allowlisting, argv-only execution, signal forwarding, and access validation require the strongest verification.

## Scope Verification

Confirm that the runtime adapter is the single invocation boundary, enforces
argv-only execution with `{ shell: false }`, allowlists only `WT_*` environment
variables, validates cwd/account/access, forwards signals, and never logs
secrets. No second invocation boundary exists.

## Required Independent Proof

1. Audit the entire codebase for `child_process.spawn`, `child_process.exec`,
   `child_process.execFile`, and `child_process.fork`. Verify only one
   invocation boundary exists and it is `RuntimeAdapter.invoke()`.
2. Mock `child_process.spawn` and assert:
   - `options.shell` is `false` or absent (not `true`)
   - `command` argument is a string path, not a shell command with operators
   - no template literal or string interpolation constructs the command
3. Verify the env object passed to spawn:
   - contains only keys matching `^WT_`
   - does not contain any `process.env` keys (e.g., `PATH`, `HOME`, `USER`)
   - assert the exact count of keys matches the expected `WT_*` set
4. Test cwd validation:
   - pass a non-existent directory path → error `CWD_NOT_FOUND`
   - pass a file path as cwd → error
5. Test access validation:
   - pass a non-existent entrypoint path → error
   - pass a non-readable file → error
   - pass a non-executable file → error
6. Test action validation: invoke an action not in the runtime manifest → error
   before spawn
7. Test path-escape: construct an action path with `..` segments that escapes the
   runtime root → error before spawn
8. Test signal forwarding: start a real subprocess (e.g., a script that blocks),
   send SIGINT, assert child process exits with signal, exit code propagated
9. Test verbose output: capture verbose log output, assert it contains `WT_*`
   key names (like `WT_LANE_ID`) but never their values
10. Test `RuntimeInvoker.buildInvocationContext()`: assert correct `WT_*` map,
    coordinator-only variables absent for non-decision invocations, present for
    decision invocations
11. Run architecture checks.

## Acceptance Gate

Accept only if one invocation boundary exists, `spawn` uses `{ shell: false }`,
only `WT_*` keys are exported, `process.env` is never passed, cwd/account/access
are validated, all rejection paths are proved, signal/exit forwarding works,
verbose output is safe, and `buildInvocationContext` produces the correct map.

## Rejection Correction Brief Rule

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-05-correction-<N>.md`

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-05-central-runtime-invocation-adapter-review.md`

If accepted, create the acceptance commit.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Always plan and make task lists
