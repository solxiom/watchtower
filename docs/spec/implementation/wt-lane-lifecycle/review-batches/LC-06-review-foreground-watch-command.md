# Review Batch LC-06 — Foreground Watch Command

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/LC-06-foreground-watch-command.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-06-foreground-watch-command.md`

## Scope Verification

- [ ] `src/commands/WatchCommand.ts` created with lane preflight, runtime invocation context export, watcher exec in foreground
- [ ] `help/commands/watch.hlp.json` created and registered in `help/help.json`
- [ ] Lane validation preflight: `lane.json` exists, `install.json` valid, runtime staged, policies and index present
- [ ] `WT_*` environment variables exported correctly
- [ ] Watcher exec with inherited stdio (no daemonization)
- [ ] Stdout/stderr passthrough
- [ ] Ctrl-C terminates foreground process group
- [ ] Signal forwarding (SIGINT, SIGTERM)
- [ ] Exit code propagation from watcher process
- [ ] No product logic in `src/cli.ts`

## Required Independent Proof

1. **`--lane` and `--workspace` parsing**: verify both flags are parsed correctly with their corresponding values. Verify missing-flag defaults (current directory for workspace, single-lane deduction for lane slug).
2. **`--json` rejection**: run `wt watch --json`. Verify exit code 2 with clear error message. Verify no watcher process is started.
3. **Lane preflight — missing lane**: simulate a missing lane (no `.watchtower/` directory). Verify exit code 3 with clear error.
4. **Lane preflight — missing `lane.json`**: create `.watchtower/lanes/{slug}/` directory without `lane.json`. Verify exit code 3.
5. **Lane preflight — invalid `install.json`**: create lane with malformed `install.json`. Verify exit code 4.
6. **Watcher preflight — runtime not staged**: create valid lane but remove or corrupt runtime staging. Verify exit code 4.
7. **Watcher preflight — missing `routing-policy.json`**: create valid lane but remove the routing policy. Verify exit code 4.
8. **Watcher preflight — stale pack index**: create valid lane but modify a pack file to make the index stale. Verify exit code 4.
9. **Watcher preflight — watcher already running**: simulate an existing watcher lock file or heartbeat. Verify exit code 5 with clear message.
10. **Watcher preflight — missing binary**: create valid lane but remove the watcher shell script. Verify exit code 4.
11. **Watcher preflight — non-executable binary**: create valid lane but chmod -x the watcher script. Verify exit code 4.
12. **Watcher preflight — checksum mismatch**: create valid lane but modify the watcher binary to change its checksum. Verify exit code 4.
13. **`WT_*` environment variables**: instrument or inspect the environment passed to the RuntimeInvoker. Verify all required variables present with correct values. Verify coordinator-only variables are NOT set.
14. **RuntimeInvoker call**: verify the RuntimeInvoker is called with the correct action name, the correct env object (merged with process.env), and `stdio: "inherit"`.
15. **Stdio passthrough**: verify the watcher's stdout and stderr are visible in the terminal (not captured or redirected by the CLI).
16. **Ctrl-C termination**: start the watcher, send SIGINT. Verify the watcher process terminates. Verify no orphaned child processes remain.
17. **Exit code propagation**: start watcher that exits with a specific code. Verify the CLI propagates that exit code.
18. Run `nvb build` and `nvb test` independently. Confirm focused specs pass.
19. Verify `help/commands/watch.hlp.json` is registered in `help/help.json` with correct metadata.

## Required Reasoning Posture

The reviewer must independently verify the preflight matrix and watcher
execution behavior. Test every preflight failure case. Verify that Ctrl-C
cleanly terminates without leaving orphaned processes. Verify that `WT_*`
variables exactly match the runtime invocation contract — no missing variables,
no extra variables, correct values. Verify that the watcher is NOT daemonized
— the CLI must exec and wait, not fork/detach.

## Structural And Module-Size Acceptance

- Verify `WatchCommand.ts` is within the appropriate size band (target ≤160 lines, ceiling 300 — thin command delegating to foundation).
- Confirm no `helpers`, `utils`, `common`, or `misc` modules.
- Verify `WatchCommand` does not implement watcher logic — it only validates and execs.

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
preflight matrix verification (every check, every error code), `WT_*` variable
audit with actual values, watcher exec verification, signal handling proof,
structural verification results, line-count verification, tracker/roadmap sync
status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Every preflight check produces correct exit code.
- `--json` rejected with exit 2.
- `WT_*` variables complete and correct.
- Watcher execs in foreground with inherited stdio.
- Ctrl-C terminates cleanly (no orphans).
- Exit code propagated correctly.
- No daemonization.
- Help fragment registered.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.

## Reject Conditions

- Preflight check bypass (watcher starts with missing/invalid lane).
- Missing `WT_*` variable.
- Incorrect `WT_*` value.
- Daemonization, fork, or detach behavior.
- Orphaned child process after Ctrl-C.
- Exit code not propagated.
- Watcher logic implemented in TypeScript (should be in shell runtime).
- Missing help fragment.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
