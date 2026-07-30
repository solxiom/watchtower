# Review Batch Index — wt-runtime-distribution

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

All 7 review batches are pending. No batch has started. RT-01 review cannot
begin before the RT-01 implementation batch is complete and its implementation
report is written.

## Review Order

Review batches must be executed in numerical order, matching the work batch
sequence. A review batch may not begin before the paired implementation batch
is complete and the implementation report is written.

| Review batch | Reviews work batch | Reviewer minimum proof |
|-------------|-------------------|----------------------|
| RT-01 | RT-01 | Independently enumerate every inherited shell script and knowledge doc; verify SHA-256 digests; cross-reference behavioral inventory against coordinator-automation.md; verify no omissions |
| RT-02 | RT-02 | Verify every manifest rejection path independently; run JSON Schema validation; check every RT-01 inventoried asset is representable; verify unknown schema versions fail closed |
| RT-03 | RT-03 | Run `nvb dist` independently; compare `dist/` tree against spec and RT-02 types; verify reproducible builds; introduce intentional manifest defects and verify rejection; check executable bits |
| RT-04 | RT-04 | Independently stage runtime versions; verify XDG precedence; simulate kill-during-staging for atomicity; prove immutability after commit; prove version coexistence |
| RT-05 | RT-05 | Mock subprocess layer and assert every safety invariant; verify no shell-mode spawn; verify no `process.env` leak; verify every rejection path; verify signal forwarding; verify verbose output safety |
| RT-06 | RT-06 | Independently attempt every rejection path; verify checksum validation; verify collision refusal; verify escape rejection; verify compatibility name resolution; verify manifest-only ownership |
| RT-07 | RT-07 | Run smoke test from clean state; verify relocated package (not source tree); verify wake stdout, signal forwarding, worker account enforcement; verify cleanup leaves no artifacts |

## Shared Review Rule

The reviewer must independently regenerate evidence. Implementation report
conclusions are not accepted facts. Every reviewer must run the exact test
commands named by the batch and record the output, not narrate the outcome.

Acceptance commits must include all accepted non-`.local` changes with a
descriptive commit message. Rejections must produce a numbered correction
brief under `corrections/` with exact required fixes.
