# Agent Launch Prompt — Review Batch REL-01

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
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.6 Sol` only with strong steering and full pipeline reproduction
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must reproduce the complete pipeline spanning all six packs; the full context of the governing specs, the implementation report, and the source tree must be retained
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `Claude Sonnet 4.6` only with strong steering and full pipeline reproduction
- acceptable only with strong human steering and mandatory independent re-review: `GPT-5.6 Sol`, `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain full context of governing specs, implementation report, and source tree
- final-authority constraint: a steering-only or lower-reasoning agent cannot issue the final acceptance judgment

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only non-normative examples and may become unavailable or stale. Select a currently available agent that can load the complete brief/spec/source context, inspect and edit the repository with tools, reason across package boundaries, and run the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient context for state machines, concurrency, graph/planner logic, driver behavior, destructive migration safety, or cross-package closure evidence. This review batch is R5 because the reviewer must independently reproduce the complete end-to-end pipeline spanning all six packs, exercise every command through the globally installed binary, verify journal integrity and schema conformance, and diagnose any failure by tracing through accepted source.
- If the assigned agent cannot retain the governing context, independently inspect the source, or execute the proof, escalate to a stronger agent or split only along the existing brief's ownership boundaries. Never reduce the contract to fit a weaker model.

You are assigned **review batch REL-01** — the independent review of the fresh-lane implementer→reviewer→accept trial. You must independently reproduce the complete pipeline, verify every claim in the implementation report, and either accept with an acceptance commit or reject with a correction brief.

## Read: review brief, impl report, work brief, governing specs, implementation map, quality rules.

## Expanded Read And Verification Order

1. Repository prerequisites: `AGENTS.md`, `docs/spec/v1-implementation-map.md`.
2. The durable review brief: `REL-01-review-fresh-lane-implementer-reviewer-accept-trial.md`.
3. The paired work brief: `REL-01-fresh-lane-implementer-reviewer-accept-trial.md`.
4. The governing specs: `docs/spec/v1.md` (entire), `docs/spec/v1-contracts.md` (entire), `docs/spec/architecture.md`, `docs/spec/coordinator-automation.md`, `docs/spec/operator-session.md`, `docs/spec/cli-session.md`.
5. The implementation report at `.local/agent-reports/watchtower-release/REL-01-fresh-lane-trial.md`.
6. The actual `git diff` from the baseline commit. Verify only spec files and trackers changed.
7. The current source: every command class, foundation module, and contract that the pipeline exercises.
8. The pack 1–5 trackers to verify prerequisite acceptance status.
9. `nvb.json` — available NVB task surfaces.
10. Final git status and file ownership.

## Reviewer Class: R5

### Complete local forwarding and reasoning profile — mandatory

[same details as in Recommended agent/model class section above]

## Mandatory Reasoning Protocol

1. Build a dependency map from the pipeline steps to the underlying command classes, foundation services, and runtime actions.
2. Verify prerequisite packs are accepted. Run `nvb build` and `nvb test` independently.
3. Execute every pipeline step independently. Do not trust the implementation report — re-run every command.
4. Enumerate public invariants, invalid states, failure precedence, compatibility constraints, and deliberately unsupported behavior.
5. Use counterexamples: identify at least one plausible defect that the implementation report might have missed — such as a symlink resolution bug that makes `bin/` links appear copied, a JSON output field missing from the schema, or a negative case that passes when it should fail.
6. Treat the implementation report as a lead, not proof.

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

## Your Review Mission

Perform an independent review of REL-01's implementation. You are the reviewer, not a second implementer.

### Review Pass 1 — Prerequisites

1. Verify packs 1–5 are all independently accepted. Read their trackers. Run `nvb build` and `nvb test`.
2. Verify `hello` is gone: `src/commands/HelloCommand.ts`, `help/commands/hello.hlp.json`, any hello spec.
3. Record the baseline commit hash and current git status.

### Review Pass 2 — Global Install

