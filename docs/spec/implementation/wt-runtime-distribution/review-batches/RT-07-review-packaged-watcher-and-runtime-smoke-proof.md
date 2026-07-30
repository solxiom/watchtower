# Review Batch RT-07 — Packaged Watcher and Runtime Smoke Proof

Status: ❌ Pending
Reviews work batch: RT-07
Depends on: RT-07 implementation complete, implementation report written

**Required reviewer reasoning class:** `R3`
**Class rationale:** bounded integration smoke verification with explicit fixtures and well-defined pass/fail criteria. The class is a floor.

## Scope Verification

Confirm that the smoke test proves relocated package operation (wake stdout,
signal forwarding, worker account enforcement, no hardcoded paths). No
foundation or contract code was modified — the smoke test only exercises
existing modules.

## Required Independent Proof

1. Build the project from clean (`nvb build` + `nvb dist`).
2. Run the smoke test from a clean state (no leftover tmp directories).
3. Verify the test uses a relocated package directory, not the source tree:
   - assert the test constructs a temporary workspace and references the
     `dist/bin/wt.js` entrypoint
   - assert the test does not reference `src/`, `build/`, or the project root
4. Test wake stdout: assert the watcher process emits expected patterns on
   stdout within a timeout. Record the actual output.
5. Test signal forwarding: assert the watcher process starts, receives SIGINT,
   exits within a timeout, and exit code matches expected clean-exit value.
6. Test worker account enforcement:
   - resolve the worker OS account from the test fixture config
   - assert the account can stat/read the runtime entrypoint
   - assert the account cannot write to the runtime entrypoint
   - this test may be skipped (reported as `skip`) if running as root or if no
     distinct worker account is configured; the skip reason must be explicit
7. Grep the relocated `dist/` tree for any absolute path matching the source
   repository. Assert zero matches.
8. After all tests: assert no temporary directories remain, and no orphaned
   subprocesses (check process list for watcher processes).
9. Run architecture checks.

## Acceptance Gate

Accept only if the smoke test passes from a relocated package, wake stdout
matches expected patterns, SIGINT stops the watcher cleanly, worker accounts
have read-but-not-write access (or the test is legitimately skipped with
documented reason), no hardcoded source paths exist in `dist/`, and cleanup
leaves no artifacts.

## Rejection Correction Brief Rule

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-07-correction-<N>.md`

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-07-packaged-watcher-and-runtime-smoke-proof-review.md`

If accepted, create the acceptance commit and update the pack tracker to mark
`wt-runtime-distribution` as complete. This is the Pack 2 exit gate.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Always plan and make task lists
