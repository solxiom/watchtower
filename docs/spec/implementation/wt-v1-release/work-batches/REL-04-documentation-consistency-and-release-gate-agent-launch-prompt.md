# Agent Launch Prompt — Work Batch REL-04

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `Claude Sonnet 4.6`, `GPT-5.2`
- good alternatives: `GPT-5.6 Sol` (overqualified, but acceptable)
- acceptable with steering: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, or any fast/low-reasoning configuration untested on documentation audit accuracy
- selection constraint: the agent must load the complete `help/`, `docs/spec/`, and `src/commands/` directories; context requirements are moderate but accuracy requirements are high — a missed discrepancy in the release gate is a false acceptance
- final-authority constraint: a lower-reasoning agent may perform the audit mechanics, but the R4 reviewer must independently re-verify every finding and the final verdict

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `Claude Sonnet 4.6`, `GPT-5.2`
- good alternatives: `GPT-5.6 Sol` (overqualified but acceptable)
- acceptable with steering: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, or any fast/low-reasoning configuration
- selection constraint: the agent must load the complete help, docs/spec, and commands directories
- final-authority constraint: the R4 reviewer must independently re-verify every finding

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only non-normative examples and may become unavailable or stale. Select a currently available agent that can load the complete brief/spec/source context, inspect and edit the repository with tools, reason across package boundaries, and run the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression work; a fast low-reasoning model is still unsuitable for final acceptance. This batch is R3 because it is an audit — comparison and cross-reference work across help fragments, spec documents, command source, Git-tracked files, and release evidence reports. The thinking is bounded and procedural, not adversarial or state-machine-intensive. However, accuracy is critical because a missed discrepancy in the release gate is a false acceptance, so a low-reasoning model that skims text is unacceptable.
- If the assigned agent cannot retain the governing context, independently inspect the source, or execute the proof, escalate to a stronger agent. Never reduce the contract to fit a weaker model.

You are assigned **implementation work batch REL-04** — the documentation consistency audit and release gate. This batch traces every §17 acceptance criterion to evidence, audits help fragments against command behavior, verifies product docs against actual behavior, confirms scaffold and artifact cleanliness, and records the final release verdict.

