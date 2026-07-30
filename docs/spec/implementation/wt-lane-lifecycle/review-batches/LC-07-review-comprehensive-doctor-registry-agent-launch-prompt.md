# Agent Launch Prompt — Review Batch LC-07

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for diagnostic registry verification, comprehensive check inventory audit, read-only proof, and schema-compliant JSON output validation`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying all 15 diagnostic categories, every check's
behavior, the read-only guarantee, and JSON output schema compliance. The
reviewer must be capable of exhaustive check inventory audit.

You are assigned **review batch LC-07** for the Watchtower v1 wt-lane-lifecycle
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-lane-lifecycle/review-batches/LC-07-review-comprehensive-doctor-registry.md`
2. `docs/spec/implementation/wt-lane-lifecycle/review-batches/README.md`
3. `docs/spec/implementation/wt-lane-lifecycle/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-07-comprehensive-doctor-registry.md` (paired work brief)
5. `.local/agent-reports/wt-lane-lifecycle/LC-07-comprehensive-doctor-registry.md` (implementation report)
6. `docs/spec/v1.md` — §11.7 (doctor command), §7.1 (data-root permissions), §14 (doctor detects missing deps, broken links, unsafe config), §8 (config strict subset)
7. `docs/spec/v1-contracts.md` — §8 (doctor report schema: `doctorReport`)
8. `docs/spec/schemas/v1.schema.json` — `$defs.doctorReport`
9. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
10. the actual changed source files:
     - `src/foundation/doctor-registry.ts`
     - `src/commands/DoctorCommand.ts`
     - `help/commands/doctor.hlp.json`
     - `help/help.json`
     - `spec/foundation/doctor-registry.spec.ts`
     - `spec/commands/DoctorCommand.spec.ts`

## Your Review Mission

Independently verify that the doctor registry is comprehensive, correct,
read-only, and produces schema-compliant output:

1. **Check inventory audit**: enumerate every registered check. Verify all 15 categories are represented. Verify every check ID is unique. Verify every check has a category, description, and run function. Create a table: check ID, category, description, expected behavior on valid fixture, expected behavior on invalid fixture.
2. **Tool checks**: verify `bash`, `git`, `tmux` → fail on absent (mandatory). Verify `jq`, `flock`, `rg` → warn on absent (optional). Verify pass on present.
3. **Account checks**: verify operator account matching (pass on correct, fail on wrong, skip on unconfigured). Verify worker account checks (pass on valid workers, fail on missing/unresolvable).
4. **Config checks**: verify `lane.config.env` parsing (pass on valid, fail on shell injection `$(...)` and backticks). Verify required keys are checked. Verify verbose mode does not leak secrets.
5. **Marker checks**: verify `lane.json`, `install.json`, `repositories.local.json` schema validation (pass on valid, fail on invalid/missing).
6. **Binding checks**: verify path existence, branch existence, worktree mode consistency, and membership index validity. Test each condition independently.
7. **Conflict checks**: verify writable conflict detection, tmux prefix conflict detection, and path claim conflict detection.
8. **Pack checks**: verify pack structure, pack acceptance record, and pack seal (drift detection). Test valid, missing-files, invalid-acceptance, and seal-mismatch.
9. **Policy checks**: verify routing policy (all 15 rules), session policy (all defaults), and provenance markers. Test valid, missing, invalid-schema, and wrong-provenance.
10. **Index checks**: verify pack index freshness, integrity, and schema. Test valid, stale, corrupt, and missing.
11. **Permission checks**: verify runtime permissions (worker readability), lane permissions (operator ownership, no world-writable), and session permissions. Test correct, world-writable, and wrong-owner.
12. **Git-ignore checks**: verify `.gitignore` presence and `/.watchtower/` coverage. Test present+coverage, missing, and missing-entry.
13. **Runtime checks**: verify runtime installed, manifest valid, checksums match, bin links valid, and knowledge installed. Test all-present, missing-runtime, corrupt-checksum, missing-link.
14. **Watcher checks**: verify heartbeat liveness (pass on running, warn on not running). Verify doctor does NOT start or stop the watcher.
15. **Speech checks**: verify speech stack availability (skip if not configured, warn if configured but missing). Never fail on speech.
16. **Read-only proof**: using filesystem mocking or instrumentation, run all checks against a known-good fixture. Verify zero write calls (`writeFile`, `mkdir`, `rename`, `unlink`, `chmod`, `chown`). Verify state directory SHA-256 unchanged before and after.
17. **Summary and exit code**: test all-pass fixture → exit 0, summary all pass. Test mixed pass+warn → exit 0. Test any-fail fixture → exit 4. Verify summary counts match actual check results.
18. **Grouped output**: verify human output groups checks by category. Verify checks appear under the correct category header. Verify no cross-category leakage.
19. **JSON output**: test `--json` mode. Verify output matches `doctorReport` schema. Verify `checks` array contains all checks with `{id, category, description, status}` plus optional `message`/`details`. Verify `summary` object with correct counts. Verify `exitCode` field.
20. **Verbose mode**: verify `--verbose` includes `details` in both human and JSON output. Verify no secret or token leak.
21. **Hard-reject checklist**: run the quality-and-agent-rules reviewer hard-reject checklist. Reject immediately if any item flags.
22. **Build and test**: run `nvb build` and `nvb test` independently. Record exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept if any check category is missing.
- Do not accept if any check performs a filesystem write.
- Do not accept if doctor repairs, rebuilds, or migrates state.
- Do not accept if exit code is wrong for any fixture.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently enumerate every registered check and verify against the 15 categories.
- Independently verify read-only behavior (zero filesystem writes).
- Independently verify exit code behavior for all fixture types.
- Independently verify JSON output against `doctorReport` schema.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All hard-reject checklist items are clear.
- All 15 categories have at least one registered check.
- Every check produces correct status on valid/invalid/warn/skip fixtures.
- Zero filesystem writes during check execution.
- Read-only proof: state directory unchanged.
- Summary computation correct.
- Exit code 0 on pass/warn, exit code 4 on any fail.
- JSON output matches `doctorReport` schema.
- Help fragment registered.
- Build and tests pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/LC-07-correction-01.md` with exact required fixes.
The correction brief must include: rejection reasons with source locations,
expected corrected state, required additional proof, exact files to change,
and reference to this review.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`

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
- `.local/agent-reports/wt-lane-lifecycle/reviews/LC-07-comprehensive-doctor-registry-review.md`

Include: documents studied, independent proof reruns and outcomes, complete
check inventory table (every check ID, category, description, pass/fail
conditions, actual results), read-only proof evidence, JSON schema validation
results, exit code verification, structural verification, acceptance/rejection
decision, final git status, and if accepting, create the acceptance commit with
a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
LC-07: Comprehensive doctor registry accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified check inventory (every check and category),
read-only proof, and any limitations noted. Confirm that LC-08 may now be
reviewed after LC-07 is accepted.
