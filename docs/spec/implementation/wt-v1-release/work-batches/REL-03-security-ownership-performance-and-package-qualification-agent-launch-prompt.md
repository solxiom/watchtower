# Agent Launch Prompt — Work Batch REL-03

## Governing Contract And Precedence — Mandatory

This prompt is an execution aid, not product authority. Resolve conflicts in
this order and stop for a specification amendment rather than inventing
behavior:

1. `docs/spec/v1-contracts.md` and `docs/spec/schemas/v1.schema.json`
2. `docs/spec/v1.md`
3. `docs/spec/nirvana-integration-architecture.md`,
   `docs/spec/coordinator-automation.md`, `docs/spec/operator-session.md`, and
   `docs/spec/cli-session.md` within their scopes
4. `docs/spec/architecture.md`
5. `docs/development/engineering-and-review-standard.md`
6. `AGENTS.md`
7. the accepted implementation map, pack rules, and this batch brief

The implementation/review agent must read the mandatory engineering standard
and Nirvana integration architecture in full. A stale path, module suggestion,
or technical mechanism in this prompt must be corrected to the governing
contract while preserving the batch objective and proof obligations.

## Nirvana-First And NVB Execution Gate — Mandatory

- Complete and report the required Nirvana API usage audit before introducing
  infrastructure or bare Node behavior.
- Commands use Nirvana command, argument, pretty, and terminal-view APIs and
  remain thin.
