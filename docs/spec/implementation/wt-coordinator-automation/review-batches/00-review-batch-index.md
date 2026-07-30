# Review Batch Index — Watchtower v1 Coordinator Automation

> **Draft pack-authoring artifact.** This document is not a seal, acceptance
> record, or authority to initialize a lane. Before pack acceptance, reconcile
> it with `docs/spec/v1-implementation-map.md`,
> `docs/development/engineering-and-review-standard.md`, and
> `docs/spec/nirvana-integration-architecture.md`. The normative precedence in
> `docs/spec/v1-contracts.md` governs every conflict.

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
| CA-01 | CA-01 | Independently compile the same sealed pack twice; prove identical logical rows and semantic-root digest from independent SQLite databases; verify FK integrity across all tables; simulate crash at every staged-publication stage; verify semantic root computed from logical rows, never SQLite bytes; corrupt partial index detected and refused; seal-drift detection; model-free check |
| CA-02 | CA-02 | Independently open compiled index and verify all typed query methods return correct results; grep for `.exec(`, `.run(`, `.prepare(`, `.all(`, `.get(` — prove they appear ONLY in `IndexStore.ts`; verify SQLite bytes never treated as semantic authority; corrupt/missing/stale index → no query completes, no partial data; verify no full-pack/JSON-shard fallback exists; cursor/revision semantics; page/depth limits enforced |
| CA-03 | CA-03 | Independently append events and verify checkpoint integrity; verify WAL-mode concurrent reader behavior; corrupt SQLite database → detection and staged rebuild from authoritative JSONL; verify rebuild idempotency; verify all projections deterministic; verify authoritative JSONL never modified; verify projections use JournalIndex typed reads, never raw SQL or JSONL |
| CA-04 | CA-04 | Independently calculate ready set from 30-batch fixture; verify all dependency/claim/capacity blockers correctly identified; prove deterministic output from identical inputs; verify no arbitrary winner selection (multiple ready → all reported); model-free check |
| CA-05 | CA-05 | Independently verify all 15 routing rules in correct order; prove first-match determinism; verify every guard condition with positive/negative fixtures; verify D1→C2, D2→C3, D3→C5 floors; verify M0 never invokes model; verify escalation never downgrades below minimum |
| CA-06 | CA-06 | Independently verify all 10 unattended-eligibility requirements; verify adapter defaults to skill-only; prove eligibility checker is pure (no I/O); verify misclassified adapter cannot reach invocation path |
| CA-07 | CA-07 | Independently construct envelopes from identical inputs; verify semantic digest stability; verify operational metadata excluded from digest; verify bounded-context size limits; verify untrusted content labeled and delimited |
| CA-08 | CA-08 | Independently verify all allowlisted context types resolve; verify unauthorized types denied with recorded event; verify soft-limit warning and hard-limit blocking; verify budget per-cycle isolation; verify provenance and redaction applied |
| CA-09 | CA-09 | Independently verify all 11 proposal types: valid, invalid, stale, illegal-transition, idempotency-conflict cases; verify permitted origin/class enforcement; verify stale state invalidates; verify idempotency key prevents double-commit; verify failed proposals recorded, never partially applied |
| CA-10 | CA-10 | Independently verify lock acquisition prevents concurrent mutation; verify current-state revalidation rejects stale effects; verify idempotency key duplicate rejection; verify all-or-nothing execution with rollback; verify external-effect prepare/attempt/verify journal states; verify crash recovery from journal; verify preview without mutation |
| CA-11 | CA-11 | Verify tmux prepare/attempt/verify adapter; unknown launch recovery; duplicate suppression; no arbitrary kill/shell |
| CA-12 | CA-12 | Verify reviewer-session ownership; commit-set validation; partial push recovery |
| CA-13 | CA-13 | Verify stable priority; fsynced cursor advance; interrupted/duplicate/uncertain replay |
| CA-14 | CA-14 | Verify all coordinator commands; index/status/context/explain/cycle/escalate/events/ready; dry-run purity |
| CA-15 | CA-15 | Verify many sessions; one active turn each; immutable closed history; crash-safe journals |
| CA-16 | CA-16 | Verify session SQLite index; bounded metadata/excerpts; same-lane capsules; no full-history fallback |
| CA-17 | CA-17 | Verify session routing/budgets/proposals/holds/amendments; M0/D1–D3 grants/reserves; confirmation/revalidation; scoped hold interleaving |
| CA-18 | CA-18 | Verify session CLI/PTY attachment; create/attach/resume/observe; streaming/signals/accessibility; 30–10k pack scale and long-lane replay |

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
4. The corrected `v1.md` command status table is updated (CA-14, CA-18 only).
5. All files are owned by `kavan:kavan`.
6. No `.local/` artifacts are staged.
7. The reviewer creates the acceptance commit.

## Dependency Order

Review batches follow the same dependency order as work batches:

- CA-01 must be reviewed first (depends on DB-01, LC-02, LC-05 accepted).
- CA-02 depends on CA-01 accepted.
- CA-03 depends on RM-05, CA-02 accepted.
- CA-04 depends on RM-08, CA-01, CA-03 accepted.
- CA-05 depends on CA-04, RT-02 accepted.
- CA-06 depends on RT-05, CA-05 accepted.
- CA-07 depends on CA-02 through CA-06 accepted.
- CA-08 depends on CA-02, CA-06, CA-07 accepted.
- CA-09 depends on CA-05, CA-07, CA-08 accepted.
- CA-10 depends on LC-03, CA-09 accepted.
- CA-11 through CA-17 depend on earlier CAs as pipeline allows.
- CA-18 depends on CA-14 through CA-17 accepted.
