# Review Batch RT-07 — Packaged watcher and task-runtime smoke proof

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
Reviews work batch: RT-07
Depends on: RT-07 implementation complete, implementation report written

**Required reviewer reasoning class:** `R3`
**Class rationale:** bounded integration smoke verification with explicit fixtures and well-defined pass/fail criteria. The class is a floor.

## Scope Verification

Confirm that the smoke test proves relocated package operation, exact pinned
task-runtime selection, structured NVB results, catalog/profile/target escape
refusal, environment isolation, wake stdout, accepted foreground signal
semantics, worker-account enforcement, and no hardcoded paths. No foundation or
contract code was modified; the smoke test exercises accepted modules.

## Required Independent Proof

1. Build the project from clean (`nvb build` + `nvb dist`).
2. Run the smoke test from a clean state (no leftover tmp directories).
3. Verify the test uses a relocated package directory, not the source tree:
   - assert the test constructs a temporary workspace and references the
     `dist/bin/wt.js` entrypoint
   - assert the test does not reference `src/`, `build/`, or the project root
4. Verify an allowed catalog action resolves through the pinned lane profile to
   the exact relocated config/module target and yields schema-valid structured
   events/result without terminal parsing.
5. Attempt arbitrary task/group/config/module, disallowed profile action,
   target/path/digest drift, and malicious project `nvb.json`; require
   pre-execution rejection and byte-identical project config.
6. Seed parent environment sentinels; prove undeclared values and secrets do not
   reach tasks/leaves/logs/results.
7. Test wake stdout: assert the watcher process emits expected patterns on
   stdout within a timeout. Record the actual output.
8. Test signal forwarding: assert the watcher process starts, receives SIGINT,
   exits within a timeout, and exit code matches expected clean-exit value.
   Attribute that behavior to NVB only with RT-05 pinned API/integration proof.
9. Test worker account enforcement:
   - resolve the worker OS account from the test fixture config
   - assert the account can stat/read the runtime entrypoint
   - assert the account cannot write to the runtime entrypoint
   - this test may be skipped (reported as `skip`) if running as root or if no
     distinct worker account is configured; the skip reason must be explicit
10. Grep the relocated `dist/` tree for any absolute path matching the source
   repository. Assert zero matches.
11. After all tests: assert no temporary directories remain, and no orphaned
   subprocesses (check process list for watcher processes).
12. Run architecture checks.

## Acceptance Gate

Accept only if the relocated pinned task runtime returns structured results,
catalog/profile/target/environment escapes fail, wake stdout and accepted
foreground SIGINT behavior work, worker accounts have read-but-not-write access
(or a legitimate explicit skip), no source path exists in `dist/`, and cleanup
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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **integration fixtures**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-runtime-distribution/reviews/RT-07-packaged-watcher-and-runtime-smoke-proof-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

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

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-07-packaged-watcher-and-runtime-smoke-proof-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-runtime-distribution/reviews/RT-07-packaged-watcher-and-runtime-smoke-proof-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
