# Review Batch RT-07 — Packaged Watcher and Runtime Smoke Proof

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
