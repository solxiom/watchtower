# Agent Launch Prompt — Review Batch REL-03

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `GPT-5.6 Sol` only with very strong steering, explicit adversarial-proof posture, and the largest available context window for the security/permission/SQLite qualification
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, all four security fixture suites, the SQLite driver qualification suite, the performance scaling fixtures, and the model-invocation audit in context simultaneously; if it cannot handle this breadth, split the batch into explicitly phased sub-tasks rather than shortening safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `GPT-5.6 Sol` only with very strong steering and explicit adversarial-proof posture
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt and all fixture suites in context
- final-authority constraint: a steering-only or lower-reasoning agent cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only non-normative examples and may become unavailable or stale. Select a currently available agent that can load the complete brief/spec/source context, inspect and edit the repository with tools, reason across package boundaries, and run the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient context for state machines, concurrency, graph/planner logic, driver behavior, destructive migration safety, or cross-package closure evidence. This review batch is R5 because the reviewer must independently reproduce adversarial security fixtures (path traversal, shell injection, permission bypass), manifest/checksum integrity audits, SQLite driver qualification (native binary integrity, global-install proof, WAL/busy-handler concurrency, corruption detection, semantic-root rebuild, connection-level permission enforcement), synthetic scaling measurements, and model-invocation correctness auditing. The adversarial breadth is the highest in the release pack.
- If the assigned agent cannot retain the governing context, independently inspect the source, or execute the proof, escalate to a stronger agent or split only along the existing brief's ownership boundaries. Never reduce the contract to fit a weaker model.

You are assigned **review batch REL-03** — the independent review of the security, ownership, performance, and package qualification batch. You must independently reproduce every adversarial fixture, verify every security and performance claim, and either accept with an acceptance commit or reject with a correction brief.

This review batch covers the broadest adversarial surface in the release pack: path-traversal refusal at four security boundaries, shell-injection refusal across a command-substitution/expansion/operator corpus, multi-account permission isolation, manifest/checksum integrity at build and install time, global-install integrity, SQLite driver qualification (integrity, global-install proof, WAL/busy-handler, corruption detection and recovery, semantic-root rebuild, permission boundary), bounded discovery and status measurements at scale, zero model invocations for mechanical coordination, and skill install correctness.

## Read In This Order

Repository prerequisites: `AGENTS.md`, `docs/spec/v1-implementation-map.md`.

1. The durable review brief: `REL-03-review-security-ownership-performance-and-package-qualification.md`.
2. The paired work brief: `REL-03-security-ownership-performance-and-package-qualification.md`.
3. The governing specs: `docs/spec/v1.md` (entire, especially §§4, 7, 8, 14, 15, 17), `docs/spec/v1-contracts.md` (entire, especially §§3, 6, 8, 11, 12), `docs/spec/architecture.md` (entire, especially §§5, 9, 11), `docs/spec/coordinator-automation.md`.
4. The REL-01 and REL-02 implementation and review reports for environmental context and predecessor handoffs.
5. The implementation report at `.local/agent-reports/watchtower-release/REL-03-security-performance-qualification.md`.
6. The actual `git diff` from the baseline commit. Verify only spec files and trackers changed.
7. The current source: every safety-critical module — path resolution, strict-env parser, runtime catalog, permission checks, coordinator router, index compiler, context broker, skill install adapters, SQLite store interface.
8. The pack 1–5 trackers and REL-01/REL-02 trackers to verify prerequisite acceptance status.
9. `nvb.json` — available NVB task surfaces.
10. Final git status and file ownership.

## Reasoning / Agent Class

You are operating at reasoning class `R5`. This reflects the adversarial security thinking, SQLite driver qualification, manifest/checksum integrity, synthetic scaling, and model-invocation audit breadth of the batch.

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `GPT-5.6 Sol` only with very strong steering and explicit adversarial-proof posture
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt and all fixture suites in context
- final-authority constraint: a steering-only or lower-reasoning agent cannot issue the final acceptance judgment for this batch

## Mandatory Reasoning Protocol

