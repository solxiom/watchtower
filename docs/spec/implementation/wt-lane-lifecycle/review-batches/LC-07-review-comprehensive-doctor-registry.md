# Review Batch LC-07 — Comprehensive Doctor Registry

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/LC-07-comprehensive-doctor-registry.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-07-comprehensive-doctor-registry.md`

## Scope Verification

- [ ] `src/foundation/doctor-registry.ts` created with composable diagnostic check definitions, registration mechanism, and grouped execution
- [ ] `src/commands/DoctorCommand.ts` created with lane resolution, check orchestration, grouped rendering, and exit code assignment
- [ ] `help/commands/doctor.hlp.json` created and registered in `help/help.json`
- [ ] All 15 check categories implemented with at least one check each
- [ ] Each check returns `pass`, `warn`, `fail`, or `skip` correctly
- [ ] Doctor is read-only: no repair, rebuild, or migration
- [ ] No filesystem writes during check execution
- [ ] No model use for diagnostic classification
- [ ] No product logic in `src/cli.ts`

## Required Independent Proof

1. **Check inventory audit**: enumerate every registered check. Verify all 15 categories have at least one check. Verify every check ID is unique. Verify every check has a category, description, and run function.
2. **Tool checks**: verify `bash`, `git`, `tmux`, `jq`, `flock`, `rg` detection. Test with tools present (→ pass), optional tools absent (→ warn for jq/flock/rg), mandatory tools absent (→ fail for bash/git/tmux).
3. **Account checks**: verify operator account matching. Test correct account (→ pass), wrong account (→ fail), unconfigured account (→ skip).
4. **Config checks**: test valid `lane.config.env` (→ pass), shell-injected content (→ fail), missing required keys (→ fail). Verify strict parser rejects `$(...)` and backtick injection.
5. **Marker checks**: test valid `lane.json` (→ pass), invalid JSON (→ fail), missing file (→ fail). Same for `install.json` and `repositories.local.json`.
6. **Binding checks**: test valid binding paths (→ pass), missing paths (→ fail), wrong branch (→ fail), worktree mode inconsistency (→ fail). Test membership index: valid entries (→ pass), stale entries (→ warn/fail), missing index (→ fail).
7. **Conflict checks**: test no conflicts (→ pass), shared-write conflict detected (→ fail), tmux prefix overlap (→ fail), path claim overlap (→ fail).
8. **Pack checks**: test complete pack (→ pass), missing `implementation-pack.json` (→ fail), invalid acceptance record (→ fail), mismatched seal (→ fail).
9. **Policy checks**: test complete routing/session policies (→ pass), missing policy file (→ fail), invalid schema (→ fail), incorrect provenance marker (→ fail).
10. **Index checks**: test fresh matching index (→ pass), stale index (→ fail), corrupt index (→ fail), missing index (→ fail).
11. **Permission checks**: test correct permissions (→ pass), world-writable lane file (→ fail), runtime not readable by worker (→ fail). Verify permission checks never change permissions.
12. **Git-ignore checks**: test `.gitignore` present with coverage (→ pass), missing `.gitignore` (→ fail), missing `/.watchtower/` entry (→ fail).
13. **Runtime checks**: test complete runtime (→ pass), missing runtime (→ fail), corrupt checksum (→ fail), missing `bin/` link (→ fail).
14. **Watcher checks**: test watcher running (→ pass liveness), not running (→ warn). Verify doctor does NOT start or stop the watcher.
15. **Read-only proof**: instrument or mock filesystem. Run all checks against a known-good lane fixture. Verify zero write calls (no `writeFile`, `mkdir`, `rename`, `unlink`, `chmod`, `chown`). Verify state directory unchanged (SHA-256 before/after identical).
16. **Summary computation**: test all pass (→ exit 0, summary all-pass), mixed pass+warn (→ exit 0), any fail (→ exit 4). Verify summary counts match check results.
17. **Grouped output**: verify human output organizes checks by category header. Verify checks appear under the correct category.
18. **JSON output**: test `--json` mode. Verify output matches `doctorReport` schema from v1.schema.json `$defs.doctorReport`. Verify `checks` array contains all registered checks with `{id, status}` plus optional `message`/`details`. Verify `summary` object with correct counts. Verify `exitCode` field present and correct.
19. **Verbose mode**: test `--verbose`. Verify `details` included in both human and JSON output. Verify no secret/token leak in verbose output.
20. Run `nvb build` and `nvb test` independently. Confirm focused specs pass.

## Required Reasoning Posture

The reviewer must independently verify every check category. Run the full check
inventory against a known-good fixture and a known-bad fixture. Verify that
every check handles: valid state (→ pass), degraded state (→ warn), invalid
state (→ fail), and not-applicable (→ skip). The read-only guarantee is
paramount — independently verify zero filesystem mutations during check
execution. Do not trust implementation report narrative about completeness;
enumerate every check independently.

## Structural And Module-Size Acceptance

- Verify `doctor-registry.ts` is within the appropriate size band (target ≤300 lines, ceiling 400, given 40+ checks across 15 categories). Consider splitting by category if approaching 400 lines.
- Verify `DoctorCommand.ts` is within the appropriate size band (target ≤160 lines, ceiling 300 — thin command delegating to registry).
- Confirm no `helpers`, `utils`, `common`, or `misc` modules.
- Verify `DoctorCommand` does not implement check logic — it only orchestrates and renders.

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
complete check inventory (every check ID, category, description, expected pass/fail
conditions, actual results), read-only proof evidence, JSON schema validation
results, structural verification results, line-count verification, tracker/roadmap
sync status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- All 15 categories have at least one registered check.
- Every check produces correct status on valid/invalid/warn/skip fixtures.
- Zero filesystem writes during check execution.
- Read-only proof: state directory unchanged.
- Summary computation correct.
- Exit code 0 on pass/warn, exit code 4 on any fail.
- JSON output matches `doctorReport` schema.
- Help fragment registered.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.

## Reject Conditions

- Missing check category.
- Check that silently repairs, rebuilds, or migrates.
- Filesystem write during check execution.
- Model invocation for diagnostic classification.
- Wrong exit code (exit 0 when there are failures).
- JSON output not matching `doctorReport` schema.
- Secret/token leak in verbose output.
- Missing help fragment.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
