# Agent Launch Prompt — Work Batch LC-08

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

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for end-to-end integration testing, scaffold removal, and cross-command coordination`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing
  specs, current source, predecessor handoff, and proof output in context; if it
  cannot do so, escalate the agent rather than shortening or partitioning away
  safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help
  with bounded exploration, but it cannot issue the final implementation or
  acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only
non-normative examples and may become unavailable or stale. Select a currently
available agent that can load the complete brief/spec/source context, inspect
and edit the repository with tools, reason across the complete lifecycle chain,
and run the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, driver behavior,
  destructive migration safety, or cross-package closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch LC-08** for the Watchtower v1
wt-lane-lifecycle delivery lane.

This batch creates the end-to-end lifecycle fixture, proves init→status→watch/doctor
works as a complete chain, proves rollback works, and removes all hello scaffold
artifacts from the codebase. No partial removal; no hidden state left behind.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-08-lifecycle-integration-and-scaffold-removal.md`
3. `docs/spec/implementation/wt-lane-lifecycle/work-batches/README.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`
5. `docs/spec/v1.md` — §7 (lane layout), §8 (config), §11.1 (init), §11.3 (status), §11.4 (watch), §11.7 (doctor), §15 (rollback)
6. `docs/spec/v1-contracts.md` — §8 (exit codes for init, status, watch, doctor)
7. `docs/spec/architecture.md` — §6.3 (runtime execution flow)
8. `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
9. `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
10. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
11. `docs/spec/implementation/wt-lane-lifecycle/batch-reasoning-difficulty-ranking.md`
12. the canonical source owners you will create or modify:
    - `spec/e2e/lifecycle.spec.ts` (new end-to-end fixture)
    - `src/commands/index.ts` (modify — remove HelloCommand)
    - `help/help.json` (modify — remove hello entry)
    - `help/commands/README.md` (modify — remove hello section if present)
13. the scaffold artifacts you must delete:
    - `src/commands/HelloCommand.ts`
    - `help/commands/hello.hlp.json`
    - `spec/commands/HelloCommand.spec.ts` (if present)
    - Any hello-related runtime-nvb tasks
14. the dependency modules you must inspect:
    - RM-10: status command
    - LC-01 through LC-07: the complete lifecycle chain
    - `src/contracts/` — for type conventions
    - All commands (init, status, watch, doctor) — for integration behavior

## Reasoning / Agent Class

