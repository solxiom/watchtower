# Review Batch LC-08 — Lifecycle Integration and Scaffold Removal

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
