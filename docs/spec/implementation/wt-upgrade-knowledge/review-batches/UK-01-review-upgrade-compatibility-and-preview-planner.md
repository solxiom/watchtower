# UK-01 Review: Upgrade Compatibility And Preview Planner — Review Brief

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

Review batch ID: `UK-01-review`
Reviews work batch: `UK-01` — Upgrade compatibility and preview planner
Reviewer reasoning class: R4 (deep repository reasoning)

## Review Scope

Independently verify that the upgrade compatibility planner correctly classifies
every managed asset and that the preview command never mutates lane state.

## Governing Specs

- `docs/spec/v1.md` — §11.5, §7.5, §6
- `docs/spec/v1-contracts.md` — §3
- `docs/spec/schemas/v1.schema.json` — `upgradePlan`

## Review Items

### 1. Source ownership verification

- [ ] `UpgradePlanner.ts` owns the classification algorithm; `UpgradeCommand.ts` delegates and renders
- [ ] No classification logic or manifest comparison lives in the command class
- [ ] No product logic in `src/cli.ts`
- [ ] Command and planner satisfy the exact structural matrix: command prefers
      at most 120 lines, warns at 121–160, and rejects over 180; foundation
      planner prefers at most 200, warns at 201–260, and rejects over 300.
      Cohesion remains mandatory below every threshold.

### 2. Classification correctness

- [ ] Every managed asset receives exactly one classification
- [ ] `preserved`: path exists in both manifests, SHA-256 identical
- [ ] `changed`: path exists in both, SHA-256 differs
- [ ] `added`: path exists in target only
- [ ] `removed`: path exists in current only
- [ ] `conflict`: managed path has unrecognized regular file on disk

### 3. Schema compatibility

- [ ] Lane schema version checked against target runtime's declared compatible range
- [ ] Knowledge version checked against runtime's compatible range
- [ ] Incompatible schema produces error (not silent skip)
- [ ] Missing version declaration handled safely

### 4. No-mutation invariant

- [ ] Preview writes zero bytes to lane directory
- [ ] Preview does not stage runtimes or modify links
- [ ] `--dry-run` identical to default preview behavior

### 5. Command behavior

- [ ] `wt upgrade` (no args) resolves lane and renders preview
- [ ] `wt upgrade --to=<version>` selects specific target
- [ ] `wt upgrade --apply` is parsed but defers with clear message
- [ ] `wt upgrade --json` outputs schema-valid `upgradePlan`
- [ ] Exit 0 on clean preview; exit 5 on conflicts; exit 4 on missing target; exit 3 on lane not found

### 6. Proof independence

- [ ] Rerun all Jasmine specs independently; compare results with implementation report
- [ ] Verify every classification spec has a counterexample that fails without the implementation
- [ ] Verify no-mutation spec uses a write-tracking mechanism (not narrative)
- [ ] Verify `upgradePlan` JSON output against the schema bundle through the
      accepted RM-02 schema-validation boundary; do not add or bypass it with
      an ad hoc validator dependency

### 7. Documentation and status

- [ ] Implementation report exists and is complete
- [ ] Tracker and roadmap updated to ⏳
- [ ] No `.local/` artifacts staged or committed

## Acceptance Decision

Accept only when:
- All classification outcomes independently verified
- No-mutation invariant independently proven
- Schema compatibility correctly gated
- Ownership structure matches pack rules
- All Jasmine specs pass independently
- `nvb build` passes

If rejected, create `corrections/UK-01-correction-01.md` with exact required fixes.

---
---

# UK-01 Review: Upgrade Compatibility And Preview Planner — Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** R4 — independent verification of cross-manifest comparison
logic, ownership boundaries, and preview-only purity.

**Primary suitability:** A review agent capable of reading multiple manifest
formats, independently reproducing every classification-outcome test, verifying
the no-mutation invariant through test-double inspection, and tracing algorithm
ownership between foundation and command layers.

**Alternatives:** Any R4-capable agent with strong TypeScript reading ability
and test-framework experience. The reviewer must be independent of the
implementation agent.

**Steering-only tools:** Agents that cannot run `nvb build`, `nvb test`, or
validate JSON against a schema are unsuitable.

**Prohibited final-pass classes:** R1, R2, R3 — reviewer must match or exceed
implementor reasoning class (R4).

**Context requirements:** The reviewer needs the complete spec, the UK-01 work
brief, the implementation report, the changed source files, the schema bundle,
and the pack quality rules (especially the 16-item hard-reject checklist).

**Final-authority limits:** The reviewer owns the acceptance decision and the
commit. No other agent may accept this batch.

### Complete forwarding profile — mandatory

- **Class:** R4 (review, matching R4 implementor)
- **Primary models:** any strongest coding agent meeting R4
- **Good alternatives:** any agent with strong code-review, TypeScript, and
  test-verification capability
- **Steering-only tools:** agents that cannot run build/test or validate JSON
  schemas are unsuitable
- **Prohibited final-pass classes:** R1, R2, R3
- **Context retention:** the reviewer must retain all five classification
  outcomes and their counterexample tests
- **Final-authority limits:** reviewer owns acceptance and commit; no other
  agent may accept

## Capability-Based Agent Selection Rule

This review requires R4 reasoning because:

- The classification algorithm has five outcomes with overlapping edge cases
  that require independent verification of every counterexample
- Ownership-boundary verification requires tracing algorithm flow from command
  through foundation services
