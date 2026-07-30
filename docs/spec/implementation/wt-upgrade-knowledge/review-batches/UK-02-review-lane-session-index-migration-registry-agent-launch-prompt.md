# Agent Launch Prompt — Review Batch UK-02

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
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with highest-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for independent verification of twelve artifact-class preservation proofs, session-index rebuild correctness from source journals, policy-baseline migration integrity, and multi-step chain composition`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with highest-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, all twelve artifact classes with distinct preservation rules, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently performing byte-exact file comparisons, rebuilding
session indexes from source journals, and verifying policy-baseline operator
values survive migration unchanged.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, or cross-module
  integration closure evidence.
- The reviewer must match or exceed the implementor's reasoning class (R5).
  R1, R2, R3, R4 are prohibited for final review of this batch.

You are assigned **review batch UK-02** for the Watchtower v1 wt-upgrade-knowledge
delivery lane. You are the independent acceptance authority.

You must independently verify every preservation claim. A single missed artifact
class or corrupted operator value that passes your review becomes permanent data
loss for the operator. You are the gate.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-upgrade-knowledge/review-batches/UK-02-review-lane-session-index-migration-registry.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/review-batches/README.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md` — especially the 16-item reviewer hard-reject checklist
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
6. `docs/spec/implementation/wt-upgrade-knowledge/work-batches/UK-02-lane-session-index-migration-registry.md` (paired work brief)
7. `.local/agent-reports/wt-upgrade-knowledge/UK-02-lane-session-index-migration-registry.md` (implementation report)
8. `docs/spec/v1.md` — §11.5, §6, §7.3, §7.4, §7.2, §13
9. `docs/spec/v1-contracts.md` — §9, §11
10. `docs/spec/schemas/v1.schema.json`
11. `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md` (accepted UK-01 report)
12. the actual changed source files:
    - `src/foundation/MigrationRegistry.ts`
    - `src/foundation/MigrationSteps.ts`
    - `spec/basic/migration-registry.spec.ts`

## Reasoning / Reviewer Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for independent verification of twelve artifact-class preservation, session-index rebuild truth-equivalence, policy-baseline operator-value integrity, and negative-path isolation (zero runtime, zero closure, zero pruning)`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with highest-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the reviewer must match or exceed R5; R1, R2, R3, R4 are prohibited
- final-authority constraint: the reviewer owns the acceptance decision and the commit; no other agent may accept this batch

## Mandatory Reasoning Protocol

Before evaluating the implementation:

1. **Dependency map**: enumerate all artifact classes and their file paths.
   Verify each is covered by a preservation test. Verify no dependency on
   modules outside `src/foundation/` and `src/contracts/`.
2. **Inspect source**: read every migration step function. Trace each to
   verify it is pure (no subprocess, no network, no session lifecycle call).
   Search for `child_process`, `exec`, `spawn`, `execSync` imports.
3. **Invariants**: verify: (a) `diff` shows zero changes to lane-owned files;
   (b) session-index rebuild output matches independent rebuild;
   (c) no `child_process` import in migrationSteps.ts;
   (d) session lifecycle state unchanged across all steps.
4. **Counterexamples**: for at least three artifact classes, design a
   counterexample that would break preservation (e.g., changing key order in
   JSON, truncating a journal line, re-serializing with different whitespace).
   Verify the test catches it.
5. **Spec disagreements**: if v1.md says preserve "operator values" but the
   implementation re-serializes JSON (potentially changing key order or
   whitespace), flag it as a rejection.
6. **Predecessor reports**: UK-01 accepted report may note the current schema
   version format. Verify migration steps match.

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

Independently verify every preservation claim in the UK-02 implementation:

