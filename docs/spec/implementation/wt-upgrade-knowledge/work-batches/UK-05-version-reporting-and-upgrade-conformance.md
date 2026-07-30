# UK-05: Version Reporting And Upgrade Conformance — Work Brief

Batch ID: `UK-05`
Pack: `wt-upgrade-knowledge` (pack 4 of 6)
Reasoning class: R3 (bounded integration and reporting)
Depends on: UK-03 (atomic upgrade apply) accepted, UK-04 (host knowledge installers) accepted

## Scope

Implement the `wt version` command, comprehensive upgrade integration proof
(two-version coexistence, collision, failed migration), help fragment
registration, and documentation closure.

## Governing Specs

- `docs/spec/v1.md` — §10.3 (`wt version`), §11.10 (version command behavior)
- `docs/spec/v1-contracts.md` — §8 (`versionReport` data definition)
- `docs/spec/schemas/v1.schema.json` — `versionReport`

## Files Owned By This Batch

- `src/commands/VersionCommand.ts` — NEW: version reporting command
- `help/commands/upgrade.hlp.json` — NEW: upgrade command help fragment
- `help/commands/skill-install.hlp.json` — NEW: skill install command help fragment
- `help/commands/version.hlp.json` — NEW: version command help fragment
- `help/help.json` — EXTEND: register new help fragments
- `spec/basic/version-report.spec.ts` — NEW: version reporting specs
- `spec/basic/upgrade-conformance.spec.ts` — NEW: end-to-end upgrade conformance specs

## Version Command Requirements

### `wt version` (no lane selected)

Reports:
- `cliVersion`: from `package.json`
- `runtimeVersion`: highest available in the runtime store; if none staged,
  the version from the packaged runtime manifest
- `knowledgeVersion`: highest available in the knowledge store; if none staged,
  the version from the packaged knowledge manifest
- `schemaVersion`: the current Watchtower lane schema version (1 for v1)

### `wt version --lane=<slug-or-uuid>` (lane selected)

Reports:
- `cliVersion`: from `package.json`
- `runtimeVersion`: from the lane's `install.json` `runtimeVersion` field
- `knowledgeVersion`: from the lane's `install.json` `knowledgeVersion` field
- `schemaVersion`: from the lane's `lane.json` `schemaVersion` field
- `availableRuntimes`: array of runtime versions currently staged and available
- `availableKnowledge`: array of knowledge versions currently staged and available

### JSON output

The `--json` flag produces a `versionReport` matching the schema bundle.
The `availableRuntimes` and `availableKnowledge` fields are present only when
a lane is selected.

### Exit codes

- 0: success
- 3: lane not found
- 1: unexpected I/O error reading manifests

## Implementation Steps

1. **Version command** (`src/commands/VersionCommand.ts`):
   - Extend `BaseCommand`
   - Accept `--lane=<slug-or-uuid>`, `--json`
   - Read CLI version from `package.json` at module load time (constant)
   - When no lane: resolve the staged or packaged runtime/knowledge versions
     via `RuntimeCatalog`
   - When lane: resolve lane via foundation discovery, read `install.json`
     and `lane.json`, and enumerate staged runtime/knowledge versions
   - Render human output: table of version components
   - Render JSON: `versionReport` matching schema
   - All version values must be derived from source files, not hardcoded

2. **Help fragments**:
   - `upgrade.hlp.json`: describe `wt upgrade [--lane=<id>] [--to=<version>] [--apply] [--allow-downgrade] [--json] [--dry-run]`
   - `skill-install.hlp.json`: describe `wt skill install <codex|cursor|claude> [--scope=<scope>] [--replace] [--dry-run] [--json]`
   - `version.hlp.json`: describe `wt version [--lane=<id>] [--json]`
   - Follow existing help fragment patterns in `help/commands/`
   - Register all three fragments in `help/help.json`