- brief-declared reasoning level: `R3`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for end-to-end integration testing, scaffold removal, and cross-command coordination`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing
  specs, current source, predecessor handoff, and proof output in context; if it
  cannot do so, escalate the agent rather than shortening or partitioning away
  safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help
  with bounded exploration, but it cannot issue the final implementation or
  acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, factories, lower-layer capsules, front doors, tests, and status
   artifacts affected by this batch.
2. Inspect the current source and accepted predecessor-batch output. Do not infer
   behavior from filenames, the implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, failure precedence, concurrency
   or re-entrancy risks, compatibility constraints, and deliberately unsupported
   behavior before choosing or evaluating a design.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating ownership, safety, boundedness, or public
   result semantics, then ensure focused proof rejects it.
5. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
6. Treat predecessor reports as leads, not proof. Re-open the actual changed
   files and reproduce all acceptance-critical evidence from the current tree.

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

Create an init→status→watch/doctor end-to-end fixture. Prove rollback works.
Remove all hello scaffold artifacts. Ensure build passes after removal.

1. **Create `spec/e2e/lifecycle.spec.ts`:**
   - Use a temporary control home and workspace directory for isolation
   - Create temp directories in a system temp location (os.tmpdir())
   - **Init fixture:**
     - Run `wt init` with valid arguments: slug, prefix, scope, routing, workspace
     - Verify exit code 0 (success)
     - Verify lane directory layout: `lane.json`, `install.json`, `lane.config.env`
     - Verify `lane.json` schema: required fields present, slug/ID patterns valid
     - Verify `install.json` schema: required fields present
     - Verify `lane.config.env` contains expected keys with correct values
     - Verify all subdirectories from v1.md §7.2 exist
   - **Status fixture:**
     - Run `wt status` with lane slug/UUID
     - Verify exit code 0
     - Verify status output references the created lane
     - Verify status output includes expected lane metadata (slug, UUID, initiative)
   - **Watch fixture:**
     - Run `wt watch` in child process
     - Verify preflight passes (no exit 3, 4, or 5)
     - Verify watch process starts (check stdout for expected output)
     - Send SIGINT after brief observation period
     - Verify watch process exits cleanly (exit code from signal or 0)
     - Verify no orphaned child processes remain
   - **Doctor fixture:**
     - Run `wt doctor` on the created lane
     - Verify exit code 0 (no failures — some warns are acceptable)
     - Verify all expected check categories are present in output
     - Verify lane-specific checks pass (lane marker, config, etc.)
   - **Rollback proof (failed init):**
     - Run `wt init` with invalid slug (e.g., `"INVALID!!!"` or too long)
     - Verify exit code ≠ 0 (failure)
     - Verify no lane directory was created (fs.stat throws or returns not-found)
     - Verify `.watchtower/` directory is either empty or absent
     - Run `wt init` with missing required argument (e.g., no slug)
     - Verify exit code ≠ 0
     - Verify no residual state
   - **Complete chain proof:**
     - Verify that after init→status→watch/doctor, the lane directory contains
       exactly the files produced during init (no additional files from read operations)
   - Clean up temp directories in afterEach/afterAll hooks

2. **Delete scaffold artifacts:**
   - Delete `src/commands/HelloCommand.ts`
   - Delete `help/commands/hello.hlp.json`
   - Delete `spec/commands/HelloCommand.spec.ts` (if present)
   - Search for and delete any hello-related runtime-nvb tasks:
     - Check `runtime-nvb/` for files with "hello" in name or content
     - Delete matching files

3. **Update `src/commands/index.ts`:**
   - Remove `import HelloCommand from "./HelloCommand";` line
   - Remove `HelloCommand` from the command registry (array, map, or object)
   - Verify the file still exports all remaining commands correctly
   - Verify no other references to `HelloCommand` in the file

4. **Update `help/help.json`:**
   - Remove the entry for "hello" command
   - Verify the JSON remains valid after removal
   - Verify all remaining command entries are intact

5. **Audit remaining hello references:**
   - Search for `hello` (case-insensitive) in:
     - `src/` — all TypeScript source files
     - `help/` — all help JSON fragments
     - `spec/` — all Jasmine spec files
     - `runtime-nvb/` — all NVB build/distribution files
     - `docs/spec/` — documentation (update any references to hello scaffold)
   - Remove or update every hello reference found
   - Exclude: this work batch document, the implementation report, and
     `v1-implementation-map.md` (which documents hello for historical context)
   - Verify with a final search: `grep -ril hello src/ help/ spec/ runtime-nvb/`
     returns zero results (or only permitted documentation references)

6. **Verify build and tests:**
   - Run `nvb build` — must pass with zero errors
   - Run `nvb test` — must pass with zero failures
   - Run the lifecycle e2e fixture specifically: `npx jasmine spec/e2e/lifecycle.spec.ts`
   - If any test fails, fix the underlying issue before proceeding

## What You Must Not Do

- Do not remove anything beyond hello scaffold artifacts — all real commands
  (init, status, watch, doctor, list, config) and their foundation modules
  must remain untouched
- Do not break `nvb build` — the build must pass after removal
- Do not break existing commands — all non-hello commands must remain functional
- Do not remove foundation modules, contracts, or CLI infrastructure
- Do not remove any test spec that is not hello-specific
- Do not alter the behavior of init, status, watch, or doctor — only test them
- Do not leave partial hello removal — delete all hello artifacts or none
- Do not add product logic to `src/cli.ts`
- Do not commit
- Do not add `.local` artifacts to git

## Required Proof

Before finishing, verify and report:

- End-to-end fixture: init creates valid lane directory
- End-to-end fixture: status reads created lane
- End-to-end fixture: watch preflight passes and watch execs
- End-to-end fixture: doctor returns pass/warn on valid lane
- Rollback proof: invalid init leaves no residue
- Rollback proof: missing-arg init leaves no residue
- Hello artifacts: `src/commands/HelloCommand.ts` deleted
- Hello artifacts: `help/commands/hello.hlp.json` deleted
- Hello artifacts: hello entry removed from `help/help.json`
- Hello artifacts: hello import removed from `src/commands/index.ts`
- Zero hello references in `src/`, `help/`, `spec/`, `runtime-nvb/`
- `nvb build` passes with zero errors
- `nvb test` passes with zero failures
- Final `git status --short`
- Proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
- `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- remove all hello scaffold artifacts completely — no partial removal
- end-to-end fixture must cover init→status→watch/doctor
- rollback must be proven with concrete evidence
- `nvb build` must pass after removal
- do not break any real command or foundation module
- do not add product logic to `src/cli.ts`
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-lane-lifecycle/LC-08-lifecycle-integration-and-scaffold-removal.md`

The report must include:

- documents studied
- exact files created (e2e fixture) and deleted (hello artifacts)
- exact files modified (index.ts, help.json)
- End-to-end fixture: init, status, watch, doctor execution output
- Rollback proof: failed init scenarios and verification
- Scaffold removal audit: every deleted file, every modified reference
- Zero-hello-reference audit: search results proving no remaining hello refs
- `nvb build` output
- `nvb test` output
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the end-to-end fixture structure, the complete list of deleted hello
artifacts, the verification that build and tests pass after removal, and the
rollback proof. Make explicit that Pack 4 (wt-upgrade-knowledge) and Pack 5
(wt-coordinator-automation) now build on a proven, hello-free lifecycle
foundation.