This is the final batch of the v1 release pack and the final batch of the Watchtower v1 implementation. This batch audits; it does not retroactively create missing content.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/v1.md` — especially §10.3 (command table), §17 (release acceptance criteria).
2. `docs/spec/v1-contracts.md` — especially §8 (public command and JSON contract).
3. `docs/spec/architecture.md` — especially §4.2 (command architecture).
4. `docs/spec/implementation/wt-v1-release/work-batches/REL-04-documentation-consistency-and-release-gate.md` — this batch's work brief.
5. `docs/spec/implementation/wt-v1-release/README.md`, `implementation-quality-and-agent-rules.md`, `implementation-tracker.md`.
6. REL-01, REL-02, and REL-03 implementation reports at `.local/agent-reports/watchtower-release/`.
7. The complete `help/` directory:
   - `help/help.json` — the help registry.
   - Every `help/commands/*.hlp.json` file.
8. The complete `src/commands/` directory — every command class.
9. The complete `docs/spec/` directory — every normative document.
10. `package.json` and `README.md` (if present).

## Reasoning / Agent Class

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `Claude Sonnet 4.6`, `GPT-5.2`
- good alternatives: `GPT-5.6 Sol` (overqualified but acceptable)
- acceptable with steering: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, or any fast/low-reasoning configuration
- selection constraint: the agent must load the complete help, docs/spec, and commands directories
- final-authority constraint: the R4 reviewer must independently re-verify every finding

## Mandatory Reasoning Protocol

1. Build a cross-reference map: for each shipped command, identify its command class, help fragment, spec section, and contract section.
2. For each release acceptance criterion, identify the owning batch and evidence location from the tracker and prior reports.
3. Read every file being audited. Do not infer correctness from filenames or prior summaries.
4. For each discrepancy found, record: the exact file path, line number or section, the expected state (from the spec or command class), and the actual state (from the help fragment or doc).
5. Classify each finding as BLOCKING or NON-BLOCKING using the criteria in the work brief.
6. Do not change help fragments, command classes, or spec docs. The audit records findings; resolution belongs to the owning prior pack.

## Structural Design And Module-Size Gate

- This batch creates one local report file (`.local/`). No committed source files are created beyond tracker updates.
- The audit report may be large. Organize it in clearly labeled sections.

## Your Mission

Audit the assembled product's documentation consistency and produce the final release gate verdict.

### Phase 1 — Requirement Traceability Audit

1. Open `implementation-tracker.md` and review the existing traceability table.
2. For each of the 32 release acceptance criteria in `v1.md §17`:
   - Read the criterion text.
   - Identify the owning batch from the tracker or `v1-implementation-map.md` section 9.
   - Read the relevant evidence: spec file, e2e trial report, or release evidence packet.
   - Determine if the evidence is current, reproducible, and sufficient.
   - Record: criterion number, criterion text summary, owning batch, evidence location, evidence status (`traced`, `stale`, `missing`, `narrative-only`).
3. Produce a traceability matrix table.

### Phase 2 — Help Fragment Audit

1. List all shipped commands from `help/help.json` and `v1.md` §10.3.
2. For each command:
   - Verify `help/commands/<command>.hlp.json` exists.
   - Open the corresponding `src/commands/<Command>Command.ts`.
   - Compare the help fragment's described options, arguments, and behavior against the command class implementation.
   - Note: `hello` is scaffold-only and must NOT exist.
3. Record findings in a table: command, help exists?, flags match?, behavior match?, notes.

### Phase 3 — Product Doc Audit

1. For `docs/spec/v1.md`: for each v1 command, verify the documented syntax, options, and behavior match the current source.
2. For `docs/spec/architecture.md`: verify component descriptions match the current `src/` structure.
3. For `docs/spec/v1-contracts.md`: verify exit codes, JSON schemas, and routing rules match the current source.
4. Record every discrepancy with doc section, expected, actual, and severity.

### Phase 4 — Scaffold Audit

1. Search for remaining `hello` artifacts:
   ```bash
   rg -rn "hello" src/commands/ help/ spec/ --include '*.ts' --include '*.json' --include '*.hlp.json'
   ```
2. Classify each match.
3. Verify specifically:
   ```bash
   test -f src/commands/HelloCommand.ts && echo "BLOCKING: HelloCommand.ts exists" || echo "OK"
   test -f help/commands/hello.hlp.json && echo "BLOCKING: hello.hlp.json exists" || echo "OK"
   ```
4. Record findings.

### Phase 5 — Committed Artifact Audit

1. Run:
   ```bash
   git ls-files | grep -E '^(build/|dist/|node_modules/|\.nira/local/|\.watchtower/|\.local/)' || echo "No prohibited artifacts found"
   ```
2. If any matches exist, record each as BLOCKING.
3. Verify `.gitignore` covers these directories:
   ```bash
   grep -E '(build|dist|node_modules|\.nira/local|\.watchtower|\.local)' .gitignore
   ```

### Phase 6 — Package Version Audit

1. Read `package.json`: verify `version` is `1.0.0`, `bin.wt` maps correctly.
2. Read `README.md` (if present): verify it describes Watchtower accurately, lists correct install commands, and does not claim unsupported features.

### Phase 7 — Release Verdict

Compile all findings into a verdict:
- List all BLOCKING findings with rationale.
- List all NON-BLOCKING findings with rationale.
- If zero BLOCKING findings: `VERDICT: ACCEPT`. The product is qualified for v1 release.
- If any BLOCKING finding exists: `VERDICT: REJECT` with the enumerated unresolved criteria.

### Phase 8 — Audit Report

Write to `.local/agent-reports/watchtower-release/REL-04-documentation-release-gate.md` containing:
- Traceability matrix.
- Help fragment audit results.
- Doc audit findings.
- Scaffold audit results.
- Artifact audit results.
- Package/README audit.
- Final verdict.
- Proposed commit message for acceptance.

## What You Must Not Do

- Do not create, modify, or delete any help fragment file.
- Do not create, modify, or delete any spec document section.
- Do not create, modify, or delete any command source file.
- Do not remove scaffold artifacts — record them as findings.
- Do not suppress or downgrade a finding without documented rationale.
- Do not accept the release if any BLOCKING finding exists.

## Required Proof

- Complete traceability matrix linking every §17 criterion to batch and evidence.
- Complete help audit table covering every shipped command.
- Complete doc audit covering `v1.md`, `architecture.md`, `v1-contracts.md`.
- Scaffold audit confirming `hello` removal or identifying remaining artifacts.
- Artifact audit confirming no prohibited files are tracked.
- Package/README consistency verification.
- Final release verdict.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Update: `implementation-tracker.md`, `implementation-roadmap.md`, `v1-implementation-map.md` (final pack 6 status). Do not change `v1.md` §17 checkboxes — those are updated by the reviewer upon acceptance.

## Local Artifact Git Rule

- do not add `.local` artifacts to git

## Non-Negotiable Rules

- The audit does not create missing content. It records findings.
- BLOCKING findings prevent release and must be resolved by the owning prior pack.
- The implementer records the audit and proposed verdict. The reviewer independently verifies and owns the final acceptance.

## Required Disk Report

Write to: `.local/agent-reports/watchtower-release/REL-04-documentation-release-gate.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

This is the fourth and final release qualification batch. After acceptance, the Watchtower v1 implementation is complete. The reviewer must independently re-verify every finding in the audit report — they must not accept the report's conclusions as facts. The reviewer must read the help fragments, command source, spec docs, and Git-tracked files themselves and form their own judgment about whether the release gate is satisfied. If the reviewer accepts, they create the final release gate commit. There are no batches after REL-04.
