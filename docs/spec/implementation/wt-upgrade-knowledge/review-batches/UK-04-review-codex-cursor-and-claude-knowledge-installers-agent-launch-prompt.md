# Agent Launch Prompt — Review Batch UK-04

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
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for independent verification of three bounded host adapters with explicit preview/replace/scope contracts, lane-state-leakage detection, and notification-claim auditing`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, the three-host adapter interface, the five common constraints, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently running adapter specs, searching installed files for
lane-specific patterns, and verifying `--replace` enforcement.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, or cross-module
  integration closure evidence.
- The reviewer must match or exceed the implementor's reasoning class (R3).
  R1 and R2 are prohibited for final review of this batch.

You are assigned **review batch UK-04** for the Watchtower v1 wt-upgrade-knowledge
delivery lane. You are the independent acceptance authority.

You must independently verify that no lane-specific state leaks into installed
skill files and that `--replace` is enforced. A skill file containing a lane
home path that passes your review exposes private operator paths to every host
that reads the skill. You are the gate.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-upgrade-knowledge/review-batches/UK-04-review-codex-cursor-and-claude-knowledge-installers.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/review-batches/README.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md` — especially the 16-item reviewer hard-reject checklist
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
6. `docs/spec/implementation/wt-upgrade-knowledge/work-batches/UK-04-codex-cursor-and-claude-knowledge-installers.md` (paired work brief)
7. `.local/agent-reports/wt-upgrade-knowledge/UK-04-codex-cursor-and-claude-knowledge-installers.md` (implementation report)
8. `docs/spec/v1.md` — §11.8, §11.10
9. `docs/spec/v1-contracts.md` — §6 (adapter contract)
10. `docs/spec/schemas/v1.schema.json` — `mutationResult`
11. the actual changed source files:
    - `src/foundation/HostAdapters.ts`
    - `src/commands/SkillInstallCommand.ts`
    - `spec/basic/skill-install.spec.ts`

## Reasoning / Reviewer Class

