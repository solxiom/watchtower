# Review Batch LC-08 — Lifecycle Integration and Scaffold Removal

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/LC-08-lifecycle-integration-and-scaffold-removal.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-08-lifecycle-integration-and-scaffold-removal.md`

## Scope Verification

- [ ] `spec/e2e/lifecycle.spec.ts` created with end-to-end fixture: init→status→watch/doctor→rollback
- [ ] `src/commands/HelloCommand.ts` deleted
- [ ] `help/commands/hello.hlp.json` deleted
- [ ] `spec/commands/HelloCommand.spec.ts` deleted (if present)
- [ ] Hello-related runtime-nvb tasks removed (if present)
- [ ] `src/commands/index.ts` updated — HelloCommand import and registration removed
- [ ] `help/help.json` updated — hello entry removed
- [ ] `help/commands/README.md` updated — hello section removed (if present)
- [ ] Zero hello references in `src/`, `help/`, `spec/`, `runtime-nvb/`
- [ ] `nvb build` passes after scaffold removal
- [ ] All Jasmine suites pass after scaffold removal
- [ ] No product logic in `src/cli.ts`

## Required Independent Proof

1. **End-to-end fixture — init**: run the lifecycle spec. Verify init creates the expected lane directory layout. Verify `lane.json`, `install.json`, and `lane.config.env` are present and valid. Verify all v1.md §7.2 subdirectories exist.
2. **End-to-end fixture — status**: run status on the created lane. Verify output shows the correct lane slug, UUID, initiative, and status.
3. **End-to-end fixture — watch**: start watch in test mode, verify preflight passes and no exit codes 3/4/5. Observe process startup, send SIGINT, verify clean exit. Verify no orphaned processes.
4. **End-to-end fixture — doctor**: run doctor on the created lane. Verify exit code 0 (no failures). Verify at least control-home, tools, config, markers, and permissions checks appear in output with pass status.
5. **Rollback proof — invalid init**: run init with an invalid slug (e.g., `"INVALID!!!"` or too long). Verify non-zero exit code. Verify no `.watchtower/lanes/{invalid-slug}/` directory exists. Verify `.watchtower/` is either absent or contains only valid lane directories.
6. **Rollback proof — missing arg init**: run init with missing required argument (e.g., no slug). Verify non-zero exit code. Verify no residual state.
7. **Rollback proof — partial failure**: if the transaction fails partway through init (simulated), verify rollback. Verify no partial lane directory remains.
8. **Scaffold removal — file audit**: search for `HelloCommand` or any variant in `src/`. Verify zero results.
9. **Scaffold removal — help audit**: search for `hello` in `help/`. Verify zero results (or only historical documentation references).
10. **Scaffold removal — spec audit**: search for `hello` in `spec/`. Verify zero results (or only documentation references).
11. **Scaffold removal — runtime-nvb audit**: search for `hello` in `runtime-nvb/`. Verify zero results.
12. **Scaffold removal — index integrity**: verify `help/help.json` contains no hello entry. Verify `src/commands/index.ts` contains no HelloCommand import or registration.
13. **Build verification**: run `nvb build`. Verify zero errors. Verify no build failures from missing hello module references.
14. **Test verification**: run `nvb test`. Verify all tests pass. Verify no test failures from missing hello test dependencies.
15. **Final audit**: run `grep -ril "hello" src/ help/ spec/ runtime-nvb/`. Verify zero results (excluding this review document and historical spec references in `docs/spec/` that intentionally mention hello scaffold).

## Required Reasoning Posture

The reviewer must independently verify that the end-to-end lifecycle works as a
complete chain. Rerun the fixture from a clean environment. Do not trust the
implementation report's claim that scaffold removal is complete — independently
search for every hello reference. The removal must be exhaustive; a single
remaining `HelloCommand` reference in any code file is grounds for rejection.
Verify that `nvb build` and `nvb test` pass after removal with no workarounds
or suppressed errors.

## Structural And Module-Size Acceptance

- Verify `spec/e2e/lifecycle.spec.ts` is within the appropriate size band (target ≤300 lines given the breadth of scenarios, ceiling 400).
- Confirm no `helpers`, `utils`, `common`, or `misc` modules were created.
- Verify `src/commands/index.ts` still exports all real commands correctly after removal.
- Verify `help/help.json` is valid JSON after removal.
- Verify the e2e spec does not depend on any hello artifacts.

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
end-to-end fixture execution output (init, status, watch, doctor sections),
rollback proof execution output, scaffold removal audit (every deleted file,
every modified reference, zero-hello-reference search results), `nvb build`
output, `nvb test` output, structural verification results, line-count
verification, tracker/roadmap sync status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- End-to-end fixture passes: init→status→watch/doctor chain works.
- Rollback proof: failed init leaves no residual state.
- All hello artifacts deleted.
- Zero hello references in `src/`, `help/`, `spec/`, `runtime-nvb/`.
- `help/help.json` and `src/commands/index.ts` cleaned correctly.
- `nvb build` passes with zero errors.
- `nvb test` passes with zero failures.
- Tracker and roadmap updated — Lane lifecycle pack marked complete or pending only LC-08 review.
- No `.local/` artifacts staged.

## Reject Conditions

- End-to-end fixture fails any step.
- Rollback leaves residual state.
- Any hello artifact remaining in codebase.
- Any `HelloCommand` import or reference remaining.
- `nvb build` failure after removal.
- `nvb test` failure after removal.
- Partial scaffold removal (some files deleted, others remaining).
- Real command or foundation module accidentally removed.
- `help/help.json` or `src/commands/index.ts` missing a real command after edits.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