3. **Integration proof** (`spec/basic/upgrade-conformance.spec.ts`):
   - **Two-version coexistence fixture**:
     - Stage two different runtime versions in the runtime store
     - `wt version` reports both as available
     - Create a lane bound to version A
     - `wt version --lane=<slug>` reports version A as installed, both as available
     - Bump lane to version B via `wt upgrade --apply --to=<version-b>`
     - `wt version --lane=<slug>` now reports version B as installed
     - Version A is still available and its directory is intact
   - **Collision fixture**:
     - Create a lane with a managed-path file replaced by an unrecognized regular
       file (simulating operator modification)
     - `wt upgrade` preview reports the collision (exit 5)
     - `wt upgrade --apply` refuses due to unmanaged collision (exit 5)
     - No lane mutation occurred; original manifest unchanged
   - **Failed migration fixture**:
     - Simulate a migration step that throws (inject a failing step into the
       registry for testing)
     - `wt upgrade --apply` invokes the migration, migration fails
     - Upgrade stops, staging artifacts cleaned
     - Old manifest remains authoritative
     - Old runtime links still intact and checksums valid
     - `wt version --lane=<slug>` still reports the old runtime version

4. **Proof** (`spec/basic/version-report.spec.ts`):
   - Version report with no lane: correct CLI version from package.json
   - Version report with no lane: correct runtime/knowledge versions
   - Version report with lane: correct installed versions from manifests
   - Version report with lane: available runtimes include staged versions
   - `--json` validates against `versionReport` schema
   - Missing lane exit 3
   - Two-version staged: both reported as available

## Exclusions

- No modification to UK-01 planner, UK-02 migration, UK-03 apply/recovery,
  or UK-04 adapters beyond bug fixes discovered during integration testing
- No `doctor` extension (deferred to `CA-07` or later; UK-05 does not add
  migration health checks)
- No `status` integration beyond what existing `status` command naturally
  derives from lane state

## Required Proof

| Proof class | Evidence |
|-------------|----------|
| Unit tests | Version report with/without lane; CLI version from package.json |
| Integration tests | Two-version coexistence; collision refusal; failed migration recovery |
| Schema validation | `versionReport` JSON validates against schema bundle |
| Help validation | Help fragments registered, rendered via `wt help`, content matches behavior |
| Build | `nvb build` passes |
| Full test | Complete Jasmine suite passes including UK-01 through UK-04 regression |

## Acceptance Gate

- All Jasmine specs pass (including UK-01 through UK-04 regression)
- `nvb build` passes
- `nvb test` (or project equivalent) passes full suite
- Help fragments rendered correctly via `wt help upgrade`, `wt help skill-install`, `wt help version`
- Two-version coexistence fixture passes end-to-end
- Collision fixture demonstrates no mutation during conflict
- Failed migration fixture demonstrates recovery and old-runtime usability
- Version command never returns a hardcoded string not derived from source
- No product logic in `src/cli.ts`

## Implementation Report

Write a durable report at `.local/agent-reports/wt-upgrade-knowledge/UK-05-version-reporting-and-upgrade-conformance.md`

---
---

# UK-05: Version Reporting And Upgrade Conformance — Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** R3 — bounded integration and reporting task with explicit
owners, limited state interaction, and focused proof requirements.

**Primary suitability:** An agent capable of reading multiple manifest files,
constructing a version report, writing help fragments, and creating end-to-end
integration fixtures that exercise the full UK-01→UK-02→UK-03 chain.

**Alternatives:** An R4 agent is the reviewer minimum because independent
verification of end-to-end upgrade fixtures requires reasoning about the
interaction of three foundation modules.

**Steering-only tools:** Agents that cannot read `package.json`, `install.json`,
or `lane.json` and derive version values are unsuitable.

**Prohibited final-pass classes:** R1, R2

**Context requirements:** The agent needs the complete spec (§10.3, §11.10),
the schema bundle for `versionReport`, the accepted UK-01/UK-02/UK-03/UK-04
reports, and the existing help fragment patterns.

**Final-authority limits:** The implementation agent may not commit. The
reviewer owns acceptance.

### Complete forwarding profile — mandatory

- **Class:** R3 (bounded integration and reporting)
- **Primary models:** any coding agent meeting R3
- **Good alternatives:** any agent with TypeScript, manifest-reading, and
  help-fragment creation experience
- **Steering-only tools:** agents that cannot read manifests or render help
  are unsuitable
- **Prohibited final-pass classes:** R1, R2
- **Context retention:** the agent must retain the four version components
  and their source mappings
- **Final-authority limits:** implementation agent does not commit; reviewer
  owns acceptance decision

## Capability-Based Agent Selection Rule

This batch requires R3 reasoning because:

- The version command is a read-only report with four well-defined sources
- Integration fixtures test pre-existing UK-01/UK-02/UK-03 behavior
  end-to-end; the agent is wiring, not designing new algorithms
