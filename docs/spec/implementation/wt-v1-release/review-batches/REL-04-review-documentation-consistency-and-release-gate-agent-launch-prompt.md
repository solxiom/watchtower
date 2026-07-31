# Agent Launch Prompt — Review Batch REL-04

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
- primary: `Claude Sonnet 4.6`, `GPT-5.2`
- good alternatives: `GPT-5.6 Sol` (overqualified, but acceptable)
- acceptable with steering: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, or any fast/low-reasoning configuration untested on documentation audit accuracy
- selection constraint: the agent must load the complete `help/`, `docs/spec/`, and `src/commands/` directories; context requirements are moderate but accuracy requirements are high — a missed discrepancy in the release gate is a false acceptance
- final-authority constraint: the reviewer must independently re-verify every finding by reading the referenced source files; the audit report's conclusions are leads, not accepted facts

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `Claude Sonnet 4.6`, `GPT-5.2`
- good alternatives: `GPT-5.6 Sol` (overqualified but acceptable)
- acceptable with steering: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, or any fast/low-reasoning configuration
- selection constraint: the agent must load the complete help, docs/spec, and commands directories
- final-authority constraint: the reviewer must independently re-verify every finding by reading the referenced source files

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only non-normative examples and may become unavailable or stale. Select a currently available agent that can load the complete brief/spec/source context, inspect and edit the repository with tools, reason across package boundaries, and run the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression work; a fast low-reasoning model is still unsuitable for final acceptance. This review batch is R3 because it is an independent audit verification — cross-reference work across help fragments, spec documents, command source, Git-tracked files, and release evidence reports. The thinking is bounded and procedural, not adversarial or state-machine-intensive. However, accuracy is critical because a missed discrepancy in the release gate is a false acceptance, so a low-reasoning model that skims text is unacceptable.
- If the assigned agent cannot retain the governing context, independently inspect the source, or execute the proof, escalate to a stronger agent. Never reduce the contract to fit a weaker model.

You are assigned **review batch REL-04** — the independent review of the documentation consistency audit and release gate. You must independently re-verify every finding in the audit report by reading the referenced help fragments, command source, spec docs, and Git-tracked files. You must not accept the audit report's conclusions without forming your own judgment.

This is the final review batch of the Watchtower v1 release. If you accept, you create the final release gate commit. There are no batches after REL-04.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. The durable review brief: `REL-04-review-documentation-consistency-and-release-gate.md`.
2. The paired work brief: `REL-04-documentation-consistency-and-release-gate.md`.
3. The governing specs: `docs/spec/v1.md` (entire, especially §10.3 and §17), `docs/spec/v1-contracts.md` (especially §8), `docs/spec/architecture.md` (especially §4.2).
4. The REL-01, REL-02, and REL-03 implementation and review reports for context.
5. The audit report at `.local/agent-reports/watchtower-release/REL-04-documentation-release-gate.md`.
6. The actual `git diff` from the baseline commit. Verify only trackers and `.local/` changed.
7. The complete `help/` directory: `help/help.json` and every `help/commands/*.hlp.json` file.
8. The complete `src/commands/` directory: every command class.
9. The complete `docs/spec/` directory: every normative document.
10. `package.json` and `README.md`.
11. Final git status and file ownership.

## Reasoning / Agent Class

You are operating at reasoning class `R3`. This reflects the audit-only nature of the batch: bounded cross-reference and traceability work across help fragments, spec documents, command source, Git-tracked files, and release evidence reports.

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `Claude Sonnet 4.6`, `GPT-5.2`
- good alternatives: `GPT-5.6 Sol` (overqualified but acceptable)
- acceptable with steering: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, or any fast/low-reasoning configuration
- selection constraint: the agent must load the complete help, docs/spec, and commands directories
- final-authority constraint: the reviewer must independently re-verify every finding by reading the referenced source files

## Mandatory Reasoning Protocol

1. Build a cross-reference map: for each shipped command, identify its command class, help fragment, spec section, and contract section.
2. For each release acceptance criterion, identify the owning batch and evidence location from the tracker and audit report.
3. Read every file being verified. Do not infer correctness from the audit report's conclusions.
4. For every finding in the audit report, open the referenced source file or spec section yourself. Form an independent judgment about whether the finding is correctly classified (BLOCKING vs NON-BLOCKING).
5. Identify at least one criterion or command that the audit report claims is satisfied, and independently verify it is actually satisfied. If the audit missed a discrepancy, record it as a finding against the audit.
6. Do not change help fragments, command classes, or spec docs. This is a review; resolution of findings belongs to the owning prior packs.

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

