# Review Batch REL-03 — Security, Ownership, Performance, And Package Qualification

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

Status: ❌ Pending | Reviews work batch: REL-03
Work ID: `REL-03`
Governing spec: `docs/spec/v1.md` §§4, 7, 8, 14, 15, 17; `docs/spec/v1-contracts.md` §§3, 6, 8, 11, 12

**Required reviewer reasoning class:** `R5`
**Class rationale:** independent reproduction of the broadest adversarial surface in the release pack. The reviewer must verify: path-traversal refusal at four security boundaries (lane directory, repository binding, runtime store, within-lane), shell-injection refusal across a command-substitution/expansion/operator corpus, multi-account permission isolation (operator write, worker read/execute/deny-write, doctor reporting), manifest integrity at build and install time (missing/extra/non-executable/checksum-mismatch negative cases, seal reproducibility), global-install integrity (staged runtime matches dist manifest and checksums, two-runtime coexistence), SQLite driver qualification (native binary integrity, global-install proof, WAL/busy-handler tests, corruption detection and recovery, semantic-root rebuild producing identical logical rows, permission boundary proof through connection-level read-only), bounded discovery and status (actual wall-time/output-size measurements at 30/300/3,000/10,000 batch scales), zero model invocations for all mechanical coordination operations, and skill install correctness for Codex/Cursor/Claude. The reviewer must independently execute every adversarial fixture. The class is a floor.

## Scope Verification

Confirm that the implementation produced:

1. `spec/security/path-traversal.spec.ts` — path traversal refusal at four security boundaries.
2. `spec/security/config-injection.spec.ts` — strict-env parser shell-injection corpus.
3. `spec/security/permissions.spec.ts` — multi-account permission model.
4. `spec/security/manifest-integrity.spec.ts` — manifest completeness and checksum verification at build time.
5. `spec/security/sqlite-driver-qualification.spec.ts` — SQLite driver integrity, global-install proof, WAL/busy-handler, corruption detection and recovery, semantic-root rebuild, permission boundary.
6. `spec/performance/bounded-discovery.spec.ts` — bounded list/status at synthetic pack scales.
7. `spec/performance/bounded-status.spec.ts` — bounded output size at synthetic pack scales.
8. `spec/performance/model-invocation-audit.spec.ts` — zero model invocations for mechanical coordination.
9. `.local/agent-reports/watchtower-release/REL-03-security-performance-qualification.md` — the release evidence packet.
10. Updated trackers (`implementation-tracker.md`, `implementation-roadmap.md`, work/review indexes, `v1-implementation-map.md`).
11. No new product features, commands, or foundation modules.
12. No mock that replaces the real `wt` binary (except unit-level parser tests where direct import is the intended security boundary).

## Required Independent Proof

### Contract pass

1. **Prerequisite verification:** Confirm REL-01 and REL-02 are marked accepted. Run `nvb build` and `nvb test` independently. Record commit hash.
2. **Path traversal suite:** Independently reproduce at minimum one negative case per boundary: lane directory escape (slug with `../`), repository binding escape (scope path with `../../../etc`), runtime store path escape (manifest with `../` in target), within-lane path escape (batch/session ID with `../`). For each, verify `wt init` refuses or the path is safely bounded. Additionally test null-byte and absolute-path injection.
3. **Config injection suite:** Independently reproduce at minimum one command-substitution input (`$(whoami)`), one shell-operator input (`; rm -rf /`), one variable-expansion input (`$HOME`), and one valid input. Verify injection inputs are rejected or stored as literal text without execution. Verify valid inputs parse correctly.
4. **Permission suite:** If multi-account testing is available: independently create a worker account, verify read/execute access to the runtime store succeeds, verify write access is denied, verify `wt doctor` reports access violations. If multi-account testing is not available: audit the permission check code paths and verify they are structurally correct.
5. **Manifest integrity suite:** Independently run `nvb dist`. Verify `dist/runtime/manifest.json` lists every managed asset. For a sample of files, compute actual SHA-256 and compare to the manifest. Create a modified manifest with a checksum mismatch and verify `nvb dist` build validation fails. Verify two builds from the same committed tree produce identical seals.
6. **Global install integrity:** Independently run `npm install -g ./dist`. Verify staged runtime files after `wt init` match the dist manifest and checksums. Stage a second synthetic runtime version and verify coexistence.
7. **SQLite driver qualification:** Independently reproduce at minimum:
   - Driver integrity: compute the native binary SHA-256 and compare to the manifest.
   - Global-install proof: from outside the dev tree, load the SQLite driver through the lane runtime API and verify it opens a database.
   - WAL/busy-handler: verify WAL journal mode is active; open two read-only connections and execute concurrent reads — both must succeed.
   - Corruption detection: truncate a valid database and verify the runtime refuses to serve; test with a random-bytes file and verify detection.
   - Semantic-root rebuild: record logical table contents, delete the database file, trigger rebuild, verify identical logical rows and schema version.
   - Permission boundary: verify worker `SELECT` succeeds, worker `INSERT`/`UPDATE`/`DELETE`/`DROP`/write `PRAGMA` fails through the runtime's read-only connection.
