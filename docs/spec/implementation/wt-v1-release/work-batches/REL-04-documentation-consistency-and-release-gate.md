# Batch REL-04 — Documentation Consistency And Release Gate

Status: ❌ Pending
Phase: Release qualification
Depends on: REL-01, REL-02, REL-03 accepted
Work ID: `REL-04`
Governing spec: `docs/spec/v1.md` §17; `docs/spec/v1-contracts.md` §8

**Required implementor reasoning class:** `R3`
**Class rationale:** audit-only batch with bounded traceability and readability work. Every v1 acceptance criterion must be traced to its owning batch and current evidence location. Every shipped command must have a matching help fragment. Product docs must agree with actual behavior on every shipped command. The `hello` scaffold must be removed. No build, dist, or local artifact may be committed. The work is comparison and cross-reference, not implementation or adversarial testing. Reviewer requires R4 for independent cross-document judgment and acceptance-criterion traceability verification.

## Objective

Audit the assembled product's documentation consistency and produce the final release gate verdict. Map every §17 acceptance criterion to its owning batch and current evidence location. Verify every shipped command has a help fragment that matches its actual behavior. Verify product specs agree with shipped behavior. Verify no scaffold, generated, or local artifacts are committed. Record the final release verdict.

This batch does **not** create missing help fragments, spec sections, or documentation. It identifies discrepancies as findings. Resolution of missing artifacts belongs to the owning prior pack.

## Required Work

### Phase 1: Read and understand the product surface

1. `docs/spec/v1.md` §10.3 — the complete v1 command table.
2. `docs/spec/v1.md` §17 — the release acceptance criteria checklist.
3. `docs/spec/v1-contracts.md` §8 — the public command and JSON contract.
4. `docs/spec/architecture.md` §4.2 — command architecture.
5. `help/help.json` — the help registry mapping commands to help fragments.
6. Every `help/commands/*.hlp.json` file.
7. Every `src/commands/*Command.ts` file.
8. The accepted pack 1–5 trackers and implementation reports.
9. The REL-01 through REL-03 evidence reports.

### Phase 2: Requirement traceability audit

Using the traceability table in `implementation-tracker.md` as a starting point:

1. For each of the 32 release acceptance criteria in `v1.md §17`:
   - Identify the owning batch (which pack and work batch created the feature).
   - Identify the current evidence location (spec file, e2e trial report, release evidence packet).
   - Verify the evidence is current (produced by the most recent accepted batch that touches the criterion).
   - Record the traceability result: `traced`, `stale`, `missing`, or `disputed`.
2. Any criterion that cannot be traced to current evidence is a finding. Record the criterion, the expected owning batch, and the nature of the gap.
3. Any criterion whose evidence relies solely on narrative (no repro command or fixture) is a finding. Record it.

### Phase 3: Help fragment audit

1. Extract the list of shipped commands from `help/help.json` and the command table in `v1.md` §10.3.
2. For each shipped command:
   - Verify a help fragment exists in `help/commands/<command>.hlp.json`.
   - Parse the help fragment and verify it describes the actual command behavior:
     - Command name, arguments, options, and flags match the command class in `src/commands/`.
     - Required vs optional arguments are correct.
     - Exit codes are documented where meaningful.
   - Verify no undocumented flags exist (flags present in the command class but not in the help fragment).
3. Identify any help fragment that exists for a command not shipped (preserved scaffold). Record as finding.
4. Identify any shipped command that lacks a help fragment. Record as finding.
5. Verify `hello` command and `help/commands/hello.hlp.json` are removed. Record.

### Phase 4: Product doc audit

1. Read `docs/spec/v1.md` and compare against actual behavior for every v1 command:
   - Command syntax matches.
   - Options and flags match.
   - Exit behavior matches.
   - JSON output schema matches (where applicable).
2. Read `docs/spec/architecture.md` and verify:
   - Component descriptions match the current source tree structure.
   - Flows (read-only, mutation, runtime execution, coordinator cycle, operator session) match the accepted source.
   - No claims about behavior that has changed since the spec was last updated.
3. Read `docs/spec/v1-contracts.md` and verify:
   - Exit code mapping matches the current source.
   - Public JSON schemas match the current output.
   - Routing policy, proposal/effect registry match the accepted coordinator source.
4. Record every discrepancy as a finding with the doc section, expected behavior, actual behavior, and severity.

