# Watchtower v1 Release Implementation Tracker

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

**Status:** 🔴 Pending — all batches pending
**Last Updated:** 2026-07-30
**Scope:** v1 release qualification — end-to-end trials, system acceptance, security/performance/package evidence, documentation audit

## Implementation-Pack Readiness

- ✅ All 4 work briefs and 4 implementation launch prompts carry the common
  reasoning, clean-code, module-size, proof, ownership, and handoff protections.
- ✅ All 4 review briefs and 4 reviewer launch prompts carry independent
  source-verification, correction, tracker, local-report, and structural-reject
  instructions.
- ✅ Reasoning floors reflect the highest available reasoning class for every
  batch (R5 for REL-01–03, R3 for REL-04 which audits rather than implements).
  Reviewer reasoning is never lower than implementor reasoning.
- ✅ Every launch prompt retains a complete forwarding profile both at the top
  and beside its local implementor/reviewer reasoning section: suitability,
  primary models, alternatives, steering-only tools, prohibited final-pass
  classes, context requirements, and final-authority limits are never reduced
  to an `R` label plus shorthand.
- ✅ Hand-maintained e2e test and fixture files target the established spec
  size bands.

## Status Legend

- ✅ `Done` — implemented, reviewed, and accepted
- ⏳ `In Progress` — active implementation or review
- 🟠 `Correction Required` — implemented but rejected pending repair
- ❌ `Pending` — planned, not started
- 🚫 `Blocked` — cannot move honestly without an external dependency or decision

## Batch Status Snapshot

| Batch | Phase | Status | Short note |
|-------|-------|--------|------------|
| REL-01 | Release qualification | ❌ Pending | Fresh-lane implementer→reviewer→accept trial. Depends on LC-08, UK-05, CA-24 accepted. |
| REL-02 | Release qualification | ❌ Pending | Concurrent and multi-repository recovery trials. Depends on REL-01 accepted. |
| REL-03 | Release qualification | ❌ Pending | Security, ownership, performance, and package qualification. Depends on REL-01, REL-02 accepted. |
| REL-04 | Release qualification | ❌ Pending | Documentation consistency and release gate. Depends on REL-01–03 accepted. |

## Batch Proof Summary

| Batch | Minimum proof posture |
|-------|-----------------------|
| REL-01 | Global install from `nvb dist`; `wt init` full cycle with real filesystem; `wt watch` heartbeat/Ctrl-C; `wt status --json` schema compliance; `wt doctor` pass/warn/fail/skip; one implementer→reviewer→accept cycle with real Git commits and independent reviewer session; `wt upgrade --apply` with managed-path-only changes and old-runtime retention; release evidence packet |
| REL-02 | Two isolated lanes on one repository; multi-repo commit set with per-repository acceptance; shared-write worktree conflict refusal; partial Git push recovery with push journals; duplicate-cycle idempotency replay; copied-template lane ignored; multi-lane ambiguity candidate output |
| REL-03 | Path-traversal refusal across symlinks/lane-dir/bindings/runtime-store; strict-env parser rejects shell injection/substitution/expansion; `wt doctor` account-access checks for multi-account fixtures; packaged manifest completeness with checksum mismatch negative cases; global install integrity; status/list boundedness across 30→10,000 batch packs; zero model invocations for mechanical coordination |
| REL-04 | Every §17 criterion traced to owning batch and proof; every shipped command has registered help fragment; help fragments match current behavior; `v1.md`/`architecture.md`/`v1-contracts.md` agree with shipped behavior; `hello` scaffold removed; no build/dist/node_modules/.nira/local/.watchtower committed; final release verdict recorded |

## Dependency And Gate Summary

```text
Pack 5 (wt-coordinator-automation) accepted
  |
  v
REL-01: Fresh-lane implementer→reviewer→accept trial
  |   (global install, init, watch, status, doctor, upgrade, accept, publish)
  v
REL-02: Concurrent and multi-repository recovery trials
  |   (two lanes, multi-repo commits, shared-write refusal, partial push, idempotency)
  v
REL-03: Security, ownership, performance, and package qualification
  |   (traversal, config, permission, manifest, boundedness, cost, model-free proof)
  v
REL-04: Documentation consistency and release gate
      (requirement traceability, help audit, doc audit, scaffold removal, artifact audit, verdict)
```

## Current Honest Next Step

- **Current pack head:** 🔴 All batches pending. All 55 prior work/review
  batches across packs 1–5 must be accepted before REL-01 may begin.

- **REL-01:** ❌ Pending. Blocked until LC-08 (Pack 3), UK-05 (Pack 4), and
  CA-24 (Pack 5) are independently accepted.
- **REL-02:** ❌ Pending. Blocked until REL-01 is accepted.
- **REL-03:** ❌ Pending. Blocked until REL-01 and REL-02 are accepted.
- **REL-04:** ❌ Pending. Blocked until REL-01, REL-02, and REL-03 are accepted.

## Cross-Pack Dependency Verification

Before REL-01 begins, verify independently:

