# Agent Launch Prompt — Work Batch REL-01

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
- primary: `GPT-5.6 Terra`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.6 Sol` only when paired with an independent `R4` final review and explicit end-to-end pipeline proof
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `GPT-5.6 Terra`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` only when paired with an independent `R4` final review and explicit end-to-end pipeline proof
- acceptable only with strong human steering and mandatory independent re-review: `GPT-5.6 Sol`, `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only non-normative examples and may become unavailable or stale. Select a currently available agent that can load the complete brief/spec/source context, inspect and edit the repository with tools, reason across package boundaries, and run the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient context for state machines, concurrency, graph/planner logic, driver behavior, destructive migration safety, or cross-package closure evidence. This batch is R5 because it spans the complete lane lifecycle across all six packs: global install, init, discovery, status, watch, coordinator dispatch, implementer work, reviewer handoff and acceptance, publication, operator sessions, doctor, and upgrade. The chain is long but linear; the agent must sustain contextual reasoning across the full pipeline and diagnose failures by tracing back through accepted source to identify whether the defect is in the product or the trial fixture.
- If the assigned agent cannot retain the governing context, independently inspect the source, or execute the proof, escalate to a stronger agent or split only along the existing brief's ownership boundaries. Never reduce the contract to fit a weaker model.

You are assigned **implementation work batch REL-01** — the fresh-lane implementer→reviewer→accept trial. This batch globally installs `wt`, initializes a complete implementation lane, exercises the full pipeline through acceptance and publication, and produces the release evidence packet. It is the marquee v1 acceptance trial.

This batch does **not** exercise concurrent lanes, multi-repository recovery, security exploits, performance scaling, or documentation audits. It establishes the baseline happy-path acceptance pipeline.

## Read In This Order

Repository prerequisites: `AGENTS.md`, `docs/spec/v1-implementation-map.md`.

1. `docs/spec/v1.md` — the complete product specification. Read the entire document, especially §11 (command behavior), §14 (safety), and §17 (release acceptance).
2. `docs/spec/v1-contracts.md` — the executable contract closure. Read §1 (precedence), §2 (lifecycle/init syntax), §3 (pack consumer contract), §4 (routing/capability floors), §5 (proposal/effect registry), §6 (adapter contract), §7 (policy baseline), §8 (public JSON contract), §10 (acceptance commit verification), and §11 (locking/transactions/recovery).
3. `docs/spec/architecture.md` — the architecture document. Read §4 (logical components), §6 (read/write flows), and §9 (safety model).
4. `docs/spec/coordinator-automation.md` — the coordinator execution contract.
5. `docs/spec/operator-session.md` — the operator session lifecycle and commands.
6. `docs/spec/cli-session.md` — the foreground terminal UX contract.
7. `docs/spec/implementation/wt-v1-release/work-batches/REL-01-fresh-lane-implementer-reviewer-accept-trial.md` — this batch's work brief.
8. `docs/spec/implementation/wt-v1-release/README.md` — the pack-level README, owner map, and quality rules.
9. `docs/spec/implementation/wt-v1-release/implementation-quality-and-agent-rules.md` — the pack quality rules.
10. `docs/spec/implementation/wt-v1-release/implementation-roadmap.md` — the pack roadmap.
11. `docs/spec/implementation/wt-v1-release/implementation-tracker.md` — the pack tracker.
12. `docs/spec/implementation/wt-v1-release/work-batches/README.md` — work batch rules.
13. The current source tree:
    - `src/cli.ts` — verify it remains thin (no product logic).
    - `src/commands/` — all command classes.
    - `src/foundation/` — all foundation services.
    - `src/contracts/` — all public types.
    - `help/help.json` — the help registry.
    - `runtime-nvb/` — the NVB task surfaces.
    - `spec/` — existing Jasmine specs and spec structure.
14. `nvb.json` — the available NVB task surfaces for build, test, and dist.
15. The accepted Pack 1–5 trackers and implementation reports to verify the dependency gate.

## Reasoning / Agent Class

You are operating at reasoning class `R5`. This reflects the cross-pack end-to-end trial nature of the batch: the full pipeline exercises lane lifecycle, coordinator routing/validation/effects, operator-session lifecycle, and attachment commands from all six accepted packs.

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `GPT-5.6 Terra`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` only when paired with an independent `R4` final review and explicit end-to-end pipeline proof
- acceptable only with strong human steering and mandatory independent re-review: `GPT-5.6 Sol`, `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context
- final-authority constraint: a steering-only or lower-reasoning agent cannot issue the final implementation judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact commands, options, exit codes, schemas, and events exercised by this trial.
2. Verify the prerequisite pack acceptance gate. Open the trackers for packs 1–5 and confirm every batch is marked accepted. Run `nvb build` and `nvb test` independently. Record the commit hash.
3. Inspect the current source. Do not infer behavior from the specification or a prior agent's report. Open the CLI, foundation, and contract source files that the trial will exercise.
4. Enumerate public invariants, invalid states, failure precedence, compatibility constraints, and deliberately unsupported behavior before writing any e2e spec. Specifically:
   - Every exit code mapped to a failure class.
   - Every JSON schema field that the trial must validate.
   - Every init preflight check that must have a negative case.
   - Every doctor check that must have a deliberate-break fixture.
   - Every upgrade guard that must be exercised.
5. Use counterexamples: identify at least one plausible shortcut that would pass a happy-path test while violating product safety — such as silently accepting an unsealed pack, copying the runtime tree, writing lane-owned config during upgrade, holding the lane lock during an operator-session generation, or committing generated artifacts. Ensure the trial fixtures reject each.
6. When the spec and current source disagree, stop that line of work, record the contradiction precisely, and resolve through the correction process. Do not silently choose the easier interpretation.

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

Execute the marquee v1 acceptance trial: globally install `wt`, initialize a complete implementation lane, exercise the full pipeline through acceptance and publication, and produce the release evidence packet.

### Phase 0 — Pre-implementation Baseline

1. Start from a clean checkout of the repository HEAD.
2. Verify packs 1–5 acceptance status. For each pack's tracker in `docs/spec/implementation/`, confirm every work and review batch is marked accepted.
3. Record the current git status:
   ```bash
   git log --oneline -1
   git status --short
   ```
4. Run `nvb build` and record the exit code.
5. Run `nvb test` and record pass/fail counts.
6. Verify `hello` scaffold is removed:
   ```bash
   ls src/commands/HelloCommand.ts 2>/dev/null && echo "HELLO STILL EXISTS - REJECT" || echo "hello removed OK"
   ls help/commands/hello.hlp.json 2>/dev/null && echo "HELLO HELP STILL EXISTS - REJECT" || echo "hello help removed OK"
   ```
7. Record any environmental limitations (no tmux available, no root access for global install, etc.).

### Phase 1 — Global Install Trial

1. Build the package:
   ```bash
   nvb dist
   ```
   Record the exit code and any build warnings.

2. Validate the package contents:
   ```bash
   ls dist/bin/wt.js dist/src/ dist/help/ dist/runtime/ dist/knowledge/ dist/runtime-nvb/ dist/package.json
   ```
   Verify every required directory and file exists.

3. Verify runtime manifest integrity:
   - Open `dist/runtime/manifest.json`. Check that every managed asset has a `sha256` field.
   - For a sample of managed assets, compute the actual SHA-256 and compare to the manifest.

4. Install globally:
   ```bash
   npm install -g ./dist
   ```
   Record the exit code.

5. Verify the installed binary:
   ```bash
   which wt
   wt --version
   wt help
   ```
   Verify the command exits 0 and lists no `hello` subcommand.

### Phase 2 — Prepared Implementation Pack Fixture

Create or locate a valid implementation pack fixture for the init trial. The fixture must be a real Git repository with:

1. `implementation-pack.json` — valid against `$defs.implementationPack`.
2. `implementation-pack.lock.json` — valid seal computed per RFC 8785.
3. `pack-acceptance.json` — verdict `accept`, valid reviewer identity.
4. `requirements-traceability.md` — mapping requirements to batches.
5. `implementation-map.md`, `implementation-roadmap.md`, `implementation-tracker.md`, `implementation-quality-and-agent-rules.md` — the standard structural files.
6. `work-batches/` and `review-batches/` directories with valid briefs.

The fixture must be committed and tracked at HEAD. Create it as a temporary directory initialized as a Git repository.

Also prepare:
- An unaccepted pack variant (missing or modified `pack-acceptance.json`)
- An unsealed pack variant (modified seal in lock file)
- An uncommitted pack variant (sealed file not tracked)
- A critically drifted pack variant (sealed file bytes changed)

### Phase 3 — Coordinator Routing Fixture

Create a valid `coordinator-routing.json` fixture that assigns eligible endpoint IDs and reserves to D1–D3 decision classes following the routing policy in `v1-contracts.md §4`. Minimum requirements:
- At least one D2-capable endpoint with C3 capability.
- At least one D3-capable endpoint with C5 capability.
- Valid budget reserves respecting the policy baseline in `v1-contracts.md §7`.

### Phase 4 — Init Trial

1. Run init with the prepared fixtures:
   ```bash
   wt init release-trial \
     --tmux-prefix=rt \
     --impl-pack=<path/to/fixture/pack> \
     --coordinator-routing=<path/to/fixture/routing.json> \
     --workspace=<path/to/fixture/repo> \
     --update-gitignore
   ```
   Record exit code and stdout/stderr.

2. Inspect the created lane:
   ```bash
   find .watchtower/lanes/release-trial/ -type f | sort
   cat .watchtower/lanes/release-trial/lane.json
   cat .watchtower/lanes/release-trial/install.json
   cat .watchtower/lanes/release-trial/repositories.local.json
   cat .watchtower/lanes/release-trial/lane.config.env
   ```
   Verify every required field and file exists.

3. Verify no runtime tree was copied. The runtime must be linked from the XDG data store, not copied into the lane:
   ```bash
   ls -la .watchtower/lanes/release-trial/bin/
   # These should be symlinks to <watchtower-data-root>/runtimes/<version>/...
   ```

4. Run `wt status --json`:
   ```bash
   wt status --json --lane=release-trial --workspace=<fixture/repo>
   ```
   Capture the output. Verify it is valid JSON, `schemaVersion` is 1, lane identity is correct.

5. Run `wt list` from the control home:
   ```bash
   wt list --workspace=<fixture/repo>
   ```
   Verify the new lane appears.

### Phase 5 — Init Refusal Trial

For each negative case:

1. Unaccepted pack: copy the valid fixture, remove or corrupt `pack-acceptance.json`, attempt init. Assert exit code non-zero, diagnostic references the acceptance issue.
2. Unsealed pack: modify the lock file seal, attempt init. Assert refusal.
3. Uncommitted pack: create a sealed file that is not tracked in Git, attempt init. Assert refusal.
4. Critically drifted pack: modify a sealed file's bytes, attempt init. Assert refusal.
5. Existing lane: attempt init with the same slug. Assert refusal.
6. Missing gitignore: remove `.watchtower/` from `.gitignore`, attempt init without `--update-gitignore`. Assert refusal.

### Phase 6 — Discovery Trial

1. From the control home root, run `wt list`. Verify the lane appears.
2. From a descendant directory (e.g., `docs/`), run `wt list`. Verify the lane appears.
3. From the lane directory (`.watchtower/lanes/release-trial/`), run `wt list`. Verify the lane appears.
4. Create a second lane (`release-trial-2`). Verify `wt list` shows both.
5. From an unrelated directory, run `wt list`. Verify empty result or no error (the spec allows an empty list).

### Phase 7 — Watch Trial

1. Run `wt watch` in the foreground:
   ```bash
   timeout 5 wt watch --lane=release-trial --workspace=<fixture/repo> || true
   ```
   Verify heartbeat lines appear on stdout. Verify the process exits cleanly after timeout (SIGTERM).
2. Run `wt watch` and send Ctrl-C (SIGINT). Verify cleanup.
3. Inspect watcher state after exit:
   ```bash
   cat .watchtower/lanes/release-trial/state/watcher-state.txt 2>/dev/null || echo "no watcher state file"
   ```

### Phase 8 — Implementer→Reviewer→Accept Cycle Trial

This phase exercises the coordinator and worker pipeline. If real tmux sessions are not available in the test environment, use a documented workaround (e.g., `wt coordinator cycle --dry-run` to verify routing and envelope construction, plus manual commit simulation for the acceptance pipeline).

1. **Ready-set calculation:** Verify the coordinator can identify ready batches:
   ```bash
   wt batch ready --lane=release-trial --workspace=<fixture/repo>
   ```
   Record the list of candidate batches and any blocking reason codes.

2. **Implementer dispatch:** Using the coordinator cycle command (or manual tmux session):
   - Launch an implementer worker for a ready batch.
   - The worker completes its implementation.
   - Verify a `handoff` event is recorded in the coordinator journal.

3. **Reviewer dispatch:**
   - The coordinator detects the handoff event.
   - A reviewer session is launched.
   - The reviewer independently verifies the implementation.
   - The reviewer accepts the batch, producing an `accept` event.

4. **Acceptance verification:**
   - Inspect the `accept` event in the coordinator journal:
     ```bash
     cat .watchtower/lanes/release-trial/coordinator/journal/coordinator-events.jsonl | tail -1
     ```
   - Verify `event: "accept"`, `batch` matches, `commits` maps every writable repository.
   - Verify each commit exists and is reachable from the worktree branch tip.

5. **Publication:**
   - Verify per-repository push journals are created.
   - If a remote is configured, verify push succeeds. If not, document the limitation.

### Phase 9 — Operator-Session Trial

1. Create a session:
   ```bash
   wt coordinator session --lane=release-trial --workspace=<fixture/repo>
   ```
   Record the session ID.

2. List sessions:
   ```bash
   wt coordinator session list --lane=release-trial --workspace=<fixture/repo>
   ```
   Verify the session appears with `state: open`.

3. Ask a bounded question:
   ```bash
   wt coordinator ask "Which batch is currently active?" --lane=release-trial --workspace=<fixture/repo>
   ```
   Verify the response is advisory, does not mutate lane state.

4. Place a scoped hold:
   ```bash
   wt coordinator hold place --scope=<batch-id> --expiry=5m --reason="testing hold trial" --lane=release-trial --workspace=<fixture/repo>
   ```

5. Verify status reports the hold:
   ```bash
   wt status --lane=release-trial --workspace=<fixture/repo>
   ```
   Check that `coordinator.holds` includes the placed hold.

6. Release the hold:
   ```bash
   wt coordinator hold release <hold-id> --lane=release-trial --workspace=<fixture/repo>
   ```

7. Close the session:
   ```bash
   wt coordinator session close <session-id> --lane=release-trial --workspace=<fixture/repo>
   ```

### Phase 10 — Doctor Trial

1. Run doctor on the initialized lane:
   ```bash
   wt doctor --lane=release-trial --workspace=<fixture/repo>
   ```
   Record the check results. All required checks should pass.

2. Deliberately break one check and re-run:
   - Resolve the watcher compatibility link from `install.json`/the runtime
     manifest, then remove that exact fixture link; do not assume a filename
   - Run `wt doctor` again. Verify the broken link is reported as `fail` or `warn`.

3. Restore the link and run doctor again. Verify the check returns to `pass`.

### Phase 11 — Upgrade Trial

1. Record the current runtime version from `install.json`.
2. Simulate a newer runtime (or use the same version with a different staged path):
   ```bash
   wt upgrade --to=1.0.0 --lane=release-trial --workspace=<fixture/repo>
   ```
   Verify preview output shows no changes needed (same version).

3. Attempt downgrade:
   ```bash
   wt upgrade --to=0.9.0 --lane=release-trial --workspace=<fixture/repo>
   ```
   Verify refusal without `--allow-downgrade`.

4. Verify operator-session history is preserved through the upgrade cycle.

### Phase 12 — Release Evidence Packet

Write the complete release evidence document to `.local/agent-reports/watchtower-release/REL-01-fresh-lane-trial.md` containing:

- Pre-implementation baseline: commit hash, build/test results, hello removal confirmation.
- Global install evidence: `nvb dist` output, package contents, install exit code, `wt --version` output.
- Init trial evidence: command, exit code, lane file listing, status JSON, list output.
- Init refusal evidence: each negative case with command, exit code, and diagnostic.
- Discovery evidence: list output from each discovery path.
- Watch evidence: heartbeat transcript (first 5 seconds), signal exit behavior.
- Cycle evidence: ready-set output, implementer/reviewer handoff and accept event journal excerpts, commit hashes, publication status.
- Session evidence: create/list/ask/hold/release/close command outputs.
- Doctor evidence: pass output for healthy lane, fail output for broken link.
- Upgrade evidence: preview output, downgrade refusal.
- Environmental limitations documented honestly.
- Confirmation that `.local/`, build artifacts, and `.watchtower/` are not staged.

## What You Must Not Do

- Do not add new product features, commands, or foundation modules. This is a qualification trial, not a feature batch.
- Do not mock the `wt` binary or bypass the public CLI interface in e2e specs. The trial must exercise the real installed binary.
- Do not copy the runtime tree into the target project. Verify that init only creates links.
- Do not accept any init negative case where the spec requires refusal.
- Do not claim an acceptance criterion is satisfied without independently reproducing the evidence.
- Do not commit `.local/`, `dist/`, `build/`, `node_modules/`, `.nira/local/`, or `.watchtower/` artifacts.
- Do not commit the e2e spec until the reviewer accepts the batch. The implementer writes the spec; the reviewer owns the commit.
- Do not grow any existing source file. This batch creates only spec files and evidence reports.
- Do not add npm convenience scripts or new package dependencies.

## Required Proof

Before finishing, verify and report:

- Pre-implementation baseline: commit hash, `nvb build` exit code, `nvb test` pass/fail, hello removal status.
- Global install: `nvb dist` exit code, package contents, `npm install -g` exit code, `wt --version` output, `wt help` output (no hello command).
- Init trial: `wt init` exit code, lane directory listing, `lane.json` content, `install.json` content, `repositories.local.json` content, `lane.config.env` content, `wt status --json` output with JSON Schema validation, `wt list` output.
- Init refusal: each negative case documented with command, exit code, and diagnostic text.
- Discovery: list results from 5 discovery paths (control home, descendant, lane dir, second repo, unrelated dir).
- Watch: 5-second heartbeat transcript, signal exit behavior.
- Cycle: ready-set output, implementer handoff event, reviewer accept event, commit hashes, push journals.
- Session: create/list/ask/hold/release/close commands and their outputs.
- Doctor: healthy lane output, broken-link output.
- Upgrade: preview, downgrade refusal.
- Release evidence packet: complete and accurate.
- Final git status: no build/dist/node_modules/.nira/local/.watchtower artifacts staged.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Update the following after completing implementation:

- `docs/spec/implementation/wt-v1-release/implementation-tracker.md` — mark REL-01 as ⏳ awaiting review, add implementation date and short note.
- `docs/spec/implementation/wt-v1-release/implementation-roadmap.md` — update REL-01 status.
- `docs/spec/implementation/wt-v1-release/work-batches/00-work-batch-index.md` — add REL-01 entry with status ⏳.
- `docs/spec/implementation/wt-v1-release/review-batches/00-review-batch-index.md` — add REL-01 entry with status ❌ pending review.
- `docs/spec/v1-implementation-map.md` — update REL-01 status in the pack 6 table to ⏳.

## Local Artifact Git Rule

- do not add `.local` artifacts to git

## Non-Negotiable Rules

- No product features are added. This pack qualifies; it does not implement.
- E2E specs must exercise the real `wt` binary through its public interface.
- Mock-based acceptance trials that bypass the CLI, filesystem, or Git are rejected.
- Every acceptance criterion claimed satisfied must have independently reproducible evidence.
- The implementer does not commit. Only the reviewer owns the acceptance commit.

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/watchtower-release/REL-01-fresh-lane-trial.md`

Include: pre-implementation baseline, global install evidence, init trial results, init refusal negative cases, discovery results, watch trial, cycle trial, session trial, doctor trial, upgrade trial, final git status, environmental limitations, and every finding stated without upgrading it into a support claim.

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

This is the first of four release qualification batches. After acceptance, the next batch is REL-02 (concurrent and multi-repository recovery trials). Record the exact commit hashes, lane state at conclusion, release evidence packet location, and every environmental limitation. The reviewer must independently reproduce the full pipeline — they must not accept the implementation report's claims as proof. If any step of the pipeline cannot be reproduced (e.g., no tmux, no remote Git), document the limitation and the workaround used. REL-02 depends on this batch being accepted.
