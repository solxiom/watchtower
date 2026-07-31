# Work Batch Index — Watchtower v1 Release

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

Batches must be executed in numerical order. Each batch depends on the
acceptance of all prior batches within this pack and all prior packs.

| Batch | Depends on | Primary proof system |
|-------|------------|---------------------|
| REL-01 | Packs 1–5 accepted (LC-08, UK-05, CA-18) | Global install + e2e trial specs + release evidence |
| REL-02 | REL-01 accepted | Concurrent + multi-repo e2e specs + recovery fixtures |
| REL-03 | REL-01, REL-02 accepted | Security/performance specs + packaging proof |
| REL-04 | REL-01–REL-03 accepted | Documentation audit + release gate verdict |

## Proof Expectations

| Batch | Required proof posture |
|-------|----------------------|
| REL-01 | Global install from `nvb dist`; `wt init` usable lane without runtime-tree copy; `wt init` refusal on unaccepted/unsealed/uncommitted/critically drifted pack; lane discovery from descendants, lane directory, and participating repositories; `wt status --json` stable and schema-valid; `wt watch` heartbeat/Ctrl-C; implementer→reviewer→accept cycle with real Git commits and independent reviewer session; `wt doctor` pass/warn/fail/skip robustness; `wt upgrade --apply` managed-path-only changes with old-runtime retention and operator-session history preservation; operator-session proposals confirmed/revalidated; scoped holds respected; release evidence packet |
| REL-02 | Two isolated lanes on one repository coexisting without slug/state collision; multi-repository commit set with per-repository acceptance commits verified; shared-write worktree conflict detected and refused; ambiguous multi-lane selection fails with actionable candidates; partial Git push recovery with documented per-repository push journals; duplicated idempotency key returns recorded outcome; copied-template directories with `.watchtower/` ignored and never modified |
| REL-03 | Path-traversal refusal at every boundary (lane dir, bindings, runtime store); strict-env parser rejects shell injection/substitution/expansion corpus; `wt doctor` account-access checks for multi-account fixture; packaged manifest completeness with missing/extra/non-executable/checksum-mismatch negative cases; global install integrity (dist matches manifests, staged runtime matches checksums); boundedness and cost proof across 30/300/3,000/10,000 batch packs; zero model invocations for all mechanical coordination; skill install proof for Codex, Cursor, Claude |
| REL-04 | Requirement-to-batch traceability matrix complete for every §17 criterion; every shipped command has registered help fragment matching current behavior; `v1.md`/`architecture.md`/`v1-contracts.md` agree with shipped behavior; `hello` scaffold removed from source, help, and spec; no build/dist/node_modules/.nira/local/.watchtower committed; package version/README/release notes consistent; final release verdict recorded |

## Shared Proof Rule

Every release acceptance criterion in `v1.md §17` must be independently
re-proven by the reviewer of the batch that owns it. A prior batch's
acceptance claim is not release-qualification proof unless the reviewer
independently reproduces it.

Implementation agents must name the exact spec files, commands, and
expected outcomes for their batch. Reviewers must independently regenerate
evidence rather than trusting the implementation report.
