# Review Batch CA-14 — Coordinator, Event, and Ready-Set Commands

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

Status: ❌ Not started
Paired work batch: CA-14
Reviewer owns the acceptance commit.

## Scope Verification

1. **File ownership:** Verify new command files exist in `src/commands/` with
   the exact names specified. Verify no other command files were added. Verify
   `help/commands/` has one fragment per command. Verify `help/help.json` is
   updated with all new commands.
2. **Dependency direction:** Every command delegates to foundation modules
   (CA-01 through CA-13). No command duplicates foundation logic. No command
   imports from other commands. No foundation module was modified.
3. **Spec compliance:** Every command in `coordinator-automation.md §19` is
   implemented. Command flags, output formats, and behaviors match the CLI
   contract. `--dry-run` and `--json` are supported where specified.
4. **Layer integrity:** `src/cli.ts` contains no new product logic — it
   routes to command classes. Commands are thin hosts; business logic lives
   in foundation.
5. **No alternative paths:** Verify that a mutation (index build, cycle,
   escalate) cannot occur without going through the command → foundation →
   effect-executor path. No hidden mutation shortcuts exist.

## Required Independent Proof

- **Every command with valid args:** Independently run each command with valid
  arguments. Verify correct output for both human and `--json` formats.
- **Every command with invalid args:** Independently test: missing required
  args, invalid class values, unknown event IDs, unknown batch IDs, missing
  indexes, stale indexes. Verify clear error messages and correct exit codes.
- **Dry-run purity:** For `index build`, `cycle`, and `escalate`, independently
  run with `--dry-run`. Verify: no files are written, no tmux commands are
  executed, no Git pushes occur, no models are invoked. Strace or process
  monitor to confirm zero external process spawns.
- **Human/JSON parity:** For every read-only command, independently capture
  human and `--json` output. Verify identical semantic information. Verify
  `--json` output conforms to the RM-02 envelope contract.
- **Help completeness:** Independently run `wt help` and verify every new
  command appears. Run `wt help <command>` for each and verify correct syntax,
  options, and examples.
- **Index commands:** Independently: build an index (verify it exists), run
  `status` (verify freshness and counts), run `verify` (verify integrity
  check passes), run `explain` (verify bounded references without prose
  loading), corrupt an index and verify `verify` detects it.
- **Status command:** Independently verify `status` output includes queue
  state, active cycle (when present), routing aliases, budget state, and
  last outcome.
- **Context command:** Independently run `context` and verify the previewed
  envelope includes the correct fields, size estimates, and permitted proposal
  types. Verify no model is invoked.
- **Explain command:** Independently run `explain` for a completed cycle.
  Verify it shows the routing rule, guard inputs, endpoint, proposal summary,
  and effect outcome.
- **Cycle command:** Independently run `cycle --dry-run` and verify the full
  planned processing path without execution. Verify the output includes the
  routing decision, envelope preview, and effect preview.
- **Escalate command:** Independently run `escalate --dry-run` and verify the
  escalation plan. Verify no session or hold is created.
- **Events commands:** Independently tail events and verify pagination.
  Run `events latest` and verify the correct projection.
- **Ready command:** Independently run `batch ready` and verify correct
  candidates and blocking reasons match the CA-04 projection.
- **Build and test:** Run `nvb build` and `nvb test` independently. Verify
  zero failures.
- **Layer audit:** Verify `src/cli.ts` has not grown materially. Verify no
  command imports from other commands.

## Required Reasoning Posture

The reviewer must independently reason through every command's complete
execution path — from CLI argument parsing through foundation delegation to
output rendering. The reviewer must prove that `--dry-run` truly blocks all
side effects, not just masks them in output. The reviewer must prove that
human and `--json` output share a single data source.

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

1. Independent execution output for every command (human and `--json`).
2. Invalid-argument error output for every command.
3. Dry-run purity evidence (strace/process-monitor logs).
4. Human/JSON parity verification for every read-only command.
5. Help registry completeness verification.
6. `nvb build` and `nvb test` output.
7. Layer audit (`src/cli.ts` diff).

## Acceptance Gate

The batch is accepted only when:
- Every command in `coordinator-automation.md §19` is implemented and working.
- `--dry-run` produces preview without any side effect for every mutating
  command.
- Human and `--json` output contain identical semantic information.
- Every command is in `help/help.json` with a complete help fragment.
- All commands delegate to foundation modules without duplicating logic.
- `nvb build` and `nvb test` pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Reject Conditions

Reject immediately if:
- Any `--dry-run` command produces a side effect (file write, process spawn,
  model invocation).
- Human and `--json` output diverge semantically.
- A command implements business logic that belongs in a foundation module.
- `src/cli.ts` contains new product logic.
- A command is missing from `help/help.json` or has no help fragment.
- Build or tests fail.
- `.local/` artifacts are staged.
- The implementation agent committed.
- Any command file exceeds the structural ceiling without documented reviewer
  acceptance.
