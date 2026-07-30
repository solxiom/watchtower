# Batch RT-07 — Packaged Watcher and Runtime Smoke Proof

Status: ❌ Pending
Phase: Runtime adapter, managed links, and smoke proof
Depends on: RT-03 accepted (NVB dist), RT-05 accepted (runtime adapter), RT-06 accepted (managed links)

**Required implementor reasoning class:** `R3`
**Class rationale:** integration smoke testing with explicit fixtures and bounded assertions. The class is a floor; escalate when source inspection reveals missing test conditions.

## Objective

Prove the relocated package works. The smoke test must demonstrate wake stdout
output, signal forwarding (SIGINT stops the watcher), and worker account
read-but-cannot-write enforcement. The test must run from a relocated package
directory, not the source tree.

## Required Work

1. Implement integration smoke test in `spec/integration/runtime-smoke.spec.ts`:
   - Set up a temporary test workspace that mimics a real lane control home
   - Install the relocated package (simulate `npm install -g ../dist` by using
     the package-relative `dist/bin/wt.js` entrypoint, or configure the test to
     resolve the CLI from the package build output)
   - Test 1: **Wake stdout behavior** — invoke the watcher through the runtime
     adapter, capture stdout for a short interval, assert the output matches
     expected wake patterns (e.g., "watching", "ready", or specific log lines
     defined by the bundled watcher script)
   - Test 2: **Signal forwarding** — start the watcher, send SIGINT, assert the
     process exits within a timeout, assert exit code is 0 (or the watcher's
     documented graceful-exit code)
   - Test 3: **Worker account read-but-cannot-write** — resolve the configured
     worker OS account (from test fixture config), assert the account can read
     runtime entrypoints (mode `0o755`), assert the account cannot write to
     runtime entrypoints (writable check should fail unless the account is the
     owner)
   - Test 4: **No hardcoded paths** — grep the relocated package's `dist/` tree
     for any absolute path matching the source repository; assert zero matches

2. Test fixture requirements:
   - Must not depend on a real tmux session or global user-data mutation
   - Must use temporary XDG data directories for the runtime store
   - Must use a temporary control home with minimal valid `lane.json` and
     `install.json`
   - Must clean up all temporary directories after each test
   - Must not leave orphaned subprocesses (use `afterEach` / `afterAll` cleanup)

3. The smoke test is an acceptance gate, not a full integration suite. It must
   prove the critical runtime path works from a relocated package before any
   lane lifecycle work begins.

## Expected Ownership

- `spec/integration/runtime-smoke.spec.ts` — smoke test suite
- No new foundation or contract code — all behavior is exercised through the
  existing foundation modules

## Tests And Evidence

- Prove the smoke test passes with the relocated package (not source tree)
- Prove wake stdout output matches expected patterns
- Prove SIGINT stops the watcher and exit code is captured correctly
- Prove worker account can read runtime entrypoints
- Prove worker account cannot write to runtime entrypoints
- Prove no absolute paths to the source repository exist in the relocated package
- Prove temporary directories are cleaned up after each test
- Prove no orphaned subprocesses remain after test execution
- Run architecture checks

## What Must Not Change

- Do not modify any foundation or contract code — the smoke test only exercises
  existing modules
- Do not create new runtime scripts or knowledge docs
- Do not depend on a real tmux server or global user state
- Do not introduce new npm dependencies (use existing test framework and
  Node.js built-ins)

## Review Procedure Highlights

1. Run the smoke test independently from a clean build.
2. Verify the test uses a relocated package directory, not the source tree.
3. Verify wake output assertions match the actual bundled watcher behavior.
4. Verify signal forwarding test actually starts and kills a process.
5. Verify worker account write-denial is checked programmatically, not
   manually.
6. Grep the relocated package for hardcoded source paths.
7. Verify cleanup leaves no tmp directories or orphaned processes.
