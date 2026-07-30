# Batch RT-07 — Packaged Watcher and Task-Runtime Smoke Proof

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
Phase: Runtime adapter, managed links, and smoke proof
Depends on: RT-03 accepted (packaged NVB runtime), RT-05 accepted (lane task
runner), RT-06 accepted (managed links and task profile)

**Required implementor reasoning class:** `R3`
**Class rationale:** integration smoke testing with explicit fixtures and bounded assertions. The class is a floor; escalate when source inspection reveals missing test conditions.

## Objective

Prove the relocated package and lane-pinned task runtime work together. The
smoke test demonstrates an explicit immutable NVB config/module target,
profile-bounded action selection, a structured task result, task/leaf
environment isolation, catalog/profile escape rejection, watcher wake stdout,
foreground SIGINT behavior, and worker read-but-cannot-write enforcement. It
runs from a clean relocated/global package, never the source tree.

## Required Work

1. Implement integration smoke test in `spec/integration/runtime-smoke.spec.ts`:
   - Set up a temporary test workspace that mimics a real lane control home
   - Install the relocated package (simulate `npm install -g ../dist` by using
     the package-relative `dist/bin/wt.js` entrypoint, or configure the test to
     resolve the CLI from the package build output)
   - Test 1: **Pinned packaged task** — invoke a non-interactive catalog action
     through `LaneTaskRunner`; prove exact relocated config/module targets,
     profile action mapping, structured events/result, and no terminal-text
     parsing.
   - Test 2: **Catalog/profile escape** — attempt arbitrary task/group,
     alternate config/module, path escape, digest drift, disallowed action, and
     malicious project `nvb.json`; prove rejection before execution.
   - Test 3: **Environment isolation** — seed parent `process.env` with sentinel
     secrets and undeclared keys; prove only task/leaf-declared values reach the
     handler/leaf and logs/results contain no values.
   - Test 4: **Wake stdout behavior** — invoke the foreground watcher through
     its accepted lifecycle owner (using bounded NVB sub-operations only where
     RT-05 proved semantics), capture stdout, and assert the output matches
     expected wake patterns (e.g., "watching", "ready", or specific log lines
     defined by the bundled watcher script)
   - Test 5: **Signal forwarding** — start the watcher, send SIGINT, assert the
     process exits within a timeout, assert exit code is 0 (or the watcher's
     documented graceful-exit code); do not attribute foreground signal
     handling to NVB without RT-05 pinned API/integration proof
   - Test 6: **Worker account read-but-cannot-write** — resolve the configured
     worker OS account (from test fixture config), assert the account can read
     runtime entrypoints (mode `0o755`), assert the account cannot write to
     runtime entrypoints (writable check should fail unless the account is the
     owner)
   - Test 7: **No hardcoded paths** — grep the relocated package's `dist/` tree
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
- Prove an allowed action yields validated structured NVB events/result from the
  exact pinned relocated target
- Prove arbitrary task/config/module/profile/path/digest escape and malicious
  project `nvb.json` cannot affect execution
- Prove parent environment sentinels do not reach the task/leaf or diagnostics
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
- Do not parse styled terminal output as a task result or claim NVB foreground
  signal/stdin/PTY support beyond RT-05 evidence
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
