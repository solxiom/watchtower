# Review Batch CA-14 — Coordinator, Event, and Ready-Set Commands

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

- Each command file ≤120 lines (≤160 with justification). Verify physical
  line counts for every command file.
- Help fragments ≤40 lines each.
- No command file exceeds 200 lines.
- No generic helpers or overflow modules in `src/commands/`.

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
