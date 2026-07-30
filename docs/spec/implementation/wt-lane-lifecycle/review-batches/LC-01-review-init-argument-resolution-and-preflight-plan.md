# Review Batch LC-01 — Init Argument Resolution and Preflight Plan

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
Reasoning: `R5`
Paired work brief: `work-batches/LC-01-init-argument-resolution-and-preflight-plan.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-01-init-argument-resolution-and-preflight-plan.md`

## Scope Verification

- [ ] `src/foundation/InitPlanner.ts` created with preflight plan construction, argument validation, prefix/scope/routing checks
- [ ] `src/commands/InitCommand.ts` created with CLI orchestration, rendering, and dry-run mode
- [ ] Init command parses slug, prefix, scope, and routing arguments correctly
- [ ] No destination creation occurs during preview/dry-run
- [ ] No product logic in `src/cli.ts`
- [ ] No foundation/CLI leakage between layers

## Required Independent Proof

1. Verify all argument combinations: slug with prefix, slug without prefix, scope JSON with valid/invalid shape, routing with valid/invalid values. Every permutation must produce the correct parse result or rejection.
2. Verify slug pattern validation: `^[a-z0-9][a-z0-9-]{0,62}$`. Test boundary lengths (1, 4, 63, 64, 100 characters), uppercase rejection, leading hyphen rejection, empty string rejection.
3. Verify prefix pattern validation: `^[a-z0-9][a-z0-9-]{0,15}$`. Test boundary lengths, character constraints, empty rejection.
4. Verify scope validation: valid JSON objects pass, invalid JSON rejected, missing required fields rejected, unknown fields accepted but warned.
5. Verify routing validation: valid routing values accepted, invalid routing values rejected with clear error message.
6. Verify ambiguous binding rejection: when multiple bindings match, error produced with resolution guidance.
7. Verify missing/invalid impl-pack path: clear error message, no destination directory created.
8. Verify dry-run premise: run `wt init --dry-run` with valid arguments, confirm preflight plan is printed, confirm no `.watchtower/` directory was created, confirm no filesystem writes occurred.
9. Verify exact preflight plan shape matches the contract defined in v1-contracts.md.
10. Run `nvb build` and `nvb test` independently. Confirm focused specs pass.
11. Verify `help/commands/init.hlp.json` exists and is registered in `help/help.json`.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. Inspect every file independently.
Trace every argument path through the parser and planner. Verify that invalid
input always produces rejection without side effects. Verify that dry-run prints
the plan but writes nothing. Check for path escape and shell injection vectors
in all string arguments.

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
structural verification results, line-count verification, tracker/roadmap sync
status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- All argument combinations parse correctly.
- Invalid slug/prefix/scope/routing rejected with clear errors.
- Dry-run produces preflight plan with zero filesystem writes.
- No destination creation during preview.
- `nvb build` and `nvb test` pass with zero failures.
- Help fragment registered in `help/help.json`.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.

## Reject Conditions

- Any argument validation bypass.
- Destination creation during dry-run.
- Path escape or shell injection in argument handling.
- Duplicated validation logic in command layer.
- Missing help fragment.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