- The no-mutation invariant requires inspecting the test-double mechanism,
  not just the test result
- Schema validation of `upgradePlan` JSON output requires understanding of
  the schema bundle and version contracts

## Context Assignment

You are the independent reviewer for batch UK-01 (Upgrade compatibility and
preview planner) in the wt-upgrade-knowledge pack. Your role is to independently
verify every claim in the implementation report, reject structural defects
before discussing polish, and own the acceptance decision and commit. You are
not a courtesy reviewer; you are the gate.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/README.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md` — especially the 16-item reviewer hard-reject checklist
6. `docs/spec/v1.md` — §11.5, §7.5, §6
7. `docs/spec/v1-contracts.md` — §3
8. `docs/spec/schemas/v1.schema.json` — `upgradePlan`
9. UK-01 work brief: `work-batches/UK-01-upgrade-compatibility-and-preview-planner.md`
10. UK-01 implementation report: `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md`
11. All changed source files (inspect independently, not via diff summary)
12. All new and changed spec files

## Reasoning / Reviewer Class

- **Class:** R4
- **Primary suitability:** independent verification of five-outcome
  classification, no-mutation invariant, ownership structure, and schema
  compatibility gating
- **Primary models:** any strongest coding agent meeting R4
- **Good alternatives:** any agent with code-review and test-verification
  experience
- **Steering-only tools:** agents that cannot run build/test or validate
  JSON schemas are unsuitable
- **Prohibited final-pass classes:** R1, R2, R3
- **Context retention:** reviewer must retain all classification outcomes
  and invariant requirements
- **Final-authority limits:** reviewer owns acceptance and commit

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

# Agent Launch Prompt — Work Batch RT-05

## Your Review Mission

Independently verify every claim in the UK-01 implementation:

1. Run the 16-item hard-reject checklist first. Stop on any "yes."
2. Independently run every Jasmine spec. Compare pass/fail counts with the
   implementation report.
3. Independently verify the no-mutation invariant: inspect the test double
   mechanism. Is it genuinely write-tracking, or does it just assert no
   error occurred?
4. Validate `upgradePlan` JSON output against the schema bundle using a
   schema validator.
5. Trace the classification algorithm source: is it in `UpgradePlanner.ts`
   or leaked into `UpgradeCommand.ts`?
6. Verify every exit code matches the spec: 0, 2, 3, 4, 5.
7. Verify `--apply` is parsed but not implemented.
8. Verify `nvb build` passes independently.
9. Update tracker and roadmap to ✅ if accepting, or create correction brief
   if rejecting.

## What You Must Not Do

- Trust the implementation report's test results without rerunning
- Accept a batch with a hard-reject checklist violation
- Accept a batch where preview mutates lane state (any filesystem write)
- Accept a batch where classification algorithm lives in the command class
- Accept a batch with missing or narrative-only proof
- Commit `.local/` artifacts
- Mark the batch accepted without independently reproducing all proof

## Required Independent Proof

- Run all Jasmine specs independently; record exact output
- Verify each spec is a genuine test (fails without implementation)
- Verify no-mutation via write-tracking mechanism inspection
- Validate `upgradePlan` JSON against schema bundle
- Verify `nvb build` passes
- Verify `nvb test` (or project equivalent) full suite passes

## Acceptance Gate

The batch is accepted only when ALL of these pass independently:
- [ ] Hard-reject checklist: zero "yes" answers
- [ ] All Jasmine specs pass on independent run
- [ ] No-mutation invariant independently proven
- [ ] `upgradePlan` JSON validates against schema
- [ ] Classification algorithm in foundation module, not command
- [ ] Exit codes match spec
- [ ] `--apply` deferred correctly
- [ ] `nvb build` passes
- [ ] Tracker and roadmap updated
- [ ] Implementation report present and accurate
- [ ] No `.local/` or build artifacts staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

On acceptance: update `implementation-tracker.md` and `implementation-roadmap.md`
to mark UK-01 as ✅. On rejection: create `corrections/UK-01-correction-01.md`.

## Local Artifact Git Rule

Write your independent review report to `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-01-review-upgrade-compatibility-and-preview-planner.md`.
Do not stage or commit `.local/` artifacts.

## Non-Negotiable Rules

- Never commit `dist/`, `build/`, `node_modules/`, `.nira/local/`, `.watchtower/`
- Reviewer owns acceptance and commit; implementor does not commit
- Independent proof is mandatory; implementation report is not evidence
- Hard-reject checklist is a stop/go gate, not advisory

## Rejection Correction Brief Rule

If rejecting, create `corrections/UK-01-correction-01.md` containing:
- Rejection date and reviewer identity
- Each rejection reason with exact source location or proof failure
- Expected corrected state for each reason
- Required additional proof after correction
- Exact files that must change
- Reference to this review report

## Required Disk Report

Write a complete independent review report at `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-01-review-upgrade-compatibility-and-preview-planner.md`
containing: independent test results, no-mutation verification method,
schema validation result, ownership verification, hard-reject checklist
results, and final verdict with reasoning.

## Always plan and make task lists

Before reviewing, produce a task list covering: hard-reject checklist, source
inspection, spec rerun, no-mutation verification, schema validation, ownership
trace, build verification, and report writing.

## Leave a helpful handoff message for the next agent

After completing review, write a concise handoff message summarizing: whether
the batch was accepted or rejected, which findings were significant, what the
next agent (UK-02 reviewer) should watch for, and the acceptance commit hash
if accepted.
