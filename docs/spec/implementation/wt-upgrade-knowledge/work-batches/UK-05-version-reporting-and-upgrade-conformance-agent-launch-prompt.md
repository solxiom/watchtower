# Agent Launch Prompt — Work Batch UK-05

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for read-only version reporting from manifest sources, help fragment creation, and end-to-end integration fixture wiring`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, all four version component sources, all help fragment conventions, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of reading multiple manifest files, constructing a version report,
creating help fragments following existing patterns, and wiring end-to-end
integration fixtures that exercise the full UK-01→UK-02→UK-03 chain.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, or cross-module
  integration closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch UK-05** for the Watchtower v1
wt-upgrade-knowledge delivery lane.

This batch completes the wt-upgrade-knowledge pack with version reporting,
help fragments, and end-to-end integration conformance proof. Your work is the
integration gate — you wire the four preceding batches into working end-to-end
commands and prove the whole pack works.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-upgrade-knowledge/README.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/batch-reasoning-difficulty-ranking.md`
6. `docs/spec/implementation/wt-upgrade-knowledge/work-batches/UK-05-version-reporting-and-upgrade-conformance.md`
7. `docs/spec/v1.md` — §10.3 (`wt version`), §11.5 (full upgrade apply), §11.8 (skill install), §11.10 (version command behavior)
8. `docs/spec/v1-contracts.md` — §8 (`versionReport` data definition)
9. `docs/spec/schemas/v1.schema.json` — `versionReport`, `upgradePlan`, `mutationResult`
10. Accepted UK-01/UK-02/UK-03/UK-04 reports in `.local/agent-reports/wt-upgrade-knowledge/`
11. the canonical source owners you will actually change:
    - `src/commands/VersionCommand.ts` (create)
    - `help/commands/upgrade.hlp.json` (create)
    - `help/commands/skill-install.hlp.json` (create)
    - `help/commands/version.hlp.json` (create)
    - `help/help.json` (extend)
    - `spec/basic/version-report.spec.ts` (create)
    - `spec/basic/upgrade-conformance.spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R3`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for read-only version report from four manifest sources, help fragment creation following existing patterns, and integration fixture wiring exercising pre-existing UK-01/UK-02/UK-03 behavior end-to-end`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain version component sources and help fragment format across the session; if it cannot do so, escalate the agent
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before writing any implementation code:

1. **Dependency map**: identify the four version sources: `package.json` (CLI),
   `install.json` (lane runtime/knowledge), `lane.json` (lane schema),
   packaged runtime/knowledge manifests (available versions). For each,
   determine the exact field path and read the file to verify it exists.
2. **Inspect source**: read existing `help/commands/*.hlp.json` files for
   fragment format conventions. Read `help/help.json` for registration format.
   Read `src/commands/` for existing command patterns (especially `BaseCommand`
   conventions).
3. **Invariants**: state before coding: (a) every version value comes from a
   file read, not a hardcoded string; (b) the help text matches exactly the
   implemented behavior; (c) integration fixtures test the real UK-01→UK-02→
   UK-03 chain, not stubbed versions.
4. **Counterexamples**: what happens if `package.json` is missing? If
   `install.json` has an unrecognized `runtimeVersion` format? If no runtime
   is staged? If the lane's `lane.json` has an unrecognized schema version?
5. **Spec disagreements**: if the `versionReport` schema in the bundle
   disagrees with v1.md §10.3 about available fields, the schema bundle wins
   (v1-contracts.md §1 precedence).
6. **Predecessor reports**: UK-01/UK-02/UK-03/UK-04 reports may note API
   signatures, known limitations, or test commands. Use their actual APIs.

## Structural Design And Module-Size Gate

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- `VersionCommand` (command): target 160 lines; scrutinize at 220; hard
  reject above 300
- Help fragments: each typically under 40 lines of JSON
- Integration test module: target 300 lines; split by fixture (version,
  collision, migration) if larger
- Version report test module: target 200 lines

## Your Mission

Complete the pack with version reporting, help, and integration proof:

1. Implement `src/commands/VersionCommand.ts` with all-four-component reporting:
   - No lane: `cliVersion` from `package.json`, `runtimeVersion`/`knowledgeVersion`
     from staged or packaged manifests, `schemaVersion` from v1 constant
   - With lane: `cliVersion`, `runtimeVersion`/`knowledgeVersion` from
     `install.json`, `schemaVersion` from `lane.json`, plus `availableRuntimes`
     and `availableKnowledge` arrays
   - `--json` outputs `versionReport` matching schema bundle
   - Exit 0 on success; exit 3 on lane not found; exit 1 on unexpected I/O
2. Create help fragments for `upgrade` (`upgrade.hlp.json`), `skill-install`
   (`skill-install.hlp.json`), and `version` (`version.hlp.json`) following
   existing help fragment patterns in `help/commands/`
3. Register all three fragments in `help/help.json`
4. Write version reporting specs covering: with/without lane, `--json`
   validation, missing lane, two-version staged
5. Write end-to-end upgrade conformance specs:
   - Two-version coexistence fixture: stage two runtime versions, verify both
     available, lane bound to version A, upgrade to version B, verify B
     installed and A still available and directory intact
   - Collision fixture: managed-path file replaced with unrecognized content,
     preview reports collision (exit 5), `--apply` refuses (exit 5), no lane
     mutation, original manifest unchanged
   - Failed migration fixture: inject failing step, `--apply` invokes chain,
     migration fails, upgrade stops, staging cleaned, old manifest authoritative,
     old runtime links intact, version still reports old runtime
6. Verify all tests pass (`nvb build` + full Jasmine suite including UK-01
   through UK-04 regression)
7. Update `docs/spec/v1.md` §10.3 status markers for `upgrade`, `skill-install`,
   and `version` to ⏳ (awaiting review)
8. Write the implementation report

## What You Must Not Do

- Hardcode any version string in `VersionCommand.ts`
- Change UK-01/UK-02/UK-03/UK-04 source code unless fixing a bug discovered
  during integration testing (and then only with explicit documentation)
- Add product logic to `src/cli.ts`
- Add help fragments for commands not owned by this pack
- Commit any code

## Required Proof

- `wt version`: CLI version from `package.json`
- `wt version`: runtime/knowledge versions from staged or packaged manifests
- `wt version --lane=<slug>`: installed versions from lane manifests
- `wt version --lane=<slug>`: available runtimes/knowledge listed
- `--json` validates against `versionReport` schema
- Two-version coexistence: stage two runtimes, both reported, lane upgrade
  works, old version still available
- Collision fixture: unmanaged collision detected, upgrade refuses, no mutation
- Failed migration fixture: migration step fails, upgrade stops, old runtime
  still works
- Help fragments rendered correctly via `wt help <command>`
- All Jasmine specs pass including UK-01 through UK-04 regression
- `nvb build` passes
- Final `git status --short`
- Proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md` — mark UK-05 as ⏳ awaiting review
- `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md` — mark UK-05 phase status as ⏳
- `docs/spec/v1.md` — update §10.3 status markers for `upgrade`, `skill-install`,
  and `version` to ⏳

Do NOT mark anything as ✅ — only the reviewer does that.

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- Every version value derived from source files
- Help fragments match implemented behavior exactly
- Integration fixtures test real UK-01→UK-02→UK-03 chain
- No scaffold-only content in help
- Keep commands thin; foundation modules own algorithms
- Match Nirvana CLI patterns — `@nirvana/base/cli`, NVB for build/dist
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-upgrade-knowledge/UK-05-version-reporting-and-upgrade-conformance.md`

The report must include:

- documents studied
- exact files created and modified with before/after line counts
- exact test commands run and their output
- integration fixture results (two-version coexistence, collision, failed migration)
- help fragment registration verification
- any open questions or intentional limitations
- a handoff summary for the reviewer
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the version report API: the four component sources and their field
paths, the `availableRuntimes`/`availableKnowledge` inclusion rules, the
help fragment locations and registration format, the integration fixture
status (two-version coexistence, collision, failed migration), any known
limitations, and the exact command to run the full test suite.
