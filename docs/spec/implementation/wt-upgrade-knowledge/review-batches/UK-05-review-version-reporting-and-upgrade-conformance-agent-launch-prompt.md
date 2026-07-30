# Agent Launch Prompt — Review Batch UK-05

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for independent reproduction of multi-step integration fixtures exercising three foundation modules end-to-end, full pack regression, help-fragment verification, and documentation consistency audit`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, all four version component sources, all three integration fixture scenarios, governing specs, current source, all five implementation reports, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently reproducing multi-step integration fixtures, running
the complete pack test suite, validating all three JSON output formats against
schemas, and verifying help fragment content against implemented behavior.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, or cross-module
  integration closure evidence.
- The reviewer must be R4 (one level above R3 implementor) because independent
  verification of end-to-end upgrade fixtures requires reasoning about the
  interaction of UK-01, UK-02, and UK-03 modules. R1, R2, R3 are prohibited.

You are assigned **review batch UK-05** for the Watchtower v1 wt-upgrade-knowledge
delivery lane. You are the independent acceptance authority.

This is the pack integration gate. Your acceptance completes the entire
wt-upgrade-knowledge pack. Your rejection of any fixture blocks the entire
wt-upgrade-knowledge delivery. You are the final gate.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-upgrade-knowledge/review-batches/UK-05-review-version-reporting-and-upgrade-conformance.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/review-batches/README.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md` — especially the 16-item reviewer hard-reject checklist
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
6. `docs/spec/implementation/wt-upgrade-knowledge/work-batches/UK-05-version-reporting-and-upgrade-conformance.md` (paired work brief)
7. `.local/agent-reports/wt-upgrade-knowledge/UK-05-version-reporting-and-upgrade-conformance.md` (implementation report)
8. All four preceding UK work briefs (UK-01 through UK-04) for context on module APIs
9. All four preceding UK accepted review reports in `.local/agent-reports/wt-upgrade-knowledge/reviews/`
10. `docs/spec/v1.md` — §10.3, §11.5, §11.8, §11.10
11. `docs/spec/v1-contracts.md` — §8
12. `docs/spec/schemas/v1.schema.json` — `versionReport`, `upgradePlan`, `mutationResult`
13. `docs/spec/v1-implementation-map.md` — §7 (pack 4)
14. the actual changed source files:
    - `src/commands/VersionCommand.ts`
    - `help/commands/upgrade.hlp.json`
    - `help/commands/skill-install.hlp.json`
    - `help/commands/version.hlp.json`
    - `help/help.json`
    - `spec/basic/version-report.spec.ts`
    - `spec/basic/upgrade-conformance.spec.ts`
    - `docs/spec/v1.md` — §10.3 status markers

## Reasoning / Reviewer Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for independent reproduction of two-version coexistence, collision, and failed-migration fixtures; version-component source audit; help-fragment behavior verification; full-pack regression testing; and documentation consistency audit`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the reviewer must be R4 (one level above R3 implementor); R1, R2, R3 are prohibited
- final-authority constraint: the reviewer owns the acceptance decision and the commit; this review completes the pack; no other agent may accept this batch

## Mandatory Reasoning Protocol

Before evaluating the implementation:

1. **Dependency map**: trace every version component source. For `cliVersion`,
   read `package.json` directly. For `runtimeVersion`/`knowledgeVersion`,
   trace the resolution path from `install.json` and from `RuntimeCatalog`.
   Verify no hardcoded string bypass.
2. **Inspect source**: read `VersionCommand.ts` line by line. Verify it
   delegates to foundation services for manifest reading, not implementing
   its own parsing. Read every help fragment; verify each option and argument
   described matches the implemented command class.
3. **Invariants**: (a) no version value is a hardcoded string;
   (b) help fragments describe only implemented behavior; (c) integration
   fixtures exercise the real UK-01→UK-02→UK-03 chain, not stubs;
   (d) UK-01 through UK-04 regression is clean.
4. **Counterexamples**: what if `package.json` is missing? What if a lane
   has no `install.json`? What if no runtime is staged in the data store?
   Verify tests cover these paths.
