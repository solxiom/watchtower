# Review Batch RM-10 — `list`, `config show`, And `status` Commands

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

- Verify each command class is within the appropriate size band.
- Confirm no command reimplements foundation logic (discovery, selection,
  parsing, serialization, bindings, conflicts, observations).
- Verify each command delegates to the appropriate foundation service.
- Verify help fragments match command behavior exactly.

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
