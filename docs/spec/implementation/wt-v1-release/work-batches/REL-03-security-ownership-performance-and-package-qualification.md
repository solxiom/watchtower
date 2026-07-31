# Batch REL-03 — Security, Ownership, Performance, And Package Qualification

> Mandatory v1 qualification: independently reproduce the complete fixture in
> [`../../wt-coordinator-automation/specification-resolution-batch-amendment.md`](../../wt-coordinator-automation/specification-resolution-batch-amendment.md).
> This is release evidence for authority separation, scoped progress, atomic
> activation, explicit worktree synchronization, replay, and same-session
> resume; it is not permission to add product behavior in REL-03.

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
Phase: Release qualification
Depends on: REL-01, REL-02 accepted
Work ID: `REL-03`
Governing spec: `docs/spec/v1.md` §§4, 7, 8, 14, 15; `docs/spec/v1-contracts.md` §§3, 6, 8, 11, 12

**Required implementor reasoning class:** `R5`
**Class rationale:** broadest adversarial surface in the release pack: path traversal prevention across four boundaries, strict-env parser shell-injection corpus, multi-account permission verification, manifest/checksum integrity at build and install time, synthetic scaling fixtures from 30 to 10,000 batches, and model-invocation auditing across all mechanical coordination operations. Security thinking is inherently adversarial — every positive safety claim must be paired with a negative exploit fixture. The breadth of surfaces tested and the engineering effort required for synthetic pack generation make this the hardest batch. The class is a floor; the reviewer must not be on a lower reasoning tier.

## Objective

Produce fixture-based, reproducible evidence that the assembled Watchtower v1 product is safe against path traversal, shell injection, and permission bypass. Prove packaging integrity at build and install time. Prove bounded discovery and status performance. Prove zero model invocations for all mechanical coordination operations. Prove skill installation for supported hosts.

This batch does **not** add features or audit documentation. It produces adversarial fixtures and performance benchmarks.

## Required Work

### Phase 1: Read and understand the safety boundaries

1. `docs/spec/v1.md` §14 — safety and concurrency model.
2. `docs/spec/v1-contracts.md` §11 — locking, transactions, and recovery with path-escape rejection.
3. `docs/spec/architecture.md` §9 — safety model and trust zones.
4. `docs/spec/v1-contracts.md` §6 — adapter contract and capability eligibility.
5. `docs/spec/v1-contracts.md` §3 — implementation-pack consumer contract and seal canonicalization.
6. `docs/spec/v1.md` §7.1 — global runtime store, immutable staging, account access boundaries.
7. `docs/spec/v1.md` §8 — lane configuration contract and strict env parsing.
8. `docs/spec/v1-contracts.md` §12 — conformance artifacts fixture requirements.
9. The current source: path resolution, env parser, runtime catalog, permission checks, coordinator router, index compiler, context broker.

### Phase 2: Path traversal security suite

Create `spec/security/path-traversal.spec.ts`. Test every path construction boundary:

1. **Lane directory path escape:** Construct lane slugs and paths containing `../` segments, null bytes, and absolute paths. Verify all are rejected during `wt init`.
2. **Repository binding path escape:** Provide `--scope` bindings with paths containing `../` escape segments, symlinks to outside directories, and `/etc/` targets. Verify all are rejected or canonicalized to within the declared binding.
3. **Runtime store path escape:** Verify that runtime asset paths derived from manifests cannot escape the declared runtime root. Test manifests with crafted `target` paths containing `../`.
4. **Within-lane path construction:** Verify that coordinator, session, and effect paths constructed from lane data cannot escape `.watchtower/lanes/<slug>/`.

For each test: provide the malicious input, invoke the relevant command or code path, and assert the operation is refused or the path is safely bounded.

### Phase 3: Strict-env parser security suite

Create `spec/security/config-injection.spec.ts`. Provide a corpus of malicious config inputs:

1. **Command substitution:** `KEY=$(whoami)`, `` KEY=`whoami` ``, `KEY=${HOME}`.
2. **Shell operators:** `KEY=value; rm -rf /`, `KEY=value && echo pwned`, `KEY=value | cat /etc/passwd`.
3. **Variable expansion:** `KEY=$HOME`, `KEY=${PATH}`, `KEY=$((1+1))`.
4. **Executable statements:** multi-line values containing shell keywords.
5. **Null bytes and control characters:** embedded `\0`, `\x1b`, and other non-printable characters.
6. **Valid values:** standard KEY=value, quoted values, comments, blank lines.

For each input: parse through `LaneConfigReader`, assert that injection inputs are rejected or safely stored as literal text without execution. Assert that valid inputs are parsed correctly.

### Phase 4: Permission security suite