5. **Spec disagreements**: if the `versionReport` schema differs from
   v1.md §10.3, the schema bundle wins. Verify every required field is
   present in both with-lane and without-lane output.
6. **Predecessor reports**: all five UK implementation reports are in
   `.local/agent-reports/wt-upgrade-knowledge/`. Review them for API
   signatures and known limitations. Verify integration fixtures use the
   exact documented APIs.

## Structural Design And Module-Size Gate

- Verify `VersionCommand` line count. Flag if over 220.
- Verify each help fragment is under 40 lines of JSON.
- Verify integration test module is split by fixture (version, collision,
  migration) if over 300 lines.
- Verify no `helpers/`, `utils/`, `common/`, or `misc/` modules were created.

## Your Review Mission

Independently verify version reporting, upgrade conformance, help fragments,
and documentation closure:

1. Run the 16-item hard-reject checklist first. Stop on any "yes."
2. Independently verify all four version components from source files:
   - Read `package.json` directly; confirm `cliVersion` matches
   - When lane selected: read `install.json` and `lane.json` directly;
     confirm `runtimeVersion`, `knowledgeVersion`, `schemaVersion` match
   - When no lane: resolve staged/packaged runtime and knowledge versions
     independently; confirm reported versions match
   - With lane: confirm `availableRuntimes` and `availableKnowledge` arrays
     are present, non-empty, and correct
   - Verify no version value is hardcoded (search `VersionCommand.ts` for
     string literals that look like version numbers)
3. **Two-version coexistence fixture** — independently reproduce:
   - Stage two different runtime versions in the data store
   - `wt version` reports both as available
   - Create a lane bound to version A
   - `wt version --lane=<slug>` reports A as installed, both as available
   - Upgrade lane to version B (`wt upgrade --apply --to=<version-b>`)
   - `wt version --lane=<slug>` now reports B as installed, both still
     available
   - Verify version A directory remains intact and checksums valid
4. **Collision fixture** — independently reproduce:
   - Create lane, replace a managed-path file with unrecognized content
   - `wt upgrade` preview reports the collision (exit 5)
   - `wt upgrade --apply` refuses with exit 5
   - Byte-compare `install.json` before and after — must be identical
   - Verify old runtime links still intact (checksums match)
5. **Failed migration fixture** — independently reproduce:
   - Simulate a failing migration step (inject into registry for test)
   - `wt upgrade --apply` invokes migration chain, migration fails
   - Upgrade stops; staging artifacts cleaned
   - Byte-compare old `install.json` before and after — must be identical
   - Verify old runtime links intact, checksums valid
   - `wt version --lane=<slug>` still reports old runtime version
6. Independently verify all three help fragments:
   - `wt help upgrade` — correct usage, options (`--lane`, `--to`, `--apply`,
     `--allow-downgrade`, `--json`, `--dry-run`), description matches
     implemented behavior
   - `wt help skill-install` — correct usage, positional `<host>`, options
     (`--scope`, `--replace`, `--dry-run`, `--json`), description correct
   - `wt help version` — correct usage, options (`--lane`, `--json`),
     description correct
   - All three registered in `help/help.json`
   - No scaffold-only content or placeholder text
7. Independently validate JSON output formats against schemas:
   - `wt version --json` → validates against `versionReport` schema
   - `wt upgrade --json` → validates against `upgradePlan` schema
   - `wt upgrade --apply --json` → validates against `mutationResult` schema
8. Run the complete Jasmine suite (all UK-01 through UK-05 specs). Record
   exact pass/fail output. Verify no regression in UK-01–UK-04 specs.
9. Verify `nvb build` passes independently.
10. Audit `docs/spec/v1.md` §10.3: verify status markers for `upgrade`,
    `skill-install`, and `version` are correct (⏳ if awaiting review).
11. Audit `docs/spec/v1-implementation-map.md` §7: verify pack 4 status is
    correct (⏳ if any batch awaiting review).
12. Update tracker, roadmap, and spec markers to ✅ if accepting, or create
    correction brief if rejecting.

## What You Must Not Do

- Trust the implementation report's fixture results without independent
  reproduction