- [ ] Pack 1 (`wt-read-model`): all 11 batches accepted
- [ ] Pack 2 (`wt-runtime-distribution`): all 7 batches accepted
- [ ] Pack 3 (`wt-lane-lifecycle`): all 8 batches accepted, including LC-08
- [ ] Pack 4 (`wt-upgrade-knowledge`): all 5 batches accepted, including UK-05
- [ ] Pack 5 (`wt-coordinator-automation`): all 24 batches accepted, including CA-24
- [ ] `nvb dist` produces a package whose build validation passes
- [ ] `nvb test` produces zero failures
- [ ] `hello` scaffold is removed (per LC-08 exit condition)

No REL batch may start before these verifications complete. The reviewer of
each REL batch must independently re-verify the dependency gate before
proceeding.

## Release Acceptance Traceability

Each checkbox in `v1.md §17` must be mapped to one owning batch and one
specific proof location before REL-04 may accept. This table is the living
traceability index:

| # | §17 Criterion | Owning batch | Proof location | Status |
|---|---------------|-------------|----------------|--------|
| 1 | `nvb dist` globally installable | REL-01, REL-03 | REL-01 trial output; REL-03 manifest proof | ❌ |
| 2 | Package manifests prove every asset | REL-03 | REL-03 manifest/packaging spec | ❌ |
| 3 | `wt init` usable lane, no runtime copy | REL-01 | REL-01 e2e spec | ❌ |
| 4 | `wt init` refuses unaccepted/unsealed pack | REL-01 | REL-01 negative fixture | ❌ |
| 5 | Lane discovery from descendants/dir/index | REL-01, REL-02 | REL-01 discovery fixtures; REL-02 multi-repo fixtures | ❌ |
| 6 | One repo in multiple active lanes | REL-02 | REL-02 concurrent spec | ❌ |
| 7 | One lane binds multiple repos, per-repo commits | REL-02 | REL-02 multi-repo spec | ❌ |
| 8 | Concurrent writable bindings rejected/isolated | REL-02 | REL-02 shared-write refusal fixture | ❌ |
| 9 | Ambiguous multi-lane selection fails with candidates | REL-02 | REL-02 ambiguity fixture | ❌ |
| 10 | `wt status --json` stable, contract-tested | REL-01 | REL-01 status schema validation | ❌ |
| 11 | `wt watch` preserves heartbeat stdout/signals | REL-01 | REL-01 watch trial | ❌ |
| 12 | Idle polls/heartbeats/events/sessions/ready-set no model | REL-03 | REL-03 model-invocation audit | ❌ |
| 13 | Coordinator decisions: bounded envelopes, typed proposals, brokered context, minimum-capability routing, one effect authority | REL-01 | REL-01 e2e accept cycle | ❌ |
| 14 | Every cycle uses verified pack-seal index; context bounded across pack size | REL-03 | REL-03 boundedness/cost proof | ❌ |
| 15 | Stale/missing indexes block safely, no full-pack scan | REL-03 | REL-03 index-refusal fixture | ❌ |
| 16 | Ambiguous batch selection and reject triage cannot fall through to mechanical routing | REL-01 | REL-01 coordinator routing trial | ❌ |
| 17 | Reviewer acceptance durable, distinct from partial Git publication | REL-02 | REL-02 partial push recovery | ❌ |
| 18 | Interrupted/duplicate cycles recover idempotently | REL-02 | REL-02 idempotency replay | ❌ |
| 19 | Multiple bounded multi-turn sessions per lane, continuity from local state | REL-01 | REL-01 operator-session trial | ❌ |
| 20 | Foreground attachments create/attach/detach/observe without memory/effect authority | REL-01 | REL-01 session attachment trial | ❌ |
| 21 | Unambiguous syntax on attach/resume/observe/script commands | REL-04 | REL-04 help/doc audit | ❌ |
| 22 | Cross-session references and status/list bounded as session count grows | REL-03 | REL-03 boundedness proof | ❌ |
| 23 | Amendment requests, export, budget grants preserve authority and retention | REL-01 | REL-01 session trial | ❌ |
| 24 | Advisory sessions continue alongside automation unless scoped hold applies | REL-01 | REL-01 hold trial | ❌ |
| 25 | Operator-session proposals require confirmation and revalidation | REL-01 | REL-01 proposal confirmation trial | ❌ |
| 26 | `wt doctor` detects missing deps, broken links, unsafe config, missing pack structure | REL-01 | REL-01 doctor fixtures | ❌ |
| 27 | `wt upgrade --apply` only manifest-owned paths, retains old runtime, preserves session history | REL-01 | REL-01 upgrade trial | ❌ |
| 28 | Coordinator knowledge bundled and installable for Codex, Cursor, Claude | REL-03 | REL-03 skill install proof | ❌ |
| 29 | Fresh lane completes implementer→reviewer→accept cycle with bundled runtime | REL-01 | REL-01 full cycle trial | ❌ |
| 30 | Copied-template lanes ignored and never modified | REL-02 | REL-02 copied-template fixture | ❌ |
| 31 | Help and product docs match every shipped command | REL-04 | REL-04 help/doc audit | ❌ |
| 32 | No build/dist/node_modules/.nira/local/.watchtower artifact committed | REL-04 | REL-04 artifact audit | ❌ |