1. Run `nvb dist` and verify exit code.
2. List `dist/` contents. Verify every required directory exists.
3. For a sample of managed assets in `dist/runtime/manifest.json`, compute actual SHA-256 and compare.
4. Run `npm install -g ./dist`. Verify exit code.
5. Run `wt --version`. Verify exit 0 and correct version.
6. Run `wt help`. Verify no `hello` command listed.

### Review Pass 3 — Init Trial

1. Independently create a valid implementation pack fixture (or reuse the REL-01 fixture).
2. Run `wt init` with the fixture. Verify exit 0.
3. Inspect `.watchtower/lanes/<slug>/lane.json`. Verify every required field.
4. Inspect `.watchtower/lanes/<slug>/install.json`. Verify `cliVersion`, `runtimeVersion`, `knowledgeVersion`, `mode`.
5. Inspect `.watchtower/lanes/<slug>/repositories.local.json`. Verify binding matches.
6. Run `ls -la .watchtower/lanes/<slug>/bin/`. Verify every entry is a symlink to the XDG runtime store, NOT a copied regular file.
7. Verify no runtime tree was copied by comparing the `bin/` link targets against `~/.local/share/watchtower/runtimes/`.

### Review Pass 4 — Init Refusal

Independently attempt each negative case:
1. Unaccepted pack → refusal with diagnostic referencing acceptance.
2. Unsealed pack → refusal with diagnostic referencing seal.
3. Uncommitted sealed file → refusal.
4. Critically drifted pack → refusal.
5. Existing lane with same slug → refusal.
6. Missing `.watchtower/` in `.gitignore`, no `--update-gitignore` → preflight failure.

### Review Pass 5 — Discovery, Status, Watch

1. From control home root: `wt list` shows the lane.
2. From descendant: `wt list` shows the lane.
3. From lane directory: `wt list` shows the lane.
4. From unrelated directory: `wt list` shows empty or no error.
5. Run `wt status --json`. Validate against `docs/spec/schemas/v1.schema.json`.
6. Run `wt watch` with `timeout 5`. Verify heartbeats on stdout. Verify clean exit.

### Review Pass 6 — Cycle, Sessions, Doctor, Upgrade

1. Trace the implementer→reviewer→accept cycle through coordinator journals.
2. Run operator session create → ask → hold → release → close.
3. Run `wt doctor` healthy, then break a check, re-run, verify fail/warn.
4. Run `wt upgrade` preview, `wt upgrade --apply`, verify managed-path-only changes, verify session history preserved, verify downgrade refusal.

### Review Pass 7 — Evidence Packet

1. Read the release evidence packet. Verify every command is documented with exact invocation and output.
2. Verify no secrets, passwords, tokens, or connection URLs appear.
3. Verify environmental limitations are documented honestly.

### Review Pass 8 — Architecture

1. Verify diff touches only spec files, trackers, and `.local/` reports.
2. Run `nvb check:architecture`. Must exit 0.
3. Verify no prohibited artifacts in git.

## What You Must Not Do

- Do not fix the batch while reviewing unless reassigned as an implementation correction.
- Do not accept a batch where the pipeline cannot be independently reproduced.
- Do not accept a batch where `wt init` copies the runtime tree.
- Do not accept a batch where an init refusal negative case silently passes.
- Do not accept a batch where `wt status --json` fails schema validation.
- Do not trust the implementation report without independent verification.
- Do not commit unless delivering an ACCEPT verdict.

## Verdict, Correction, And Commit Ownership

- On rejection: create `corrections/REL-01-correction-NN.md` with exact defects, evidence, required correction, and proof to rerun.
- On acceptance: synchronize trackers, create the acceptance commit, write the review report to `.local/agent-reports/watchtower-release/reviews/REL-01-fresh-lane-trial-review.md`.
- REL-02 is blocked until REL-01 is accepted.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

Write exactly one review report to:

- `.local/agent-reports/watchtower-release/reviews/REL-01-fresh-lane-trial-review.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

This is the first of four release review batches. After acceptance, the next review batch is REL-02 (concurrent and multi-repository recovery trials). Record the independent proof results, the exact acceptance commit hash, and the synchronized tracker state. The handoff must note that REL-02 review depends on REL-01 acceptance.
