# Review Batch RM-10 — `list`, `config show`, And `status` Commands

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
Paired work brief: `work-batches/RM-10-list-config-show-and-status-commands.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-10-list-config-show-and-status-commands.md`

## Scope Verification

- [ ] `src/commands/ListCommand.ts`, `src/commands/ConfigShowCommand.ts`, `src/commands/StatusCommand.ts`
- [ ] `help/commands/list.hlp.json`, `help/commands/config-show.hlp.json`, `help/commands/status.hlp.json`
- [ ] Integration specs for all three commands

## Required Independent Proof

1. **Human/JSON parity — list**: Run `wt list` in human mode and `--json` mode. Verify both outputs derive from identical data. Human output must include lane ID, slug, initiative, kind, control home, repository count, lane status, active batch, runtime version, and conflict state. JSON output must validate against `$defs.laneListPage` in `v1.schema.json`.
2. **Human/JSON parity — config show**: Run `wt config show` in human mode and `--json` mode. Verify both outputs derive from identical data. JSON output must validate against `$defs.resolvedConfig` in `v1.schema.json`.
3. **Human/JSON parity — status**: Run `wt status` in human mode and `--json` mode. Verify both outputs derive from identical data. JSON output must validate against `$defs.laneStatus` in `v1.schema.json`. Verify the health field is one of `ok`, `attention`, `complete`, or `invalid`.
4. **Redaction proof**: Set up a config with keys containing `TOKEN`, `SECRET`, `PASSWORD`, `KEY`, or `CREDENTIAL`. Verify values are redacted in both human and JSON output. Confirm redacted keys are identified in JSON output.
5. **Empty fixture**: With no relevant lanes, `wt list` must return an empty array in JSON mode and a clear "no lanes" message in human mode. `wt status` and `wt config show` must return not-found errors (exit code 3).
6. **Single-lane fixture**: With exactly one relevant lane, all three commands succeed and produce correct output.
7. **Ambiguous fixture**: With multiple lanes without disambiguation, all three commands must fail with an ambiguity error (exit code 3) showing candidate lane IDs, slugs, and control homes.
8. **Invalid fixture**: With a lane containing a malformed `lane.json` (missing schemaVersion, bad structure), commands targeting that lane must fail with an invalid error (exit code 2).
9. **Multi-repository fixture**: With a lane bound to multiple repositories, verify `status` displays all bindings (logical ID, local path, branch, access, worktree mode) and `config show` displays resolution sources for each.
10. **Stale-index fixture**: With stale membership-index entries (paths no longer valid), verify `status` reports warnings without repair.
11. **Busy-lock fixture**: With a lock file present in the lane directory, verify `status` reports that a mutation is active without attempting to acquire or remove the lock.
12. **Read-only hash proof**: For each command, compute a SHA-256 hash of the lane directory before and after execution. Verify the hashes are identical (zero bytes written).
13. **Help fragments**: Verify `help/commands/list.hlp.json`, `help/commands/config-show.hlp.json`, and `help/commands/status.hlp.json` are present and registered in `help/help.json`. Run `wt help list`, `wt help config show`, and `wt help status`. Verify output matches command behavior.
14. **No foundation reimplementation**: Audit each command source file. Verify each delegates to foundation services for discovery, selection, parsing, serialization, bindings, conflicts, and observations. No duplicate discovery or path logic must exist in command classes.
15. Run `nvb build` and `nvb test` independently.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. This batch is the integration point
for all nine foundation services. Every fixture class must be independently
reproduced. The read-only hash proof must be recomputed rather than accepted
from the report. Human/JSON parity must be verified by comparing output from
both modes, not by reading the implementation.

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

The review report must include: independently rerun proof commands and outcomes
for all 15 proof items, structural verification results, line-count verification,
read-only hash proof (before/after hashes for each command), human/JSON parity
comparison, tracker/roadmap sync status, and the acceptance or rejection decision.

## Acceptance Gate

The batch is accepted only when:

- All 7 fixture classes pass for all three commands.
- Human and JSON output derive from identical data for every command.
- Redaction works in both output modes for all sensitive key patterns.
- JSON output validates against `v1.schema.json` for each command's schema
  definition.
- The read-only hash proof confirms zero bytes written for every command.
- Help fragments match command behavior and are registered in `help/help.json`.
- No command reimplements foundation logic.
- All hard-reject checklist items are clear.
- `nvb build` and `nvb test` pass independently.
- Tracker and roadmap are updated.
- `docs/spec/v1.md` command status table is updated (list, config show, status
  marked ✅).
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Reject Conditions

- Any fixture class fails for any command.
- Human and JSON output diverge.
- Sensitive keys are not redacted.
- JSON output does not validate against `v1.schema.json`.
- Any command writes bytes to the lane directory.
- A command reimplements foundation logic.
- Help fragments are missing, unregistered, or do not match command behavior.
- Stale tracker/roadmap or `v1.md` status table.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