### Phase 5: Scaffold audit

1. Search the source tree for any remaining `hello` artifacts:
   ```bash
   rg -l "hello" src/ help/ spec/ --include '*.ts' --include '*.json' --include '*.hlp.json'
   ```
   Classify each match: scaffold artifact, legitimate use of "hello" in different context, or false positive.
2. Verify `src/commands/HelloCommand.ts` does not exist.
3. Verify `help/commands/hello.hlp.json` does not exist.
4. Verify `spec/` does not contain a `hello.spec.ts`.
5. Record findings.

### Phase 6: Committed artifact audit

1. List all files tracked by Git:
   ```bash
   git ls-files
   ```
2. Filter for prohibited artifact categories:
   - `build/` directory contents.
   - `dist/` directory contents.
   - `node_modules/` directory contents.
   - `.nira/local/` directory contents.
   - `.watchtower/` directory contents (any committed lane runtime).
   - `.local/` directory contents (agent reports, implementation reports).
   - Any binary file, `.env` file, or generated output file.
3. Any match is a finding. Record the file path and the violation category.
4. Verify `.gitignore` covers `build/`, `dist/`, `node_modules/`, `.nira/local/`, `.watchtower/`, and `.local/`.

### Phase 7: Package version and README consistency

1. Verify `package.json` version is `1.0.0` and matches the release target.
2. Verify the `bin` field in `package.json` maps `wt` to the correct entry point.
3. Read `README.md` (if one exists). Verify it accurately describes:
   - What Watchtower is.
   - How to install it globally.
   - The basic commands.
   - No claims about features that are not shipped in v1.
4. Record discrepancies as findings.

### Phase 8: Release verdict

1. Compile all findings from Phases 2–7 into a single release verdict document.
2. For each finding, classify:
   - `BLOCKING` — prevents v1 release (e.g., committed dist artifact, missing help for a shipped command, a release acceptance criterion with no evidence).
   - `NON-BLOCKING` — should be fixed but does not prevent release (e.g., minor doc wording discrepancy, a stale but non-misleading claim).
3. The final verdict is:
   - `ACCEPT` if zero BLOCKING findings exist.
   - `REJECT` if any BLOCKING finding exists, with the enumerated unresolved criteria.

### Phase 9: Create audit report

Write the complete audit report to `.local/agent-reports/watchtower-release/REL-04-documentation-release-gate.md` containing:

- Requirement traceability matrix with status per criterion.
- Help fragment audit results per command.
- Product doc audit findings per document.
- Scaffold audit results.
- Committed artifact audit results.
- Package version/README findings.
- Final verdict with blocking/non-blocking classification.
- Proposed release commit message.

### Batch REL-04 required proof

- Every §17 release acceptance criterion traced to owning batch and current evidence.
- Every shipped command has a registered help fragment matching actual behavior.
- Product docs agree with shipped behavior on every command.
- `hello` scaffold is fully removed.
- No build, dist, node_modules, `.nira/local`, `.watchtower`, or `.local` artifact is committed.
- Package version, bin entry, and README are consistent.
- Final release verdict is recorded.

## Expected Ownership

- `.local/agent-reports/watchtower-release/REL-04-documentation-release-gate.md` — the complete audit report.
- `docs/spec/implementation/wt-v1-release/implementation-tracker.md` — updated with REL-04 status.
- `docs/spec/implementation/wt-v1-release/implementation-roadmap.md` — updated with REL-04 status.
- `docs/spec/v1-implementation-map.md` — updated with final pack 6 status.
- No new committed source files. This is an audit; it produces a local evidence report.

## Structural Constraints

- This batch creates no new committed source files beyond tracker updates.
- The audit report is a machine-local artifact (`.local/`), not committed.
- Findings must refer to exact file paths, line numbers, and versioned spec sections.

## Reject Conditions

- The batch retroactively creates missing help fragments, spec sections, or documentation.
- A BLOCKING finding is suppressed or downgraded without documented rationale.
- The audit report makes claims about behavior without reproducing or citing evidence.
- The `hello` scaffold remains in the committed tree after this batch.
- A committed artifact from the prohibited categories is left unrecorded.

## Completion And Handoff

This is the final batch of the v1 release pack and the final batch of the Watchtower v1 implementation. The reviewer verifies the audit independently and either accepts (creating the final release gate commit) or rejects with enumerated unresolved criteria. No batch follows REL-04.