1. Build a dependency map from the safety model to every path construction site, env parse site, permission check, manifest validation point, SQLite store interface, and coordinator operation in the source.
2. Verify REL-01 and REL-02 are accepted. Run `nvb build` and `nvb test` independently.
3. Execute every adversarial fixture independently. Do not trust the implementation report. For path traversal, craft your own malicious inputs. For injection, test the parser with real `lane.config.env` files.
4. Enumerate every boundary where untrusted input reaches the product. For each boundary, independently reproduce at minimum one negative case.
5. Use counterexamples: identify at least one plausible security shortcut the implementation report might have missed — such as a path constructed with string concatenation instead of bounded resolution, an env value that passes through `eval()` or `source`, a checksum comparison that short-circuits on non-existent files, a SQLite connection opened without read-only mode, a corruption check that only tests file existence not content validity, or a model invocation hidden behind a utility import.
6. Treat the implementation report as a lead, not proof.

## Structural Design And Module-Size Gate

- Security spec files must not exceed 400 physical lines each.
- Performance spec files must not exceed 400 physical lines each.
- Synthetic pack generation must be in a fixture helper module, not duplicated.
- No new product source modules in the diff.
- No generic helper bags.
- No npm convenience scripts.

## Your Review Mission

Perform an independent review of REL-03's implementation. You are the reviewer, not a second implementer.

### Review Pass 1 — Prerequisites

1. Verify REL-01 and REL-02 are independently accepted. Read their trackers and review reports.
2. Run `nvb build` and `nvb test`. Record results and baseline commit hash.
3. Confirm the globally installed `wt` binary is available.

### Review Pass 2 — Path Traversal Suite

1. Independently read the path resolution source modules. Identify every boundary where user-controlled paths are constructed.
2. For each boundary, craft at minimum one malicious input: lane slug with `../`, scope binding with `../../../etc`, manifest target with `../`, batch/session ID with `../`. Also test null bytes and absolute paths.
3. Run `wt init` or the relevant code path with each malicious input. Verify refusal or safe bounding. Record the diagnostic message.
4. Do not reuse the implementation's malicious inputs verbatim. Craft at least one novel input per boundary.

### Review Pass 3 — Config Injection Suite

1. Independently read the strict-env parser source. Verify it does not invoke `eval()`, `exec()`, `source`, or any shell interpreter.
2. Create a real `lane.config.env` fixture file containing each injection class: command substitution, shell operators, variable expansion, control characters, valid values.
3. Parse the file through the public `wt config show` command or directly through the parser module (unit-level security check). Verify injection inputs are rejected or stored as literal text without execution.
4. Verify valid key-value pairs parse correctly.

### Review Pass 4 — Permissions Suite

1. If multi-account testing is available: create a worker account (distinct from the operator). Test: worker can read and traverse the runtime store, worker can execute runtime entrypoints, worker cannot write to the runtime store, worker cannot modify lane config. Run `wt doctor` and verify it reports access violations correctly.
2. If multi-account testing is not available: audit the permission-checking source modules. Verify every write path has a matching permission check. Verify the code does not silently default to write access. Document the limitation honestly.
3. Test `WATCHTOWER_DATA_HOME` relocation: set the env var, initialize a lane, verify the data store is under the relocated path.
4. Test symlink canonicalization: create a symlinked data home path and verify permission checks canonicalize before checking.

### Review Pass 5 — Manifest Integrity Suite

1. Independently run `nvb dist` and capture `dist/runtime/manifest.json`. Verify every declared asset exists at the declared path.
2. For a sample of managed assets (at least 5), compute the actual SHA-256 independently and compare to the manifest's declared checksum. Use a different tool or method than the implementation report used (e.g., if the report used `sha256sum`, use OpenSSL or Node.js `crypto`).
3. Create a modified manifest: declare a non-existent asset. Run `nvb dist` build validation. Verify it fails.
4. Create a modified manifest: change an asset's declared checksum without changing the file. Run build validation. Verify it fails.
5. Run two independent builds from the same committed tree. Verify the lock seal bytes are identical.

### Review Pass 6 — Global Install Integrity

1. Independently run `npm install -g ./dist`. Verify exit code.
2. Run `wt init` to trigger runtime staging.
3. Verify the staged runtime under the XDG data store. Compare `manifest.json` at the staged location against the dist version.
4. For a sample of staged runtime files, verify checksums against the dist manifest.
5. Stage a second synthetic runtime version (copy the first to a new version directory). Verify `wt list` or equivalent shows both versions.

### Review Pass 7 — SQLite Driver Qualification

