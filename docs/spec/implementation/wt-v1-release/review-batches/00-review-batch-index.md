# Review Batch Index — Watchtower v1 Release

Status: active index
Date: 2026-07-30

## Review Order

Review batches must be executed in numerical order, matching the work batch
sequence. A review batch may not begin before the paired implementation batch
is complete and the implementation report is written.

| Review batch | Reviews work batch | Reviewer minimum proof |
|-------------|-------------------|----------------------|
| REL-01 | REL-01 | Independently reproduce the full pipeline: `nvb dist` → global install → `wt init` → `wt status --json` → `wt list` → `wt watch` → implementer→reviewer→accept cycle → `wt doctor` → `wt upgrade`. Verify lane discovery from all documented paths. Verify init refusal negative cases. Verify no runtime tree copy. Verify release evidence packet is complete and commands are documented with actual output. |
| REL-02 | REL-02 | Independently reproduce concurrent lane isolation: two lanes on one repository with distinct IDs/slugs/state/locks, independent status, no state collision. Reproduce ambiguous selection with actionable candidates. Reproduce shared-write refusal with diagnostic naming the conflicting lane. Reproduce multi-repo commit verification with per-repository acceptance commits. Reproduce partial push recovery: one push succeeds, one fails, semantic acceptance preserved, retry recovers without new acceptance commit, push journals correctly updated. Reproduce idempotency replay: duplicate key returns recorded outcome without repeating external effect. Reproduce copied-template ignorance: pre-Watchtower directories not discovered, not inspected, not modified. |
| REL-03 | REL-03 | Independently reproduce at minimum: one path-traversal negative case per security boundary (lane directory, repository binding, runtime store, within-lane) with independently crafted malicious inputs. One config-injection negative case per class (command substitution, shell operators, variable expansion) with the strict-env parser. One permission boundary check (worker deny-write to runtime store or lane config). One manifest-integrity negative case (checksum mismatch fails build). One global-install integrity verification (staged runtime matches dist manifest). SQLite driver qualification: driver integrity (native binary checksum matches manifest), global-install proof (driver loads from globally installed package outside dev tree), WAL-mode verification and concurrent-read busy-handler test, corruption detection (truncated database and random-bytes file both refused), semantic-root rebuild (rebuild from empty produces identical logical rows and schema version), permission boundary proof (worker SELECT succeeds, worker write refused through connection-level SQLITE_OPEN_READONLY). One boundedness measurement (wall time and output size at two pack scales). One model-free audit result (source-path evidence for a mechanical coordination operation). Verify security claims have exploit fixtures, not just algorithm descriptions. Verify performance measurements are actual numbers. |
| REL-04 | REL-04 | Independently re-verify every finding in the audit report by reading the referenced help fragments, command source, spec docs, and Git-tracked files. Form independent judgment about each finding's classification (BLOCKING vs NON-BLOCKING). Verify at least 8 of 32 §17 criteria independently. Verify at least 5 help fragments independently. Verify at least 3 commands from spec docs independently. Independently confirm scaffold removal, committed artifact cleanliness, and package version consistency. Do not accept the audit report's conclusions without re-reading the referenced documents. The reviewer's acceptance of REL-04 is the final v1 release gate commit. |

## Shared Review Rule

The reviewer must independently regenerate evidence. Implementation report
conclusions are not accepted facts. Every reviewer must run the exact test
commands named by the batch and record the output, not narrate the outcome.

Acceptance commits must include all accepted non-`.local` changes with a
descriptive commit message. Rejections must produce a numbered correction
brief under `corrections/` with exact required fixes.

## Release Gate Rule

The REL-04 review is the final gate. If the REL-04 reviewer rejects, no
release commit may be created until all BLOCKING findings are resolved by
the owning prior packs. The reviewer's acceptance of REL-04 is the v1
release gate commit.