- Public reason codes, exit mappings, event names, and schema identifiers remain
  owned by accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`. A
  batch-local symbolic name is not automatically public; reconcile it with the
  registry, and update the owning contract/schema in the same batch when a new
  public identifier is genuinely required.
- Use the Nirvana storage facade for ordinary managed-root operations only
  after CLI-safe root/bootstrap semantics are proved. Atomic durability,
  canonical path security, locking, append-only journals, ownership/modes, and
  SQLite stay behind focused adapters when the facade lacks required semantics.
- Use the Nirvana logger only through the Watchtower logging boundary for
  redacted diagnostics. Logs are never command output, lifecycle events,
  acceptance evidence, or authoritative journals.
- Substantial deterministic workflows use the immutable packaged Watchtower
  NVB catalog, focused TaskHandlers, and task groups.
- `LaneTaskRunner` is the only internal NVB invocation boundary. Task selection
  is an allowlisted Watchtower action mapping, never an arbitrary user/agent
  task name or parent-project discovery.
- Never create or modify a participating repository's root `nvb.json`.
- Shell is restricted to checksum-manifested leaf adapters for tmux, Git, or
  external tools when no conforming Nirvana API exists. Workflow-level shell is
  a hard reject.
- Mutating tasks do not gain authority from NVB. They require the normal
  Watchtower effect executor, current-state validation, locks, idempotency, and
  a valid single-use invocation envelope.

## Project-Wide Structural And Size Gate — Mandatory

Apply the exact limits in
`docs/development/engineering-and-review-standard.md`; pack-local numbers may
be stricter but may never relax them:

- CLI entry, command, or NVB task: preferred at most 120 lines, warning at
  121–160, hard reject over 180.
- Orchestrator, controller, or renderer shell: preferred at most 140 lines,
  warning at 141–180, hard reject over 200.
- Foundation service, planner, validator, adapter, or store: preferred at most
  200 lines, warning at 201–260, hard reject over 300.
- Contract/type/schema registry: preferred at most 240 lines, warning at
  241–320, hard reject over 400.
- Test/spec module: preferred at most 300 lines, warning at 301–420, hard reject
  over 500.
- Function: target at most 40 lines, justification at 41–60, reject over 80.
- Constructor: target at most 25 lines, warning at 26–40, reject over 50.

Passing a line limit never excuses mixed responsibilities, a god object,
generic helper bag, hidden cycle, foreign API laundering, or layer violation.
Use `PascalCase` for classes/class-owning files, `lowerCamelCase` for non-class
modules and directories, and never introduce dashed or underscored backend
source/spec names.

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `GPT-5.6 Sol` only with very strong steering, explicit adversarial-proof posture, and the largest available context window for the synthetic pack scaling work
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, all four security fixture suites, the performance scaling fixtures, and the model-invocation audit in context simultaneously; if it cannot handle this breadth, split the batch into explicitly phased sub-tasks rather than shortening safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `GPT-5.6 Sol` only with very strong steering, explicit adversarial-proof posture, and the largest available context window
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt and all fixture suites in context
- final-authority constraint: a steering-only or lower-reasoning agent cannot issue the final implementation judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only non-normative examples and may become unavailable or stale. Select a currently available agent that can load the complete brief/spec/source context, inspect and edit the repository with tools, reason across package boundaries, and run the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient context for state machines, concurrency, graph/planner logic, driver behavior, destructive migration safety, or cross-package closure evidence. This batch is R5 because it requires adversarial security thinking (path traversal exploits, shell injection corpus, permission bypass attempts), manifest/checksum integrity audits at build and install time, synthetic scaling fixture generation (30→10,000 batches), and model-invocation correctness auditing across all coordinator operations. The adversarial breadth is the highest in the release pack.
- If the assigned agent cannot retain the governing context, independently inspect the source, or execute the proof, escalate to a stronger agent or split only along the existing brief's ownership boundaries. Never reduce the contract to fit a weaker model.

You are assigned **implementation work batch REL-03** — security, ownership, performance, and package qualification. This batch produces adversarial fixture evidence that the assembled product is safe, correctly permissioned, performant at scale, and model-free for mechanical coordination.

This batch does **not** add features or audit documentation.

## Read In This Order

Repository prerequisites: `AGENTS.md`, `docs/spec/v1-implementation-map.md`.

1. `docs/spec/v1.md` — complete specification, especially §4 (product vocabulary), §7 (filesystem contract), §8 (lane configuration contract), §14 (safety and concurrency), §15 (packaging).
2. `docs/spec/v1-contracts.md` — complete contract closure, especially §3 (pack consumer), §4 (routing/capability floors), §6 (adapter contract), §7 (policy baseline), §11 (locking/transactions/recovery), §12 (conformance artifacts).
3. `docs/spec/architecture.md` — especially §5 (physical deployment), §9 (safety model, trust zones), §11 (testing architecture).
4. `docs/spec/coordinator-automation.md` — for the complete mechanical coordination operation inventory.
5. `docs/spec/implementation/wt-v1-release/work-batches/REL-03-security-ownership-performance-and-package-qualification.md` — this batch's work brief.
6. REL-01 and REL-02 implementation reports — the predecessor handoffs and environmental limitations.
7. `docs/spec/implementation/wt-v1-release/README.md`, `implementation-quality-and-agent-rules.md`, `implementation-roadmap.md`, `implementation-tracker.md`.
8. The current source:
   - Path resolution and canonicalization modules in `src/foundation/`.
   - Strict env parser (`LaneConfigReader` or equivalent).
   - Runtime catalog and installer.
   - Coordinator router and index compiler.
   - Context broker.
   - Skill install command and host adapters.

## Reasoning / Agent Class

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `GPT-5.6 Sol` only with very strong steering and explicit adversarial-proof posture
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt and all fixture suites in context
- final-authority constraint: a steering-only or lower-reasoning agent cannot issue the final implementation judgment for this batch

## Mandatory Reasoning Protocol

1. Build a dependency and ownership map from the safety model (§9 of architecture.md) to every path construction site, env parse site, permission check, and manifest validation point in the source.
2. Verify REL-01 and REL-02 are accepted.
3. Inspect the current source. Open every safety-critical module. Do not infer security posture from the spec alone.
4. Enumerate every boundary where untrusted input reaches the product: CLI args, env-file keys/values, manifest file paths, lane slugs, repository binding paths, coordinator routing config, operator session input. For each boundary, enumerate the expected refusal behavior and write a negative fixture that exercises the exploit.
5. Use counterexamples: identify at least one plausible security shortcut — such as a path constructed with string concatenation instead of bounded resolution, an env value that passes through `eval()` or `source`, a checksum comparison that short-circuits on non-existent files, or a model invocation that is hidden behind a "utility" import. Ensure focused proof rejects each.

## Structural Design And Module-Size Gate

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

## Your Mission

Produce fixture-based evidence that Watchtower v1 is safe, correctly permissioned, performant, and model-free for mechanical coordination.

### Phase 0 — Pre-implementation Baseline

1. Verify REL-01 and REL-02 are accepted. Record commit hash.
2. Run `nvb build` and `nvb test`. Record results.
3. Confirm `wt` is globally installed from REL-01.

### Phase 1 — Path Traversal Suite

Create `spec/security/path-traversal.spec.ts`:

1. Lane directory escape: test slugs like `../../etc`, `../outside`, absolute `/tmp/escape`. Verify `wt init` refuses.
2. Repository binding escape: test `--scope` bindings with paths like `../../../etc`, symlink targets outside the declared root. Verify canonicalization bounds or refusal.
3. Runtime store path escape: test manifests with `target` fields containing `../`. Verify path construction refuses or bounds to the runtime root.
4. Within-lane path escape: test lane data (batch IDs, session IDs) containing `../`. Verify coordinator paths remain within `.watchtower/lanes/<slug>/`.

### Phase 2 — Config Injection Suite

Create `spec/security/config-injection.spec.ts`:

1. Import or invoke the strict env parser directly (this is a unit-test-level security check; it does not require the installed `wt` binary).
2. For each malicious input class, assert the parser rejects or safely stores the literal text without execution.
3. For valid inputs, assert correct key-value parsing.
4. Test with real `lane.config.env` files written to temporary fixture directories and read through the public `wt config show` command.

### Phase 3 — Permissions Suite

Create `spec/security/permissions.spec.ts`:

1. If multi-account testing is available: create a worker account, test read/execute access to the runtime store, test deny-write, test `wt doctor` reporting.
2. If multi-account testing is not available: verify the permission model through code audit of `RuntimeCatalog` and `LaneDoctor` permission checks. Document the limitation.
3. Test `WATCHTOWER_DATA_HOME` relocation: set the env var, verify the data store uses the relocated path.
4. Test symlink canonicalization for data store paths.

### Phase 4 — Manifest Integrity Suite

Create `spec/security/manifest-integrity.spec.ts`:

1. Run `nvb dist` and capture the manifest files from `dist/runtime/manifest.json` and `dist/knowledge/manifest.json`.
2. For a sample of managed assets, compute actual SHA-256 and compare.
3. Create a modified manifest with a non-existent asset. Assert `nvb dist` build validation fails.
4. Create a modified manifest with a checksum mismatch. Assert build validation fails.
5. Verify seal reproduction: two builds from same tree produce identical lock seals.

### Phase 5 — Global Install Integrity

1. After install, verify `dist/` files match the installed location.
2. Trigger runtime staging by running `wt init`. Verify staged runtime matches dist manifest and checksums.
3. Stage a second synthetic runtime version. Verify two versions coexist.

### Phase 6 — Boundedness And Performance

Create `spec/performance/bounded-discovery.spec.ts` and `spec/performance/bounded-status.spec.ts`:

1. Generate synthetic packs at 30, 300, 3,000, and 10,000 batch scales. Each pack must be a valid committed fixture.
2. For each scale:
   - Measure `wt list` wall time (use `time` or `process.hrtime`).
   - Measure `wt status --json` wall time and output size.
   - Measure coordinator index compilation wall time.
3. Report actual measurements. Plot or tabulate the results. Verify wall time plateaus or grows sub-linearly with pack size.
4. Test ambiguous selection with many lanes. Verify failure is fast.

### Phase 7 — Model-Free Mechanical Coordination Audit

Create `spec/performance/model-invocation-audit.spec.ts`:

1. From the coordinator-automation spec and source, enumerate every mechanical operation.
2. For each operation, audit the source path and assert no model invocation endpoint is called.
3. If the product exposes a usable invocation counter or log, assert it remains at zero after each operation.
4. If the product does not expose a counter, perform a source-code audit: search for adapter imports in mechanical coordination modules. Assert none are found.
5. Document the audit method per operation.

### Phase 8 — SQLite Driver Qualification (Storage-Amendment)

Create `spec/security/sqlite-driver-qualification.spec.ts`:

1. **Driver integrity verification:** Compute actual SHA-256 of the native SQLite binary and compare against the runtime manifest. Assert checksum mismatch fails build validation and prevents driver load.
2. **Global-install proof:** After `npm install -g ./dist`, from a directory outside the dev tree, load the SQLite driver through the lane runtime's public API. Verify it opens a database successfully — proving the native module resolves from the global install, not a local `node_modules`.
3. **SQLite pragma and mode tests:**
   - Verify WAL journal mode is active (`PRAGMA journal_mode`).
   - Open two read-only connections and execute concurrent reads. Assert both succeed without lock errors or timeouts (busy-handler registered and working).
   - Verify the data home is readable but the database is opened in a mode that enforces the runtime's intended access boundary.
4. **Corruption detection:** Truncate a valid database file. Attempt to open it through the lane runtime. Assert the runtime detects corruption (e.g., via `PRAGMA integrity_check`) and refuses to serve. Test with a file of random bytes (no valid SQLite header). Assert the runtime detects the invalid file, logs a diagnostic with the detection method, and refuses service.
5. **Semantic-root rebuild:**
   - Initialize a fresh lane and record the logical row contents of every SQLite table.
   - Delete the database file, then trigger a rebuild. Compare row by row: identical primary keys, identical payload, identical schema version.
   - Test rebuild from an empty/zero-byte file (not missing). Assert same result.
   - Assert rebuild is safe: lane lock prevents concurrent mutation during rebuild, rebuild journal records the operation.
6. **Permission boundary proof:** Verify the worker account can `SELECT` through the runtime's read interface. Verify the worker account cannot `INSERT`, `UPDATE`, `DELETE`, `DROP`, or execute write `PRAGMA`. Verify operator can read/write the database file directly, but a read-only connection opened by the lane runtime still rejects writes regardless of OS file permissions.

### Phase 9 — Skill Install Proof

1. Verify dist contains the knowledge pack under `dist/knowledge/`.
2. For each supported host adapter (Codex, Cursor, Claude), run `wt skill install <host>`. Verify preview, version recording, and no lane-specific state embedding.
3. Test `--replace` for explicit overwrite.

### Phase 10 — Decision-Endpoint Adapter Qualification

From the global install, qualify a real compatible `opencode-cli` endpoint for
bounded invocation, cancellation, write denial, result validation, redaction,
catalog drift, capability-first selection, and shared-pool accounting. Detect
Hermes: absence is an explicit skip; an installed `hermes-cli` must pass the
same applicable checks before selection. Negative fakes may supplement but not
replace the real OpenCode proof.

### Phase 11 — Release Evidence

Write to `.local/agent-reports/watchtower-release/REL-03-security-performance-qualification.md` containing:

- Traversal suite: each boundary tested, malicious input, refusal or bounding result.
- Injection suite: corpus items, rejection or safe-storage result.
- Permissions suite: access matrix, doctor reporting, limitations.
- Manifest integrity: completeness check, negative cases, seal reproduction.
- Global install integrity: staging verification, coexistence.
- SQLite driver qualification: integrity verification, global-install proof, WAL/busy-handler tests, corruption detection and recovery, semantic-root rebuild proof, permission boundary proof.
- Boundedness measurements: wall time and output size table at each scale.
- Model-free audit: per-operation result with source-path evidence.
- Skill install: per-host result or limitation.
- Decision adapters: real OpenCode result; Hermes result/explicit skip;
  catalog-drift, redaction, cancellation, shared-pool, and selection evidence.
- Environmental information: CPU, memory, Node version, OS.

## What You Must Not Do

- Do not add product features, commands, or foundation modules.
- Do not make security claims without negative-fixture evidence.
- Do not make performance claims without actual measurements.
- Do not mock the `wt` binary in security or performance specs (except unit-level parser tests where direct import is the intended security boundary test).
- Do not commit temporary fixture data, build artifacts, or `.local/` reports.

## Required Proof

Before finishing, verify and report:

- Path traversal: at minimum one malicious input rejected per security boundary (lane directory, repository binding, runtime store, within-lane).
- Config injection: every injection class (command substitution, shell operators, variable expansion, control characters) rejected or safely stored as literal text.
- Permissions: worker read/execute succeeds, worker deny-write verified, doctor reporting correct, `WATCHTOWER_DATA_HOME` relocation works.
- Manifest integrity: completeness verified, missing-asset negative case fails build, checksum-mismatch negative case fails build, seal reproduction confirmed.
- Global install integrity: staged runtime matches dist manifest and checksums, two runtime versions coexist.
- SQLite driver qualification: native binary checksum matches manifest; global-install proof (driver loads from globally installed package outside dev tree); WAL journal mode confirmed; concurrent readers succeed with busy-handler; corruption detection (truncated database and random-bytes file both detected and service refused); semantic-root rebuild (rebuild from empty produces identical logical rows and schema version); permission boundary (worker SELECT succeeds, worker write refused through connection-level SQLITE_OPEN_READONLY).
- Boundedness: actual wall-time and output-size measurements at 30, 300, 3,000, and 10,000 batch scales, or at minimum two scales if synthetic generation is limited.
- Model-free audit: every mechanical coordination operation verified through source-path audit or invocation counter.
- Skill install: per-host proof or documented limitation.
- Decision adapters: real OpenCode qualification and conditional Hermes proof;
  no stale capability reuse, secret leakage, shared-pool overcount, or
  cost-based capability downgrade.
- Final git status: no build/dist/node_modules/.nira/local/.watchtower artifacts staged.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Update: `implementation-tracker.md`, `implementation-roadmap.md`, `work-batches/00-work-batch-index.md`, `review-batches/00-review-batch-index.md`, `v1-implementation-map.md`.

## Local Artifact Git Rule

- do not add `.local` artifacts to git

## Non-Negotiable Rules

- Security evidence requires negative exploit fixtures.
- Performance evidence requires actual wall-time and output-size measurements.
- Every claim must be independently reproducible by the reviewer.

## Required Disk Report

Write to: `.local/agent-reports/watchtower-release/REL-03-security-performance-qualification.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

This is the third of four release qualification batches. After acceptance, the next batch is REL-04 (documentation consistency and release gate). Record the synthetic pack generation mechanism, the performance measurement environment, the multi-account test setup (or limitation), the SQLite driver qualification environment (Node version, native module path, WAL configuration, busy-handler timeout), and every security boundary tested. The reviewer must independently reproduce at minimum: one path traversal negative case, one injection negative case, one permission check, one manifest integrity negative case, one SQLite driver integrity or corruption test, one performance measurement, and one model-free audit result. REL-04 depends on REL-03 being accepted.