- brief-declared reasoning level: `R3`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for independent verification of three bounded host adapters — preview correctness, replace enforcement, version recording, scope filtering, no-lane-state proof, and no-false-claims audit`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the reviewer must match or exceed R3; R1 and R2 are prohibited
- final-authority constraint: the reviewer owns the acceptance decision and the commit; no other agent may accept this batch

## Mandatory Reasoning Protocol

Before evaluating the implementation:

1. **Dependency map**: verify that `hostAdapters.ts` does not import from
   `src/commands/` or from lane-specific foundation modules. Verify the
   knowledge root is resolved via `RuntimeCatalog` or `WATCHTOWER_DATA_HOME`.
2. **Inspect source**: read every adapter implementation. Verify that no
   adapter hardcodes a lane home path, lane ID, or tmux prefix. Verify that
   notification status is always set to `unverified` literal, not derived
   from any runtime check.
3. **Invariants**: (a) preview writes zero bytes; (b) `--replace` is required
   in non-interactive mode; (c) installed skills contain zero lane-specific
   patterns; (d) notification status is always `unverified`;
   (e) `--dry-run` writes zero bytes.
4. **Counterexamples**: what if the destination directory exists with files
   from a different version? What if `--scope=invalid`? What if the knowledge
   root is empty? Verify the tests cover these.
5. **Spec disagreements**: v1-contracts.md §6 says skill install is
   `skill-only` in v1. If any adapter claims `advisory-confirmed` or
   `unattended`, reject.
6. **Predecessor reports**: RT-01 and RT-02 reports describe the knowledge
   pack layout. Verify adapters resolve the knowledge root correctly.

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

Independently verify all three host adapters:

1. Run the 16-item hard-reject checklist first. Stop on any "yes."
2. Independently run all Jasmine specs for all three adapters. Record exact
   pass/fail output.
3. For each adapter (Codex, Cursor, Claude):
   - Independently verify preview output: correct source knowledge location,
     correct destination path, correct scope, correct overwrite list
   - Independently verify `--replace` refused in non-interactive mode (exit 5)
     when destination exists — test with `--json` flag
   - Independently verify successful install with `--replace`: correct files
     copied, version recorded, version readable after install
   - Independently verify `--dry-run` produces zero writes to destination
4. **Critical — lane-state leakage search**: for each adapter, install skills
   with test fixtures, then independently search all installed skill files
   using `grep` or equivalent. Search for:
   - Lane home path patterns (paths containing `.watchtower/lanes/`)
   - Lane UUID patterns (UUID format strings)
   - Tmux prefix patterns (two-character lowercase alphabetic strings used
     as tmux session prefixes)
   - Repository binding paths (paths matching the test lane's repository
     structure)
   Verify zero matches across all three hosts. This is mandatory.
5. Independently verify scope filtering:
   - `--scope=skill-only`: only skill/playbook file installed
   - `--scope=guides-only`: only guidance documents installed
   - Default (no `--scope`): complete knowledge pack installed
6. Independently verify no false notification claims:
   - Every adapter result has `notificationStatus: "unverified"`
   - No code path claims notification is configured or active
   - `--json` output's `mutationResult` does not claim verification
7. Verify error handling: unknown host exit 2, missing knowledge root exit 4,
   existing destination without `--replace` exit 5
8. Validate `mutationResult` JSON against schema bundle
9. Verify `nvb build` passes independently.
10. Verify `nvb test` passes independently.
11. Update tracker and roadmap to ✅ if accepting, or create correction brief.

## What You Must Not Do

- Skip the lane-state-leakage search — this is mandatory
- Trust the implementation report's claim that no lane state is embedded
  without an independent file-content search
- Accept a batch where `--replace` is not enforced in non-interactive mode
- Accept a batch where notification is claimed as verified
- Accept a batch where any adapter fails preview, install, or version recording

## Required Independent Proof

- Run all Jasmine specs independently; record output
- Independent file-content search for lane-specific patterns in all installed
  skill files across all three hosts (methodology must be documented in report)
- Per-adapter: preview correctness, `--replace` enforcement, version recording,
  scope filtering, `--dry-run` zero-write
- `mutationResult` JSON validated against schema bundle
- Error-code verification: exit 2 (unknown host), exit 4 (missing root),
  exit 5 (existing dest without `--replace`)
- `nvb build` passes
- `nvb test` passes
- Verify `git log` shows the implementation agent did not commit

## Acceptance Gate

The batch is accepted only when ALL pass independently:
- [ ] Hard-reject checklist: zero "yes"
- [ ] All specs pass independently for all three hosts
- [ ] No lane-specific state in any installed skill file (independently searched)
- [ ] `--replace` enforced in non-interactive mode (all three hosts)
- [ ] Version recorded and readable after install (all three hosts)
- [ ] Scope filters correct for all three scopes (all three hosts)
- [ ] `--dry-run` zero-write verified (all three hosts)
- [ ] JSON validates against `mutationResult` schema
- [ ] All exit codes correct: 2, 4, 5
- [ ] Notification status always `unverified` (all three hosts)
- [ ] `nvb build` passes
- [ ] `nvb test` passes
- [ ] Tracker and roadmap updated to ✅
- [ ] No `.local/` or build artifacts staged
- [ ] Implementation agent did not commit

## Rejection Correction Brief Rule

If rejecting, create a numbered correction brief in
`review-batches/corrections/UK-04-correction-01.md` containing:

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

On acceptance: mark UK-04 as ✅. On rejection: leave as ⏳ and create correction brief.

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

- `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-04-review-codex-cursor-and-claude-knowledge-installers.md`

Include: documents studied, per-adapter verification results (preview, replace,
version, scope, dry-run for each host), lane-state-leakage search methodology
and full results (search patterns used, files searched, matches found), scope-filter
verification results, notification-status audit, JSON schema validation result,
and final verdict with reasoning.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
UK-04: Codex, Cursor, and Claude knowledge installers accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, the lane-state search methodology used and
results (zero matches confirmed), the per-adapter verification summary
(which hosts passed all checks), any edge cases discovered, the version
recording formats confirmed for each host, and the acceptance commit hash
if accepted. Note any findings that the UK-05 reviewer should consider for
end-to-end testing that includes skill-install interaction.
