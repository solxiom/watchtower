# Watchtower v1 Read Model Implementation Tracker

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

**Status:** ⏳ RM-01 accepted; dependent foundation batches available — M1 read-model pack
**Last Updated:** 2026-07-31
**Scope:** Watchtower v1 read-only foundation — contracts, parsers, discovery, membership, bindings, observations, and commands

## Implementation-Pack Readiness

- All 11 work briefs and 11 implementation launch prompts carry the common
  reasoning, clean-code, module-size, proof, ownership, and handoff protections.
- All 11 review briefs and 11 reviewer launch prompts carry independent
  source-verification, correction, tracker, local-report, and structural-reject
  instructions; the reviewer lane is fully specified and not a compressed shorthand.
- Reasoning floors are assigned by type-system, state-machine, discovery,
  selection-matrix, integration risk, and technology-selection impact; reviewer
  reasoning is never lower than implementor reasoning.
- Every launch prompt retains a complete forwarding profile both at the top
  and beside its local implementor/reviewer reasoning section: suitability,
  primary models, alternatives, steering-only tools, prohibited final-pass
  classes, context requirements, and final-authority limits are never reduced
  to an `R` label plus shorthand.
- Hand-maintained modules use the exact category matrix (120 command/front
  door, 140 orchestrator, 200 foundation, 240 contracts, and 300 tests as
  preferred maxima), including its category-specific warning and hard-reject
  bands; no count excuses mixed responsibilities.
- DB-01 depends on RM-01 accepted; it gates the derived-store path.
- RM-02 through RM-05 may proceed in parallel after RM-01 accepted.
- RM-06 depends on RM-03 and RM-04 accepted.
- RM-07 depends on RM-03 and RM-06 accepted.
- RM-08 depends on RM-03 and RM-07 accepted.
- RM-09 depends on RM-04 and RM-05 accepted.
- RM-10 depends on RM-02 and RM-06 through RM-09 accepted.
- No command integration (RM-10) may begin before all foundation services
  are accepted.

## Status Legend

- ✅ `Done` — implemented, reviewed, and accepted
- ⏳ `In Progress` — active implementation or review
- 🟠 `Correction Required` — implemented but rejected pending repair
- ❌ `Pending` — planned, not started
- 🚫 `Blocked` — cannot move honestly without an external dependency or decision

## Batch Status Snapshot

| Batch | Phase | Status | Short note |
|-------|-------|--------|------------|
| RM-01 | Contract foundation | ✅ Done | Contract kernel and all three corrections independently accepted |
| DB-01 | Storage feasibility | ✅ Done | Commons `SqliteService` / `better-sqlite3@13.0.1`, typed private SQL capsule, full §8A feasibility matrix, writer/publication exclusion, PID-reuse-safe lock identity, and strict lock/sentinel validation independently accepted after correction 04; 44/44 adversarial runs and 158 specs passed |
| RM-02 | Contract foundation | ❌ Pending | JSON envelopes and schema validation |
| RM-03 | Path resolution | ❌ Pending | Canonical paths and workspace resolution |
| RM-04 | Parser foundation | ❌ Pending | Strict env and lane-state parsers |
| RM-05 | Event contracts | ❌ Pending | Durable worker-event JSONL parser |
| RM-06 | Discovery | ❌ Pending | Home-lane discovery and selection |
| RM-07 | Membership | ❌ Pending | Membership index and secondary discovery |
| RM-08 | Bindings | ❌ Pending | Repository bindings and conflict inspection |
| RM-09 | Observations | ❌ Pending | Tmux, watcher, heartbeat, worker observations |
| RM-10 | Commands | ❌ Pending | list, config show, and status commands |

## Batch Proof Summary

| Batch | Minimum proof posture |
|-------|-----------------------|
| RM-01 | Type-level fixtures for every error code and exit-code mapping; versioned IDs for every domain type; exhaustive error fixtures including unknown, boundary, and malformed cases; proof that no error code is unmapped or multiply mapped |
| DB-01 | Driver selection ADR documenting viable candidates, reproduced evidence, selected package/version, failure model, supported targets, and no-JSON-shard-fallback rule; global install proof (`nvb dist && npm install -g ./dist`); parameterized typed operations; FK enforcement; WAL; busy timeout; permissions; integrity/corruption; staged rebuild; semantic-root reproduction; crash safety |
| RM-02 | Schema validation of success/error envelopes against v1.schema.json; round-trip serialization of every `commandResult` and `commandError` variant; proof that `--json` produces no decorative text on stdout; additive-field compatibility proof within schema version 1 |
| RM-03 | Fixture-proven resolution precedence for `WATCHTOWER_DATA_HOME`, XDG fallback, explicit `--workspace`, git toplevel, and ancestor walk; symlink/case/path-escape rejection fixtures covering `..`, symlink loops, null bytes, and control characters; missing workspace error fixtures |
| RM-04 | 30+ fixture malicious-shell corpus validation (no execution); known-key parsing with exact value reproduction; unknown-key preservation proof; blank-line and comment handling; line-number diagnostics for every rejection class |
| RM-05 | Valid record parsing with role/event compatibility checks; malformed JSON fixtures; partial-line fixtures; unknown-event-type warning fixtures; bounded latest-10 and latest-100 lookup with stable ordering |
| RM-06 | Descendant/lane-dir discovery from cwd; UUID exact-match selection; slug match among relevant lanes; cwd-descendant deduction; single-lane deduction; complete ambiguity matrix: zero lanes, single lane, multiple lanes, invalid lane.json, missing schemaVersion |
| RM-07 | Advisory validation of membership entries with canonical path resolution; valid `lane.json` resolution proof for each candidate; stale-entry detection (path removed, lane.json missing) with warning; no-repair proof for each stale-entry class |
| RM-08 | Canonical binding computation from `repositories.local.json`; branch verification against git HEAD; worktree mode classification; access-mode validation; claim-overlap detection: shared-write, path-conflict, branch-conflict; dedicated-worktree default proof |
| RM-09 | Qualified tmux session name reading from `tmux list-sessions`; stale heartbeat detection with configurable threshold; worker-event reading from parsed event stream; presence observation that never writes state files or advances cursors |
| RM-10 | Human and JSON parity for all three commands; empty-results handling (empty array for list); redaction verification for TOKEN/SECRET/PASSWORD/KEY/CREDENTIAL keys; stable `laneStatus` schema output; derived health (`ok`, `attention`, `complete`, `invalid`); full fixture matrix: empty, single-lane, ambiguous, invalid, multi-repository, stale-index, busy-lock; read-only hash proof: zero bytes written to any lane directory |