Create `spec/security/permissions.spec.ts`. Test the multi-account access model:

1. **Operator ownership:** Verify the lane store (`.watchtower/lanes/<slug>/`) is writable by the operator account and no other account.
2. **Worker account read/execute:** Verify that configured worker accounts can read and traverse the runtime store and can execute runtime entrypoints, but cannot write to them.
3. **Worker account deny-write:** Attempt to write to the runtime store or lane config as a worker account. Verify refusal.
4. **Doctor account checks:** Verify `wt doctor` reports access issues for each configured account when permissions are violated.
5. **WATCHTOWER_DATA_HOME relocation:** Verify the data store honors the environment variable and applies permission checks at the relocated location.
6. **Symlink escapes in data store:** Verify that a symlinked data store path is canonicalized before permission checks.

This phase requires creating OS user accounts in the test environment. Document the required setup. If a CI environment lacks multi-account support, document the limitation and provide manual verification instructions.

### Phase 5: Manifest and packaging integrity

Create `spec/security/manifest-integrity.spec.ts` or validate through build time:

1. **Manifest completeness:** Verify `nvb dist` outputs contain `runtime/manifest.json` and `knowledge/manifest.json`. Every managed asset declared in the manifest must exist at the declared path.
2. **Checksum verification:** For each managed asset, compute the actual SHA-256 and compare to the manifest's declared checksum. Verify agreement.
3. **Missing asset:** Modify a manifest to declare a non-existent asset. Verify `nvb dist` build validation fails.
4. **Extra asset:** Add a file to `dist/runtime/` that is not declared in the manifest. Verify build validation fails or warns.
5. **Non-executable executable:** Create a managed asset that should be executable but has mode 0644. Verify build validation fails.
6. **Checksum mismatch:** Modify a managed asset's bytes without updating the manifest. Verify build validation fails.
7. **Seal reproduction:** Verify that two builds from the same committed tree produce identical pack-lock seals (RFC 8785 canonical form).

### Phase 6: Global install integrity

1. After `npm install -g ./dist`, verify the installed files:
   - `bin/wt.js` exists and is executable.
   - `src/`, `help/`, `runtime/`, `knowledge/`, `runtime-nvb/` directories exist with correct contents.
2. Verify runtime staging:
   - Run `wt` commands that trigger runtime staging (e.g., `wt init`).
   - Verify runtimes are staged under `~/.local/share/watchtower/runtimes/<version>/`.
   - Verify the staged runtime manifest matches the dist manifest.
   - Verify staged runtime entries have correct checksums.
3. Verify two runtime versions can coexist:
   - Stage version 1.0.0 and a synthetic version 1.1.0 (by staging a copy).
   - Verify both exist under the data root.
   - Verify a lane pinned to 1.0.0 uses the 1.0.0 runtime links.

### Phase 7: Boundedness and performance proof

Create `spec/performance/bounded-discovery.spec.ts` and `spec/performance/bounded-status.spec.ts`.

1. **Synthetic pack generation:** Create synthetic implementation packs at scales: 30 batches, 300 batches, 3,000 batches, and 10,000 batches. Each synthetic pack must be a committed fixture with valid structural files. The pack content beyond the structural metadata may be minimal (e.g., brief files with "placeholder" content).
2. **Bounded discovery:** Measure wall time for `wt list` and `wt status` at each pack scale. Verify that wall time does not grow linearly with pack size. The spec requires boundedness, so time should plateau (or grow only with lane count, not with pack size).
3. **Bounded output:** Measure the output size (bytes) of `wt status --json` at each scale. Verify output size does not embed pack-proportional data.
4. **Ambiguous selection:** Measure wall time for ambiguous selection failure with many lanes. Verify the failure is bounded.
5. **Index compilation:** Measure wall time for coordinator pack index compilation at each scale. Verify compilation time is reasonable and proportional to the pack's structural data (not the full prose content).

Record exact measurements. No "approximately" or "should be" claims — report actual numbers with the environment (CPU, memory, Node version).

### Phase 8: Model-free mechanical coordination audit

Create `spec/performance/model-invocation-audit.spec.ts`.

1. Enumerate every mechanical coordination operation from the spec:
   - Ready-set calculation.
   - Heartbeat emission.
   - Event filtering (worker events, coordinator events).
   - Session presence check.
   - Idle polling.
   - Index compilation.
   - Routing guard derivation of uniquely preauthorized M0 effects.
   - Context broker bounded queries.
2. For each operation, prove that zero model invocations occur. This may be verified by:
   - Source code audit: verify the code path does not call any endpoint/adapter invocation.
   - Runtime assertion: if the product supports a model-invocation counter, assert it remains zero after each operation.
   - Architecture check: verify no model import or adapter instantiation exists in the mechanical coordination modules.