- Accept a batch where any version component is hardcoded
- Accept a batch where a fixture fails but the code is otherwise "correct"
- Accept a batch where help fragments describe behavior not implemented
- Accept a batch with spec-status markers stale or incorrect
- Accept a batch with UK-01–UK-04 regression failures

## Required Independent Proof

- Version report with and without lane: all four components independently
  verified from source files (not just output match)
- Two-version coexistence fixture fully reproduced end-to-end
- Collision fixture: no-mutation verified by byte comparison of `install.json`
  before and after
- Failed-migration fixture: recovery verified, old runtime usable, version
  still reports old runtime
- All three help fragments independently rendered and each claim checked
  against implemented command behavior
- `versionReport`, `upgradePlan`, `mutationResult` JSON independently
  validated against schemas
- Complete Jasmine suite passes (all UK-01 through UK-05 specs)
- `nvb build` passes
- `nvb test` passes
- Verify `git log` shows the implementation agent did not commit

## Acceptance Gate

The batch is accepted only when ALL pass independently:
- [ ] Hard-reject checklist: zero "yes"
- [ ] All version components from source files, not hardcoded
- [ ] Two-version coexistence fixture independently reproduced
- [ ] Collision fixture independently reproduced; no mutation confirmed
- [ ] Failed-migration fixture independently reproduced; recovery confirmed
- [ ] All three help fragments correct and match implemented behavior
- [ ] All three JSON output formats validate against schemas
- [ ] Full Jasmine suite passes (UK-01 through UK-05, no regressions)
- [ ] `nvb build` passes
- [ ] `nvb test` passes
- [ ] `docs/spec/v1.md` §10.3 status markers updated to ✅
- [ ] `docs/spec/v1-implementation-map.md` §7 pack status updated to ✅
- [ ] Tracker and roadmap updated to ✅
- [ ] No `.local/` or build artifacts staged
- [ ] Implementation agent did not commit

## Rejection Correction Brief Rule

If rejecting, create a numbered correction brief in
`review-batches/corrections/UK-05-correction-01.md` containing:

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
- `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md` — mark UK-05 as ✅ on acceptance
- `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md` — mark UK-05 phase as ✅ on acceptance
- `docs/spec/v1.md` — update §10.3 status markers for `upgrade`, `skill-install`,
  and `version` to ✅ on acceptance
- `docs/spec/v1-implementation-map.md` — update §7 pack 4 status to ✅ on acceptance

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

- `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-05-review-version-reporting-and-upgrade-conformance.md`

Include: documents studied, version-component verification (all four sources
independently confirmed), all three integration fixture results (two-version
coexistence, collision, failed migration — each independently reproduced with
exact commands and outputs), help-fragment verification (all three rendered,
each claim checked), JSON schema validation results (all three formats),
full test-suite output (complete Jasmine pass/fail including regression),
spec-status audit results, and final pack-completion verdict with reasoning.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
UK-05: Version reporting and upgrade conformance accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Pack Completion Handoff

If accepting, the report must also serve as the pack completion handoff:

- Summarize the pack's delivered capabilities (upgrade preview/apply, migration
  registry, crash recovery, downgrade guard, host adapters, version reporting)
- List any known limitations or deferred items (no unattended operation,
  no `doctor` integration for upgrade health, `--apply` parsed in UK-01 but
  implemented in UK-03)
- Note the acceptance commits for all five batches (UK-01 through UK-05)
- Confirm the pack exit product: operators can preview and apply compatible
  managed upgrades, migrate lane data across schema versions with full
  artifact preservation, recover from crashes during upgrade with the old
  runtime still invocable, install matching knowledge adapters without
  overwriting lane-owned data or embedding lane-specific state, and report
  version across all four component sources

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next reviewer

This review completes the wt-upgrade-knowledge pack. Record: the pack
completion status, the acceptance commit hash for UK-05, the cumulative
verification across all five batches, any remaining pack-level limitations,
and confirmation that the wt-coordinator-automation pack (pack 5) can begin
depending on the stable UK-01/UK-02/UK-03/UK-04 APIs for upgrade operations
within coordinator automation.
