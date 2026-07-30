# Review Batch LC-06 — Foreground Watch Command

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/LC-06-foreground-watch-command.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-06-foreground-watch-command.md`

## Scope Verification

- [ ] `src/commands/WatchCommand.ts` is a thin front door delegating to
      `src/foundation/ForegroundWatcher.ts`
- [ ] `ForegroundWatcher` owns preflight, catalog/profile entrypoint
      resolution, explicit environment construction, and foreground lifecycle
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
10. **Watcher preflight — missing entrypoint**: create a valid lane but remove
    the manifest-declared watcher entrypoint. Verify exit code 4.
11. **Watcher preflight — non-executable entrypoint**: remove execute
    permission from the manifest-declared watcher entrypoint. Verify exit code 4.
12. **Watcher preflight — checksum mismatch**: create valid lane but modify the watcher binary to change its checksum. Verify exit code 4.
13. **`WT_*` environment variables**: instrument the environment passed through
    the RT-05 foreground boundary. Verify all required variables are present
    with canonical values, coordinator-only variables are absent, parent
    sentinel secrets are absent, and diagnostics reveal no environment values.
14. **Foreground boundary call**: verify `ForegroundWatcher` selects the exact
    catalog/profile watcher action, checksum-verified entrypoint, explicit
    environment allowlist, and inherited stdio. Verify it uses
    `LaneTaskRunner` only when RT-05 evidence proves the required foreground
    stdin/signal semantics; otherwise verify the documented narrow central
    adapter path and bounded NVB sub-operations.
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

# Agent Launch Prompt — Work Batch RT-05

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
- Watcher-loop logic duplicated in `WatchCommand`/`ForegroundWatcher` instead
  of remaining in the manifest-selected packaged implementation, or a retained
  workflow-level shell lacks RT-01 temporary-wrapper classification.
- Missing help fragment.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