Perform an independent review of REL-04's audit. You are the reviewer, not a second auditor.

### Review Pass 1 — Prerequisites

1. Verify REL-01, REL-02, and REL-03 are independently accepted. Read their trackers and review reports.
2. Run `nvb build` and `nvb test`. Record results and baseline commit hash.

### Review Pass 2 — Requirement Traceability Verification

1. Independently read the traceability matrix in the audit report. Select a sample of at least 8 of the 32 §17 release acceptance criteria.
2. For each sampled criterion:
   - Read the criterion text in `v1.md §17`.
   - Identify the owning batch from `v1-implementation-map.md` section 9 or the pack trackers.
   - Read the claimed evidence (open the spec file, e2e report, or release evidence packet).
   - Form an independent judgment: is the evidence current, reproducible, and sufficient?
   - If the audit classifies this criterion as `traced` but your reading finds the evidence stale or missing, record a discrepancy.
3. If any criterion has no evidence at all, that is a BLOCKING finding.

### Review Pass 3 — Help Fragment Verification

1. Independently list all shipped commands from `help/help.json` and cross-reference with the command table in `v1.md` §10.3.
2. For a sample of at least 5 commands:
   - Open `help/commands/<command>.hlp.json`. Verify it exists and has a valid structure.
   - Open `src/commands/<Command>Command.ts`. Compare the command's actual options, arguments, and behavior against the help fragment's description.
   - Verify no flags exist in the command class that are missing from the help fragment.
3. Verify `hello` command is not registered in `help/help.json` and `help/commands/hello.hlp.json` does not exist.
4. If the audit report claims a help fragment matches but your reading finds a discrepancy, record it.

### Review Pass 4 — Product Doc Verification

1. Independently read the command table in `v1.md` §10.3. For at least 3 commands, compare the documented syntax/options/behavior against the actual command class in `src/commands/`.
2. Independently read `docs/spec/architecture.md` §4 (logical components). Verify the component descriptions match the current `src/` directory structure. Note any component described that does not exist, or any existing component not described.
3. Independently read `docs/spec/v1-contracts.md` §8 (public command and JSON contract). Verify exit codes and public JSON schemas match the current source.
4. If the audit report claims a doc matches behavior but your reading finds a discrepancy, record it.

### Review Pass 5 — Scaffold Verification

1. Independently search for `hello` string in `src/commands/`, `help/`, and `spec/` (excluding legitimate uses in other contexts).
   ```bash
   test -f src/commands/HelloCommand.ts && echo "BLOCKING: HelloCommand.ts exists" || echo "OK"
   test -f help/commands/hello.hlp.json && echo "BLOCKING: hello.hlp.json exists" || echo "OK"
   ```
2. Verify the scaffold search results from the audit report match your independent search.

### Review Pass 6 — Committed Artifact Verification

1. Independently run:
   ```bash
   git ls-files | grep -E '^(build/|dist/|node_modules/|\.nira/local/|\.watchtower/|\.local/)' || echo "No prohibited artifacts found"
   ```
2. Verify `.gitignore` covers these directories:
   ```bash
   grep -E '(build|dist|node_modules|\.nira/local|\.watchtower|\.local)' .gitignore
   ```
3. If any prohibited artifact is tracked, or `.gitignore` is missing an entry, record as a BLOCKING finding.

### Review Pass 7 — Package Version Verification

1. Read `package.json`. Verify `version` is `1.0.0`. Verify `bin.wt` maps to the correct entry point.
2. Read `README.md` (if present). Verify it accurately describes Watchtower, lists correct install commands, and does not claim unsupported features.

### Review Pass 8 — Finding Classification Verification

1. For every BLOCKING finding in the audit report, independently verify the classification. Open the referenced source file or spec section. Apply the criteria: absence of required evidence, missing help for a shipped command, committed prohibited artifact, scaffold artifact remaining, or a release criterion with no evidence.
2. For every NON-BLOCKING finding, independently verify the classification. A finding is correctly NON-BLOCKING only if it does not prevent release (e.g., minor doc wording discrepancy, a stale but non-misleading claim).
3. If you discover a BLOCKING issue not recorded in the audit report, record it as a new finding.

### Review Pass 9 — Architecture

1. Verify diff touches only trackers and the audit report (`.local/`). No `src/`, `help/`, or `docs/spec/` files changed.
2. Run `nvb check:architecture`. Must exit 0.
3. Verify no prohibited artifacts in git.

### Review Pass 10 — Final Verdict

