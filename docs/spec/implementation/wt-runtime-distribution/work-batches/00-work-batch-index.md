# Work Batch Index — wt-runtime-distribution

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

All 7 work batches are pending. No batch has started. RT-01 is the first
eligible batch and requires RM-01 acceptance from Pack 1 (`wt-read-model`)
before beginning.

## Batch Order And Dependency Summary

Batches must be executed in numerical order within their dependency constraints.
Each batch depends on the acceptance of its declared prerequisite batches.

| Batch | Depends on | Primary proof system |
|-------|------------|---------------------|
| RT-01 | RM-01 accepted (Pack 1) | Asset enumeration, SHA-256 hashing, cross-reference against implementation-lane-coordinator source |
| RT-02 | RT-01 accepted | Type-level fixtures for valid/invalid manifests; validator unit tests for every rejection path |
| RT-03 | RT-02 accepted + DB-01 accepted | NVB build output verification; dist layout comparison; manifest validation against actual files; SQLite driver packaging and binary verification for all target platforms |
| RT-04 | RT-02 accepted + RM-03 accepted (Pack 1) | XDG precedence unit tests; atomic staging integration tests; version coexistence fixtures; immutability enforcement |
| RT-05 | RT-04 accepted + RM-01 accepted (Pack 1) | Adapter unit/integration tests; argv-only execution proof; `WT_*` allowlist proof; cwd/account/access validation; signal/exit forwarding |
| RT-06 | RT-04 + RT-05 accepted | Managed link creation/validation unit tests; collision refusal proof; path-escape rejection proof; compatibility name resolution proof |
| RT-07 | RT-03 + RT-05 + RT-06 accepted | Integration smoke test with relocated package; wake stdout behavior; SIGINT stop behavior; worker account read-but-cannot-write proof |

## Proof Expectations

| Batch range | Required proof posture |
|-------------|----------------------|
| RT-01 | Enumerate every inherited shell runtime script and knowledge doc; record source path, SHA-256, line count, description, and coordinator action mapping; build behavioral inventory; prove no omission |
| RT-02 | Define closed manifest types; validate against JSON Schema bundle; prove validator rejects missing, extra, non-executable, and checksum-mismatched assets; prove every asset represented |
| RT-03 | Configure NVB tasks; package SQLite driver from DB-01; prove driver binary present in dist for all target platforms; prove native driver loads from dist location; prove `nvb dist` produces correct layout; prove executable bits preserved; prove validation fails on every rejection path; prove manifest/actual-file agreement |
| RT-04 | Prove XDG precedence order; prove atomic first-stage via temp-file-atomic-rename; prove two versions coexist; prove version roots are immutable after staging; prove valid/invalid version string handling |
| RT-05 | Prove argv-only execution with zero shell interpolation; prove `WT_*` allowlist excludes non-`WT_*` keys; prove cwd validated as existing directory; prove OS account access checked; prove signal/exit forwarding; prove manifest action validation |
| RT-06 | Prove managed link target checksum validation; prove collision with non-managed files refused; prove symlink path-escape after resolution refused; prove compatibility names resolved through `actions` array; prove manifest-only ownership |
| RT-07 | Prove relocated package wake stdout matches expected patterns; prove SIGINT stops watcher cleanly; prove worker accounts can read/execute runtime entrypoints; prove worker accounts cannot write to runtime entrypoints; prove no hardcoded paths |

## Shared Proof Rule

Integration smoke proof (RT-07) must run from a relocated package directory, not
the source tree. The relocated package must have zero hardcoded paths to the
source repository. Worker account enforcement must use the actual configured
worker OS user, not the operator account.

Implementation agents must name the exact spec files, test commands, and
expected outcomes for their batch. Reviewers must independently regenerate
evidence rather than trusting the implementation report.