## Dependency And Gate Summary

```text
RM-01: Contract kernel and error taxonomy
  |
  +--- DB-01: SQLite driver, packaging, and derived-store feasibility
  |
  |
  |---
  |   v
  | RM-02: JSON envelopes and schema validation
  |
  +---+---+---+
  |   |   |   |
  v   v   v   |
RM-03  RM-04  RM-05
  |   |       |
  |   v       |
  | RM-06     |
  |   |       |
  |   v       |
  | RM-07     |
  |   |       |
  |   v       |
  | RM-08     |
  |           |
  +-------+---+
          |
          v
        RM-09
          |
          v
        RM-10: list, config show, status commands
```

## Current Honest Next Step

- **Current lane head:** RM-01 and DB-01 are independently accepted. DB-01's
  dependency gate for CA-01 and RT-03 is clear, while dispatch remains subject
  to the current architect planning hold. RM-02 through RM-05 may proceed under
  their own dependency and review gates.
- **RM-01:** The accepted kernel has 23 exhaustively mapped codes, immutable
  registries and error values, bounded safe error context, corrected persisted
  lifecycle/claim vocabulary, durable worker-event envelopes, precise negative
  fixtures, and an automated mutable-global architecture regression.
- **DB-01:** The SQLite driver selection and storage feasibility batch. It
  gates the entire derived-store path; failure requires a spec amendment.
  Depends on RM-01 accepted. Correction 01 (retained) rebuilt it on the pinned
  commons `SqliteService` worker facade (driver `better-sqlite3@13.0.1` isolated
  in the commons worker; Watchtower imports no driver) and Node `>=26.4.0`.
  Correction 02 closes the publication defect: a writable handle now acquires the
  store's mutation lock at open and holds it for its whole lifetime, so no
  ordinary write can bypass the lock a publication takes. The reproduced race
  now ends with the publication refused as `ERR_LOCK_CONFLICT` and all 5,001
  committed rows present, instead of both operations succeeding and the writer's
  rows vanishing. Busy/timeout facade codes are translated at the adapter
  boundary, integrity is verified at admission so a corrupt store blocks every
  dependent read, the typed mutation surface proves FK insert/update/delete
  rejection, and the barrel exposes no caller-selected path or lock.
  Correction 03 completes the durable lock identity: the lock and its reclaim
  sentinel now record five distinct validated §11 fields — `pid`,
  `processStartIdentity` (the actual boot-anchored start marker, never the
  acquisition time), a bounded redacted `command`, `acquiredAt`, and the
  per-acquisition `token`. Liveness matches PID **and** process start identity,
  so a lock left by a reused PID is reclaimed as stale instead of blocking
  forever, while a genuinely running owner stays active even against a foreign
  token. Process start identity is a proven `NIRVANA_API_GAP` filled by a focused
  Linux `/proc` adapter mirroring Nira's `pidSafety` mechanism. The lock is
  described accurately as the §11 projection/index publication lock, with the
  lane lock a separate outer lock owned by a later batch.
  Correction 04 closes the remaining validation hole: the record parser was only
  checking presence and type, so a crafted `processStartIdentity` mismatched the
  real process, was classified as a reused PID, and let a contender reclaim a
  live holder's lock. The parser is now fail-closed — the file is size-bounded
  before it is read, the value must be a plain object with **exactly** the five
  allowed keys, and each field is validated against its own grammar: PID within
  Linux `pid_max`, the minted `linux-boot:<seconds>:start:<ms>` marker or the
  explicit `unverifiable` value, a bounded path-free command, a canonical
  round-tripping timestamp, and a canonical UUID token. Only a fully validated
  record reaches liveness classification or token comparison, so untrusted text
  can no longer become stale authority. A 22-case adversarial matrix — including
  the reviewer's exact adverse record — yields bounded `ERR_LOCK_CONFLICT` with
  the original left byte-identical, run against both the lock and the reclaim
  sentinel. Independent correction-04 review reproduced 44/44 fail-closed runs,
  all 158 specs, the global native-binding proof, and the complete preserved
  correction-02/03 matrix. The ADR is accepted and the reviewer owns the
  acceptance commit.
- **RM-02 through RM-05:** May proceed in parallel after RM-01 accepted.
- **RM-06:** Must wait for RM-03 and RM-04 acceptance.
- **RM-07:** Must wait for RM-03 and RM-06 acceptance.
- **RM-08:** Must wait for RM-03 and RM-07 acceptance.
- **RM-09:** Must wait for RM-04 and RM-05 acceptance.
- **RM-10:** Must wait for RM-02 and RM-06 through RM-09 acceptance.