1. Compile all independent findings. If zero BLOCKING findings exist (both from the audit and from your independent verification), the verdict is ACCEPT.
2. If any BLOCKING finding exists, the verdict is REJECT. Enumerate the unresolved criteria.
3. If ACCEPT: write the proposed release commit message.

## What You Must Not Do

- Do not fix findings while reviewing. Record them and return the batch.
- Do not create or modify any help fragment, spec section, or command source file.
- Do not suppress or downgrade a BLOCKING finding without documented rationale.
- Do not accept a release where a §17 acceptance criterion has no evidence.
- Do not accept a release where a shipped command lacks a help fragment.
- Do not accept a release where a product doc contradicts actual behavior.
- Do not accept a release where `hello` scaffold remains in the committed tree.
- Do not accept a release where a prohibited artifact is committed.
- Do not accept the audit report's conclusions without independently reading the referenced documents.
- Do not commit unless delivering an ACCEPT verdict. If ACCEPT, this is the final release gate commit.

## Acceptance Gate

Accept only if all of the following are true:
- Every §17 release acceptance criterion has a traceable owner and current evidence (confirmed by independent sampling).
- Every shipped command has a registered help fragment matching actual behavior (confirmed by independent sampling).
- Product docs agree with shipped behavior on every sampled command (confirmed by independent reading).
- `hello` scaffold is fully removed from the committed tree.
- No build, dist, node_modules, `.nira/local`, `.watchtower`, or `.local` artifact is committed.
- Package version, bin entry, and README are consistent.
- The audit report correctly identifies all BLOCKING findings (zero false negatives, zero false positives).
- REL-04 did not retroactively create any missing help, spec, or source content.
- `nvb check:architecture` exits 0.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Update the following after completing review:
- `docs/spec/implementation/wt-v1-release/implementation-tracker.md` — mark REL-04 as ✅ accepted or 🟠 correction required.
- `docs/spec/implementation/wt-v1-release/implementation-roadmap.md` — update REL-04 status.
- `docs/spec/implementation/wt-v1-release/review-batches/00-review-batch-index.md` — update REL-04 status.
- `docs/spec/v1-implementation-map.md` — update REL-04 status in the pack 6 table. If this is an acceptance, mark Pack 6 as complete.

## Local Artifact Git Rule

- do not add `.local` artifacts to git

## Non-Negotiable Rules

- The reviewer must independently re-verify every finding by reading the referenced source files. Audit report conclusions are not accepted facts.
- No product features, help fragments, spec sections, or command source files may be created or modified by this review.
- BLOCKING findings prevent release and must be resolved by the owning prior pack, not by REL-04.
- Acceptance commits must include all accepted non-`.local` changes with a descriptive commit message.
- Rejections must produce a numbered correction brief under `corrections/`.
- REL-04 acceptance is the v1 release gate. No batch follows REL-04.

## Rejection Correction Brief Rule

- On rejection, create `corrections/REL-04-correction-NN.md` with exact defects, evidence, required correction, and the specific proof to rerun before re-review.
- Resolution of BLOCKING findings belongs to the owning prior packs, not to REL-04. The correction brief must direct each finding to the appropriate pack.
- Do not resolve findings while reviewing. Record the defect and return the batch.

## Required Independent Proof

- Requirement traceability: independently sampled at least 8 of the 32 §17 criteria, independently read evidence, formed independent judgment. Documented any disagreement.
- Help fragments: independently sampled at least 5 commands, independently compared help fragment against command class. Documented any discrepancy.
- Product docs: independently sampled at least 3 commands from `v1.md` §10.3, independently compared against command class. Independently verified architecture.md component descriptions match current `src/` structure. Independently verified v1-contracts.md exit codes and schemas match source.
- Scaffold: independently verified `hello` removal.
- Committed artifacts: independently run `git ls-files` filter and `.gitignore` verification.
- Package version: independently verified `package.json` version and bin entry.
- Finding classification: independently verified every BLOCKING and NON-BLOCKING finding classification.

## Required Disk Report

Write exactly one review report to:

- `.local/agent-reports/watchtower-release/reviews/REL-04-documentation-release-gate-review.md`

Include: changed-file list, independent traceability verification results with sampled criteria and independent judgment, independent help audit results, independent doc audit results, independent scaffold/artifact/package verification, any finding with severity and requirement reference, final verdict, and (if ACCEPT) proposed release commit message.

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

This is the fourth and final review batch of the Watchtower v1 release. If you accepted REL-04, the Watchtower v1 implementation is complete. Record the independent verification results, the exact acceptance commit hash (the final release gate commit), and the synchronized final tracker state. The final release gate commit marks the completion of the entire 59-batch v1 implementation. There are no batches after REL-04.
