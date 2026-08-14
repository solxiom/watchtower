# Batch REL-01 — Fresh-lane implementer→reviewer→accept trial

## Synchronized batch execution matrix

- **Accepted-map title:** Fresh-lane implementer→reviewer→accept trial
- **Dependencies:** `LC-08`, `UK-05`, `CA-24`
- **Exclusive ownership/interface:** end-to-end fixture/release evidence
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Global install; init; dispatch; handoff; independent accept; publication
- **Implementation report:** `.local/agent-reports/watchtower-release/REL-01-fresh-lane-implementer-reviewer-accept-trial.md`
- **Review report:** `.local/agent-reports/watchtower-release/reviews/REL-01-fresh-lane-implementer-reviewer-accept-trial-review.md`
- **Correction report:** `.local/agent-reports/watchtower-release/reviews/corrections/REL-01-fresh-lane-implementer-reviewer-accept-trial-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Pending
Phase: Release qualification
Depends on: LC-08, UK-05, CA-24 accepted (Packs 3, 4, 5 complete); all packs 1–5 accepted
Work ID: `REL-01`
Governing spec: `docs/spec/v1.md` §17; `docs/spec/v1-contracts.md` §§2–8

**Required implementor reasoning class:** `R5`
**Class rationale:** cross-pack end-to-end trial spanning global install, init, discovery, status, watch, dispatch, handoff, independent accept, publication, upgrade, doctor, operator sessions, and release evidence. The full chain exercises the lane lifecycle, coordinator routing/validation/effects, operator-session lifecycle, and attachment commands from all six packs. The agent must reason across filesystem state, Git state machines, and durable event journals while producing independently reproducible evidence. No single step is individually the hardest, but the complete sequential chain requires sustained contextual reasoning and the ability to diagnose failures at any step by tracing back through accepted pack source.

## Objective

Globally install the `wt` package from `nvb dist`, initialize a complete implementation lane from the accepted pack 5 fixtures, dispatch work, hand off to a reviewer agent, record independent acceptance, publish acceptance commits, and produce a release evidence packet documenting every step. Prove that the assembled product completes one full managed-lane cycle without copying the runtime tree into the target project.

This batch does **not** exercise concurrent lanes, multi-repository recovery, security exploits, performance scaling, or documentation audits. It establishes the baseline happy-path acceptance pipeline.

## Required Work

### Phase 1: Verify prerequisite pack acceptance

1. Confirm packs 1–5 are independently accepted. For each pack, verify:
   - All work and review batches are marked accepted in their respective trackers.
   - `nvb build` exits 0.
   - `nvb test` exits 0 with no unexpected failures.
2. Record the exact commit hash at the current HEAD. This is the release candidate baseline.
3. Record `nvb test` pass/fail counts for the complete test suite.
4. Confirm `hello` scaffold is removed (LC-08 exit condition).

### Phase 2: Global install trial

1. Build the package: `nvb dist`.
2. Validate the package against the manifest rules defined in `v1-contracts.md` and build validation:
   - `dist/` contains `bin/wt.js`, `src/`, `help/`, `runtime/`, `knowledge/`, `runtime-nvb/`, `package.json`.
   - `runtime/manifest.json` and `knowledge/manifest.json` are present and valid.
   - Every managed asset referenced in the runtime manifest has a matching checksum.
   - No missing, extra, non-executable, or checksum-mismatched managed assets exist.
3. Install globally: `npm install -g ./dist`.
4. Verify `wt` is available on PATH and `wt --version` exits 0.
5. Verify `wt help` lists no `hello` command.

### Phase 3: Lane initialization trial

1. Create a temporary fixture workspace with a valid implementation pack:
   - A Git repository with a committed implementation-pack structure.
   - `implementation-pack.json`, `implementation-pack.lock.json`, and `pack-acceptance.json` are valid and accepted.
   - The pack seal matches the committed file bytes.
   - A valid `--coordinator-routing` JSON plan exists.
2. Run `wt init <slug> --tmux-prefix=<pfx> --impl-pack=<path> --coordinator-routing=<path> --update-gitignore`.
3. Verify the created lane:
   - `.watchtower/lanes/<slug>/lane.json` exists with valid UUID, slug, kind, initiative, control-home repository.
   - `.watchtower/lanes/<slug>/install.json` exists with correct cliVersion, runtimeVersion, knowledgeVersion, mode, managedAssets.
   - `.watchtower/lanes/<slug>/repositories.local.json` exists with correct bindings.
   - `.watchtower/lanes/<slug>/lane.config.env` exists with valid KEY=value format.
   - `bin/` directory contains managed runtime links.
   - `state/`, `coordinator/`, `briefs/`, `prompts/`, `reports/`, `budgets/`, `logs/` directories exist.
   - Coordinator pack indexes, operator-session roots, amendment-request store, and hold registry are initialized.
4. Verify no runtime tree was copied into the target project. The control home contains only the structured lane overlay.
5. Run `wt status --json` on the bootstrapped lane. Verify:
   - Output is valid JSON matching the `laneStatus` schema.
   - `schemaVersion` is 1.
   - `lane.id`, `lane.slug`, `lane.kind`, `lane.controlHome` are correct.
   - `lifecycle.status` reflects the current state (bootstrap, then active after index activation).
   - `health` has expected status and any warnings.
6. Run `wt list`. Verify the new lane appears with correct slug, initiative, kind, control home.

### Phase 4: Init refusal trial (negative cases)

1. Attempt `wt init` with an unaccepted pack (missing `pack-acceptance.json` or verdict not `accept`). Verify refusal with exit code 3 or 4 and a clear diagnostic.
2. Attempt `wt init` with an unsealed pack (modified `implementation-pack.lock.json` or mismatched seal). Verify refusal.
3. Attempt `wt init` with an uncommitted pack (sealed file not tracked at HEAD). Verify refusal.
4. Attempt `wt init` with a critically drifted pack (sealed file bytes differ from HEAD). Verify refusal.
5. Attempt `wt init` over an existing lane directory. Verify refusal with a clear diagnostic.
6. Attempt `wt init` without `--update-gitignore` when `.watchtower/` is not ignored. Verify preflight failure.

### Phase 5: Discovery trial

1. From the control home, verify `wt list` discovers the lane.
2. From a descendant directory within the control home, verify `wt list` discovers the lane.
3. From the lane directory itself (`.watchtower/lanes/<slug>/`), verify `wt list` discovers the lane.
4. From a registered participating-repository path (after membership index registration), verify `wt list` discovers the lane.
5. Create a second lane in the same control home. Verify `wt list` shows both lanes.
6. From a directory that is not a descendant of any lane, verify `wt list` returns an empty result (not an error).

### Phase 6: Watch trial

1. Run `wt watch` for the initialized lane.
2. Verify the watcher starts, emits heartbeat lines to stdout, and continues until interrupted.
3. Send Ctrl-C (SIGINT). Verify the watcher exits cleanly and the lane state is not corrupted.
4. Verify the watcher does not daemonize (the foreground process is the watcher).
5. Inspect the watcher state file after exit. Verify it records the last heartbeat time.

### Phase 7: Coordinator mutation authorization trial

REL-01 qualifies the shipped decision plane without requiring a full tmux
dispatch→handoff→review→accept→publication replay in the piped e2e harness.
That end-to-end cycle remains corroboration for the watchtower-v1 lane
coordinator; this batch proves the authorization boundary and a bounded cycle
preview under operator witness.

#### Phase 7a — Automated fence and read-only coordinator proof (implementer-owned)

1. On a freshly initialized trial lane with **no** `coordinator/authorizations/cycle.json`,
   run `wt coordinator cycle --dry-run --trigger=<event-id> --lane=<slug>`.
   Verify refusal with exit code 4, `ERR_MISSING_DEPENDENCY`, and typed reason
   `COORDINATOR_MUTATION_AUTHORIZATION_UNAVAILABLE`.
2. Cross-reference phases 8 and 10: operator-session apply and index-build paths
   already refuse without their respective durable authorization capsules in the
   shipped product.
3. Record refusal codes, targets, and paths in the evidence packet.

#### Phase 7b — Operator witness for cycle mutation authorization (operator-owned)

1. Operator (not the REL-01 implementer during blocked recovery) authors a valid
   `coordinator/authorizations/cycle.json` through the supported decision path —
   a CA-25-valid capsule whose proposal cites the named trigger in
   `evidenceRefs` and passes CA-09 validation against the bundled `currentState`.
2. Operator runs `wt coordinator cycle --dry-run --trigger=<event-id> --lane=<slug>`
   and verifies preview success (`status: previewed`) without further lane mutation
   beyond the operator-written capsule.
3. Implementer records the witness transcript, capsule path, and dry-run envelope
   in the evidence packet (`§31`). Automated replay may use
   `spec/e2e/support/operatorWitnessCycleCapsule.ts`, which writes CA-25-valid
   bytes only to simulate operator authority — never from implementer authority
   while blocked.

#### Deferred corroboration (watchtower-v1 lane coordinator, out of REL-01 scope)

Full implementer→reviewer→accept→publication under live tmux coordination is
not a REL-01 deliverable after this amendment. Record any live-lane corroboration
separately when the watchtower-v1 coordinator runs that pipeline.

### Phase 8: Operator-session trial

1. Create an operator session: `wt coordinator session create`.
2. Verify `wt coordinator session list` shows the session with `state: open`.
3. Send a bounded advisory question: `wt coordinator ask "What batch should we focus on next?"`.
4. Verify the response is advisory (does not mutate lane state).
5. Attach to the session: `wt coordinator session attach <id>`.
6. Verify the attachment renders session context without holding the lane lock.
7. Create a scoped hold: `wt coordinator hold place --scope=<batch-id> --expiry=5m`.
8. Verify `wt status` reports the active hold.
9. Release the hold: `wt coordinator hold release <hold-id>`.
10. Confirm a proposal through `wt coordinator session apply <proposal-id>`.
11. Verify the proposal requires revalidation before the effect executor acts.
12. Detach from the session. Verify the session remains open.
13. Close the session: `wt coordinator session close <id>`.

### Phase 9: Doctor trial

1. Run `wt doctor` on the initialized lane.
2. Verify checks return `pass` for:
   - control home and repository access
   - marker/config/state schema
   - repository ID/path/branch/worktree consistency
   - runtime manifest, links, executability, and checksums
   - required tools (`bash`, `git`, `tmux`, `jq`, `flock`)
   - coordinator policy/routing compatibility
   - operator-session policy and index consistency
   - Git ignore coverage for `.watchtower/`
3. Deliberately break one check (e.g., remove a managed link, corrupt `lane.json`, remove a tool from PATH). Verify `wt doctor` reports `fail` or `warn` as appropriate.

### Phase 10: Upgrade trial

1. Create a second runtime version (or stage a compatible newer runtime version).
2. Run `wt upgrade --to=<version>` without `--apply`. Verify preview-only behavior:
   - Shows changed, unchanged, preserved, migrated, and conflicted paths.
   - Does not modify any file.
3. Run `wt upgrade --to=<version> --apply`.
4. Verify only manifest-owned paths are changed. Lane-owned config (`lane.config.env`, `repositories.local.json`) is preserved.
5. Verify operator-session history (turns, journals, indexes) is preserved.
6. Verify the old runtime remains staged and usable.
7. Attempt downgrade without `--allow-downgrade`. Verify refusal.

### Phase 11: Release evidence packet

Produce a release evidence document at `.local/agent-reports/watchtower-release/REL-01-fresh-lane-trial.md` containing:

- Exact `wt --version` output.
- Exact `nvb dist` exit code and output summary.
- Exact `npm install -g ./dist` exit code.
- Exact `wt init` command and exit code.
- Exact `wt status --json` output for the initialized lane.
- Exact `wt list` output.
- Exact `wt watch` transcript (first 5 seconds of heartbeat lines).
- Summary of the implementer→reviewer→accept cycle with commit hashes, event types, and timestamps.
- Exact `wt doctor` output for the healthy lane.
- Exact `wt doctor` output for the deliberately broken fixture.
- Exact `wt upgrade` preview and apply outputs.
- Confirmation that no runtime tree was copied into the target project.
- Confirmation that `.local/`, `.env`, `project/`, `.demo-state/`, and native binaries are not staged.
- Any limitations (e.g., "tmux session not available in CI environment" with documented workaround).
- Proposed commit message for the acceptance commit.

## Expected Ownership

- `spec/e2e/accept-trial.spec.ts` — end-to-end Jasmine spec for phases 2–6 and 9.
- `spec/e2e/acceptTrialPhase7.spec.ts` — phase 7a fence and 7b operator-witness replay.
- Release evidence fixtures: temporary workspace directories created and cleaned up by the spec.
- `docs/spec/implementation/wt-v1-release/implementation-tracker.md` — updated with REL-01 status.
- `docs/spec/implementation/wt-v1-release/implementation-roadmap.md` — updated with REL-01 status.
- `.local/agent-reports/watchtower-release/REL-01-fresh-lane-trial.md` — release evidence packet.

## Structural Constraints

- E2E specs use Jasmine with temporary directories and real subprocess execution of `wt`.
- No mock bypass of the public CLI interface. E2E specs invoke the installed
  `wt` entrypoint as a real subprocess through the established Nirvana
  command/test-process harness, with real filesystem operations. A direct
  `node:child_process` harness requires recorded Nirvana API-gap evidence and
  one narrow test-only owner.
- Fixture setup and teardown must clean up all created files, directories, and Git repositories.
- Spec files must not exceed the 400-line ceiling; split by trial phase if needed.
- No new npm convenience scripts or package dependencies.
- No product logic changes in `src/`. This batch creates specs and evidence, not features.

## Reject Conditions

Reject Batch REL-01 if any of the following is true:

- The global install trial does not complete.
- `wt init` copies the runtime tree into the target project.
- `wt init` accepts an unaccepted, unsealed, uncommitted, or critically drifted pack.
- Lane discovery fails from any documented discovery path.
- `wt status --json` output does not validate against the JSON Schema.
- `wt watch` daemonizes or fails to emit heartbeat lines.
- Phase 7a does not prove the cycle authorization fence, or phase 7b operator
  witness does not produce a successful bounded `wt coordinator cycle --dry-run`.
- Reviewer acceptance is not durably recorded and distinct from Git publication.
- `wt doctor` misses a deliberately introduced violation.
- `wt upgrade --apply` overwrites lane-owned config or operator-session history.
- Any mock replaces the real `wt` binary or real filesystem/Git operations where the spec does not permit it.
- The release evidence packet is missing, incomplete, or narrative-only.
- Any build, dist, node_modules, `.nira/local`, or `.watchtower` artifact is added to Git.

## Completion And Handoff

Implementation is handoff-ready only after all required work, test proof, architecture checks, and the durable implementation report are complete. The implementer must not create an acceptance commit or mark the batch accepted. Only the paired reviewer may do that after independent proof.

The handoff must state:
- Exact changed files and ownership role.
- Focused and regression commands with actual pass/fail counts.
- The exact release evidence packet location and content summary.
- Every negative-case result (init refusal, doctor break, upgrade guard, downgrade refusal).
- Confirmation that `.local/`, build artifacts, and `.watchtower/` are not staged.
- The next batch dependency: REL-02 is blocked until REL-01 is accepted.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **end-to-end fixture/release evidence**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/watchtower-release/REL-01-fresh-lane-implementer-reviewer-accept-trial.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`LC-08`, `UK-05`, `CA-24`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Global install; init; dispatch; handoff; independent accept; publication**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **end-to-end fixture/release evidence** and **Global install; init; dispatch; handoff; independent accept; publication**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/watchtower-release/REL-01-fresh-lane-implementer-reviewer-accept-trial.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