1. **Driver integrity:** Independently verify the native SQLite binary in the dist package. Compute its SHA-256 and compare to the runtime manifest entry. Verify the checksum matches. If it mismatches, verify the build validation catches it.
2. **Global-install proof:** From a directory completely outside the dev tree (e.g., `/tmp`), write a minimal script that imports the lane runtime's SQLite module and opens a database. Verify this succeeds — the native module resolves from the globally installed package, not a local `node_modules`.
3. **WAL mode and busy-handler:** Open a database through the lane runtime. Run `PRAGMA journal_mode` and verify it returns `wal`. Open two read-only connections and execute concurrent `SELECT` queries. Verify both succeed without `SQLITE_BUSY` or timeout errors. Verify the busy-handler is registered (check the connection configuration or source).
4. **Corruption detection:** Create a valid database through normal lane operations. Truncate the file (zero out the last 1024 bytes). Attempt to open it through the lane runtime. Verify the runtime detects corruption and refuses to serve. Create a file of random bytes (no valid SQLite header). Verify the runtime detects the invalid file, logs a diagnostic with the detection method, and refuses service.
5. **Semantic-root rebuild:** Initialize a fresh lane with a populated SQLite store. Record logical table contents (row counts, representative primary-key rows, schema version). Delete the database file. Trigger a rebuild. Compare the post-rebuild contents row by row against the pre-deletion snapshot. Verify identical logical rows, identical schema version. Test rebuild from a zero-byte file (not missing). Assert the same outcome. Verify the rebuild journal records the operation.
6. **Permission boundary:** Verify the worker account can `SELECT` through the runtime's read interface. Verify the worker account cannot `INSERT`, `UPDATE`, `DELETE`, `DROP`, or execute write `PRAGMA`. Verify the operator can read/write the file directly at the OS level, but a connection opened by the lane runtime in read-only mode still rejects writes. If the implementation opens connections in read-only mode via `SQLITE_OPEN_READONLY`, verify this flag is present in the connection path.

### Review Pass 8 — Boundedness Measurement

