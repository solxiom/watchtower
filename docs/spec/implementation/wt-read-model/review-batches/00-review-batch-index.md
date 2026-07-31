# Review Batch Index — Watchtower v1 Read Model

> **Accepted bootstrap implementation artifact.** Dispatch is authorized only under the
> accepted dependency DAG and paired independent batch-review gates. Product-created
> lanes remain subject to the structured pack acceptance and seal contract in
> `docs/spec/v1-contracts.md`.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: active index
Date: 2026-07-30

## Review Order

Review batches must be executed in numerical order, matching the work batch
sequence. A review batch may not begin before the paired implementation batch
is complete and the implementation report is written.

| Review batch | Reviews work batch | Reviewer minimum proof |
|-------------|-------------------|----------------------|
| RM-01 | RM-01 | Enumerate every error code; verify exit-code mappings (1-5); confirm no unmapped or reused codes; validate every domain type against v1.schema.json; exhaustively test error fixtures; verify `src/contracts/index.ts` exports all symbols |
| DB-01 | DB-01 | Independently verify evidence-based driver selection against the ADR; rerun every feasibility fixture (global install, FK enforcement, WAL mode, busy-timeout, permissions, integrity, corruption detection, staged rebuild, semantic-root reproduction, crash safety); audit focused SQLite/store ports for raw SQL, path, extension, and driver leaks; verify SqliteConfig defaults match v1-contracts.md §8A.4; confirm no derived indexes implemented; verify ADR documents no-JSON-shard-fallback rule; prove global install resolves the selected driver correctly |
| RM-02 | RM-02 | Round-trip test every envelope variant through schema validation; verify `--json` produces one value with no ANSI/decorations; prove additive compatibility (optional field addition does not break); confirm serializer does not define domain types; trace every output path |
| RM-03 | RM-03 | Trace every resolution path through precedence chain; verify every path-escape class is rejected; confirm missing workspace is error not creation; verify canonicalization before comparison; test symlink/case safety |
| RM-04 | RM-04 | Independently run 30+ malicious-shell corpus; verify zero executions; trace known-key preservation; test unknown-key handling; verify contradictory state detection; confirm every rejection has line-number diagnostics |
| RM-05 | RM-05 | Derive the complete event-type/role compatibility matrix from the accepted schema/contracts and verify every valid combination; test bad JSON, partial line, unknown type, role/type mismatch, and missing fields; confirm bounded latest-N ordering; prove malformed records do not drop valid ones; test empty and malformed-only files |
| RM-06 | RM-06 | Enumerate every ambiguity matrix cell for focused tests; verify UUID, slug, cwd-descendant, single-deduction, zero-lane, multi-lane, invalid-lane.json, missing-schemaVersion; test symlink resolution during walk; confirm no interactive picker |
| RM-07 | RM-07 | Verify every stale-entry class (PATH_MISSING, LANE_JSON_MISSING, BINDING_MISMATCH) is detected; prove index file unchanged after every read; test mixed valid+stale index; confirm missing index returns empty; verify secondary discovery |
| RM-08 | RM-08 | Verify canonical binding computation for valid and missing repositories; test branch/access/worktree validation; prove all three conflict classes (SHARED_WRITE, PATH_CONFLICT, BRANCH_CONFLICT) are detected; confirm dedicated is default; verify no false positives |
| RM-09 | RM-09 | Test tmux session reading with mock binary; verify heartbeat classification (fresh/stale/absent) with configurable threshold; test worker presence from parsed events; run no-mutation proof (zero new/modified files in state dir) |
| RM-10 | RM-10 | Independently run all 7 fixture classes for each command; verify human/JSON parity; confirm redaction in both modes; validate JSON output against v1.schema.json; run read-only hash proof (compute SHA-256 before/after, assert identical); confirm no foundation logic duplicated in commands; verify help fragments match command behavior |

## Shared Review Rule

The reviewer must independently regenerate evidence. Implementation report
conclusions are not accepted facts. Every reviewer must run the exact test
commands named by the batch and record the output, not narrate the outcome.

Acceptance commits must include all accepted non-`.local` changes with a
descriptive commit message. Rejections must produce a numbered correction
brief under `corrections/` with exact required fixes.

## Batch Acceptance Criteria

A review batch is accepted only when:

1. All minimum proof obligations (above) are independently reproduced and pass.
2. No hard-reject checklist item is flagged.
3. Status docs (`implementation-tracker.md`, `implementation-roadmap.md`) are
   updated for the batch outcome.
4. The corrected `v1.md` command status table is updated (RM-10 only).
5. All files are owned by `kavan:kavan`.
6. No `.local/` artifacts are staged.
7. The reviewer creates the acceptance commit.

## Dependency Order

Review batches follow the same dependency order as work batches:

- RM-01 must be reviewed first.
- DB-01 depends on RM-01 being accepted.
- RM-02 through RM-05 may be reviewed in parallel after RM-01 accepted.
- RM-06 depends on RM-03 and RM-04 being accepted.
- RM-07 depends on RM-03 and RM-06 accepted.
- RM-08 depends on RM-03 and RM-07 accepted.
- RM-09 depends on RM-04 and RM-05 accepted.
- RM-10 depends on RM-02, RM-06 through RM-09 accepted.
