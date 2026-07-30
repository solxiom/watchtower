# Watchtower v1 Release — Batch Reasoning Difficulty Ranking

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

Status: pack-authored baseline
Date: 2026-07-30

## Purpose

This document ranks the four release-qualification batches from hardest to
easiest for both implementors and reviewers. The ranking reflects the
combined reasoning depth, state-space complexity, concurrency concern,
negative-path breadth, cross-pack dependency, and fixture engineering
effort required.

The ranking is advisory. Agents, operators, and reviewers may use it to
prioritize agent selection, allocate more capable reasoning configurations
to higher-ranked batches, and calibrate expectation about total effort.
The batch-level reasoning class in each launch prompt remains authoritative.

## Overall Ranking (hardest first)

| Rank | Batch | Title | Reasoning class | Difficulty drivers |
|------|-------|-------|-----------------|--------------------|
| 1 | REL-03 | Security, ownership, performance, and package qualification | R5 | Broadest negative-path surface; traversal/config/permission/manifest/boundedness/model-free proof all required; synthetic scaling fixtures from 30 to 10k batches; cross-cutting evidence across the entire assembled product |
| 2 | REL-02 | Concurrent and multi-repository recovery trials | R5 | Lock-ordering and shared-write state space; partial-push recovery with multi-repo journals; idempotency replay of uncertain effects; lane isolation under path/collision pressure |
| 3 | REL-01 | Fresh-lane implementer→reviewer→accept trial | R5 | Longest end-to-end chain: package → init → dispatch → handoff → accept → publish; requires working coordinator/routing/effects/sessions from all prior packs; release evidence packet must document every step |
| 4 | REL-04 | Documentation consistency and release gate | R3 | Audit-only; no code or fixture creation; bounded traceability and readability work; cross-document consistency requires attention but not state-machine reasoning |

## Detailed Reasoning Per Batch

### Rank 1 — REL-03 (hardest)

REL-03 is the hardest batch because it requires the broadest adversarial
thinking and the largest fixture engineering effort:

- **Path traversal suite:** must prove that symlink escapes are refused at
  every boundary — lane directory path construction, repository binding
  canonicalization, runtime store path resolution, and within-lane route
  construction.
- **Strict-env parser corpus:** must prove that a corpus of malicious shell
  inputs (command substitution, variable expansion, shell operators, executable
  statements) is rejected without execution. This requires preparing a
  config-file corpus and asserting rejection, not just documenting the parser
  algorithm.
- **Multi-account permission suite:** must prove that `wt doctor` verifies
  every configured OS account with correct read/execute/deny-write boundaries.
  This requires creating OS user accounts in the test environment and
  asserting permission results.
- **Manifest integrity:** must prove that `nvb dist` build validation fails
  on missing, extra, non-executable, and checksum-mismatched managed assets.
  This requires corrupting a packaged manifest and asserting the build gate
  fails.
- **Global install proof:** must prove the installed package matches manifests
  and staged runtimes match checksums after XDG staging.
- **Boundedness and cost proof:** must prove that `wt status` and `wt list`
  wall time and output size do not grow as packs scale from 30 to 300 to
  3,000 to 10,000 batches. This requires generating synthetic packs at each
  scale and measuring.
- **Model-free proof:** must audit every mechanical coordination operation
  (ready-set calculation, heartbeat, event filtering, session presence, idle
  polling) and assert zero model invocations.
- **Skill install proof:** must prove coordinator knowledge is installable
  for Codex, Cursor, and Claude with preview/replace/scope and version-record
  behavior.

Security thinking is inherently adversarial. Every positive assertion
("path X is safe") must be paired with a negative fixture that attempts the
exploit and receives a refusal. The breadth of surfaces tested makes this
batch the most demanding.

### Rank 2 — REL-02

REL-02 is the second hardest because it exercises the lane model's
concurrency and recovery state space:

- **Concurrent lane isolation:** must prove that two independently operated
  lanes bound to one repository do not collide on slug, state, lock, tmux
  prefix, or watch attachment. This requires creating and operating two
  lanes sequentially and in parallel.