- Help fragments follow established patterns
- The main risks are: hardcoding a version string, missing an available
  version in the report, or incorrect help text — all detectable by
  focused tests

## Context Assignment

You are agent UK-05 completing the wt-upgrade-knowledge pack with version
reporting and integration conformance. Your work is the integration gate
for all four preceding batches. You wire them together into working
end-to-end commands and prove the whole pack works. You work in the
Watchtower repository at the current working directory.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/README.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md`
6. `docs/spec/implementation/wt-upgrade-knowledge/batch-reasoning-difficulty-ranking.md`
7. `docs/spec/v1.md` — §10.3 (version command), §11.5 (full upgrade apply)
8. `docs/spec/v1-contracts.md` — §8 (`versionReport` data definition)
9. `docs/spec/schemas/v1.schema.json` — `versionReport`
10. Accepted UK-01/UK-02/UK-03/UK-04 reports in `.local/agent-reports/wt-upgrade-knowledge/`
11. Existing help fragments in `help/commands/` for patterns
12. Existing `help/help.json` for registration format

## Reasoning / Agent Class

- **Class:** R3
- **Primary suitability:** read-only version report from four manifest sources;
  help fragment creation following existing patterns; integration fixture wiring
- **Primary models:** any coding agent meeting R3
- **Good alternatives:** any agent with TypeScript, manifest-reading, and
  help-authoring experience
- **Steering-only tools:** agents that cannot read manifests or existing help
  patterns are unsuitable
- **Prohibited final-pass classes:** R1, R2
- **Context requirements:** agent must retain version component sources and
  help fragment format
- **Final-authority limits:** implementation agent does not commit; reviewer
  owns acceptance

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

- `VersionCommand` (command): target 160 lines; scrutinize at 220; hard
  reject above 300
- Help fragments: each typically under 40 lines of JSON
- Integration test module: target 300 lines; split by fixture (version,
  collision, migration) if larger
- Version report test module: target 200 lines

## Your Mission

Complete the pack with version reporting, help, and integration proof:

1. Implement `src/commands/VersionCommand.ts` with all-four-component reporting
2. Create help fragments for `upgrade`, `skill-install`, and `version`
3. Register fragments in `help/help.json`
4. Write version reporting specs and end-to-end upgrade conformance specs
5. Verify all tests pass (`nvb build` + full Jasmine suite)
6. Update `docs/spec/v1.md` §10.3 status markers for upgrade, skill-install,
   and version commands to the appropriate status
7. Write the implementation report

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

## Trackers and Status Docs

After implementation, update:
- `implementation-tracker.md` — mark UK-05 as ⏳ awaiting review
- `implementation-roadmap.md` — mark UK-05 phase status as ⏳
- `docs/spec/v1.md` — update §10.3 status markers for `upgrade`, `skill install`,
  and `version` to reflect implementation state (⏳ if awaiting review)

Do NOT mark anything as ✅ — only the reviewer does that.

## Local Artifact Git Rule

Write your implementation report to `.local/agent-reports/wt-upgrade-knowledge/UK-05-version-reporting-and-upgrade-conformance.md`.
Do not stage or commit `.local/` artifacts.

## Non-Negotiable Rules

- Every version value derived from source files
- Help fragments match implemented behavior exactly
- Integration fixtures test real UK-01→UK-02→UK-03 chain
- No scaffold-only content in help
- Keep commands thin; foundation modules own algorithms
- Match Nirvana CLI patterns — `@nirvana/base/cli`, NVB for build/dist

## Required Disk Report

Write a complete implementation report at `.local/agent-reports/wt-upgrade-knowledge/UK-05-version-reporting-and-upgrade-conformance.md`
containing:

- Files created and modified with before/after line counts
- Exact test commands run and their output
- Integration fixture results
- Help fragment registration verification
- Any open questions or intentional limitations
- A handoff summary for the reviewer

## Always plan and make task lists

Before writing code, produce a task list covering: VersionCommand, help
fragments, help registration, version specs, conformance specs, spec-status
updates, build verification, and report writing.

## Leave a helpful handoff message for the next agent

After completing implementation, write a concise handoff message summarizing:
the version report API, the help fragment locations, the integration
fixture status, known limitations, and the exact command to run the full
test suite.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.