3. Document the audit method and the result for each operation.

### Phase 9: SQLite driver qualification (storage-amendment)

Create `spec/security/sqlite-driver-qualification.spec.ts`. Test the SQLite driver at install, runtime, and recovery boundaries:

1. **Driver integrity verification:** Verify the native SQLite binary shipped in the package has a checksum matching the runtime manifest. Compute the actual SHA-256 of the native module file (e.g., `.node` binary) and compare against the manifest's declared checksum. If the checksum mismatches, assert the build validation fails and the driver does not load.

2. **Global-install proof:** Install the package globally (`npm install -g ./dist`). From a completely different working directory (not inside the dev tree), import or load the SQLite driver through the public API that the lane runtime uses. Verify the driver resolves and opens a database successfully. This proves the native module was bundled correctly and is not picking up a local `node_modules` installation.

3. **SQLite pragma and mode tests:**
   - Verify the database connection uses WAL journal mode (`PRAGMA journal_mode=WAL`). Read back the current journal mode and assert it matches WAL.
   - Verify a busy-handler is registered and does not throw under concurrent read contention. Open two read-only connections to the same database and execute concurrent reads. Assert both succeed without timeout or lock errors.
   - Verify the data home directory is readable but the database file itself is not writable by the worker account. The lane runtime must configure the database as read-only or refuse writes from unauthorized accounts.

4. **Corruption detection and recovery:**
   - Create a valid SQLite database through the normal lane runtime path.
   - Truncate the database file to simulate corruption (e.g., zero out the last 1024 bytes). Attempt to open the database through the lane runtime. Assert the runtime detects the corruption (`PRAGMA integrity_check` or equivalent) and refuses to serve queries.
   - Create a database file containing random bytes (not a valid SQLite header). Assert the runtime detects the invalid file and refuses to open it.
   - Verify the runtime writes a diagnostic log entry about the corruption, including the database path and the detection method, before refusing service.

5. **Semantic-root rebuild qualification:**
   - Initialize a fresh lane with a complete implementation pack fixture that populates the SQLite store (pack index, batch metadata, status entries).
   - Record the logical contents of every table: row counts, representative key rows, and schema version.
   - Delete the SQLite database file entirely.
   - Trigger a rebuild from the derivation sources (pack manifests, Git metadata, coordinator journals). The rebuild operation must be attributable — the triggering command (e.g., `wt doctor --rebuild` or `wt admin rebuild-root`) must be invoked explicitly.
   - After rebuild, compare the logical contents row by row against the pre-deletion snapshot. Assert identical logical rows (same primary keys and payload), identical schema version, and identical semantic root hash if one is stored.
   - Rebuild from an empty/zero-byte database file (not a missing file). Assert the same outcome — the empty file is treated as needing rebuild, and the result matches.
   - Assert rebuild is safe: no lane mutation occurs during rebuild (the lane must not be simultaneously writable), and the rebuild journal records the operation.

6. **Permission boundary proof (SQLite-specific):**
   - Verify that the worker account (configured as read-only for the lane) can open the database and run `SELECT` queries through the lane runtime's read interface.
   - Verify the worker account cannot execute `INSERT`, `UPDATE`, `DELETE`, `DROP`, or `PRAGMA` mutations on the database. The lane runtime must enforce this through the connection mode (e.g., opening in `SQLITE_OPEN_READONLY`), not relying solely on filesystem permissions.
   - Verify the operator account can read and write the database file directly, but the lane runtime still enforces the connection's declared access mode at open time. A connection opened in read-only mode must reject writes regardless of the OS-level file permissions.

### Phase 10: Skill install proof

1. Verify the knowledge pack is bundled in the dist:
   ```bash
   ls dist/knowledge/playbook.md dist/knowledge/guides/ dist/knowledge/skill/ dist/knowledge/adapters/
   ```
2. Test skill installation for each supported host (Codex, Cursor, Claude):
   ```bash
   wt skill install codex
   wt skill install cursor
   wt skill install claude
   ```
   For each: verify the command previews the destination, records the installed knowledge version where the host permits, and does not embed lane-specific state.
3. Test explicit overwrite confirmation:
   ```bash
   wt skill install codex --replace
   ```
4. If a host is not available in the test environment, document the limitation and verify the adapter code exists and is structurally correct.

### Phase 11: Decision-endpoint adapter qualification

1. From the globally installed package, qualify `opencode-cli` against a
   compatible installed executable. Prove version/path pinning, argv-only
   launch, explicit cwd/env, bounded envelope/result channels, timeout and
   process-group cancellation, write denial, redaction, and no credential
   persistence.