- **Multi-repository commit set:** must prove that one lane binding two
  repositories records per-repository acceptance commits correctly and
  verifies the commit set against the reviewer acceptance event.
- **Shared-write refusal:** must prove that an attempt to bind a second lane
  to an in-use writable worktree is detected and refused. Dedicated worktrees
  must isolate correctly.
- **Partial push recovery:** must prove that when one repository push
  succeeds and another fails (simulated network/access failure), the lane
  records the partial outcome in per-repository push journals, does not
  revoke semantic acceptance, and can be retried without recreating commits.
- **Idempotency replay:** must prove that replaying a completed cycle's
  idempotency key returns the recorded outcome without repeating the effect.
- **Copied-template fixture:** must prove that a pre-existing directory
  with `.watchtower/` but no `lane.json` is not discovered, inspected,
  or modified by any Watchtower command.

Concurrent state-space exploration and multi-step recovery testing require
careful fixture sequencing and assert-after-effects reasoning.

### Rank 3 — REL-01

REL-01 is the third hardest despite being the marquee acceptance trial
because its difficulty is in the length of the chain, not the depth of any
single step:

- The end-to-end chain is long but linear: `nvb dist → npm install -g →
  wt init → wt watch → dispatch implementer → handoff → reviewer accept →
  wt publish`. Each step exercises a well-defined, previously accepted
  command or workflow.
- Most negative cases (init refusal, doctor detection, upgrade safety,
  status schema) are single-step assertions that exercise specific preflight
  or validation guards.
- The primary difficulty is in keeping the full chain reproducible and
  documenting every step for the release evidence packet, not in exploring
  concurrent or adversarial state spaces.

An R5 agent is still required because the chain spans all six packs and the
agent must reason about lane state across init, watch, dispatch, acceptance,
and upgrade — and because release evidence must be complete and independently
reproducible.

### Rank 4 — REL-04 (easiest)

REL-04 is the easiest batch because it audits rather than implements:

- The work is bounded traceability documentation: map every §17 criterion
  to its owning batch, proof location, and current evidence status.
- Help audit is a comparison task: for every command in `help/help.json`,
  verify the help fragment exists and describes the current behavior.
- Doc audit is a consistency check: verify `v1.md`, `architecture.md`, and
  `v1-contracts.md` agree with actual behavior on shipped commands.
- Scaffold audit is a removal verification: confirm `hello` artifacts are
  gone.
- Artifact audit is a `git ls-files` filtering task.

An R3 implementor can do the audit; an R4 reviewer is required because the
reviewer must independently form a judgment about whether the evidence
traceability is complete and honest. A reviewer that merely confirms the
audit report without re-reading the source would miss undocumented behavior.

## Implementation Sequencing Recommendation

Given this ranking, the following agent assignment strategy is recommended:

1. **REL-01 first** — despite being rank 3 in difficulty, REL-01 must run
   first because it proves the baseline pipeline. Use the strongest available
   R5 agent that can handle long sequential chains.
2. **REL-02 second** — assign an R5 agent with strong concurrency/recovery
   reasoning. Do not use a low-context agent that would miss lock-ordering
   or journal-integrity defects.
3. **REL-03 third** — assign the strongest available R5 agent with the
   largest context window because the fixture scale and adversarial breadth
   exceed the other batches. Synthetic pack generation at 10,000 batches
   requires automation.
4. **REL-04 fourth** — an R3 agent is sufficient for the implementor; an R4
   agent for the reviewer. Context requirements are modest.

## Reviewer Difficulty Ranking

Reviewer difficulty tracks the same order but with amplification at the
review stage:

| Rank | Review batch | Amplification factor |
|------|-------------|----------------------|
| 1 | REL-03 review | Highest — reviewer must independently reproduce security exploits, performance measurements, and manifest integrity proof |
| 2 | REL-02 review | High — reviewer must independently reproduce concurrency isolation, recovery, and idempotency |
| 3 | REL-01 review | Moderate-high — reviewer must independently reproduce the complete end-to-end pipeline |
| 4 | REL-04 review | Moderate — reviewer must independently verify traceability, help/doc consistency, and artifact cleanliness |
