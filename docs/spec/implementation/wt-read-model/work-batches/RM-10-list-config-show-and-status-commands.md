# Batch RM-10 — `list`, `config show`, And `status` Commands

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

Status: ❌ Pending
Phase: Command integration
Depends on: RM-02, RM-06–RM-09 accepted

**Required implementor reasoning class:** `R5`
**Class rationale:** command integration across all nine foundation services with full human/JSON parity, redaction, stable schemas, and 7-class fixture matrix proof. Any missing integration path silently produces wrong output or hidden writes.

## Objective

Implement three read-only commands with human/JSON parity, redaction, stable
status schema. Full read-only hash proof.

## Required Work

1. Create `src/commands/ListCommand.ts`: `wt list` command. Resolve workspace,
   discover lanes, render as human table or JSON array (including empty array
   for no lanes). Display lane ID, slug, initiative, kind, control home,
   repository count, lane status, active batch, runtime version, conflict state.
2. Create `src/commands/ConfigShowCommand.ts`: `wt config show` command. Resolve
   lane, display resolution sources, control home, identity, repositories,
   lane paths, strict-parsed config, runtime/knowledge locations. Redact values
   whose keys contain `TOKEN`, `SECRET`, `PASSWORD`, `KEY`, or `CREDENTIAL`.
3. Create `src/commands/StatusCommand.ts`: `wt status` command. Resolve lane,
   display all status fields per v1.md §11.3 and the stable `laneStatus` JSON
   schema. Derive health label (`ok`, `attention`, `complete`, `invalid`).
4. Create help fragments: `help/commands/list.hlp.json`,
   `help/commands/config-show.hlp.json`, `help/commands/status.hlp.json`.
5. Write complete integration specs: human/JSON parity, redaction verification,
   stable schema validation, 7-class fixture matrix (empty, single-lane,
   ambiguous, invalid, multi-repository, stale-index, busy-lock), read-only
   hash proof (zero bytes written).

## Expected Ownership

- `src/commands/ListCommand.ts`, `src/commands/ConfigShowCommand.ts`,
  `src/commands/StatusCommand.ts`.
- `help/commands/list.hlp.json`, `help/commands/config-show.hlp.json`,
  `help/commands/status.hlp.json`.
- Integration specs for each command.

## Tests And Evidence

- Human output: correct lane listing, config display with redaction, status
  with health derivation.
- JSON output: validates against v1.schema.json for each command's data type.
- Parity proof: human and JSON output derive from identical data.
- Redaction proof: sensitive keys redacted in both human and JSON output.
- Fixture matrix:
  - Empty: zero lanes → `list` returns empty array, `status`/`config show`
    return not-found.
  - Single-lane: operations succeed with correct output.
  - Ambiguous: multiple lanes without disambiguation → ambiguity error.
  - Invalid: bad lane.json → invalid error.
  - Multi-repository: bindings and conflicts displayed.
  - Stale-index: stale entries warned in status.
  - Busy-lock: lock present → status reports mutation active.
- Read-only hash proof: after each command, compute hash of the lane directory;
  assert no files were created or modified.
- `nvb build` and `nvb test` pass.

## What Must Not Change

- Do not implement local discovery or selection; delegate to foundation services.
- Do not bypass the serializer; all JSON output through `commandEnvelopeSerializer.ts`.
- Do not add hidden writes or state repairs.
- Do not change the stable `laneStatus` schema.

## Review Procedure Highlights

1. Verify every command delegates to foundation services only.
2. Trace all JSON output paths through the serializer.
3. Confirm redaction in both human and JSON modes.
4. Verify every fixture class in the matrix passes.
5. Run read-only hash proof: compute lane-directory hash before and after each
   command to confirm zero modifications.

## Completion And Handoff

Three read-only commands are accepted. The wt-read-model pack is complete.
From any relevant repository location, the CLI can identify, select, and
describe managed lanes without changing any byte. Pack 2 (wt-runtime-distribution)
may begin.
