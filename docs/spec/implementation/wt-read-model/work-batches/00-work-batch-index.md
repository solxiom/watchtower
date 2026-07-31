# Work Batch Index — Watchtower v1 Read Model

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

## Batch Order And Dependency Summary

Batches must be executed in the order specified. DB-01 depends on RM-01 accepted;
RM-02, RM-03, RM-04, and RM-05 may proceed in parallel after RM-01 is accepted.
RM-10 depends on all prior foundation batches being accepted.

| Batch | Depends on | Primary proof system |
|-------|------------|---------------------|
| RM-01 | — | Type-level fixtures for error codes and exit-code mappings; exhaustive error fixtures |
| DB-01 | RM-01 accepted | Driver selection ADR; global install proof; parameterized queries; FK enforcement; WAL mode; busy-timeout; owner-only permissions; integrity check; corruption detection; staged rebuild; semantic-root reproduction; crash safety |
| RM-02 | RM-01 accepted | Schema validation of success/error envelopes; round-trip serialization; additive-field compatibility |
| RM-03 | RM-01 accepted | Path resolution precedence fixtures; symlink/case/path-escape rejection fixtures |
| RM-04 | RM-01 accepted | 30+ fixture malicious-shell corpus validation; known-key parsing; unknown-key preservation |
| RM-05 | RM-01 accepted | Valid record parsing; malformed JSON/partial-line fixtures; bounded latest-N lookup |
| RM-06 | RM-03, RM-04 accepted | Discovery walk fixtures; selection matrix (zero/single/multiple/invalid/missing-schemaVersion); symlink/case safety |
| RM-07 | RM-03, RM-06 accepted | Advisory validation fixtures; stale-entry detection (path removed, lane.json missing); no-repair proof |
| RM-08 | RM-03, RM-07 accepted | Canonical binding computation; claim-overlap matrix (shared-write, path-conflict, branch-conflict) |
| RM-09 | RM-04, RM-05 accepted | Tmux session reading; heartbeat staleness detection; worker-event reading; no-mutation proof |
| RM-10 | RM-02, RM-06–RM-09 accepted | Human/JSON parity; redaction; stable schema; 7-class fixture matrix; read-only hash proof |

## Proof Expectations

| Batch range | Required proof posture |
|-------------|----------------------|
| RM-01 | Focused type-level and unit tests for every error code, exit-code mapping, and domain type; exhaustive error fixtures covering unknown, boundary, and malformed cases |
| DB-01 | Driver selection ADR; package.json dependency audit; global install end-to-end proof; focused storage abstraction tests (parameterized queries, FK enforcement, WAL mode, busy-timeout, permissions, integrity, corruption, rebuild, semantic-root reproduction, crash safety); architectural decision record |
| RM-02 | Focused serializer tests with schema validation; round-trip tests for every envelope variant; `--json` output purity proof; additive-field compatibility within schema version 1 |
| RM-03 | Focused path-resolution tests covering all four resolution paths and all escape-rejection classes; symlink/case/path-escape fixture matrix |
| RM-04 | Focused parser tests with 30+ malicious-shell corpus (zero executions); known-key parsing tests; unknown-key preservation tests; line-number diagnostic coverage |
| RM-05 | Focused JSONL parser tests: valid records, malformed JSON, partial lines, unknown event types; bounded latest-10 and latest-100 lookup tests |
| RM-06 | Focused discovery tests: walk-up, lane-dir, descendant; selection precedence tests covering every matrix cell; symlink/case safety tests |
| RM-07 | Focused membership tests: valid index, stale entries (path removed, lane.json missing, binding mismatch), missing index; no-repair proof for each stale class |
| RM-08 | Focused binding tests: compute from repositories.local.json, branch/worktree/access checks; conflict tests: shared-write, path-conflict, branch-conflict |
| RM-09 | Focused observation tests: tmux session reading (with mock tmux binary), heartbeat staleness thresholds, worker-event reading from parsed streams; no-mutation proof |
| RM-10 | Complete command specs with 7-class fixture workspaces; human/JSON parity; redaction verification; stable schema validation; read-only hash proof: zero bytes written |

## Shared Proof Rule

All batches must add focused tests with the behavior they introduce. Do not
defer all testing to the command-integration batch (RM-10). RM-10 adds
integration and fixture-matrix tests; it does not replace foundation-level
unit tests.

Implementation agents must name the exact spec files, test commands, and
expected outcomes for their batch. Reviewers must independently regenerate
evidence rather than trusting the implementation report.

The build and test commands for the project are:

```sh
nvb build    # compile → build/
nvb test     # build + Jasmine
```

These must pass on every batch. No batch may introduce a build failure or
test regression.
