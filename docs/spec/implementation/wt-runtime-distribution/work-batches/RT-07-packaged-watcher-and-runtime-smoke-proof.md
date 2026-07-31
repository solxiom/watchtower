# Batch RT-07 — Packaged watcher and task-runtime smoke proof

## Synchronized batch execution matrix

- **Accepted-map title:** Packaged watcher and task-runtime smoke proof
- **Dependencies:** `RT-03`, `RT-05`, `RT-06`
- **Exclusive ownership/interface:** integration fixtures
- **Implementer/reviewer floor:** R3 / R3
- **Mandatory batch proof:** Relocated package works; catalog/profile escape rejected; structured task result; wake stdout/signal behavior; worker accounts read but cannot write
- **Implementation report:** `.local/agent-reports/wt-runtime-distribution/RT-07-packaged-watcher-and-runtime-smoke-proof.md`
- **Review report:** `.local/agent-reports/wt-runtime-distribution/reviews/RT-07-packaged-watcher-and-runtime-smoke-proof-review.md`
- **Correction report:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-07-packaged-watcher-and-runtime-smoke-proof-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **integration fixtures**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-runtime-distribution/RT-07-packaged-watcher-and-runtime-smoke-proof.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RT-03`, `RT-05`, `RT-06`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Relocated package works; catalog/profile escape rejected; structured task result; wake stdout/signal behavior; worker accounts read but cannot write**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **integration fixtures** and **Relocated package works; catalog/profile escape rejected; structured task result; wake stdout/signal behavior; worker accounts read but cannot write**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-runtime-distribution/RT-07-packaged-watcher-and-runtime-smoke-proof.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