2. Discover route/model observations without scraping human TUI output. Prove
   a catalog/executable/adapter/model fingerprint change invalidates prior
   capability evidence and blocks selection pending requalification.
3. Prove capability/access/freshness/independence/reserve constraints precede
   economic preference. A free-capable endpoint may win only among eligible
   peers; unknown charging telemetry is never treated as free.
4. Prove routes sharing one entitlement through OpenCode, Hermes, or another
   adapter use one `capacityPoolId` and one debit/reservation.
5. Detect `hermes-cli`. Absence is an explicit non-failing skip. If installed,
   it must pass the same applicable qualification before selection.
6. Controlled fake executables may exercise negative cases, but they do not
   replace the required real compatible OpenCode global-install proof.

### Phase 12: Create specs

Create the following spec files under `spec/security/` and `spec/performance/`:

- `spec/security/path-traversal.spec.ts`
- `spec/security/config-injection.spec.ts`
- `spec/security/permissions.spec.ts`
- `spec/security/manifest-integrity.spec.ts`
- `spec/security/sqlite-driver-qualification.spec.ts`
- `spec/performance/bounded-discovery.spec.ts`
- `spec/performance/bounded-status.spec.ts`
- `spec/performance/model-invocation-audit.spec.ts`
- `spec/integration/endpoint-adapter-qualification.spec.ts`

Each spec must:
- Follow existing Jasmine conventions.
- Include both positive and negative fixtures.
- Report actual measurements, not asymptotic claims.
- Clean up temporary state.

### Batch REL-03 required proof

- Path traversal refused at all four boundaries with malicious inputs.
- Strict-env parser rejects all shell injection/expansion/statement inputs.
- Permission model verified: operator write, worker read/execute, worker deny-write, doctor reporting.
- Manifest integrity proven: missing/extra/non-executable/checksum-mismatch cases fail build.
- Global install integrity: staged runtime matches dist manifest and checksums.
- Two runtime versions coexist under XDG data.
- SQLite driver integrity: native binary checksum matches manifest; global-install proof confirms driver loads from globally installed package, not dev tree.
- SQLite busy-handler and WAL-mode tests: concurrent readers succeed without lock errors; WAL journal mode confirmed.
- SQLite corruption detection: truncated database and invalid-header file both detected and service refused.
- SQLite semantic-root rebuild: rebuild from empty/missing produces identical logical rows; rebuild journal records operation.
- SQLite permission boundary: worker read succeeds, worker write refused through connection-level read-only mode, operator access verified but read-only connection still enforces access mode.
- Boundedness proven with actual wall-time/output-size measurements at 30/300/3,000/10,000 batch scales.
- Zero model invocations for all enumerated mechanical coordination operations.
- Skill install succeeds for Codex, Cursor, Claude (or limitations documented).
- A real compatible OpenCode installation passes the endpoint qualification
  matrix; Hermes passes when installed or records an explicit skip; catalog
  drift, shared-pool overcount, secret leakage, and cost-based downgrade fail.

## Structural Constraints

- Security and performance spec files follow existing Jasmine conventions.
- Synthetic pack generation must produce minimal valid packs; do not engineer full prose content.
- Permission tests that require multi-account setup must document the setup and gracefully skip when unavailable (with documented limitation).
- No new product source modules are created.
- No mock replacement of the `wt` binary in security specs.

## Expected Ownership

- `spec/security/path-traversal.spec.ts`
- `spec/security/config-injection.spec.ts`
- `spec/security/permissions.spec.ts`
- `spec/security/manifest-integrity.spec.ts`
- `spec/security/sqlite-driver-qualification.spec.ts`
- `spec/performance/bounded-discovery.spec.ts`
- `spec/performance/bounded-status.spec.ts`
- `spec/performance/model-invocation-audit.spec.ts`
- `spec/integration/endpoint-adapter-qualification.spec.ts`
- `.local/agent-reports/watchtower-release/REL-03-security-performance-qualification.md`
- Updated trackers and roadmap.

## Reject Conditions

- A path traversal succeeds at any boundary.
- Shell injection, command substitution, or variable expansion is executed by the env parser.
- A worker account can write to the runtime store or lane config.
- A missing, extra, non-executable, or checksum-mismatched managed asset passes build validation.
- The SQLite driver native binary checksum does not match its manifest entry, and build validation does not catch it.
- The SQLite driver fails to load from a globally installed package outside the dev tree.
- A corrupted or truncated SQLite database is served without detection or refusal.
- Semantic-root rebuild from an empty database does not produce identical logical rows.
- A worker account can write to the SQLite database through the lane runtime's connection.
- Boundedness evidence is narrative-only without actual measurements.
- A mechanical coordination operation invokes a model.
- Security or performance evidence is stated without fixture reproduction proof.
