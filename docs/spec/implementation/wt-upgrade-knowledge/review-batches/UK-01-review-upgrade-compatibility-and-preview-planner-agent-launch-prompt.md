# Agent Launch Prompt — Review Batch UK-01

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

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for independent verification of cross-manifest comparison logic, five-outcome classification correctness, ownership-boundary tracing, and preview-only purity proof`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying classification algorithms, ownership
boundaries, and no-mutation invariants through test-double inspection.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, or cross-module
  integration closure evidence.
- The reviewer must match or exceed the implementor's reasoning class (R4).
  R1, R2, R3 are prohibited for final review of this batch.

You are assigned **review batch UK-01** for the Watchtower v1 wt-upgrade-knowledge
delivery lane. You are the independent acceptance authority.

Your role is to independently verify every claim in the UK-01 implementation
report, reject structural defects before discussing polish, and own the
acceptance decision and commit. You are not a courtesy reviewer; you are the
gate.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-upgrade-knowledge/review-batches/UK-01-review-upgrade-compatibility-and-preview-planner.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/review-batches/README.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md` — especially the 16-item reviewer hard-reject checklist
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
6. `docs/spec/implementation/wt-upgrade-knowledge/work-batches/UK-01-upgrade-compatibility-and-preview-planner.md` (paired work brief)
7. `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md` (implementation report)
8. `docs/spec/v1.md` — §11.5, §7.5, §6
9. `docs/spec/v1-contracts.md` — §3
10. `docs/spec/schemas/v1.schema.json` — `upgradePlan`, `mutationResult`
11. the actual changed source files:
    - `src/contracts/upgrade.ts`
    - `src/foundation/UpgradePlanner.ts`
    - `src/commands/UpgradeCommand.ts`
    - `spec/basic/upgrade-preview.spec.ts`

## Reasoning / Reviewer Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for independent verification of five-outcome classification, no-mutation invariant, ownership structure, schema compatibility gating, and exit-code correctness`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the reviewer must match or exceed R4; R1, R2, R3 are prohibited
- final-authority constraint: the reviewer owns the acceptance decision and the commit; no other agent may accept this batch

## Mandatory Reasoning Protocol

Before evaluating the implementation:

1. **Dependency map**: read every module the implementation imports. Verify
   each dependency exists, is in the correct layer (foundation vs. command),
   and its public API supports the usage.
2. **Inspect source**: read the actual changed files, not the diff summary.
   Verify every classification outcome is implemented and tested.
3. **Invariants**: explicitly check: (a) did any test write to the lane
   directory? (b) does any code path write to disk during preview?
   (c) is `--apply` behavior deferred to UK-03?
4. **Counterexamples**: for each spec, verify it would fail on the
   pre-implementation codebase. A spec that passes without the implementation
   is not proof.
5. **Spec disagreements**: if the implementation's classification rules
   contradict the spec's ownership model (§6), the spec wins.
6. **Predecessor reports**: verify the implementation correctly uses the
   APIs documented in LC-03 and RT-02 accepted reports.

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

Independently verify every claim in the UK-01 implementation:

1. Run the 16-item hard-reject checklist first. Stop on any "yes."
2. Independently run every Jasmine spec. Compare pass/fail counts with the
   implementation report. Record exact output.
3. Independently verify the no-mutation invariant: inspect the test double
   mechanism. Is it genuinely write-tracking, or does it just assert no
   error occurred?
4. Validate `upgradePlan` JSON output against the schema bundle using a
   schema validator (`ajv` or equivalent).
5. Trace the classification algorithm source: is it in `UpgradePlanner.ts`
   or leaked into `UpgradeCommand.ts`?
6. Verify every classification outcome independently:
   - `preserved`: path in both manifests, SHA-256 identical
   - `changed`: path in both, SHA-256 differs
   - `added`: path in target only
   - `removed`: path in current only
   - `conflict`: managed path has unrecognized regular file on disk
7. Verify schema compatibility: lane schema vs. target runtime range,
   knowledge version vs. runtime range; incompatible produces error, not skip
8. Verify every exit code matches the spec: 0 (clean), 3 (lane not found),
   4 (missing target), 5 (conflicts)
9. Verify `--apply` is parsed but not implemented; exits with clear message
10. Verify `nvb build` passes independently
11. Verify `nvb test` (or project equivalent) passes independently
12. Update tracker and roadmap to ✅ if accepting, or create correction brief
    if rejecting

## What You Must Not Do

- Trust the implementation report's test results without rerunning
- Accept a batch with a hard-reject checklist violation
- Accept a batch where preview mutates lane state (any filesystem write)
- Accept a batch where classification algorithm lives in the command class
- Accept a batch with missing or narrative-only proof
- Accept a batch where `--apply` is implemented (it must be deferred)
- Commit `.local/` artifacts
- Mark the batch accepted without independently reproducing all proof

## Required Independent Proof

- Run all Jasmine specs independently; record exact output
- Verify each spec is a genuine test (fails without implementation)
- Verify no-mutation via write-tracking mechanism inspection
- Validate `upgradePlan` JSON against schema bundle
- Verify `nvb build` passes
- Verify `nvb test` (or project equivalent) full suite passes
- Verify exit code correctness for all paths (0, 3, 4, 5)
- Verify `git log` shows the implementation agent did not commit

## Acceptance Gate

The batch is accepted only when ALL of these pass independently:
- [ ] Hard-reject checklist: zero "yes" answers
- [ ] All Jasmine specs pass on independent run
- [ ] No-mutation invariant independently proven
- [ ] `upgradePlan` JSON validates against schema
- [ ] Classification algorithm in foundation module, not command
- [ ] Exit codes match spec (0, 3, 4, 5)
- [ ] `--apply` deferred correctly (parsed, not implemented)
- [ ] `nvb build` passes
- [ ] Tracker and roadmap updated to ✅
- [ ] Implementation report present and accurate
- [ ] No `.local/` or build artifacts staged
- [ ] Implementation agent did not commit

## Rejection Correction Brief Rule

If rejecting, create a numbered correction brief in
`review-batches/corrections/UK-01-correction-01.md` containing:

- Rejection date and reviewer identity
- Each rejection reason with exact source location or proof failure
- Expected corrected state for each reason
- Required additional proof after correction
- Exact files that must change
- Reference to this review report

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
- `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`

On acceptance: mark UK-01 as ✅. On rejection: leave as ⏳ and create correction brief.

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- the reviewer is the acceptance authority; independent proof is mandatory
- accept only when all criteria are satisfied
- if rejecting, create a correction brief with exact required fixes
- do not add `.local` artifacts to git
- the reviewer owns the acceptance commit; the implementation agent never commits
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one review report to:

- `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-01-review-upgrade-compatibility-and-preview-planner.md`

Include: documents studied, independent proof reruns and outcomes, structural
verification, no-mutation verification method, schema validation result,
hard-reject checklist results, and final verdict with reasoning.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
UK-01: Upgrade compatibility and preview planner accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, the five classification outcomes verified, the
no-mutation proof method confirmed, any edge cases noted in the implementation
that the UK-02 reviewer should watch for, and the acceptance commit hash if
accepted. Confirm that UK-01's stable APIs (classification types, planner
function) are ready for UK-02 consumption.