1. Run the 16-item hard-reject checklist first. Stop on any "yes."
2. Independently run every Jasmine spec. Record exact pass/fail output.
3. For each of the twelve artifact classes, independently verify preservation:
   - `lane.config.env` — byte-identical (use `diff` or `cmp`)
   - `repositories.local.json` — byte-identical, all fields including unknown
   - `lane.json` — only `schemaVersion` may change; all operator fields unchanged
   - `install.json` — only version fields changed; `managedAssets` map intact
   - Operator sessions — all turn text, IDs, lifecycle states preserved
   - Session pins — pin references remain valid; pinned turns exist in journal
   - Scoped holds — identity, scope, expiry, reason preserved
   - Amendment requests — identity and handoff evidence preserved
   - Budget grants — identity, amount, expiry preserved
   - Lane state — lifecycle state, active batch preserved
   - Coordinator journal — all events with original IDs, sequences, timestamps
   - Effect journal — all records preserved
4. Independently rebuild session indexes from source journals. Compare
   byte-for-byte or field-for-field with migration output — must be
   truth-equivalent. Verify no turn is lost.
5. Independently verify policy-baseline operator-set numeric values (limits,
   reserves, profiles, retention) are unchanged after migration. Verify
   schema-version fields are updated correctly.
6. Verify negative paths:
   - Missing intermediate step produces deterministic `MigrationPathNotFound`
   - Zero subprocess spawns during any step (verify no `child_process` imports)
   - Zero session lifecycle changes (open remain open, closed remain closed)
   - No content pruned (all session bytes survive in journal)
7. Verify chain composition: multi-step migration preserves all twelve classes.
8. Verify `nvb build` passes independently.
9. Verify `nvb test` passes independently.
10. Update tracker and roadmap to ✅ if accepting, or create correction brief.

## What You Must Not Do

- Trust the implementation report's preservation claims without independent
  byte comparison
- Accept a batch where any artifact class preservation is unverified
- Accept a batch where migration steps execute runtime actions
- Accept a batch where sessions are closed or content is pruned
- Accept a batch where JSON is re-serialized (potentially changing key order
  or whitespace) when byte-identical preservation is required
- Accept a batch with the hard-reject checklist violated

## Required Independent Proof

- Run all Jasmine specs independently; record output
- Byte-comparison proof for config and bindings (use `diff`, `cmp`, or
  equivalent byte-level utilities)
- Field-level verification for markers, manifests, holds, amendments, grants
- Independent session-index rebuild and comparison with migration output
- Policy-baseline operator-value verification (all numeric values unchanged)
- Negative proof: no runtime execution, no session closure, no content pruning
  (independently confirmed via source inspection and tooling)
- `nvb build` passes
- `nvb test` passes
- Verify `git log` shows the implementation agent did not commit

## Acceptance Gate

The batch is accepted only when ALL pass independently:
- [ ] Hard-reject checklist: zero "yes" answers
- [ ] All Jasmine specs pass on independent run
- [ ] All twelve artifact classes independently verified as preserved
- [ ] Session-index rebuild truth-equivalent to independent rebuild
- [ ] Policy-baseline operator values unchanged
- [ ] No runtime execution, session closure, or content pruning
- [ ] `nvb build` passes
- [ ] `nvb test` passes
- [ ] Tracker and roadmap updated to ✅
- [ ] Implementation report present and accurate
- [ ] No `.local/` or build artifacts staged
- [ ] Implementation agent did not commit

## Rejection Correction Brief Rule

If rejecting, create a numbered correction brief in
`review-batches/corrections/UK-02-correction-01.md` containing:

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

On acceptance: mark UK-02 as ✅. On rejection: leave as ⏳ and create correction brief.

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

- `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-02-review-lane-session-index-migration-registry.md`

Include: documents studied, independent proof reruns and outcomes, per-artifact-class
preservation verification methodology and results (byte-exact where required,
field-level where appropriate), independent session-index rebuild and comparison
results, policy-baseline operator-value verification, negative-path findings, and
final verdict with reasoning.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
UK-02: Lane/session/index migration registry accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, the verified artifact class count (12), the
session-index rebuild verification method, any edge cases or limitations
discovered that the UK-03 reviewer should consider (especially regarding
migration-step purity guarantees), and the acceptance commit hash if accepted.
Confirm that UK-02's migration registry API is stable for UK-03 consumption.