1. Independently check the synthetic pack generation mechanism. Verify packs are valid committed fixtures.
2. Independently run `wt list` and `wt status --json` at two or more pack scales (preferably the smallest and one larger scale). Measure wall time with an independent tool (e.g., `/usr/bin/time`, not just the spec's own timer).
3. Verify wall time does not grow linearly with pack size. Record actual numbers.
4. Measure the output size of `wt status --json` at each scale. Verify output size does not embed pack-proportional data.

### Review Pass 9 — Model-Free Audit

1. From the coordinator-automation spec, enumerate the complete list of mechanical coordination operations.
2. For at minimum one operation, independently audit the source path: open the source file, verify no model invocation endpoint is imported or called. Record the file path and line range examined.
3. If the product exposes an invocation counter, independently verify it remains at zero after a mechanical operation.
4. Do not rely on the implementation's audit as authority. Read the source yourself.

### Review Pass 10 — Skill Install

1. Verify the dist contains the knowledge pack under `dist/knowledge/`.
2. Independently run `wt skill install <host>` for at least one supported host. Verify preview output, version recording in the host's expected location, and no lane-specific state embedded in the installed files.
3. If a host is not available, verify the adapter source exists and is structurally correct.

### Review Pass 11 — Architecture

1. Verify diff touches only spec files (`spec/security/`, `spec/performance/`), synthetic fixtures, trackers, and `.local/` reports.
2. Run `nvb check:architecture`. Must exit 0.
3. Verify no prohibited artifacts in git.

## What You Must Not Do

- Do not fix the batch while reviewing unless reassigned as an implementation correction.
- Do not accept a batch where a path traversal succeeds at any boundary.
- Do not accept a batch where shell injection or command substitution is executed.
- Do not accept a batch where a worker account can write to the runtime store.
- Do not accept a batch where a manifest integrity negative case silently passes.
- Do not accept a batch where the SQLite driver native binary checksum mismatches the manifest and is not caught.
- Do not accept a batch where the SQLite driver cannot load from the globally installed package.
- Do not accept a batch where a corrupted SQLite database is served without detection.
- Do not accept a batch where semantic-root rebuild fails to produce identical logical rows.
- Do not accept a batch where a worker account can write to the SQLite database through the lane runtime's read-only connection.
- Do not accept a batch where security claims lack adversarial exploit fixtures.
- Do not accept a batch where performance claims lack actual measurements.
- Do not accept a batch where a mechanical coordination operation invokes a model.
- Do not trust the implementation report without independent verification.
- Do not commit unless delivering an ACCEPT verdict.

## Acceptance Gate

Accept only if all of the following are true:
- Every path-traversal boundary refuses malicious input with a clear diagnostic.
- Every shell-injection class is refused or safely stored as literal text.
- Multi-account permission model is verified (or limitations honestly documented).
- Manifest integrity is proven: missing/extra/non-executable/checksum-mismatch cases fail build validation.
- Global install integrity is proven: staged runtime matches dist, two versions coexist.
- SQLite driver integrity is proven: native binary checksum matches manifest, global-install proof passes, WAL mode and busy-handler work, corruption is detected and service refused, semantic-root rebuild produces identical logical rows, permission boundary holds through connection-level enforcement.
- Boundedness is proven with actual wall-time and output-size measurements at multiple pack scales.
- Every mechanical coordination operation is proven model-free with source-path evidence.
- Skill install succeeds for supported hosts (or limitations documented).
- No product features were added.
- `nvb check:architecture` exits 0.
- No build, dist, node_modules, `.nira/local`, or `.watchtower/` artifact is committed.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Update the following after completing review:
- `docs/spec/implementation/wt-v1-release/implementation-tracker.md` — mark REL-03 as ✅ accepted or 🟠 correction required.
- `docs/spec/implementation/wt-v1-release/implementation-roadmap.md` — update REL-03 status.
- `docs/spec/implementation/wt-v1-release/review-batches/00-review-batch-index.md` — update REL-03 status.
- `docs/spec/v1-implementation-map.md` — update REL-03 status in the pack 6 table.

## Local Artifact Git Rule

- do not add `.local` artifacts to git

## Non-Negotiable Rules

- The reviewer must independently reproduce every adversarial fixture. Implementation report conclusions are not proof.
- No product features are added by the reviewer. This is a review, not a correction.
- Security evidence requires negative exploit fixtures independently verified.
- Performance evidence requires independently measured wall time and output size.
- Acceptance commits must include all accepted non-`.local` changes with a descriptive commit message.
- Rejections must produce a numbered correction brief under `corrections/`.

## Rejection Correction Brief Rule

- On rejection, create `corrections/REL-03-correction-NN.md` with exact defects, evidence, required correction, and the specific proof to rerun before re-review.
- Do not implement corrections while reviewing. Record the defect and return the batch.

## Required Independent Proof

- Path traversal: at minimum one independently crafted negative case per security boundary (lane directory, repository binding, runtime store, within-lane), each with a distinct malicious input not copied from the implementation report.
- Config injection: at minimum one independently crafted command-substitution input, one shell-operator input, one variable-expansion input, and one valid input, each tested through the public parser interface.
- Permissions: at minimum one worker read/execute success case and one worker deny-write case (or documented limitation with source audit evidence).
- Manifest integrity: at minimum one non-existent-asset negative case and one checksum-mismatch negative case, each independently reproduced.
- Global install: at minimum independent staging verification and two-version coexistence test.
- SQLite qualification: at minimum driver integrity check (native binary checksum vs manifest), global-install proof (load from outside dev tree), WAL mode verification, concurrent read test, corruption detection (truncated file and random-bytes file), semantic-root rebuild (pre/post deletion row comparison), and permission boundary (worker SELECT success, worker write refusal).
- Boundedness: at minimum independent wall-time and output-size measurements at two pack scales.
- Model-free audit: at minimum one mechanical coordination operation independently verified through source audit.
- Skill install: at minimum one host independently tested (or source audit of adapter).

## Required Disk Report

Write exactly one review report to:

- `.local/agent-reports/watchtower-release/reviews/REL-03-security-performance-qualification-review.md`

Include: changed-file list, independent security fixture executions with exit codes and diagnostic output, independent performance measurements with actual numbers, SQLite driver qualification evidence (integrity, global-install, WAL/busy-handler, corruption, rebuild, permissions), pass/fail counts, line counts, findings with severity and requirement references, confirmation that all security claims have exploit fixtures not just algorithm descriptions, and the final verdict.

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

This is the third of four release review batches. After acceptance, the next review batch is REL-04 (documentation consistency and release gate). Record the independent proof results, the exact acceptance commit hash, the security fixture layout, the SQLite driver qualification environment (Node version, native module path, WAL configuration), the performance measurement baseline, and the synchronized tracker state. The handoff must note that REL-04 review depends on REL-03 acceptance.