8. **Boundedness measurement:** Independently run `wt list` and `wt status --json` at two or more synthetic pack scales. Record actual wall time and output size. Verify wall time does not grow linearly with pack size.
9. **Model-free audit:** Independently verify at least one mechanical coordination operation (e.g., ready-set calculation, heartbeat emission, session presence check) has no model invocation in its source path. Audit the source file to confirm no adapter import or invocation endpoint exists.
10. **Skill install:** Independently run `wt skill install <host>` for at least one supported host. Verify preview output, version recording, and no lane-specific state in the installed output.
11. **Decision adapters:** From the global install, independently qualify a
    real compatible `opencode-cli` route. Reproduce bounded invocation,
    malformed result, timeout/cancellation, write-denial, redaction,
    catalog-fingerprint invalidation, capability-first selection, and
    single-debit shared-pool cases. If Hermes is installed, repeat applicable
    checks; otherwise verify the explicit non-failing skip.

### Flow pass

Trace the full security and performance evidence pipeline end to end, executing every adversarial fixture. Record exact commands, exit codes, stdout (truncated if large), and execution time. Record any deviation from the implementation report's claimed outcome.

### Validation pass

1. **Negative-case correctness:** For each path-traversal and injection refusal, verify the diagnostic clearly identifies the violation (not a generic error).
2. **Checksum and seal correctness:** Verify SHA-256 computation uses the same algorithm and input normalisation as the build system.
3. **Boundedness correctness:** Verify measurements are actual wall time and byte counts, not narrative approximations. If the implementation uses `process.hrtime`, verify the resolution and warmup compensate for Node.js JIT effects.
4. **SQLite rebuild correctness:** Verify the rebuild produces identical logical rows by comparing pre-deletion and post-rebuild snapshots. Any row difference (including ordering where order is semantically significant) is a finding.

### Architecture pass

1. **Source change scope:** Verify the diff touches only spec files (`spec/security/` and `spec/performance/`), synthetic fixtures, trackers, and the release evidence report (`.local/`). No `src/` files changed.
2. **No feature additions:** Verify no new command class, foundation module, or contract type was created.
3. **Line counts:** Verify security and performance spec files do not exceed the 400-line ceiling. Split by attack surface if needed.
4. **Architecture check:** Independently run `nvb check:architecture`. Must exit 0.

### Test-quality pass

1. **Security spec execution:** Independently run all security specs. Verify they pass with deterministic outcomes. Any flaky test (passes sometimes, fails other times) is a defect.
2. **Performance spec execution:** Independently run all performance specs. Verify the measurement environment matches the implementation report's environment. If environment differs significantly, note the discrepancy but do not reject on environment mismatch alone — flag it.
3. **Full test suite:** Run `nvb test` independently. Compare pass/fail counts to the REL-02 baseline. Any new failure not already documented is a defect.

### Security and compatibility pass

1. **No secrets in evidence:** Review the release evidence packet. Verify no password, token, connection URL, or credential appears.
2. **No actual system modification:** Verify security specs clean up all temporary files, temporary accounts (if created), and Git repositories. No fixture state should survive `afterAll`.
3. **SQLite driver bundling:** Verify the native SQLite binary is bundled in the dist package and its path does not rely on a dev-tree `node_modules` resolution.

## Nira/Watchtower-Specific Guardrails For Review

1. Verify path traversal refusal exercises every documented security boundary, not just the most obvious one.
2. Verify the strict-env parser does not invoke `eval()`, `exec()`, `source`, or any shell interpreter on config values.
3. Verify the runtime catalog's permission checks are not bypassable through symlink indirection.
4. Verify manifest checksum comparison is constant-time or at minimum does not short-circuit on missing files.
5. Verify model-invocation audit covers the full mechanical coordination inventory from `coordinator-automation.md`.
6. Verify the SQLite driver is included in the runtime manifest with a checksum and loads from the globally installed package, not the dev tree.
7. Verify SQLite busy-handler and WAL tests use real concurrent connections, not mocked or sequential simulators.
8. Verify corruption detection tests actually produce a corrupt database file (not just rename it), and the runtime detects and refuses service.
9. Verify semantic-root rebuild compares actual logical row contents, not just row counts or file sizes.
10. Verify no `.watchtower/` directory is committed.
11. Verify no build, dist, node_modules, or `.nira/local/` artifacts are in git.

## Structural And Module-Size Acceptance

Line count is a design alarm, never permission to accumulate unrelated work.
Count physical lines, including comments and blanks, in new and materially
rewritten hand-maintained files. Generated artifacts are excluded only when
their generator ownership is explicit and they contain no hand-maintained
behavior.

Use the exact project-wide matrix:

| Category | Preferred maximum | Warning band | Hard reject |
| --- | ---: | ---: | ---: |
| CLI command, NVB TaskHandler/front door, registry, renderer, public barrel | 120 | 121–160 | over 180 |
| Orchestrator, controller, coordinator, presenter | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contract/type-only module | 240 | 241–320 | over 400 |
| Test/spec module | 300 | 301–420 | over 500 |

Functions target 40 lines, warn at 41–60, and reject above 80. Constructors
target 25 lines, warn at 26–40, and reject above 50. Warning-band owners require
a responsibility inventory and explicit reviewer judgment.

Every module has one primary responsibility and one cohesive reason to change.
Commands and TaskHandlers validate, normalize, delegate, and map results.
Orchestrators sequence collaborators without absorbing their algorithms.
Storage, validation, rendering, subprocess/leaf I/O, and state-machine policy do
not accumulate in one owner. Three independently nameable responsibilities
require a split even below a preferred maximum.

Class-owning TypeScript modules use PascalCase filenames; function/value modules
use lowerCamelCase. New source filenames do not use dashes or underscores.
Generic `helpers`, `utils`, `common`, and `misc` overflow bags are rejected.

Any size exception must be approved before implementation and name the exact
file, proposed maximum, cohesion reason, reviewer, and expiry/follow-up batch.
Existing oversized files are not precedent: when touched they become smaller,
split, or remain line-count neutral under an approved extraction plan.

The implementation report records categorized line counts for every new or
materially rewritten file plus warning-band functions/constructors. The
reviewer reproduces those counts and independently judges cohesion. Passing a
line-count check never overrides the responsibility gate.

# Agent Launch Prompt — Work Batch RT-05

## Required Review Packet

The review report must include:
- Changed-file list with ownership role.
- Independent execution: every security boundary tested, exit codes, and key diagnostic output.
- Independent performance measurements with actual numbers.
- SQLite driver qualification evidence: integrity check, global-install proof, WAL/busy-handler, corruption detection, rebuild result, permission boundary.
- Pass/fail counts from independent spec execution.
- Line counts for new spec files.
- Any finding with severity, requirement reference, and recommended correction.
- Confirmation that no security claim relies on narrative alone.
- Confirmation that no build artifacts are staged.
- Final verdict: ACCEPT or REJECT.

## Acceptance Gate

Accept only if all of the following are true:
- Every path-traversal boundary refuses malicious input with a clear diagnostic.
- Every shell-injection class (command substitution, shell operators, variable expansion, control characters) is refused or safely stored as literal text.
- Multi-account permission model is verified: operator write, worker read/execute, worker deny-write, doctor reporting (or limitations honestly documented).
- Manifest integrity is proven: missing/extra/non-executable/checksum-mismatch cases all fail build validation.
- Global install integrity is proven: staged runtime matches dist, two versions coexist.
- SQLite driver integrity is proven: native binary checksum matches manifest, global-install proof passes, WAL mode and busy-handler work, corruption is detected and service refused, semantic-root rebuild produces identical logical rows, permission boundary holds through connection-level enforcement.
- Boundedness is proven with actual wall-time and output-size measurements at multiple pack scales.
- Every mechanical coordination operation is proven model-free with source-path evidence.
- Skill install succeeds for supported hosts (or limitations documented).
- OpenCode decision-endpoint qualification passes on a real compatible install;
  Hermes is qualified when present or explicitly skipped when absent; no stale
  capability, secret leakage, shared-pool overcount, or economic downgrade.
- No product features were added.
- `nvb check:architecture` exits 0.
- No build, dist, node_modules, `.nira/local`, or `.watchtower/` artifact is committed.

## Reject Conditions

Reject if any of the following is true:
- A path traversal succeeds at any boundary.
- Shell injection, command substitution, or variable expansion is executed by the env parser.
- A worker account can write to the runtime store or lane config.
- A missing, extra, non-executable, or checksum-mismatched managed asset passes build validation.
- The SQLite driver native binary checksum does not match its manifest entry and build validation does not catch it.
- The SQLite driver fails to load from a globally installed package outside the dev tree.
- A corrupted or truncated SQLite database is served without detection or refusal.
- Semantic-root rebuild from empty does not produce identical logical rows.
- A worker account can write to the SQLite database through the lane runtime's read-only connection.
- A security claim is narrative-only without an exploit fixture.
- A performance claim is narrative-only without actual measurements.
- A mechanical coordination operation invokes a model.
- An e2e or security spec mocks the real `wt` binary (except unit-level parser tests).
- Any product feature was added.
- A prohibited artifact is committed.

## Verdict, Correction, And Commit Ownership

- On rejection, create `corrections/REL-03-correction-NN.md` with exact defects, evidence, required correction, and proof to rerun.
- On acceptance, synchronize trackers, create the reviewer-owned acceptance commit, write the durable review report to `.local/agent-reports/watchtower-release/reviews/REL-03-security-performance-qualification-review.md`, and settle the ACCEPT verdict.
- REL-04 is blocked until REL-03 is accepted.
