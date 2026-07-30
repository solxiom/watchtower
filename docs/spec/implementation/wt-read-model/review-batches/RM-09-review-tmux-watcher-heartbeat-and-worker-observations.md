# Review Batch RM-09 — Tmux, Watcher, Heartbeat, And Worker Observations

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
Reasoning: `R3`
Paired work brief: `work-batches/RM-09-tmux-watcher-heartbeat-and-worker-observations.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-09-tmux-watcher-heartbeat-and-worker-observations.md`

## Scope Verification

- [ ] `src/foundation/runtimeObservations.ts` with tmux, watcher, and worker qualified-name reading
- [ ] `src/foundation/NirvanaTmuxObserver.ts` is the sole read-only tmux
      execution owner and uses the pinned Nirvana command facade
- [ ] `src/foundation/heartbeatObservation.ts` with heartbeat staleness detection

## Required Independent Proof

1. **Tmux session reading**: Verify qualified tmux session names are read
   through the injected Nirvana command port using fixed argv
   `tmux list-sessions -F '#{session_name}'`. Assert cwd, environment,
   timeout, and output bounds; prove no shell/direct child-process path. Verify
   zero, one, and multiple sessions.
2. **Qualified-name identity**: Verify only a fully constructed exact session
   name matches. Prefix-only, adjacent-lane, case-variant, and
   Unicode-confusable names must not match.
3. **Heartbeat — fresh**: Create a heartbeat file with a timestamp within the configured threshold. Verify classification is `fresh`.
4. **Heartbeat — stale**: Create a heartbeat file with a timestamp exceeding the configured threshold. Verify classification is `stale` and the staleness reason includes the last heartbeat time.
5. **Heartbeat — absent**: Verify that when no heartbeat file exists, classification is `absent`.
6. **Heartbeat — configurable threshold**: Verify the staleness threshold is configurable. Test with a short threshold (e.g., 5 seconds) and a long threshold (e.g., 300 seconds) and confirm classification changes accordingly.
7. **Worker-event reading**: From a parsed JSONL stream (consuming the RM-05 parser), verify the latest valid worker event per role (implementer, reviewer) is surfaced correctly.
8. **No-mutation proof**: After running every observation function, verify that no state files are written, no event cursors are advanced, and no heartbeat files are created or modified. Compute a directory hash before and after all observations.
9. **Presence not authority**: Verify that no observation function infers lifecycle status, worker health, or automation decisions from presence data. Observations expose raw facts only.
10. Run `nvb build` and `nvb test` independently.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. Inspect every observation function
independently. Verify the Nirvana command port is injectable for tests. Confirm
no state mutation occurs during any observation. Verify heartbeat classification
is based solely on timestamps and the configured threshold.

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
structural verification results, line-count verification, no-mutation proof
(before/after directory hash), tracker/roadmap sync status, and the acceptance
or rejection decision.

## Acceptance Gate

- Tmux session reading returns correct qualified session names.
- Heartbeat classification correctly handles fresh, stale, and absent states.
- Heartbeat staleness threshold is configurable.
- Worker-event reading consumes the RM-05 parser correctly.
- No state files written, cursors advanced, or heartbeat files modified during
  any observation.
- No observation function implies lifecycle authority.
- Build and tests pass independently.

## Reject Conditions

- Any observation function writes state or advances cursors.
- Heartbeat classification is hardcoded rather than configurable.
- Observation function infers lifecycle status from presence data.
- Tmux binary dependency is not mockable for tests.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
