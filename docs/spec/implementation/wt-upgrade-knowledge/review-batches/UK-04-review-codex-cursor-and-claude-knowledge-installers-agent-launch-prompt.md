# Agent Launch Prompt — Review Batch UK-04

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
    - `src/foundation/host-adapters.ts`
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

1. **Dependency map**: verify that `host-adapters.ts` does not import from
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

- Verify `SkillInstallCommand` line count. Flag if over 220.
- Verify `host-adapters.ts` line count. Flag if over 350 (expected split for
  per-adapter modules).
- Verify test module is split by adapter if over 300 lines.
- Verify no `helpers/`, `utils/`, `common/`, or `misc/` modules were created.

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
